import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import API from "../../../../api";

const EMPTY_FORM = { sr_tipo_entidad: "", sr_correlativo: "" };

// tipo_ent/num_corre varían por empresa (cada tenant es una institución
// distinta ante la central de riesgo) -- mismo patrón que
// ReportSignaturesDialog.jsx (company_config por tenant, no un valor fijo
// del sistema).
export default function SinRiesgoConfigDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tipoEntidadOptions, setTipoEntidadOptions] = useState([]);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  const handleOpen = async () => {
    setOpen(true);
    try {
      setLoading(true);
      const res = await API.get("/api/reports/conami/sinriesgo/config");
      setForm({ ...EMPTY_FORM, ...(res.data?.data || {}) });
      setTipoEntidadOptions(res.data?.tipo_entidad_options || []);
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      await API.put("/api/reports/conami/sinriesgo/config", form);
      showAlert("Configuración de Sin Riesgo actualizada", "success");
      setOpen(false);
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error al guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button startIcon={<SettingsIcon />} onClick={handleOpen} sx={{ textTransform: "none" }}>
        Configuración
      </Button>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Configuración de Sin Riesgo</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            El tipo de entidad y el correlativo varían por empresa — cada institución tiene su propio código asignado
            por la central de riesgo. Estos valores se usan en el encabezado de cada registro de los dos archivos.
          </Typography>

          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={7}>
                <TextField
                  select
                  label="Tipo de entidad"
                  fullWidth
                  size="small"
                  value={form.sr_tipo_entidad}
                  onChange={handleChange("sr_tipo_entidad")}
                >
                  <MenuItem value="">
                    <em>Seleccione...</em>
                  </MenuItem>
                  {tipoEntidadOptions.map((opt) => (
                    <MenuItem key={opt.code} value={opt.code}>
                      {opt.code} - {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  label="Correlativo"
                  fullWidth
                  size="small"
                  value={form.sr_correlativo}
                  onChange={handleChange("sr_correlativo")}
                  helperText="Asignado por la central de riesgo"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || loading}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none" }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={5000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((prev) => ({ ...prev, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
}
