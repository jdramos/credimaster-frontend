import React, { useMemo } from "react";
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { FormHelperText } from "@mui/material";
import useCachedFetch from "../hooks/useCachedFetch";

const RoleSelect = (props) => {
  const { data: rawData, error: fetchApiError } = useCachedFetch('/api/roles');
  const roles = useMemo(() => (Array.isArray(rawData) ? rawData : []), [rawData]);
  const error = fetchApiError
    ? 'Error al recuperar roles. Por favor, inténtelo de nuevo más tarde.'
    : null;


  return (
    <>
      {/* Roles Select */}
      <FormControl sx={{ mt: 0, mr: 1, minWidth: 200 }} size="small" error={props.error}>
        <Autocomplete
          disableClearable
          options={roles}
          size="small"
          value={roles.find((role) => role.id === props.value) || null}
          getOptionLabel={(option) => option.role_name}
          onChange={(event, newValue) => {
            const syntheticEvent = {
              target: {
                name: props.name,
                value: newValue ? newValue.id : ''
              }
            };
            props.onChange(syntheticEvent);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={props.label}
              variant="outlined"
              error={!!error} // Highlight if there's an error
              helperText={error || ''} // Display error message if it exists
            />
          )}
          renderOption={(props, option) => (
            <MenuItem {...props} key={option.id} value={option.id}>
              {option.role_name}
            </MenuItem>
          )}
          error={error}
        />

      </FormControl>

    </>
  );
};

export default RoleSelect;
