import React, { useEffect, useState } from "react";
import HelpButton from "../help/HelpButton";
import { Alert, Box, Chip, Paper, Snackbar, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate";
import API from "../../api";

// Recordatorio de contratos por vencer (PLAZO_FIJO/OBRA_DETERMINADA con
// contract_end_date en los próximos 30 días) -- mismo patrón visual que
// PicReviewReminders.jsx.
const daysUntil = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target - today) / 86400000);
};

const CONTRACT_TYPE_LABEL = {
  PLAZO_FIJO: "Plazo fijo",
  OBRA_DETERMINADA: "Obra determinada",
};

export default function ContractReminders() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/api/hr/contract-reminders");
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al cargar el listado", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const columns = [
    { field: "full_name", headerName: "Empleado", flex: 1, minWidth: 200 },
    { field: "id_card", headerName: "Cédula", width: 150 },
    { field: "department_name", headerName: "Departamento", width: 160 },
    { field: "position_title", headerName: "Puesto", width: 160 },
    {
      field: "contract_type",
      headerName: "Tipo de contrato",
      width: 150,
      valueFormatter: ({ value }) => CONTRACT_TYPE_LABEL[value] || value,
    },
    {
      field: "contract_end_date",
      headerName: "Vencimiento",
      width: 130,
      valueFormatter: ({ value }) => (value ? String(value).slice(0, 10) : ""),
    },
    {
      field: "days",
      headerName: "Días restantes",
      width: 150,
      valueGetter: (params) => daysUntil(params.row.contract_end_date),
      renderCell: (params) => (
        <Chip
          size="small"
          label={params.value < 0 ? `Vencido hace ${Math.abs(params.value)} días` : `${params.value} días`}
          color={params.value < 0 ? "error" : params.value <= 7 ? "warning" : "default"}
        />
      ),
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <AssignmentLateIcon sx={{ color: "#B45309" }} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>
                Contratos por Vencer
              </Typography>
              <HelpButton screenKey="rrhh.contratos" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Empleados con contrato a plazo fijo u obra determinada vencido o por vencer en los próximos 30 días.
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
