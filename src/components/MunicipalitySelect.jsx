import React, { useEffect, useMemo, useId } from "react";
import {
  FormControl,
  MenuItem,
  Select,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import useCachedFetch from "../hooks/useCachedFetch";

const DEFAULT_URL = "/api/municipalities";

const toNumberOrEmpty = (v) => {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(v);
  return Number.isNaN(n) ? "" : n;
};

const MunicipalitySelect = ({
  value,
  provinceId,
  name = "municipality_id",
  label = "Municipio",
  onChange,
  error,
  helperText = "",
  disabled = false,
  size = "small",
  fullWidth = true,
  endpoint = DEFAULT_URL,
}) => {
  const inputId = useId();
  const labelId = `${inputId}-${name}-label`;
  const selectId = `${inputId}-${name}`;

  const { data: rawData, error: fetchApiError } = useCachedFetch(endpoint);
  const fetchError = fetchApiError ? "No se pudieron cargar los municipios." : "";

  const municipalities = useMemo(() => {
    const list = Array.isArray(rawData) ? rawData : rawData?.data;
    return Array.isArray(list) ? list : [];
  }, [rawData]);

  const hasOptions = municipalities.length > 0;
  const numericProvinceId = toNumberOrEmpty(provinceId);
  const numericValue = toNumberOrEmpty(value);

  const filteredCities = useMemo(() => {
    if (!numericProvinceId) return municipalities;
    return municipalities.filter(
      (m) => Number(m.province_id) === Number(numericProvinceId),
    );
  }, [municipalities, numericProvinceId]);

  useEffect(() => {
    if (!hasOptions) return;
    if (numericValue === "") return;

    const exists = filteredCities.some(
      (m) => Number(m.id) === Number(numericValue),
    );

    if (!exists) {
      onChange?.({ target: { name, value: "" } });
    }
  }, [hasOptions, numericValue, filteredCities, name, onChange]);

  const handleSelectChange = (e) => {
    const normalized = toNumberOrEmpty(e.target.value);
    onChange?.({ target: { name, value: normalized } });
  };

  const finalHelperText =
    (typeof error === "string" ? error : "") || fetchError || helperText || " ";

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      error={Boolean(error || fetchError)}
      variant="outlined"
    >
      <InputLabel id={labelId} shrink>
        {label}
      </InputLabel>

      <Select
        labelId={labelId}
        id={selectId}
        name={name}
        label={label}
        value={hasOptions ? numericValue : ""}
        onChange={handleSelectChange}
        displayEmpty
        renderValue={(selectedValue) => {
          if (
            selectedValue === "" ||
            selectedValue === null ||
            selectedValue === undefined
          ) {
            return <span style={{ color: "#9e9e9e" }}>Seleccione...</span>;
          }

          const municipality = filteredCities.find(
            (item) => Number(item.id) === Number(selectedValue),
          );

          return municipality ? municipality.name : "";
        }}
        sx={{
          borderRadius: 2,
          backgroundColor: "#fff",
        }}
      >
        <MenuItem value="">
          <em>Seleccione...</em>
        </MenuItem>

        {filteredCities.map((m) => (
          <MenuItem key={m.id} value={Number(m.id)}>
            {m.name}
          </MenuItem>
        ))}
      </Select>

      <FormHelperText>{finalHelperText}</FormHelperText>
    </FormControl>
  );
};

export default MunicipalitySelect;
