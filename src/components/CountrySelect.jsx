import React, { useEffect, useMemo, useState } from "react";
import { FormControl, InputLabel, Select, MenuItem, FormHelperText } from "@mui/material";

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
  onChange,
  label = "País",
  name = "country_id",
  editing = true,          // true: respeta value del padre
  disabled = false,
  size = "small",
  error,
  helperText,
}) {
  const [countries, setCountries] = useState([]);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    const fetchApi = async () => {
      try {
        setFetchError("");
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error("Failed to retrieve data.");
        const jsonData = await response.json().catch(() => []);
        setCountries(Array.isArray(jsonData) ? jsonData : []);
      } catch (e) {
        console.error(e);
        setFetchError("Failed to retrieve data. Please try again later.");
        setCountries([]);
      }
    };
    fetchApi();
  }, []);

  const hasOptions = countries.length > 0;
  const numericValue = useMemo(() => toNumberOrEmpty(value), [value]);

  // ✅ Si NO estás editando (creación) y no hay value en el padre, elegimos default
  //    PERO también lo escribimos al padre llamando onChange.
  useEffect(() => {
    if (!hasOptions) return;
    if (editing) return;

    if (numericValue !== "") return; // ya hay algo seteado en el padre

    const defaultOpt = countries.find((c) => String(c.isDefault) === "1") ?? countries[0];
    if (defaultOpt?.id != null) {
      onChange?.({ target: { name, value: Number(defaultOpt.id) } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOptions, editing]);

  const handleSelectChange = (e) => {
    const normalized = toNumberOrEmpty(e.target.value);
    onChange?.({ target: { name, value: normalized } }); // ✅ evento estándar
  };

  return (
    <FormControl sx={{ mt: 1, ml: 1, minWidth: 200 }} size={size} disabled={disabled} error={Boolean(error)}>
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
