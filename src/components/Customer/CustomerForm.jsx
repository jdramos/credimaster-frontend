import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Tabs,
  Tab,
  Box,
  Alert,
  Snackbar,
  Button,
  Paper,
  Stack,
  Chip,
  Divider,
  Container,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ToastContainer, toast } from "react-toastify";
import dayjs from "dayjs";

import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import GroupsIcon from "@mui/icons-material/Groups";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import DescriptionIcon from "@mui/icons-material/Description";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import GeneralInfoTab from "./CustomerGeneralInfoTab";
import GuaranteesTab from "./CustomerGuaranteesTab";

import CustomerBusinessTab from "./CustomerBusinessTab";
import CustomerReferencesTab from "./CustomerReferencesTab";
import CustomerChecklist from "./CustomerCheckList";
import CustomerFinancialEvaluationTab from "./CustomerFinancialEvaluationTab";
import ConfirmDialog from "../ConfirmDialog";

const url = process.env.REACT_APP_API_BASE_URL + "/api/customers";
const token = process.env.REACT_APP_API_TOKEN;

const TabPanel = ({ children, value, index }) => (
  <Box
    role="tabpanel"
    sx={{
      display: value === index ? "block" : "none",
    }}
  >
    {children}
  </Box>
);

const toIsoDateOrNull = (v) => {
  if (!v) return null;
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
};

const applyServerErrorsToForm = (serverErrors, setErrors) => {
  const out = {};

  if (Array.isArray(serverErrors)) {
    serverErrors.forEach((e) => {
      const field = String(e.field || "").replace(/^customer\./, "");
      const msg = e.message || "Error";

      if (field) out[field] = msg;
      toast.error(msg);
    });
  }

  setErrors((prev) => ({ ...prev, ...out }));
};

const normalizeCustomerForApi = (customer, isEmployee) => ({
  ...customer,
  economic_activity: isEmployee ? 2 : 1,
  birth_date: toIsoDateOrNull(customer.birth_date),
  identity_issue_date: toIsoDateOrNull(customer.identity_issue_date),
  identity_expiration_date: toIsoDateOrNull(customer.identity_expiration_date),
  job_start_day: toIsoDateOrNull(customer.job_start_day),
  business_license_issued: toIsoDateOrNull(customer.business_license_issued),
  business_license_expiry: toIsoDateOrNull(customer.business_license_expiry),
});

