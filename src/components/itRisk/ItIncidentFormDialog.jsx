import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, Grid,
  InputAdornment, MenuItem, TextField, Typography,
} from "@mui/material";
import API from "../../api";
import { BASE, errorMessage, toInputDateTime } from "./itRiskShared";

const empty = () => {
  const now = dayjs().format("YYYY-MM-DDTHH:mm");
  return {
    incident_type: "",
    title: "",
    description: "",
    occurred_at: now,
    detected_at: now,
    ended_at: "",
    affected_systems: "",
    affected_customers_count: "0",
    affected_customers_detail: "",
    affects_confidentiality: false,
    affects_integrity: false,
    affects_availability: false,
    economic_loss: "0",
    lost_profit: "0",
    cause_category: "",
    cause: "",
    corrective_actions: "",
    responsible_name: "",
    severity: "MEDIA",
    status: "ABIERTO",
  };
};

const fromIncident = (i) => ({
  ...empty(),
  ...Object.fromEntries(Object.keys(empty()).map((k) => [k, i[k] ?? ""])),
  occurred_at: toInputDateTime(i.occurred_at),
  detected_at: toInputDateTime(i.detected_at),
  ended_at: toInputDateTime(i.ended_at),
  affected_customers_count: String(i.affected_customers_count ?? 0),
  economic_loss: String(i.economic_loss ?? 0),
  lost_profit: String(i.lost_profit ?? 0),
  affects_confidentiality: Boolean(Number(i.affects_confidentiality)),
  affects_integrity: Boolean(Number(i.affects_integrity)),
  affects_availability: Boolean(Number(i.affects_availability)),
});

// Alta y edición de un incidente o evento de TI (Art. 28 / Art. 18 num. 1.1).
// `prefill` precarga un incidente nuevo (p. ej. desde un ticket de la mesa de ayuda).
export default function ItIncidentFormDialog({ open, catalog, incident, prefill, onClose, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(incident ? fromIncident(incident) : { ...empty(), ...(prefill || {}) });
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, incident]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggle = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.checked }));

  const types = catalog?.incident_types || {};
  const selectedType = types[form.incident_type];

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = incident
        ? await API.put(`${BASE}/incidents/${incident.id}`, form)
        : await API.post(`${BASE}/incidents`, form);
      onSaved(data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar el incidente."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>{incident ? `Editar ${incident.incident_number}` : "Registrar incidente o evento de TI"}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <TextField select fullWidth size="small" label="Tipo de evento" value={form.incident_type} onChange={set("incident_type")} required>
              {Object.entries(types).map(([k, t]) => (
                <MenuItem key={k} value={k}>{t.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth size="small" label="Severidad" value={form.severity} onChange={set("severity")}>
              {Object.entries(catalog?.severities || {}).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
            </TextField>
          </Grid>
          {selectedType && (
            <Grid item xs={12}>
              <Alert severity={selectedType.reportable ? "warning" : "info"} sx={{ py: 0 }}>
                {selectedType.reportable
                  ? `${selectedType.article}: se informa por escrito y de inmediato al Presidente Ejecutivo de CONAMI, y el detalle dentro de las ${catalog?.detail_deadline_hours || 24} horas siguientes.`
                  : `${selectedType.article}: no se informa a CONAMI; queda en la base histórica de eventos de pérdida.`}
              </Alert>
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Título" value={form.title} onChange={set("title")} required inputProps={{ maxLength: 200 }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={3} size="small" label="Descripción" value={form.description} onChange={set("description")} required />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" type="datetime-local" label="Ocurrencia" InputLabelProps={{ shrink: true }} value={form.occurred_at} onChange={set("occurred_at")} required />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" type="datetime-local" label="Detección" InputLabelProps={{ shrink: true }} value={form.detected_at} onChange={set("detected_at")} required helperText="El plazo de 24 h se cuenta desde aquí" />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" type="datetime-local" label="Solución" InputLabelProps={{ shrink: true }} value={form.ended_at} onChange={set("ended_at")} />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField fullWidth size="small" label="Sistemas afectados" value={form.affected_systems} onChange={set("affected_systems")} required inputProps={{ maxLength: 500 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField fullWidth size="small" type="number" label="Clientes afectados" value={form.affected_customers_count} onChange={set("affected_customers_count")} inputProps={{ min: 0, step: 1 }} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Detalle de clientes afectados" value={form.affected_customers_detail} onChange={set("affected_customers_detail")} />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">Información de clientes afectada (Art. 28 num. 1)</Typography>
            <FormGroup row>
              <FormControlLabel control={<Checkbox checked={form.affects_confidentiality} onChange={toggle("affects_confidentiality")} />} label="Confidencialidad" />
              <FormControlLabel control={<Checkbox checked={form.affects_integrity} onChange={toggle("affects_integrity")} />} label="Integridad" />
              <FormControlLabel control={<Checkbox checked={form.affects_availability} onChange={toggle("affects_availability")} />} label="Disponibilidad" />
            </FormGroup>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth size="small" type="number" label="Pérdida económica" value={form.economic_loss} onChange={set("economic_loss")}
              InputProps={{ startAdornment: <InputAdornment position="start">C$</InputAdornment> }} inputProps={{ min: 0, step: "0.01" }} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth size="small" type="number" label="Frustración de ganancia" value={form.lost_profit} onChange={set("lost_profit")}
              InputProps={{ startAdornment: <InputAdornment position="start">C$</InputAdornment> }} inputProps={{ min: 0, step: "0.01" }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth size="small" label="Causa" value={form.cause_category} onChange={set("cause_category")} required>
              {Object.entries(catalog?.causes || {}).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField fullWidth size="small" label="Detalle de la causa" value={form.cause} onChange={set("cause")} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={2} size="small" label="Acciones correctivas" value={form.corrective_actions} onChange={set("corrective_actions")} />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField fullWidth size="small" label="Responsable" value={form.responsible_name} onChange={set("responsible_name")} required inputProps={{ maxLength: 150 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField select fullWidth size="small" label="Estado" value={form.status} onChange={set("status")}>
              {Object.entries(catalog?.incident_statuses || {}).filter(([k]) => k !== "ANULADO").map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
      </DialogActions>
    </Dialog>
  );
}
