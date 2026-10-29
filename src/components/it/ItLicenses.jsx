import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Paper, Snackbar,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import API from "../../api";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportMoney } from "../common/reportFormat";
import ItFormDialog from "./ItFormDialog";
import ItAttachments from "./ItAttachments";
import { VoidDialog } from "../itRisk/ItIncidentDetailDialog";
import { Field, PageHeader, StateChip } from "./ItCommon";
import {
  BASE, daysText, errorMessage, fileDate, fmtDate, money, options, stateText, useItCatalog, useItLookups, useItPermissions,
} from "./itShared";

// Licencias de software (Art. 11 num. 3 y 4 de la norma CONAMI de riesgo
// tecnológico). Backend: /api/it/licenses.

const licenseFields = (catalog, lookups) => [
  { name: "software_name", label: "Software", required: true, md: 6 },
  { name: "publisher", label: "Fabricante", md: 6 },
  { name: "license_type", label: "Tipo de licencia", type: "select", required: true, options: options(catalog?.license_types), md: 4 },
  { name: "seats", label: "Puestos (vacío = ilimitado)", type: "number", md: 4 },
  { name: "expires_at", label: "Vencimiento", type: "date", md: 4 },
  { name: "purchase_date", label: "Fecha de compra", type: "date", md: 4 },
  { name: "cost", label: "Costo", type: "money", md: 4 },
  { name: "currency", label: "Moneda", type: "select", required: true, default: "USD", options: options(catalog?.currencies), md: 4 },
  { name: "renewal_notice_days", label: "Avisar antes del vencimiento (días)", type: "number", default: "30", md: 4 },
  { name: "supplier", label: "Proveedor", md: 4 },
  { name: "contract_id", label: "Contrato de TI", type: "select", options: lookups.contracts.map((c) => ({ value: c.id, label: `${c.provider_name}${c.contract_number ? ` · ${c.contract_number}` : ""}` })), md: 4 },
  { name: "license_reference", label: "Referencia (cuenta, pedido o contrato)", md: 12, help: "No guarde aquí la clave del producto." },
  { name: "notes", label: "Notas", type: "textarea", md: 12 },
];

