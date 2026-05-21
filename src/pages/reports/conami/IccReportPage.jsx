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

const API = process.env.REACT_APP_API_BASE_URL;
const token = process.env.REACT_APP_API_TOKEN;

const headers = {
  "Content-Type": "application/json",
  Authorization: token,
};

const BAC = {
  primary: "#0057B8",
  primaryDark: "#003E8A",
  bg: "#F6F8FC",
  soft: "#EAF2FF",
  border: "#D8E2F0",
  text: "#1F2937",
  muted: "#6B7280",
  white: "#FFFFFF",
  danger: "#DC2626",
  success: "#15803D",
  warning: "#B45309",
};

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

      const res = await fetch(`${API}/api/reports/conami/icc/runs`, {
        headers: { Authorization: token },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "No se pudo cargar el historial.");
      }

      setRuns(json.data || []);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchErrors = async (runId) => {
    try {
      const res = await fetch(
        `${API}/api/reports/conami/icc/runs/${runId}/errors`,
        {
          headers: { Authorization: token },
        },
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "No se pudieron cargar los errores.");
      }

      setErrors(json.data || []);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
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

      const res = await fetch(`${API}/api/reports/conami/icc/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          report_month: reportMonth,
          cutoff_date: cutoffDate,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "No se pudo generar el ICC.");
      }

      if (json.data?.status === "WITH_ERRORS") {
        setMessage({
          type: "warning",
          text: `La corrida se generó con ${json.data.total_errors} errores. Corrige los datos antes de descargar.`,
        });

        setSelectedRun(json.data.run_id);
        await fetchErrors(json.data.run_id);
      } else {
        setMessage({
          type: "success",
          text: "Reporte ICC generado correctamente.",
        });
      }

      await fetchRuns();
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (runId) => {
    try {
      const response = await fetch(
        `${API}/api/reports/conami/icc/runs/${runId}/download`,
        {
          method: "GET",
          headers: {
            Authorization: token,
          },
        },
      );

      if (!response.ok) {
        throw new Error("No se pudo descargar el ZIP");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `icc_run_${runId}.zip`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: error.message,
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

  return (
    <Box sx={{ p: 3, bgcolor: BAC.bg, minHeight: "100vh" }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: `1px solid ${BAC.border}`,
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
                  bgcolor: BAC.white,
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
                  bgcolor: BAC.white,
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
          border: `1px solid ${BAC.border}`,
          overflow: "hidden",
          mb: 3,
        }}
      >
        <Box sx={{ p: 2.5 }}>
          <Typography fontWeight={900} color={BAC.text}>
            Historial de corridas ICC
          </Typography>
          <Typography fontSize={13} color={BAC.muted}>
            Corridas generadas, estado del proceso y descarga del ZIP
          </Typography>
        </Box>

        <Divider />

        <Box sx={{ height: 430, bgcolor: BAC.white }}>
          <DataGrid
            rows={runs}
            columns={runColumns}
            loading={loading}
            getRowId={(row) => row.id}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            disableRowSelectionOnClick
            sx={{
              border: 0,
              "& .MuiDataGrid-columnHeaders": {
                bgcolor: BAC.soft,
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
            border: `1px solid ${BAC.border}`,
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: 2.5 }}>
            <Typography fontWeight={900} color={BAC.text}>
              Errores de validación ICC
            </Typography>
            <Typography fontSize={13} color={BAC.muted}>
              Corrida seleccionada #{selectedRun}
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ height: 420, bgcolor: BAC.white }}>
            <DataGrid
              rows={errors}
              columns={errorColumns}
              getRowId={(row) => row.id}
              pageSizeOptions={[5, 10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
              disableRowSelectionOnClick
              sx={{
                border: 0,
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: BAC.soft,
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
