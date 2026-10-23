import React, { useEffect, useState } from "react";
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, InputAdornment,
  MenuItem, TextField, Typography,
} from "@mui/material";
import { errorMessage } from "./itShared";

// Formulario genérico de Gestión de TI. Cada campo:
// { name, label, type: text|textarea|select|number|money|date|datetime|checkbox|section,
//   options: [{value,label}], required, md (ancho en 12avos), help, emptyLabel, show(values) }
export default function ItFormDialog({ open, title, fields, initial, onClose, onSubmit, submitLabel = "Guardar", maxWidth = "md", intro }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Se carga solo al abrir: `initial` suele ser un objeto nuevo en cada
  // render de la pantalla de fondo y no debe borrar lo que se va escribiendo.
  useEffect(() => {
    if (!open) return;
    const base = {};
    fields.forEach((f) => {
      if (f.type === "section") return;
      const v = initial?.[f.name];
      base[f.name] = f.type === "checkbox" ? Boolean(Number(v)) : v == null ? (f.default ?? "") : String(v);
    });
    setValues(base);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {intro && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{intro}</Typography>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          {fields.filter((f) => !f.show || f.show(values)).map((f) => {
            if (f.type === "section") {
              return (
                <Grid item xs={12} key={f.label}>
                  <Typography fontWeight={700} sx={{ mt: 1 }}>{f.label}</Typography>
                  {f.help && <Typography variant="caption" color="text.secondary">{f.help}</Typography>}
                </Grid>
              );
            }
            const common = {
              fullWidth: true,
              size: "small",
              label: f.label,
              required: f.required,
              helperText: f.help,
              value: values[f.name] ?? "",
              onChange: (e) => set(f.name, e.target.value),
              inputProps: { "aria-label": f.label },
            };
            let input;
            if (f.type === "checkbox") {
              input = <FormControlLabel control={<Checkbox checked={Boolean(values[f.name])} onChange={(e) => set(f.name, e.target.checked)} />} label={f.label} />;
            } else if (f.type === "select") {
              input = (
                <TextField select {...common}>
                  {!f.required && <MenuItem value="">{f.emptyLabel || "—"}</MenuItem>}
                  {(f.options || []).map((o) => <MenuItem key={o.value} value={String(o.value)}>{o.label}</MenuItem>)}
                </TextField>
              );
            } else if (f.type === "textarea") {
              input = <TextField multiline minRows={f.rows || 2} {...common} />;
            } else if (f.type === "date" || f.type === "datetime") {
              input = <TextField type={f.type === "date" ? "date" : "datetime-local"} InputLabelProps={{ shrink: true }} {...common} />;
            } else if (f.type === "number" || f.type === "money") {
              input = (
                <TextField type="number" {...common}
                  inputProps={{ ...common.inputProps, min: 0, step: f.type === "money" ? "0.01" : 1 }}
                  InputProps={f.adornment ? { startAdornment: <InputAdornment position="start">{f.adornment}</InputAdornment> } : undefined} />
              );
            } else {
              input = <TextField {...common} />;
            }
            return <Grid item xs={12} md={f.md || 6} key={f.name}>{input}</Grid>;
          })}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>{saving ? "Guardando..." : submitLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
