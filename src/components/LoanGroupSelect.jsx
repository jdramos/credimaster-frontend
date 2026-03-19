import React, { useEffect, useState } from "react";
import { FormControl, MenuItem, Autocomplete, TextField, Typography } from "@mui/material";

const url = process.env.REACT_APP_API_BASE_URL + '/api/loangroup';
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

const LoanGroupSelect = (props) => {
  const [data, setData] = useState([]); // State to store fetched data
  const [error, setError] = useState(null); // State for error handling

  useEffect(() => {
    const fetchApi = async () => {
      try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error('Failed to retrieve data.' + response.errors);
        }
        const jsonData = await response.json();

        if (jsonData.error) {
          setError(jsonData.error);
        }

        setData(jsonData);

      } catch (error) {
        setError('Hubo un error al cargar los datos.' + error);
      }
    };

    fetchApi(); // Call the fetchApi function when the component mounts
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <FormControl sx={{ mt: 0, mr: 1, minWidth: 300 }} >
      <Autocomplete
        size="small"
        fullWidth
        options={data}
        getOptionLabel={(option) => `${option.name} `}
        filterOptions={(options, state) =>
          options.filter(option =>
            option.name.toLowerCase().includes(state.inputValue.toLowerCase())
          )
        }
        onChange={(event, newValue) => {
          const syntheticEvent = {
            target: {
              name: props.name,
              value: newValue ? newValue.name : ''
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
          <MenuItem {...props} key={option.id} value={option.name}>
            <div>
              <Typography variant="body1">{option.name}</Typography>
            </div>
          </MenuItem>
        )}
        error={error}
      />
      {props.error === 0 ? null : <span className="form-text text-danger">{props.error}</span>}
    </FormControl>
  );
}

export default LoanGroupSelect;
