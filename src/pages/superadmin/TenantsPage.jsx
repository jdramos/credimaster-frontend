import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  MenuItem,
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
import ProvinceSelect from "../../components/ProvinceSelect";
import MunicipalitySelect from "../../components/MunicipalitySelect";
import SanctionsFeedSyncPanel from "./SanctionsFeedSyncPanel";
import ConamiIndicatorsPanel from "./ConamiIndicatorsPanel";
import { MfaPolicyPanel } from "../SecurityPage";
import { getTenantMfaPolicy, updateTenantMfaPolicy } from "../../api/mfa";
import ModulePackagePicker from "./ModulePackagePicker";
import { applyPackage, effectiveModules, withDependencies } from "./modulePackages";
import TenantAliadoFields from "./TenantAliadoFields";
import {
  ALIADOS_URL,
  PAYMENT_CONCEPT_OPTIONS,
  assignmentAction,
  assignmentFormFromCurrent,
  assignmentPayload,
  conceptLabel,
  emptyAssignmentForm,
  money,
} from "./aliados";

const PROVINCES_CATALOG_URL = "/api/superadmin/catalogs/provinces";
const MUNICIPALITIES_CATALOG_URL = "/api/superadmin/catalogs/municipalities";

const TENANTS_URL = "/api/superadmin/tenants";
const MODULES_URL = "/api/superadmin/modules";

// Usuarios contratados por canal (web / app móvil). Vacío = sin límite.
export const formatQuota = (value) => (value === null || value === undefined || value === "" ? "Sin límite" : String(value));

const emptyForm = {
  tenant_code: "",
  legal_name: "",
  commercial_name: "",
  tax_id: "",
  database_name: "",
  plan_code: "",
  max_web_users: "",
  max_app_users: "",
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
  module_package: "IMF_REGULADA",
  enabled_modules: null,
  regulatory_type: "IMF_REGULADA",
  conami_regulated: true,
  interest_type: "COMPOUND",
};

// IMF plenamente regulada (Ley 769) vs. Proveedor de Servicio de Empeño y/o
// Préstamo (persona natural/jurídica bajo CD-CONAMI-055-2024, sin la carga
// de reportería de una IMF) — ver db/license/017_add_tenant_regulatory_type.js.
const REGULATORY_TYPE_OPTIONS = [
  { value: "IMF_REGULADA", label: "IMF Regulada" },
  { value: "PERSONA_NATURAL_PRESTAMISTA", label: "Persona Natural / Prestamista" },
];

// Inscrita en la CONAMI (normada) o no (db/license/031). Una sociedad que
// presta puede no estar inscrita. Decide si la empresa puede editar los
// parámetros de las normas (p. ej. la tabla de clasificación y provisión) y
// vuelve obligatorios los módulos regulatorios (ver ModulePackagePicker).
const REGULATED_OPTIONS = [
  { value: "1", label: "Sí, inscrita en la CONAMI" },
  { value: "0", label: "No inscrita (parámetros editables)" },
];

// Tipo de interés de la empresa (db/license/021_add_tenant_interest_type.js).
// Se fija SOLO al crearla: la empresa no puede elegirlo por norma y cambiarlo
// después dejaría créditos de un mismo tenant con reglas distintas.
const INTEREST_TYPE_OPTIONS = [
  { value: "COMPOUND", label: "Sobre saldo" },
  { value: "FLAT", label: "Flat" },
];
const interestTypeLabel = (value) => INTEREST_TYPE_OPTIONS.find((opt) => opt.value === value)?.label || "Sobre saldo";

// Módulos exclusivos de IMF regulada — se desmarcan por defecto al crear un
// tenant "Persona Natural / Prestamista" (el superadmin puede reactivarlos
// manualmente si ese tenant en particular sí los necesita).
const IMF_ONLY_MODULE_KEYS = ["icc", "isc", "sinriesgo", "risk_classification_ngrc", "it_risk"];

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

