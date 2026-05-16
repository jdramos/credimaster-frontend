import React, { useContext, useEffect, useMemo, useState } from "react";
import { UserContext } from "../contexts/UserContext";
import {
  Autocomplete,
  FormControl,
  TextField,
  Typography,
  Box,
} from "@mui/material";

const url = process.env.REACT_APP_API_BASE_URL + "/api/branches";
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

const BranchSelect = ({
  value = "",
  selected = "",
  onChange,
  name = "branch_id",
  label = "Sucursal",
  size = "small",
  disabled = false,
  error = false,
  helperText = "",
  fullWidth = true,
}) => {
  const [data, setData] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const { userBranches = [], role } = useContext(UserContext);

  const currentValue = value ?? selected ?? "";

  useEffect(() => {
    const fetchApi = async () => {
      try {
        setFetchError("");

        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error("No se pudieron cargar las sucursales.");
        }

        const jsonData = await response.json();

        const allowedBranches = userBranches.map((id) => Number(id));

        const filteredData = jsonData.filter((branch) =>
          allowedBranches.includes(Number(branch.id)),
        );

        setData(filteredData);
      } catch (err) {
        console.error(err);
        setFetchError("No se pudieron cargar las sucursales.");
      }
    };

    fetchApi();
  }, [userBranches]);

  const selectedOption = useMemo(() => {
    return (
      data.find((branch) => Number(branch.id) === Number(currentValue)) || null
    );
  }, [data, currentValue]);

  return (
    <FormControl fullWidth={fullWidth} sx={{ mt: 0 }}>
      <Autocomplete
        size={size}
        fullWidth
        disabled={disabled}
        options={data}
        value={selectedOption}
        isOptionEqualToValue={(option, value) =>
          Number(option.id) === Number(value.id)
        }
        getOptionLabel={(option) => option?.name || ""}
        onChange={(event, newValue) => {
          onChange?.({
            target: {
              name,
              value: newValue ? newValue.id : "",
              municipality_id: newValue ? newValue.municipality_id : "",
            },
          });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={Boolean(error || fetchError)}
            helperText={fetchError || helperText}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props} key={option.id}>
            <Typography variant="body2">{option.name}</Typography>
          </Box>
        )}
      />
    </FormControl>
  );
};

export default BranchSelect;
