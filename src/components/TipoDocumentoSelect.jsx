import React, { useEffect, useMemo } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import useCachedFetch from "../hooks/useCachedFetch";

const toNumberOrEmpty = (v) => {
  if (v === "" || v === null || v === undefined) return "";

  const n = Number(v);

  return Number.isNaN(n) ? "" : n;
};

export default function TipoDocumentoSelect({
  value,
  selected,
  onChange,
  label = "Tipo de documento",
  name = "identity_type",
  disabled = false,
  size = "small",
  error = false,
  helperText = "",
  fullWidth = true,
}) {
  const currentValue = value ?? selected ?? "";

  const numericValue = useMemo(
    () => toNumberOrEmpty(currentValue),
    [currentValue],
  );

  const { data: rawData, error: fetchApiError } = useCachedFetch(
    "/api/conami/tipo-documento",
  );
  const fetchError = fetchApiError
    ? "No se pudieron cargar los tipos de documento"
    : "";

  const options = useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (Array.isArray(rawData?.data)) return rawData.data;
    return [];
  }, [rawData]);

  // Seleccionar default automáticamente
  useEffect(() => {
    if (numericValue === "" && options.length > 0) {
      const defaultOption =
        options.find((r) => Number(r.is_default) === 1) ?? options[0];

      if (defaultOption?.id != null) {
        onChange?.({
          target: {
            name,
            value: Number(defaultOption.id),
          },
        });
      }
    }
  }, [numericValue, options, onChange, name]);

  const handleChange = (e) => {
    const normalized = toNumberOrEmpty(e.target.value);

    onChange?.({
      target: {
        name,
        value: normalized,
      },
    });
  };

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      error={Boolean(error || fetchError)}
    >
      <InputLabel id={`${name}-label`}>{label}</InputLabel>

      <Select
        labelId={`${name}-label`}
        label={label}
        name={name}
        value={numericValue}
        onChange={handleChange}
      >
        <MenuItem value="">
          <em>Seleccione...</em>
        </MenuItem>

        {options
          .filter((o) => Number(o.active) === 1)
          .map((item) => (
            <MenuItem key={item.id} value={Number(item.id)}>
              {item.name}
            </MenuItem>
          ))}
      </Select>

      {(helperText || fetchError || error) && (
        <FormHelperText>
          {helperText || fetchError || (typeof error === "string" ? error : "")}
        </FormHelperText>
      )}
    </FormControl>
  );
}
