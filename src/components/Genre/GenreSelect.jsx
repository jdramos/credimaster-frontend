import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
  FormControl,
} from "@mui/material";
import API from "../../api";

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
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setLoading(true);
        const res = await API.get("api/genres");

        const rows = Array.isArray(res.data) ? res.data : res.data?.rows || [];

        setOptions(
          rows.map((r) => ({
            id: Number(r.id),
            name: r.name,
          })),
        );
      } catch (e) {
        console.error("Error cargando géneros:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchGenres();
  }, []);

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
        onChange={(_, newVal) =>
          onChange?.({
            target: {
              name,
              value: newVal ? Number(newVal.id) : "",
            },
          })
        }
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
        renderOption={(props, option) => (
          <li {...props}>
            {option.id} - {option.name}
          </li>
        )}
      />
    </FormControl>
  );
}
