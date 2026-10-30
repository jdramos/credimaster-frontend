import React, { useContext, useEffect, useState } from "react";
import dayjs from "dayjs";
import HelpButton from "../help/HelpButton";
import { Alert, Box, Button, Chip, Paper, Snackbar, Stack, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import { useAuth } from "../../contexts/AuthContext";
import { printPicReport } from "../../reports/picReport";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportDate } from "../common/reportFormat";

const RISK_CHIP = {
  BAJO: { label: "BAJO", color: "success" },
  MEDIO: { label: "MEDIO", color: "warning" },
  ALTO: { label: "ALTO", color: "error" },
};

const daysLabel = (days) => (days < 0 ? `Vencido hace ${Math.abs(days)} días` : `${days} días`);

const daysUntil = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target - today) / 86400000);
};

export default function PicReviewReminders() {
  const { user } = useContext(UserContext);
  const { tenant } = useAuth();
  const company = {
    commercial_name: tenant?.commercial_name || tenant?.name || "",
    legal_name: tenant?.legal_name || tenant?.company_name || "",
    tax_id: tenant?.tax_id || tenant?.ruc || "",
    address: tenant?.address || "",
    phone: tenant?.phone || "",
    logo_url: tenant?.logo_url || "",
  };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [printingId, setPrintingId] = useState(null);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/api/aml/pic-review-reminders");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al cargar el listado", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const handleMarkReviewed = async (customerId) => {
    try {
      setActingId(customerId);
      await API.post(`/api/aml/customers/${customerId}/recalculate-risk`);
      showAlert("PIC marcado como revisado — próxima fecha recalculada");
      await fetchRows();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al marcar como revisado", "error");
    } finally {
      setActingId(null);
    }
  };

  const handlePrintPic = async (customerId) => {
    try {
      setPrintingId(customerId);
      const { data } = await API.get(`/api/aml/customers/${customerId}/pic`);
      printPicReport({ company, user, customer: data.customer, screenings: data.screenings });
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al generar el PIC", "error");
    } finally {
      setPrintingId(null);
    }
  };

  const columns = [
    { field: "customer_code", headerName: "Código", width: 100 },
    { field: "identification", headerName: "Identificación", width: 150 },
    { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 200 },
    {
      field: "risk_level",
      headerName: "Nivel de riesgo",
      width: 140,
      renderCell: (params) => {
        const cfg = RISK_CHIP[params.value] || { label: "Sin calcular", color: "default" };
        return <Chip size="small" label={cfg.label} color={cfg.color} />;
      },
    },
    {
      field: "next_pic_review_date",
      headerName: "Vencimiento PIC",
      width: 150,
      valueFormatter: (params) => (params.value ? String(params.value).slice(0, 10) : ""),
    },
    {
      field: "days",
      headerName: "Días restantes",
      width: 140,
      valueGetter: (params) => daysUntil(params.row.next_pic_review_date),
      renderCell: (params) => (
        <Chip
          size="small"
          label={daysLabel(params.value)}
          color={params.value < 0 ? "error" : params.value <= 7 ? "warning" : "default"}
        />
      ),
    },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 300,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            disabled={actingId === params.row.id}
            onClick={() => handleMarkReviewed(params.row.id)}
          >
            Marcar como revisado
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PrintIcon fontSize="small" />}
            disabled={printingId === params.row.id}
            onClick={() => handlePrintPic(params.row.id)}
          >
            Imprimir PIC
          </Button>
        </Stack>
      ),
    },
  ];

  const buildReport = () => ({
    title: "Actualización de Perfil Integral del Cliente (PIC)",
    subtitle: "Clientes con PIC vencido o por vencer en los próximos 30 días",
    columns: [
      { field: "customer_code", label: "Código" },
      { field: "identification", label: "Identificación" },
      { field: "customer_name", label: "Cliente" },
      { field: "risk_level", label: "Nivel de riesgo", format: (v) => RISK_CHIP[v]?.label || "Sin calcular" },
      { field: "next_pic_review_date", label: "Vencimiento PIC", format: reportDate },
      { label: "Días restantes", value: (row) => daysUntil(row.next_pic_review_date), numeric: true, format: daysLabel },
    ],
    rows,
    fileName: `pic_por_vencer_${dayjs().format("YYYY-MM-DD")}`,
  });

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid var(--cm-border, #E5E7EB)", background: "var(--cm-paper, #fff)" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <AssignmentLateIcon sx={{ color: "var(--cm-warning-text, #B45309)" }} />
          <Box flexGrow={1}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>
                Actualización de Perfil Integral del Cliente (PIC)
              </Typography>
              <HelpButton screenKey="cumplimiento.pic" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Clientes con PIC vencido o por vencer en los próximos 30 días (Art. 17 CD-CONAMI-070-01OCT07-2025)
            </Typography>
          </Box>
          <ReportExportButtons report={buildReport} disabled={!rows.length} />
        </Box>

        <Box sx={{ height: 500 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            rowsPerPageOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { pageSize: 25, page: 0 } }}
            disableSelectionOnClick
            sx={{
              border: "1px solid var(--cm-border, #E5E7EB)",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "var(--cm-surface, #F8FAFC)", fontWeight: 700 },
            }}
          />
        </Box>
      </Paper>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((prev) => ({ ...prev, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