// Política de verificación en dos pasos de la empresa que se edita (se guarda
// aparte, con su propio botón, igual que en Seguridad de la empresa).
function TenantMfaPolicySection({ tenantId }) {
  const loadPolicy = useCallback(() => getTenantMfaPolicy(tenantId), [tenantId]);
  const savePolicy = useCallback((policy) => updateTenantMfaPolicy(tenantId, policy), [tenantId]);
  return <MfaPolicyPanel loadPolicy={loadPolicy} savePolicy={savePolicy} asSuperadmin />;
}

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
  // Catálogo completo de GET /api/superadmin/modules: módulos, paquetes,
  // dependencias y obligatorios de una empresa normada.
  const [moduleCatalog, setModuleCatalog] = useState({ modules: [], packages: [], dependencies: {}, regulated_required: [] });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [editForm, setEditForm] = useState(null);
  // Usuarios activos por canal de la empresa en edición ({ enabled, web, app }).
  const [editUserUsage, setEditUserUsage] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [billingTenant, setBillingTenant] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingConfigForm, setBillingConfigForm] = useState({ monthly_fee: "", currency: "NIO", billing_day: "", grace_period_days: 5, implementation_fee: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", currency: "NIO", payment_date: "", concept: "MENSUALIDAD", reference: "", notes: "" });
  const [savingBillingConfig, setSavingBillingConfig] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [togglingSuspension, setTogglingSuspension] = useState(false);

  // Aliado (referidor) que trajo la empresa: se guarda junto con la empresa.
  const [aliadosCatalog, setAliadosCatalog] = useState([]);
  const [aliadoByTenant, setAliadoByTenant] = useState({});
  const [aliadosUnavailable, setAliadosUnavailable] = useState(false);
  const [createAliadoForm, setCreateAliadoForm] = useState(emptyAssignmentForm);
  const [editAliadoForm, setEditAliadoForm] = useState(emptyAssignmentForm);
  const [editAliadoInitial, setEditAliadoInitial] = useState(emptyAssignmentForm);
  const [editAliadoHistory, setEditAliadoHistory] = useState([]);

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

  // Sin la migración 033 corrida, /aliados responde error: los diálogos
  // muestran un aviso en lugar de los campos.
  const fetchAliados = async () => {
    try {
      const [catalog, assignments] = await Promise.all([
        API.get(ALIADOS_URL),
        API.get(`${ALIADOS_URL}/assignments`, { params: { status: "ACTIVE" } }),
      ]);
      setAliadosCatalog(catalog.data?.data || []);
      setAliadoByTenant(Object.fromEntries((assignments.data?.data || []).map((a) => [a.tenant_id, a.aliado_name])));
      setAliadosUnavailable(false);
    } catch {
      setAliadosUnavailable(true);
    }
  };

  const saveTenantAliado = async (tenantId, form, initial) => {
    const action = assignmentAction(form, initial);
    if (action === "assign") await API.put(`${TENANTS_URL}/${tenantId}/aliado`, assignmentPayload(form));
    if (action === "end") await API.post(`${TENANTS_URL}/${tenantId}/aliado/end`, {});
    return action;
  };

  const fetchModules = async () => {
    try {
      const res = await API.get(MODULES_URL);
      setAvailableModules(res.data?.data || []);
      setModuleCatalog({
        modules: res.data?.data || [],
        packages: res.data?.packages || [],
        dependencies: res.data?.dependencies || {},
        regulated_required: res.data?.regulated_required || [],
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchModules();
    fetchAliados();
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
    setCreateAliadoForm(emptyAssignmentForm());
    setDbNameEdited(false);
    setDialogOpen(true);
  };

  // ?nueva=1 llega del atajo Alt+N del panel: abre "Nueva Empresa" y limpia
  // el parámetro para que recargar la página no la vuelva a abrir.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("nueva") !== "1") return;
    handleOpenCreate();
    setSearchParams(
      (prev) => {
        prev.delete("nueva");
        return prev;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  // Solo prellena/desmarca los checkboxes al ELEGIR el tipo en el diálogo de
  // creación — el superadmin puede volver a marcarlos manualmente después.
  // No se replica este efecto en "Editar Empresa" (más abajo) a propósito:
  // reclasificar un tenant ya existente no debe pisar módulos ya elegidos.
  // Módulos por defecto: sin los exclusivos de IMF si es persona natural /
  // prestamista. Estar o no normada no cambia los módulos.
  // Solo ajusta los módulos si la empresa va en el paquete completo (IMF
  // regulada); en un paquete menor esos módulos ya no vienen.
  const presetModules = (regulatoryType, prev) => {
    if (prev.module_package !== "IMF_REGULADA") return prev.enabled_modules;
    const base = applyPackage("IMF_REGULADA", moduleCatalog);
    const modules = regulatoryType === "PERSONA_NATURAL_PRESTAMISTA"
      ? effectiveModules(base, moduleCatalog).filter((k) => !IMF_ONLY_MODULE_KEYS.includes(k))
      : base;
    return withRegulatedModules(modules, prev.conami_regulated);
  };

  // Una empresa normada debe tener los módulos regulatorios: al marcarla se
  // agregan solos (con sus dependencias).
  const withRegulatedModules = (modules, regulated) => {
    if (!regulated) return modules;
    const next = withDependencies(modules, moduleCatalog, { conamiRegulated: true });
    return next.length === moduleCatalog.modules.length ? null : next;
  };

  const handleRegulatoryTypeChange = (e) => {
    const value = e.target.value;
    setForm((prev) => ({
      ...prev,
      regulatory_type: value,
      // Persona natural / prestamista cobra interés flat; IMF, sobre saldo.
      interest_type: value === "PERSONA_NATURAL_PRESTAMISTA" ? "FLAT" : "COMPOUND",
      enabled_modules: presetModules(value, prev),
    }));
  };

  const handleRegulatedChange = (e) => {
    const regulated = e.target.value === "1";
    setForm((prev) => ({ ...prev, conami_regulated: regulated, enabled_modules: withRegulatedModules(prev.enabled_modules, regulated) }));
  };

  const handleModulesChange = ({ module_package, enabled_modules }) => {
    setForm((prev) => ({ ...prev, module_package, enabled_modules }));
  };

  const handleOpenEdit = (row) => {
    setEditTenant(row);
    setEditForm({
      legal_name: row.legal_name || "",
      commercial_name: row.commercial_name || "",
      tax_id: row.tax_id || "",
      plan_code: row.plan_code || "",
      max_web_users: row.max_web_users ?? "",
      max_app_users: row.max_app_users ?? "",
      max_branches: row.max_branches ?? "",
      phone: row.phone || "",
      email: row.email || "",
      address: row.address || "",
      module_package: row.module_package || "IMF_REGULADA",
      enabled_modules: row.enabled_modules ?? null,
      accounting_since: row.accounting_since || "",
      regulatory_type: row.regulatory_type || "IMF_REGULADA",
      conami_regulated: row.conami_regulated === undefined || row.conami_regulated === null ? true : !!row.conami_regulated,
      interest_type: row.interest_type || "COMPOUND",
    });
    setEditAliadoForm(emptyAssignmentForm());
    setEditAliadoInitial(emptyAssignmentForm());
    setEditAliadoHistory([]);
    setEditDialogOpen(true);
    setEditUserUsage(null);
    API.get(`${TENANTS_URL}/${row.id}/user-usage`)
      .then((res) => setEditUserUsage(res.data?.data || null))
      .catch(() => setEditUserUsage(null));
    if (!aliadosUnavailable) {
      API.get(`${TENANTS_URL}/${row.id}/aliado`)
        .then((res) => {
          const data = res.data?.data || {};
          if (data.available === false) return setAliadosUnavailable(true);
          const initial = data.current ? assignmentFormFromCurrent(data.current) : { ...emptyAssignmentForm(), start_date: "" };
          setEditAliadoForm(data.current ? initial : emptyAssignmentForm());
          setEditAliadoInitial(initial);
          setEditAliadoHistory(data.history || []);
        })
        .catch((error) => showAlert(error.response?.data?.message || "No se pudo cargar el aliado de la empresa", "error"));
    }
  };

  const handleEditFieldChange = (field) => (e) => {
    const value = e.target.value;
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditModulesChange = ({ module_package, enabled_modules }) => {
    setEditForm((prev) => ({ ...prev, module_package, enabled_modules }));
  };

  // ¿La empresa empieza a llevar contabilidad con este cambio? (sube de
  // paquete): se pide la fecha de corte contable.
  const editStartsAccounting =
    !!editTenant &&
    !!editForm &&
    !effectiveModules(editTenant.enabled_modules ?? null, moduleCatalog).includes("accounting") &&
    effectiveModules(editForm.enabled_modules, moduleCatalog).includes("accounting");

  const handleSubmitEdit = async () => {
    if (!editTenant || !editForm) return;
    if (!editForm.legal_name.trim()) {
      showAlert("La razón social no puede estar vacía", "error");
      return;
    }
    try {
      setSavingEdit(true);
      const { accounting_since: accountingSince, ...payload } = editForm;
      await API.put(`${TENANTS_URL}/${editTenant.id}`, {
        ...payload,
        ...(editStartsAccounting && accountingSince ? { accounting_since: accountingSince } : {}),
      });
      try {
        await saveTenantAliado(editTenant.id, editAliadoForm, editAliadoInitial);
      } catch (error) {
        // La empresa ya se guardó: el diálogo queda abierto para corregir el aliado.
        showAlert(`Empresa guardada, pero el aliado no: ${error.response?.data?.message || error.message}`, "error");
        await fetchAliados();
        return;
      }
      showAlert(`Empresa "${editForm.legal_name}" actualizada`);
      setEditDialogOpen(false);
      await Promise.all([fetchTenants(), fetchAliados()]);
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
        implementation_fee: data.implementation_fee ?? "",
      });
      setPaymentForm({
        amount: "",
        currency: data.currency || "NIO",
        payment_date: new Date().toISOString().slice(0, 10),
        concept: "MENSUALIDAD",
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
        implementation_fee: billingConfigForm.implementation_fee === "" ? null : Number(billingConfigForm.implementation_fee),
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
      const res = await API.post(`${TENANTS_URL}/${billingTenant.id}/billing/payments`, paymentForm);
      const commission = res.data?.data?.aliado_commission;
      showAlert(
        commission
          ? `Pago registrado. Comisión del aliado: ${money(commission.amount, commission.currency)}`
          : "Pago registrado correctamente",
      );
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

      let aliadoError = null;
      if (tenantId && createAliadoForm.aliado_id) {
        try {
          await saveTenantAliado(tenantId, createAliadoForm, emptyAssignmentForm());
        } catch (error) {
          aliadoError = error.response?.data?.message || error.message;
        }
      }

      if (aliadoError) {
        showAlert(`Empresa creada, pero el aliado no se asignó (${aliadoError}). Asígnelo desde Editar.`, "warning");
      } else {
        showAlert("Empresa creada, aprovisionando en segundo plano…");
      }
      fetchAliados();
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
      field: "user_quotas",
      headerName: "Usuarios web / app",
      width: 150,
      sortable: false,
      valueGetter: (params) => `${formatQuota(params.row.max_web_users)} / ${formatQuota(params.row.max_app_users)}`,
    },
    {
      field: "module_package",
      headerName: "Paquete",
      width: 160,
      renderCell: (params) => {
        const pkg = moduleCatalog.packages.find((p) => p.key === params.value);
        return <Chip size="small" variant="outlined" label={pkg?.label || params.value || "IMF regulada"} />;
      },
    },
    {
      field: "conami_regulated",
      headerName: "CONAMI",
      width: 120,
      renderCell: (params) =>
        params.value === 0 || params.value === false ? (
          <Chip size="small" variant="outlined" label="No normada" />
        ) : (
          <Chip size="small" color="primary" variant="outlined" label="Normada" />
        ),
    },
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
      field: "aliado",
      headerName: "Aliado",
      width: 160,
      sortable: false,
      valueGetter: (params) => aliadoByTenant[params.row.id] || "",
      renderCell: (params) => params.value || <Typography variant="caption" color="text.secondary">—</Typography>,
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
      <SanctionsFeedSyncPanel />
      <ConamiIndicatorsPanel />

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid var(--cm-border, #E5E7EB)", background: "var(--cm-paper, #fff)" }}>
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
            rowsPerPageOptions={[10, 25, 50]}
            initialState={{ pagination: { pageSize: 25, page: 0 } }}
            disableSelectionOnClick
            sx={{
              border: "1px solid var(--cm-border, #E5E7EB)",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "var(--cm-surface, #F8FAFC)", fontWeight: 700 },
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
              <TextField label="Usuarios web" type="number" fullWidth size="small" value={form.max_web_users} onChange={handleFieldChange("max_web_users")} inputProps={{ min: 0 }} helperText="Vacío = sin límite" />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField label="Usuarios app móvil" type="number" fullWidth size="small" value={form.max_app_users} onChange={handleFieldChange("max_app_users")} inputProps={{ min: 0 }} helperText="Vacío = sin límite" />
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
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Tipo de entidad regulatoria"
                fullWidth
                size="small"
                value={form.regulatory_type}
                onChange={handleRegulatoryTypeChange}
                helperText="Determina qué reportes CONAMI vienen habilitados por defecto"
              >
                {REGULATORY_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="¿Normada por la CONAMI?"
                fullWidth
                size="small"
                value={form.conami_regulated ? "1" : "0"}
                onChange={handleRegulatedChange}
                helperText={form.conami_regulated
                  ? "Usa los valores de las normas; no se pueden editar. Después no podrá pasar a no normada."
                  : "Podrá editar los parámetros de las normas (p. ej. provisiones); el interés se reconoce al cobrarse"}
              >
                {REGULATED_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                label="Tipo de interés"
                fullWidth
                size="small"
                value={form.interest_type}
                onChange={handleFieldChange("interest_type")}
                helperText="Aplica a todos los créditos de la empresa. No se puede cambiar después."
              >
                {INTEREST_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
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
              <ProvinceSelect
                endpoint={PROVINCES_CATALOG_URL}
                name="branch_province_id"
                label="Provincia"
                value={form.branch_province_id}
                onChange={handleFieldChange("branch_province_id")}
              />
            </Grid>
            <Grid item xs={6} md={4}>
              <MunicipalitySelect
                endpoint={MUNICIPALITIES_CATALOG_URL}
                name="branch_municipality_id"
                label="Municipio (opcional)"
                provinceId={form.branch_province_id}
                value={form.branch_municipality_id}
                onChange={handleFieldChange("branch_municipality_id")}
              />
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
            Aliado que trajo la empresa
          </Typography>
          <TenantAliadoFields
            value={createAliadoForm}
            onChange={setCreateAliadoForm}
            aliados={aliadosCatalog}
            unavailable={aliadosUnavailable}
            disabled={saving}
          />

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
            Paquete y módulos
          </Typography>
          <ModulePackagePicker
            catalog={moduleCatalog}
            modulePackage={form.module_package}
            enabledModules={form.enabled_modules}
            conamiRegulated={form.conami_regulated}
            onChange={handleModulesChange}
          />
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
                {[
                  ["max_web_users", "Usuarios web", "web"],
                  ["max_app_users", "Usuarios app móvil", "app"],
                ].map(([field, label, channel]) => (
                  <Grid item xs={6} md={2} key={field}>
                    <TextField
                      label={label}
                      type="number"
                      fullWidth
                      size="small"
                      value={editForm[field]}
                      onChange={handleEditFieldChange(field)}
                      inputProps={{ min: 0 }}
                      helperText={editUserUsage?.enabled ? `En uso: ${editUserUsage[channel].used} · vacío = sin límite` : "Vacío = sin límite"}
                    />
                  </Grid>
                ))}
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
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="Tipo de entidad regulatoria"
                    fullWidth
                    size="small"
                    value={editForm.regulatory_type}
                    onChange={handleEditFieldChange("regulatory_type")}
                    helperText="Cambiarlo no toca los módulos ya configurados abajo"
                  >
                    {REGULATORY_TYPE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label="¿Normada por la CONAMI?"
                    fullWidth
                    size="small"
                    value={editForm.conami_regulated ? "1" : "0"}
                    onChange={(e) => {
                      const regulated = e.target.value === "1";
                      setEditForm((prev) => ({
                        ...prev,
                        conami_regulated: regulated,
                        enabled_modules: withRegulatedModules(prev.enabled_modules, regulated),
                      }));
                    }}
                    // Una normada no pasa a no normada (el backend también lo rechaza):
                    // ya contabilizó su interés al devengarse.
                    disabled={editTenant?.conami_regulated === undefined || editTenant?.conami_regulated === null || !!editTenant?.conami_regulated}
                    helperText={editForm.conami_regulated
                      ? "Parámetros de las normas sin editar. Una empresa normada no puede pasar a no normada."
                      : "Parámetros editables; el interés se reconoce al cobrarse"}
                  >
                    {REGULATED_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Tipo de interés"
                    fullWidth
                    size="small"
                    value={interestTypeLabel(editForm.interest_type)}
                    InputProps={{ readOnly: true }}
                    helperText="Se fija al crear la empresa; no se puede cambiar"
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                Paquete y módulos
              </Typography>
              {editTenant?.accounting_since && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Contabiliza desde {editTenant.accounting_since} (fecha de corte).
                </Typography>
              )}
              <ModulePackagePicker
                catalog={moduleCatalog}
                modulePackage={editForm.module_package}
                enabledModules={editForm.enabled_modules}
                conamiRegulated={editForm.conami_regulated}
                onChange={handleEditModulesChange}
                accountingCutover={
                  editStartsAccounting
                    ? {
                        value: editForm.accounting_since || new Date().toISOString().slice(0, 10),
                        onChange: (value) => setEditForm((prev) => ({ ...prev, accounting_since: value })),
                      }
                    : null
                }
              />

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                Aliado que trajo la empresa
              </Typography>
              <TenantAliadoFields
                value={editAliadoForm}
                onChange={setEditAliadoForm}
                aliados={aliadosCatalog}
                history={editAliadoHistory}
                unavailable={aliadosUnavailable}
                disabled={savingEdit}
              />
              {editAliadoInitial.aliado_id && !editAliadoForm.aliado_id && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Al guardar, la empresa deja de generar comisión para su aliado actual (la asignación termina hoy).
                </Alert>
              )}

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" fontWeight={800}>
                Verificación en dos pasos
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Se guarda por separado con "Guardar política"; no depende del botón "Guardar cambios".
              </Typography>
              {editTenant && <TenantMfaPolicySection key={editTenant.id} tenantId={editTenant.id} />}
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
                  {billingData.suspended_at ? ` (${new Date(`${String(billingData.suspended_at).replace(" ", "T")}Z`).toLocaleString("es-NI")})` : ""}
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
                    label="Monto de implementación"
                    type="number"
                    fullWidth
                    size="small"
                    value={billingConfigForm.implementation_fee}
                    onChange={(e) => setBillingConfigForm((f) => ({ ...f, implementation_fee: e.target.value }))}
                    helperText="Base de la comisión fija de implementación"
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
                    select
                    label="Concepto"
                    fullWidth
                    size="small"
                    value={paymentForm.concept}
                    onChange={(e) => setPaymentForm((f) => ({ ...f, concept: e.target.value }))}
                  >
                    {PAYMENT_CONCEPT_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </TextField>
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
                  Último recordatorio enviado: {new Date(`${String(billingData.last_reminder_sent_at).replace(" ", "T")}Z`).toLocaleString("es-NI")}
                </Typography>
              )}

              <Divider />

              <Typography variant="subtitle2" fontWeight={800}>Historial de pagos</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Concepto</TableCell>
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
                        <TableCell>{conceptLabel(p.concept || "MENSUALIDAD")}</TableCell>
                        <TableCell>{p.currency} {Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell>{p.reference || "—"}</TableCell>
                        <TableCell>{p.notes || "—"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">Sin pagos registrados</TableCell>
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