function LicenseDetail({ licenseId, catalog, lookups, onClose, onChanged, onEdit }) {
  const { canManage, canVoid } = useItPermissions();
  const [lic, setLic] = useState(null);
  const [error, setError] = useState("");
  const [assign, setAssign] = useState({ asset_id: "", assigned_user_id: "", assigned_to_name: "" });
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await API.get(`${BASE}/licenses/${licenseId}`);
      setLic(data);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar la licencia."));
    }
  }, [licenseId]);
  useEffect(() => { load(); }, [load]);

  const refresh = async () => { await load(); onChanged(); };
  const doAssign = async () => {
    try {
      await API.post(`${BASE}/licenses/${lic.id}/assignments`, assign);
      setAssign({ asset_id: "", assigned_user_id: "", assigned_to_name: "" });
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "No se pudo asignar el puesto."));
    }
  };
  const release = async (a) => {
    try {
      await API.post(`${BASE}/licenses/${lic.id}/assignments/${a.id}/release`);
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "No se pudo liberar el puesto."));
    }
  };
  const voided = lic?.status === "ANULADA";

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{lic ? lic.software_name : "Licencia"} {lic && <StateChip state={lic.state.status} />}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!lic && !error && <CircularProgress size={22} />}
        {lic && (
          <>
            {voided && <Alert severity="warning" sx={{ mb: 2 }}>Anulada por {lic.voided_by_name}: {lic.void_reason}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Field label="Tipo">{catalog?.license_types?.[lic.license_type]}</Field>
                <Field label="Fabricante">{lic.publisher}</Field>
                <Field label="Referencia">{lic.license_reference}</Field>
              </Grid>
              <Grid item xs={12} md={4}>
                <Field label="Puestos">{lic.state.seats == null ? `Ilimitados · ${lic.state.used} en uso` : `${lic.state.used} de ${lic.state.seats} en uso`}</Field>
                <Field label="Vencimiento">{lic.expires_at ? `${fmtDate(lic.expires_at)} (${daysText(lic.state.days_left)})` : "Sin vencimiento"}</Field>
              </Grid>
              <Grid item xs={12} md={4}>
                <Field label="Compra">{lic.purchase_date ? `${fmtDate(lic.purchase_date)} · ${money(lic.cost, lic.currency)}` : money(lic.cost, lic.currency)}</Field>
                <Field label="Proveedor / contrato">{[lic.supplier, lic.contract_provider && `Contrato ${lic.contract_provider}${lic.contract_number ? ` ${lic.contract_number}` : ""}`].filter(Boolean).join(" · ")}</Field>
              </Grid>
            </Grid>
            {lic.state.over && <Alert severity="error" sx={{ my: 1 }}>Hay más puestos asignados que los comprados.</Alert>}
            <Typography fontWeight={700} sx={{ mt: 2, mb: 1 }}>Puestos asignados</Typography>
            {canManage && !voided && (
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
                <TextField select size="small" label="Equipo" value={assign.asset_id} onChange={(e) => setAssign((a) => ({ ...a, asset_id: e.target.value }))} sx={{ minWidth: 220 }}>
                  <MenuItem value="">—</MenuItem>
                  {lookups.assets.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.asset_code} · {a.name}</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Usuario" value={assign.assigned_user_id} onChange={(e) => setAssign((a) => ({ ...a, assigned_user_id: e.target.value }))} sx={{ minWidth: 200 }}>
                  <MenuItem value="">—</MenuItem>
                  {lookups.users.map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.full_name || u.user_name}</MenuItem>)}
                </TextField>
                <TextField size="small" label="u otro nombre" value={assign.assigned_to_name} onChange={(e) => setAssign((a) => ({ ...a, assigned_to_name: e.target.value }))} />
                <Button variant="outlined" onClick={doAssign}>Asignar puesto</Button>
              </Stack>
            )}
            <Table size="small">
              <TableHead><TableRow><TableCell>Equipo</TableCell><TableCell>Persona</TableCell><TableCell>Desde</TableCell><TableCell>Liberado</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {lic.assignments.map((a) => (
                  <TableRow key={a.id} sx={a.released_at ? { opacity: 0.5 } : undefined}>
                    <TableCell>{a.asset_code ? `${a.asset_code} · ${a.asset_name}` : "—"}</TableCell>
                    <TableCell>{a.assigned_to_name || a.assigned_user_name || "—"}</TableCell>
                    <TableCell>{a.assigned_at}</TableCell>
                    <TableCell>{a.released_at || "—"}</TableCell>
                    <TableCell>{!a.released_at && canManage && <Button size="small" onClick={() => release(a)}>Liberar</Button>}</TableCell>
                  </TableRow>
                ))}
                {!lic.assignments.length && <TableRow><TableCell colSpan={5}>Sin puestos asignados.</TableCell></TableRow>}
              </TableBody>
            </Table>
            <Typography fontWeight={700} sx={{ mt: 2, mb: 1 }}>Adjuntos</Typography>
            <ItAttachments entityType="LICENSE" entityId={lic.id} canUpload={canManage && !voided} />
          </>
        )}
      </DialogContent>
      <DialogActions>
        {lic && !voided && canVoid && <Button color="error" onClick={() => setVoiding(true)}>Anular</Button>}
        <Box sx={{ flex: 1 }} />
        {lic && !voided && canManage && <Button onClick={() => onEdit(lic)}>Editar</Button>}
        <Button variant="contained" onClick={onClose}>Cerrar</Button>
      </DialogActions>
      <VoidDialog open={voiding} title={`Anular la licencia ${lic?.software_name || ""}`} onClose={() => setVoiding(false)}
        onConfirm={async (reason) => { await API.post(`${BASE}/licenses/${lic.id}/void`, { reason }); setVoiding(false); await refresh(); }} />
    </Dialog>
  );
}

