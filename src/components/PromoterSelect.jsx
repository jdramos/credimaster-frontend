import React, { useEffect, useState } from "react";
import { FormControl, Autocomplete, TextField, Typography } from "@mui/material";

const url = process.env.REACT_APP_API_BASE_URL + "/api/promoters/branch/";
const token = process.env.REACT_APP_API_TOKEN;
const headers = {
  Authorization: token,
  "Content-Type": "application/json",
};

const PromoterSelect = (props) => {
  const [promoters, setPromoters] = useState([]);
  const [error, setError] = useState(null);
  const [selectedPromoter, setSelectedPromoter] = useState(null);

  useEffect(() => {
    const fetchApi = async () => {
      if (!props.branch_id) {
        setPromoters([]);
        setSelectedPromoter(null);
        return;
      }

      try {
        const response = await fetch(`${url}${props.branch_id}`, { headers });
        if (!response.ok) throw new Error("Failed to retrieve data.");
        const jsonData = await response.json();

        if (jsonData?.error) {
          setError(jsonData.error);
          setPromoters([]);
        } else {
          setError(null);
          setPromoters(jsonData || []);
        }
      } catch (e) {
        setError("Failed to retrieve data. Please try again later.");
        setPromoters([]);
      }
    };

    fetchApi();
  }, [props.branch_id]);

  useEffect(() => {
    setSelectedPromoter(null);
  }, [props.branch_id]);

  return (
    <FormControl
      fullWidth
      sx={{
        m: 0,
        width: "100%",
        minWidth: 0,          // ✅ clave para grid
      }}
    >
      <Autocomplete
        size="small"
        fullWidth
        options={promoters}
        value={selectedPromoter}
        getOptionLabel={(option) => option?.name || ""}
        isOptionEqualToValue={(opt, val) => opt?.id === val?.id} // ✅ evita warnings y saltos

        // ✅ z-index del dropdown arriba
        slotProps={{
          popper: { sx: { zIndex: (theme) => theme.zIndex.modal + 5 } },
        }}

        filterOptions={(options, state) =>
          options.filter((option) =>
            (option?.name || "").toLowerCase().includes((state.inputValue || "").toLowerCase())
          )
        }
        onChange={(event, newValue) => {
          setSelectedPromoter(newValue);
          props.onChange?.({
            target: {
              name: props.name,
              value: newValue ? newValue.id : "",
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
            fullWidth
          />
        )}
        renderOption={(optionProps, option) => (
          <li {...optionProps} key={option.id}>
            <Typography variant="body1">{option.name}</Typography>
          </li>
        )}
        sx={{
          width: "100%",
          minWidth: 0, // ✅ por si el root intenta crecer
        }}
      />

      {props.error && <span className="form-text text-danger">{props.error}</span>}
    </FormControl>
  );
};

export default PromoterSelect;