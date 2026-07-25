import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Alert,
  Snackbar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider,
  CircularProgress,
  Tooltip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import TuneIcon from "@mui/icons-material/Tune";
import API from "../../api";

const TENANTS_URL = "/api/superadmin/tenants";
const MODULES_URL = "/api/superadmin/modules";

const emptyForm = {
  tenant_code: "",
  legal_name: "",
  commercial_name: "",
  tax_id: "",
  database_name: "",
  plan_code: "",
  max_users: "",
  max_branches: "",
  phone: "",
  email: "",
  address: "",
  branch_name: "",
  branch_address: "",
  branch_manager: "",
  branch_province_id: "",
  branch_municipality_id: "",
  branch_risk_id: "",
  admin_username: "",
  admin_password: "",
  admin_full_name: "",
  admin_email: "",
  enabled_modules: null,
};

// Slugifica el código de empresa a un nombre de base de datos válido
// (mismo patrón que valida el backend: minúsculas, dígitos, guión bajo).
const slugifyDbName = (tenantCode) =>
  "credimaster_" +
  String(tenantCode || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const PROVISIONING_CHIP = {
  PROVISIONING: { label: "Aprovisionando…", color: "warning" },
  ACTIVE: { label: "Activa", color: "success" },
  FAILED: { label: "Falló", color: "error" },
};

export default function TenantsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dbNameEdited, setDbNameEdited] = useState(false);

  const [availableModules, setAvailableModules] = useState([]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [editModules, setEditModules] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const pollTimers = useRef({});

  const showAlert = (message, severity = "success") => setAlert({ open: true, message, severity });

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await API.get(TENANTS_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error al cargar las empresas", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await API.get(MODULES_URL);
      setAvailableModules(res.data?.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchModules();
    const timers = pollTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pollTenant = (tenantId) => {
    const poll = async () => {
      try {
        const res = await API.get(`${TENANTS_URL}/${tenantId}`);
        const updated = res.data?.data;
        if (!updated) return;

        setRows((prev) => prev.map((r) => (r.id === tenantId ? { ...r, ...updated } : r)));

        if (updated.provisioning_status === "PROVISIONING") {
          pollTimers.current[tenantId] = setTimeout(poll, 3000);
        } else if (updated.provisioning_status === "ACTIVE") {
          showAlert(`Empresa "${updated.legal_name}" aprovisionada correctamente`);
        } else if (updated.provisioning_status === "FAILED") {
          showAlert(`El aprovisionamiento de "${updated.legal_name}" falló: ${updated.provisioning_error || ""}`, "error");
        }
      } catch (error) {
        console.error(error);
      }
    };

    poll();
  };

  const handleOpenCreate = () => {
    setForm(emptyForm);
    setDbNameEdited(false);
    setDialogOpen(true);
  };

  const handleFieldChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "tenant_code" && !dbNameEdited) {
        next.database_name = slugifyDbName(value);
      }
      return next;
    });
  };

  const handleDbNameChange = (e) => {
    setDbNameEdited(true);
    setForm((prev) => ({ ...prev, database_name: e.target.value }));
  };

  // enabled_modules === null significa "todos habilitados". Al desmarcar un
  // módulo por primera vez, se expande null al listado completo de claves
  // conocidas para poder representar la exclusión.
  const isModuleChecked = (modulesValue, key) => modulesValue === null || modulesValue.includes(key);

  const toggleModule = (modulesValue, key) => {
    const allKeys = availableModules.map((m) => m.key);
    const current = modulesValue === null ? allKeys : modulesValue;
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    return next.length === allKeys.length ? null : next;
  };

  const handleToggleModule = (key) => {
    setForm((prev) => ({ ...prev, enabled_modules: toggleModule(prev.enabled_modules, key) }));
  };

  const handleOpenEdit = (row) => {
    setEditTenant(row);
    setEditModules(row.enabled_modules ?? null);
    setEditDialogOpen(true);
  };

  const handleToggleEditModule = (key) => {
    setEditModules((prev) => toggleModule(prev, key));
  };

  const handleSubmitEdit = async () => {
    if (!editTenant) return;
    try {
      setSavingEdit(true);
      await API.put(`${TENANTS_URL}/${editTenant.id}`, { enabled_modules: editModules });
      showAlert(`Módulos de "${editTenant.legal_name}" actualizados`);
      setEditDialogOpen(false);
      await fetchTenants();
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error actualizando los módulos", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const res = await API.post(TENANTS_URL, form);
      const tenantId = res.data?.tenant_id;

      showAlert("Empresa creada, aprovisionando en segundo plano…");
      setDialogOpen(false);
      await fetchTenants();

      if (tenantId) pollTenant(tenantId);
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error creando la empresa", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { field: "tenant_code", headerName: "Código", width: 110 },
    { field: "legal_name", headerName: "Razón social", flex: 1, minWidth: 220 },
    { field: "database_name", headerName: "Base de datos", width: 180 },
    {
      field: "provisioning_status",
      headerName: "Estado",
      width: 170,
      renderCell: (params) => {
        const chip = PROVISIONING_CHIP[params.value] || { label: params.value, color: "default" };
        return (
          <Tooltip title={params.row.provisioning_error || params.row.provisioning_step || ""}>
            <Chip
              size="small"
              color={chip.color}
              label={chip.label}
              icon={params.value === "PROVISIONING" ? <CircularProgress size={14} color="inherit" /> : undefined}
            />
          </Tooltip>
        );
      },
    },
    { field: "plan_code", headerName: "Plan", width: 100 },
    {
      field: "enabled_modules",
      headerName: "Módulos",
      width: 220,
      sortable: false,
      renderCell: (params) => {
        const value = params.value;
        if (value === null || value === undefined) {
          return <Chip size="small" label="Todos" variant="outlined" />;
        }
        if (!Array.isArray(value) || value.length === 0) {
          return <Chip size="small" label="Ninguno" color="default" />;
        }
        return (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {value.map((key) => {
              const mod = availableModules.find((m) => m.key === key);
              return <Chip key={key} size="small" label={mod?.label || key} />;
            })}
          </Box>
        );
      },
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 220,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Editar módulos habilitados">
            <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
              <TuneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            startIcon={<UploadFileIcon />}
            disabled={params.row.provisioning_status !== "ACTIVE"}
            onClick={() => navigate(`/superadmin/tenants/${params.row.id}/migration`)}
            sx={{ textTransform: "none" }}
          >
            Migrar datos
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" fontWeight={800}>
            Empresas
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button startIcon={<RefreshIcon />} onClick={fetchTenants} sx={{ textTransform: "none" }}>
              Actualizar
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} sx={{ textTransform: "none" }}>
              Nueva Empresa
            </Button>
          </Box>
        </Box>

        <Box sx={{ height: 560 }}>
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

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nueva Empresa</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Datos de la empresa
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={3}>
              <TextField label="Código (tenant_code)" fullWidth size="small" value={form.tenant_code} onChange={handleFieldChange("tenant_code")} />
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField label="Razón social" fullWidth size="small" value={form.legal_name} onChange={handleFieldChange("legal_name")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Nombre comercial" fullWidth size="small" value={form.commercial_name} onChange={handleFieldChange("commercial_name")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="RUC / Tax ID" fullWidth size="small" value={form.tax_id} onChange={handleFieldChange("tax_id")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Base de datos" fullWidth size="small" value={form.database_name} onChange={handleDbNameChange} helperText="Se genera automático del código, editable" />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Plan" fullWidth size="small" value={form.plan_code} onChange={handleFieldChange("plan_code")} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField label="Máx. usuarios" type="number" fullWidth size="small" value={form.max_users} onChange={handleFieldChange("max_users")} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField label="Máx. sucursales" type="number" fullWidth size="small" value={form.max_branches} onChange={handleFieldChange("max_branches")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Teléfono" fullWidth size="small" value={form.phone} onChange={handleFieldChange("phone")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Correo" fullWidth size="small" value={form.email} onChange={handleFieldChange("email")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Dirección" fullWidth size="small" value={form.address} onChange={handleFieldChange("address")} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Primera sucursal
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}>
              <TextField label="Nombre" fullWidth size="small" value={form.branch_name} onChange={handleFieldChange("branch_name")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Dirección" fullWidth size="small" value={form.branch_address} onChange={handleFieldChange("branch_address")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Gerente" fullWidth size="small" value={form.branch_manager} onChange={handleFieldChange("branch_manager")} />
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField label="ID Provincia" type="number" fullWidth size="small" value={form.branch_province_id} onChange={handleFieldChange("branch_province_id")} />
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField label="ID Municipio (opcional)" type="number" fullWidth size="small" value={form.branch_municipality_id} onChange={handleFieldChange("branch_municipality_id")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="ID Nivel de riesgo" type="number" fullWidth size="small" value={form.branch_risk_id} onChange={handleFieldChange("branch_risk_id")} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Usuario administrador inicial
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}>
              <TextField label="Usuario" fullWidth size="small" value={form.admin_username} onChange={handleFieldChange("admin_username")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Contraseña" type="password" fullWidth size="small" value={form.admin_password} onChange={handleFieldChange("admin_password")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Nombre completo" fullWidth size="small" value={form.admin_full_name} onChange={handleFieldChange("admin_full_name")} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Correo (opcional)" fullWidth size="small" value={form.admin_email} onChange={handleFieldChange("admin_email")} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Módulos habilitados
          </Typography>
          <FormGroup row>
            {availableModules.map((mod) => (
              <FormControlLabel
                key={mod.key}
                control={
                  <Checkbox
                    size="small"
                    checked={isModuleChecked(form.enabled_modules, mod.key)}
                    onChange={() => handleToggleModule(mod.key)}
                  />
                }
                label={mod.label}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none" }}
          >
            Crear empresa
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => !savingEdit && setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Módulos habilitados — {editTenant?.legal_name}</DialogTitle>
        <DialogContent dividers>
          <FormGroup>
            {availableModules.map((mod) => (
              <FormControlLabel
                key={mod.key}
                control={
                  <Checkbox
                    size="small"
                    checked={isModuleChecked(editModules, mod.key)}
                    onChange={() => handleToggleEditModule(mod.key)}
                  />
                }
                label={mod.label}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={savingEdit} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitEdit}
            disabled={savingEdit}
            startIcon={savingEdit ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none" }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
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
