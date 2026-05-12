import React, { useEffect, useMemo, useState } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";

const url = process.env.REACT_APP_API_BASE_URL + "/api/countries";
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

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
  const [countries, setCountries] = useState([]);
  const [fetchError, setFetchError] = useState("");

  const currentValue = value ?? selected ?? "";

  useEffect(() => {
    const fetchApi = async () => {
      try {
        setFetchError("");

        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error("Failed to retrieve data.");
        }

        const jsonData = await response.json().catch(() => []);
        setCountries(Array.isArray(jsonData) ? jsonData : []);
      } catch (e) {
        console.error(e);
        setFetchError("No se pudieron cargar los países.");
        setCountries([]);
      }
    };

    fetchApi();
  }, []);

  const hasOptions = countries.length > 0;

  const numericValue = useMemo(
    () => toNumberOrEmpty(currentValue),
    [currentValue],
  );

  useEffect(() => {
    if (!hasOptions) return;
    if (editing) return;
    if (numericValue !== "") return;

    const defaultOpt =
      countries.find((c) => String(c.isDefault) === "1") ?? countries[0];

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
