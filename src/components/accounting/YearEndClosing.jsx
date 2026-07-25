import React, { useState } from "react";
import {
  Alert, Box, Button, Chip, MenuItem, Paper, Snackbar, Stack, TextField, Typography, Divider,
} from "@mui/material";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import API from "../../api";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function YearEndClosing() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear - 1);
  const [entityType, setEntityType] = useState("LUCRO");
  const [incomeTax, setIncomeTax] = useState("0");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - i);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      setPreview(null);
      const res = await API.get("/api/accounting/year-end-preview", { params: { year } });
      setPreview(res.data);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo generar la vista previa");
    } finally {
      setLoading(false);
    }
  };

  const doClose = async () => {
    const netEstimate = Number(preview?.pre_tax_result || 0) - Number(incomeTax || 0);
    const confirmed = window.confirm(
      `¿Confirma el cierre del ejercicio ${year}?\n\n` +
      `Ingresos: C$ ${money(preview?.total_income)}\n` +
      `Gastos: C$ ${money(preview?.total_expense)}\n` +
      `Impuesto sobre la renta: C$ ${money(incomeTax)}\n` +
      `Resultado neto estimado: C$ ${money(netEstimate)}\n\n` +
      `Esta acción genera un comprobante contable permanente. Solo se puede revertir anulándolo (no eliminar).`
    );
    if (!confirmed) return;

    try {
      setClosing(true);
      const res = await API.post("/api/accounting/close-year", {
        year,
        entity_type: entityType,
        income_tax_amount: Number(incomeTax || 0),
      });
      showAlert(
        `Ejercicio ${year} cerrado (comprobante ${res.data.entry_no}). Resultado neto: C$ ${money(res.data.netResult)}`,
        "success",
      );
      fetchPreview();
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo cerrar el ejercicio");
    } finally {
      setClosing(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <EventRepeatIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Cierre de Ejercicio</Typography>
            <Typography variant="body2" color="text.secondary">
              Modelo 09 del Cap. V del MUC — cancela ingresos y gastos del año contra el patrimonio
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField select size="small" label="Año a cerrar" value={year} onChange={(e) => { setYear(Number(e.target.value)); setPreview(null); }} sx={{ width: 160 }}>
            {yearOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Tipo de IMF" value={entityType} onChange={(e) => setEntityType(e.target.value)} sx={{ width: 200 }}>
            <MenuItem value="LUCRO">Con fines de lucro</MenuItem>
            <MenuItem value="NO_LUCRO">Sin fines de lucro (asociación)</MenuItem>
          </TextField>

          <TextField
            size="small"
            label="Impuesto sobre la renta"
            type="number"
            value={incomeTax}
            onChange={(e) => setIncomeTax(e.target.value)}
            sx={{ width: 200 }}
          />

          <Button variant="outlined" onClick={fetchPreview} disabled={loading}>Ver vista previa</Button>
        </Stack>

        {preview && (
          <>
            <Divider sx={{ my: 2 }} />

            {preview.already_closed && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                El ejercicio {preview.year} ya fue cerrado (comprobante interno #{preview.journal_entry_id}). No se puede cerrar dos veces.
              </Alert>
            )}

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip color="success" label={`Ingresos: C$ ${money(preview.total_income)}`} />
              <Chip color="error" label={`Gastos: C$ ${money(preview.total_expense)}`} />
              <Chip color="warning" label={`Impuesto: C$ ${money(incomeTax)}`} />
              <Chip
                color={preview.pre_tax_result - Number(incomeTax || 0) >= 0 ? "primary" : "default"}
                label={`Resultado neto estimado: C$ ${money(preview.pre_tax_result - Number(incomeTax || 0))}`}
              />
            </Stack>

            <Button
              variant="contained"
              color="error"
              disabled={closing || preview.already_closed || (preview.total_income === 0 && preview.total_expense === 0)}
              onClick={doClose}
            >
              {closing ? "Cerrando..." : `Cerrar ejercicio ${preview.year}`}
            </Button>
          </>
        )}
      </Paper>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
