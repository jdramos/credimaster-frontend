import React, { useEffect, useMemo, useState } from "react";
import { MenuItem, Select, FormControl, InputLabel, FormHelperText } from "@mui/material";
import API from "../../api";

export default function EstadoCivilSelect({
  value,              // id seleccionado (controlado por el padre)
  onChange,           // devuelve id (number o "")
  label = "Estado civil",
  editing = false,
  name,
  disabled = false,
  required = false,
  size = "small",
  error = false,
  helperText = "",
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEstadoCivil = async () => {
      try {
        setLoading(true);
        const res = await API.get("api/conami/estado-civil");
        const rows = res.data?.rows ?? [];
        setOptions(
          rows.map((r) => ({
            id: Number(r.id),
            name: r.name,
            isDefault: Number(r.isDefault || 0),
          }))
        );
      } catch (e) {
        console.error("Error cargando estado civil:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchEstadoCivil();
  }, []);

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
    : (normalizedValue !== "" ? normalizedValue : defaultId);

  const handleChange = (e) => {
    const v = e.target.value === "" ? "" : Number(e.target.value);
    onChange?.(v);
  };

  return (
    <FormControl
      sx={{ mt: 1, ml: 1, minWidth: 250 }}
      size={size}
      disabled={disabled || loading}
      required={required}
      error={Boolean(error)}
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