const CustomerForm = () => {
  const [activeTab, setActiveTab] = useState(0);

  const [guarantees, setGuarantees] = useState([
    { article: "", series: "", brand: "", value: 0 },
  ]);

  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ alertType: "", alertMessage: "" });
  const [alertState, setAlertState] = useState({ open: false });
  const [openDialog, setOpenDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);

  const generalInfoRef = useRef(null);
  const guaranteesRef = useRef(null);

  const businessRef = useRef(null);
  const referencesRef = useRef(null);

  const navigate = useNavigate();
  const { customerId } = useParams();
  const location = useLocation();

  const mode = useMemo(() => {
    if (!customerId) return "add";
    if (location.pathname.includes("/ver/")) return "show";
    return "edit";
  }, [customerId, location.pathname]);

  const [internalMode, setInternalMode] = useState(mode);
  const [loading, setLoading] = useState(mode !== "add");
  const [isEmployee, setIsEmployee] = useState(null);
  const [notRequiredFields, setNotRequiredFields] = useState([]);

  useEffect(() => setInternalMode(mode), [mode]);

  const [customer, setCustomer] = useState({
    age: 1,
    annual_salary: 0,
    birth_country_id: "",
    birth_date: dayjs(),
    branch_id: "",

    business_address: "",
    business_name: "",
    business_telephone: "",
    business_type_id: "",
    business_inventory: 0.0,
    business_monthly_income: 0.0,
    business_annual_income: 0.0,
    business_license_entity: "",
    business_license_issued: null,
    business_license_expiry: null,
    business_receivables: 0.0,

    cash_amount: 0.0,
    cash_sales: 0.0,
    cellphone: "",
    company: "",
    credit_sales: 0.0,
    customer_code: "",
    customer_name: "",

    economic_activity: "",
    conami_id_actividad_economica: "",

    funds_source: "",
    genre_id: "",

    home_address: "",
    home_status: "",
    identification: "",

    identity_expiration_date: dayjs(),
    identity_issue_country: "",
    identity_issue_date: dayjs(),
    identity_type: "",

    income_usd: 0,
    job_start_day: null,
    job_telephone: "",

    marital_status_id: "",

    monthly_salary: 0,
    nationality_id: "",
    occupation: "",
    other_incomes: 0.0,

    province_id: "",
    municipality_id: "",
    public_name: "",
    residence_country_id: "",

    reference_name: "",
    reference_identity: "",
    reference_address: "",
    reference_workplace: "",
    reference_telephone: "",
    reference_relationship: "",
    reference_known_time: "",

    reference2_name: "",
    reference2_identity: "",
    reference2_address: "",
    reference2_workplace: "",
    reference2_telephone: "",
    reference2_relationship: "",
    reference2_known_time: "",

    spouse_address: "",
    spouse_name: "",
    spouse_telephone: "",
    spouse_position: "",
    spouse_job_company: "",
    spouse_job_telephone: "",
    spouse_job_salary: 0,

    telephone: "",
  });

  const [financialEvaluation, setFinancialEvaluation] = useState({
    evaluation_date: dayjs().format("YYYY-MM-DD"),
    methodology: "INDIVIDUAL",

    business_income: "",
    salary_income: "",
    other_income: "",

    business_expenses: "",
    family_expenses: "",
    other_debts_installments: "",

    proposed_installment: "",

    years_in_business: "",
    monthly_sales: "",
    inventory_value: "",
    business_location: "",

    references_result: "FAVORABLE",
    bureau_result: "NO_APLICA",

    analyst_comment: "",
    committee_comment: "",
  });

  const cleanedGuarantees = useMemo(
    () =>
      guarantees.map((g) => ({
        ...g,
        value:
          typeof g.value === "string"
            ? parseFloat(g.value.replace(/[^0-9.]/g, "")) || 0
            : Number(g.value || 0),
      })),
    [guarantees],
  );

  useEffect(() => {
    if (mode !== "edit" && mode !== "show") return;

    setLoading(true);

    fetch(`${url}/${customerId}`, { headers: { Authorization: token } })
      .then((r) => r.json())
      .then((data) => {
        const payload = data?.data ?? data ?? {};
        const c = payload.customer ?? payload ?? {};
        const g = payload.guarantees ?? [];

        setCustomer((prev) => ({
          ...prev,
          ...c,
          birth_date: c.birth_date ? dayjs(c.birth_date) : prev.birth_date,
          identity_issue_date: c.identity_issue_date
            ? dayjs(c.identity_issue_date)
            : prev.identity_issue_date,
          identity_expiration_date: c.identity_expiration_date
            ? dayjs(c.identity_expiration_date)
            : prev.identity_expiration_date,
          job_start_day: c.job_start_day ? dayjs(c.job_start_day) : null,
          business_license_issued: c.business_license_issued
            ? dayjs(c.business_license_issued)
            : null,
          business_license_expiry: c.business_license_expiry
            ? dayjs(c.business_license_expiry)
            : null,
        }));

        setIsEmployee(Number(c.economic_activity) === 2);

        const cleaned = (Array.isArray(g) ? g : []).map((guar) => ({
          ...guar,
          value:
            typeof guar.value === "string"
              ? parseFloat(guar.value.replace(/[^0-9.]/g, "")) || 0
              : Number(guar.value || 0),
        }));

        setGuarantees(
          cleaned.length
            ? cleaned
            : [{ article: "", series: "", brand: "", value: 0 }],
        );
      })
      .catch((err) => {
        console.error("Error cargando datos:", err);
        toast.error("Error cargando cliente");
      })
      .finally(() => setLoading(false));
  }, [mode, customerId]);

  const normalizeValidate = (result) => {
    if (typeof result === "boolean") return { ok: result, errors: {} };

    if (result && typeof result === "object") {
      return {
        ok: result.ok ?? result.valid ?? true,
        errors: result.errors ?? {},
      };
    }

    return { ok: true, errors: {} };
  };

  const cleanErrors = (errs) => {
    const out = {};

    for (const [k, v] of Object.entries(errs || {})) {
      if (v === null || v === undefined) continue;
      if (typeof v === "string" && v.trim() === "") continue;
      out[k] = v;
    }

    return out;
  };

  const focusFirstError = (field) => {
    const byName = document.querySelector(`[name="${field}"]`);

    if (byName?.focus) {
      byName.scrollIntoView({ behavior: "smooth", block: "center" });
      byName.focus();
      return;
    }

    const byId = document.getElementById(field);

    if (byId?.focus) {
      byId.scrollIntoView({ behavior: "smooth", block: "center" });
      byId.focus();
    }
  };

  const TAB_BY_FIELD = {
    customer_name: 0,
    public_name: 0,
    genre_id: 0,
    identity_type: 0,
    identification: 0,
    identity_issue_date: 0,
    identity_expiration_date: 0,
    identity_issue_country: 0,
    home_address: 0,
    residence_country_id: 0,
    province_id: 0,
    municipality_id: 0,
    marital_status_id: 0,
    birth_country_id: 0,
    birth_date: 0,
    nationality_id: 0,
    cellphone: 0,
    spouse_name: 0,
    spouse_telephone: 0,
    spouse_position: 0,

    economic_activity: 1,
    conami_id_actividad_economica: 1,
    occupation: 1,
    company: 1,
    job_start_day: 1,
    monthly_salary: 1,
    business_name: 1,
    business_type_id: 1,
    business_address: 1,
    business_telephone: 1,
    business_inventory: 1,
    business_receivables: 1,
    business_monthly_income: 1,

    guarantees: 2,
    article: 2,
    series: 2,
    brand: 2,
    value: 2,

    reference_name: 3,
    reference_identity: 3,
    reference_address: 3,
    reference_workplace: 3,
    reference_telephone: 3,
    reference_relationship: 3,
    reference_known_time: 3,
    reference2_name: 3,
    reference2_identity: 3,
    reference2_address: 3,
    reference2_workplace: 3,
    reference2_telephone: 3,
    reference2_relationship: 3,
    reference2_known_time: 3,
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const vGeneral = normalizeValidate(generalInfoRef.current?.validate?.());
    const vBusiness = normalizeValidate(businessRef.current?.validate?.());
    const vGuarantees = normalizeValidate(guaranteesRef.current?.validate?.());
    const vReferences = normalizeValidate(referencesRef.current?.validate?.());

    const mergedErrors = cleanErrors({
      ...vGeneral.errors,
      ...vBusiness.errors,
      ...vGuarantees.errors,
      ...vReferences.errors,
    });

    setErrors(mergedErrors);

    if (Object.keys(mergedErrors).length > 0) {
      const firstField = Object.keys(mergedErrors)[0];
      const tab = TAB_BY_FIELD[firstField] ?? 0;

      setActiveTab(tab);
      toast.error("Corrija los errores antes de continuar.");

      setTimeout(() => focusFirstError(firstField), 150);
      return;
    }

    setOpenDialog(true);
    setCancelDialog(false);
  };

  const addCustomer = async () => {
    setAlertState({ open: true });

    const payloadCustomer = normalizeCustomerForApi(
      customer,
      Boolean(isEmployee),
    );

    try {
      const response = await fetch(
        mode === "edit" ? `${url}/${customerId}` : url,
        {
          method: mode === "edit" ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json; charset=UTF-8",
            Authorization: token,
          },
          body: JSON.stringify({
            customer: payloadCustomer,
            guarantees: cleanedGuarantees,
            financial_evaluation: financialEvaluation,
          }),
        },
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        applyServerErrorsToForm(result?.errors, setErrors);

        setAlert({
          alertType: "error",
          alertMessage: result?.message || "Error al guardar",
        });

        return;
      }

      setAlert({
        alertType: "success",
        alertMessage: "Registro guardado exitosamente",
      });

      setTimeout(() => navigate("/clientes"), 800);
    } catch (error) {
      setAlert({
        alertType: "error",
        alertMessage: "Error de red: " + error.message,
      });

      toast.error("Error de red");
    } finally {
      setOpenDialog(false);
      setAlertState({ open: false });
    }
  };

  const handleDialogConfirmation = () => {
    setOpenDialog(false);

    if (cancelDialog) {
      navigate("/clientes");
      return;
    }

    addCustomer();
  };

  const clearFields = (obj, fields, emptyValue = "") => {
    const next = { ...obj };

    fields.forEach((f) => {
      if (f in next) {
        if (typeof next[f] === "number") next[f] = 0;
        else if (dayjs.isDayjs(next[f])) next[f] = null;
        else next[f] = emptyValue;
      }
    });

    return next;
  };

  const clearErrors = (prevErrors, fields) => {
    const next = { ...prevErrors };

    fields.forEach((f) => {
      if (f in next) delete next[f];
    });

    return next;
  };

  const BUSINESS_FIELDS = [
    "business_address",
    "business_name",
    "business_telephone",
    "business_type_id",
    "business_inventory",
    "business_monthly_income",
    "business_annual_income",
    "business_receivables",
    "credit_sales",
    "cash_amount",
    "cash_sales",
    "other_incomes",
    "business_license_entity",
    "business_license_issued",
    "business_license_expiry",
  ];

  const EMPLOYEE_FIELDS = [
    "occupation",
    "company",
    "job_start_day",
    "monthly_salary",
    "annual_salary",
    "job_telephone",
  ];

  useEffect(() => {
    const ea = Number(customer.economic_activity);

    if (![1, 2].includes(ea)) return;

    const employee = ea === 2;

    setIsEmployee(employee);

    setCustomer((prev) => {
      const next = employee
        ? clearFields(prev, BUSINESS_FIELDS)
        : clearFields(prev, EMPLOYEE_FIELDS);

      if (!employee) {
        const m = Number(next.business_monthly_income || 0);
        next.business_annual_income = m * 12;
      } else {
        const s = Number(next.monthly_salary || 0);
        next.annual_salary = s * 12;
      }

      return next;
    });

    setErrors((prevErr) =>
      employee
        ? clearErrors(prevErr, BUSINESS_FIELDS)
        : clearErrors(prevErr, EMPLOYEE_FIELDS),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.economic_activity]);

  const getTabStatus = (tabIndex) => {
    const employee = Number(customer.economic_activity) === 2;

    const tabFields = {
      0: [
        "customer_name",
        "public_name",
        "genre_id",
        "identity_type",
        "identification",
        "identity_issue_date",
        "identity_expiration_date",
        "identity_issue_country",
        "home_address",
        "residence_country_id",
        "province_id",
        "municipality_id",
        "marital_status_id",
        "birth_country_id",
        "birth_date",
        "nationality_id",
        "cellphone",
      ],
      1: employee
        ? [
            "economic_activity",
            "conami_id_actividad_economica",
            "occupation",
            "company",
            "job_start_day",
            "monthly_salary",
          ]
        : [
            "economic_activity",
            "conami_id_actividad_economica",
            "business_name",
            "business_type_id",
            "business_address",
            "business_inventory",
            "business_receivables",
            "business_monthly_income",
          ],
      2: ["guarantees", "article", "series", "brand", "value"],
      3: [
        "reference_name",
        "reference_address",
        "reference_telephone",
        "reference_known_time",
        "reference_relationship",
        "reference2_name",
        "reference2_address",
        "reference2_telephone",
        "reference2_known_time",
        "reference2_relationship",
      ],
      4: [],
      5: [],
    };

    const fields = tabFields[tabIndex] || [];
    const hasErrors = fields.some((field) => Boolean(errors[field]));

    if (hasErrors) return "error";

    if (tabIndex === 2) {
      const hasGuarantees = guarantees.some(
        (g) => String(g.article || "").trim() || Number(g.value || 0) > 0,
      );

      return hasGuarantees ? "complete" : "pending";
    }

    if (tabIndex === 4 || tabIndex === 5) {
      return customer?.id ? "complete" : "pending";
    }

    const hasValues = fields.some((field) => {
      const value = customer[field];

      return (
        value !== null &&
        value !== undefined &&
        value !== "" &&
        !(typeof value === "number" && Number.isNaN(value))
      );
    });

    return hasValues ? "complete" : "pending";
  };

  const getTabIcon = (tabIndex, defaultIcon) => {
    const status = getTabStatus(tabIndex);

    if (status === "error") {
      return <ErrorIcon color="error" fontSize="small" />;
    }

    if (status === "complete") {
      return <CheckCircleIcon color="success" fontSize="small" />;
    }

    return defaultIcon || <RadioButtonUncheckedIcon fontSize="small" />;
  };

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
        <Typography variant="body1" mt={1}>
          Cargando información del cliente...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box
          sx={{
            px: { xs: 2, md: 3 },
            py: 1.5,
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.12,
              )}, ${alpha(theme.palette.primary.light, 0.04)})`,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Stack spacing={0.4}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
              >
                <Typography variant="h5" fontWeight={900}>
                  {internalMode === "edit"
                    ? "Editar cliente"
                    : internalMode === "show"
                      ? "Ficha del cliente"
                      : "Nuevo cliente"}
                </Typography>

                <Chip
                  size="small"
                  label={
                    internalMode === "edit"
                      ? "Edición"
                      : internalMode === "show"
                        ? "Solo lectura"
                        : "Registro nuevo"
                  }
                  color={
                    internalMode === "edit"
                      ? "warning"
                      : internalMode === "show"
                        ? "info"
                        : "success"
                  }
                  sx={{ fontWeight: 700 }}
                />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                {customer?.id
                  ? `Código ${customer.id} · ${customer.customer_name || "Cliente sin nombre"}`
                  : "Complete la información requerida para registrar el cliente."}
              </Typography>

              {customer?.identification && (
                <Typography variant="caption" color="text.secondary">
                  Identificación: {customer.identification}
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={1}>
              {internalMode === "show" && (
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => setInternalMode("edit")}
                  sx={{ borderRadius: 2, fontWeight: 800 }}
                >
                  Editar
                </Button>
              )}

              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/clientes")}
                sx={{ borderRadius: 2, fontWeight: 800 }}
              >
                Volver
              </Button>
            </Stack>
          </Stack>
        </Box>

        <form onSubmit={handleSubmit}>
          <Box
            sx={{
              px: { xs: 1, md: 2 },
              pt: 0.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 52,
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 800,
                  minHeight: 52,
                  px: 2,
                },
              }}
            >
              <Tab
                icon={getTabIcon(0, <PersonIcon fontSize="small" />)}
                iconPosition="start"
                label="Datos generales"
              />
              <Tab
                icon={getTabIcon(1, <BusinessIcon fontSize="small" />)}
                iconPosition="start"
                label="Actividad económica"
              />
              <Tab
                icon={getTabIcon(2, <VerifiedUserIcon fontSize="small" />)}
                iconPosition="start"
                label="Garantías"
              />
              <Tab
                icon={getTabIcon(3, <GroupsIcon fontSize="small" />)}
                iconPosition="start"
                label="Referencias"
              />

              <Tab
                icon={getTabIcon(
                  4,
                  <AccountBalanceWalletIcon fontSize="small" />,
                )}
                iconPosition="start"
                label="Evaluación financiera"
              />
              <Tab
                icon={getTabIcon(5, <DescriptionIcon fontSize="small" />)}
                iconPosition="start"
                label="Documentos"
              />
            </Tabs>
          </Box>

          <Box sx={{ p: { xs: 1.5, md: 2 }, bgcolor: "background.paper" }}>
            <TabPanel value={activeTab} index={0}>
              <GeneralInfoTab
                ref={generalInfoRef}
                customer={customer}
                setCustomer={setCustomer}
                errors={errors}
                setErrors={setErrors}
                isEmployee={isEmployee}
                setIsEmployee={setIsEmployee}
                notRequiredFields={notRequiredFields}
                setNotRequiredFields={setNotRequiredFields}
                mode={internalMode}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <CustomerBusinessTab
                ref={businessRef}
                customer={customer}
                setCustomer={setCustomer}
                errors={errors}
                setErrors={setErrors}
                isEmployee={isEmployee}
                setIsEmployee={setIsEmployee}
                notRequiredFields={notRequiredFields}
                setNotRequiredFields={setNotRequiredFields}
                mode={internalMode}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <GuaranteesTab
                ref={guaranteesRef}
                guarantees={guarantees}
                setGuarantees={setGuarantees}
                mode={internalMode}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <CustomerReferencesTab
                ref={referencesRef}
                customer={customer}
                setCustomer={setCustomer}
                errors={errors}
                setErrors={setErrors}
                mode={internalMode}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={4}>
              <CustomerFinancialEvaluationTab
                form={financialEvaluation}
                setForm={setFinancialEvaluation}
                customerId={customer.id}
                customerName={customer.customer_name}
                customerIdentification={customer.identification}
                readOnly={internalMode === "show"}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={5}>
              <CustomerChecklist
                customerId={customer.id}
                customerName={customer.customer_name}
                readOnly={internalMode === "show"}
              />
            </TabPanel>
          </Box>

          <Divider />

          <Box
            sx={{
              px: { xs: 2, md: 3 },
              py: 1.5,
              bgcolor: "background.default",
              position: "sticky",
              bottom: 0,
              zIndex: 5,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack direction="row" justifyContent="flex-end" spacing={1.2}>
              <Tooltip title="Cancelar y volver al listado">
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<CloseIcon />}
                  onClick={() => {
                    setCancelDialog(true);
                    setOpenDialog(true);
                  }}
                  sx={{ borderRadius: 2, fontWeight: 800 }}
                >
                  Cancelar
                </Button>
              </Tooltip>

              {internalMode !== "show" && (
                <Button
                  variant="contained"
                  type="submit"
                  startIcon={<SaveIcon />}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 900,
                    px: 3,
                    boxShadow: 2,
                  }}
                >
                  Guardar cliente
                </Button>
              )}
            </Stack>
          </Box>
        </form>
      </Paper>

      <ToastContainer />

      <Snackbar open={alertState.open} autoHideDuration={3000}>
        <Alert severity={alert.alertType || "info"}>{alert.alertMessage}</Alert>
      </Snackbar>

      <ConfirmDialog
        open={openDialog}
        type={cancelDialog ? "error" : "warning"}
        title={cancelDialog ? "Cancelar operación" : "Confirmar guardado"}
        message={
          cancelDialog
            ? "¿Está seguro que desea cancelar? Los cambios no guardados se perderán."
            : "¿Está seguro que desea guardar la información del cliente?"
        }
        confirmText={cancelDialog ? "Sí, cancelar" : "Sí, guardar"}
        cancelText="No"
        onConfirm={handleDialogConfirmation}
        onClose={() => {
          setOpenDialog(false);
          setCancelDialog(false);
        }}
      />
    </Container>
  );
};

export default CustomerForm;
