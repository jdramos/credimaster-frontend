import React, { useEffect, useImperativeHandle, useState } from "react";
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
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import { DataGrid } from "@mui/x-data-grid";
import API from "../../../api";

const MONTH_LABELS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const monthLabel = (reportMonth) => {
  if (!reportMonth) return "";
  const [year, month] = reportMonth.split("-");
  return `${MONTH_LABELS[Number(month) - 1] || month} ${year}`;
};

// Un solo panel Validar/Generar/Descargar, parametrizado por reporte
// ("icc"/"isc") -- misma lógica que ya probaron IccGenerator.jsx e
// IscGenerator.jsx por separado, ahora reutilizada para que ambos vivan en
// la misma pantalla, compartiendo el mismo mes/fecha de corte del padre.
// Expone validateNow/generateNow por ref para que los botones "ambos" de
// arriba puedan disparar los dos paneles a la vez.
const ReportPanel = React.forwardRef(function ReportPanel({ code, label, title, subtitle, form, reminderSlot }, ref) {
  const [loadingValidate, setLoadingValidate] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [validation, setValidation] = useState(null);
  const [generatedRun, setGeneratedRun] = useState(null);
  const [error, setError] = useState("");

  // El mes/fecha vive en el padre (compartido) -- si cambia, los resultados
  // de este panel ya no aplican al nuevo período, se limpian.
  useEffect(() => {
    setValidation(null);
    setGeneratedRun(null);
    setError("");
  }, [form.report_month, form.cutoff_date]);

  const validateNow = async () => {
    if (!form.report_month || !form.cutoff_date) {
      setError("Debe seleccionar el mes del reporte y la fecha de corte.");
      return null;
    }

    try {
      setLoadingValidate(true);
      setError("");

      const res = await API.post(`/api/reports/conami/${code}/validate`, form);
      const data = res.data || {};

      if (data.ok === false) throw new Error(data.message || `No se pudo validar el ${label}.`);

      const result = data.data || data;
      setValidation(result);
      return result;
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || `No se pudo validar el ${label}.`);
      return null;
    } finally {
      setLoadingValidate(false);
    }
  };

  const generateNow = async () => {
    if (!form.report_month || !form.cutoff_date) {
      setError("Debe seleccionar el mes del reporte y la fecha de corte.");
      return null;
    }

    try {
      setLoadingGenerate(true);
      setError("");

      const res = await API.post(`/api/reports/conami/${code}/generate`, form);
      const data = res.data || {};

      if (data.ok === false) throw new Error(data.message || `No se pudo generar el ${label}.`);
      if (data.data?.status === "WITH_ERRORS") {
        throw new Error(`El ${label} no se generó: quedaron errores críticos al validar de nuevo.`);
      }

      setGeneratedRun(data.data);
      return data.data;
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || `No se pudo generar el ${label}.`);
      return null;
    } finally {
      setLoadingGenerate(false);
    }
  };

  const downloadNow = async () => {
    if (!generatedRun?.run_id) return;

    try {
      setLoadingDownload(true);
      setError("");

      const response = await API.get(`/api/reports/conami/${code}/runs/${generatedRun.run_id}/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${code}_${generatedRun.report_month}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || err.message || `No se pudo descargar el ZIP del ${label}.`);
    } finally {
      setLoadingDownload(false);
    }
  };

  useImperativeHandle(ref, () => ({ validateNow, generateNow }));

  const errorRows = validation?.errors?.map((item, index) => ({ id: `E-${index + 1}`, type: "ERROR", ...item })) || [];
  const warningRows = validation?.warnings?.map((item, index) => ({ id: `W-${index + 1}`, type: "WARNING", ...item })) || [];
  const rows = [...errorRows, ...warningRows];

  const columns = [
    {
      field: "type", headerName: "Tipo", width: 110,
      renderCell: (params) => (params.value === "ERROR"
        ? <Chip size="small" color="error" label="Error" />
        : <Chip size="small" color="warning" label="Advertencia" />),
    },
    { field: "validation_code", headerName: "Código", width: 120 },
    { field: "record_key", headerName: "Referencia", minWidth: 120, flex: 0.7 },
    { field: "error_message", headerName: "Descripción", minWidth: 260, flex: 1.5 },
  ];

  const valid = validation?.summary?.valid;

  return (
    <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid #D8E2EF", overflow: "hidden", height: "100%" }}>
      <Box sx={{ px: 2.5, py: 2, background: "linear-gradient(135deg, #003E8A, #0057B8)", color: "#fff" }}>
        <Typography variant="h6" fontWeight={800}>{title}</Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>{subtitle}</Typography>
      </Box>

      <CardContent>
        {reminderSlot}

        <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            size="small"
            startIcon={loadingValidate ? <CircularProgress size={16} color="inherit" /> : <FactCheckIcon />}
            onClick={validateNow}
            disabled={loadingValidate || loadingGenerate}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, backgroundColor: "#0057B8", "&:hover": { backgroundColor: "#003E8A" } }}
          >
            Validar {label}
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={loadingGenerate ? <CircularProgress size={16} /> : <FileDownloadIcon />}
            onClick={generateNow}
            disabled={loadingGenerate || loadingValidate || !validation || validation?.summary?.errors > 0}
            sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
          >
            Generar ZIP
          </Button>

          {generatedRun && (
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={loadingDownload ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />}
              onClick={downloadNow}
              disabled={loadingDownload}
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
            >
              Descargar ZIP
            </Button>
          )}
        </Stack>

        {generatedRun && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {label} de {generatedRun.report_month} generado correctamente. Ya puede descargar el ZIP.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {validation && (
          <>
            <Divider sx={{ my: 2 }} />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: rows.length ? 2 : 0 }}>
              <Chip size="small" icon={<ErrorOutlineIcon />} label={`Errores: ${validation.summary.errors}`} color="error" variant="outlined" />
              <Chip size="small" icon={<WarningAmberIcon />} label={`Advertencias: ${validation.summary.warnings}`} color="warning" variant="outlined" />
              <Chip size="small" icon={<CheckCircleOutlineIcon />} label={valid ? "Listo para generar" : "Requiere corrección"} color={valid ? "success" : "error"} />
            </Stack>

            {rows.length > 0 && (
              <Box sx={{ height: 320 }}>
                <DataGrid
                  rows={rows}
                  columns={columns}
                  pageSizeOptions={[10, 25, 50]}
                  initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                  disableRowSelectionOnClick
                  density="compact"
                  sx={{
                    border: "1px solid #D8E2EF", borderRadius: 3,
                    "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F4F7FB", fontWeight: 800 },
                    "& .MuiDataGrid-cell": { fontSize: 12.5 },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

export default function IccIscGenerator() {
  const [form, setForm] = useState({ report_month: "", cutoff_date: "" });
  const [topError, setTopError] = useState("");
  const [validatingBoth, setValidatingBoth] = useState(false);
  const [generatingBoth, setGeneratingBoth] = useState(false);

  const [reminder, setReminder] = useState(null);
  const [loadingReminder, setLoadingReminder] = useState(true);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [savingDeadline, setSavingDeadline] = useState(false);

  const iccRef = React.useRef(null);
  const iscRef = React.useRef(null);

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
      await API.put("/api/reports/conami/icc/reminder", { dia_limite: Number(deadlineDraft) });
      setEditingDeadline(false);
      await loadReminder();
    } catch (err) {
      setTopError(err.response?.data?.message || "No se pudo actualizar el día límite del recordatorio.");
    } finally {
      setSavingDeadline(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setTopError("");
  };

  const validateBoth = async () => {
    if (!form.report_month || !form.cutoff_date) {
      setTopError("Debe seleccionar el mes del reporte y la fecha de corte.");
      return;
    }
    setTopError("");
    setValidatingBoth(true);
    await Promise.allSettled([iccRef.current?.validateNow(), iscRef.current?.validateNow()]);
    setValidatingBoth(false);
  };

  const generateBoth = async () => {
    if (!form.report_month || !form.cutoff_date) {
      setTopError("Debe seleccionar el mes del reporte y la fecha de corte.");
      return;
    }
    setTopError("");
    setGeneratingBoth(true);
    await Promise.allSettled([iccRef.current?.generateNow(), iscRef.current?.generateNow()]);
    setGeneratingBoth(false);
  };

  const reminderSlot = !loadingReminder && reminder && (
    <Alert
      severity={reminder.generated ? "success" : reminder.vencido ? "error" : "warning"}
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
            <Button size="small" onClick={handleSaveDeadline} disabled={savingDeadline}>Guardar</Button>
            <Button size="small" onClick={() => setEditingDeadline(false)}>Cancelar</Button>
          </Stack>
        ) : (
          <Tooltip title="Cambiar día límite del mes">
            <IconButton size="small" onClick={handleEditDeadline}><EditIcon fontSize="small" /></IconButton>
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
  );

  return (
    <Box sx={{ p: 2.5 }}>
      <Card elevation={0} sx={{ borderRadius: 4, border: "1px solid #D8E2EF", overflow: "hidden", mb: 2.5 }}>
        <Box sx={{ px: 3, py: 2.5, background: "linear-gradient(135deg, #003E8A, #0057B8)", color: "#fff" }}>
          <Typography variant="h5" fontWeight={800}>Generador ICC / ISC CONAMI</Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Un mismo mes y fecha de corte para validar y generar ambos reportes regulatorios
          </Typography>
        </Box>

        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth size="small" type="month" label="Mes reporte" name="report_month"
                value={form.report_month} onChange={handleChange} InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth size="small" type="date" label="Fecha corte" name="cutoff_date"
                value={form.cutoff_date} onChange={handleChange} InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1.2}>
                <Button
                  variant="contained"
                  startIcon={validatingBoth ? <CircularProgress size={18} color="inherit" /> : <FactCheckIcon />}
                  onClick={validateBoth}
                  disabled={validatingBoth || generatingBoth}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700, backgroundColor: "#0057B8", "&:hover": { backgroundColor: "#003E8A" } }}
                >
                  Validar ambos
                </Button>

                <Button
                  variant="outlined"
                  startIcon={generatingBoth ? <CircularProgress size={18} /> : <FileDownloadIcon />}
                  onClick={generateBoth}
                  disabled={validatingBoth || generatingBoth}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                >
                  Generar ambos
                </Button>
              </Stack>
            </Grid>
          </Grid>

          {topError && <Alert severity="error" sx={{ mt: 2 }}>{topError}</Alert>}
        </CardContent>
      </Card>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <ReportPanel
            ref={iccRef}
            code="icc"
            label="ICC"
            title="ICC — Información de Cartera de Créditos"
            subtitle="Validación y generación del archivo regulatorio ICC"
            form={form}
            reminderSlot={reminderSlot}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <ReportPanel
            ref={iscRef}
            code="isc"
            label="ISC"
            title="ISC — Información de Saldos Contables"
            subtitle="Validación y generación del archivo regulatorio ISC"
            form={form}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
