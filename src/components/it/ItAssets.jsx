import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid,
  MenuItem, Paper, Snackbar, Stack, Switch, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import * as XLSX from "xlsx";
import API from "../../api";
import ItFormDialog from "./ItFormDialog";
import ItAttachments from "./ItAttachments";
import { VoidDialog } from "../itRisk/ItIncidentDetailDialog";
import { Field, PageHeader, StateChip } from "./ItCommon";
import {
  ASSET_STATUS_COLORS, BASE, CRITICALITY_COLORS, daysText, errorMessage, fmtDate, money, options, useItCatalog, useItLookups,
  useItPermissions,
} from "./itShared";

// Inventario de activos de TI (Art. 11 num. 4 y Art. 12 num. 3 de la Norma
// CD-CONAMI-017-01AGO21-2014). Backend: /api/it/assets.

export const assetFields = (catalog, lookups) => [
  { type: "section", label: "Identificación" },
  { name: "category", label: "Categoría", type: "select", required: true, options: options(catalog?.asset_categories), md: 6 },
  { name: "name", label: "Nombre o descripción", required: true, md: 6 },
  { name: "brand", label: "Marca", md: 4 },
  { name: "model", label: "Modelo", md: 4 },
  { name: "serial_number", label: "Serie", md: 4 },
  { name: "hostname", label: "Nombre de equipo", md: 4, show: (v) => v.category !== "SERVICIO" },
  { name: "ip_address", label: "Dirección IP", md: 4 },
  { name: "operating_system", label: "Sistema operativo", md: 4, show: (v) => v.category !== "SERVICIO" },
  { name: "specs", label: "Características (procesador, memoria, disco, plan contratado...)", type: "textarea", md: 12 },
  { type: "section", label: "Ubicación y asignación" },
  { name: "branch_id", label: "Sucursal", type: "select", options: lookups.branches.map((b) => ({ value: b.id, label: b.name })), md: 4 },
  { name: "location", label: "Ubicación", md: 4, help: "p. ej. Caja 2, cuarto de servidores" },
  { name: "status", label: "Estado", type: "select", required: true, default: "EN_USO", options: options(catalog?.asset_statuses).filter((o) => o.value !== "DE_BAJA"), md: 4 },
  { name: "assigned_user_id", label: "Usuario asignado", type: "select", options: lookups.users.map((u) => ({ value: u.id, label: u.full_name || u.user_name })), md: 6 },
  { name: "assigned_to_name", label: "Asignado a (nombre)", md: 6, help: "Si no tiene usuario en el sistema" },
  { type: "section", label: "Clasificación (Art. 12 num. 3)", help: "Criticidad para la operación y sensibilidad de la información que contiene o procesa." },
  { name: "criticality", label: "Criticidad", type: "select", required: true, default: "MEDIA", options: options(catalog?.criticality), md: 6 },
  { name: "sensitivity", label: "Sensibilidad de la información", type: "select", required: true, default: "INTERNA", options: options(catalog?.sensitivity), md: 6 },
  { type: "section", label: "Compra, garantía y mantenimiento" },
  { name: "purchase_date", label: "Fecha de compra", type: "date", md: 4 },
  { name: "purchase_cost", label: "Costo", type: "money", md: 4 },
  { name: "currency", label: "Moneda", type: "select", required: true, default: "NIO", options: options(catalog?.currencies), md: 4 },
  { name: "supplier", label: "Proveedor", md: 4 },
  { name: "invoice_number", label: "Factura", md: 4 },
  { name: "warranty_until", label: "Garantía hasta", type: "date", md: 4 },
  { name: "fixed_asset_id", label: "Ficha de Activo Fijo (contabilidad)", type: "select", emptyLabel: "Sin vínculo", options: lookups.fixed_assets.map((f) => ({ value: f.id, label: `${f.asset_code} · ${f.description}` })), md: 8 },
  { name: "maintenance_frequency_months", label: "Mantenimiento preventivo cada (meses)", type: "number", md: 4, show: (v) => v.category !== "SERVICIO" },
  { name: "notes", label: "Notas", type: "textarea", md: 12 },
];

