import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import dayjs from "dayjs";
import "react-toastify/dist/ReactToastify.css";

import BusinessTypeSelect from "../BusinessTypeSelect";
import GuaranteesTable from "../GuranteeTable";
import ProvinceSelect from "../ProvinceSelect";
import CountrySelect from "../CountrySelect";
import ConfirmDialog from "../ConfirmDialog";
import DividerChip from "../DividerChip";

import calculateAge from "../../functions/calculateAge";

import {
  Box,
  TextField,
  Button,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  Divider,
  InputLabel,
  FormControl,
  FormHelperText,
} from "@mui/material";

import { Save as SaveIcon, Cancel as CancelIcon } from "@mui/icons-material";

import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import "dayjs/locale/en-gb";

const url = process.env.REACT_APP_API_BASE_URL + "/api/customers";
const token = process.env.REACT_APP_API_TOKEN;

const isEmpty = (v) =>
  v === null ||
  v === undefined ||
  (typeof v === "string" && v.trim() === "");

function validateForm(data, isEmployeeFlag) {
  // Campos opcionales por defecto (no obligatorios)
  const optional = new Set([
    "business_license_entity",
    "business_license_issued",
    "business_license_expiry",
    "telephone",
    "email",
    "funds_source",
    "home_status",

    // Cónyuge (asumido NO obligatorio)
    "spouse_name",
    "spouse_telephone",
    "spouse_position",
    "spouse_address",
    "spouse_job_company",
    "spouse_job_telephone",
    "spouse_job_salary",
  ]);

  // Si ES EMPLEADO -> los campos del negocio NO aplican (no obligatorios)
  if (isEmployeeFlag) {
    [
      "business_address",
      "business_name",
      "business_telephone",
      "business_type_id",
      "business_inventory",
      "business_monthly_income",
      "business_annual_income",
      "business_receivables",
      "credit_sales",
      "cash_sales",
      "cash_amount",
      "other_incomes",
    ].forEach((k) => optional.add(k));
  } else {
    // Si NO es empleado (negocio propio) -> campos de empleo NO aplican
    ["company", "job_start_day", "job_telephone", "monthly_salary", "occupation"].forEach((k) =>
      optional.add(k)
    );
  }

  const nextErrors = {};

  for (const [key, value] of Object.entries(data)) {
    if (optional.has(key)) continue;

    // números 0 son válidos (no marcarlos como requeridos)
    if (typeof value === "number") continue;

    if (isEmpty(value)) {
      nextErrors[key] = "Este campo es requerido";
    }
  }

  // Validación extra: si identity_type = 1 (cédula), identificación debe tener 14 dígitos
  if (data.identity_type === 1) {
    const id = (data.identification ?? "").toString().trim();
    if (id && id.length !== 14) {
      nextErrors.identification = "Cédula de identidad debe tener 14 dígitos";
    }
  }

  return nextErrors;
}

