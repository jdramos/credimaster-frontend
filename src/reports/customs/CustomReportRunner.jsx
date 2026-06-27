import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";

import API from "../../api";

const CustomReportRunner = ({ report, onBack }) => {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runReport = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await API.get(`/api/custom-reports/${report.id}/run`);

      setHtml(res.data?.data?.html || "");
    } catch (error) {
      console.error("Error ejecutando reporte:", error);

      setError(
        error.response?.data?.message ||
          error.message ||
          "No se pudo ejecutar el reporte.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const iframe = document.getElementById("custom-report-runner-iframe");

    if (!iframe?.contentWindow) return;

    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={onBack}
            >
              Volver
            </Button>

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Ejecutar reporte
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {report?.name}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={
                loading ? <CircularProgress size={16} /> : <RefreshIcon />
              }
              onClick={runReport}
              disabled={loading}
            >
              Ejecutar
            </Button>

            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              disabled={!html}
            >
              Imprimir
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!html ? (
        <Alert severity="info">
          Haz clic en Ejecutar para generar el reporte.
        </Alert>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            height: "75vh",
            overflow: "auto",
            borderRadius: 2,
            background: "#f3f4f6",
            p: 2,
          }}
        >
          <iframe
            id="custom-report-runner-iframe"
            title="Ejecución del reporte"
            srcDoc={html}
            style={{
              width: "100%",
              minHeight: "1000px",
              border: "none",
              background: "#fff",
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default CustomReportRunner;
