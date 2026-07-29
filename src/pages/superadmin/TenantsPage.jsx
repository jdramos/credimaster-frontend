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
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stack,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PaymentsIcon from "@mui/icons-material/Payments";
import EditIcon from "@mui/icons-material/Edit";
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

// La pausa por mora NUNCA se guarda en `status` — se calcula aquí a partir
// de next_billing_date + grace_period_days, exactamente como lo hace
// LoginController.js en cada intento de login (ver billingController.js).
// `status === 'SUSPENDED'` sigue siendo una pausa manual aparte.
const getBillingStatus = (row) => {
  if (row.status === "SUSPENDED") {
    return { label: row.suspended_reason === "Pausa manual" ? "Suspendido manualmente" : "Pausado por mora", color: "error" };
  }
  if (!row.monthly_fee || !row.next_billing_date) {
    return { label: "Sin configurar", color: "default" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(row.next_billing_date);
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) {
    const graceLimit = new Date(due);
    graceLimit.setDate(graceLimit.getDate() + (row.grace_period_days || 0));
    if (today > graceLimit) return { label: "Pausado por mora", color: "error" };
    return { label: `Vencido hace ${Math.abs(diffDays)}d (gracia hasta ${graceLimit.toLocaleDateString("es-NI")})`, color: "warning" };
  }
  if (diffDays <= 7) return { label: `Vence en ${diffDays}d`, color: "warning" };
  return { label: "Al día", color: "success" };
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
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [billingTenant, setBillingTenant] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingConfigForm, setBillingConfigForm] = useState({ monthly_fee: "", currency: "NIO", billing_day: "", grace_period_days: 5 });
  const [paymentForm, setPaymentForm] = useState({ amount: "", currency: "NIO", payment_date: "", reference: "", notes: "" });
  const [savingBillingConfig, setSavingBillingConfig] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [togglingSuspension, setTogglingSuspension] = useState(false);

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
    setEditForm({
      legal_name: row.legal_name || "",
      commercial_name: row.commercial_name || "",
      tax_id: row.tax_id || "",
      plan_code: row.plan_code || "",
      max_users: row.max_users ?? "",
      max_branches: row.max_branches ?? "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      enabled_modules: row.enabled_modules ?? null,
    });
    setEditDialogOpen(true);
  };

  const handleEditFieldChange = (field) => (e) => {
    const value = e.target.value;
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleEditModule = (key) => {
    setEditForm((prev) => ({ ...prev, enabled_modules: toggleModule(prev.enabled_modules, key) }));
  };

  const handleSubmitEdit = async () => {
    if (!editTenant || !editForm) return;
    if (!editForm.legal_name.trim()) {
      showAlert("La razón social no puede estar vacía", "error");
      return;
    }
    try {
      setSavingEdit(true);
      await API.put(`${TENANTS_URL}/${editTenant.id}`, editForm);
      showAlert(`Empresa "${editForm.legal_name}" actualizada`);
      setEditDialogOpen(false);
      await fetchTenants();
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error actualizando la empresa", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchBilling = async (tenantId) => {
    try {
      setBillingLoading(true);
      const res = await API.get(`${TENANTS_URL}/${tenantId}/billing`);
      const data = res.data?.data;
      setBillingData(data);
      setBillingConfigForm({
        monthly_fee: data.monthly_fee ?? "",
        currency: data.currency || "NIO",
        billing_day: data.billing_day ?? "",
        grace_period_days: data.grace_period_days ?? 5,
      });
      setPaymentForm({
        amount: "",
        currency: data.currency || "NIO",
        payment_date: new Date().toISOString().slice(0, 10),
        reference: "",
        notes: "",
      });
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error al cargar la facturación", "error");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleOpenBilling = (row) => {
    setBillingTenant(row);
    setBillingDialogOpen(true);
    fetchBilling(row.id);
  };

  const handleSaveBillingConfig = async () => {
    if (!billingTenant) return;
    try {
      setSavingBillingConfig(true);
      await API.put(`${TENANTS_URL}/${billingTenant.id}/billing/config`, {
        monthly_fee: billingConfigForm.monthly_fee === "" ? null : Number(billingConfigForm.monthly_fee),
        currency: billingConfigForm.currency,
        billing_day: billingConfigForm.billing_day === "" ? null : Number(billingConfigForm.billing_day),
        grace_period_days: Number(billingConfigForm.grace_period_days || 0),
      });
      showAlert("Configuración de facturación guardada");
      await fetchBilling(billingTenant.id);
      await fetchTenants();
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error guardando la configuración", "error");
    } finally {
      setSavingBillingConfig(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!billingTenant) return;
    if (!paymentForm.amount || !paymentForm.payment_date) {
      showAlert("Monto y fecha de pago son requeridos", "error");
      return;
    }
    try {
      setSavingPayment(true);
      await API.post(`${TENANTS_URL}/${billingTenant.id}/billing/payments`, paymentForm);
      showAlert("Pago registrado correctamente");
      await fetchBilling(billingTenant.id);
      await fetchTenants();
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error registrando el pago", "error");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSendReminder = async () => {
    if (!billingTenant) return;
    try {
      setSendingReminder(true);
      const res = await API.post(`${TENANTS_URL}/${billingTenant.id}/billing/reminder`);
      showAlert(res.data?.message || "Recordatorio enviado");
      await fetchBilling(billingTenant.id);
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error enviando el recordatorio", "error");
    } finally {
      setSendingReminder(false);
    }
  };

  const handleToggleSuspension = async (action) => {
    if (!billingTenant) return;
    try {
      setTogglingSuspension(true);
      await API.put(`${TENANTS_URL}/${billingTenant.id}/billing/suspension`, { action });
      showAlert(action === "SUSPEND" ? "Empresa suspendida" : "Empresa reactivada");
      await fetchBilling(billingTenant.id);
      await fetchTenants();
    } catch (error) {
      showAlert(error.response?.data?.message || error.message || "Error actualizando la suspensión", "error");
    } finally {
      setTogglingSuspension(false);
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
      field: "billing_status",
      headerName: "Facturación",
      width: 200,
      sortable: false,
      renderCell: (params) => {
        const chip = getBillingStatus(params.row);
        return <Chip size="small" color={chip.color} label={chip.label} variant={chip.color === "default" ? "outlined" : "filled"} />;
      },
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 300,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Editar empresa">
            <IconButton size="small" onClick={() => handleOpenEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Facturación">
            <IconButton size="small" onClick={() => handleOpenBilling(params.row)}>
              <PaymentsIcon fontSize="small" />
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

      <Dialog open={editDialogOpen} onClose={() => !savingEdit && setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Empresa — {editTenant?.tenant_code}</DialogTitle>
        <DialogContent dividers>
          {editForm && (
            <>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                Datos de la empresa
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <TextField label="Razón social" fullWidth size="small" value={editForm.legal_name} onChange={handleEditFieldChange("legal_name")} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField label="Nombre comercial" fullWidth size="small" value={editForm.commercial_name} onChange={handleEditFieldChange("commercial_name")} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="RUC / Tax ID" fullWidth size="small" value={editForm.tax_id} onChange={handleEditFieldChange("tax_id")} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Plan" fullWidth size="small" value={editForm.plan_code} onChange={handleEditFieldChange("plan_code")} />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField label="Máx. usuarios" type="number" fullWidth size="small" value={editForm.max_users} onChange={handleEditFieldChange("max_users")} />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField label="Máx. sucursales" type="number" fullWidth size="small" value={editForm.max_branches} onChange={handleEditFieldChange("max_branches")} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Teléfono" fullWidth size="small" value={editForm.phone} onChange={handleEditFieldChange("phone")} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Correo" fullWidth size="small" value={editForm.email} onChange={handleEditFieldChange("email")} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField label="Dirección" fullWidth size="small" value={editForm.address} onChange={handleEditFieldChange("address")} />
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
                        checked={isModuleChecked(editForm.enabled_modules, mod.key)}
                        onChange={() => handleToggleEditModule(mod.key)}
                      />
                    }
                    label={mod.label}
                  />
                ))}
              </FormGroup>
            </>
          )}
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
            Guardar cambios
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={billingDialogOpen} onClose={() => setBillingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Facturación — {billingTenant?.legal_name}</DialogTitle>
        <DialogContent dividers>
          {billingLoading && !billingData ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : billingData ? (
            <Stack spacing={2}>
              {billingData.status === "SUSPENDED" ? (
                <Alert severity="error">
                  Suspendida — {billingData.suspended_reason || "sin motivo especificado"}
                  {billingData.suspended_at ? ` (${new Date(billingData.suspended_at).toLocaleString("es-NI")})` : ""}
                </Alert>
              ) : billingData.days_overdue != null ? (
                <Alert severity="warning">
                  Vencido hace {billingData.days_overdue} día(s) — {billingData.grace_period_days} día(s) de gracia desde el vencimiento.
                </Alert>
              ) : billingData.days_until_due != null ? (
                <Alert severity="success">Al día — próximo vencimiento en {billingData.days_until_due} día(s).</Alert>
              ) : (
                <Alert severity="info">Sin configuración de facturación todavía.</Alert>
              )}

              <Typography variant="subtitle2" fontWeight={800}>Configuración</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Tarifa mensual"
                    type="number"
                    fullWidth
                    size="small"
                    value={billingConfigForm.monthly_fee}
                    onChange={(e) => setBillingConfigForm((f) => ({ ...f, monthly_fee: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Moneda"
                    fullWidth
                    size="small"
                    value={billingConfigForm.currency}
                    onChange={(e) => setBillingConfigForm((f) => ({ ...f, currency: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Día de corte (1-28)"
                    type="number"
                    fullWidth
                    size="small"
                    value={billingConfigForm.billing_day}
                    onChange={(e) => setBillingConfigForm((f) => ({ ...f, billing_day: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Días de gracia"
                    type="number"
                    fullWidth
                    size="small"
                    value={billingConfigForm.grace_period_days}
                    onChange={(e) => setBillingConfigForm((f) => ({ ...f, grace_period_days: e.target.value }))}
                  />
                </Grid>
              </Grid>
              <Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSaveBillingConfig}
                  disabled={savingBillingConfig}
                  startIcon={savingBillingConfig ? <CircularProgress size={14} /> : null}
                  sx={{ textTransform: "none" }}
                >
                  Guardar configuración
                </Button>
              </Box>

              <Divider />

              <Typography variant="subtitle2" fontWeight={800}>Registrar pago</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Monto"
                    type="number"
                    fullWidth
                    size="small"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Fecha de pago"
                    type="date"
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, payment_date: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Referencia"
                    fullWidth
                    size="small"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6} md={3}>
                  <TextField
                    label="Notas"
                    fullWidth
                    size="small"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </Grid>
              </Grid>
              <Box>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleRecordPayment}
                  disabled={savingPayment}
                  startIcon={savingPayment ? <CircularProgress size={14} color="inherit" /> : null}
                  sx={{ textTransform: "none" }}
                >
                  Registrar pago
                </Button>
              </Box>

              <Divider />

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSendReminder}
                  disabled={sendingReminder}
                  startIcon={sendingReminder ? <CircularProgress size={14} /> : null}
                  sx={{ textTransform: "none" }}
                >
                  Enviar recordatorio por correo
                </Button>
                {billingData.status === "SUSPENDED" ? (
                  <Button
                    size="small"
                    variant="outlined"
                    color="success"
                    onClick={() => handleToggleSuspension("REACTIVATE")}
                    disabled={togglingSuspension}
                    sx={{ textTransform: "none" }}
                  >
                    Reactivar
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => handleToggleSuspension("SUSPEND")}
                    disabled={togglingSuspension}
                    sx={{ textTransform: "none" }}
                  >
                    Suspender manualmente
                  </Button>
                )}
              </Stack>
              {billingData.last_reminder_sent_at && (
                <Typography variant="caption" color="text.secondary">
                  Último recordatorio enviado: {new Date(billingData.last_reminder_sent_at).toLocaleString("es-NI")}
                </Typography>
              )}

              <Divider />

              <Typography variant="subtitle2" fontWeight={800}>Historial de pagos</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Monto</TableCell>
                    <TableCell>Referencia</TableCell>
                    <TableCell>Notas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billingData.payments?.length ? (
                    billingData.payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{new Date(p.payment_date).toLocaleDateString("es-NI")}</TableCell>
                        <TableCell>{p.currency} {Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell>{p.reference || "—"}</TableCell>
                        <TableCell>{p.notes || "—"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">Sin pagos registrados</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBillingDialogOpen(false)} sx={{ textTransform: "none" }}>
            Cerrar
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