const maintenanceFields = (catalog, assets, fixedAssetId) => [
  { name: "asset_id", label: "Activo", type: "select", required: true, options: assets.map((a) => ({ value: a.id, label: `${a.asset_code} · ${a.name}` })), md: 12, show: () => !fixedAssetId },
  { name: "maintenance_type", label: "Tipo", type: "select", required: true, options: options(catalog?.maintenance_types), md: 4 },
  { name: "performed_at", label: "Fecha", type: "date", required: true, md: 4 },
  { name: "performed_by", label: "Realizado por", required: true, md: 4, help: "Técnico o proveedor" },
  { name: "description", label: "Trabajo realizado", type: "textarea", required: true, md: 12 },
  { name: "findings", label: "Hallazgos y recomendaciones", type: "textarea", md: 12 },
  { name: "cost", label: "Costo", type: "money", md: 6 },
  { name: "currency", label: "Moneda", type: "select", required: true, default: "NIO", options: options(catalog?.currencies), md: 6 },
];

export function MaintenanceDialog({ open, catalog, assets, assetId, onClose, onSaved }) {
  return (
    <ItFormDialog
      open={open}
      title="Registrar mantenimiento"
      fields={maintenanceFields(catalog, assets, assetId)}
      initial={{ asset_id: assetId || "", performed_at: dayjs().format("YYYY-MM-DD"), maintenance_type: "PREVENTIVO", currency: "NIO" }}
      onClose={onClose}
      onSubmit={async (v) => {
        await API.post(`${BASE}/maintenances`, { ...v, asset_id: assetId || v.asset_id });
        onSaved();
      }}
    />
  );
}

