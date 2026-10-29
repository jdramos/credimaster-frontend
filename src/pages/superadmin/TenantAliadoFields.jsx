import React from "react";
import { Alert, Box, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { COMMISSION_TYPE_OPTIONS, describeRule, isoDate } from "./aliados";

// Que los selects muestren "Sin aliado" / "La del aliado" cuando están vacíos.
const SHOW_EMPTY = { InputLabelProps: { shrink: true }, SelectProps: { displayEmpty: true } };

// Aliado que trajo la empresa (diálogos Nueva/Editar empresa de TenantsPage).
// Controlado: `value` es el formulario de asignación (ver aliados.js). Se
// guarda junto con la empresa; dejar "Sin aliado" en una empresa que tenía
// uno termina la asignación.
export default function TenantAliadoFields({ value, onChange, aliados, history = [], unavailable = false, disabled = false }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  const selected = aliados.find((a) => String(a.id) === String(value.aliado_id));
  const past = history.filter((h) => h.status !== "ACTIVE");

  if (unavailable) {
    return (
      <Alert severity="info">
        Los aliados se activan al correr la migración db/license/033_create_aliados.js en la base de licencias.
      </Alert>
    );
  }

  return (
    <Box>
      <Grid container spacing={1.5}>
        <Grid item xs={12} md={6}>
          <TextField select label="Aliado" fullWidth size="small" {...SHOW_EMPTY} value={value.aliado_id} onChange={set("aliado_id")} disabled={disabled}>
            <MenuItem value="">Sin aliado</MenuItem>
            {aliados.map((a) => (
              <MenuItem key={a.id} value={String(a.id)} disabled={a.status !== "ACTIVE" && String(a.id) !== String(value.aliado_id)}>
                {a.name}
                {a.status !== "ACTIVE" ? " (inactivo)" : ""}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        {value.aliado_id && (
          <>
            <Grid item xs={6} md={3}>
              <TextField label="Comisiona desde" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
                value={value.start_date} onChange={set("start_date")} disabled={disabled} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField label="Hasta (opcional)" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }}
                value={value.end_date} onChange={set("end_date")} disabled={disabled} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField label="Máx. meses (opcional)" type="number" fullWidth size="small" inputProps={{ min: 1, step: 1 }}
                value={value.max_months} onChange={set("max_months")} disabled={disabled}
                helperText="Vacío = sin límite" />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Comisión propia de esta empresa (solo si se negoció distinto). Vacío = la del aliado:
                mensualidad {describeRule(selected?.commission_type, selected?.commission_value)}, implementación{" "}
                {describeRule(selected?.impl_commission_type, selected?.impl_commission_value)}.
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField select label="Mensualidad: tipo" fullWidth size="small" {...SHOW_EMPTY} value={value.commission_type} onChange={set("commission_type")} disabled={disabled}>
                <MenuItem value="">La del aliado</MenuItem>
                {COMMISSION_TYPE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField label={value.commission_type === "PERCENT" ? "Mensualidad: %" : "Mensualidad: monto"} type="number" fullWidth size="small"
                value={value.commission_value} onChange={set("commission_value")} disabled={disabled || !value.commission_type} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField select label="Implementación: tipo" fullWidth size="small" {...SHOW_EMPTY} value={value.impl_commission_type} onChange={set("impl_commission_type")} disabled={disabled}>
                <MenuItem value="">La del aliado</MenuItem>
                {COMMISSION_TYPE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField label={value.impl_commission_type === "PERCENT" ? "Implementación: %" : "Implementación: monto"} type="number" fullWidth size="small"
                value={value.impl_commission_value} onChange={set("impl_commission_value")} disabled={disabled || !value.impl_commission_type} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notas del acuerdo" fullWidth size="small" value={value.notes} onChange={set("notes")} disabled={disabled} />
            </Grid>
          </>
        )}
      </Grid>
      {past.length > 0 && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          Aliados anteriores: {past.map((h) => `${h.aliado_name} (${isoDate(h.start_date)} a ${isoDate(h.effective_end_date) || "—"})`).join(" · ")}
        </Typography>
      )}
    </Box>
  );
}
