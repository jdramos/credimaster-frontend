import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { DataGrid } from "@mui/x-data-grid";
import BAC from "../../../styles/bac";
import API from "../../../api";
import ReportExportButtons from "../../../components/common/ReportExportButtons";
import { reportInteger } from "../../../components/common/reportFormat";

const getDefaultMonth = () => {
  const today = new Date();
  today.setMonth(today.getMonth() - 1);
  return today.toISOString().slice(0, 7);
};

const getCutoffDate = (month) => {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  return `${month}-${String(lastDay).padStart(2, "0")}`;
};

const STATUS_LABELS = {
  GENERATED: "Generado",
  WITH_ERRORS: "Con errores",
  FAILED: "Fallido",
  VALIDATING: "Validando",
  DRAFT: "Borrador",
};

export default function IccReportPage() {
  const [reportMonth, setReportMonth] = useState(getDefaultMonth());
  const [runs, setRuns] = useState([]);
  const [errors, setErrors] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);

      const res = await API.get("/api/reports/conami/icc/runs");

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      setRuns(data);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchErrors = async (runId) => {
    try {
      const res = await API.get(`/api/reports/conami/icc/runs/${runId}/errors`);

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      setErrors(data);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message,
      });
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setMessage(null);
      setErrors([]);
      setSelectedRun(null);

      const cutoffDate = getCutoffDate(reportMonth);

      const res = await API.post("/api/reports/conami/icc/generate", {
        report_month: reportMonth,
        cutoff_date: cutoffDate,
      });

      const data = res.data || {};

      if (data.ok === false) {
        throw new Error(data.message || "No se pudo generar el ICC.");
      }

      const result = data.data || data;

      if (result.status === "WITH_ERRORS") {
        setMessage({
          type: "warning",
          text: `La corrida se generó con ${result.total_errors || 0} errores. Corrige los datos antes de descargar.`,
        });

        setSelectedRun(result.run_id);
        await fetchErrors(result.run_id);
      } else {
        setMessage({
          type: "success",
          text: "Reporte ICC generado correctamente.",
        });
      }

      await fetchRuns();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (runId) => {
    try {
      const response = await API.get(
        `/api/reports/conami/icc/runs/${runId}/download`,
        {
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(response.data);

      const link = document.createElement("a");

      link.href = url;
      link.download = `icc_run_${runId}.zip`;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message,
      });
    }
  };

  const statusChip = (status) => {
    const map = {
      GENERATED: { label: "Generado", color: "success" },
      WITH_ERRORS: { label: "Con errores", color: "error" },
      FAILED: { label: "Fallido", color: "error" },
      VALIDATING: { label: "Validando", color: "warning" },
      DRAFT: { label: "Borrador", color: "default" },
    };

    const item = map[status] || { label: status, color: "default" };

    return (
      <Chip
        label={item.label}
        color={item.color}
        size="small"
        sx={{ fontWeight: 700 }}
      />
    );
  };

  const runColumns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "report_month", headerName: "Mes", width: 120 },
    { field: "cutoff_date", headerName: "Fecha corte", width: 140 },
    {
      field: "status",
      headerName: "Estado",
      width: 150,
      renderCell: (params) => statusChip(params.row.status),
    },
    {
      field: "total_errors",
      headerName: "Errores",
      width: 100,
    },
    {
      field: "generated_at",
      headerName: "Generado",
      flex: 1,
      minWidth: 180,
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 240,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ErrorOutlineIcon />}
            onClick={() => {
              setSelectedRun(params.row.id);
              fetchErrors(params.row.id);
            }}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Errores
          </Button>

          <Button
            size="small"
            variant="contained"
            startIcon={<CloudDownloadIcon />}
            disabled={params.row.status !== "GENERATED" || !params.row.zip_path}
            onClick={() => handleDownload(params.row.id)}
            sx={{
              color: "#fff",
              textTransform: "none",
              borderRadius: 2,
              bgcolor: BAC.primary,
              "&:hover": { bgcolor: BAC.primaryDark },
            }}
          >
            ZIP
          </Button>
        </Stack>
      ),
    },
  ];

  const errorColumns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "file_code", headerName: "Archivo", width: 170 },
    { field: "line_number", headerName: "Línea", width: 90 },
    { field: "field_name", headerName: "Campo", width: 160 },
    { field: "validation_code", headerName: "Validación", width: 140 },
    {
      field: "error_message",
      headerName: "Mensaje",
      flex: 1,
      minWidth: 300,
    },
    { field: "record_key", headerName: "Registro", width: 140 },
  ];

  // Imprimir/Excel del historial y de los errores (no tocan el ZIP oficial).
  const buildRunsReport = () => ({
    title: "Historial de corridas ICC",
    columns: [
      { field: "id", label: "ID" },
      { field: "report_month", label: "Mes" },
      { field: "cutoff_date", label: "Fecha corte", format: (v) => (v ? String(v).slice(0, 10) : "") },
      { field: "status", label: "Estado", format: (v) => STATUS_LABELS[v] || v },
      { field: "total_errors", label: "Errores", numeric: true, format: reportInteger },
      { field: "generated_at", label: "Generado", format: (v) => (v ? String(v).replace("T", " ").slice(0, 19) : "") },
    ],
    rows: runs,
    fileName: "icc_corridas",
  });

  const buildErrorsReport = () => ({
    title: "Errores de validación ICC",
    subtitle: `Corrida #${selectedRun}`,
    columns: [
      { field: "id", label: "ID" },
      { field: "file_code", label: "Archivo" },
      { field: "line_number", label: "Línea" },
      { field: "field_name", label: "Campo" },
      { field: "validation_code", label: "Validación" },
      { field: "error_message", label: "Mensaje" },
      { field: "record_key", label: "Registro" },
    ],
    rows: errors,
    totals: [{ value: `Total de errores: ${errors.length}`, colspan: 7 }],
    orientation: "landscape",
    fileName: `icc_errores_corrida_${selectedRun}`,
  });

  return (
    <Box sx={{ p: 3, bgcolor: `var(--cm-surface, ${BAC.bg})`, minHeight: "100vh" }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: `1px solid var(--cm-border, ${BAC.border})`,
          mb: 3,
        }}
      >
        <Box
          sx={{
            p: 3,
            background: `linear-gradient(135deg, ${BAC.primaryDark}, ${BAC.primary})`,
            color: BAC.white,
          }}
        >
          <Typography variant="h5" fontWeight={900}>
            Reporte CONAMI ICC
          </Typography>
          <Typography sx={{ opacity: 0.9 }}>
            Generación mensual de archivos de cartera de créditos
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          {message && (
            <Alert severity={message.type} sx={{ mb: 2, borderRadius: 2 }}>
              {message.text}
            </Alert>
          )}

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              label="Mes de reporte"
              type="month"
              size="small"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              sx={{
                width: { xs: "100%", md: 220 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: `var(--cm-paper, ${BAC.white})`,
                },
              }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Fecha de corte"
              size="small"
              value={getCutoffDate(reportMonth)}
              disabled
              sx={{
                width: { xs: "100%", md: 220 },
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: `var(--cm-paper, ${BAC.white})`,
                },
              }}
            />

            <Button
              variant="contained"
              startIcon={
                generating ? <CircularProgress size={18} /> : <PlayArrowIcon />
              }
              disabled={generating}
              onClick={handleGenerate}
              sx={{
                color: "#fff",
                height: 40,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 800,
                bgcolor: BAC.primary,
                "&:hover": { bgcolor: BAC.primaryDark },
              }}
            >
              {generating ? "Generando..." : "Generar ICC"}
            </Button>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              disabled={loading}
              onClick={fetchRuns}
              sx={{
                height: 40,
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              Actualizar
            </Button>
          </Stack>
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          border: `1px solid var(--cm-border, ${BAC.border})`,
          overflow: "hidden",
          mb: 3,
        }}
      >
        <Box sx={{ p: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography fontWeight={900} color={`var(--cm-text, ${BAC.text})`}>
              Historial de corridas ICC
            </Typography>
            <Typography fontSize={13} color={`var(--cm-text-2, ${BAC.muted})`}>
              Corridas generadas, estado del proceso y descarga del ZIP
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <ReportExportButtons size="small" report={buildRunsReport} disabled={!runs.length} />
          </Stack>
        </Box>

        <Divider />

        <Box sx={{ height: 430, bgcolor: `var(--cm-paper, ${BAC.white})` }}>
          <DataGrid
            rows={runs}
            columns={runColumns}
            loading={loading}
            getRowId={(row) => row.id}
            rowsPerPageOptions={[5, 10, 25]}
            initialState={{
              pagination: { pageSize: 10, page: 0 },
            }}
            disableSelectionOnClick
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: `var(--cm-soft, ${BAC.soft})`,
                fontWeight: 800,
              },
            }}
          />
        </Box>
      </Paper>

      {selectedRun && (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: `1px solid var(--cm-border, ${BAC.border})`,
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: 2.5, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Box>
              <Typography fontWeight={900} color={`var(--cm-text, ${BAC.text})`}>
                Errores de validación ICC
              </Typography>
              <Typography fontSize={13} color={`var(--cm-text-2, ${BAC.muted})`}>
                Corrida seleccionada #{selectedRun}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <ReportExportButtons size="small" report={buildErrorsReport} disabled={!errors.length} />
            </Stack>
          </Box>

          <Divider />

          <Box sx={{ height: 420, bgcolor: `var(--cm-paper, ${BAC.white})` }}>
            <DataGrid
              rows={errors}
              columns={errorColumns}
              getRowId={(row) => row.id}
              rowsPerPageOptions={[5, 10, 25, 50]}
              initialState={{
                pagination: { pageSize: 10, page: 0 },
              }}
              disableSelectionOnClick
              sx={{
                border: 0,
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: `var(--cm-soft, ${BAC.soft})`,
                  fontWeight: 800,
                },
              }}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
}
