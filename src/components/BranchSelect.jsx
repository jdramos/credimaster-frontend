import React, { useContext, useMemo } from "react";
import { UserContext } from "../contexts/UserContext";
import {
  Autocomplete,
  FormControl,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import useCachedFetch from "../hooks/useCachedFetch";

const url = "/api/branches";

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
  const { userBranches = [], role } = useContext(UserContext);
  const { data: allBranches, error: fetchApiError } = useCachedFetch(url);
  const fetchError = fetchApiError ? "No se pudieron cargar las sucursales." : "";

  const currentValue = value ?? selected ?? "";

  const data = useMemo(() => {
    if (!allBranches) return [];

    const allowedBranches = userBranches.map((id) => Number(id));

    return allBranches.filter((branch) =>
      allowedBranches.includes(Number(branch.id)),
    );
  }, [allBranches, userBranches]);

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
