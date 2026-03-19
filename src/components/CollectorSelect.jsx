import React, { useEffect, useState } from "react";
import { FormControl, MenuItem, Autocomplete, TextField, Typography } from "@mui/material";

const url = process.env.REACT_APP_API_BASE_URL + '/api/collectors/branch/';
const token = process.env.REACT_APP_API_TOKEN;
const headers = {
  Authorization: token,
  "Content-Type": "application/json"
};

const CollectorSelect = (props) => {
  const [collector, setCollector] = useState([]); // State to store fetched data
  const [error, setError] = useState(null); // State for error handling
  const [selectedCollector, setSelectedCollector] = useState(null); // Store selected collector

  useEffect(() => {
    const fetchApi = async () => {
      if (!props.branch_id) {
        setCollector([]);
        setSelectedCollector(null); // Clear selection when branch changes
        return;
      }

      try {
        const response = await fetch(`${url}${props.branch_id}`, { headers });
        if (!response.ok) {
          throw new Error('Failed to retrieve data.');
        }
        const jsonData = await response.json();

        if (jsonData.error) {
          setError(jsonData.error);
          setCollector([]);
        } else {
          setError(null);
          setCollector(jsonData || [])
        }

      } catch (error) {
        setError('Failed to retrieve data. Please try again later.');
      }
    };

    fetchApi(); // Call the fetchApi function when the component mounts
  }, [props.branch_id]); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    setSelectedCollector(null); // Reset selection when branch changes
  }, [props.branch_id]);


  return (
    <FormControl sx={{ mt: 0, mr: 1, minWidth: 300 }} >
      <Autocomplete
        size="small"
        fullWidth
        options={collector}
        value={selectedCollector}
        getOptionLabel={(option) => `${option.name} `}
        filterOptions={(options, state) =>
          options.filter(option =>
            option.name.toLowerCase().includes(state.inputValue.toLowerCase())
          )
        }
        onChange={(event, newValue) => {
          setSelectedCollector(newValue); // Update selected value
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
          <MenuItem {...props} key={option.id} value={option.identification}>
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

export default CollectorSelect;
