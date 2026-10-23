import React, { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, MenuItem,
  Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import API from "../../api";
import { buildNoticeHtml, downloadWord, printHtml } from "../../reports/itRiskLetters";
import {
  BASE, INCIDENT_STATUS_COLORS, NOTICE_STATUS, errorMessage, fmtDateTime, hoursText, nio, useCompany, useItRiskPermissions,
} from "./itRiskShared";

const CHANNELS = ["Carta entregada en CONAMI", "Correo electrónico", "Portal o sistema de CONAMI", "Otro"];

export function VoidDialog({ open, title, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);
  const confirm = async () => {
    setSaving(true);
    setError("");
    try {
      await onConfirm(reason);
    } catch (err) {
      setError(errorMessage(err, "No se pudo anular."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          El registro no se borra: queda anulado, con el motivo y quién lo anuló.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <TextField autoFocus fullWidth multiline minRows={2} label="Motivo de la anulación" value={reason} onChange={(e) => setReason(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button color="error" variant="contained" onClick={confirm} disabled={saving || reason.trim().length < 5}>Anular</Button>
      </DialogActions>
    </Dialog>
  );
}

const Field = ({ label, children }) => (
  <Box sx={{ mb: 1 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{children || "—"}</Typography>
  </Box>
);

function NoticeCard({ type, label, state, incident, catalog, settings, onRegistered, onVoid }) {
  const company = useCompany();
  const { canManageIncidents, canVoid } = useItRiskPermissions();
  const [reference, setReference] = useState("");
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ sent_at: "", reference: "", channel: CHANNELS[0], notes: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const status = NOTICE_STATUS[state?.status] || { label: state?.status, color: "default" };
  const history = (incident.notices || []).filter((n) => n.notice_type === type);
  const active = history.find((n) => !n.voided_at);
  const voided = incident.status === "ANULADO";
  const blockedByInitial = type === "DETALLE" && !(incident.notices || []).some((n) => n.notice_type === "INICIAL" && !n.voided_at);

  const html = () => buildNoticeHtml(type, { incident, settings, company, catalog, reference });
  const fileName = `${type === "DETALLE" ? "Detalle_24h" : "Aviso_inicial"}_${incident.incident_number}`;

  const openRegister = () => {
    setForm({ sent_at: dayjs().format("YYYY-MM-DDTHH:mm"), reference, channel: CHANNELS[0], notes: "" });
    setFile(null);
    setError("");
    setRegistering(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("notice_type", type);
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("recipient", [settings?.recipient_name, settings?.recipient_title].filter(Boolean).join(", "));
      if (file) fd.append("file", file);
      await API.post(`${BASE}/incidents/${incident.id}/notices`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setRegistering(false);
      onRegistered();
    } catch (err) {
      setError(errorMessage(err, "No se pudo registrar el envío."));
    } finally {
      setSaving(false);
    }
  };

  const openFile = async (n) => {
    try {
      const { data } = await API.get(`${BASE}/incidents/${incident.id}/notices/${n.id}/file`);
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      setError(errorMessage(err, "No se pudo abrir el archivo."));
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography fontWeight={700}>{label}</Typography>
        {state && <Chip size="small" color={status.color} label={status.label} />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {!state
          ? history.length ? "Envíos registrados antes de la anulación:" : "Sin envíos registrados."
          : type === "INICIAL"
          ? state?.status === "PENDIENTE_INMEDIATO"
            ? `Debe enviarse de inmediato. Han pasado ${hoursText(state.hours_since_detection)} desde la detección.`
            : `Enviado ${hoursText(state?.hours_after_detection)} después de la detección.`
          : active
            ? `Plazo: ${fmtDateTime(state?.due_at)}.`
            : `Plazo: ${fmtDateTime(state?.due_at)} (${state?.hours_left >= 0 ? `faltan ${hoursText(state?.hours_left)}` : `vencido hace ${hoursText(state?.hours_left)}`}).`}
      </Typography>

      {!voided && (
        <>
          <TextField size="small" fullWidth label="Referencia del escrito (opcional)" value={reference} onChange={(e) => setReference(e.target.value)} sx={{ mb: 1 }} placeholder="p. ej. GG-045-2026" />
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => printHtml(html())}>Escrito en PDF</Button>
            <Button size="small" variant="outlined" startIcon={<DescriptionIcon />} onClick={() => downloadWord(html(), fileName)}>Word</Button>
            {canManageIncidents && !active && (
              <Button size="small" variant="contained" startIcon={<SendIcon />} onClick={openRegister} disabled={blockedByInitial}>Registrar envío</Button>
            )}
          </Stack>
          {blockedByInitial && !active && <Typography variant="caption" color="text.secondary">Registre primero el aviso inicial.</Typography>}
        </>
      )}

      {registering && (
        <Box sx={{ border: "1px dashed #94A3B8", borderRadius: 1, p: 1.5, mb: 1.5 }}>
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth type="datetime-local" label="Fecha y hora de envío" InputLabelProps={{ shrink: true }} value={form.sent_at} onChange={(e) => setForm((f) => ({ ...f, sent_at: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField size="small" fullWidth label="Referencia de envío" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} helperText="No. de oficio o de recibido" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select size="small" fullWidth label="Medio" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
                {CHANNELS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button component="label" size="small" startIcon={<AttachFileIcon />} sx={{ mt: 0.5 }}>
                {file ? file.name : "Adjuntar acuse (opcional)"}
                <input hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </Button>
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth label="Notas" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
            <Button size="small" onClick={() => setRegistering(false)} disabled={saving}>Cancelar</Button>
            <Button size="small" variant="contained" onClick={submit} disabled={saving}>Guardar envío</Button>
          </Stack>
        </Box>
      )}

      {history.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>Enviado</TableCell><TableCell>Referencia</TableCell><TableCell>Medio</TableCell><TableCell /></TableRow>
          </TableHead>
          <TableBody>
            {history.map((n) => (
              <TableRow key={n.id} sx={n.voided_at ? { "& td": { color: "text.disabled", textDecoration: "line-through" } } : undefined}>
                <TableCell>{fmtDateTime(n.sent_at)}</TableCell>
                <TableCell>{n.reference}</TableCell>
                <TableCell>{n.channel || "—"}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap", textDecoration: "none !important" }}>
                  {n.file_name && <Button size="small" onClick={() => openFile(n)}>Acuse</Button>}
                  {!n.voided_at && canVoid && <Button size="small" color="error" onClick={() => onVoid(n)}>Anular</Button>}
                  {n.voided_at && <Typography variant="caption">Anulado: {n.void_reason}</Typography>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!registering && error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Paper>
  );
}

// Ficha de un incidente: datos, plazos del Art. 28, escritos y envíos a CONAMI.
export default function ItIncidentDetailDialog({ incidentId, catalog, settings, onClose, onEdit, onChanged }) {
  const { canManageIncidents, canVoid } = useItRiskPermissions();
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState("");
  const [voiding, setVoiding] = useState(null);

  const load = useCallback(async () => {
    if (!incidentId) return;
    try {
      const { data } = await API.get(`${BASE}/incidents/${incidentId}`);
      setIncident(data);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el incidente."));
    }
  }, [incidentId]);

  useEffect(() => {
    setIncident(null);
    load();
  }, [load]);

  const refresh = async () => {
    await load();
    onChanged();
  };

  const confirmVoid = async (reason) => {
    if (voiding.kind === "incident") {
      await API.post(`${BASE}/incidents/${incident.id}/void`, { reason });
    } else {
      await API.post(`${BASE}/incidents/${incident.id}/notices/${voiding.notice.id}/void`, { reason });
    }
    setVoiding(null);
    await refresh();
  };

  const types = catalog?.incident_types || {};
  const type = incident ? types[incident.incident_type] : null;
  const criteria = incident
    ? [
      Number(incident.affects_confidentiality) ? "Confidencialidad" : null,
      Number(incident.affects_integrity) ? "Integridad" : null,
      Number(incident.affects_availability) ? "Disponibilidad" : null,
    ].filter(Boolean)
    : [];

  return (
    <Dialog open={Boolean(incidentId)} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {incident ? `${incident.incident_number} · ${incident.title}` : "Incidente"}
        {incident && (
          <Chip size="small" sx={{ ml: 1 }} color={INCIDENT_STATUS_COLORS[incident.status]} label={catalog?.incident_statuses?.[incident.status] || incident.status} />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error">{error}</Alert>}
        {!incident && !error && <CircularProgress size={24} />}
        {incident && (
          <>
            {incident.status === "ANULADO" && (
              <Alert severity="warning" sx={{ mb: 2 }}>Anulado por {incident.voided_by_name}: {incident.void_reason}</Alert>
            )}
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Field label="Tipo de evento">{type ? `${type.short} (${type.article})` : incident.incident_type}</Field>
                <Field label="Ocurrencia">{fmtDateTime(incident.occurred_at)}</Field>
                <Field label="Detección">{fmtDateTime(incident.detected_at)}</Field>
                <Field label="Solución">{incident.ended_at ? fmtDateTime(incident.ended_at) : "Sin solucionar"}</Field>
                <Field label="Severidad">{catalog?.severities?.[incident.severity]}</Field>
                <Field label="Responsable">{incident.responsible_name}</Field>
              </Grid>
              <Grid item xs={12} md={8}>
                <Field label="Descripción">{incident.description}</Field>
                <Field label="Sistemas afectados">{incident.affected_systems}</Field>
                <Field label="Clientes afectados">
                  {`${Number(incident.affected_customers_count || 0).toLocaleString("es-NI")}${incident.affected_customers_detail ? ` — ${incident.affected_customers_detail}` : ""}`}
                </Field>
                {criteria.length > 0 && <Field label="Información afectada">{criteria.join(", ")}</Field>}
                <Field label="Impacto económico">{`Pérdida ${nio(incident.economic_loss)} · Frustración de ganancia ${nio(incident.lost_profit)}`}</Field>
                <Field label="Causa">{`${catalog?.causes?.[incident.cause_category] || incident.cause_category}${incident.cause ? `: ${incident.cause}` : ""}`}</Field>
                <Field label="Acciones correctivas">{incident.corrective_actions}</Field>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />
            {incident.reportable ? (
              <>
                <Typography fontWeight={700} sx={{ mb: 1 }}>Avisos al Presidente Ejecutivo de CONAMI (Art. 28)</Typography>
                {!settings?.signer_name && (
                  <Alert severity="info" sx={{ mb: 1.5 }}>
                    Configure el firmante de los escritos en la pestaña “Escritos a CONAMI” (o en Datos legales de la IMF).
                  </Alert>
                )}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <NoticeCard type="INICIAL" label="Aviso inicial (inmediato)" state={incident.deadlines?.initial} incident={incident} catalog={catalog} settings={settings}
                      onRegistered={refresh} onVoid={(notice) => setVoiding({ kind: "notice", notice })} />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <NoticeCard type="DETALLE" label="Informe de detalle (24 horas)" state={incident.deadlines?.detail} incident={incident} catalog={catalog} settings={settings}
                      onRegistered={refresh} onVoid={(notice) => setVoiding({ kind: "notice", notice })} />
                  </Grid>
                </Grid>
              </>
            ) : (
              <Alert severity="info">Evento de pérdida (Art. 18 num. 1.1): no se informa a CONAMI; cuenta en la base histórica y en el análisis de frecuencia e impacto.</Alert>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
              Registrado por {incident.created_by_name || "—"} el {fmtDateTime(incident.created_at)}
              {incident.updated_by_name ? ` · última edición: ${incident.updated_by_name}` : ""}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {incident && incident.status !== "ANULADO" && canVoid && (
          <Button color="error" onClick={() => setVoiding({ kind: "incident" })}>Anular incidente</Button>
        )}
        <Box sx={{ flex: 1 }} />
        {incident && incident.status !== "ANULADO" && canManageIncidents && (
          <Button onClick={() => onEdit(incident)}>Editar</Button>
        )}
        <Button variant="contained" onClick={onClose}>Cerrar</Button>
      </DialogActions>
      <VoidDialog
        open={Boolean(voiding)}
        title={voiding?.kind === "incident" ? `Anular ${incident?.incident_number}` : `Anular el envío ${voiding?.notice?.reference || ""}`}
        onClose={() => setVoiding(null)}
        onConfirm={confirmVoid}
      />
    </Dialog>
  );
}
