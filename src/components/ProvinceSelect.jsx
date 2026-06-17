import React, { useEffect, useId, useState } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import API from "../api";

const url = "/api/provinces";

const ProvinceSelect = ({
  value,
  selected,
  editing = false,
  onChange,
  name = "province_id",
  label = "Departamento",
  error,
  helperText = "",
  disabled = false,
  size = "small",
  fullWidth = true,
}) => {
  const [provinces, setProvinces] = useState([]);
  const [fetchError, setFetchError] = useState("");

  const inputId = useId();
  const labelId = `${inputId}-${name}-label`;
  const selectId = `${inputId}-${name}`;

  useEffect(() => {
    const fetchApi = async () => {
      try {
        setFetchError("");

        const response = await API.get(url);

        const jsonData = await response.data;
        setProvinces(Array.isArray(jsonData) ? jsonData : []);
      } catch (e) {
        console.error(e);
        setFetchError("No se pudieron cargar los departamentos.");
        setProvinces([]);
      }
    };

    fetchApi();
  }, []);

  const controlledValue = editing ? (selected ?? "") : (value ?? "");
  const finalHelperText = error || fetchError || helperText || " ";

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
        value={controlledValue}
        onChange={onChange}
        label={label}
        displayEmpty
        renderValue={(selectedValue) => {
          if (
            selectedValue === "" ||
            selectedValue === null ||
            selectedValue === undefined
          ) {
            return <span style={{ color: "#9e9e9e" }}>Seleccione...</span>;
          }

          const province = provinces.find(
            (item) => Number(item.id) === Number(selectedValue),
          );

          return province ? province.name : "";
        }}
        sx={{
          borderRadius: 2,
          backgroundColor: "#fff",
        }}
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

      <FormHelperText>{finalHelperText}</FormHelperText>
    </FormControl>
  );
};

export default ProvinceSelect;
