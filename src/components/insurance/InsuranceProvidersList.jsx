import React, { useContext, useEffect, useMemo, useState } from "react";
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
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

const API_URL = "/api/insurance/providers";

const emptyForm = {
  name: "",
  tax_id: "",
  contact_name: "",
  phone: "",
  email: "",
  address: "",
  status: "ACTIVA",
};

export default function InsuranceProvidersList() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canManage = role === 1 || permissions.includes("seguros.gestionar");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar las aseguradoras", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      tax_id: row.tax_id || "",
      contact_name: row.contact_name || "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      status: row.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      showAlert("El nombre de la aseguradora es requerido", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name,
        tax_id: form.tax_id || null,
        contact_name: form.contact_name || null,
        phone: form.phone || null,
        email: form.email || null,
        address: form.address || null,
        status: form.status,
      };

      if (editingId) {
        await API.put(`${API_URL}/${editingId}`, payload);
        showAlert("Aseguradora actualizada correctamente");
      } else {
        await API.post(API_URL, payload);
        showAlert("Aseguradora registrada correctamente");
      }

      setDialogOpen(false);
      fetchProviders();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar la aseguradora", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      { field: "name", headerName: "Aseguradora", flex: 1, minWidth: 220 },
      { field: "tax_id", headerName: "RUC / Identificación", width: 160, renderCell: (p) => p.value || "—" },
      { field: "contact_name", headerName: "Contacto", width: 180, renderCell: (p) => p.value || "—" },
      { field: "phone", headerName: "Teléfono", width: 130, renderCell: (p) => p.value || "—" },
      { field: "email", headerName: "Correo", width: 200, renderCell: (p) => p.value || "—" },
      {
        field: "status",
        headerName: "Estado",
        width: 120,
        renderCell: (p) => (
          <Chip
            size="small"
            color={p.value === "ACTIVA" ? "success" : "default"}
            label={p.value === "ACTIVA" ? "Activa" : "Inactiva"}
          />
        ),
      },
      ...(canManage
        ? [
            {
              field: "actions",
              headerName: "Acciones",
              width: 90,
              sortable: false,
              filterable: false,
              renderCell: (params) => (
                <Tooltip title="Editar">
                  <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ),
            },
          ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage],
  );

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <HealthAndSafetyIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Aseguradoras
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Compañías de seguros tercerizadas que ofrecen pólizas a los clientes
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {canManage && (
              <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
                Nueva aseguradora
              </Button>
            )}
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchProviders}>
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
        <DialogTitle>{editingId ? "Editar aseguradora" : "Nueva aseguradora"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Nombre de la aseguradora"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="RUC / Identificación"
                value={form.tax_id}
                onChange={(e) => setForm((f) => ({ ...f, tax_id: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                size="small"
                label="Estado"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value="ACTIVA">Activa</MenuItem>
                <MenuItem value="INACTIVA">Inactiva</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Nombre de contacto"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Teléfono"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Correo"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Dirección"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar aseguradora"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={5000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
