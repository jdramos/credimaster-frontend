import React, { useEffect, useState } from "react";
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { FormHelperText } from "@mui/material";

const RoleSelect = (props) => {
  const [roles, setRoles] = useState([]); // State to store fetched data
  const [error, setError] = useState(null); // State for error handling

  const url = process.env.REACT_APP_API_BASE_URL + '/api/roles';
  const token = process.env.REACT_APP_API_TOKEN;
  const headers = { Authorization: token };

  useEffect(() => {
    const fetchRoles = async () => {

      try {

        const response = await fetch(url, { headers });

        if (!response.ok) {

          throw new Error('Error al recuperar roles.');

        }
        const jsonData = await response.json();
        setRoles(jsonData); // Update the state with fetched data

      } catch (error) {

        console.error(error);
        setError('Error al recuperar roles. Por favor, inténtelo de nuevo más tarde.');
      }

    };

    fetchRoles(); // Call the fetchRoles function when the component mounts
  }, []);


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
