import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { useReportDefinition } from "../customs/context/ReportDefinitionContext";
import API from "../../api";

const BAC = {
  border: "#D8E2F0",
  muted: "#6B7280",
};

const OPERATORS_BY_TYPE = {
  string: [
    { value: "contains", label: "Contiene" },
    { value: "=", label: "Igual a" },
    { value: "<>", label: "Diferente de" },
    { value: "startsWith", label: "Empieza con" },
    { value: "endsWith", label: "Termina con" },
    { value: "isEmpty", label: "Está vacío" },
    { value: "isNotEmpty", label: "No está vacío" },
  ],
  date: [
    { value: "=", label: "Igual a" },
    { value: "between", label: "Entre" },
    { value: ">", label: "Mayor que" },
    { value: "<", label: "Menor que" },
    { value: ">=", label: "Mayor o igual" },
    { value: "<=", label: "Menor o igual" },
    { value: "isEmpty", label: "Está vacío" },
    { value: "isNotEmpty", label: "No está vacío" },
  ],
  number: [
    { value: "=", label: "Igual a" },
    { value: "between", label: "Entre" },
    { value: ">", label: "Mayor que" },
    { value: "<", label: "Menor que" },
    { value: ">=", label: "Mayor o igual" },
    { value: "<=", label: "Menor o igual" },
    { value: "isEmpty", label: "Está vacío" },
    { value: "isNotEmpty", label: "No está vacío" },
  ],
  currency: [
    { value: "=", label: "Igual a" },
    { value: "between", label: "Entre" },
    { value: ">", label: "Mayor que" },
    { value: "<", label: "Menor que" },
    { value: ">=", label: "Mayor o igual" },
    { value: "<=", label: "Menor o igual" },
    { value: "isEmpty", label: "Está vacío" },
    { value: "isNotEmpty", label: "No está vacío" },
  ],
  lookup: [
    { value: "=", label: "Igual a" },
    { value: "<>", label: "Diferente de" },
    { value: "in", label: "En lista" },
    { value: "notIn", label: "No está en lista" },
    { value: "isEmpty", label: "Está vacío" },
    { value: "isNotEmpty", label: "No está vacío" },
  ],
};

const getDefaultOperator = (field) => {
  if (!field) return "=";
  if (field.type === "string") return "contains";
  if (field.type === "lookup") return "=";
  return "=";
};

const getDefaultValue = (field, operator) => {
  if (["isEmpty", "isNotEmpty"].includes(operator)) return null;
  if (operator === "between") return ["", ""];
  if (["in", "notIn"].includes(operator)) return [];
  return "";
};

