import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControlLabel, Grid, MenuItem, Paper, Snackbar, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs,
  TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import ReportExportButtons from "../common/ReportExportButtons";
import ItFormDialog from "./ItFormDialog";
import ItAttachments from "./ItAttachments";
import ItIncidentFormDialog from "../itRisk/ItIncidentFormDialog";
import { VoidDialog } from "../itRisk/ItIncidentDetailDialog";
import { useItRiskPermissions } from "../itRisk/itRiskShared";
import { Field, PageHeader, StateChip } from "./ItCommon";
import {
  BASE, PRIORITY_COLORS, TICKET_STATUS_COLORS, errorMessage, fileDate, fmtDateTime, options, stateText, useItCatalog, useItPermissions,
} from "./itShared";

// Mesa de ayuda de TI: cualquier usuario reporta y sigue sus tickets; quien
// tiene ti.soporte.atender ve y atiende todos. Backend: /api/it/tickets.

const hoursText = (h) => (h == null ? "" : Math.abs(h) < 1 ? `${Math.round(Math.abs(h) * 60)} min` : `${Math.round(Math.abs(h) * 10) / 10} h`);

// Mismo texto que SlaChip, para imprimir/exportar.
const slaText = (sla) => {
  if (!sla || sla.status === "ANULADO") return "";
  if (sla.status === "VENCIDO") return `Fuera de tiempo (${hoursText(sla.hours_left)})`;
  if (sla.status === "POR_VENCER") return `Vence en ${hoursText(sla.hours_left)}`;
  if (sla.status === "EN_PLAZO") return `Meta ${sla.hours} h`;
  return stateText(sla.status, null, sla.resolution_hours != null ? `(${sla.resolution_hours} h)` : "");
};

const SCOPE_LABEL = { all: "Todos", assigned: "Asignados a mí", mine: "Reportados por mí" };

export function SlaChip({ sla }) {
  if (!sla || sla.status === "ANULADO") return null;
  if (sla.status === "VENCIDO") return <Chip size="small" color="error" label={`Fuera de tiempo (${hoursText(sla.hours_left)})`} />;
  if (sla.status === "POR_VENCER") return <Chip size="small" color="warning" label={`Vence en ${hoursText(sla.hours_left)}`} />;
  if (sla.status === "EN_PLAZO") return <Chip size="small" variant="outlined" color="success" label={`Meta ${sla.hours} h`} />;
  return <StateChip state={sla.status} suffix={sla.resolution_hours != null ? `(${sla.resolution_hours} h)` : ""} />;
}

const useRiskModule = () => {
  const { tenant } = useAuth() || {};
  const mods = tenant?.enabled_modules ?? null;
  const { canManageIncidents } = useItRiskPermissions();
  return (mods === null || (Array.isArray(mods) && mods.includes("it_risk"))) && canManageIncidents;
};

