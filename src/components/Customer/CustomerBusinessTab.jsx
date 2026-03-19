import React, { useImperativeHandle, forwardRef, useMemo } from "react";
import dayjs from "dayjs";
import DividerChip from "../DividerChip";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import BusinessTypeSelect from "../BusinessTypeSelect";
import {
  Box,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormHelperText,
  Stack,
  Grid,
  Divider,
} from "@mui/material";
import { NumericFormat } from "react-number-format";
import EconomicActivitySelect from "../conami/actividadEconomicaSelect";

const CustomerBusinessTab = forwardRef(
  (
    {
      customer,
      setCustomer,
      errors,
      setErrors,
      isEmployee,
      setIsEmployee,
      mode,
    },
    ref
  ) => {
    const disabled = mode === "show";

    // helpers
    const isEmpty = (v) =>
      v === null ||
      v === undefined ||
      (typeof v === "string" && v.trim() === "");

    const setFieldError = (name, value) => {
      const empty =
        value === null ||
        value === undefined ||
        (typeof value === "string" && value.trim() === "");
      setErrors((prev) => ({ ...prev, [name]: empty ? "Este campo es requerido" : "" }));
    };

    const clearTabErrors = (prev) => {
      const copy = { ...prev };
      tabFields.forEach((k) => delete copy[k]);
      return copy;
    };

    // todos los campos que este TAB controla (para limpiar errores viejos)
    const tabFields = useMemo(
      () => [
        "economic_activity",
        "conami_id_actividad_economica",

        // empleado
        "occupation",
        "company",
        "job_start_day",
        "monthly_salary",
        "annual_salary",
        "job_telephone", // (NO requerido, pero lo controlamos para limpiar)

        // negocio
        "business_name",
        "business_type_id",
        "business_address",
        "business_telephone",
        "business_inventory",
        "business_receivables",
        "business_monthly_income",
        "business_annual_income",

        // licencias
        "business_license_entity",
        "business_license_issued",
        "business_license_expiry",
      ],
      []
    );

    // ============================================================
    // VALIDATE (solo este tab)
    // ============================================================
   useImperativeHandle(ref, () => ({
  validate: () => {
    const c = { ...customer };
    const employee = Number(c.economic_activity) === 2;

    const isEmpty = (v) =>
      v === null ||
      v === undefined ||
      (typeof v === "string" && v.trim() === "");

    // ✅ Campos que vienen del GET (joins/calculados) o nombres que no usas en UI
    const ignore = new Set([
      // joins/calculados (NO existen en el form)
      "business_type_name",
      "business_type_weight",
      "business_type_risk",
      "business_risk_value",
      "province_name",
      "municipality_name",
      "province_risk_value",
      "total_loans",

      // nombres que te están apareciendo pero NO están en tu UI
      "inventory_amount", // tu UI usa business_inventory
      "job_salary",       // tu UI usa monthly_salary
    ]);

    // ✅ Requeridos del tab (solo los editables)
    const required = employee
      ? [
          "economic_activity",
          "conami_id_actividad_economica",
          "occupation",
          "company",
          "job_start_day",
          "monthly_salary",
          // 👇 NO querés teléfono obligatorio:
          // "job_telephone",
        ]
      : [
          "economic_activity",
          "conami_id_actividad_economica",
          "business_name",
          "business_type_id",
          "business_address",
          // 👇 NO querés teléfono obligatorio:
          // "business_telephone",
          "business_inventory",
          "business_receivables",
          "business_monthly_income",
        ];

    // opcionales (calculados / no obligatorios)
    const optional = new Set([
      "business_license_entity",
      "business_license_issued",
      "business_license_expiry",
      "business_annual_income", // calculado
      "annual_salary",          // calculado
    ]);

    const newErrors = {};
    let ok = true;

    for (const key of required) {
      if (ignore.has(key) || optional.has(key)) continue;

      const value = c[key];

      // dayjs válido
      if (dayjs.isDayjs(value)) {
        if (!value.isValid()) {
          newErrors[key] = "Fecha inválida";
          ok = false;
        }
        continue;
      }

      // números: 0 válido (si querés que 0 NO valga para alguno, lo controlas aquí)
      if (typeof value === "number") continue;

      if (isEmpty(value)) {
        newErrors[key] = "Este campo es requerido";
        ok = false;
      }
    }

    return { ok, errors: newErrors };
  },
}));

    // ============================================================
    // HANDLE CHANGE (uniforme)
    // ============================================================
    const handleInputChange = (e) => {
      const { name, value } = e.target;

      setCustomer((prev) => {
        const next = { ...prev, [name]: value };

        // normalizar actividad (string/number)
        if (name === "economic_activity") {
          const emp = Number(value) === 2;
          setIsEmployee(emp);

          // limpiar errores que ya no aplican al cambiar modo
          const toClear = emp
            ? [
                "business_name",
                "business_type_id",
                "business_address",
                "business_telephone",
                "business_inventory",
                "business_receivables",
                "business_monthly_income",
              ]
            : ["occupation", "company", "job_start_day", "monthly_salary", "job_telephone", "annual_salary"];

          setErrors((prevErr) => {
            const copy = { ...prevErr };
            toClear.forEach((k) => delete copy[k]);
            return copy;
          });
        }

        // ingresos mensuales -> anual
        if (name === "business_monthly_income") {
          const n = Number(value || 0);
          next.business_monthly_income = n;
          next.business_annual_income = n * 12;
        }

        // salario mensual -> anual
        if (name === "monthly_salary") {
          const n = Number(value || 0);
          next.monthly_salary = n;
          next.annual_salary = n * 12;
        }

        return next;
      });

      // validar campo simple (no rompas con 0)
      setFieldError(name, value);
    };

    // ============================================================
    // UI
    // ============================================================
    return (
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ p: 1 }}>
          <Stack spacing={2}>
            {/* CABECERA */}
            <DividerChip label="Actividad y datos económicos" />

            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small" error={Boolean(errors.economic_activity)}>
                  <InputLabel id="economic_activity_label">Actividad económica</InputLabel>
                  <Select
                    labelId="economic_activity_label"
                    label="Actividad económica"
                    name="economic_activity"
                    value={customer.economic_activity ?? ""}
                    onChange={handleInputChange}
                    disabled={disabled}
                  >
                    <MenuItem value={1}>Negocio propio</MenuItem>
                    <MenuItem value={2}>Empleado</MenuItem>
                  </Select>
                  {errors.economic_activity && <FormHelperText>{errors.economic_activity}</FormHelperText>}
                </FormControl>
              </Grid>

              <Grid item xs={12} md={9}>
                <EconomicActivitySelect
                  editing
                  value={customer.conami_id_actividad_economica ?? ""}
                  name="conami_id_actividad_economica"
                  selected={customer.conami_id_actividad_economica ?? ""}
                  onChange={(val) =>
                    handleInputChange({
                      target: { name: "conami_id_actividad_economica", value: val },
                    })
                  }
                  label="Actividad Económica"
                  disabled={disabled}
                />
                {errors.conami_id_actividad_economica && (
                  <FormHelperText error sx={{ ml: 1 }}>
                    {errors.conami_id_actividad_economica}
                  </FormHelperText>
                )}
              </Grid>
            </Grid>

            {/* EMPLEADO */}
            {Number(customer.economic_activity) === 2 && (
              <>
                <DividerChip label="Datos laborales" />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Profesión / Oficio *"
                      name="occupation"
                      value={customer.occupation ?? ""}
                      onChange={handleInputChange}
                      disabled={disabled}
                      error={Boolean(errors.occupation)}
                      helperText={errors.occupation || ""}
                    />
                  </Grid>

                  <Grid item xs={12} md={5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Empresa *"
                      name="company"
                      value={customer.company ?? ""}
                      onChange={handleInputChange}
                      disabled={disabled}
                      error={Boolean(errors.company)}
                      helperText={errors.company || ""}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Fecha de ingreso *"
                      value={customer.job_start_day ?? null}
                      onChange={(newValue) =>
                        handleInputChange({
                          target: { name: "job_start_day", value: newValue },
                        })
                      }
                      renderInput={(params) => (
                                        <TextField {...params} size="small" sx={{ width: 150, m: 1 }} />
                                      )}
                      disabled={disabled}
                    />
                    </LocalizationProvider>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <NumericFormat
                      customInput={TextField}
                      fullWidth
                      size="small"
                      label="Salario mensual *"
                      name="monthly_salary"
                      value={customer.monthly_salary ?? 0}
                      onValueChange={(values) => {
                        const n = Number(values.floatValue ?? 0);
                        handleInputChange({ target: { name: "monthly_salary", value: n } });
                      }}
                      thousandSeparator
                      decimalScale={2}
                      fixedDecimalScale
                      allowNegative={false}
                      prefix="C$"
                      disabled={disabled}
                      error={Boolean(errors.monthly_salary)}
                      helperText={errors.monthly_salary || ""}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <NumericFormat
                      customInput={TextField}
                      fullWidth
                      size="small"
                      label="Salario anual"
                      name="annual_salary"
                      value={customer.annual_salary ?? 0}
                      thousandSeparator
                      decimalScale={2}
                      fixedDecimalScale
                      allowNegative={false}
                      prefix="C$"
                      disabled
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Teléfono del trabajo (opcional)"
                      name="job_telephone"
                      value={customer.job_telephone ?? ""}
                      onChange={handleInputChange}
                      disabled={disabled}
                      error={Boolean(errors.job_telephone)}
                      helperText={errors.job_telephone || ""}
                    />
                  </Grid>
                </Grid>
              </>
            )}

            {/* NEGOCIO PROPIO */}
            {Number(customer.economic_activity) !== 2 && (
              <>
                <DividerChip label="Datos del negocio" />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Nombre del negocio *"
                      name="business_name"
                      value={customer.business_name ?? ""}
                      onChange={handleInputChange}
                      disabled={disabled}
                      error={Boolean(errors.business_name)}
                      helperText={errors.business_name || ""}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <BusinessTypeSelect
                      editing
                      label="Tipo de negocio *"
                      selected={customer.business_type_id}
                      name="business_type_id"
                      onChange={handleInputChange}
                      error={errors.business_type_id}
                      disabled={disabled}
                    />
                    {errors.business_type_id && (
                      <FormHelperText error sx={{ ml: 1 }}>
                        {errors.business_type_id}
                      </FormHelperText>
                    )}
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Dirección del negocio *"
                      name="business_address"
                      value={customer.business_address ?? ""}
                      onChange={handleInputChange}
                      disabled={disabled}
                      error={Boolean(errors.business_address)}
                      helperText={errors.business_address || ""}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Teléfono del negocio *"
                      name="business_telephone"
                      value={customer.business_telephone ?? ""}
                      onChange={handleInputChange}
                      disabled={disabled}
                      error={Boolean(errors.business_telephone)}
                      helperText={errors.business_telephone || ""}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <NumericFormat
                      customInput={TextField}
                      fullWidth
                      size="small"
                      label="Inventario *"
                      name="business_inventory"
                      value={customer.business_inventory ?? 0}
                      onValueChange={(values) => {
                        const n = Number(values.floatValue ?? 0);
                        handleInputChange({ target: { name: "business_inventory", value: n } });
                      }}
                      thousandSeparator
                      decimalScale={2}
                      fixedDecimalScale
                      allowNegative={false}
                      prefix="C$"
                      disabled={disabled}
                      error={Boolean(errors.business_inventory)}
                      helperText={errors.business_inventory || ""}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <NumericFormat
                      customInput={TextField}
                      fullWidth
                      size="small"
                      label="Cuentas por cobrar *"
                      name="business_receivables"
                      value={customer.business_receivables ?? 0}
                      onValueChange={(values) => {
                        const n = Number(values.floatValue ?? 0);
                        handleInputChange({ target: { name: "business_receivables", value: n } });
                      }}
                      thousandSeparator
                      decimalScale={2}
                      fixedDecimalScale
                      allowNegative={false}
                      prefix="C$"
                      disabled={disabled}
                      error={Boolean(errors.business_receivables)}
                      helperText={errors.business_receivables || ""}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <NumericFormat
                      customInput={TextField}
                      fullWidth
                      size="small"
                      label="Ingresos mensuales *"
                      name="business_monthly_income"
                      value={customer.business_monthly_income ?? 0}
                      onValueChange={(values) => {
                        const n = Number(values.floatValue ?? 0);
                        handleInputChange({ target: { name: "business_monthly_income", value: n } });
                      }}
                      thousandSeparator
                      decimalScale={2}
                      fixedDecimalScale
                      allowNegative={false}
                      prefix="C$"
                      disabled={disabled}
                      error={Boolean(errors.business_monthly_income)}
                      helperText={errors.business_monthly_income || ""}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <NumericFormat
                      customInput={TextField}
                      fullWidth
                      size="small"
                      label="Ingresos anuales"
                      name="business_annual_income"
                      value={customer.business_annual_income ?? 0}
                      thousandSeparator
                      decimalScale={2}
                      fixedDecimalScale
                      allowNegative={false}
                      prefix="C$"
                      disabled
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ mt: 2 }} />
                <DividerChip label="Permisos y licencias (opcional)" />

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Entidad emisora"
                      name="business_license_entity"
                      value={customer.business_license_entity ?? ""}
                      onChange={handleInputChange}
                      disabled={disabled}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Fecha de emisión"
                      value={customer.business_license_issued ?? null}
                      onChange={(newValue) =>
                        handleInputChange({
                          target: { name: "business_license_issued", value: newValue },
                        })
                      }
                      renderInput={(params) => (
                                        <TextField {...params} size="small" sx={{ width: 150, m: 1 }} />
                                      )}
                      disabled={disabled}
                    />
                    </LocalizationProvider>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Fecha de vencimiento"
                      value={customer.business_license_expiry ?? null}
                      onChange={(newValue) =>
                        handleInputChange({
                          target: { name: "business_license_expiry", value: newValue },
                        })
                      }
                      renderInput={(params) => (
                                        <TextField {...params} size="small" sx={{ width: 150, m: 1 }} />
                                      )}
                      disabled={disabled}
                    />
                    </LocalizationProvider>
                  </Grid>
                </Grid>
              </>
            )}
          </Stack>
        </Box>
      </LocalizationProvider>
    );
  }
);

export default CustomerBusinessTab;
