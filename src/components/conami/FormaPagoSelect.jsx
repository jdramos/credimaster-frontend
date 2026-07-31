import React, { useEffect, useMemo } from "react";
import { CircularProgress, MenuItem, TextField } from "@mui/material";
import useCachedFetch from "../../hooks/useCachedFetch";

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
  const { data: rawData, loading } = useCachedFetch("/api/payments/formas-pago");

  const rows = useMemo(
    () => (Array.isArray(rawData?.data) ? rawData.data : []),
    [rawData],
  );

  useEffect(() => {
    if (value || rows.length === 0) return;

    const defaultItem =
      rows.find((item) => Number(item.is_default) === 1) || rows[0];

    if (defaultItem) {
      onChange?.({
        target: {
          name,
          value: defaultItem.id,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, value]);

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
