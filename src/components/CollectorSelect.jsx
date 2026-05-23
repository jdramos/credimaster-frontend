import React, { useEffect, useState } from "react";
import {
  FormControl,
  MenuItem,
  Autocomplete,
  TextField,
  Typography,
} from "@mui/material";

const url = process.env.REACT_APP_API_BASE_URL + "/api/collectors/branch/";
const token = process.env.REACT_APP_API_TOKEN;

const headers = {
  Authorization: token,
  "Content-Type": "application/json",
};

const toStr = (value) =>
  value === null || value === undefined || value === "" ? "" : String(value);

const CollectorSelect = (props) => {
  const [collectors, setCollectors] = useState([]);
  const [error, setError] = useState(null);
  const [selectedCollector, setSelectedCollector] = useState(null);

  useEffect(() => {
    const fetchApi = async () => {
      if (!props.branch_id) {
        setCollectors([]);
        setSelectedCollector(null);
        return;
      }

      try {
        const response = await fetch(`${url}${props.branch_id}`, { headers });

        if (!response.ok) {
          throw new Error("Failed to retrieve data.");
        }

        const jsonData = await response.json();

        const rows = Array.isArray(jsonData)
          ? jsonData
          : Array.isArray(jsonData?.data)
            ? jsonData.data
            : [];

        if (jsonData?.error) {
          setError(jsonData.error);
          setCollectors([]);
        } else {
          setError(null);
          setCollectors(rows);
        }
      } catch (error) {
        setError("Failed to retrieve data. Please try again later.");
        setCollectors([]);
      }
    };

    fetchApi();
  }, [props.branch_id]);

  useEffect(() => {
    const value = toStr(props.value ?? props.selected);

    if (!value) {
      setSelectedCollector(null);
      return;
    }

    const found = collectors.find((item) => toStr(item.id) === value);

    if (found) {
      setSelectedCollector(found);
      return;
    }

    setSelectedCollector({
      id: value,
      name: props.selectedLabel || props.collector_name || "",
      identification:
        props.selectedIdentification || props.collector_identification || "",
    });
  }, [
    props.value,
    props.selected,
    props.selectedLabel,
    props.collector_name,
    props.selectedIdentification,
    props.collector_identification,
    collectors,
  ]);

  return (
    <FormControl sx={{ mt: 0, mr: 1, minWidth: 300, width: "100%" }}>
      <Autocomplete
        size={props.size || "small"}
        fullWidth
        options={collectors}
        value={selectedCollector}
        getOptionLabel={(option) => option?.name || ""}
        isOptionEqualToValue={(option, value) =>
          toStr(option?.id) === toStr(value?.id)
        }
        filterOptions={(options, state) =>
          options.filter((option) =>
            (option?.name || "")
              .toLowerCase()
              .includes((state.inputValue || "").toLowerCase()),
          )
        }
        onChange={(event, newValue) => {
          setSelectedCollector(newValue);

          props.onChange?.({
            target: {
              name: props.name,
              value: newValue ? newValue.id : "",
              collector_identification: newValue ? newValue.identification : "",
            },
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={props.label}
            variant="outlined"
            error={!!error}
            helperText={error || ""}
          />
        )}
        renderOption={(optionProps, option) => (
          <MenuItem
            {...optionProps}
            key={option.id}
            value={option.identification}
          >
            <div>
              <Typography variant="body1">{option.name}</Typography>
            </div>
          </MenuItem>
        )}
      />

      {props.error ? (
        <span className="form-text text-danger">{props.error}</span>
      ) : null}
    </FormControl>
  );
};

export default CollectorSelect;
