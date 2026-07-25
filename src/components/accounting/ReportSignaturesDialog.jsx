import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Typography,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import BorderColorIcon from "@mui/icons-material/BorderColor";
import API from "../../api";

const SLOTS = [
  { label: "Elaborado por", nameKey: "reportes_firma_elabora_nombre", cargoKey: "reportes_firma_elabora_cargo" },
  { label: "Revisado por", nameKey: "reportes_firma_revisa_nombre", cargoKey: "reportes_firma_revisa_cargo" },
  { label: "Autorizado por", nameKey: "reportes_firma_autoriza_nombre", cargoKey: "reportes_firma_autoriza_cargo" },
];

const EMPTY_FORM = SLOTS.reduce((acc, slot) => {
  acc[slot.nameKey] = "";
  acc[slot.cargoKey] = "";
  return acc;
}, {});

export default function ReportSignaturesDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  const handleOpen = async () => {
    setOpen(true);
    try {
      setLoading(true);
      const res = await API.get("/api/accounting/report-signatures");
      setForm({ ...EMPTY_FORM, ...(res.data?.data || {}) });
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error al cargar la configuración de firmas");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      await API.put("/api/accounting/report-signatures", form);
      showAlert("Firmas de reportes actualizadas", "success");
      setOpen(false);
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error al guardar la configuración de firmas");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button startIcon={<BorderColorIcon />} onClick={handleOpen} sx={{ textTransform: "none" }}>
        Configurar firmas
      </Button>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Firmas de reportes contables</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Estos datos se imprimen al pie de los reportes contables (Balance de Comprobación, Balance General, Estado
            de Resultados, Flujo de Efectivo, Cambios en el Patrimonio). Deje el nombre en blanco si solo desea
            imprimir el cargo y una línea para firmar.
          </Typography>

          {loading ? (
            <CircularProgress size={24} />
          ) : (
            SLOTS.map((slot, idx) => (
              <React.Fragment key={slot.nameKey}>
                {idx > 0 && <Divider sx={{ my: 2 }} />}
                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                  {slot.label}
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Nombre"
                      fullWidth
                      size="small"
                      value={form[slot.nameKey]}
                      onChange={handleChange(slot.nameKey)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Cargo"
                      fullWidth
                      size="small"
                      value={form[slot.cargoKey]}
                      onChange={handleChange(slot.cargoKey)}
                    />
                  </Grid>
                </Grid>
              </React.Fragment>
            ))
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
