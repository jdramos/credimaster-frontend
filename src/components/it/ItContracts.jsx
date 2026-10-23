import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Snackbar, Table,
  TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import API from "../../api";
import ItFormDialog from "./ItFormDialog";
import ItAttachments from "./ItAttachments";
import { VoidDialog } from "../itRisk/ItIncidentDetailDialog";
import { Field, PageHeader, StateChip } from "./ItCommon";
import { BASE, CRITICALITY_COLORS, daysText, errorMessage, fmtDate, money, options, useItCatalog, useItLookups, useItPermissions } from "./itShared";

// Contratos con proveedores de TI (Art. 13 de la norma CONAMI de riesgo
// tecnológico): vigencia, renovación y cláusulas mínimas.

const clauseKey = (code) => `clause_${code.replace(/\./g, "_")}`;

const contractFields = (catalog, lookups) => [
  { name: "provider_name", label: "Proveedor", required: true, md: 6 },
  { name: "provider_id", label: "Proveedor del catálogo (opcional)", type: "select", options: lookups.providers.map((p) => ({ value: p.id, label: p.name })), md: 6 },
  { name: "contract_type", label: "Tipo de servicio", type: "select", required: true, options: options(catalog?.contract_types), md: 6 },
  { name: "criticality", label: "Criticidad", type: "select", required: true, default: "MEDIA", options: options(catalog?.criticality), md: 3 },
  { name: "contract_number", label: "Número de contrato", md: 3 },
  { name: "service_description", label: "Objeto y alcance del servicio", type: "textarea", required: true, md: 12 },
  { name: "start_date", label: "Inicio", type: "date", required: true, md: 3 },
  { name: "end_date", label: "Vencimiento", type: "date", md: 3 },
  { name: "renewal_notice_days", label: "Avisar antes (días)", type: "number", default: "60", md: 3 },
  { name: "auto_renew", label: "Renovación automática", type: "checkbox", md: 3 },
  { name: "amount", label: "Monto", type: "money", md: 4 },
  { name: "currency", label: "Moneda", type: "select", required: true, default: "USD", options: options(catalog?.currencies), md: 4 },
  { name: "billing_frequency", label: "Frecuencia de pago", type: "select", options: options(catalog?.billing_frequencies), md: 4 },
  { name: "sla_description", label: "Nivel de servicio (SLA, disponibilidad, tiempos de respuesta)", type: "textarea", md: 12 },
  { name: "contact_name", label: "Contacto", md: 4 },
  { name: "contact_phone", label: "Teléfono", md: 4 },
  { name: "contact_email", label: "Correo", md: 4 },
  { type: "section", label: "Cláusulas mínimas (Art. 13)", help: "Marque lo que el contrato firmado incluye. 13.5 solo aplica si el centro de procesamiento de datos es de un tercero." },
  { name: "provider_evaluated_at", label: "Fecha de la evaluación previa del proveedor (13.1)", type: "date", md: 6 },
  ...(catalog?.contract_clauses || []).map((c) => ({
    name: clauseKey(c.code), label: `${c.code} · ${c.text}`, type: "select", md: 12, emptyLabel: "Sin revisar",
    options: options(catalog?.clause_statuses),
  })),
  { name: "notes", label: "Notas", type: "textarea", md: 12 },
];

const toForm = (contract, catalog) => {
  if (!contract?.id) return { criticality: "MEDIA", currency: "USD", renewal_notice_days: 60 };
  const out = { ...contract };
  (catalog?.contract_clauses || []).forEach((c) => { out[clauseKey(c.code)] = contract.clauses?.[c.code] || ""; });
  return out;
};

const toPayload = (values, catalog) => {
  const clauses = {};
  const rest = Object.fromEntries(Object.entries(values).filter(([k]) => !k.startsWith("clause_")));
  (catalog?.contract_clauses || []).forEach((c) => {
    clauses[c.code] = values[clauseKey(c.code)] || null;
  });
  return { ...rest, clauses };
};

