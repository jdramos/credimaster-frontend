import React, { useEffect, useState, useCallback } from "react";
import {
  FormControl,
  Autocomplete,
  TextField,
  CircularProgress,
} from "@mui/material";
import debounce from "lodash.debounce";
import API from "../../api";

const url = `/api/customers/getCustomerList`;

const buildLabel = (option) => {
  if (!option) return "";

  const id = option.id ?? "";
  const name = option.customer_name ?? "";
  const identification = option.identification ?? "";

  return `${id} ${name} (${identification})`.trim();
};

const CustomerSelect = (props) => {
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const normalize = (json) => {
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.data)) return json.data;
    if (Array.isArray(json?.rows)) return json.rows;
    if (Array.isArray(json?.result)) return json.result;
    return [];
  };

  const fetchApi = async (query) => {
    try {
      setLoading(true);
      setError(null);

      const resp = await API.get(url, {
        params: {
          query,
        },
      });

      const json = resp.data;

      if (json?.error) {
        setCustomers([]);
        setError(json.error);
        return;
      }

      setCustomers(normalize(json));
    } catch (err) {
      console.error("CustomerSelect error:", err);
      setCustomers([]);
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to retrieve data.",
      );
    } finally {
      setLoading(false);
    }
  };

  const debouncedFetch = useCallback(
    debounce((q) => {
      fetchApi(q);
    }, 400),
    [],
  );

  useEffect(() => {
    const value = props.value ?? props.selected ?? "";

    if (!value) {
      setSelectedCustomer(null);
      setInputValue("");
      return;
    }

    const currentId = selectedCustomer?.id ? String(selectedCustomer.id) : "";

    if (currentId === String(value)) return;

    const option = {
      id: value,
      customer_name: props.selectedLabel || props.customer_name || "",
      identification:
        props.selectedIdentification || props.customer_identification || "",
      conami_id_actividad_economica: props.conami_id_actividad_economica || "",
    };

    setSelectedCustomer(option);
    setInputValue(buildLabel(option));
  }, [
    props.value,
    props.selected,
    props.selectedLabel,
    props.customer_name,
    props.selectedIdentification,
    props.customer_identification,
    props.conami_id_actividad_economica,
  ]);

  useEffect(() => {
    const q = inputValue.trim();

    if (selectedCustomer && buildLabel(selectedCustomer) === inputValue) {
      return;
    }

    if (q.length >= 1) {
      debouncedFetch(q);
    } else {
      setCustomers([]);
      setError(null);
    }

    return () => debouncedFetch.cancel();
  }, [inputValue, debouncedFetch, selectedCustomer]);

  return (
    <FormControl sx={{ mt: 0, mr: 1, minWidth: 500 }}>
      <Autocomplete
        size={props.size}
        options={customers}
        value={selectedCustomer}
        inputValue={inputValue}
        filterOptions={(options) => options}
        loading={loading}
        isOptionEqualToValue={(option, value) =>
          String(option?.id) === String(value?.id)
        }
        getOptionLabel={buildLabel}
        onInputChange={(event, newInputValue, reason) => {
          if (reason === "reset") return;

          setInputValue(newInputValue);

          if (
            selectedCustomer &&
            newInputValue !== buildLabel(selectedCustomer)
          ) {
            setSelectedCustomer(null);

            props.onChange?.({
              target: {
                name: props.name,
                value: "",
                customer_identification: "",
                customer_name: "",
                conami_id_actividad_economica: "",
              },
            });
          }
        }}
        onChange={(event, newValue) => {
          setError(null);
          setSelectedCustomer(newValue);

          if (newValue) {
            setInputValue(buildLabel(newValue));
          } else {
            setInputValue("");
          }

          props.onChange?.({
            target: {
              name: props.name,
              value: newValue ? newValue.id : "",
              customer_identification: newValue ? newValue.identification : "",
              customer_name: newValue ? newValue.customer_name : "",
              conami_id_actividad_economica: newValue
                ? newValue.conami_id_actividad_economica
                : "",
            },
          });
        }}
        noOptionsText={
          inputValue.trim().length ? "Sin resultados" : "Escribe para buscar"
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
