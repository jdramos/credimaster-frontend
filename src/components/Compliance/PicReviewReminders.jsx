import React, { useContext, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Snackbar, Stack, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import { useAuth } from "../../contexts/AuthContext";
import { printPicReport } from "../../reports/picReport";

const RISK_CHIP = {
  BAJO: { label: "BAJO", color: "success" },
  MEDIO: { label: "MEDIO", color: "warning" },
  ALTO: { label: "ALTO", color: "error" },
};

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
          label={params.value < 0 ? `Vencido hace ${Math.abs(params.value)} días` : `${params.value} días`}
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

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <AssignmentLateIcon sx={{ color: "#B45309" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Actualización de Perfil Integral del Cliente (PIC)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Clientes con PIC vencido o por vencer en los próximos 30 días (Art. 17 CD-CONAMI-070-01OCT07-2025)
            </Typography>
          </Box>
        </Box>

        <Box sx={{ height: 500 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            disableRowSelectionOnClick
            sx={{
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F8FAFC", fontWeight: 700 },
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