const FiltersTab = () => {
  const { definition, filterableFields, fieldMap, setFilters } =
    useReportDefinition();

  const selectedFilterableFields = useMemo(() => {
    const selectedNames = definition.fields.map((f) => f.name);

    return filterableFields.filter((field) =>
      selectedNames.includes(field.name),
    );
  }, [definition.fields, filterableFields]);

  const addFilter = () => {
    const firstField = selectedFilterableFields[0];

    if (!firstField) return;

    const operator = getDefaultOperator(firstField);

    setFilters([
      ...(definition.filters || []),
      {
        field: firstField.name,
        operator,
        value: getDefaultValue(firstField, operator),
      },
    ]);
  };

  const updateFilter = (index, patch) => {
    const next = [...(definition.filters || [])];

    next[index] = {
      ...next[index],
      ...patch,
    };

    setFilters(next);
  };

  const removeFilter = (index) => {
    setFilters((definition.filters || []).filter((_, i) => i !== index));
  };

  const handleFieldChange = (index, fieldName) => {
    const selectedField = fieldMap[fieldName];
    const operator = getDefaultOperator(selectedField);

    updateFilter(index, {
      field: fieldName,
      operator,
      value: getDefaultValue(selectedField, operator),
    });
  };

  const handleOperatorChange = (index, operator) => {
    const filter = definition.filters[index];
    const selectedField = fieldMap[filter.field];

    updateFilter(index, {
      operator,
      value: getDefaultValue(selectedField, operator),
    });
  };

  if (!definition.source) {
    return (
      <Alert severity="info">
        Primero selecciona una fuente de datos en la pestaña General.
      </Alert>
    );
  }

  if (!definition.fields?.length) {
    return (
      <Alert severity="info">
        Primero selecciona campos en la pestaña Campos.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Filtros del reporte
          </Typography>

          <Typography variant="body2" sx={{ color: BAC.muted }}>
            Define condiciones adicionales para limitar los datos del reporte.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={addFilter}
          disabled={!selectedFilterableFields.length}
        >
          Agregar filtro
        </Button>
      </Stack>

      {(definition.filters || []).length === 0 ? (
        <Alert severity="info">
          Este reporte no tiene filtros personalizados.
        </Alert>
      ) : (
        <Stack spacing={1.5}>
          {(definition.filters || []).map((filter, index) => {
            const selectedField = fieldMap[filter.field];
            const operators =
              OPERATORS_BY_TYPE[selectedField?.type || "string"] || [];

            return (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 1.5,
                  border: `1px solid ${BAC.border}`,
                  borderRadius: 2,
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems="center"
                >
                  <TextField
                    select
                    label="Campo"
                    size="small"
                    value={filter.field || ""}
                    onChange={(e) => handleFieldChange(index, e.target.value)}
                    sx={{ minWidth: 260 }}
                  >
                    {selectedFilterableFields.map((field) => (
                      <MenuItem key={field.name} value={field.name}>
                        {field.category} / {field.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Operador"
                    size="small"
                    value={filter.operator || ""}
                    onChange={(e) =>
                      handleOperatorChange(index, e.target.value)
                    }
                    sx={{ minWidth: 180 }}
                  >
                    {operators.map((op) => (
                      <MenuItem key={op.value} value={op.value}>
                        {op.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <FilterValueInput
                    filter={filter}
                    field={selectedField}
                    onChange={(value) => updateFilter(index, { value })}
                  />

                  <IconButton color="error" onClick={() => removeFilter(index)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

const FilterValueInput = ({ filter, field, onChange }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      if (!field?.lookup) return;

      try {
        setLoading(true);

        const res = await API.get(
          `/api/custom-reports/lookups/${field.lookup}`,
        );

        setOptions(res.data?.data || []);
      } catch (error) {
        console.error("Error cargando lookup:", error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [field?.lookup]);

  const operator = filter.operator;

  if (["isEmpty", "isNotEmpty"].includes(operator)) {
    return (
      <TextField
        size="small"
        label="Valor"
        value="No requiere valor"
        disabled
        sx={{ minWidth: 220 }}
      />
    );
  }

  if (field?.lookup) {
    if (["in", "notIn"].includes(operator)) {
      const selectedValues = Array.isArray(filter.value) ? filter.value : [];

      return (
        <TextField
          select
          size="small"
          label={loading ? "Cargando..." : "Valor"}
          value={selectedValues}
          onChange={(e) => onChange(e.target.value)}
          SelectProps={{ multiple: true }}
          sx={{ minWidth: 300 }}
          disabled={loading}
        >
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    return (
      <TextField
        select
        size="small"
        label={loading ? "Cargando..." : "Valor"}
        value={filter.value || ""}
        onChange={(e) => onChange(e.target.value)}
        sx={{ minWidth: 300 }}
        disabled={loading}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (operator === "between") {
    const value = Array.isArray(filter.value) ? filter.value : ["", ""];

    return (
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label="Desde"
          type={field?.type === "date" ? "date" : "number"}
          value={value[0] || ""}
          onChange={(e) => onChange([e.target.value, value[1] || ""])}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />

        <TextField
          size="small"
          label="Hasta"
          type={field?.type === "date" ? "date" : "number"}
          value={value[1] || ""}
          onChange={(e) => onChange([value[0] || "", e.target.value])}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 160 }}
        />
      </Stack>
    );
  }

  if (["in", "notIn"].includes(operator)) {
    return (
      <TextField
        size="small"
        label="Valores separados por coma"
        value={Array.isArray(filter.value) ? filter.value.join(",") : ""}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          )
        }
        sx={{ minWidth: 300 }}
      />
    );
  }

  return (
    <TextField
      size="small"
      label="Valor"
      type={
        field?.type === "date"
          ? "date"
          : field?.type === "number" || field?.type === "currency"
            ? "number"
            : "text"
      }
      value={filter.value || ""}
      onChange={(e) => onChange(e.target.value)}
      InputLabelProps={field?.type === "date" ? { shrink: true } : undefined}
      sx={{ minWidth: 240 }}
    />
  );
};

export default FiltersTab;
