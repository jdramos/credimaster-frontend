import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import API from "../../api";
import { BASE, errorMessage, periodOptions, todayISO } from "./ngrcShared";

// Registra el cumplimiento de una obligación NGRC o completa uno en proceso
// (la calificación del Art. 9: primero la sesión de Junta, después el envío
// a la CONAMI). Lo registrado no se edita: se anula y se vuelve a registrar.
export default function NgrcRecordDialog({ open, obligation, record, defaultPeriod, onClose, onDone }) {
  const completing = Boolean(record?.id);
  const calendar = obligation?.kind === "CALENDARIO";
  const needsSession = Boolean(obligation?.needs_board_session);
  const periods = useMemo(() => (calendar ? periodOptions(obligation.frequency) : []), [calendar, obligation]);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      period_key: record?.period_key || defaultPeriod || periods[0]?.key || "",
      board_session_date: record?.board_session_date || "",
      board_minutes_ref: record?.board_minutes_ref || "",
      completed_date: completing ? todayISO() : needsSession ? "" : todayISO(),
      reference: record?.reference || "",
      notes: record?.notes || "",
    });
    setFile(null);
    setError("");
  }, [open, record, defaultPeriod, periods, completing, needsSession]);

  if (!obligation) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    try {
      setSaving(true);
      setError("");
      const fd = new FormData();
      if (!completing) fd.append("obligation_code", obligation.code);
      Object.entries(form).forEach(([k, v]) => {
        if (completing && k === "period_key") return;
        fd.append(k, v ?? "");
      });
      if (file) fd.append("file", file);
      const opts = { headers: { "Content-Type": "multipart/form-data" } };
      if (completing) await API.put(`${BASE}/records/${record.id}`, fd, opts);
      else await API.post(`${BASE}/records`, fd, opts);
      onDone?.();
    } catch (err) {
      setError(errorMessage(err, "No se pudo registrar el cumplimiento."));
    } finally {
      setSaving(false);
    }
  };

  const completedLabel =
    obligation.audience === "CONAMI" ? "Fecha de envío a la CONAMI" : obligation.audience === "JUNTA" ? "Fecha en que se presentó / aprobó en Junta" : "Fecha en que se cumplió";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{completing ? "Completar registro" : "Registrar cumplimiento"}</DialogTitle>
      <DialogContent dividers>
        <Typography fontSize={13.5} fontWeight={700}>{obligation.article} · {obligation.title}</Typography>
        <Typography fontSize={12.5} color="text.secondary" sx={{ mb: 2 }}>{obligation.due_rule}</Typography>
        {needsSession && (
          <Alert severity="info" sx={{ mb: 2 }}>
            El informe se envía a la CONAMI dentro de los 30 días de la sesión de Junta, con la certificación del acta (decisiones sobre la calificación y las provisiones, con los votos disidentes). Puede registrar primero la sesión y completar el envío después.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          {calendar && (
            <TextField select label="Período" value={form.period_key || ""} onChange={set("period_key")} disabled={completing}>
              {periods.map((p) => <MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>)}
              {form.period_key && !periods.some((p) => p.key === form.period_key) && <MenuItem value={form.period_key}>{form.period_key}</MenuItem>}
            </TextField>
          )}
          {(needsSession || obligation.audience === "JUNTA") && (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {needsSession && (
                <TextField type="date" label="Sesión de Junta Directiva" InputLabelProps={{ shrink: true }} value={form.board_session_date || ""} onChange={set("board_session_date")} fullWidth />
              )}
              <TextField label="Acta (número)" value={form.board_minutes_ref || ""} onChange={set("board_minutes_ref")} fullWidth />
            </Stack>
          )}
          <TextField
            type="date"
            label={completedLabel}
            InputLabelProps={{ shrink: true }}
            value={form.completed_date || ""}
            onChange={set("completed_date")}
            helperText={needsSession && !completing ? "Déjela vacía si solo registra la sesión de Junta." : ""}
          />
          <TextField label={obligation.audience === "CONAMI" ? "Referencia del envío (oficio, acuse)" : "Referencia"} value={form.reference || ""} onChange={set("reference")} />
          <TextField label="Notas" multiline minRows={2} value={form.notes || ""} onChange={set("notes")} />
          <Button component="label" variant="outlined" startIcon={<AttachFileIcon />} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
            {file ? file.name : record?.file_name ? `Reemplazar adjunto (${record.file_name})` : "Adjuntar documento (acta, informe, acuse)"}
            <input hidden type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={saving}>{completing ? "Guardar" : "Registrar"}</Button>
      </DialogActions>
    </Dialog>
  );
}
