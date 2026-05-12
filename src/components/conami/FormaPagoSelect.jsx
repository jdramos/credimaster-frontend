import React, { useEffect, useState } from "react";
import { CircularProgress, MenuItem, TextField } from "@mui/material";
import API from "../../api";

export default function FormaPagoSelect({
  name = "payment_method_id",
  value,
  onChange,
  label = "Forma de pago",
  size = "small",
  fullWidth = true,
  error = false,
  helperText = "",
  disabled = false,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadFormasPago = async () => {
    try {
      setLoading(true);

      const { data } = await API.get("/api/payments/formas-pago");

      const items = Array.isArray(data?.data) ? data.data : [];
      setRows(items);

      if (!value) {
        const defaultItem =
          items.find((item) => Number(item.is_default) === 1) || items[0];

        if (defaultItem) {
          onChange?.({
            target: {
              name,
              value: defaultItem.id,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error cargando formas de pago:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFormasPago();
  }, []);

  return (
    <TextField
      select
      label={label}
      name={name}
      value={value || ""}
      onChange={onChange}
      fullWidth={fullWidth}
      size={size}
      error={!!error}
      helperText={helperText}
      disabled={disabled || loading}
      InputProps={{
        endAdornment: loading ? <CircularProgress size={18} /> : null,
      }}
    >
      {rows.map((item) => (
        <MenuItem key={item.id} value={item.id}>
          {item.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
