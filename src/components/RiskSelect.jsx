import React, { useMemo } from "react";
import {
  FormControl,
  MenuItem,
  Autocomplete,
  TextField,
  Typography,
} from "@mui/material";
import useCachedFetch from "../hooks/useCachedFetch";

const url = "/api/risks";

const CollectorSelect = (props) => {
  const { data: rawData, error: fetchApiError } = useCachedFetch(url);

  const risk = useMemo(() => {
    if (!rawData || rawData.error) return [];
    return Array.isArray(rawData) ? rawData : [];
  }, [rawData]);

  const error =
    rawData?.error || (fetchApiError ? "Failed to retrieve data. Please try again later." : null);

  return (
    <FormControl sx={{ mt: 0, mr: 1, minWidth: 300 }}>
      <Autocomplete
        size="small"
        fullWidth
        options={risk}
        getOptionLabel={(option) => `${option.risk_name} `}
        onChange={(event, newValue) => {
          const syntheticEvent = {
            target: {
              name: props.name,
              value: newValue ? newValue.id : "",
            },
          };
          props.onChange(syntheticEvent);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={props.label}
            variant="outlined"
            error={!!error} // Highlight if there's an error
            helperText={error || ""} // Display error message if it exists
          />
        )}
        renderOption={(props, option) => (
          <MenuItem {...props} key={option.id} value={option.id}>
            <div>
              <Typography variant="body1">{option.risk_name}</Typography>
            </div>
          </MenuItem>
        )}
        error={error}
      />
      {props.error === 0 ? null : (
        <span className="form-text text-danger">{props.error}</span>
      )}
    </FormControl>
  );
};

export default CollectorSelect;
