import React, { useEffect, useState } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Autocomplete,
  TextField,
} from "@mui/material";
import API from "../api";

const url = "/api/businesstypes";

const BusinessTypeSelect = (props) => {
  const [business, setBusiness] = useState([]); // State to store fetched data
  const [error, setError] = useState(null); // State for error handling

  useEffect(() => {
    const fetchApi = async () => {
      try {
        const response = await API.get(url);

        const jsonData = await response.data;
        setBusiness(jsonData);
      } catch (error) {
        setError("Failed to retrieve data. Please try again later.");
      }
    };

    fetchApi(); // Call the fetchApi function when the component mounts
  }, []); // Empty dependency array ensures this runs once on mount

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
