import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Button,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Autocomplete,
  LinearProgress,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockIcon from "@mui/icons-material/Block";
import API from "../../api";

const API_URL = "/api/hr/loans";

const emptyForm = { employee: null, principal: "", num_installments: "", description: "" };

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function EmployeeLoansList() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar préstamos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
    API.get("/api/hr/employees?status=ACTIVO").then((res) => setEmployees(res.data?.data || [])).catch(() => {});
  }, []);

  const handleOpenCreate = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.employee || !form.principal || !form.num_installments) {
      showAlert("Complete empleado, monto y número de cuotas", "error");
      return;
    }
    try {
      setSaving(true);
      await API.post(API_URL, {
        employee_id: form.employee.id,
        principal: Number(form.principal),
        num_installments: Number(form.num_installments),
        description: form.description || null,
      });
      showAlert("Préstamo registrado correctamente");
      setDialogOpen(false);
      fetchLoans();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al registrar el préstamo", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = async (row) => {
    const confirmed = window.confirm(`¿Confirma anular el préstamo de "${row.employee_name}"?`);
    if (!confirmed) return;
    try {
      await API.put(`${API_URL}/${row.id}/void`);
      showAlert("Préstamo anulado correctamente");
      fetchLoans();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al anular el préstamo", "error");
    }
  };

  const columns = useMemo(() => [
    { field: "employee_name", headerName: "Empleado", flex: 1, minWidth: 180 },
    { field: "description", headerName: "Descripción", flex: 1, minWidth: 160, renderCell: (p) => p.value || "-" },
    { field: "principal", headerName: "Monto", width: 120, renderCell: (p) => `C$ ${money(p.value)}` },
    { field: "installment_amount", headerName: "Cuota", width: 120, renderCell: (p) => `C$ ${money(p.value)}` },
    {
      field: "progress",
      headerName: "Avance",
      width: 160,
      renderCell: (p) => (
        <Box sx={{ width: "100%" }}>
          <LinearProgress variant="determinate" value={(p.row.paid_installments / p.row.num_installments) * 100} sx={{ height: 8, borderRadius: 4 }} />
          <Typography variant="caption" color="text.secondary">{p.row.paid_installments} de {p.row.num_installments}</Typography>
        </Box>
      ),
    },
    { field: "balance", headerName: "Saldo", width: 120, renderCell: (p) => `C$ ${money(p.value)}` },
    {
      field: "status",
      headerName: "Estado",
      width: 110,
      renderCell: (p) => {
        const color = p.value === "ACTIVO" ? "warning" : p.value === "PAGADO" ? "success" : "default";
        const label = p.value === "ACTIVO" ? "Activo" : p.value === "PAGADO" ? "Pagado" : "Anulado";
        return <Chip size="small" color={color} label={label} />;
      },
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 90,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        params.row.status === "ACTIVO" && params.row.paid_installments === 0 ? (
          <Tooltip title="Anular">
            <IconButton size="small" color="error" onClick={() => handleVoid(params.row)}>
              <BlockIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null
      ),
    },
  ], []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <RequestQuoteIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Préstamos de empleados</Typography>
              <Typography variant="body2" color="text.secondary">
                Préstamos/anticipos personales deducidos por planilla
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
              Nuevo préstamo
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchLoans}>
              Actualizar
            </Button>
          </Box>
        </Box>

        <Box sx={{ height: 560, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50]}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nuevo préstamo de empleado</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={employees}
                value={form.employee}
                getOptionLabel={(o) => o.full_name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, employee: value }))}
                renderInput={(params) => <TextField {...params} label="Empleado" />}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Descripción (opcional)" placeholder="Ej: Anticipo de emergencia"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" type="number" label="Monto (C$)"
                value={form.principal}
                onChange={(e) => setForm((f) => ({ ...f, principal: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" type="number" label="Número de cuotas"
                value={form.num_installments}
                onChange={(e) => setForm((f) => ({ ...f, num_installments: e.target.value }))}
              />
            </Grid>
            {form.principal && form.num_installments > 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  Cuota estimada: C$ {money(Number(form.principal) / Number(form.num_installments))}
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : "Registrar préstamo"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
