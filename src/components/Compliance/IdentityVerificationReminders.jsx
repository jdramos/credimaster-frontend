import React, { useEffect, useState } from "react";
import HelpButton from "../help/HelpButton";
import { Alert, Box, Button, Chip, Paper, Snackbar, Stack, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import BadgeIcon from "@mui/icons-material/Badge";
import API from "../../api";

export default function IdentityVerificationReminders() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/api/aml/identity-verification-reminders");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al cargar el listado", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMarkVerified = async (customerId) => {
    try {
      setActingId(customerId);
      await API.put(`/api/aml/customers/${customerId}/identity-verification`);
      showAlert("Verificación de identidad registrada");
      await fetchRows();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al registrar la verificación", "error");
    } finally {
      setActingId(null);
    }
  };

  const columns = [
    { field: "customer_code", headerName: "Código", width: 100 },
    { field: "identification", headerName: "Identificación", width: 150 },
    { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 200 },
    {
      field: "created_at",
      headerName: "Fecha de alta",
      width: 130,
      valueFormatter: (params) => (params.value ? String(params.value).slice(0, 10) : ""),
    },
    {
      field: "business_days_remaining",
      headerName: "Plazo (días hábiles)",
      width: 190,
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.row.overdue ? `Vencido hace ${Math.abs(params.value)} día(s) hábiles` : `${params.value} día(s) hábiles restantes`}
          color={params.row.overdue ? "error" : params.value <= 1 ? "warning" : "default"}
        />
      ),
    },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            disabled={actingId === params.row.id}
            onClick={() => handleMarkVerified(params.row.id)}
          >
            Marcar identidad verificada
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <BadgeIcon sx={{ color: "#B45309" }} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>
                Verificación de Identidad Pendiente
              </Typography>
              <HelpButton screenKey="cumplimiento.verificacion-identidad" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Clientes cuya identidad y beneficiario final aún no se han verificado, dentro del plazo
              de 10 días hábiles desde el alta (Art. 22 Ley N°. 1215)
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
