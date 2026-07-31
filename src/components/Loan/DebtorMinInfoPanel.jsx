import React, { useCallback, useEffect, useState } from "react";
import {
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  Divider,
  CircularProgress,
  Grid,
} from "@mui/material";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import API from "../../api";

const BAC = {
  primary: "#D32F2F",
  primaryDark: "#9A2424",
  border: "#E5E7EB",
};

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-NI");
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-NI");
}

const emptyForm = {
  monthly_income: "",
  monthly_expenses: "",
  total_assets: "",
  total_liabilities: "",
  household_members: "",
  economic_activity: "",
  income_source_notes: "",
  liabilities_notes: "",
};

/**
 * Informacion minima del deudor (ingresos, gastos, activos, pasivos). Este
 * registro es el que exige complianceController antes de permitir la
 * aprobacion del credito. Se autoaprueba al guardar -- no hay un paso de
 * revision separado.
 */
export default function DebtorMinInfoPanel({ customerId, readOnly = false }) {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCurrent = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const { data } = await API.get(`/api/debtor-min-info/customer/${customerId}`);
      setCurrent(data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCurrent();
  }, [loadCurrent]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!customerId) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await API.post("/api/debtor-min-info", {
        customer_id: customerId,
        monthly_income: form.monthly_income || null,
        monthly_expenses: form.monthly_expenses || null,
        total_assets: form.total_assets || null,
        total_liabilities: form.total_liabilities || null,
        household_members: form.household_members || null,
        economic_activity: form.economic_activity.trim() || null,
        income_source_notes: form.income_source_notes.trim() || null,
        liabilities_notes: form.liabilities_notes.trim() || null,
      });

      setSuccess("Información mínima del deudor guardada y aprobada.");
      setForm(emptyForm);
      await loadCurrent();
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.message || "No se pudo guardar la información mínima del deudor.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!customerId) return null;

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, borderRadius: 2, border: `1px solid ${BAC.border}`, bgcolor: "#fff", mt: 1.5 }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
          <Typography variant="subtitle2" fontWeight={900}>
            Información mínima del deudor
          </Typography>

          {current && (
            <Stack direction="row" spacing={1}>
              <Chip
                size="small"
                color={current.status === "APPROVED" ? "success" : "warning"}
                label={current.status === "APPROVED" ? "Aprobada" : current.status}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Versión ${current.version} · próxima revisión: ${formatDate(current.next_review_due)}`}
              />
            </Stack>
          )}
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Resumen financiero mínimo del deudor (Art. 17). Requerido para poder aprobar el
          crédito. Al guardar una versión nueva queda aprobada de inmediato.
        </Typography>

        {loading && <CircularProgress size={20} />}

        {!loading && current && (
          <Grid container spacing={1}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Ingreso mensual</Typography>
              <Typography variant="body2" fontWeight={700}>C$ {Number(current.monthly_income || 0).toLocaleString("es-NI", { minimumFractionDigits: 2 })}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Gastos mensuales</Typography>
              <Typography variant="body2" fontWeight={700}>C$ {Number(current.monthly_expenses || 0).toLocaleString("es-NI", { minimumFractionDigits: 2 })}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Activos totales</Typography>
              <Typography variant="body2" fontWeight={700}>C$ {Number(current.total_assets || 0).toLocaleString("es-NI", { minimumFractionDigits: 2 })}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Pasivos totales</Typography>
              <Typography variant="body2" fontWeight={700}>C$ {Number(current.total_liabilities || 0).toLocaleString("es-NI", { minimumFractionDigits: 2 })}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Aprobada por {current.reviewed_by || "-"} el {formatDateTime(current.reviewed_at)}
              </Typography>
            </Grid>
          </Grid>
        )}

        {!loading && !current && (
          <Alert severity="warning" sx={{ py: 0.5 }}>
            Este cliente aún no tiene información mínima registrada.
          </Alert>
        )}

        {!readOnly && (
          <>
            <Divider />

            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Registrar nueva versión
            </Typography>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
              <TextField
                label="Ingreso mensual"
                type="number"
                value={form.monthly_income}
                onChange={handleChange("monthly_income")}
                size="small"
                sx={{ minWidth: 150 }}
              />
              <TextField
                label="Gastos mensuales"
                type="number"
                value={form.monthly_expenses}
                onChange={handleChange("monthly_expenses")}
                size="small"
                sx={{ minWidth: 150 }}
              />
              <TextField
                label="Activos totales"
                type="number"
                value={form.total_assets}
                onChange={handleChange("total_assets")}
                size="small"
                sx={{ minWidth: 150 }}
              />
              <TextField
                label="Pasivos totales"
                type="number"
                value={form.total_liabilities}
                onChange={handleChange("total_liabilities")}
                size="small"
                sx={{ minWidth: 150 }}
              />
              <TextField
                label="Miembros del hogar"
                type="number"
                value={form.household_members}
                onChange={handleChange("household_members")}
                size="small"
                sx={{ minWidth: 150 }}
              />
              <TextField
                label="Actividad económica"
                value={form.economic_activity}
                onChange={handleChange("economic_activity")}
                size="small"
                sx={{ minWidth: 180 }}
              />
              <TextField
                label="Fuente de ingresos (notas)"
                value={form.income_source_notes}
                onChange={handleChange("income_source_notes")}
                size="small"
                fullWidth
              />
              <TextField
                label="Pasivos (notas)"
                value={form.liabilities_notes}
                onChange={handleChange("liabilities_notes")}
                size="small"
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <FactCheckIcon />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  whiteSpace: "nowrap",
                  bgcolor: BAC.primary,
                  "&:hover": { bgcolor: BAC.primaryDark },
                }}
              >
                Guardar y aprobar
              </Button>
            </Stack>
          </>
        )}

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}
      </Stack>
    </Paper>
  );
}
