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
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Autocomplete,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import BadgeIcon from "@mui/icons-material/Badge";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import API from "../../api";

const API_URL = "/api/hr/employees";

const emptyForm = {
  full_name: "",
  id_card: "",
  position: "",
  hire_date: new Date().toISOString().slice(0, 10),
  base_salary: "",
  branch_id: "",
  supervisor: null,
  user: null,
};

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function EmployeesList() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar empleados", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    API.get("/api/branches").then(({ data }) => setBranches(Array.isArray(data) ? data : [])).catch(() => {});
    API.get("/api/users").then(({ data }) => setUsers(Array.isArray(data) ? data : data?.data || [])).catch(() => {});
  }, []);

  const activeEmployees = useMemo(() => rows.filter((r) => r.status === "ACTIVO"), [rows]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row.id);
    setForm({
      full_name: row.full_name,
      id_card: row.id_card || "",
      position: row.position || "",
      hire_date: String(row.hire_date).slice(0, 10),
      base_salary: String(row.base_salary),
      branch_id: row.branch_id || "",
      supervisor: row.supervisor_id ? { id: row.supervisor_id, full_name: row.supervisor_name } : null,
      user: row.user_id ? { id: row.user_id, user_name: row.linked_user_name } : null,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.hire_date) {
      showAlert("Complete el nombre y la fecha de ingreso", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        full_name: form.full_name,
        id_card: form.id_card || null,
        position: form.position || null,
        hire_date: form.hire_date,
        base_salary: Number(form.base_salary || 0),
        branch_id: form.branch_id || null,
        supervisor_id: form.supervisor?.id || null,
        user_id: form.user?.id || null,
      };

      if (editingId) {
        await API.put(`${API_URL}/${editingId}`, payload);
        showAlert("Empleado actualizado correctamente");
      } else {
        await API.post(API_URL, payload);
        showAlert("Empleado registrado correctamente");
      }

      setDialogOpen(false);
      fetchEmployees();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar el empleado", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    const newStatus = row.status === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const confirmed = window.confirm(`¿Confirma marcar a "${row.full_name}" como ${newStatus.toLowerCase()}?`);
    if (!confirmed) return;

    try {
      await API.put(`${API_URL}/${row.id}`, { status: newStatus });
      showAlert(`Empleado marcado como ${newStatus.toLowerCase()}`);
      fetchEmployees();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al actualizar el estado", "error");
    }
  };

  const columns = useMemo(() => [
    { field: "full_name", headerName: "Nombre", flex: 1, minWidth: 200 },
    { field: "position", headerName: "Puesto", width: 160, renderCell: (p) => p.value || "-" },
    { field: "branch_name", headerName: "Sucursal", width: 160, renderCell: (p) => p.value || "Sin asignar" },
    { field: "supervisor_name", headerName: "Jefe inmediato", width: 180, renderCell: (p) => p.value || "-" },
    { field: "base_salary", headerName: "Salario base", width: 130, renderCell: (p) => `C$ ${money(p.value)}` },
    {
      field: "status",
      headerName: "Estado",
      width: 110,
      renderCell: (p) => <Chip size="small" color={p.value === "ACTIVO" ? "success" : "default"} label={p.value === "ACTIVO" ? "Activo" : "Inactivo"} />,
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.status === "ACTIVO" ? "Marcar inactivo" : "Marcar activo"}>
            <Button size="small" sx={{ textTransform: "none", minWidth: 0 }} onClick={() => toggleStatus(params.row)}>
              {params.row.status === "ACTIVO" ? "Inactivar" : "Activar"}
            </Button>
          </Tooltip>
        </Box>
      ),
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BadgeIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Empleados</Typography>
              <Typography variant="body2" color="text.secondary">
                Catálogo de personal para nómina
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
              Nuevo empleado
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchEmployees}>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? "Editar empleado" : "Nuevo empleado"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Nombre completo"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Cédula"
                value={form.id_card}
                onChange={(e) => setForm((f) => ({ ...f, id_card: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Puesto"
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="date" label="Fecha de ingreso" InputLabelProps={{ shrink: true }}
                value={form.hire_date}
                onChange={(e) => setForm((f) => ({ ...f, hire_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="number" label="Salario base mensual (C$)"
                value={form.base_salary}
                onChange={(e) => setForm((f) => ({ ...f, base_salary: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Sucursal (opcional)"
                value={form.branch_id}
                onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
              >
                <MenuItem value="">Sin asignar</MenuItem>
                {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                size="small"
                options={activeEmployees.filter((e) => e.id !== editingId)}
                value={form.supervisor}
                getOptionLabel={(o) => o.full_name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, supervisor: value }))}
                renderInput={(params) => <TextField {...params} label="Jefe inmediato (opcional)" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                size="small"
                options={users}
                value={form.user}
                getOptionLabel={(o) => o.user_name || o.full_name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setForm((f) => ({ ...f, user: value }))}
                renderInput={(params) => <TextField {...params} label="Usuario del sistema vinculado (opcional)" />}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar empleado"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
