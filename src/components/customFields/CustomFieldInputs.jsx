import React from "react";
import { Box, FormControl, FormHelperText, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { errorKeyFor, fieldsInSection, formatCustomFieldValue } from "./customFieldsShared";

const booleanToSelect = (value) => {
  if (value === true || value === 1 || value === "1" || value === "true") return "true";
  if (value === false || value === 0 || value === "0" || value === "false") return "false";
  return "";
};

const FieldInput = ({ field, value, error, onChange, readOnly, size }) => {
  const label = Number(field.is_required) === 1 ? `${field.label} *` : field.label;
  const helperText = error || field.help_text || "";
  const name = errorKeyFor(field);

  if (readOnly) {
    return (
      <Box>
        <Typography variant="caption" color="text.secondary">{field.label}</Typography>
        <Typography sx={{ fontWeight: 600 }}>{formatCustomFieldValue(field, value)}</Typography>
      </Box>
    );
  }

  if (field.field_type === "BOOLEAN" || field.field_type === "LIST") {
    const options = field.field_type === "BOOLEAN"
      ? [{ value: "true", label: "Sí" }, { value: "false", label: "No" }]
      : (field.options || []).map((option) => ({ value: option, label: option }));
    const current = field.field_type === "BOOLEAN" ? booleanToSelect(value) : value ?? "";
    const labelId = `${name}-label`;
    return (
      <FormControl fullWidth size={size} error={Boolean(error)}>
        <InputLabel id={labelId}>{label}</InputLabel>
        <Select
          labelId={labelId}
          label={label}
          name={name}
          value={current}
          inputProps={{ "data-testid": name }}
          onChange={(e) => {
            const next = e.target.value;
            onChange(field.field_key, field.field_type === "BOOLEAN" ? (next === "" ? null : next === "true") : next);
          }}
        >
          <MenuItem value="">
            <em>Sin dato</em>
          </MenuItem>
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </Select>
        {helperText && <FormHelperText>{helperText}</FormHelperText>}
      </FormControl>
    );
  }

  return (
    <TextField
      fullWidth
      size={size}
      name={name}
      label={label}
      type={field.field_type === "NUMBER" ? "number" : field.field_type === "DATE" ? "date" : "text"}
      value={value ?? ""}
      onChange={(e) => onChange(field.field_key, e.target.value)}
      error={Boolean(error)}
      helperText={helperText}
      InputLabelProps={field.field_type === "DATE" ? { shrink: true } : undefined}
      inputProps={{
        "data-testid": name,
        ...(field.field_type === "TEXT" ? { maxLength: 1000 } : {}),
        ...(field.field_type === "NUMBER" ? { step: "any" } : {}),
      }}
    />
  );
};

// Campos personalizados de una sección del formulario. No pinta nada si la
// empresa no tiene campos activos en esa sección.
const CustomFieldInputs = ({
  fields = [],
  section,
  values = {},
  errors = {},
  onChange,
  readOnly = false,
  title = "Campos personalizados",
  size = "small",
  sx,
}) => {
  const visible = section ? fieldsInSection(fields, section) : fields;
  if (!visible.length) return null;

  return (
    <Box sx={{ mt: 2, ...sx }} data-testid={`custom-fields-${section || "all"}`}>
      {title && (
        <Typography sx={{ fontWeight: 800, mb: 1 }} variant="subtitle2">
          {title}
        </Typography>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 2,
          alignItems: "start",
        }}
      >
        {visible.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.field_key]}
            error={errors[errorKeyFor(field)]}
            onChange={onChange}
            readOnly={readOnly}
            size={size}
          />
        ))}
      </Box>
    </Box>
  );
};

export default CustomFieldInputs;
