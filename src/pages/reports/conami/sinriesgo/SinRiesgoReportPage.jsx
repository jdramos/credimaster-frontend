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
import GridOnIcon from "@mui/icons-material/GridOn";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { DataGrid } from "@mui/x-data-grid";
import BAC from "../../../../styles/bac";
import API from "../../../../api";
import SinRiesgoConfigDialog from "./SinRiesgoConfigDialog";

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

// Calco de IccReportPage.jsx (mismo patrón de generar/validar/historial),
// adaptado a que Sin Riesgo tiene dos niveles de hallazgo: ERROR (bloquea,
// campos "no puede ir vacío") y WARNING (no bloquea -- las 30 reglas de
// negocio del catálogo de validaciones, se muestran igual para revisión).
export default function SinRiesgoReportPage() {
  const [reportMonth, setReportMonth] = useState(getDefaultMonth());
  const [runs, setRuns] = useState([]);
  const [findings, setFindings] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/reports/conami/sinriesgo/runs");
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setRuns(data);
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchFindings = async (runId) => {
    try {
      const res = await API.get(`/api/reports/conami/sinriesgo/runs/${runId}/errors`);
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setFindings(data);
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || error.message });
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleValidate = async () => {
    try {
      setValidating(true);
      setMessage(null);

      const res = await API.post("/api/reports/conami/sinriesgo/validate", {
        report_month: reportMonth,
        cutoff_date: getCutoffDate(reportMonth),
      });

      const data = res.data?.data || {};
      const summary = data.summary || {};

      setFindings([
        ...(data.errors || []).map((e, i) => ({ id: `E-${i}`, ...e })),
        ...(data.warnings || []).map((w, i) => ({ id: `W-${i}`, ...w })),
      ]);
      setSelectedRun(null);

      setMessage({
        type: summary.valid ? "success" : "error",
        text: `Créditos revisados: ${summary.total_records || 0} — Errores: ${summary.errors || 0} — Advertencias: ${summary.warnings || 0}.`,
      });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || error.message });
    } finally {
      setValidating(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setMessage(null);
      setFindings([]);
      setSelectedRun(null);

      const res = await API.post("/api/reports/conami/sinriesgo/generate", {
        report_month: reportMonth,
        cutoff_date: getCutoffDate(reportMonth),
      });

      const data = res.data || {};
      if (data.ok === false) throw new Error(data.message || "No se pudo generar el reporte.");

      const result = data.data || data;

      if (result.status === "WITH_ERRORS") {
        setMessage({
          type: "error",
          text: `La corrida se generó con ${result.total_errors || 0} error(es). Corrige los datos antes de descargar.`,
        });
        setSelectedRun(result.run_id);
        await fetchFindings(result.run_id);
      } else {
        setMessage({
          type: result.total_warnings > 0 ? "warning" : "success",
          text: `Reporte Sin Riesgo generado correctamente${result.total_warnings ? ` — ${result.total_warnings} advertencia(s) por revisar` : ""}.`,
        });
      }

      await fetchRuns();
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || error.response?.data?.error || error.message });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (runId) => {
    try {
      const response = await API.get(`/api/reports/conami/sinriesgo/runs/${runId}/download`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sinriesgo_run_${runId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || error.message });
    }
  };

  // Copia de revisión: Base de Crédito + Base de Contacto en una sola hoja
  // de Excel -- no reemplaza el ZIP con los .PSZ oficiales, es una descarga
  // aparte para revisar ambas bases juntas antes de subir el oficial.
  const handleDownloadExcel = async (runId) => {
    try {
      const response = await API.get(`/api/reports/conami/sinriesgo/runs/${runId}/download-excel`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sinriesgo_run_${runId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || error.message });
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
    return <Chip label={item.label} color={item.color} size="small" sx={{ fontWeight: 700 }} />;
  };

  const runColumns = [
    { field: "id", headerName: "ID", width: 80 },
    { field: "report_month", headerName: "Mes", width: 120 },
    { field: "cutoff_date", headerName: "Fecha corte", width: 140 },
    { field: "status", headerName: "Estado", width: 150, renderCell: (params) => statusChip(params.row.status) },
    { field: "total_errors", headerName: "Errores", width: 90 },
    { field: "total_warnings", headerName: "Advertencias", width: 120 },
    { field: "generated_at", headerName: "Generado", flex: 1, minWidth: 180 },
    {
      field: "actions",
      headerName: "Acciones",
      width: 330,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ErrorOutlineIcon />}
            onClick={() => {
              setSelectedRun(params.row.id);
              fetchFindings(params.row.id);
            }}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Hallazgos
          </Button>

          <Button
            size="small"
            variant="contained"
            startIcon={<CloudDownloadIcon />}
            disabled={params.row.status !== "GENERATED" || !params.row.zip_path}
            onClick={() => handleDownload(params.row.id)}
            sx={{ textTransform: "none", borderRadius: 2, bgcolor: BAC.primary, "&:hover": { bgcolor: BAC.primaryDark } }}
          >
            ZIP
          </Button>

          <Button
            size="small"
            variant="outlined"
            color="success"
            startIcon={<GridOnIcon />}
            disabled={params.row.status !== "GENERATED"}
            onClick={() => handleDownloadExcel(params.row.id)}
            sx={{ textTransform: "none", borderRadius: 2 }}
          >
            Excel
          </Button>
        </Stack>
      ),
    },
  ];

  const findingColumns = [
    {
      field: "severity",
      headerName: "Severidad",
      width: 120,
      renderCell: (params) => (
        <Chip
          size="small"
          color={params.value === "ERROR" ? "error" : "warning"}
          label={params.value === "ERROR" ? "Error" : "Advertencia"}
        />
      ),
    },
    { field: "validation_code", headerName: "Regla", width: 140 },
    { field: "field_name", headerName: "Campo", width: 140 },
    { field: "error_message", headerName: "Mensaje", flex: 1, minWidth: 320 },
    { field: "record_key", headerName: "Crédito", width: 120 },
  ];

  return (
    <Box sx={{ p: 3, bgcolor: BAC.bg, minHeight: "100vh" }}>
      <Paper elevation={0} sx={{ borderRadius: 4, overflow: "hidden", border: `1px solid ${BAC.border}`, mb: 3 }}>
        <Box sx={{ p: 3, background: `linear-gradient(135deg, ${BAC.primaryDark}, ${BAC.primary})`, color: BAC.white }}>
          <Typography variant="h5" fontWeight={900}>
            Reporte Sin Riesgo
          </Typography>
          <Typography sx={{ opacity: 0.9 }}>
            Base de Crédito + Base de Contacto para la central de riesgo
          </Typography>
        </Box>

        <Box sx={{ p: 3 }}>
          {message && (
            <Alert severity={message.type} sx={{ mb: 2, borderRadius: 2 }}>
              {message.text}
            </Alert>
          )}

          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
            <TextField
              label="Mes de reporte"
              type="month"
              size="small"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              sx={{ width: { xs: "100%", md: 220 }, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: BAC.white } }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Fecha de corte"
              size="small"
              value={getCutoffDate(reportMonth)}
              disabled
              sx={{ width: { xs: "100%", md: 220 }, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: BAC.white } }}
            />

            <Button
              variant="outlined"
              startIcon={validating ? <CircularProgress size={18} /> : <ErrorOutlineIcon />}
              disabled={validating || generating}
              onClick={handleValidate}
              sx={{ height: 40, borderRadius: 2, textTransform: "none", fontWeight: 700 }}
            >
              {validating ? "Validando..." : "Validar"}
            </Button>

            <Button
              variant="contained"
              startIcon={generating ? <CircularProgress size={18} /> : <PlayArrowIcon />}
              disabled={generating || validating}
              onClick={handleGenerate}
              sx={{ height: 40, borderRadius: 2, textTransform: "none", fontWeight: 800, bgcolor: BAC.primary, "&:hover": { bgcolor: BAC.primaryDark } }}
            >
              {generating ? "Generando..." : "Generar ZIP"}
            </Button>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              disabled={loading}
              onClick={fetchRuns}
              sx={{ height: 40, borderRadius: 2, textTransform: "none", fontWeight: 700 }}
            >
              Actualizar
            </Button>

            <Box sx={{ flexGrow: { md: 1 } }} />

            <SinRiesgoConfigDialog />
          </Stack>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${BAC.border}`, overflow: "hidden", mb: 3 }}>
        <Box sx={{ p: 2.5 }}>
          <Typography fontWeight={900} color={BAC.text}>
            Historial de corridas
          </Typography>
          <Typography fontSize={13} color={BAC.muted}>
            Corridas generadas, estado del proceso y descarga del ZIP (Base de Crédito + Base de Contacto)
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
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            disableRowSelectionOnClick
            sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { bgcolor: BAC.soft, fontWeight: 800 } }}
          />
        </Box>
      </Paper>

      {findings.length > 0 && (
        <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${BAC.border}`, overflow: "hidden" }}>
          <Box sx={{ p: 2.5 }}>
            <Typography fontWeight={900} color={BAC.text}>
              Hallazgos {selectedRun ? `— corrida #${selectedRun}` : "(previsualización)"}
            </Typography>
            <Typography fontSize={13} color={BAC.muted}>
              Los errores bloquean la generación; las advertencias solo se muestran para revisión antes de emitir.
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ height: 420, bgcolor: BAC.white }}>
            <DataGrid
              rows={findings}
              columns={findingColumns}
              getRowId={(row) => row.id}
              pageSizeOptions={[5, 10, 25, 50]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              disableRowSelectionOnClick
              sx={{ border: 0, "& .MuiDataGrid-columnHeaders": { bgcolor: BAC.soft, fontWeight: 800 } }}
            />
          </Box>
        </Paper>
      )}
    </Box>
  );
}
