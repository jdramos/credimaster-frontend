import React, { useEffect, useState } from "react";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormHelperText from "@mui/material/FormHelperText";

const url = process.env.REACT_APP_API_BASE_URL + "/api/provinces";
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

const ProvinceSelect = ({
  value,
  selected,      // (opcional) por compatibilidad si lo usas en edición
  editing = false,
  onChange,
  name = "province_id",
  label = "Departamento",
  error,
  disabled = false,
  size = "small",
}) => {
  const [provinces, setProvinces] = useState([]);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    const fetchApi = async () => {
      try {
        setFetchError("");
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error("Failed to retrieve data.");
        const jsonData = await response.json();
        setProvinces(Array.isArray(jsonData) ? jsonData : []);
      } catch (e) {
        console.error(e);
        setFetchError("No se pudieron cargar las provincias.");
        setProvinces([]);
      }
    };

    fetchApi();
  }, []);

  // Valor controlado: si estás editando y mandas selected úsalo; si no, usa value.
  // Importante: permitir "" para "Seleccione..."
  const controlledValue = editing ? (selected ?? "") : (value ?? "");

  return (
    <FormControl sx={{ mt: 0, ml: 0, minWidth: 200 }} size={size} disabled={disabled} error={Boolean(error)}>
      <InputLabel id="province-label">{label}</InputLabel>

      <Select
        labelId="province-label"
        label={label}
        name={name}
        value={controlledValue}
        onChange={onChange}
      >
        <MenuItem value="">
          <em>Seleccione...</em>
        </MenuItem>

        {provinces.map((province) => (
          <MenuItem key={province.id} value={province.id}>
            {province.name}
          </MenuItem>
        ))}
      </Select>

      {(error || fetchError) && (
        <FormHelperText>
          {error || fetchError}
        </FormHelperText>
      )}
    </FormControl>
  );
};

export default ProvinceSelect;
