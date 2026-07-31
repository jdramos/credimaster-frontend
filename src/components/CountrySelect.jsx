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

export default function CountrySelect({
  value,
  selected,
  onChange,
  label = "País",
  name = "country_id",
  editing = true,
  disabled = false,
  size = "small",
  error = false,
  helperText = "",
  fullWidth = true,
}) {
  const currentValue = value ?? selected ?? "";

  const { data: rawData, error: fetchApiError } = useCachedFetch("/api/countries");
  const fetchError = fetchApiError ? "No se pudieron cargar los países." : "";

  const countries = useMemo(
    () => (Array.isArray(rawData) ? rawData : []),
    [rawData],
  );

  const hasOptions = countries.length > 0;

  const numericValue = useMemo(
    () => toNumberOrEmpty(currentValue),
    [currentValue],
  );

  useEffect(() => {
    if (!hasOptions) return;
    if (numericValue !== "") return;

    const defaultOpt =
      countries.find(
        (c) =>
          Number(c.favorite) === 1 ||
          Number(c.is_favorite) === 1 ||
          Number(c.isDefault) === 1,
      ) ?? countries[0];

    if (defaultOpt?.id != null) {
      onChange?.({
        target: {
          name,
          value: Number(defaultOpt.id),
        },
      });
    }
  }, [hasOptions, editing, numericValue, countries, name, onChange]);

  const handleSelectChange = (e) => {
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
      sx={{
        width: fullWidth ? "100%" : "auto",
        minWidth: 0,
        m: 0,
      }}
    >
      <InputLabel id={`${name}-label`}>{label}</InputLabel>

      <Select
        labelId={`${name}-label`}
        label={label}
        name={name}
        value={numericValue}
        onChange={handleSelectChange}
      >
        <MenuItem value="">
          <em>Seleccione...</em>
        </MenuItem>

        {countries.map((c) => (
          <MenuItem key={c.id} value={Number(c.id)}>
            {c.name}
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
