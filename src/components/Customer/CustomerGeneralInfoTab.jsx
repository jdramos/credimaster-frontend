import React, { useImperativeHandle, forwardRef } from "react";
import dayjs from "dayjs";
import calculateAge from "../../functions/calculateAge";

import CountrySelect from "../CountrySelect";
import ProvinceSelect from "../ProvinceSelect";
import MunicipalitySelect from "../MunicipalitySelect";
import GenreSelect from "../Genre/GenreSelect";
import EstadoCivilSelect from "../conami/EstadoCivilSelect";
import TipoDocumentoSelect from "../TipoDocumentoSelect";
import { requiredCustomerFields, requiredCustomerLabel } from "../../utils/customerRequiredFields";

import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import { Box, TextField, Grid, Paper, Stack, Typography, MenuItem, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

const Section = ({ title, subtitle, titleIcon, children }) => (
  <Paper
    elevation={0}
    sx={{
      p: 1.4,
      borderRadius: 2,
      border: "1px solid",
      borderColor: "divider",
      bgcolor: "background.paper",
    }}
  >
    <Stack spacing={1}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Typography variant="subtitle2" fontWeight={900}>
            {title}
          </Typography>
          {titleIcon}
        </Stack>

        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>

      {children}
    </Stack>
  </Paper>
);

const CustomerGeneralInfoTab = forwardRef(
  (
    {
      customer,
      setCustomer,
      errors,
      setErrors,
      isEmployee,
      setIsEmployee,
      mode,
      conamiRegulated = true,
    },
    ref,
  ) => {
    const disabled = mode === "show";
    const lbl = (text, field) => requiredCustomerLabel(text, field, conamiRegulated);

    const isEmpty = (v) =>
      v === null ||
      v === undefined ||
      (typeof v === "string" && v.trim() === "");

    useImperativeHandle(ref, () => ({
      validate: () => {
        const c = { ...customer };

        const isSingle =
          Number(c.marital_status_id) === 1 ||
          Number(c.marital_status_id) === 3 ||
          Number(c.marital_status_id) === 4;

        const required = requiredCustomerFields([
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
        ], conamiRegulated);

        const newErrors = {};
        let ok = true;

        required.forEach((key) => {
          const value = c[key];

          if (dayjs.isDayjs(value)) {
            if (!value.isValid()) {
              newErrors[key] = "Fecha inválida";
              ok = false;
            }
            return;
          }

          if (isEmpty(value)) {
            newErrors[key] = "Este campo es requerido";
            ok = false;
          }
        });

        if (Number(c.identity_type) === 1) {
          const id = String(c.identification || "").trim();
          if (!id || id.length !== 14) {
            newErrors.identification =
              "Cédula de identidad debe tener 14 dígitos";
            ok = false;
          }
        }

        if (!isSingle && conamiRegulated) {
          const spouseRequired = [
            "spouse_name",
            "spouse_telephone",
            "spouse_position",
          ];

          spouseRequired.forEach((key) => {
            if (isEmpty(c[key])) {
              newErrors[key] = "Este campo es requerido";
              ok = false;
            }
          });
        }

        return { ok, errors: newErrors };
      },
    }));

    const capitalizeWords = (str) =>
      String(str || "").replace(/\b\w/g, (l) => l.toUpperCase());

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

    const clearFieldError = (name) => {
      if (!errors[name]) return;

      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    };

    const handleInputChange = (e) => {
      const { name, value } = e.target;

      setCustomer((prev) => {
        const next = { ...prev, [name]: value };

        if (name === "economic_activity") {
          setIsEmployee(Number(value) === 2);
        }

        if (name === "customer_name") {
          next.customer_name = capitalizeWords(value);
        }

        if (name === "public_name") {
          next.public_name = capitalizeWords(value);
        }

        if (name === "spouse_name") {
          next.spouse_name = capitalizeWords(value);
        }

        if (name === "province_id") {
          next.municipality_id = null;
        }

        if (name === "identity_issue_date" && value) {
          next.identity_expiration_date = dayjs(value).add(10, "year");
        }

        if (name === "identification") {
          const birthDate = extractDateFromIdentification(value);
          if (birthDate) {
            next.birth_date = birthDate;
            next.age = calculateAge(birthDate);
          }
        }

        if (name === "birth_date" && value) {
          const bd = dayjs(value);
          next.age = calculateAge(bd);
        }

        return next;
      });

      clearFieldError(name);
    };

    const isSingle =
      Number(customer?.marital_status_id) === 1 ||
      Number(customer?.marital_status_id) === 3 ||
      Number(customer?.marital_status_id) === 4;

    return (
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Stack spacing={1.3}>
          <Section
            title="Datos personales"
            subtitle="Información principal de identificación del cliente."
          >
            <Grid container spacing={1.2}>
              <Grid item xs={12} md={6}>
                <TextField
                  name="customer_name"
                  label={lbl("Nombre y apellidos", "customer_name")}
                  value={customer?.customer_name || ""}
                  onChange={handleInputChange}
                  error={Boolean(errors.customer_name)}
                  helperText={errors.customer_name || ""}
                  disabled={disabled}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  name="public_name"
                  label={lbl("Nombre conocido públicamente", "public_name")}
                  value={customer?.public_name || ""}
                  onChange={handleInputChange}
                  error={Boolean(errors.public_name)}
                  helperText={errors.public_name || ""}
                  disabled={disabled}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <GenreSelect
                  label={lbl("Género", "genre_id")}
                  value={customer?.genre_id || ""}
                  onChange={(val) =>
                    handleInputChange({
                      target: { name: "genre_id", value: val },
                    })
                  }
                  disabled={disabled}
                  error={Boolean(errors.genre_id)}
                  helperText={errors.genre_id || ""}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4} sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    width: "100%",
                    "& .MuiFormControl-root": { width: "100%" },
                  }}
                >
                  <EstadoCivilSelect
                    value={customer?.marital_status_id ?? ""}
                    onChange={(newId) =>
                      handleInputChange({
                        target: { name: "marital_status_id", value: newId },
                      })
                    }
                    editing={!disabled}
                    disabled={disabled}
                    required={conamiRegulated}
                    error={Boolean(errors.marital_status_id)}
                    helperText={errors.marital_status_id || ""}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  name="cellphone"
                  label={lbl("Celular", "cellphone")}
                  value={customer?.cellphone || ""}
                  onChange={handleInputChange}
                  error={Boolean(errors.cellphone)}
                  helperText={errors.cellphone || ""}
                  disabled={disabled}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  name="telephone"
                  label="Teléfono fijo"
                  value={customer?.telephone || ""}
                  onChange={handleInputChange}
                  disabled={disabled}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  select
                  name="customer_type"
                  label="Tipo de cliente"
                  value={customer?.customer_type || "DEUDOR"}
                  onChange={handleInputChange}
                  disabled={disabled}
                  fullWidth
                  size="small"
                  helperText="Fiador/Ambos permite seleccionar a esta persona como fiador de un crédito"
                >
                  <MenuItem value="DEUDOR">Deudor</MenuItem>
                  <MenuItem value="FIADOR">Fiador</MenuItem>
                  <MenuItem value="AMBOS">Ambos</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  name="email"
                  label="Correo electrónico"
                  value={customer?.email || ""}
                  onChange={handleInputChange}
                  disabled={disabled}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  name="age"
                  label="Edad"
                  value={customer?.age ?? ""}
                  disabled
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Section>

          <Section
            title="Identificación"
            subtitle="Documento legal, país de emisión y fechas de vigencia."
            titleIcon={
              customer?.id ? (
                <Tooltip title={customer?.identity_verified_at ? "Identidad verificada" : "Identidad sin verificar"}>
                  {customer?.identity_verified_at ? (
                    <CheckCircleIcon fontSize="small" sx={{ color: "var(--cm-success-text, #2E7D32)" }} />
                  ) : (
                    <ErrorOutlineIcon fontSize="small" sx={{ color: "var(--cm-warning-text, #ED6C02)" }} />
                  )}
                </Tooltip>
              ) : null
            }
          >
            <Grid container spacing={1.2}>
              <Grid item xs={12} md={3}>
                <TipoDocumentoSelect
                  name="identity_type"
                  label={lbl("Tipo de identificación", "identity_type")}
                  value={customer?.identity_type ?? ""}
                  onChange={handleInputChange}
                  disabled={disabled}
                  error={Boolean(errors.identity_type)}
                  helperText={errors.identity_type || ""}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  name="identification"
                  label={lbl("Número de identificación", "identification")}
                  value={customer?.identification || ""}
                  onChange={handleInputChange}
                  error={Boolean(errors.identification)}
                  helperText={errors.identification || ""}
                  disabled={disabled}
                  autoComplete="off"
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <DatePicker
                  label={lbl("Fecha de emisión", "identity_issue_date")}
                  value={customer?.identity_issue_date || null}
                  onChange={(newValue) =>
                    handleInputChange({
                      target: {
                        name: "identity_issue_date",
                        value: newValue,
                      },
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      size="small"
                      error={Boolean(errors.identity_issue_date)}
                      helperText={errors.identity_issue_date || ""}
                    />
                  )}
                  disabled={disabled}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <DatePicker
                  label={lbl("Fecha de vencimiento", "identity_expiration_date")}
                  value={customer?.identity_expiration_date || null}
                  onChange={(newValue) =>
                    handleInputChange({
                      target: {
                        name: "identity_expiration_date",
                        value: newValue,
                      },
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      size="small"
                      error={Boolean(errors.identity_expiration_date)}
                      helperText={errors.identity_expiration_date || ""}
                    />
                  )}
                  disabled={disabled}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <CountrySelect
                  name="identity_issue_country"
                  label={lbl("País de emisión", "identity_issue_country")}
                  value={customer?.identity_issue_country}
                  selected={customer?.identity_issue_country}
                  onChange={handleInputChange}
                  editing={!disabled}
                  disabled={disabled}
                  error={Boolean(errors.identity_issue_country)}
                  helperText={errors.identity_issue_country || ""}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <CountrySelect
                  name="birth_country_id"
                  label={lbl("País de nacimiento", "birth_country_id")}
                  value={customer?.birth_country_id}
                  selected={customer?.birth_country_id}
                  onChange={handleInputChange}
                  editing={!disabled}
                  disabled={disabled}
                  error={Boolean(errors.birth_country_id)}
                  helperText={errors.birth_country_id || ""}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <CountrySelect
                  name="nationality_id"
                  label={lbl("Nacionalidad", "nationality_id")}
                  value={customer?.nationality_id}
                  selected={customer?.nationality_id}
                  onChange={handleInputChange}
                  editing={!disabled}
                  disabled={disabled}
                  error={Boolean(errors.nationality_id)}
                  helperText={errors.nationality_id || ""}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <DatePicker
                  label={lbl("Fecha de nacimiento", "birth_date")}
                  value={customer?.birth_date || null}
                  onChange={(newValue) =>
                    handleInputChange({
                      target: {
                        name: "birth_date",
                        value: newValue,
                      },
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      size="small"
                      error={Boolean(errors.birth_date)}
                      helperText={errors.birth_date || ""}
                    />
                  )}
                  disabled={disabled}
                />
              </Grid>
            </Grid>
          </Section>

          <Section
            title="Dirección domiciliar"
            subtitle="Ubicación de residencia actual del cliente."
          >
            <Grid container spacing={1.2}>
              <Grid item xs={12}>
                <TextField
                  name="home_address"
                  label={lbl("Dirección del hogar", "home_address")}
                  value={customer?.home_address || ""}
                  onChange={handleInputChange}
                  error={Boolean(errors.home_address)}
                  helperText={errors.home_address || ""}
                  disabled={disabled}
                  fullWidth
                  multiline
                  minRows={1}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <CountrySelect
                  name="residence_country_id"
                  label={lbl("País de residencia", "residence_country_id")}
                  value={customer?.residence_country_id ?? ""}
                  selected={customer?.residence_country_id ?? ""}
                  onChange={handleInputChange}
                  editing={!disabled}
                  disabled={disabled}
                  error={Boolean(errors.residence_country_id)}
                  helperText={errors.residence_country_id || ""}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <ProvinceSelect
                  name="province_id"
                  label={lbl("Departamento", "province_id")}
                  selected={customer?.province_id}
                  onChange={handleInputChange}
                  editing={!disabled}
                  disabled={disabled}
                  error={Boolean(errors.province_id)}
                  helperText={errors.province_id || ""}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <MunicipalitySelect
                  name="municipality_id"
                  label={lbl("Municipio", "municipality_id")}
                  value={customer?.municipality_id ?? ""}
                  provinceId={customer?.province_id ?? ""}
                  onChange={handleInputChange}
                  editing={!disabled}
                  disabled={disabled}
                  error={Boolean(errors.municipality_id)}
                  helperText={errors.municipality_id || ""}
                />
              </Grid>
            </Grid>
          </Section>

          <Section
            title="Datos del cónyuge"
            subtitle={
              isSingle
                ? "No requerido para estado civil soltero, divorciado o viudo."
                : !conamiRegulated
                ? "Información básica del cónyuge (opcional)."
                : "Información básica del cónyuge."
            }
          >
            <Grid container spacing={1.2}>
              <Grid item xs={12} md={6}>
                <TextField
                  name="spouse_name"
                  label={isSingle || !conamiRegulated ? "Nombre" : "Nombre *"}
                  value={customer?.spouse_name || ""}
                  onChange={handleInputChange}
                  error={Boolean(errors.spouse_name)}
                  helperText={errors.spouse_name || ""}
                  disabled={disabled || isSingle}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  name="spouse_telephone"
                  label={isSingle || !conamiRegulated ? "Teléfono" : "Teléfono *"}
                  value={customer?.spouse_telephone || ""}
                  onChange={handleInputChange}
                  error={Boolean(errors.spouse_telephone)}
                  helperText={errors.spouse_telephone || ""}
                  disabled={disabled || isSingle}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  name="spouse_position"
                  label={isSingle || !conamiRegulated ? "Ocupación" : "Ocupación *"}
                  value={customer?.spouse_position || ""}
                  onChange={handleInputChange}
                  error={Boolean(errors.spouse_position)}
                  helperText={errors.spouse_position || ""}
                  disabled={disabled || isSingle}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="spouse_address"
                  label="Domicilio"
                  value={customer?.spouse_address || ""}
                  onChange={handleInputChange}
                  disabled={disabled || isSingle}
                  fullWidth
                  multiline
                  minRows={1}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={5}>
                <TextField
                  name="spouse_job_company"
                  label="Empresa donde labora"
                  value={customer?.spouse_job_company || ""}
                  onChange={handleInputChange}
                  disabled={disabled || isSingle}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  name="spouse_job_telephone"
                  label="Teléfono trabajo"
                  value={customer?.spouse_job_telephone || ""}
                  onChange={handleInputChange}
                  disabled={disabled || isSingle}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  name="spouse_job_salary"
                  label="Salario mensual"
                  value={customer?.spouse_job_salary ?? 0}
                  onChange={handleInputChange}
                  disabled={disabled || isSingle}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Section>
        </Stack>
      </LocalizationProvider>
    );
  },
);

export default CustomerGeneralInfoTab;
