import React, { useState } from "react";
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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { DataGrid } from "@mui/x-data-grid";
import API from "../../../../api";

export default function IscGenerator() {
  const [form, setForm] = useState({
    report_month: "",
    cutoff_date: "",
  });

  const [loadingValidate, setLoadingValidate] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [validation, setValidation] = useState(null);
  const [generatedRun, setGeneratedRun] = useState(null);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setValidation(null);
    setGeneratedRun(null);
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

      const res = await API.post("/api/reports/conami/isc/validate", form);
      const data = res.data || {};

      if (data.ok === false) {
        throw new Error(data.message || "No se pudo validar el ISC.");
      }

      setValidation(data.data || data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "No se pudo validar el ISC.",
      );
    } finally {
      setLoadingValidate(false);
    }
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;

    if (validation?.summary?.errors > 0) {
      setError("No puede generar el ISC mientras existan errores críticos.");
      return;
    }

    try {
      setLoadingGenerate(true);
      setError("");

      const res = await API.post("/api/reports/conami/isc/generate", form);
      const data = res.data || {};

      if (data.ok === false) {
        throw new Error(data.message || "No se pudo generar el ISC.");
      }

      if (data.data?.status === "WITH_ERRORS") {
        throw new Error("El ISC no se generó: quedaron errores críticos al validar de nuevo.");
      }

      setGeneratedRun(data.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "No se pudo generar el ISC.",
      );
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedRun?.run_id) return;

    try {
      setLoadingDownload(true);
      setError("");

      const response = await API.get(
        `/api/reports/conami/isc/runs/${generatedRun.run_id}/download`,
        { responseType: "blob" },
      );

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");

      link.href = url;
      link.download = `isc_${generatedRun.report_month}.zip`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "No se pudo descargar el ZIP del ISC.",
      );
    } finally {
      setLoadingDownload(false);
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
      field: "validation_code",
      headerName: "Código",
      width: 130,
    },
    {
      field: "record_key",
      headerName: "Referencia",
      minWidth: 140,
      flex: 0.8,
    },
    {
      field: "error_message",
      headerName: "Descripción",
      minWidth: 320,
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
            Generador ISC CONAMI
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Validación y generación del archivo de Información de Saldos Contables
          </Typography>
        </Box>

        <CardContent>
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
                  Validar ISC
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

                {generatedRun && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={
                      loadingDownload ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <CloudDownloadIcon />
                      )
                    }
                    onClick={handleDownload}
                    disabled={loadingDownload}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    Descargar ZIP
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>

          {generatedRun && (
            <Alert severity="success" sx={{ mt: 2 }}>
              ISC de {generatedRun.report_month} generado correctamente. Ya puede descargar el ZIP.
            </Alert>
          )}

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
                  label={valid ? "Listo para generar" : "Requiere corrección"}
                  color={valid ? "success" : "error"}
                />
              </Stack>

              {rows.length > 0 && (
                <Box sx={{ mt: 2.5, height: 400 }}>
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
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
