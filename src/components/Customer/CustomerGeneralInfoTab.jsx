import React, { useImperativeHandle, forwardRef, useState } from "react";
import dayjs from "dayjs";
import calculateAge from "../../functions/calculateAge";

import DividerChip from "../DividerChip";
import CountrySelect from "../CountrySelect";
import ProvinceSelect from "../ProvinceSelect";
import MunicipalitySelect from "../MunicipalitySelect";

import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import FormHelperText from "@mui/material/FormHelperText";

import {
  Box,
  TextField,
  Select,
  MenuItem,
  Divider,
  InputLabel,
  FormControl,
} from "@mui/material";

import GenreSelect from "../Genre/GenreSelect";
import EstadoCivilSelect from "../conami/EstadoCivilSelect";

const CustomerGeneralInfoTab = forwardRef(
  (
    {
      customer,
      setCustomer,
      errors,
      setErrors,
      isEmployee,
      setIsEmployee,
      notRequiredFields,
      setNotRequiredFields,
      mode,
    },
    ref
  ) => {
    useImperativeHandle(ref, () => ({
  validate: () => {
    const c = { ...customer };

    const isEmpty = (v) =>
      v === null ||
      v === undefined ||
      (typeof v === "string" && v.trim() === "");

    // Soltero / Divorciado / Viudo (ajusta ids según tu catálogo)
    const isSingle =
      Number(c.marital_status_id) === 1 ||
      Number(c.marital_status_id) === 3 ||
      Number(c.marital_status_id) === 4;

    // ✅ Campos que NO existen en el formulario (vienen del GET / joins / calculados)
    const ignore = new Set([
      "business_type_name",
      "business_type_weight",
      "business_type_risk",
      "business_risk_value",
      "province_name",
      "municipality_name",
      "province_risk_value",
      "total_loans",

      // nombres “viejos” o diferentes a tu UI
      "inventory_amount", // UI usa business_inventory
      "job_salary",       // UI usa monthly_salary
    ]);

    // ✅ Campos opcionales SIEMPRE (del general tab)
    const optional = new Set([
      "customer_code",
      "branch_id",
      "email",
      "telephone",
      "funds_source",
      "home_status",
      "created_at",
      "created_by",
      "updated_at",
      "updated_by",
    ]);

    // ✅ Cónyuge opcional si es soltero/divorciado/viudo
    if (isSingle) {
      [
        "spouse_name",
        "spouse_telephone",
        "spouse_position",
        "spouse_address",
        "spouse_job_company",
        "spouse_job_telephone",
        "spouse_job_salary",
      ].forEach((k) => optional.add(k));
    }

    // ✅ Nota: aquí NO metas lógica de empleado/negocio, eso lo valida CustomerBusinessTab.
    // Este tab solo debe validar lo que realmente está en "Datos Generales".

    // ✅ Lista de campos que ESTE TAB controla/valida
    const required = [
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
    ];

    const newErrors = {};
    let ok = true;

    for (const key of required) {
      if (ignore.has(key) || optional.has(key)) continue;

      const value = c[key];

      // dayjs
      if (dayjs.isDayjs(value)) {
        if (!value.isValid()) {
          newErrors[key] = "Fecha inválida";
          ok = false;
        }
        continue;
      }

      // números: 0 válido (si para algún select 0 no es válido, cámbialo a isEmpty)
      if (typeof value === "number") continue;

      if (isEmpty(value)) {
        newErrors[key] = "Este campo es requerido";
        ok = false;
      }
    }

    // Validación extra: cédula (solo si identity_type == 1)
    if (Number(c.identity_type) === 1) {
      const id = String(c.identification ?? "").trim();
      if (!id || id.length !== 14) {
        newErrors.identification = "Cédula de identidad debe tener 14 dígitos";
        ok = false;
      }
    }

    return { ok, errors: newErrors };
  },
}));

    const capitalizeWords = (str) => (str || "").replace(/\b\w/g, (l) => l.toUpperCase());

    const extractDateFromIdentification = (value) => {
      try {
        const str = String(value || "");
        if (str.length < 9) return null;

        let year = parseInt(str.substring(7, 9), 10);
        year += year <= 30 ? 2000 : 1900;

        const month = parseInt(str.substring(5, 7), 10) - 1;
        const day = parseInt(str.substring(3, 5), 10);

        const d = dayjs(new Date(year, month, day));
        return d.isValid() ? d : null;
      } catch {
        return null;
      }
    };

    const handleInputChange = (e) => {
      const { name, value } = e.target;

      const updatedCustomer = { ...customer, [name]: value };

      // Si cambia actividad económica
      if (name === "economic_activity") {
        setIsEmployee(value === 2 || value === "2");
      }

      // Recalcular anualizaciones (numéricas)
      if (name === "business_monthly_income") {
        const n = Number(value || 0);
        updatedCustomer.business_monthly_income = n;
        updatedCustomer.business_annual_income = n * 12;
      }

      if (name === "monthly_salary") {
        const n = Number(value || 0);
        updatedCustomer.monthly_salary = n;
        updatedCustomer.annual_salary = n * 12;
      }

      // Capitalizar
      if (name === "reference_name") updatedCustomer.reference_name = capitalizeWords(value);
      if (name === "customer_name") updatedCustomer.customer_name = capitalizeWords(value);
      if (name === "public_name") updatedCustomer.public_name = capitalizeWords(value);
      if (name === "reference2_name") updatedCustomer.reference2_name = capitalizeWords(value);

      // Expiración = emisión + 10 años
      if (name === "identity_issue_date" && value) {
        updatedCustomer.identity_expiration_date = dayjs(value).add(10, "year");
      }

      // Si cambia departamento, reiniciar municipio (mejor null, no "")
      if (name === "province_id") {
        updatedCustomer.municipality_id = null;
      }

      // Extraer fecha nacimiento de cédula
      if (name === "identification") {
        const birthDate = extractDateFromIdentification(value);
        if (birthDate) {
          updatedCustomer.birth_date = birthDate;
          updatedCustomer.age = calculateAge(birthDate);
        }
      }

      // Calcular edad si cambia birth_date
      if (name === "birth_date" && value) {
        const bd = dayjs(value);
        updatedCustomer.age = calculateAge(bd);
      }

      setCustomer(updatedCustomer);

      // validación por campo (simple)
      const empty =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "");

      setErrors((prev) => ({
        ...prev,
        [name]: empty ? "Este campo es requerido" : "",
      }));

    };

    // (opcional) si no lo usas, puedes borrar este state
    const [tmpDate, setTmpDate] = useState(dayjs());

    return (
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
            value={customer?.customer_name || ""}
            onChange={handleInputChange}
            helperText={errors.customer_name || ""}
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
            value={customer?.public_name || ""}
            onChange={handleInputChange}
            helperText={errors.public_name || ""}
            disabled={mode === "show"}
          />

          {/* GenreSelect: adaptamos onChange para que parezca evento */}
          <GenreSelect
            value={customer?.genre_id || ""}
            onChange={(val) =>
              handleInputChange({ target: { name: "genre_id", value: val } })
            }
            disabled={mode === "show"}
            error={Boolean(errors.genre_id)}
            size="small"
          />

          <div id="datos-identificacion">
            <Divider>Datos de identificación</Divider>

            <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
              <InputLabel id="identity-type-label">Tipo de identificación</InputLabel>
              <Select
                labelId="identity-type-label"
                label="Tipo de identificación"
                value={customer?.identity_type || ""}
                sx={{ width: 200 }}
                onChange={handleInputChange}
                name="identity_type"
                size="small"
                disabled={mode === "show"}
              >
                <MenuItem value={1}>Cédula de identidad</MenuItem>
                <MenuItem value={2}>Cédula de residencia</MenuItem>
                <MenuItem value={3}>Pasaporte</MenuItem>
              </Select>
              {errors.identity_type && (
                <FormHelperText error>{errors.identity_type}</FormHelperText>
              )}
            </FormControl>

            <TextField
              id="identification"
              focused
              label="Número de identificación"
              name="identification"
              size="small"
              sx={{ width: 200 }}
              value={customer?.identification || ""}
              onChange={handleInputChange}
              error={Boolean(errors.identification)}
              helperText={errors.identification || ""}
              disabled={mode === "show"}
            />

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Fecha de emisión"
                inputFormat="DD/MM/YYYY"
                value={customer?.identity_issue_date || null}
                onChange={(newValue) => {
                  setTmpDate(newValue || dayjs());
                  handleInputChange({
                    target: { name: "identity_issue_date", value: newValue },
                  });
                }}
                renderInput={(params) => (
                  <TextField {...params} size="small" sx={{ width: 150, m: 1 }} />
                )}
                disabled={mode === "show"}
              />
            </LocalizationProvider>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Fecha de vencimiento"
                inputFormat="DD/MM/YYYY"
                value={customer?.identity_expiration_date || null}
                onChange={(newValue) => {
                  setTmpDate(newValue || dayjs());
                  handleInputChange({
                    target: { name: "identity_expiration_date", value: newValue },
                  });
                }}
                renderInput={(params) => (
                  <TextField {...params} size="small" sx={{ width: 150, m: 1 }} />
                )}
                disabled={mode === "show"}
              />
            </LocalizationProvider>

            <CountrySelect
              error={Boolean(errors.identity_issue_country)}
              focused
              editing={mode !== "show"}
              selected={customer?.identity_issue_country}
              value={customer?.identity_issue_country}
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
            value={customer?.home_address || ""}
            onChange={handleInputChange}
            error={Boolean(errors.home_address)}
            helperText={errors.home_address || ""}
            disabled={mode === "show"}
          />

          <CountrySelect
            name="residence_country_id"
            label="País de residencia"
            value={customer?.residence_country_id ?? ""}
            onChange={handleInputChange}
            editing={mode !== "add"}        // add => false, edit/show => true
            disabled={mode === "show"}
            error={errors.residence_country_id}
            helperText={errors.residence_country_id}
          />


          <ProvinceSelect
            id="province_id"
            focused
            editing={mode !== "show"}
            selected={customer?.province_id}
            name="province_id"
            label="Departamento"
            onChange={handleInputChange}
            error={errors.province_id}
            disabled={mode === "show"}
            
          />

          {/* MunicipalitySelect: adaptamos onChange a evento porque muchos selects devuelven id */}
          <MunicipalitySelect
            name="municipality_id"
            label="Municipio"
            value={customer?.municipality_id ?? ""}     // ✅ antes estabas usando selected
            provinceId={customer?.province_id ?? ""}
            onChange={handleInputChange}               // ✅ este componente manda evento
            error={Boolean(errors.municipality_id)}
            helperText={errors.municipality_id || ""}
            disabled={mode === "show"}
            editing={mode !==  "show"}
          />


          {/* EstadoCivilSelect: adaptamos onChange a evento */}
       <EstadoCivilSelect
          value={customer?.marital_status_id ?? ""}
          onChange={(newId) =>
            handleInputChange({ target: { name: "marital_status_id", value: newId } })
          }
          editing={mode !== "add"}
          disabled={mode === "show"}
          required
          error={Boolean(errors.marital_status_id)}
          helperText={errors.marital_status_id || ""}
        />

          {errors.marital_status_id && (
            <FormHelperText error sx={{ ml: 2 }}>
              {errors.marital_status_id}
            </FormHelperText>
          )}

          <CountrySelect
            id="birth_country_id"
            focused
            editing={mode !== "show"}
            selected={customer?.birth_country_id}
            value={customer?.birth_country_id}
            label="País de nacimiento"
            onChange={handleInputChange}
            name="birth_country_id"
            error={errors.birth_country_id}
            disabled={mode === "show"}
          />
          {errors.birth_country_id && (
            <FormHelperText error sx={{ ml: 2 }}>
              {errors.birth_country_id}
            </FormHelperText>
          )}

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Fecha de nacimiento"
              inputFormat="DD/MM/YYYY"
              value={customer?.birth_date || null}
              onChange={(newValue) => {
                setTmpDate(newValue || dayjs());
                handleInputChange({
                  target: { name: "birth_date", value: newValue },
                });
              }}
              renderInput={(params) => (
                <TextField {...params} size="small" sx={{ width: 150, m: 1 }} />
              )}
              disabled={mode === "show"}
            />
          </LocalizationProvider>

           <CountrySelect
            id="nationality_id"
            focused
            editing={mode !== "show"}
            selected={customer?.nationality_id}
            value={customer?.nationality_id}
            label="Nacionalidad"
            onChange={handleInputChange}
            name="nationality_id"
            error={errors.nationality_id}
            disabled={mode === "show"}
          />
          {errors.nationality_id && (
            <FormHelperText error sx={{ ml: 2 }}>
              {errors.nationality_id}
            </FormHelperText>
          )}

          <TextField
            id="age"
            focused
            label="Edad en años"
            name="age"
            size="small"
            value={customer?.age ?? ""}
            sx={{ width: 130 }}
            onChange={handleInputChange}
            disabled
          />

          <TextField
            id="email"
            focused
            label="Correo electrónico"
            name="email"
            size="small"
            value={customer?.email || ""}
            onChange={handleInputChange}
            disabled={mode === "show"}
          />

          <TextField
            id="telephone"
            focused
            label="Teléfono fijo"
            name="telephone"
            size="small"
            value={customer?.telephone || ""}
            onChange={handleInputChange}
            sx={{ width: 130 }}
            disabled={mode === "show"}
          />

          <TextField
            id="cellphone"
            focused
            label="Celular"
            name="cellphone"
            size="small"
            value={customer?.cellphone || ""}
            onChange={handleInputChange}
            sx={{ width: 130 }}
            error={Boolean(errors.cellphone)}
            helperText={errors.cellphone || ""}
            disabled={mode === "show"}
          />
        </div>

        <div id="datos-conyuge">
          <DividerChip label="Datos del cónyuge" />

          <TextField
            id="spouse_name"
            label="Nombre"
            name="spouse_name"
            size="small"
            sx={{ width: 500 }}
            value={customer?.spouse_name || ""}
            onChange={handleInputChange}
            disabled={mode === "show"}
          />

          <TextField
            label="Teléfono"
            name="spouse_telephone"
            size="small"
            value={customer?.spouse_telephone || ""}
            onChange={handleInputChange}
            disabled={mode === "show"}
          />

          <TextField
            id="spouse_position"
            label="Ocupación"
            name="spouse_position"
            size="small"
            value={customer?.spouse_position || ""}
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
            value={customer?.spouse_address || ""}
            onChange={handleInputChange}
            disabled={mode === "show"}
          />

          <TextField
            id="spouse_job_company"
            label="Empresa donde labora"
            name="spouse_job_company"
            size="small"
            sx={{ width: 500 }}
            value={customer?.spouse_job_company || ""}
            onChange={handleInputChange}
            disabled={mode === "show"}
          />

          <TextField
            id="spouse_job_telephone"
            label="Teléfono trabajo"
            name="spouse_job_telephone"
            size="small"
            sx={{ width: 200 }}
            value={customer?.spouse_job_telephone || ""}
            onChange={handleInputChange}
            disabled={mode === "show"}
          />

          <TextField
            id="spouse_job_salary"
            label="Salario mensual"
            name="spouse_job_salary"
            size="small"
            sx={{ width: 200 }}
            value={customer?.spouse_job_salary ?? 0}
            onChange={handleInputChange}
            disabled={mode === "show"}
          />
        </div>
      </Box>
    );
  }
);

export default CustomerGeneralInfoTab;
