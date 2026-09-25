import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import HelpButton from "../help/HelpButton";
import { Alert, Box, Button, Chip, Paper, Snackbar, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import PersonSearchIcon from "@mui/icons-material/PersonSearch";
import API from "../../api";

// "Conozca a su Empleado" pendiente: empleados activos con al menos una
// verificación obligatoria del checklist todavía en PENDING (ver
// api/hr/employeeKyeController.js). La acción de completar el checklist
// vive en la ficha del empleado (pestaña "Conozca a su Empleado"), no aquí
// -- esta pantalla es solo la cola de pendientes.
export default function EmployeeKyeReminders() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/api/aml/kye-reminders");
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

  const columns = [
    { field: "full_name", headerName: "Empleado", flex: 1, minWidth: 220 },
    { field: "position", headerName: "Puesto", width: 180 },
    {
      field: "hire_date",
      headerName: "Fecha de contratación",
      width: 170,
      valueFormatter: (params) => (params.value ? String(params.value).slice(0, 10) : ""),
    },
    {
      field: "pending_count",
      headerName: "Verificaciones pendientes",
      width: 200,
      renderCell: (params) => <Chip size="small" color="warning" label={`${params.value} pendiente(s)`} />,
    },
    {
      field: "acciones",
      headerName: "Acciones",
      width: 200,
      sortable: false,
      renderCell: () => (
        <Button size="small" variant="outlined" onClick={() => navigate("/rrhh/empleados")}>
          Ir a Empleados
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
          <PersonSearchIcon sx={{ color: "#B45309" }} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>
                Conozca a su Empleado — Pendientes
              </Typography>
              <HelpButton screenKey="rrhh.conozca-su-empleado" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Empleados activos con verificaciones de identidad/antecedentes/referencias aún pendientes
              (Art. 30 CD-CONAMI-070-01OCT07-2025)
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
