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
  Autocomplete,
  InputAdornment,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import PolicyIcon from "@mui/icons-material/Policy";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

const API_URL = "/api/insurance/products";
const PROVIDERS_URL = "/api/insurance/providers";

const emptyForm = {
  provider_id: "",
  name: "",
  coverage_type: "",
  benefits: "",
  premium_type: "FIJO",
  premium_value: "",
  status: "ACTIVO",
};

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function InsuranceProductsList() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canManage = role === 1 || permissions.includes("seguros.gestionar");

  const [rows, setRows] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar los tipos de seguro", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await API.get(PROVIDERS_URL);
      setProviders((res.data?.data || []).filter((p) => p.status === "ACTIVA"));
    } catch {
      // el formulario simplemente mostrará el selector vacío
    }
  };

  useEffect(() => {
    fetchProducts();
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
      provider_id: row.provider_id,
      name: row.name,
      coverage_type: row.coverage_type,
      benefits: row.benefits || "",
      premium_type: row.premium_type,
      premium_value: row.premium_value,
      status: row.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.provider_id) {
      showAlert("Debe seleccionar una aseguradora", "error");
      return;
    }
    if (!form.name) {
      showAlert("El nombre del tipo de seguro es requerido", "error");
      return;
    }
    if (!form.coverage_type) {
      showAlert("El tipo de cobertura es requerido", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        provider_id: form.provider_id,
        name: form.name,
        coverage_type: form.coverage_type,
        benefits: form.benefits || null,
        premium_type: form.premium_type,
        premium_value: Number(form.premium_value || 0),
        status: form.status,
      };

      if (editingId) {
        await API.put(`${API_URL}/${editingId}`, payload);
        showAlert("Tipo de seguro actualizado correctamente");
      } else {
        await API.post(API_URL, payload);
        showAlert("Tipo de seguro registrado correctamente");
      }

      setDialogOpen(false);
      fetchProducts();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al guardar el tipo de seguro", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      { field: "name", headerName: "Tipo de seguro", flex: 1, minWidth: 200 },
      { field: "provider_name", headerName: "Aseguradora", width: 200 },
      { field: "coverage_type", headerName: "Cobertura", width: 160 },
      {
        field: "premium_value",
        headerName: "Prima de referencia",
        width: 170,
        renderCell: (p) =>
          p.row.premium_type === "PORCENTAJE_MONTO"
            ? `${money(p.value)}% del monto`
            : `C$ ${money(p.value)}`,
      },
      {
        field: "status",
        headerName: "Estado",
        width: 110,
        renderCell: (p) => (
          <Chip
            size="small"
            color={p.value === "ACTIVO" ? "success" : "default"}
            label={p.value === "ACTIVO" ? "Activo" : "Inactivo"}
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
            <PolicyIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Tipos de Seguro
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pólizas ofrecidas por cada aseguradora, con su cobertura y beneficios
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {canManage && (
              <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
                Nuevo tipo de seguro
              </Button>
            )}
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchProducts}>
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
        <DialogTitle>{editingId ? "Editar tipo de seguro" : "Nuevo tipo de seguro"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={providers}
                getOptionLabel={(o) => o.name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                value={providers.find((p) => p.id === form.provider_id) || null}
                onChange={(_, value) => setForm((f) => ({ ...f, provider_id: value?.id || "" }))}
                renderInput={(params) => <TextField {...params} label="Aseguradora" />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Nombre del tipo de seguro"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Tipo de cobertura"
                placeholder="Vida, Vida + Invalidez, Vida + Accidentes..."
                value={form.coverage_type}
                onChange={(e) => setForm((f) => ({ ...f, coverage_type: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                size="small"
                label="Beneficios / cobertura"
                placeholder="Describa qué cubre la póliza (suma asegurada, condiciones, exclusiones, etc.)"
                value={form.benefits}
                onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Tipo de prima"
                value={form.premium_type}
                onChange={(e) => setForm((f) => ({ ...f, premium_type: e.target.value }))}
              >
                <MenuItem value="FIJO">Monto fijo</MenuItem>
                <MenuItem value="PORCENTAJE_MONTO">% del monto del crédito</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Prima de referencia"
                value={form.premium_value}
                onChange={(e) => setForm((f) => ({ ...f, premium_value: e.target.value }))}
                InputProps={{
                  startAdornment: form.premium_type === "FIJO" ? <InputAdornment position="start">C$</InputAdornment> : undefined,
                  endAdornment: form.premium_type === "PORCENTAJE_MONTO" ? <InputAdornment position="end">%</InputAdornment> : undefined,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Estado"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                <MenuItem value="ACTIVO">Activo</MenuItem>
                <MenuItem value="INACTIVO">Inactivo</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Registrar tipo de seguro"}
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