function AssetDetail({ assetId, catalog, lookups, onClose, onChanged, onEdit }) {
  const { canManage, canVoid } = useItPermissions();
  const [asset, setAsset] = useState(null);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");
  const [maintOpen, setMaintOpen] = useState(false);
  const [disposing, setDisposing] = useState(false);
  const [voidingMaint, setVoidingMaint] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await API.get(`${BASE}/assets/${assetId}`);
      setAsset(data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el activo."));
    }
  }, [assetId]);
  useEffect(() => { setAsset(null); setTab(0); load(); }, [load]);

  const refresh = async () => { await load(); onChanged(); };
  const disposed = asset?.status === "DE_BAJA";

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {asset ? `${asset.asset_code} · ${asset.name}` : "Activo"}
        {asset && <Chip size="small" sx={{ ml: 1 }} color={ASSET_STATUS_COLORS[asset.status]} label={catalog?.asset_statuses?.[asset.status]} />}
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: 360 }}>
        {error && <Alert severity="error">{error}</Alert>}
        {!asset && !error && <CircularProgress size={22} />}
        {asset && (
          <>
            {disposed && <Alert severity="warning" sx={{ mb: 2 }}>Dado de baja el {fmtDate(asset.disposed_at)} por {asset.disposed_by_name}: {asset.disposal_reason}</Alert>}
            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
              <Tab label="Datos" />
              <Tab label={`Mantenimientos (${asset.maintenances.filter((m) => !m.voided_at).length})`} />
              <Tab label={`Licencias (${asset.licenses.length})`} />
              <Tab label={`Asignaciones (${asset.assignments.length})`} />
              <Tab label={`Tickets (${asset.tickets.length})`} />
              <Tab label="Adjuntos" />
            </Tabs>
            {tab === 0 && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Field label="Categoría">{catalog?.asset_categories?.[asset.category]}</Field>
                  <Field label="Marca / modelo">{[asset.brand, asset.model].filter(Boolean).join(" ")}</Field>
                  <Field label="Serie">{asset.serial_number}</Field>
                  <Field label="Equipo / IP">{[asset.hostname, asset.ip_address].filter(Boolean).join(" · ")}</Field>
                  <Field label="Sistema operativo">{asset.operating_system}</Field>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field label="Asignado a">{asset.assigned_to_name || asset.assigned_user_name}</Field>
                  <Field label="Sucursal / ubicación">{[asset.branch_name, asset.location].filter(Boolean).join(" · ")}</Field>
                  <Field label="Criticidad / sensibilidad">{`${catalog?.criticality?.[asset.criticality]} · ${catalog?.sensitivity?.[asset.sensitivity]}`}</Field>
                  <Field label="Activo Fijo">{asset.fixed_asset_code ? `${asset.fixed_asset_code} · ${asset.fixed_asset_description}` : "Sin vínculo"}</Field>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Field label="Compra">{asset.purchase_date ? `${fmtDate(asset.purchase_date)} · ${money(asset.purchase_cost, asset.currency)}${asset.supplier ? ` · ${asset.supplier}` : ""}` : null}</Field>
                  <Field label="Garantía">
                    {asset.warranty ? <>{fmtDate(asset.warranty.until)} <StateChip state={asset.warranty.status} /></> : null}
                  </Field>
                  <Field label="Mantenimiento preventivo">
                    {asset.maintenance ? <>Cada {asset.maintenance_frequency_months} meses · próximo {fmtDate(asset.maintenance.due_date)} <StateChip state={asset.maintenance.status} /></> : "Sin plan"}
                  </Field>
                </Grid>
                {asset.specs && <Grid item xs={12}><Field label="Características">{asset.specs}</Field></Grid>}
                {asset.notes && <Grid item xs={12}><Field label="Notas">{asset.notes}</Field></Grid>}
              </Grid>
            )}
            {tab === 1 && (
              <>
                {canManage && !disposed && <Button size="small" variant="outlined" startIcon={<AddIcon />} sx={{ mb: 1 }} onClick={() => setMaintOpen(true)}>Registrar mantenimiento</Button>}
                <Table size="small">
                  <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Tipo</TableCell><TableCell>Trabajo</TableCell><TableCell>Por</TableCell><TableCell align="right">Costo</TableCell><TableCell /></TableRow></TableHead>
                  <TableBody>
                    {asset.maintenances.map((m) => (
                      <TableRow key={m.id} sx={m.voided_at ? { opacity: 0.5 } : undefined}>
                        <TableCell>{fmtDate(m.performed_at)}</TableCell>
                        <TableCell>{catalog?.maintenance_types?.[m.maintenance_type]}</TableCell>
                        <TableCell>{m.description}{m.findings ? <Typography variant="caption" display="block" color="text.secondary">{m.findings}</Typography> : null}{m.voided_at && <Typography variant="caption" display="block">Anulado: {m.void_reason}</Typography>}</TableCell>
                        <TableCell>{m.performed_by}</TableCell>
                        <TableCell align="right">{m.cost != null ? money(m.cost, m.currency) : "—"}</TableCell>
                        <TableCell>{!m.voided_at && canVoid && <Button size="small" color="error" onClick={() => setVoidingMaint(m)}>Anular</Button>}</TableCell>
                      </TableRow>
                    ))}
                    {!asset.maintenances.length && <TableRow><TableCell colSpan={6}>Sin mantenimientos registrados.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </>
            )}
            {tab === 2 && (
              <Table size="small">
                <TableHead><TableRow><TableCell>Software</TableCell><TableCell>Tipo</TableCell><TableCell>Vence</TableCell><TableCell>Asignada</TableCell></TableRow></TableHead>
                <TableBody>
                  {asset.licenses.map((l) => (
                    <TableRow key={l.assignment_id}><TableCell>{l.software_name}</TableCell><TableCell>{catalog?.license_types?.[l.license_type]}</TableCell><TableCell>{fmtDate(l.expires_at)}</TableCell><TableCell>{fmtDate(l.assigned_at)}</TableCell></TableRow>
                  ))}
                  {!asset.licenses.length && <TableRow><TableCell colSpan={4}>Sin licencias asignadas (se asignan desde Licencias).</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
            {tab === 3 && (
              <Table size="small">
                <TableHead><TableRow><TableCell>Desde</TableCell><TableCell>Hasta</TableCell><TableCell>Asignado a</TableCell><TableCell>Sucursal / ubicación</TableCell><TableCell>Estado</TableCell><TableCell>Registró</TableCell></TableRow></TableHead>
                <TableBody>
                  {asset.assignments.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell>{h.started_at}</TableCell><TableCell>{h.ended_at || "Actual"}</TableCell>
                      <TableCell>{h.assigned_to_name || h.assigned_user_name || "—"}</TableCell>
                      <TableCell>{[h.branch_name, h.location].filter(Boolean).join(" · ") || "—"}</TableCell>
                      <TableCell>{catalog?.asset_statuses?.[h.status] || h.status}</TableCell><TableCell>{h.registered_by_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {tab === 4 && (
              <Table size="small">
                <TableHead><TableRow><TableCell>Ticket</TableCell><TableCell>Asunto</TableCell><TableCell>Abierto</TableCell><TableCell>Estado</TableCell></TableRow></TableHead>
                <TableBody>
                  {asset.tickets.map((t) => (
                    <TableRow key={t.id}><TableCell>{t.ticket_number}</TableCell><TableCell>{t.title}</TableCell><TableCell>{t.opened_at}</TableCell><TableCell>{catalog?.ticket_statuses?.[t.status]}</TableCell></TableRow>
                  ))}
                  {!asset.tickets.length && <TableRow><TableCell colSpan={4}>Sin tickets de soporte.</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
            {tab === 5 && <ItAttachments entityType="ASSET" entityId={asset.id} canUpload={canManage} />}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {asset && !disposed && canVoid && <Button color="error" onClick={() => setDisposing(true)}>Dar de baja</Button>}
        <Box sx={{ flex: 1 }} />
        {asset && !disposed && canManage && <Button onClick={() => onEdit(asset)}>Editar</Button>}
        <Button variant="contained" onClick={onClose}>Cerrar</Button>
      </DialogActions>
      {maintOpen && (
        <MaintenanceDialog open catalog={catalog} assets={lookups.assets} assetId={asset.id} onClose={() => setMaintOpen(false)}
          onSaved={async () => { setMaintOpen(false); await refresh(); }} />
      )}
      <VoidDialog open={disposing} title={`Dar de baja ${asset?.asset_code || ""}`} onClose={() => setDisposing(false)}
        onConfirm={async (reason) => { await API.post(`${BASE}/assets/${asset.id}/dispose`, { reason }); setDisposing(false); await refresh(); }} />
      <VoidDialog open={Boolean(voidingMaint)} title="Anular mantenimiento" onClose={() => setVoidingMaint(null)}
        onConfirm={async (reason) => { await API.post(`${BASE}/maintenances/${voidingMaint.id}/void`, { reason }); setVoidingMaint(null); await refresh(); }} />
    </Dialog>
  );
}

export default function ItAssets() {
  const { canManage } = useItPermissions();
  const catalog = useItCatalog();
  const lookups = useItLookups();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ q: "", category: "", status: "", include_disposed: false });
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const params = {};
      if (filters.q) params.q = filters.q;
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.include_disposed) params.include_disposed = "1";
      const { data } = await API.get(`${BASE}/assets`, { params });
      setRows(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el inventario."));
    }
  }, [filters]);
  useEffect(() => { const t = setTimeout(load, filters.q ? 300 : 0); return () => clearTimeout(t); }, [load, filters.q]);

  const fields = useMemo(() => assetFields(catalog, lookups), [catalog, lookups]);

  const save = async (values) => {
    const { data } = editing?.id ? await API.put(`${BASE}/assets/${editing.id}`, values) : await API.post(`${BASE}/assets`, values);
    setToast(editing?.id ? "Activo actualizado." : `Activo ${data.asset_code} registrado.`);
    setEditing(null);
    lookups.reload();
    await load();
    setDetailId(data.id);
  };

  const exportExcel = () => {
    const data = (rows || []).map((a) => ({
      Código: a.asset_code, Categoría: catalog?.asset_categories?.[a.category], Nombre: a.name, Marca: a.brand, Modelo: a.model, Serie: a.serial_number,
      "Equipo/IP": [a.hostname, a.ip_address].filter(Boolean).join(" "), "Sistema operativo": a.operating_system,
      Sucursal: a.branch_name, Ubicación: a.location, "Asignado a": a.assigned_to_name || a.assigned_user_name,
      Estado: catalog?.asset_statuses?.[a.status], Criticidad: catalog?.criticality?.[a.criticality], Sensibilidad: catalog?.sensitivity?.[a.sensitivity],
      Compra: a.purchase_date, Costo: a.purchase_cost == null ? "" : Number(a.purchase_cost), Moneda: a.currency, "Garantía hasta": a.warranty_until,
      "Próximo mantenimiento": a.maintenance?.due_date || "", "Activo fijo": a.fixed_asset_code || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Inventario TI");
    XLSX.writeFile(wb, `inventario_ti_${dayjs().format("YYYYMMDD")}.xlsx`);
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <PageHeader
        title="Inventario de activos de TI"
        subtitle="Equipos, red, servidores y servicios. Inventario y clasificación por criticidad y sensibilidad (Arts. 11.4 y 12.3 de la norma CONAMI de riesgo tecnológico)."
        helpKey="ti.activos"
        actions={[
          <Button key="x" variant="outlined" onClick={exportExcel} disabled={!rows?.length}>Excel</Button>,
          canManage && <Button key="n" variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({})}>Nuevo activo</Button>,
        ]}
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ md: "center" }} flexWrap="wrap" useFlexGap>
        <TextField size="small" label="Buscar (código, nombre, serie, usuario)" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} sx={{ minWidth: 280 }} />
        <TextField select size="small" label="Categoría" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} sx={{ minWidth: 220 }}>
          <MenuItem value="">Todas</MenuItem>
          {options(catalog?.asset_categories).map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Estado" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} sx={{ minWidth: 170 }}>
          <MenuItem value="">Vigentes</MenuItem>
          {options(catalog?.asset_statuses).map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <FormControlLabel control={<Switch checked={filters.include_disposed} onChange={(e) => setFilters((f) => ({ ...f, include_disposed: e.target.checked }))} />} label="Incluir dados de baja" />
      </Stack>
      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell><TableCell>Activo</TableCell><TableCell>Asignado a</TableCell><TableCell>Sucursal</TableCell>
              <TableCell>Criticidad</TableCell><TableCell>Estado</TableCell><TableCell>Garantía</TableCell><TableCell>Mantenimiento</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!rows && <TableRow><TableCell colSpan={8}><CircularProgress size={20} /></TableCell></TableRow>}
            {rows && !rows.length && <TableRow><TableCell colSpan={8}><Typography color="text.secondary">No hay activos con estos filtros.</Typography></TableCell></TableRow>}
            {(rows || []).map((a) => (
              <TableRow key={a.id} hover sx={{ cursor: "pointer", opacity: a.status === "DE_BAJA" ? 0.55 : 1 }} onClick={() => setDetailId(a.id)}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{a.asset_code}</TableCell>
                <TableCell>
                  <Typography fontWeight={600} fontSize={13.5}>{a.name}</Typography>
                  <Typography fontSize={12} color="text.secondary">{catalog?.asset_categories?.[a.category]}{a.serial_number ? ` · S/N ${a.serial_number}` : ""}</Typography>
                </TableCell>
                <TableCell>{a.assigned_to_name || a.assigned_user_name || "—"}</TableCell>
                <TableCell>{a.branch_name || "—"}</TableCell>
                <TableCell><Chip size="small" variant="outlined" color={CRITICALITY_COLORS[a.criticality]} label={catalog?.criticality?.[a.criticality] || a.criticality} /></TableCell>
                <TableCell><Chip size="small" color={ASSET_STATUS_COLORS[a.status]} label={catalog?.asset_statuses?.[a.status] || a.status} /></TableCell>
                <TableCell>{a.warranty ? <StateChip state={a.warranty.status} suffix={a.warranty.status === "VIGENTE" ? "" : `(${daysText(a.warranty.days_left)})`} /> : "—"}</TableCell>
                <TableCell>{a.maintenance ? <StateChip state={a.maintenance.status} suffix={`· ${fmtDate(a.maintenance.due_date)}`} /> : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <ItFormDialog open={Boolean(editing)} title={editing?.id ? `Editar ${editing.asset_code}` : "Nuevo activo de TI"} fields={fields} initial={editing?.id ? editing : { status: "EN_USO", criticality: "MEDIA", sensitivity: "INTERNA", currency: "NIO" }}
        onClose={() => setEditing(null)} onSubmit={save} />
      {detailId && (
        <AssetDetail assetId={detailId} catalog={catalog} lookups={lookups} onClose={() => setDetailId(null)} onChanged={load}
          onEdit={(a) => { setDetailId(null); setEditing(a); }} />
      )}
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
