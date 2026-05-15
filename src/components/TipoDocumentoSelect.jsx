import React, { useEffect, useMemo, useState } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";

const url = process.env.REACT_APP_API_BASE_URL + "/api/conami/tipo-documento";

const token = process.env.REACT_APP_API_TOKEN;

const headers = {
  Authorization: token,
};

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
  const [options, setOptions] = useState([]);
  const [fetchError, setFetchError] = useState("");

  const currentValue = value ?? selected ?? "";

  const numericValue = useMemo(
    () => toNumberOrEmpty(currentValue),
    [currentValue],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchError("");

        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error("Error obteniendo tipos de documento");
        }

        const json = await response.json();

        const rows = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
            ? json.data
            : [];

        setOptions(rows);

        // ✅ Seleccionar default automáticamente
        if (numericValue === "") {
          const defaultOption =
            rows.find((r) => Number(r.is_default) === 1) ?? rows[0];

          if (defaultOption?.id != null) {
            onChange?.({
              target: {
                name,
                value: Number(defaultOption.id),
              },
            });
          }
        }
      } catch (err) {
        console.error(err);

        setFetchError("No se pudieron cargar los tipos de documento");
        setOptions([]);
      }
    };

    fetchData();
  }, []);

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
