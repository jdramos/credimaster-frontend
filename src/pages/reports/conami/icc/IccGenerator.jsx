import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import { DataGrid } from "@mui/x-data-grid";
import API from "../../../../api";

const MONTH_LABELS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const monthLabel = (reportMonth) => {
  if (!reportMonth) return "";
  const [year, month] = reportMonth.split("-");
  return `${MONTH_LABELS[Number(month) - 1] || month} ${year}`;
};

export default function IccGenerator() {
  const [form, setForm] = useState({
    report_month: "",
    cutoff_date: "",
  });

  const [loadingValidate, setLoadingValidate] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [validation, setValidation] = useState(null);
  const [error, setError] = useState("");

  const [reminder, setReminder] = useState(null);
  const [loadingReminder, setLoadingReminder] = useState(true);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [savingDeadline, setSavingDeadline] = useState(false);

  const loadReminder = async () => {
    try {
      setLoadingReminder(true);
      const res = await API.get("/api/reports/conami/icc/reminder");
      setReminder(res.data?.data || null);
    } catch (err) {
      setReminder(null);
    } finally {
      setLoadingReminder(false);
    }
  };

  useEffect(() => {
    loadReminder();
  }, []);

  const handleEditDeadline = () => {
    setDeadlineDraft(String(reminder?.dia_limite ?? 10));
    setEditingDeadline(true);
  };

  const handleSaveDeadline = async () => {
    try {
      setSavingDeadline(true);
      await API.put("/api/reports/conami/icc/reminder", {
        dia_limite: Number(deadlineDraft),
      });
      setEditingDeadline(false);
      await loadReminder();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo actualizar el día límite del recordatorio.",
      );
    } finally {
      setSavingDeadline(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setValidation(null);
    setError("");
  };

  const validateForm = () => {
    if (!form.report_month) {
      setError("Debe seleccionar el mes del reporte.");
      return false;
    }

    if (!form.cutoff_date) {
      setError("Debe seleccionar la fecha de corte.");
      return false;
    }

    return true;
  };

  const handleValidate = async () => {
    if (!validateForm()) return;

    try {
      setLoadingValidate(true);
      setError("");

      const res = await API.post("/api/reports/conami/icc/validate", form);

      const data = res.data || {};

      if (data.ok === false) {
        throw new Error(data.message || "No se pudo validar el ICC.");
      }

      setValidation(data.data || data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "No se pudo validar el ICC.",
      );
    } finally {
      setLoadingValidate(false);
    }
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;

    if (validation?.summary?.errors > 0) {
      setError("No puede generar el ICC mientras existan errores críticos.");
      return;
    }

    try {
      setLoadingGenerate(true);
      setError("");

      const res = await API.post("/api/conami/icc/generate", form);

      const data = res.data || {};

      if (data.ok === false) {
        throw new Error(data.message || "No se pudo generar el ICC.");
      }

      alert("ICC generado correctamente.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "No se pudo generar el ICC.",
      );
    } finally {
      setLoadingGenerate(false);
    }
  };

  const errorRows =
    validation?.errors?.map((item, index) => ({
      id: `E-${index + 1}`,
      type: "ERROR",
      ...item,
    })) || [];

  const warningRows =
    validation?.warnings?.map((item, index) => ({
      id: `W-${index + 1}`,
      type: "WARNING",
      ...item,
    })) || [];

  const rows = [...errorRows, ...warningRows];

  const columns = [
    {
      field: "type",
      headerName: "Tipo",
      width: 120,
      renderCell: (params) =>
        params.value === "ERROR" ? (
          <Chip size="small" color="error" label="Error" />
        ) : (
          <Chip size="small" color="warning" label="Advertencia" />
        ),
    },
    {
      field: "credit_code",
      headerName: "Crédito",
      minWidth: 140,
      flex: 0.8,
    },
    {
      field: "loan_id",
      headerName: "ID Crédito",
      width: 110,
    },
    {
      field: "customer_id",
      headerName: "Cliente",
      width: 110,
    },
    {
      field: "field",
      headerName: "Campo",
      minWidth: 180,
      flex: 1,
    },
    {
      field: "message",
      headerName: "Descripción",
      minWidth: 280,
      flex: 1.5,
    },
  ];

  const valid = validation?.summary?.valid;

  return (
    <Box sx={{ p: 2.5 }}>
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: "1px solid #D8E2EF",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.5,
            background: "linear-gradient(135deg, #003E8A, #0057B8)",
            color: "#fff",
          }}
        >
          <Typography variant="h5" fontWeight={800}>
            Generador ICC CONAMI
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Validación y generación de archivos regulatorios ICC
          </Typography>
        </Box>

        <CardContent>
          {!loadingReminder && reminder && (
            <Alert
              severity={
                reminder.generated ? "success" : reminder.vencido ? "error" : "warning"
              }
              sx={{ mb: 2 }}
              action={
                editingDeadline ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TextField
                      size="small"
                      type="number"
                      value={deadlineDraft}
                      onChange={(e) => setDeadlineDraft(e.target.value)}
                      inputProps={{ min: 1, max: 28, style: { width: 50 } }}
                    />
                    <Button
                      size="small"
                      onClick={handleSaveDeadline}
                      disabled={savingDeadline}
                    >
                      Guardar
                    </Button>
                    <Button size="small" onClick={() => setEditingDeadline(false)}>
                      Cancelar
                    </Button>
                  </Stack>
                ) : (
                  <Tooltip title="Cambiar día límite del mes">
                    <IconButton size="small" onClick={handleEditDeadline}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )
              }
            >
              {reminder.generated
                ? `ICC de ${monthLabel(reminder.report_month)} ya generado.`
                : reminder.vencido
                  ? `Venció el plazo para enviar el ICC de ${monthLabel(reminder.report_month)} (límite: día ${reminder.dia_limite}, ${reminder.fecha_limite}). Aún no se ha generado.`
                  : `Falta generar el ICC de ${monthLabel(reminder.report_month)} — vence en ${reminder.dias_restantes} día(s) (límite: día ${reminder.dia_limite}, ${reminder.fecha_limite}).`}
            </Alert>
          )}

          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="month"
                label="Mes reporte"
                name="report_month"
                value={form.report_month}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Fecha corte"
                name="cutoff_date"
                value={form.cutoff_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1.2}>
                <Button
                  variant="contained"
                  startIcon={
                    loadingValidate ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <FactCheckIcon />
                    )
                  }
                  onClick={handleValidate}
                  disabled={loadingValidate || loadingGenerate}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                    backgroundColor: "#0057B8",
                    "&:hover": { backgroundColor: "#003E8A" },
                  }}
                >
                  Validar ICC
                </Button>

                <Button
                  variant="outlined"
                  startIcon={
                    loadingGenerate ? (
                      <CircularProgress size={18} />
                    ) : (
                      <FileDownloadIcon />
                    )
                  }
                  onClick={handleGenerate}
                  disabled={
                    loadingGenerate ||
                    loadingValidate ||
                    !validation ||
                    validation?.summary?.errors > 0
                  }
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 700,
                  }}
                >
                  Generar ZIP
                </Button>
              </Stack>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {validation && (
            <>
              <Divider sx={{ my: 3 }} />

              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<ErrorOutlineIcon />}
                  label={`Errores: ${validation.summary.errors}`}
                  color="error"
                  variant="outlined"
                />

                <Chip
                  icon={<WarningAmberIcon />}
                  label={`Advertencias: ${validation.summary.warnings}`}
                  color="warning"
                  variant="outlined"
                />

                <Chip
                  icon={<CheckCircleOutlineIcon />}
                  label={`Créditos revisados: ${validation.summary.total_loans}`}
                  color={valid ? "success" : "default"}
                  variant="outlined"
                />

                <Chip
                  label={valid ? "Listo para generar" : "Requiere corrección"}
                  color={valid ? "success" : "error"}
                />
              </Stack>

              <Box sx={{ mt: 2.5, height: 460 }}>
                <DataGrid
                  rows={rows}
                  columns={columns}
                  pageSizeOptions={[10, 25, 50, 100]}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 10, page: 0 },
                    },
                  }}
                  disableRowSelectionOnClick
                  sx={{
                    border: "1px solid #D8E2EF",
                    borderRadius: 3,
                    "& .MuiDataGrid-columnHeaders": {
                      backgroundColor: "#F4F7FB",
                      fontWeight: 800,
                    },
                    "& .MuiDataGrid-cell": {
                      fontSize: 13,
                    },
                  }}
                />
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