function ContractDetail({ contractId, catalog, onClose, onChanged, onEdit }) {
  const { canManage, canVoid } = useItPermissions();
  const [c, setC] = useState(null);
  const [error, setError] = useState("");
  const [voiding, setVoiding] = useState(false);
  const load = useCallback(async () => {
    try {
      const { data } = await API.get(`${BASE}/contracts/${contractId}`);
      setC(data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el contrato."));
    }
  }, [contractId]);
  useEffect(() => { load(); }, [load]);
  const voided = c?.status === "ANULADO";

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{c ? c.provider_name : "Contrato"} {c && <StateChip state={c.state.status} />}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!c && !error && <CircularProgress size={22} />}
        {c && (
          <>
            {voided && <Alert severity="warning" sx={{ mb: 2 }}>Anulado por {c.voided_by_name}: {c.void_reason}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Field label="Servicio">{`${catalog?.contract_types?.[c.contract_type]}${c.contract_number ? ` · contrato ${c.contract_number}` : ""}`}</Field>
                <Field label="Objeto">{c.service_description}</Field>
                <Field label="SLA">{c.sla_description}</Field>
              </Grid>
              <Grid item xs={12} md={6}>
                <Field label="Vigencia">{`${fmtDate(c.start_date)} al ${c.end_date ? fmtDate(c.end_date) : "indefinido"}${c.end_date ? ` (${daysText(c.state.days_left)})` : ""}${Number(c.auto_renew) ? " · renovación automática" : ""}`}</Field>
                <Field label="Monto">{c.amount != null ? `${money(c.amount, c.currency)}${c.billing_frequency ? ` · ${catalog?.billing_frequencies?.[c.billing_frequency]}` : ""}` : null}</Field>
                <Field label="Contacto">{[c.contact_name, c.contact_phone, c.contact_email].filter(Boolean).join(" · ")}</Field>
                <Field label="Criticidad">{catalog?.criticality?.[c.criticality]}</Field>
              </Grid>
            </Grid>
            <Typography fontWeight={700} sx={{ mt: 1, mb: 1 }}>Cláusulas del Art. 13 {c.state.clause_gaps ? <Chip size="small" color="warning" label={`${c.state.clause_gaps} por confirmar`} /> : <Chip size="small" color="success" label="Completas" />}</Typography>
            <Table size="small">
              <TableBody>
                {(catalog?.contract_clauses || []).map((cl) => {
                  const s = c.clauses?.[cl.code];
                  return (
                    <TableRow key={cl.code}>
                      <TableCell sx={{ width: 60 }}>{cl.code}</TableCell>
                      <TableCell>{cl.text}</TableCell>
                      <TableCell><Chip size="small" color={s === "SI" ? "success" : s === "NO" ? "error" : "default"} variant={s ? "filled" : "outlined"} label={s ? catalog.clause_statuses[s] : "Sin revisar"} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {c.provider_evaluated_at && <Typography variant="body2" sx={{ mt: 1 }}>Proveedor evaluado el {fmtDate(c.provider_evaluated_at)} (13.1).</Typography>}
            {c.licenses?.length > 0 && (
              <>
                <Typography fontWeight={700} sx={{ mt: 2, mb: 1 }}>Licencias de este contrato</Typography>
                {c.licenses.map((l) => <Typography key={l.id} variant="body2">{l.software_name}{l.expires_at ? ` · vence ${fmtDate(l.expires_at)}` : ""}</Typography>)}
              </>
            )}
            <Typography fontWeight={700} sx={{ mt: 2, mb: 1 }}>Contrato firmado y anexos</Typography>
            <ItAttachments entityType="CONTRACT" entityId={c.id} canUpload={canManage && !voided} />
          </>
        )}
      </DialogContent>
      <DialogActions>
        {c && !voided && canVoid && <Button color="error" onClick={() => setVoiding(true)}>Anular</Button>}
        <Box sx={{ flex: 1 }} />
        {c && !voided && canManage && <Button onClick={() => onEdit(c)}>Editar</Button>}
        <Button variant="contained" onClick={onClose}>Cerrar</Button>
      </DialogActions>
      <VoidDialog open={voiding} title={`Anular el contrato con ${c?.provider_name || ""}`} onClose={() => setVoiding(false)}
        onConfirm={async (reason) => { await API.post(`${BASE}/contracts/${c.id}/void`, { reason }); setVoiding(false); await load(); onChanged(); }} />
    </Dialog>
  );
}

export default function ItContracts() {
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
      const { data } = await API.get(`${BASE}/contracts`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los contratos."));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const fields = useMemo(() => contractFields(catalog, lookups), [catalog, lookups]);
  const save = async (values) => {
    const payload = toPayload(values, catalog);
    const { data } = editing?.id ? await API.put(`${BASE}/contracts/${editing.id}`, payload) : await API.post(`${BASE}/contracts`, payload);
    setToast(editing?.id ? "Contrato actualizado." : "Contrato registrado.");
    setEditing(null);
    lookups.reload();
    await load();
    setDetailId(data.id);
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <PageHeader title="Proveedores y contratos de TI" subtitle="Vigencias, renovaciones y cláusulas mínimas que exige el Art. 13 de la norma CONAMI de riesgo tecnológico." helpKey="ti.contratos"
        actions={[canManage && <Button key="n" variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({})}>Nuevo contrato</Button>]} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Proveedor</TableCell><TableCell>Servicio</TableCell><TableCell>Criticidad</TableCell><TableCell>Vence</TableCell><TableCell>Estado</TableCell><TableCell>Cláusulas Art. 13</TableCell></TableRow></TableHead>
          <TableBody>
            {!rows && <TableRow><TableCell colSpan={6}><CircularProgress size={20} /></TableCell></TableRow>}
            {rows && !rows.length && <TableRow><TableCell colSpan={6}><Typography color="text.secondary">No hay contratos registrados.</Typography></TableCell></TableRow>}
            {(rows || []).map((c) => (
              <TableRow key={c.id} hover sx={{ cursor: "pointer" }} onClick={() => setDetailId(c.id)}>
                <TableCell><Typography fontWeight={600} fontSize={13.5}>{c.provider_name}</Typography><Typography fontSize={12} color="text.secondary">{c.contract_number}</Typography></TableCell>
                <TableCell>{catalog?.contract_types?.[c.contract_type]}</TableCell>
                <TableCell><Chip size="small" variant="outlined" color={CRITICALITY_COLORS[c.criticality]} label={catalog?.criticality?.[c.criticality]} /></TableCell>
                <TableCell>{c.end_date ? `${fmtDate(c.end_date)} (${daysText(c.state.days_left)})` : "Indefinido"}</TableCell>
                <TableCell><StateChip state={c.state.status} /></TableCell>
                <TableCell>{c.state.clause_gaps ? <Chip size="small" color="warning" label={`${c.state.clause_gaps} por confirmar`} /> : <Chip size="small" color="success" label="Completas" />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <ItFormDialog open={Boolean(editing)} title={editing?.id ? `Editar contrato con ${editing.provider_name}` : "Nuevo contrato de TI"} fields={fields}
        initial={toForm(editing, catalog)} onClose={() => setEditing(null)} onSubmit={save} />
      {detailId && <ContractDetail contractId={detailId} catalog={catalog} onClose={() => setDetailId(null)} onChanged={load} onEdit={(c) => { setDetailId(null); setEditing(c); }} />}
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