function TicketDetail({ ticketId, catalog, onClose, onChanged }) {
  const { canVoid } = useItPermissions();
  const { user } = useAuth() || {};
  const canEscalate = useRiskModule();
  const [t, setT] = useState(null);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [form, setForm] = useState(null);
  const [agents, setAgents] = useState([]);
  const [assets, setAssets] = useState([]);
  const [voiding, setVoiding] = useState(false);
  const [reopen, setReopen] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [riskCatalog, setRiskCatalog] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await API.get(`${BASE}/tickets/${ticketId}`);
      setT(data);
      setForm({
        status: data.status, priority: data.priority, category: data.category,
        assigned_user_id: data.assigned_user_id ? String(data.assigned_user_id) : "", asset_id: data.asset_id ? String(data.asset_id) : "",
        resolution: data.resolution || "",
      });
      setError("");
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el ticket."));
    }
  }, [ticketId]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!t?.can_attend) return;
    API.get(`${BASE}/support-agents`).then(({ data }) => setAgents(data)).catch(() => {});
    API.get(`${BASE}/lookups`).then(({ data }) => setAssets(data.assets || [])).catch(() => {});
  }, [t?.can_attend]);

  const refresh = async () => { await load(); onChanged(); };
  const run = async (fn) => {
    try {
      setError("");
      await fn();
      await refresh();
    } catch (err) {
      setError(errorMessage(err, "No se pudo completar la acción."));
    }
  };

  const own = t && Number(t.requester_user_id) === Number(user?.id);
  const closed = t && ["CERRADO", "ANULADO"].includes(t.status);

  const openEscalate = async () => {
    if (!riskCatalog) {
      try {
        const { data } = await API.get("/api/it_risk/catalog");
        setRiskCatalog(data);
      } catch (err) {
        setError(errorMessage(err, "No se pudo abrir el registro de incidentes."));
        return;
      }
    }
    setEscalating(true);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {t ? `${t.ticket_number} · ${t.title}` : "Ticket"}
        {t && <Chip size="small" sx={{ ml: 1 }} color={TICKET_STATUS_COLORS[t.status]} label={catalog?.ticket_statuses?.[t.status]} />}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!t && !error && <CircularProgress size={22} />}
        {t && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={t.can_attend ? 7 : 12}>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                <Chip size="small" color={PRIORITY_COLORS[t.priority]} label={`Prioridad ${catalog?.ticket_priorities?.[t.priority]?.toLowerCase()}`} />
                <Chip size="small" variant="outlined" label={catalog?.ticket_categories?.[t.category]} />
                <SlaChip sla={t.sla} />
              </Stack>
              <Field label="Reportó">{`${t.requester_name} · ${fmtDateTime(t.opened_at)}${t.branch_name ? ` · ${t.branch_name}` : ""}`}</Field>
              {t.asset_code && <Field label="Equipo">{`${t.asset_code} · ${t.asset_name}`}</Field>}
              <Field label="Descripción">{t.description}</Field>
              {t.assigned_name && <Field label="Atiende">{t.assigned_name}</Field>}
              {t.resolution && <Field label="Solución">{t.resolution}</Field>}
              {t.incident && <Alert severity="info" sx={{ mb: 1 }}>Registrado como incidente de TI {t.incident.incident_number} (Art. 28).</Alert>}
              {t.status === "ANULADO" && <Alert severity="warning" sx={{ mb: 1 }}>Anulado por {t.voided_by_name}: {t.void_reason}</Alert>}

              {own && t.status === "RESUELTO" && (
                <Alert severity="success" sx={{ my: 1 }}
                  action={<Stack direction="row" spacing={1}>
                    <Button size="small" color="inherit" onClick={() => run(() => API.post(`${BASE}/tickets/${t.id}/requester-action`, { action: "CONFIRMAR" }))}>Confirmar</Button>
                    <Button size="small" color="inherit" onClick={() => setReopen(true)}>Sigue el problema</Button>
                  </Stack>}>
                  TI marcó este ticket como resuelto. ¿Quedó solucionado?
                </Alert>
              )}

              <Divider sx={{ my: 1.5 }} />
              <Typography fontWeight={700} sx={{ mb: 1 }}>Seguimiento</Typography>
              {t.comments.map((c) => (
                <Box key={c.id} sx={{ mb: 1, p: 1, borderRadius: 1, bgcolor: Number(c.is_internal) ? "#FFF7ED" : c.status_change ? "#F1F5F9" : "#F8FAFC" }}>
                  <Typography variant="caption" color="text.secondary">{c.user_name} · {c.created_at}{Number(c.is_internal) ? " · nota interna de TI" : ""}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{c.comment}</Typography>
                </Box>
              ))}
              {!t.comments.length && <Typography variant="body2" color="text.secondary">Sin comentarios todavía.</Typography>}
              {!closed && (
                <Box sx={{ mt: 1 }}>
                  <TextField fullWidth multiline minRows={2} size="small" label="Escribir un comentario" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    {t.can_attend ? <FormControlLabel control={<Checkbox size="small" checked={internal} onChange={(e) => setInternal(e.target.checked)} />} label="Nota interna (solo TI)" /> : <span />}
                    <Button size="small" variant="outlined" disabled={!comment.trim()}
                      onClick={() => run(async () => { await API.post(`${BASE}/tickets/${t.id}/comments`, { comment, is_internal: internal }); setComment(""); setInternal(false); })}>Enviar</Button>
                  </Stack>
                </Box>
              )}
              <Typography fontWeight={700} sx={{ mt: 2, mb: 1 }}>Adjuntos</Typography>
              <ItAttachments entityType="TICKET" entityId={t.id} canUpload={!closed && (own || t.can_attend)} />
            </Grid>
            {t.can_attend && form && (
              <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography fontWeight={700} sx={{ mb: 1.5 }}>Atención (TI)</Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <TextField select fullWidth size="small" label="Estado" value={form.status} disabled={t.status === "ANULADO"} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                        {options(catalog?.ticket_statuses).filter((o) => o.value !== "ANULADO").map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField select fullWidth size="small" label="Prioridad" value={form.priority} disabled={t.status === "ANULADO"} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                        {options(catalog?.ticket_priorities).map((o) => <MenuItem key={o.value} value={o.value}>{o.label} ({catalog.ticket_sla_hours[o.value]} h)</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField select fullWidth size="small" label="Categoría" value={form.category} disabled={t.status === "ANULADO"} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                        {options(catalog?.ticket_categories).map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField select fullWidth size="small" label="Asignado a" value={form.assigned_user_id} disabled={t.status === "ANULADO"} onChange={(e) => setForm((f) => ({ ...f, assigned_user_id: e.target.value }))}>
                        <MenuItem value="">Sin asignar</MenuItem>
                        {agents.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.full_name}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField select fullWidth size="small" label="Equipo" value={form.asset_id} disabled={t.status === "ANULADO"} onChange={(e) => setForm((f) => ({ ...f, asset_id: e.target.value }))}>
                        <MenuItem value="">—</MenuItem>
                        {assets.map((a) => <MenuItem key={a.id} value={String(a.id)}>{a.asset_code} · {a.name}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth multiline minRows={3} size="small" label="Solución" value={form.resolution} disabled={t.status === "ANULADO"} onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value }))} />
                    </Grid>
                  </Grid>
                  {t.status !== "ANULADO" && (
                    <Button fullWidth variant="contained" sx={{ mt: 1.5 }} onClick={() => run(() => API.put(`${BASE}/tickets/${t.id}`, form))}>Guardar atención</Button>
                  )}
                  {canEscalate && !t.incident && t.status !== "ANULADO" && (
                    <Button fullWidth variant="outlined" color="warning" sx={{ mt: 1 }} onClick={openEscalate}>Registrar como incidente de TI (Art. 28)</Button>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Primera respuesta: {t.first_response_at ? fmtDateTime(t.first_response_at) : "pendiente"} · Meta de solución: {fmtDateTime(t.sla?.due_at)}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        {t && t.status !== "ANULADO" && (canVoid || (own && t.status === "ABIERTO" && !t.first_response_at)) && (
          <Button color="error" onClick={() => setVoiding(true)}>Anular</Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={onClose}>Cerrar</Button>
      </DialogActions>
      <VoidDialog open={voiding} title={`Anular ${t?.ticket_number || ""}`} onClose={() => setVoiding(false)}
        onConfirm={async (reason) => { await API.post(`${BASE}/tickets/${t.id}/void`, { reason }); setVoiding(false); await refresh(); }} />
      <ItFormDialog open={reopen} title="Reabrir el ticket" fields={[{ name: "comment", label: "¿Qué sigue fallando?", type: "textarea", required: true, md: 12 }]}
        onClose={() => setReopen(false)}
        onSubmit={async (v) => { await API.post(`${BASE}/tickets/${t.id}/requester-action`, { action: "REABRIR", comment: v.comment }); setReopen(false); await refresh(); }} />
      {escalating && (
        <ItIncidentFormDialog
          open
          catalog={riskCatalog}
          prefill={{
            title: t.title,
            description: `${t.description}\n\nReportado en la mesa de ayuda (${t.ticket_number}) por ${t.requester_name}.`,
            occurred_at: String(t.opened_at).replace(" ", "T").slice(0, 16),
            detected_at: String(t.opened_at).replace(" ", "T").slice(0, 16),
            affected_systems: t.asset_code ? `${t.asset_code} · ${t.asset_name}` : "",
            corrective_actions: t.resolution || "",
          }}
          onClose={() => setEscalating(false)}
          onSaved={async (incident) => {
            setEscalating(false);
            await run(() => API.post(`${BASE}/tickets/${t.id}/link-incident`, { incident_id: incident.id }));
          }}
        />
      )}
    </Dialog>
  );
}

export default function ItHelpdesk() {
  const catalog = useItCatalog();
  const { canAttend } = useItPermissions();
  const [scope, setScope] = useState(canAttend ? "all" : "mine");
  const [status, setStatus] = useState("ACTIVOS");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [myAssets, setMyAssets] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const params = { scope };
      if (status) params.status = status;
      const { data: res } = await API.get(`${BASE}/tickets`, { params });
      setData(res);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los tickets."));
    }
  }, [scope, status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { API.get(`${BASE}/my-assets`).then(({ data: a }) => setMyAssets(a || [])).catch(() => {}); }, []);

  const attend = data?.can_attend;
  const fields = useMemo(() => [
    { name: "title", label: "Asunto", required: true, md: 12, help: "p. ej. La impresora de caja no imprime" },
    { name: "category", label: "Categoría", type: "select", required: true, options: options(catalog?.ticket_categories), md: 6 },
    { name: "priority", label: "Prioridad", type: "select", required: true, default: "MEDIA", options: options(catalog?.ticket_priorities), md: 6, help: "Urgente: no puede atender clientes" },
    { name: "description", label: "¿Qué está pasando?", type: "textarea", rows: 4, required: true, md: 12 },
    { name: "asset_id", label: "Equipo (si aplica)", type: "select", options: myAssets.map((a) => ({ value: a.id, label: `${a.asset_code} · ${a.name}` })), md: 12, show: () => myAssets.length > 0 },
  ], [catalog, myAssets]);

  const rows = data?.items || [];
  const statusLabel = status === "ACTIVOS" ? "Pendientes" : status ? catalog?.ticket_statuses?.[status] || status : "Todos";
  const buildReport = () => ({
    title: "Mesa de ayuda de TI",
    subtitle: [attend ? SCOPE_LABEL[scope] : "Reportados por mí", `Estado: ${statusLabel}`].join(" · "),
    orientation: "landscape",
    columns: [
      { field: "ticket_number", label: "Ticket" },
      { field: "title", label: "Asunto" },
      { field: "category", label: "Categoría", format: (v) => catalog?.ticket_categories?.[v] || v },
      ...(attend ? [{ field: "requester_name", label: "Reportó" }] : []),
      { field: "assigned_name", label: "Atiende" },
      { field: "priority", label: "Prioridad", format: (v) => catalog?.ticket_priorities?.[v] || v },
      { field: "status", label: "Estado", format: (v) => catalog?.ticket_statuses?.[v] || v },
      { label: "Tiempo", value: (t) => slaText(t.sla) },
      { field: "opened_at", label: "Abierto", format: fmtDateTime },
    ],
    rows,
    totals: [{ value: `${rows.length} ticket(s)`, colspan: attend ? 9 : 8 }],
    fileName: `mesa_de_ayuda_ti_${fileDate()}`,
  });
  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <PageHeader title="Mesa de ayuda de TI" subtitle={attend ? "Tickets de soporte de todos los usuarios, con tiempos de respuesta por prioridad." : "Reporte problemas con su equipo, el sistema o la red y siga su atención."} helpKey="ti.mesa-de-ayuda"
        actions={[
          <ReportExportButtons key="r" report={buildReport} disabled={!rows.length} />,
          <Button key="n" variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>Reportar un problema</Button>,
        ]} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ md: "center" }} flexWrap="wrap" useFlexGap>
        {attend && (
          <Tabs value={scope} onChange={(e, v) => setScope(v)}>
            <Tab value="all" label="Todos" />
            <Tab value="assigned" label="Asignados a mí" />
            <Tab value="mine" label="Reportados por mí" />
          </Tabs>
        )}
        <TextField select size="small" label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="ACTIVOS">Pendientes</MenuItem>
          <MenuItem value="">Todos</MenuItem>
          {options(catalog?.ticket_statuses).map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>
      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Ticket</TableCell><TableCell>Asunto</TableCell>{attend && <TableCell>Reportó</TableCell>}<TableCell>Prioridad</TableCell><TableCell>Estado</TableCell><TableCell>Tiempo</TableCell><TableCell>Abierto</TableCell></TableRow></TableHead>
          <TableBody>
            {!data && <TableRow><TableCell colSpan={7}><CircularProgress size={20} /></TableCell></TableRow>}
            {data && !rows.length && <TableRow><TableCell colSpan={7}><Typography color="text.secondary">No hay tickets con estos filtros.</Typography></TableCell></TableRow>}
            {rows.map((t) => (
              <TableRow key={t.id} hover sx={{ cursor: "pointer", opacity: t.status === "ANULADO" ? 0.55 : 1 }} onClick={() => setDetailId(t.id)}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{t.ticket_number}</TableCell>
                <TableCell><Typography fontWeight={600} fontSize={13.5}>{t.title}</Typography><Typography fontSize={12} color="text.secondary">{catalog?.ticket_categories?.[t.category]}{t.assigned_name ? ` · atiende ${t.assigned_name}` : ""}</Typography></TableCell>
                {attend && <TableCell>{t.requester_name}</TableCell>}
                <TableCell><Chip size="small" color={PRIORITY_COLORS[t.priority]} label={catalog?.ticket_priorities?.[t.priority]} /></TableCell>
                <TableCell><Chip size="small" color={TICKET_STATUS_COLORS[t.status]} label={catalog?.ticket_statuses?.[t.status]} /></TableCell>
                <TableCell><SlaChip sla={t.sla} /></TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDateTime(t.opened_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <ItFormDialog open={creating} title="Reportar un problema a TI" fields={fields} initial={{ priority: "MEDIA" }} submitLabel="Enviar"
        onClose={() => setCreating(false)}
        onSubmit={async (v) => {
          const { data: t } = await API.post(`${BASE}/tickets`, v);
          setCreating(false);
          setToast(`Ticket ${t.ticket_number} enviado a TI.`);
          await load();
        }} />
      {detailId && <TicketDetail ticketId={detailId} catalog={catalog} onClose={() => setDetailId(null)} onChanged={load} />}
      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
