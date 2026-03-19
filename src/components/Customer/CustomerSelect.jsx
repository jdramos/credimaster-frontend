import React, { useEffect, useState, useCallback } from "react";
import { FormControl, Autocomplete, TextField, Typography, Box, CircularProgress } from "@mui/material";
import debounce from "lodash.debounce";

const baseUrl = process.env.REACT_APP_API_BASE_URL;
const url = `${baseUrl}/api/customers/getCustomerList`;

const token = process.env.REACT_APP_API_TOKEN;
// Si tu backend exige token SIEMPRE, deja esto así:
const headers = { Authorization: token };

const CustomerSelect = (props) => {
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
const [selectedCustomer, setSelectedCustomer] = useState(null);

  const normalize = (json) => {
    // ✅ soporta varias formas comunes
    const arr =
      Array.isArray(json) ? json :
      Array.isArray(json?.data) ? json.data :
      Array.isArray(json?.rows) ? json.rows :
      Array.isArray(json?.result) ? json.result :
      [];
    return arr;
  };

  const fetchApi = async (query) => {
    try {
      setLoading(true);
      setError(null);

      const q = encodeURIComponent(query);
      const resp = await fetch(`${url}?query=${q}`, { headers });

      if (!resp.ok) throw new Error("Failed to retrieve data.");

      const json = await resp.json();

      if (json?.error) {
        setCustomers([]);
        setError(json.error);
        return;
      }

      setCustomers(normalize(json));
    } catch (err) {
      setCustomers([]);
      setError(err.message || "Failed to retrieve data.");
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useCallback(
    debounce((q) => fetchApi(q), 400),
    []
  );

  useEffect(() => {
    const q = inputValue.trim();

    if (q.length >= 1) {
      debouncedFetch(q);
    } else {
      setCustomers([]);
      setError(null);
    }

    return () => debouncedFetch.cancel();
  }, [inputValue, debouncedFetch]);

  return (
    <FormControl sx={{ mt: 0, mr: 1, minWidth: 500 }}>
      <Autocomplete
  size={props.size}
  options={customers}
  value={selectedCustomer}  // ✅ CLAVE
  filterOptions={(options) => options}
  loading={loading}

  getOptionLabel={(option) =>
    option
      ? ` ${option.id ?? ""} ${option.customer_name ?? ""} (${option.identification ?? ""})`
      : ""
  }

  inputValue={inputValue}

  onInputChange={(event, newInputValue) => {
    setInputValue(newInputValue);
  }}

  onChange={(event, newValue) => {
    setError(null);

    setSelectedCustomer(newValue); // ✅ ahora sí queda seleccionado

    // opcional: deja el texto bonito en el input
    if (newValue) {
      setInputValue(
        `${newValue.id ?? ""} ${newValue.customer_name ?? ""} (${newValue.identification ?? ""})`
      );
    } else {
      setInputValue("");
    }

    props.onChange?.({
      target: {
        name: props.name,
        value: newValue ? newValue.identification : "",
      },
    });
  }}

  noOptionsText={
    selectedCustomer
      ? ""              // ✅ si ya seleccionó, no mostrar mensaje
      : inputValue.trim().length
      ? "Sin resultados"
      : "Escribe para buscar"
  }

  renderInput={(params) => (
    <TextField
      {...params}
      label={props.label}
      variant="outlined"
      error={Boolean(error)}
      helperText={error ? error : ""}
      FormHelperTextProps={{ sx: { minHeight: 18, m: 0 } }}
      InputProps={{
        ...params.InputProps,
        endAdornment: (
          <>
            {loading ? <CircularProgress size={18} /> : null}
            {params.InputProps.endAdornment}
          </>
        ),
      }}
    />
  )}
/>

      {props.error ? (
        <span className="form-text text-danger">{props.error}</span>
      ) : null}
    </FormControl>
  );
};

export default CustomerSelect;