export default function ItLicenses() {
  const { canManage } = useItPermissions();
  const catalog = useItCatalog();
  const lookups = useItLookups();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await API.get(`${BASE}/licenses`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar las licencias."));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const fields = useMemo(() => licenseFields(catalog, lookups), [catalog, lookups]);
  const save = async (values) => {
    const { data } = editing?.id ? await API.put(`${BASE}/licenses/${editing.id}`, values) : await API.post(`${BASE}/licenses`, values);
    setToast(editing?.id ? "Licencia actualizada." : "Licencia registrada.");
    setEditing(null);
    await load();
    setDetailId(data.id);
  };

  const buildReport = () => ({
    title: "Licencias de software",
    orientation: "landscape",
    columns: [
      { field: "software_name", label: "Software" },
      { field: "publisher", label: "Fabricante" },
      { field: "license_type", label: "Tipo", format: (v) => catalog?.license_types?.[v] || v },
      { label: "Puestos (usados / comprados)", value: (l) => (l.state.seats == null ? `${l.state.used} / ∞` : `${l.state.used} / ${l.state.seats}`) },
      { label: "Vencimiento", value: (l) => (l.expires_at ? `${fmtDate(l.expires_at)} (${daysText(l.state.days_left)})` : "—") },
      { field: "cost", label: "Costo", numeric: true, format: (v) => (v == null || v === "" ? "—" : reportMoney(v)) },
      { field: "currency", label: "Moneda" },
      { label: "Estado", value: (l) => stateText(l.state.status) },
    ],
    rows: rows || [],
    fileName: `licencias_ti_${fileDate()}`,
  });

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <PageHeader title="Licencias de software" subtitle="Puestos comprados y asignados, vencimientos y renovaciones (Art. 11 num. 3 y 4)." helpKey="ti.licencias"
        actions={[
          <ReportExportButtons key="r" report={buildReport} disabled={!rows?.length} />,
          canManage && <Button key="n" variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({})}>Nueva licencia</Button>,
        ]} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>Software</TableCell><TableCell>Tipo</TableCell><TableCell align="right">Puestos</TableCell><TableCell>Vencimiento</TableCell><TableCell align="right">Costo</TableCell><TableCell>Estado</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {!rows && <TableRow><TableCell colSpan={6}><CircularProgress size={20} /></TableCell></TableRow>}
            {rows && !rows.length && <TableRow><TableCell colSpan={6}><Typography color="text.secondary">No hay licencias registradas.</Typography></TableCell></TableRow>}
            {(rows || []).map((l) => (
              <TableRow key={l.id} hover sx={{ cursor: "pointer" }} onClick={() => setDetailId(l.id)}>
                <TableCell><Typography fontWeight={600} fontSize={13.5}>{l.software_name}</Typography><Typography fontSize={12} color="text.secondary">{l.publisher}</Typography></TableCell>
                <TableCell>{catalog?.license_types?.[l.license_type]}</TableCell>
                <TableCell align="right" sx={{ color: l.state.over ? "error.main" : undefined, fontWeight: l.state.over ? 700 : 400 }}>{l.state.seats == null ? `${l.state.used} / ∞` : `${l.state.used} / ${l.state.seats}`}</TableCell>
                <TableCell>{l.expires_at ? `${fmtDate(l.expires_at)} (${daysText(l.state.days_left)})` : "—"}</TableCell>
                <TableCell align="right">{money(l.cost, l.currency)}</TableCell>
                <TableCell><StateChip state={l.state.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <ItFormDialog open={Boolean(editing)} title={editing?.id ? `Editar ${editing.software_name}` : "Nueva licencia"} fields={fields}
        initial={editing?.id ? editing : { currency: "USD", renewal_notice_days: 30 }} onClose={() => setEditing(null)} onSubmit={save} />
      {detailId && <LicenseDetail licenseId={detailId} catalog={catalog} lookups={lookups} onClose={() => setDetailId(null)} onChanged={load} onEdit={(l) => { setDetailId(null); setEditing(l); }} />}
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
