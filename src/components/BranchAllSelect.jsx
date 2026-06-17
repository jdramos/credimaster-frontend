import React, { useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  Checkbox,
  CircularProgress,
  FormControl,
  FormHelperText,
  TextField,
} from "@mui/material";
import API from "../api";

const url = "/api/branches";

const BranchAllSelect = ({
  value = [],
  onChange,
  label = "Sucursales",
  name = "branch_ids",
  error = false,
  errorField = "",
}) => {
  const [data, setData] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    const fetchApi = async () => {
      try {
        setLoading(true);
        setFetchError("");

        const response = await API.get(url);

        const jsonData = await response.data;

        // Soporta respuesta directa [] o respuesta { data: [] }
        const rows = Array.isArray(jsonData)
          ? jsonData
          : Array.isArray(jsonData.data)
            ? jsonData.data
            : [];

        if (alive) {
          setData(rows);
        }
      } catch (err) {
        console.error(err);
        if (alive) {
          setFetchError("No se pudieron cargar las sucursales.");
          setData([]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    fetchApi();

    return () => {
      alive = false;
    };
  }, []);

  const selectedIds = useMemo(() => {
    return Array.isArray(value) ? value.map(Number) : [];
  }, [value]);

  const selectedBranches = useMemo(() => {
    return data.filter((branch) => selectedIds.includes(Number(branch.id)));
  }, [data, selectedIds]);

  const emitChange = (newSelection) => {
    onChange?.({
      target: {
        name,
        value: newSelection.map((branch) => Number(branch.id)),
      },
    });
  };

  const handleSelectAll = () => {
    const allSelected =
      selectedBranches.length === data.length && data.length > 0;
    emitChange(allSelected ? [] : data);
  };

  const handleChange = (_, newValue) => {
    emitChange(Array.isArray(newValue) ? newValue : []);
  };

  return (
    <FormControl fullWidth size="small" error={Boolean(error)}>
      <Autocomplete
        multiple
        loading={loading}
        disableCloseOnSelect
        options={data}
        value={selectedBranches}
        onChange={handleChange}
        getOptionLabel={(option) => option?.name || ""}
        isOptionEqualToValue={(option, selected) =>
          Number(option.id) === Number(selected.id)
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            size="small"
            error={Boolean(error || fetchError)}
            helperText={fetchError || errorField || " "}
            placeholder="Selecciona sucursales..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(optionProps, option, { selected }) => (
          <li {...optionProps} key={option.id}>
            <Checkbox sx={{ mr: 1 }} checked={selected} />
            {option.name}
          </li>
        )}
      />

      {data.length > 0 && (
        <FormHelperText>
          <span
            onClick={handleSelectAll}
            style={{
              color: "#1976d2",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "0.8rem",
            }}
          >
            {selectedBranches.length === data.length
              ? "Deseleccionar todas"
              : "Seleccionar todas"}
          </span>
        </FormHelperText>
      )}
    </FormControl>
  );
};

export default BranchAllSelect;
