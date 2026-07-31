import React, { useMemo } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Autocomplete,
  TextField,
} from "@mui/material";
import useCachedFetch from "../hooks/useCachedFetch";

const url = "/api/businesstypes";

const BusinessTypeSelect = (props) => {
  const { data: rawData, error: fetchApiError } = useCachedFetch(url);
  const business = useMemo(() => (Array.isArray(rawData) ? rawData : []), [rawData]);
  const error = fetchApiError ? "Failed to retrieve data. Please try again later." : null;

  return (
    <FormControl sx={{ mt: 0, ml: 0, minWidth: 300 }} size="small">
      <Autocomplete
        options={business}
        size="small"
        getOptionLabel={(option) => option.name}
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
          <TextField {...params} label={props.label} variant="outlined" />
        )}
        renderOption={(props, option) => (
          <MenuItem {...props} key={option.id} value={option.id}>
            {option.name}
          </MenuItem>
        )}
      />
      {props.error === 0 ? null : (
        <span className="form-text text-danger">{props.error}</span>
      )}
    </FormControl>
  );
};

export default BusinessTypeSelect;
