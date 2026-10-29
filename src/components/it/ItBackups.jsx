import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Paper, Snackbar, Table,
  TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import API from "../../api";
import ReportExportButtons from "../common/ReportExportButtons";
import ItFormDialog from "./ItFormDialog";
import { VoidDialog } from "../itRisk/ItIncidentDetailDialog";
import { Field, PageHeader, StateChip } from "./ItCommon";
import {
  BASE, errorMessage, fileDate, fmtDate, fmtDateTime, options, stateText, useItCatalog, useItLookups, useItPermissions,
} from "./itShared";

// Respaldos (Art. 11 num. 7 de la norma CONAMI de riesgo tecnológico): plan
// de cada respaldo y bitácora de respaldos y pruebas de restauración.

const jobFields = (catalog, lookups) => [
  { name: "name", label: "Nombre", required: true, md: 6, help: "p. ej. Base de datos del sistema" },
  { name: "frequency", label: "Frecuencia", type: "select", required: true, options: options(catalog?.backup_frequencies), md: 3 },
  { name: "restore_test_months", label: "Probar restauración cada (meses)", type: "number", default: "6", md: 3 },
  { name: "scope", label: "Qué se respalda", type: "textarea", required: true, md: 12 },
  { name: "method", label: "Herramienta o método", md: 6 },
  { name: "retention", label: "Retención", md: 6, help: "p. ej. 30 diarios y 12 mensuales" },
  { name: "storage", label: "Dónde se guarda", type: "select", required: true, options: options(catalog?.backup_storage), md: 6 },
  { name: "storage_location", label: "Ubicación del respaldo", md: 6 },
  { name: "encrypted", label: "Respaldo cifrado (Art. 11 num. 7.2)", type: "checkbox", md: 6 },
  { name: "responsible", label: "Responsable", required: true, md: 6 },
  { name: "asset_id", label: "Equipo o servicio respaldado", type: "select", options: lookups.assets.map((a) => ({ value: a.id, label: `${a.asset_code} · ${a.name}` })), md: 12 },
  { name: "notes", label: "Notas", type: "textarea", md: 12 },
];

const eventFields = (catalog) => [
  { name: "event_type", label: "Registro", type: "select", required: true, options: options(catalog?.backup_event_types), md: 4 },
  { name: "executed_at", label: "Fecha y hora", type: "datetime", required: true, md: 4 },
  { name: "result", label: "Resultado", type: "select", required: true, options: options(catalog?.backup_results), md: 4 },
  { name: "restored_what", label: "Qué se restauró y dónde", md: 12, show: (v) => v.event_type === "PRUEBA_RESTAURACION" },
  { name: "size_text", label: "Tamaño", md: 4 },
  { name: "duration_minutes", label: "Duración (minutos)", type: "number", md: 4 },
  { name: "performed_by", label: "Realizado por", required: true, md: 4 },
  { name: "notes", label: "Notas (obligatorio si hubo errores)", type: "textarea", md: 12 },
];

const BACKUP_LABEL = { AL_DIA: "Respaldo al día", ATRASADO: "Respaldo atrasado", SIN_REGISTROS: "Sin respaldos registrados", INACTIVO: "Inactivo" };
const RESTORE_LABEL = { AL_DIA: "Restauración probada", VENCIDA: "Prueba de restauración vencida", SIN_PRUEBAS: "Restauración nunca probada", INACTIVO: "Inactivo" };

