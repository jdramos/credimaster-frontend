import React, { useEffect, useMemo } from "react";
import {
  FormControl,
  MenuItem,
  Autocomplete,
  TextField,
  Typography,
} from "@mui/material";
import useCachedFetch from "../hooks/useCachedFetch";

const url = "/api/frecuencies";

const FrecuencySelect = (props) => {
  const { data: rawData, error: fetchApiError } = useCachedFetch(url);
  const loadError = fetchApiError ? "Hubo un error al cargar los datos" : null;

  const frecuency = useMemo(() => (Array.isArray(rawData) ? rawData : []), [rawData]);

  const defaultOption = frecuency.find((f) => f.default === "Y");
  const selectedOption =
    frecuency.find((f) => f.tag === props.value) || defaultOption || null;

  useEffect(() => {
    if (!props.value && defaultOption) {
      // Simular selección por defecto si no hay valor ya definido
      const syntheticEvent = {
        target: {
          name: props.name,
          value: defaultOption.tag,
          frecuency_id: defaultOption.id,
        },
      };
      props.onChange(syntheticEvent, defaultOption);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOption]);

  return (
    <FormControl sx={{ mt: 0, width: "100%", minWidth: 0 }}>
      <Autocomplete
        size="small"
        fullWidth
        options={frecuency}
        getOptionLabel={(option) => option.name || ""}
        filterOptions={(options, state) =>
          options.filter((option) =>
            option.name.toLowerCase().includes(state.inputValue.toLowerCase()),
          )
        }
        value={selectedOption}
        onChange={(event, newValue) => {
          const syntheticEvent = {
            target: {
              name: props.name,
              value: newValue ? newValue.tag : "",
              frecuency_id: newValue ? newValue.id : null,
            },
          };
          props.onChange(syntheticEvent, newValue);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={props.label}
            variant="outlined"
            error={!!props.error || !!loadError}
            helperText={props.error || loadError || ""}
          />
        )}
        renderOption={(props, option) => (
          <MenuItem {...props} key={option.id} value={option.tag}>
            <Typography variant="body1">{option.name}</Typography>
          </MenuItem>
        )}
      />
    </FormControl>
  );
};

export default FrecuencySelect;