const CustomerForm = ({ mode }) => {
  const navigate = useNavigate();
  const { customerId } = useParams();

  const [errors, setErrors] = useState({});
  const [openDialog, setOpenDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);

  // isEmployee: true si economic_activity === 2
  const [isEmployee, setIsEmployee] = useState(false);

  const [customer, setCustomer] = useState({
    age: 1,
    birth_country_id: 1,
    birth_date: dayjs(),
    business_address: "",
    business_name: "",
    business_telephone: "",
    business_type_id: 0,
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
    economic_activity: 0,
    funds_source: "",
    gender: "",
    home_address: "",
    home_status: "",
    identification: "",
    identity_expiration_date: dayjs(),
    identity_issue_country: 1,
    identity_issue_date: dayjs(),
    identity_type: 0,
    income_usd: 0,
    job_start_day: null,
    job_telephone: "",
    marital_status: "",
    monthly_salary: 0,
    annual_salary: 0, // <-- agregado (antes lo usabas pero no existía)
    nationality: 1,
    occupation: "",
    other_incomes: 0.0,
    province_id: 1,
    municipality_id: 1,
    public_name: "",
    residence_country_id: 1,
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
    email: "", // <-- agregado (antes lo usabas pero no existía)
  });

  const [guarantees, setGuarantees] = useState([
    { article: "", series: "", brand: "", value: 0.0 },
  ]);

  const [alertState, setAlertState] = useState({
    open: false,
    vertical: "top",
    horizontal: "center",
  });
  const [alert, setAlert] = useState({ alertType: "", alertMessage: "" });

  // Cargar cliente en edit/show
  useEffect(() => {
    if (mode === "edit" || mode === "show") {
      fetch(`${url}/${customerId}`, {
        headers: { Authorization: token },
      })
        .then((response) => response.json())
        .then((data) => {
          const c = data.customer || {};
          // normalizar fechas a dayjs cuando vengan como string
          const normalized = {
            ...customer,
            ...c,
            birth_date: c.birth_date ? dayjs(c.birth_date) : customer.birth_date,
            identity_issue_date: c.identity_issue_date ? dayjs(c.identity_issue_date) : customer.identity_issue_date,
            identity_expiration_date: c.identity_expiration_date
              ? dayjs(c.identity_expiration_date)
              : customer.identity_expiration_date,
            job_start_day: c.job_start_day ? dayjs(c.job_start_day) : null,
            business_license_issued: c.business_license_issued ? dayjs(c.business_license_issued) : null,
            business_license_expiry: c.business_license_expiry ? dayjs(c.business_license_expiry) : null,
          };

          // edad: recalcular si viene birth_date
          if (normalized.birth_date) {
            normalized.age = calculateAge(dayjs(normalized.birth_date));
          }

          setCustomer(normalized);
          setGuarantees(data.guarantees || []);
          setIsEmployee(Number(c.economic_activity) === 2);

          // validar al cargar (para modo show/edit)
          const nextErrors = validateForm(normalized, Number(c.economic_activity) === 2);
          setErrors(nextErrors);
        })
        .catch((error) => {
          console.error("Error fetching customer data:", error);
          toast.error("Error cargando el cliente");
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [mode, customerId]);

  const addCustomer = async () => {
    setAlertState((s) => ({ ...s, open: true }));

    const requestOptions = {
      method: mode === "edit" ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: token,
      },
      body: JSON.stringify({ customer, guarantees }),
    };

    try {
      const response = await fetch(mode === "edit" ? `${url}/${customerId}` : url, requestOptions);
      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        const serverErrors = responseData?.errors;

        if (Array.isArray(serverErrors) && serverErrors.length > 0) {
          // muestra TODOS los errores del server (sin saltarte pares/impares)
          serverErrors.forEach((e) => toast.error(e.msg || String(e)));
          setAlert({
            alertType: "error",
            alertMessage: "Respuesta del servidor: hay errores de validación.",
          });
        } else {
          toast.error(responseData?.message || "Error al guardar");
          setAlert({
            alertType: "error",
            alertMessage: responseData?.message || "Error al guardar",
          });
        }
      } else {
        setAlert({ alertType: "success", alertMessage: "Registro guardado exitosamente" });
        setTimeout(() => navigate("/clientes"), 1500);
      }
    } catch (error) {
      console.log(error);
      toast.error("Error al guardar (catch)");
      setAlert({ alertType: "error", alertMessage: "Error al guardar el registro." });
    } finally {
      setOpenDialog(false);
    }
  };

  function handleDialogConfirmation() {
    if (cancelDialog) {
      navigate("/clientes");
      return;
    }
    addCustomer();
  }

  function handleCancel() {
    setCancelDialog(true);
    setOpenDialog(true);
  }

  const handleClose = (event, reason) => {
    if (reason === "clickaway") return;
    setAlertState((s) => ({ ...s, open: false }));
  };

  const capWords = (s) => (s || "").replace(/\b\w/g, (l) => l.toUpperCase());

  function handleInputChange(e) {
    const { name, value } = e.target;

    // si cambia actividad económica, actualizamos bandera para validar correctamente
    const nextIsEmployee =
      name === "economic_activity" ? (value === 2 || value === "2") : isEmployee;

    if (name === "economic_activity") {
      setIsEmployee(nextIsEmployee);
    }

    // calculamos "nextCustomer" sin depender de setState async
    const nextCustomer = (() => {
      const next = { ...customer, [name]: value };

      // anualizaciones (numéricas)
      if (name === "business_monthly_income") {
        const n = Number(value || 0);
        next.business_monthly_income = n;
        next.business_annual_income = n * 12;
      }
      if (name === "monthly_salary") {
        const n = Number(value || 0);
        next.monthly_salary = n;
        next.annual_salary = n * 12;
      }

      // capitalizar nombres
      if (name === "customer_name") next.customer_name = capWords(value);
      if (name === "public_name") next.public_name = capWords(value);
      if (name === "reference_name") next.reference_name = capWords(value);
      if (name === "reference2_name") next.reference2_name = capWords(value);

      // vencimiento = emisión + 10 años
      if (name === "identity_issue_date" && value) {
        next.identity_issue_date = value;
        next.identity_expiration_date = dayjs(value).add(10, "year");
      }

      // parse fecha nacimiento desde cédula (si ya hay suficiente)
      if (name === "identification") {
        const str = String(value || "");
        if (str.length >= 9) {
          const yy = parseInt(str.substring(7, 9), 10);
          const year = yy <= 30 ? 2000 + yy : 1900 + yy;
          const month = parseInt(str.substring(5, 7), 10) - 1;
          const day = parseInt(str.substring(3, 5), 10);

          const bd = dayjs(new Date(year, month, day));
          if (bd.isValid()) {
            next.birth_date = bd;
            next.age = calculateAge(bd);
          }
        }
      }

      if (name === "birth_date" && value) {
        const bd = dayjs(value);
        next.birth_date = bd;
        next.age = calculateAge(bd);
      }

      return next;
    })();

    setCustomer(nextCustomer);

    // recalcular errores con el nextCustomer
    const nextErrors = validateForm(nextCustomer, nextIsEmployee);
    setErrors(nextErrors);
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validateForm(customer, isEmployee);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("No es posible guardar, primero corrija errores!");
      return;
    }

    setOpenDialog(true);
    setCancelDialog(false);
  };

  const title = useMemo(() => {
    if (mode === "edit") return "Editar cliente";
    if (mode === "show") return "Ver cliente";
    return "Agregar nuevo cliente";
  }, [mode]);

  return (
    <div>
      <Alert variant="filled" icon={false} severity="info" className="mt-5">
        <h3>{title}</h3>
      </Alert>

      <form onSubmit={handleSubmit} className="w-100">
        <div className="shadow-lg p-3 mb-5 bg-body rounded w-100">
          <Box
            sx={{
              "& .MuiTextField-root": { m: 1 },
              overflow: "scroll",
              overscrollBehavior: "contain",
            }}
            noValidate
            autoComplete="off"
            maxHeight={700}
            maxWidth={1800}
          >
            <div id="datos-personales">
              <DividerChip label="Datos personales" />

              <TextField
                id="name"
                error={Boolean(errors.customer_name)}
                label="Nombre y apellidos *"
                name="customer_name"
                fullWidth
                focused
                size="small"
                sx={{ width: 400 }}
                value={customer.customer_name}
                onChange={handleInputChange}
                helperText={errors.customer_name}
                disabled={mode === "show"}
              />

              <TextField
                id="public_name"
                focused
                error={Boolean(errors.public_name)}
                label="Nombre conocido públicamente *"
                name="public_name"
                fullWidth
                size="small"
                sx={{ width: 400 }}
                value={customer.public_name}
                onChange={handleInputChange}
                helperText={errors.public_name}
                disabled={mode === "show"}
              />

              <FormControl
                focused
                sx={{ m: 1, minWidth: 180 }}
                size="small"
                error={Boolean(errors.gender)}
              >
                <InputLabel id="gender-label">Género</InputLabel>
                <Select
                  id="gender"
                  labelId="gender-label"
                  value={customer.gender}
                  label="Género"
                  name="gender"
                  onChange={handleInputChange}
                  disabled={mode === "show"}
                >
                  <MenuItem value={1}>Masculino</MenuItem>
                  <MenuItem value={2}>Femenino</MenuItem>
                </Select>
                {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
              </FormControl>

              <div id="datos-identificacion">
                <Divider>Datos de identificación</Divider>

                <FormControl sx={{ m: 1, minWidth: 220 }} size="small" error={Boolean(errors.identity_type)}>
                  <InputLabel id="identity-type-label">Tipo de identificación</InputLabel>
                  <Select
                    labelId="identity-type-label"
                    label="Tipo de identificación"
                    value={customer.identity_type}
                    sx={{ width: 220 }}
                    onChange={handleInputChange}
                    name="identity_type"
                    size="small"
                    disabled={mode === "show"}
                  >
                    <MenuItem value={1}>Cédula de identidad</MenuItem>
                    <MenuItem value={2}>Cédula de residencia</MenuItem>
                    <MenuItem value={3}>Pasaporte</MenuItem>
                  </Select>
                  {errors.identity_type && <FormHelperText>{errors.identity_type}</FormHelperText>}
                </FormControl>

                <TextField
                  id="identification"
                  focused
                  label="Número de identificación"
                  name="identification"
                  size="small"
                  sx={{ width: 220 }}
                  value={customer.identification}
                  onChange={handleInputChange}
                  error={Boolean(errors.identification)}
                  helperText={errors.identification}
                  disabled={mode === "show"}
                />

                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Fecha de emisión"
                    format="DD/MM/YYYY"
                    value={customer.identity_issue_date || null}
                    onChange={(newValue) =>
                      handleInputChange({
                        target: { name: "identity_issue_date", value: newValue },
                      })
                    }
                     renderInput={(params) => (
     					 <TextField {...params} size="small" sx={{ width: 170, m: 1 }} />
   					 )}
                    sx={{ width: 170, m: 1 }}
                    disabled={mode === "show"}
                  />
                </LocalizationProvider>

                <LocalizationProvider dateAdapter={AdapterDayjs}>
                  <DatePicker
                    label="Fecha de vencimiento"
                    format="DD/MM/YYYY"
                    value={customer.identity_expiration_date || null}
                    onChange={(newValue) =>
                      handleInputChange({
                        target: { name: "identity_expiration_date", value: newValue },
                      })
                    }
                     renderInput={(params) => (
      <TextField {...params} size="small" sx={{ width: 170, m: 1 }} />
    )}
                    sx={{ width: 170, m: 1 }}
                    disabled={mode === "show"}
                  />
                </LocalizationProvider>

                <CountrySelect
                  error={Boolean(errors.identity_issue_country)}
                  focused
                  editing={false}
                  selected={customer.identity_issue_country}
                  label="País de emisión"
                  onChange={handleInputChange}
                  name="identity_issue_country"
                  helperText={errors.identity_issue_country}
                  disabled={mode === "show"}
                />
              </div>

              <TextField
                id="home_address"
                focused
                label="Dirección del hogar"
                name="home_address"
                size="small"
                sx={{ width: "97%" }}
                multiline
                maxRows={3}
                value={customer.home_address}
                onChange={handleInputChange}
                error={Boolean(errors.home_address)}
                helperText={errors.home_address}
                disabled={mode === "show"}
              />

              <CountrySelect
                id="residence_country_id"
                focused
                editing={true}
                selected={customer.residence_country_id}
                label="País de residencia"
                onChange={handleInputChange}
                name="residence_country_id"
                error={Boolean(errors.residence_country_id)}
                disabled={mode === "show"}
              />

              <ProvinceSelect
                id="province_id"
                focused
                value={customer.province_id}
                label="Departamento"
                onChange={handleInputChange}
                provinceName="province_id"
                municipalityName="municipality_id"
                errorField={errors.province_id}
                disabled={mode === "show"}
              />

              <FormControl
                focused
                sx={{ m: 1, minWidth: 180 }}
                size="small"
                error={Boolean(errors.marital_status)}
              >
                <InputLabel id="marital-status-label">Estado civil</InputLabel>
                <Select
                  labelId="marital-status-label"
                  id="marital_status"
                  value={customer.marital_status}
                  label="Estado civil"
                  name="marital_status"
                  onChange={handleInputChange}
                  disabled={mode === "show"}
                >
                  <MenuItem value={1}>Soltero(a)</MenuItem>
                  <MenuItem value={2}>Casado(a)</MenuItem>
                </Select>
                {errors.marital_status && <FormHelperText>{errors.marital_status}</FormHelperText>}
              </FormControl>

              <CountrySelect
                id="birth_country_id"
                focused
                editing={false}
                selected={customer.birth_country_id}
                label="País de nacimiento"
                onChange={handleInputChange}
                name="birth_country_id"
                error={Boolean(errors.birth_country_id)}
                disabled={mode === "show"}
              />

              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Fecha de nacimiento"
                  name="birth_date"
                  value={customer.birth_date || null}
                  format="DD/MM/YYYY"
                  onChange={(newValue) =>
                    handleInputChange({
                      target: { name: "birth_date", value: newValue },
                    })
                  }
                   renderInput={(params) => (
      <TextField {...params} size="small" sx={{ width: 170, m: 1 }} />
    )}
                  sx={{ width: 170, m: 1 }}
                  disabled={mode === "show"}
                />
              </LocalizationProvider>

              <TextField
                id="age"
                focused
                label="Edad en años"
                name="age"
                size="small"
                value={customer.age}
                sx={{ width: 130 }}
                onChange={handleInputChange}
                disabled // edad calculada
              />

              <TextField
                id="email"
                focused
                label="Correo electrónico"
                name="email"
                size="small"
                value={customer.email}
                onChange={handleInputChange}
                sx={{ width: 260 }}
                disabled={mode === "show"}
              />

              <TextField
                id="telephone"
                focused
                label="Teléfono fijo"
                name="telephone"
                size="small"
                value={customer.telephone}
                onChange={handleInputChange}
                sx={{ width: 160 }}
                disabled={mode === "show"}
              />

              <TextField
                id="cellphone"
                focused
                label="Celular"
                name="cellphone"
                size="small"
                value={customer.cellphone}
                onChange={handleInputChange}
                sx={{ width: 160 }}
                error={Boolean(errors.cellphone)}
                helperText={errors.cellphone}
                disabled={mode === "show"}
              />
            </div>

            <div id="datos-laborales">
              <FormControl sx={{ m: 1, minWidth: 220 }} size="small" error={Boolean(errors.economic_activity)}>
                <InputLabel id="economic-activity-label">Actividad económica</InputLabel>
                <Select
                  id="economic_activity"
                  labelId="economic-activity-label"
                  label="Actividad económica"
                  value={customer.economic_activity}
                  sx={{ width: 220 }}
                  onChange={handleInputChange}
                  name="economic_activity"
                  size="small"
                  disabled={mode === "show"}
                >
                  <MenuItem value={1}>Negocio propio</MenuItem>
                  <MenuItem value={2}>Empleado</MenuItem>
                </Select>
                {errors.economic_activity && <FormHelperText>{errors.economic_activity}</FormHelperText>}
              </FormControl>

              {isEmployee && (
                <>
                  <DividerChip label="Datos laborales" />

                  <TextField
                    id="occupation"
                    focused
                    label="Profesión/Oficio *"
                    name="occupation"
                    size="small"
                    value={customer.occupation}
                    onChange={handleInputChange}
                    sx={{ m: 1, minWidth: 220 }}
                    error={Boolean(errors.occupation)}
                    helperText={errors.occupation}
                    disabled={mode === "show"}
                  />

                  <TextField
                    id="company"
                    focused
                    label="Empresa *"
                    name="company"
                    size="small"
                    value={customer.company}
                    sx={{ width: 500 }}
                    onChange={handleInputChange}
                    error={Boolean(errors.company)}
                    helperText={errors.company}
                    disabled={mode === "show"}
                  />

                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Fecha de ingreso *"
                      format="DD/MM/YYYY"
                      value={customer.job_start_day || null}
                      onChange={(newValue) =>
                        handleInputChange({
                          target: { name: "job_start_day", value: newValue },
                        })
                      }
                       renderInput={(params) => (
      <TextField {...params} size="small" sx={{ width: 170, m: 1 }} />
    )}																																																																																		
                      sx={{ width: 200, m: 1 }}
                      disabled={mode === "show"}
                    />
                  </LocalizationProvider>

                  <TextField
                    focused
                    id="monthly_salary"
                    label="Salario mensual *"
                    name="monthly_salary"
                    size="small"
                    value={customer.monthly_salary}
                    sx={{ width: 200 }}
                    onChange={handleInputChange}
                    error={Boolean(errors.monthly_salary)}
                    helperText={errors.monthly_salary}
                    disabled={mode === "show"}
                  />

                  <TextField
                    focused
                    id="job_telephone"
                    label="Teléfono del trabajo *"
                    name="job_telephone"
                    size="small"
                    value={customer.job_telephone}
                    sx={{ width: 200 }}
                    onChange={handleInputChange}
                    error={Boolean(errors.job_telephone)}
                    helperText={errors.job_telephone}
                    disabled={mode === "show"}
                  />
                </>
              )}

              {!isEmployee && (
                <div id="datos-negocio">
                  <DividerChip label="Datos del negocio" />

                  <TextField
                    id="business_name"
                    focused
                    label="Nombre del negocio *"
                    name="business_name"
                    fullWidth
                    size="small"
                    sx={{ width: 600 }}
                    value={customer.business_name}
                    onChange={handleInputChange}
                    error={Boolean(errors.business_name)}
                    helperText={errors.business_name}
                    disabled={mode === "show"}
                  />

                  <BusinessTypeSelect
                    id="business_type_id"
                    editing={true}
                    label="Tipo de negocio *"
                    selected={customer.business_type_id}
                    onChange={handleInputChange}
                    name="business_type_id"
                    error={errors.business_type_id}
                    disabled={mode === "show"}
                  />

                  <TextField
                    id="business_address"
                    focused
                    label="Dirección del negocio *"
                    name="business_address"
                    size="small"
                    sx={{ width: 600 }}
                    value={customer.business_address}
                    onChange={handleInputChange}
                    error={Boolean(errors.business_address)}
                    helperText={errors.business_address}
                    disabled={mode === "show"}
                  />

                  <TextField
                    id="business_telephone"
                    focused
                    label="Teléfono del negocio *"
                    name="business_telephone"
                    size="small"
                    value={customer.business_telephone}
                    onChange={handleInputChange}
                    error={Boolean(errors.business_telephone)}
                    helperText={errors.business_telephone}
                    disabled={mode === "show"}
                  />

                  <TextField
                    id="business_inventory"
                    focused
                    label="Inventario *"
                    name="business_inventory"
                    size="small"
                    value={customer.business_inventory}
                    onChange={handleInputChange}
                    error={Boolean(errors.business_inventory)}
                    helperText={errors.business_inventory}
                    disabled={mode === "show"}
                  />

                  <TextField
                    id="business_receivables"
                    focused
                    label="Cuentas por cobrar *"
                    name="business_receivables"
                    size="small"
                    value={customer.business_receivables}
                    onChange={handleInputChange}
                    error={Boolean(errors.business_receivables)}
                    helperText={errors.business_receivables}
                    disabled={mode === "show"}
                  />

                  <TextField
                    id="business_monthly_income"
                    focused
                    label="Ingresos mensuales *"
                    name="business_monthly_income"
                    size="small"
                    value={customer.business_monthly_income}
                    onChange={handleInputChange}
                    error={Boolean(errors.business_monthly_income)}
                    helperText={errors.business_monthly_income}
                    disabled={mode === "show"}
                  />

                  <TextField
                    id="business_annual_income"
                    focused
                    label="Ingresos anuales"
                    name="business_annual_income"
                    size="small"
                    value={customer.business_annual_income}
                    onChange={handleInputChange}
                    disabled // calculado
                  />

                  <div id="permisos-licencias">
                    <Divider>Permisos y licencias</Divider>

                    <TextField
                      focused
                      label="Nombre de la entidad emisora"
                      name="business_license_entity"
                      size="small"
                      value={customer.business_license_entity}
                      onChange={handleInputChange}
                      sx={{ width: 700 }}
                      disabled={mode === "show"}
                    />

                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        label="Fecha de emisión"
                        format="DD/MM/YYYY"
                        value={customer.business_license_issued || null}
                        onChange={(newValue) =>
                          handleInputChange({
                            target: { name: "business_license_issued", value: newValue },
                          })
                        }
                         renderInput={(params) => (
      <TextField {...params} size="small" sx={{ width: 170, m: 1 }} />
    )}
                        sx={{ width: 200, m: 1 }}
                        disabled={mode === "show"}
                      />
                    </LocalizationProvider>

                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DatePicker
                        label="Fecha de vencimiento"
                        format="DD/MM/YYYY"
                        value={customer.business_license_expiry || null}
                        onChange={(newValue) =>
                          handleInputChange({
                            target: { name: "business_license_expiry", value: newValue },
                          })
                        }
                         renderInput={(params) => (
      <TextField {...params} size="small" sx={{ width: 170, m: 1 }} />
    )}
                        sx={{ width: 200, m: 1 }}
                        disabled={mode === "show"}
                      />
                    </LocalizationProvider>
                  </div>
                </div>
              )}
            </div>

            <div id="datos-conyuge">
              <DividerChip label="Datos del cónyuge" />
              <TextField
                id="spouse_name"
                label="Nombre"
                name="spouse_name"
                size="small"
                sx={{ width: 500 }}
                value={customer.spouse_name}
                onChange={handleInputChange}
                disabled={mode === "show"}
              />
              <TextField
                label="Teléfono"
                name="spouse_telephone"
                size="small"
                value={customer.spouse_telephone}
                onChange={handleInputChange}
                disabled={mode === "show"}
              />
              <TextField
                id="spouse_position"
                label="Ocupación"
                name="spouse_position"
                size="small"
                value={customer.spouse_position}
                onChange={handleInputChange}
                disabled={mode === "show"}
              />
              <TextField
                id="spouse_address"
                label="Domicilio"
                name="spouse_address"
                size="small"
                fullWidth
                sx={{ width: 500 }}
                multiline
                maxRows={3}
                value={customer.spouse_address}
                onChange={handleInputChange}
                disabled={mode === "show"}
              />
              <TextField
                id="spouse_job_company"
                label="Empresa donde labora"
                name="spouse_job_company"
                size="small"
                sx={{ width: 500 }}
                value={customer.spouse_job_company}
                onChange={handleInputChange}
                disabled={mode === "show"}
              />
              <TextField
                id="spouse_job_telephone"
                label="Teléfono trabajo"
                name="spouse_job_telephone"
                size="small"
                sx={{ width: 200 }}
                value={customer.spouse_job_telephone}
                onChange={handleInputChange}
                disabled={mode === "show"}
              />
              <TextField
                id="spouse_job_salary"
                label="Salario mensual"
                name="spouse_job_salary"
                size="small"
                sx={{ width: 200 }}
                value={customer.spouse_job_salary}
                onChange={handleInputChange}
                disabled={mode === "show"}
              />
            </div>

            <div id="referencias-personales">
              <DividerChip label="Referencias" />

              <div id="referencia1">
                <Divider>Referencia 1</Divider>

                <TextField
                  focused
                  id="reference_name"
                  label="Nombre completo *"
                  name="reference_name"
                  fullWidth
                  size="small"
                  sx={{ width: 600 }}
                  value={customer.reference_name}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference_name)}
                  helperText={errors.reference_name}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  label="N° Identificación"
                  name="reference_identity"
                  fullWidth
                  size="small"
                  sx={{ width: 600 }}
                  value={customer.reference_identity}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference_identity)}
                  helperText={errors.reference_identity}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  label="Dirección"
                  name="reference_address"
                  size="small"
                  sx={{ width: 600 }}
                  value={customer.reference_address}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference_address)}
                  helperText={errors.reference_address}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  label="Centro laboral"
                  name="reference_workplace"
                  size="small"
                  sx={{ width: 600 }}
                  value={customer.reference_workplace}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference_workplace)}
                  helperText={errors.reference_workplace}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  label="Teléfono"
                  name="reference_telephone"
                  size="small"
                  value={customer.reference_telephone}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference_telephone)}
                  helperText={errors.reference_telephone}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  id="reference_known_time"
                  label="Tiempo de conocerlo(a)"
                  name="reference_known_time"
                  size="small"
                  value={customer.reference_known_time}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference_known_time)}
                  helperText={errors.reference_known_time}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  label="Tipo de relación"
                  name="reference_relationship"
                  size="small"
                  value={customer.reference_relationship}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference_relationship)}
                  helperText={errors.reference_relationship}
                  disabled={mode === "show"}
                />
              </div>

              <div id="referencia2">
                <Divider>Referencia 2</Divider>

                <TextField
                  focused
                  id="reference2_name"
                  label="Nombre completo"
                  name="reference2_name"
                  fullWidth
                  size="small"
                  sx={{ width: 600 }}
                  value={customer.reference2_name}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference2_name)}
                  helperText={errors.reference2_name}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  label="N° Identificación"
                  name="reference2_identity"
                  fullWidth
                  size="small"
                  sx={{ width: 600 }}
                  value={customer.reference2_identity}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference2_identity)}
                  helperText={errors.reference2_identity}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  label="Dirección"
                  name="reference2_address"
                  size="small"
                  sx={{ width: 600 }}
                  value={customer.reference2_address}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference2_address)}
                  helperText={errors.reference2_address}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  label="Centro laboral"
                  name="reference2_workplace"
                  size="small"
                  sx={{ width: 600 }}
                  value={customer.reference2_workplace}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference2_workplace)}
                  helperText={errors.reference2_workplace}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  label="Teléfono"
                  name="reference2_telephone"
                  size="small"
                  value={customer.reference2_telephone}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference2_telephone)}
                  helperText={errors.reference2_telephone}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  label="Tiempo de conocerlo(a)"
                  name="reference2_known_time"
                  size="small"
                  value={customer.reference2_known_time}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference2_known_time)}
                  helperText={errors.reference2_known_time}
                  disabled={mode === "show"}
                />

                <TextField
                  focused
                  label="Tipo de relación"
                  name="reference2_relationship"
                  size="small"
                  value={customer.reference2_relationship}
                  onChange={handleInputChange}
                  error={Boolean(errors.reference2_relationship)}
                  helperText={errors.reference2_relationship}
                  disabled={mode === "show"}
                />
              </div>
            </div>

            <DividerChip label="Garantías" />
            <GuaranteesTable
              disabled={mode === "show"}
              guarantees={guarantees}
              setGuarantees={setGuarantees}
            />
          </Box>
        </div>

        <Button
          disabled={mode === "show"}
          className="btn px-5 me-5"
          type="submit"
          variant="contained"
          startIcon={<SaveIcon />}
        >
          Guardar
        </Button>

        <Button
          className="btn px-5 me-5"
          onClick={handleCancel}
          variant="contained"
          color="error"
          startIcon={<CancelIcon />}
        >
          Cancelar
        </Button>
      </form>

      <ToastContainer />

      <div id="alerts">
        <Snackbar open={alertState.open} autoHideDuration={3000} onClose={handleClose}>
          <Alert onClose={handleClose} severity={alert.alertType} variant="filled" sx={{ width: "100%" }}>
            {alert.alertMessage}
          </Alert>
        </Snackbar>

        <ConfirmDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          confirm={handleDialogConfirmation}
          cancel={() => setOpenDialog(false)}
          cancelOperation={cancelDialog}
        />
      </div>
    </div>
  );
};

export default CustomerForm;
