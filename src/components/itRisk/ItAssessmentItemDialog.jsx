import React, { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, List, ListItem, ListItemText, MenuItem,
  Stack, TextField, Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import API from "../../api";
import { VoidDialog } from "./ItIncidentDetailDialog";
import { BASE, CATEGORY_COLORS, errorMessage, fmtDateTime, useItRiskPermissions } from "./itRiskShared";

// Evaluación de un requisito de la lista de verificación (Art. 16).
export default function ItAssessmentItemDialog({ assessment, item, catalog, onClose, onSaved }) {
  const { canManageAssessment, canVoid } = useItRiskPermissions();
  const editable = assessment?.status === "BORRADOR" && canManageAssessment;
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [fileDescription, setFileDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [voiding, setVoiding] = useState(null);

  useEffect(() => {
    if (!item) return;
    setForm({
      status: item.status,
      evidence_notes: item.evidence_notes || "",
      responsible: item.responsible || "",
      improvement_plan: item.improvement_plan || "",
      due_date: item.due_date || "",
    });
    setFile(null);
    setFileDescription("");
    setError("");
  }, [item]);

  if (!item) return null;
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const needsPlan = ["NO_CUMPLE", "PARCIAL"].includes(form.status);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await API.put(`${BASE}/assessments/${assessment.id}/items/${item.id}`, form);
      onSaved(true);
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar el requisito."));
    } finally {
      setSaving(false);
    }
  };

  const uploadEvidence = async () => {
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("description", fileDescription);
      await API.post(`${BASE}/assessments/${assessment.id}/items/${item.id}/evidence`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setFile(null);
      setFileDescription("");
      onSaved(false);
    } catch (err) {
      setError(errorMessage(err, "No se pudo adjuntar la evidencia."));
    } finally {
      setSaving(false);
    }
  };

  const openEvidence = async (ev) => {
    try {
      const { data } = await API.get(`${BASE}/assessments/${assessment.id}/evidence/${ev.id}/file`);
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      setError(errorMessage(err, "No se pudo abrir el archivo."));
    }
  };

  const confirmVoid = async (reason) => {
    await API.post(`${BASE}/assessments/${assessment.id}/evidence/${voiding.id}/void`, { reason });
    setVoiding(null);
    onSaved(false);
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {item.item_code} · {item.article}
        <Chip size="small" sx={{ ml: 1 }} color={CATEGORY_COLORS[item.infraction_category]}
          label={`${catalog?.infraction_categories?.[item.infraction_category] || item.infraction_category} · ${item.infraction_ref}`} />
      </DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ mb: 1 }}>{item.requirement}</Typography>
        {Number(item.analog) === 1 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
            El Art. 21 no nombra este requisito; se clasifica como “otras infracciones de igual o similar gravedad”.
          </Typography>
        )}
        {item.hint && <Alert severity="info" sx={{ mb: 2, py: 0 }}>{item.hint}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <TextField select fullWidth size="small" label="Estado" value={form.status || "PENDIENTE"} onChange={set("status")} disabled={!editable}>
              {Object.entries(catalog?.item_statuses || {}).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={7}>
            <TextField fullWidth size="small" label="Responsable" value={form.responsible} onChange={set("responsible")} disabled={!editable} required={needsPlan} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={2} size="small" label={form.status === "NO_APLICA" ? "Justificación (por qué no aplica)" : "Evidencia"}
              helperText="Documento, acta, política o sistema que demuestra el cumplimiento" value={form.evidence_notes} onChange={set("evidence_notes")} disabled={!editable} />
          </Grid>
          {(needsPlan || form.improvement_plan) && (
            <>
              <Grid item xs={12} md={8}>
                <TextField fullWidth multiline minRows={2} size="small" label="Plan de mejora" value={form.improvement_plan} onChange={set("improvement_plan")} disabled={!editable} required={needsPlan} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" type="date" label="Fecha compromiso" InputLabelProps={{ shrink: true }} value={form.due_date} onChange={set("due_date")} disabled={!editable} />
              </Grid>
            </>
          )}
        </Grid>

        <Typography fontWeight={700} sx={{ mt: 3, mb: 1 }}>Evidencia adjunta</Typography>
        <List dense disablePadding>
          {(item.evidence || []).map((ev) => (
            <ListItem key={ev.id} disableGutters
              secondaryAction={
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => openEvidence(ev)}>Ver</Button>
                  {!ev.voided_at && editable && canVoid && <Button size="small" color="error" onClick={() => setVoiding(ev)}>Anular</Button>}
                </Stack>
              }>
              <ListItemText
                primary={<span style={ev.voided_at ? { textDecoration: "line-through", color: "var(--cm-text-3, #94A3B8)" } : undefined}>{ev.file_name}</span>}
                secondary={ev.voided_at ? `Anulada: ${ev.void_reason}` : `${ev.description ? `${ev.description} · ` : ""}${ev.uploaded_by_name || ""} · ${fmtDateTime(ev.uploaded_at)}`}
              />
            </ListItem>
          ))}
          {!(item.evidence || []).length && <Typography variant="body2" color="text.secondary">Sin archivos.</Typography>}
        </List>
        {editable && (
          <Box sx={{ mt: 1, display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            <Button component="label" size="small" startIcon={<AttachFileIcon />}>
              {file ? file.name : "Elegir archivo"}
              <input hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </Button>
            <TextField size="small" label="Descripción" value={fileDescription} onChange={(e) => setFileDescription(e.target.value)} sx={{ flex: 1, minWidth: 200 }} />
            <Button size="small" variant="outlined" onClick={uploadEvidence} disabled={!file || saving}>Adjuntar</Button>
          </Box>
        )}
        {!editable && assessment?.status === "PRESENTADA" && (
          <Alert severity="info" sx={{ mt: 2 }}>La autoevaluación ya se presentó a la Junta Directiva: es de solo lectura.</Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cerrar</Button>
        {editable && <Button variant="contained" onClick={save} disabled={saving}>Guardar</Button>}
      </DialogActions>
      <VoidDialog open={Boolean(voiding)} title={`Anular evidencia ${voiding?.file_name || ""}`} onClose={() => setVoiding(null)} onConfirm={confirmVoid} />
    </Dialog>
  );
}
