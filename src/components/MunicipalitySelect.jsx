import React, { useEffect, useState, useMemo } from "react";
import { FormControl, MenuItem, Select, InputLabel, FormHelperText } from "@mui/material";

const url = process.env.REACT_APP_API_BASE_URL + "/api/municipalities";
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

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
  helperText,
  disabled = false,
  size = "small",
}) => {
  const [municipalities, setMunicipalities] = useState([]);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    const fetchApi = async () => {
      try {
        setFetchError("");
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error("Failed to retrieve data.");
        const jsonData = await response.json();
        setMunicipalities(Array.isArray(jsonData) ? jsonData : []);
      } catch (err) {
        setFetchError("No se pudieron cargar municipios.");
        setMunicipalities([]);
      }
    };

    fetchApi();
  }, []);

  const hasOptions = municipalities.length > 0;

  const numericProvinceId = toNumberOrEmpty(provinceId);
  const numericValue = toNumberOrEmpty(value);

  const filteredCities = useMemo(() => {
    if (!numericProvinceId) return municipalities;
    return municipalities.filter((m) => Number(m.province_id) === Number(numericProvinceId));
  }, [municipalities, numericProvinceId]);

  // ✅ limpiar SOLO cuando ya hay opciones cargadas
  useEffect(() => {
    if (!hasOptions) return;         // 🔑 evita limpiar mientras carga
    if (numericValue === "") return;

    const exists = filteredCities.some((m) => Number(m.id) === Number(numericValue));
    if (!exists) {
      onChange?.({ target: { name, value: "" } });
    }
  }, [hasOptions, numericValue, filteredCities, name, onChange]);

  const handleSelectChange = (e) => {
    const normalized = toNumberOrEmpty(e.target.value);
    onChange?.({ target: { name, value: normalized } });
  };

  return (
    <FormControl
      sx={{ mt: 1, ml: 1, minWidth: 200 }}
      size={size}
      disabled={disabled}
      error={Boolean(error)}
    >
      <InputLabel id={`${name}-label`}>{label}</InputLabel>

      <Select
        labelId={`${name}-label`}
        label={label}
        value={hasOptions ? numericValue : ""}   // ✅ evita out-of-range mientras carga
        onChange={handleSelectChange}
        name={name}
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

      {(helperText || fetchError || error) && (
        <FormHelperText>
          {helperText || fetchError || (typeof error === "string" ? error : "")}
        </FormHelperText>
      )}
    </FormControl>
  );
};

export default MunicipalitySelect;
