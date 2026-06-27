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

import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";

import { useReportDefinition } from "../customs/context/ReportDefinitionContext";
import API from "../../api";

const PreviewTab = () => {
  const { definition } = useReportDefinition();

  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canPreview = definition.source && definition.fields?.length > 0;

  const loadPreview = async () => {
    try {
      setLoading(true);
      setError("");

      const payload = {
        reportDefinition: {
          ...definition,
          source_key: definition.source,
        },
      };

      const res = await API.post("/api/custom-reports/preview", payload);

      setHtml(res.data?.data?.html || "");
    } catch (error) {
      console.error("Error generando vista previa:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      setError(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "No se pudo generar la vista previa.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const iframe = document.getElementById("custom-report-preview-iframe");

    if (!iframe?.contentWindow) return;

    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  if (!definition.source) {
    return (
      <Alert severity="info">
        Primero selecciona una fuente de datos en la pestaña General.
      </Alert>
    );
  }

  if (!definition.fields?.length) {
    return (
      <Alert severity="info">
        Primero selecciona campos en la pestaña Campos.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Vista previa
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Genera una vista previa del reporte usando la definición actual.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={
              loading ? <CircularProgress size={16} /> : <RefreshIcon />
            }
            onClick={loadPreview}
            disabled={!canPreview || loading}
          >
            Actualizar
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!html ? (
        <Alert severity="info">
          Haz clic en Actualizar para generar la vista previa.
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
            id="custom-report-preview-iframe"
            title="Vista previa del reporte"
            srcDoc={html}
            style={{
              width: "100%",
              minHeight: "1000px",
              border: "none",
              background: "#fff",
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              transformOrigin: "top left",
            }}
          />
        </Paper>
      )}
    </Box>
  );
};

export default PreviewTab;