function JobDetail({ jobId, catalog, onClose, onChanged, onEdit }) {
  const { canManage, canVoid } = useItPermissions();
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [eventOpen, setEventOpen] = useState(null);
  const [voiding, setVoiding] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await API.get(`${BASE}/backups/${jobId}`);
      setJob(data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el respaldo."));
    }
  }, [jobId]);
  useEffect(() => { load(); }, [load]);
  const refresh = async () => { await load(); onChanged(); };
  const active = Number(job?.is_active) === 1;

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{job ? job.name : "Respaldo"}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!job && !error && <CircularProgress size={22} />}
        {job && (
          <>
            {!active && <Alert severity="warning" sx={{ mb: 2 }}>Inactivo desde {fmtDateTime(job.deactivated_at)}: {job.deactivation_reason}</Alert>}
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Field label="Qué se respalda">{job.scope}</Field>
                <Field label="Frecuencia / retención">{`${catalog?.backup_frequencies?.[job.frequency]}${job.retention ? ` · ${job.retention}` : ""}`}</Field>
              </Grid>
              <Grid item xs={12} md={4}>
                <Field label="Dónde se guarda">{`${catalog?.backup_storage?.[job.storage]}${job.storage_location ? ` · ${job.storage_location}` : ""}`}</Field>
                <Field label="Cifrado">{Number(job.encrypted) ? "Sí" : "No"}</Field>
                <Field label="Responsable">{job.responsible}</Field>
              </Grid>
              <Grid item xs={12} md={4}>
                <Field label="Último respaldo exitoso">{job.state.last_backup_at ? fmtDateTime(job.state.last_backup_at) : "—"} <StateChip state={job.state.backup} label={BACKUP_LABEL[job.state.backup]} /></Field>
                <Field label="Última prueba de restauración">{job.state.last_restore_test_at ? `${fmtDateTime(job.state.last_restore_test_at)} · próxima ${fmtDate(job.state.restore_due)}` : "—"} <StateChip state={job.state.restore} label={RESTORE_LABEL[job.state.restore]} /></Field>
              </Grid>
            </Grid>
            {!job.state.offsite_ok && <Alert severity="warning" sx={{ my: 1 }}>Este respaldo se guarda solo en el mismo sitio: el Art. 11 num. 7.4 pide copia fuera del CPD.</Alert>}
            {canManage && active && (
              <Box sx={{ my: 1, display: "flex", gap: 1 }}>
                <Button size="small" variant="outlined" onClick={() => setEventOpen("RESPALDO")}>Registrar respaldo</Button>
                <Button size="small" variant="outlined" onClick={() => setEventOpen("PRUEBA_RESTAURACION")}>Registrar prueba de restauración</Button>
              </Box>
            )}
            <Table size="small">
              <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Registro</TableCell><TableCell>Resultado</TableCell><TableCell>Detalle</TableCell><TableCell>Por</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {job.events.map((e) => (
                  <TableRow key={e.id} sx={e.voided_at ? { opacity: 0.5 } : undefined}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.executed_at)}</TableCell>
                    <TableCell>{catalog?.backup_event_types?.[e.event_type]}</TableCell>
                    <TableCell>{catalog?.backup_results?.[e.result]}</TableCell>
                    <TableCell>{[e.restored_what, e.size_text, e.duration_minutes != null ? `${e.duration_minutes} min` : null, e.notes].filter(Boolean).join(" · ")}{e.voided_at && <Typography variant="caption" display="block">Anulado: {e.void_reason}</Typography>}</TableCell>
                    <TableCell>{e.performed_by}</TableCell>
                    <TableCell>{!e.voided_at && canVoid && <Button size="small" color="error" onClick={() => setVoiding(e)}>Anular</Button>}</TableCell>
                  </TableRow>
                ))}
                {!job.events.length && <TableRow><TableCell colSpan={6}>Sin registros todavía.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {job && active && canVoid && <Button color="error" onClick={() => setDeactivating(true)}>Desactivar</Button>}
        {job && !active && canManage && <Button onClick={async () => { await API.post(`${BASE}/backups/${job.id}/activate`); await refresh(); }}>Reactivar</Button>}
        <Box sx={{ flex: 1 }} />
        {job && canManage && <Button onClick={() => onEdit(job)}>Editar</Button>}
        <Button variant="contained" onClick={onClose}>Cerrar</Button>
      </DialogActions>
      <ItFormDialog open={Boolean(eventOpen)} title={eventOpen === "RESPALDO" ? "Registrar respaldo" : "Registrar prueba de restauración"} fields={eventFields(catalog)}
        initial={{ event_type: eventOpen, executed_at: dayjs().format("YYYY-MM-DDTHH:mm"), result: "EXITOSO", performed_by: job?.responsible }}
        onClose={() => setEventOpen(null)}
        onSubmit={async (v) => { await API.post(`${BASE}/backups/${job.id}/events`, v); setEventOpen(null); await refresh(); }} />
      <VoidDialog open={Boolean(voiding)} title="Anular registro" onClose={() => setVoiding(null)}
        onConfirm={async (reason) => { await API.post(`${BASE}/backups/${job.id}/events/${voiding.id}/void`, { reason }); setVoiding(null); await refresh(); }} />
      <VoidDialog open={deactivating} title={`Desactivar ${job?.name || ""}`} onClose={() => setDeactivating(false)}
        onConfirm={async (reason) => { await API.post(`${BASE}/backups/${job.id}/deactivate`, { reason }); setDeactivating(false); await refresh(); }} />
    </Dialog>
  );
}

