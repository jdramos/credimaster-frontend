import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  IconButton,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import API from "../../api";

const IMPORTS = [
  {
    key: "customers",
    label: "Clientes",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/customers/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/customers`,
    templateFileName: "plantilla_clientes.xlsx",
  },
  {
    key: "loans",
    label: "Créditos activos",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/loans/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/loans`,
    templateFileName: "plantilla_creditos.xlsx",
    note: "Requiere que los clientes ya se hayan importado.",
  },
  {
    key: "opening-balance",
    label: "Saldos de apertura",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/opening-balance/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/opening-balance`,
    templateFileName: "plantilla_saldos_apertura.xlsx",
    note: "El archivo debe cuadrar (débito = crédito) o se rechaza completo.",
  },
  {
    key: "guarantees",
    label: "Garantías",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/guarantees/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/guarantees`,
    templateFileName: "plantilla_garantias.xlsx",
    note: "Requiere que los clientes ya se hayan importado.",
  },
  {
    key: "written-off-loans",
    label: "Cartera saneada",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/written-off-loans/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/written-off-loans`,
    templateFileName: "plantilla_cartera_saneada.xlsx",
    note: "Créditos ya castigados en el sistema anterior — solo historial, no genera asientos contables. Requiere que los clientes ya se hayan importado.",
  },
  {
    key: "fixed-assets",
    label: "Activos fijos",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/fixed-assets/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/fixed-assets`,
    templateFileName: "plantilla_activos_fijos.xlsx",
    note: "Genera un asiento de saldo de apertura por activo contra la cuenta puente de migración.",
  },
  {
    key: "adjudicated-assets",
    label: "Bienes adjudicados",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/adjudicated-assets/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/adjudicated-assets`,
    templateFileName: "plantilla_bienes_adjudicados.xlsx",
    note: "Requiere que los clientes ya se hayan importado. Crea también un registro histórico del crédito original y postea el saldo de apertura del bien (y la provisión inicial, si aplica) contra la cuenta puente.",
  },
  {
    key: "bank-accounts",
    label: "Cuentas bancarias",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/bank-accounts/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/bank-accounts`,
    templateFileName: "plantilla_cuentas_bancarias.xlsx",
    note: "No genera asientos contables — el saldo de apertura queda como dato informativo, igual que al crear la cuenta manualmente.",
  },
  {
    key: "cash-registers",
    label: "Cajas",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/cash-registers/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/cash-registers`,
    templateFileName: "plantilla_cajas.xlsx",
    note: "No genera asientos contables — el saldo de apertura queda como dato informativo, igual que al crear la caja manualmente.",
  },
  {
    key: "funders",
    label: "Financiadores",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/funders/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/funders`,
    templateFileName: "plantilla_financiadores.xlsx",
    note: "Impórtelo antes que Obligaciones Financieras.",
  },
  {
    key: "obligations",
    label: "Obligaciones financieras",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/obligations/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/obligations`,
    templateFileName: "plantilla_obligaciones.xlsx",
    note: "Requiere que los financiadores ya se hayan importado. No genera asientos contables, solo el cronograma de cuotas.",
  },
  {
    key: "employees",
    label: "Empleados",
    templateUrl: (id) => `/api/superadmin/tenants/${id}/import/employees/template`,
    uploadUrl: (id) => `/api/superadmin/tenants/${id}/import/employees`,
    templateFileName: "plantilla_empleados.xlsx",
    note: "Solo datos maestros — el supervisor y el usuario del sistema de cada empleado se asignan después desde Recursos Humanos.",
  },
];

function ImportTab({ tenantId, config }) {
  const [downloading, setDownloading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleDownloadTemplate = async () => {
    try {
      setDownloading(true);
      const response = await API.get(config.templateUrl(tenantId), { responseType: "blob" });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = config.templateFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setResult({ ok: false, message: error.response?.data?.message || "No se pudo descargar la plantilla" });
    } finally {
      setDownloading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await API.post(config.uploadUrl(tenantId), formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult({ ok: true, ...res.data });
      setFile(null);
    } catch (error) {
      setResult({
        ok: false,
        message: error.response?.data?.message || error.message || "Error al importar",
        errors: error.response?.data?.errors || [],
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {config.note && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {config.note}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={downloading ? <CircularProgress size={16} /> : <DownloadIcon />}
          onClick={handleDownloadTemplate}
          disabled={downloading}
          sx={{ textTransform: "none" }}
        >
          Descargar plantilla
        </Button>

        <Button variant="outlined" component="label" sx={{ textTransform: "none" }}>
          {file ? file.name : "Elegir archivo .xlsx"}
          <input
            type="file"
            hidden
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </Button>

        <Button
          variant="contained"
          startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <UploadFileIcon />}
          onClick={handleUpload}
          disabled={!file || uploading}
          sx={{ textTransform: "none" }}
        >
          Validar y subir
        </Button>
      </Box>

      {result && result.ok && (
        <Alert severity="success">
          {result.imported != null ? `${result.imported} registro(s) importado(s) correctamente.` : "Importación exitosa."}
          {result.entry_no ? ` Comprobante: ${result.entry_no}.` : ""}
        </Alert>
      )}

      {result && !result.ok && (
        <Box>
          <Alert severity="error" sx={{ mb: 1 }}>
            {result.message}
          </Alert>

          {result.errors?.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fila</TableCell>
                  <TableCell>Campo</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.errors.map((err, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{err.row}</TableCell>
                    <TableCell>{err.field}</TableCell>
                    <TableCell>{err.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>
      )}
    </Box>
  );
}

export default function TenantMigrationPanel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <IconButton onClick={() => navigate("/superadmin")} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={800}>
            Migración de datos — Empresa #{id}
          </Typography>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
          {IMPORTS.map((imp) => (
            <Tab key={imp.key} label={imp.label} />
          ))}
        </Tabs>

        {IMPORTS.map((imp, idx) => (
          <Box key={imp.key} sx={{ display: tab === idx ? "block" : "none" }}>
            <ImportTab tenantId={id} config={imp} />
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
