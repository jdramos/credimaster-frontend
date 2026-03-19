import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Tabs, Tab, Box, Alert, Snackbar, Button } from "@mui/material";
import { ToastContainer, toast } from "react-toastify";
import GeneralInfoTab from "./CustomerGeneralInfoTab";
import GuaranteesTab from "./CustomerGuaranteesTab";
import EvaluationTab from "./CustomerEvaluationTab";
import CustomerBusinessTab from "./CustomerBusinessTab";
import CustomerReferencesTab from "./CustomerReferencesTab";
import ConfirmDialog from "../ConfirmDialog";
import CircularProgress from "@mui/material/CircularProgress";
import dayjs from "dayjs";
import Typography from "@mui/material/Typography";
import CustomerDocuments from "./CustomerDocuments";
import CustomerChecklist from "./CustomerCheckList";

const url = process.env.REACT_APP_API_BASE_URL + "/api/customers";
const token = process.env.REACT_APP_API_TOKEN;

const TabPanel = ({ children, value, index }) => (
  <div role="tabpanel" style={{ display: value === index ? "block" : "none" }}>
	{children}
  </div>
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

const normalizeCustomerForApi = (customer, isEmployee) => {
  return {
	...customer,
	economic_activity: isEmployee ? 2 : 1,
	birth_date: toIsoDateOrNull(customer.birth_date),
	identity_issue_date: toIsoDateOrNull(customer.identity_issue_date),
	identity_expiration_date: toIsoDateOrNull(customer.identity_expiration_date),
	job_start_day: toIsoDateOrNull(customer.job_start_day),
	business_license_issued: toIsoDateOrNull(customer.business_license_issued),
	business_license_expiry: toIsoDateOrNull(customer.business_license_expiry),
  };
};

const CustomerAdd = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [guarantees, setGuarantees] = useState([{ article: "", series: "", brand: "", value: 0 }]);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState({ alertType: "", alertMessage: "" });
  const [alertState, setAlertState] = useState({ open: false });
  const [openDialog, setOpenDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);

  const generalInfoRef = useRef(null);
  const guaranteesRef = useRef(null);
  const evaluationRef = useRef(null);
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

  useEffect(() => setInternalMode(mode), [mode]);

  const [loading, setLoading] = useState(mode !== "add");
  const [isEmployee, setIsEmployee] = useState(null);

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
	conami_id_actividad_economica: "" ,

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

	// ✅ backend espera marital_status_id
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

  const [notRequiredFields, setNotRequiredFields] = useState([]);

  const cleanedGuarantees = guarantees.map((g) => ({
	...g,
	value: typeof g.value === "string" ? parseFloat(g.value.replace(/[^0-9.]/g, "")) : g.value,
  }));

  // ✅ Carga (edit/show) usando {customer, guarantees}
  useEffect(() => {
	if (mode === "edit" || mode === "show") {
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
			identity_issue_date: c.identity_issue_date ? dayjs(c.identity_issue_date) : prev.identity_issue_date,
			identity_expiration_date: c.identity_expiration_date ? dayjs(c.identity_expiration_date) : prev.identity_expiration_date,
			job_start_day: c.job_start_day ? dayjs(c.job_start_day) : null,
			business_license_issued: c.business_license_issued ? dayjs(c.business_license_issued) : null,
			business_license_expiry: c.business_license_expiry ? dayjs(c.business_license_expiry) : null,
		  }));

		  setIsEmployee(Number(c.economic_activity) === 2);

		  const cleaned = (Array.isArray(g) ? g : []).map((guar) => ({
			...guar,
			value: typeof guar.value === "string" ? parseFloat(guar.value.replace(/[^0-9.]/g, "")) : guar.value,
		  }));

		  setGuarantees(cleaned.length ? cleaned : [{ article: "", series: "", brand: "", value: 0 }]);
		  setLoading(false);
		})
		.catch((err) => {
		  console.error("Error cargando datos:", err);
		  toast.error("Error cargando cliente");
		  setLoading(false);
		});
	}
  }, [mode, customerId]);

  const handleTabChange = (_, newValue) => setActiveTab(newValue);

  const addCustomer = async () => {
	setAlertState({ open: true });

	const payloadCustomer = normalizeCustomerForApi(customer, Boolean(isEmployee));

	const requestOptions = {
	  method: mode === "edit" ? "PUT" : "POST",
	  headers: {
		"Content-Type": "application/json; charset=UTF-8",
		Authorization: token,
	  },
	  body: JSON.stringify({ customer: payloadCustomer, guarantees: cleanedGuarantees }),
	};

	try {
	  const response = await fetch(mode === "edit" ? `${url}/${customerId}` : url, requestOptions);
	  const result = await response.json().catch(() => ({}));

	  if (!response.ok) {
		applyServerErrorsToForm(result?.errors, setErrors);
		setAlert({ alertType: "error", alertMessage: result?.message || "Error al guardar" });
	  } else {
		setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente" });
		setTimeout(() => navigate("/clientes"), 800);
	  }
	} catch (error) {
	  setAlert({ alertType: "error", alertMessage: "Error de red: " + error.message });
	  toast.error("Error de red");
	} finally {
	  setOpenDialog(false);
	  setAlertState({ open: false });
	}
  };

  const handleDialogConfirmation = () => {
	if (cancelDialog) navigate("/clientes");
	else addCustomer();
  };

  const handleSubmit = (e) => {
  e.preventDefault();

  const vGeneral    = generalInfoRef.current?.validate?.() ?? { ok: true, errors: {} };
  const vBusiness   = businessRef.current?.validate?.() ?? { ok: true, errors: {} };
  const vGuarantees = guaranteesRef.current?.validate?.() ?? { ok: true, errors: {} };
  const vReferences = referencesRef.current?.validate?.() ?? { ok: true, errors: {} };
  // si evaluation no bloquea guardar, ni lo metas; si bloquea, incluilo:
  const vEvaluation = evaluationRef.current?.validate?.() ?? { ok: true, errors: {} };

  const mergedErrors = {
	...vGeneral.errors,
	...vBusiness.errors,
	...vGuarantees.errors,
	...vReferences.errors,
	...vEvaluation.errors,
  };

  setErrors(mergedErrors);

  if (Object.keys(mergedErrors).length > 0) {
	toast.error("Corrija los errores antes de continuar..", mergedErrors);
	return;
  }

  customer.economic_activity = isEmployee ? 2 : 1;
  setOpenDialog(true);
  setCancelDialog(false);
};


	  const clearFields = (obj, fields, emptyValue = "") => {
	  const next = { ...obj };
	  fields.forEach((f) => {
		if (f in next) {
		  // numéricos a 0, fechas a null, strings a ""
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

const SPOUSE_FIELDS = [
  "spouse_name",
  "spouse_telephone",
  "spouse_position",
  "spouse_address",
  "spouse_job_company",
  "spouse_job_telephone",
  "spouse_job_salary",
];

useEffect(() => {
  // economic_activity: 1 negocio propio, 2 empleado
  const ea = Number(customer.economic_activity);

  // si todavía no eligió, no hagas nada
  if (![1, 2].includes(ea)) return;

  const employee = ea === 2;

  // Actualiza flag central (para tabs)
  setIsEmployee(employee);

  // Limpia campos que NO aplican
  setCustomer((prev) => {
	const next = employee
	  ? clearFields(prev, BUSINESS_FIELDS) // si es empleado, borra negocio
	  : clearFields(prev, EMPLOYEE_FIELDS); // si es negocio, borra empleo

	// Recalcular derivados (por si quedan viejos)
	if (!employee) {
	  // negocio propio: anual = mensual * 12
	  const m = Number(next.business_monthly_income || 0);
	  next.business_annual_income = m * 12;
	} else {
	  // empleado: anual_salary = monthly_salary * 12
	  const s = Number(next.monthly_salary || 0);
	  next.annual_salary = s * 12;
	}

	return next;
  });

  // Limpia errores de esos campos para que no queden “pegados”
  setErrors((prevErr) =>
	employee
	  ? clearErrors(prevErr, BUSINESS_FIELDS)
	  : clearErrors(prevErr, EMPLOYEE_FIELDS)
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [customer.economic_activity]);



  if (loading) {
	return (
	  <Box textAlign="center" mt={4}>
		<CircularProgress />
		<Typography variant="body1">Cargando información del cliente...</Typography>
	  </Box>
	);
  }

  return (
	<div>
	  <Alert variant="filled" severity="info">
		<h3>
		  {internalMode === "edit"
			? `Editar cliente: [${customer.id} - ${customer.customer_name}]`
			: internalMode === "show"
			? "Ver cliente"
			: "Agregar nuevo cliente..."}
		</h3>
	  </Alert>

	  {internalMode === "show" && (
		<Box mb={2}>
		  <Button variant="contained" onClick={() => setInternalMode("edit")}>
			Editar
		  </Button>
		</Box>
	  )}

	  <form onSubmit={handleSubmit}>
		<Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
		  <Tab label="Datos Generales" />
		  <Tab label="Datos del negocio" />
		  <Tab label="Garantías" />
		  <Tab label="Referencias" />
		  <Tab label="Evaluación" />
		  <Tab label="Documentos" />
		</Tabs>

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
		  <GuaranteesTab ref={guaranteesRef} guarantees={guarantees} setGuarantees={setGuarantees} mode={internalMode} />
		</TabPanel>

		

		<TabPanel value={activeTab} index={3}>
		  <CustomerDocuments ref={documentsRef} customer={customer} setCustomer={setCustomer} mode={internalMode} />
		</TabPanel>

		<TabPanel value={activeTab} index={4}>
		  <CustomerReferencesTab
			ref={referencesRef}
			customer={customer}
			setCustomer={setCustomer}
			errors={errors}
			setErrors={setErrors}
			mode={internalMode}
		  />
		</TabPanel>

		<TabPanel value={activeTab} index={5}>
		  <EvaluationTab ref={evaluationRef} customer={customer} setCustomer={setCustomer} mode={internalMode} />
		</TabPanel>

		<TabPanel value={activeTab} index={6}>
		  <CustomerChecklist
			customerCode={customer.id}
			readOnly={false}
			autoHideCompleted={false}
			/>
		</TabPanel>

		<Box mt={2}>
		  {internalMode !== "show" && (
			<Button variant="contained" type="submit">
			  Guardar
			</Button>
		  )}

		  <Button
			variant="contained"
			color="error"
			onClick={() => {
			  setCancelDialog(true);
			  setOpenDialog(true);
			}}
			sx={{ ml: 1 }}
		  >
			Cancelar
		  </Button>
		</Box>
	  </form>

	  <ToastContainer />

	  <Snackbar open={alertState.open} autoHideDuration={3000}>
		<Alert severity={alert.alertType || "info"}>{alert.alertMessage}</Alert>
	  </Snackbar>

	  <ConfirmDialog
		open={openDialog}
		confirm={handleDialogConfirmation}
		cancel={() => setOpenDialog(false)}
		cancelOperation={cancelDialog}
	  />
	</div>
  );
};

export default CustomerAdd;
