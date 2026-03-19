import React, { useEffect, useState } from "react";
import { FormControl, MenuItem, Autocomplete, TextField, Typography } from "@mui/material";

const url = process.env.REACT_APP_API_BASE_URL + '/api/frecuencies';
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

const FrecuencySelect = (props) => {
  const [frecuency, setFrecuency] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const defaultOption = frecuency.find(f => f.default === 'Y');
  const selectedOption = frecuency.find(f => f.tag === props.value) || defaultOption || null;

  useEffect(() => {
    const fetchApi = async () => {
      try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error('Failed to retrieve data.');

        const jsonData = await response.json();
        setFrecuency(jsonData);

        const defaultItem = jsonData.find(f => f.default === 'Y');
        if (!props.value && defaultItem) {
          // Simular selección por defecto si no hay valor ya definido
          const syntheticEvent = {
            target: {
              name: props.name,
              value: defaultItem.tag,
            }
          };
          props.onChange(syntheticEvent, defaultItem);
        }
      } catch (error) {
        setLoadError('Hubo un error al cargar los datos');
      }
    };

    fetchApi();
  }, []);

  return (
    <FormControl sx={{ mt: 0, mr: 1, minWidth: 300 }}>
      <Autocomplete
        size="small"
        fullWidth
        options={frecuency}
        getOptionLabel={(option) => option.name || ''}
        filterOptions={(options, state) =>
          options.filter(option =>
            option.name.toLowerCase().includes(state.inputValue.toLowerCase())
          )
        }
        value={selectedOption}
        onChange={(event, newValue) => {
          const syntheticEvent = {
            target: {
              name: props.name,
              value: newValue ? newValue.tag : ''
            }
          };
          props.onChange(syntheticEvent, newValue);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={props.label}
            variant="outlined"
            error={!!props.error || !!loadError}
            helperText={props.error || loadError || ''}
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
