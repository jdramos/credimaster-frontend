import React, { useMemo } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
  FormControl,
} from "@mui/material";
import useCachedFetch from "../../hooks/useCachedFetch";

export default function GenreSelect({
  name = "id_genero",
  value,
  onChange,
  label = "Género",
  disabled = false,
  required = false,
  size = "small",
  error = false,
  helperText = "",
  fullWidth = true,
}) {
  const { data: rawData, loading } = useCachedFetch("/api/genres");

  const options = useMemo(() => {
    const rows = Array.isArray(rawData) ? rawData : rawData?.rows || [];
    return rows.map((r) => ({ id: Number(r.id), name: r.name }));
  }, [rawData]);

  const normalizedValue =
    value === null || value === undefined || value === "" ? "" : Number(value);

  const selected = useMemo(
    () => options.find((o) => Number(o.id) === Number(normalizedValue)) || null,
    [options, normalizedValue],
  );

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={Boolean(error)}
      sx={{
        width: fullWidth ? "100%" : "auto",
        minWidth: 0,
        m: 0,
      }}
    >
      <Autocomplete
        options={options}
        value={selected}
        loading={loading}
        disabled={disabled || loading}
        size={size}
        fullWidth={fullWidth}
        isOptionEqualToValue={(opt, val) => Number(opt.id) === Number(val.id)}
        getOptionLabel={(opt) => (opt ? `${opt.id} - ${opt.name}` : "")}
        onChange={(_, newVal) => onChange?.(newVal ? Number(newVal.id) : "")}
        clearOnBlur={false}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            error={Boolean(error)}
            helperText={helperText}
            size={size}
            fullWidth={fullWidth}
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
        renderOption={({ key, ...optionProps }, option) => (
          <li key={key} {...optionProps}>
            {option.id} - {option.name}
          </li>
        )}
      />
    </FormControl>
  );
}