export default function ItBackups() {
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
      const { data } = await API.get(`${BASE}/backups`, { params: { include_inactive: "1" } });
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el plan de respaldos."));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const fields = useMemo(() => jobFields(catalog, lookups), [catalog, lookups]);
  const save = async (values) => {
    if (editing?.id) await API.put(`${BASE}/backups/${editing.id}`, values);
    else await API.post(`${BASE}/backups`, values);
    setToast(editing?.id ? "Respaldo actualizado." : "Respaldo registrado.");
    setEditing(null);
    await load();
  };
  const activeRows = (rows || []).filter((r) => Number(r.is_active));
  const noOffsite = activeRows.length > 0 && !activeRows.some((r) => r.state.offsite_ok);

  const buildReport = () => ({
    title: "Plan de respaldos",
    orientation: "landscape",
    columns: [
      { field: "name", label: "Respaldo" },
      { field: "scope", label: "Alcance" },
      { field: "frequency", label: "Frecuencia", format: (v) => catalog?.backup_frequencies?.[v] || v },
      { label: "Dónde", value: (j) => `${catalog?.backup_storage?.[j.storage] || j.storage || ""}${Number(j.encrypted) ? " · cifrado" : ""}` },
      { label: "Último respaldo", value: (j) => [stateText(j.state.backup, BACKUP_LABEL[j.state.backup]), j.state.last_backup_at ? fmtDateTime(j.state.last_backup_at) : ""].filter(Boolean).join(" · ") },
      { label: "Restauración", value: (j) => stateText(j.state.restore, RESTORE_LABEL[j.state.restore]) },
      { field: "responsible", label: "Responsable" },
      { field: "is_active", label: "Activo", format: (v) => (Number(v) ? "Sí" : "No") },
    ],
    rows: rows || [],
    fileName: `respaldos_ti_${fileDate()}`,
  });

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <PageHeader title="Respaldos" subtitle="Plan de respaldos, bitácora y pruebas periódicas de restauración (Art. 11 num. 7)." helpKey="ti.respaldos"
        actions={[
          <ReportExportButtons key="r" report={buildReport} disabled={!rows?.length} />,
          canManage && <Button key="n" variant="contained" startIcon={<AddIcon />} onClick={() => setEditing({})}>Nuevo respaldo</Button>,
        ]} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {noOffsite && <Alert severity="warning" sx={{ mb: 2 }}>Ningún respaldo activo se guarda fuera del sitio (Art. 11 num. 7.4).</Alert>}
      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Respaldo</TableCell><TableCell>Frecuencia</TableCell><TableCell>Dónde</TableCell><TableCell>Último respaldo</TableCell><TableCell>Restauración</TableCell><TableCell>Responsable</TableCell></TableRow></TableHead>
          <TableBody>
            {!rows && <TableRow><TableCell colSpan={6}><CircularProgress size={20} /></TableCell></TableRow>}
            {rows && !rows.length && <TableRow><TableCell colSpan={6}><Typography color="text.secondary">No hay respaldos definidos.</Typography></TableCell></TableRow>}
            {(rows || []).map((j) => (
              <TableRow key={j.id} hover sx={{ cursor: "pointer", opacity: Number(j.is_active) ? 1 : 0.55 }} onClick={() => setDetailId(j.id)}>
                <TableCell><Typography fontWeight={600} fontSize={13.5}>{j.name}</Typography><Typography fontSize={12} color="text.secondary">{j.scope}</Typography></TableCell>
                <TableCell>{catalog?.backup_frequencies?.[j.frequency]}</TableCell>
                <TableCell>{catalog?.backup_storage?.[j.storage]}{Number(j.encrypted) ? " · cifrado" : ""}</TableCell>
                <TableCell><StateChip state={j.state.backup} label={BACKUP_LABEL[j.state.backup]} />{j.state.last_backup_at && <Typography fontSize={12} color="text.secondary">{fmtDateTime(j.state.last_backup_at)}</Typography>}</TableCell>
                <TableCell><StateChip state={j.state.restore} label={RESTORE_LABEL[j.state.restore]} /></TableCell>
                <TableCell>{j.responsible}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <ItFormDialog open={Boolean(editing)} title={editing?.id ? `Editar ${editing.name}` : "Nuevo respaldo"} fields={fields}
        initial={editing?.id ? editing : { frequency: "DIARIO", restore_test_months: 6, storage: "NUBE" }} onClose={() => setEditing(null)} onSubmit={save} />
      {detailId && <JobDetail jobId={detailId} catalog={catalog} onClose={() => setDetailId(null)} onChanged={load} onEdit={(j) => { setDetailId(null); setEditing(j); }} />}
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
