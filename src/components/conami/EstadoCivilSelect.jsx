import React, { useEffect, useMemo } from "react";
import {
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import useCachedFetch from "../../hooks/useCachedFetch";

export default function EstadoCivilSelect({
  value, // id seleccionado (controlado por el padre)
  onChange, // devuelve id (number o "")
  label = "Estado civil",
  editing = false,
  name,
  disabled = false,
  required = false,
  size = "small",
  error = false,
  helperText = "",
}) {
  const { data: rawData, loading } = useCachedFetch("/api/conami/estado-civil");

  const options = useMemo(() => {
    const rows = rawData?.rows ?? [];
    return rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      isDefault: Number(r.isDefault || 0),
    }));
  }, [rawData]);

  const defaultId = useMemo(() => {
    if (options.length === 0) return "";
    const def = options.find((o) => o.isDefault === 1) || options[0];
    return def ? def.id : "";
  }, [options]);

  // Normaliza value desde el padre
  const normalizedValue = useMemo(() => {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    return Number.isFinite(n) ? n : "";
  }, [value]);

  // En crear: si viene vacío, setear default una vez
  useEffect(() => {
    if (!editing && options.length > 0) {
      if (normalizedValue === "" && defaultId !== "") {
        onChange?.(defaultId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, options.length, defaultId, normalizedValue]);

  // value que se muestra (controlado)
  const selectValue = editing
    ? normalizedValue
    : normalizedValue !== ""
      ? normalizedValue
      : defaultId;

  const handleChange = (e) => {
    const v = e.target.value === "" ? "" : Number(e.target.value);
    onChange?.(v);
  };

  return (
    <FormControl
      fullWidth
      size={size}
      disabled={disabled || loading}
      required={required}
      error={Boolean(error)}
      sx={{
        width: "100%",
        minWidth: 0,
        m: 0,
      }}
    >
      <InputLabel id="estado-civil-label">{label}</InputLabel>

      <Select
        labelId="estado-civil-label"
        label={label}
        value={selectValue}
        onChange={handleChange}
        name={name}
      >
        <MenuItem value="">
          <em>Seleccione...</em>
        </MenuItem>

        {options.map((opt) => (
          <MenuItem key={opt.id} value={opt.id}>
            {`${opt.id} - ${opt.name}`}
          </MenuItem>
        ))}
      </Select>

      {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
    </FormControl>
  );
}
