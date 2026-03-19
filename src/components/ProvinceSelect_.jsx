import React, { useEffect, useState } from "react";
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { FormHelperText, CircularProgress } from "@mui/material";

const ProvinceSelect = (props) => {
  const [province, setProvince] = useState([]);
  const [cities, setCities] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  const [provinceError, setProvinceError] = useState(null);
  const [cityError, setCityError] = useState(null);

  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingCities, setLoadingCities] = useState(true);

  const provinceUrl = process.env.REACT_APP_API_BASE_URL + '/api/provinces';
  const cityUrl = process.env.REACT_APP_API_BASE_URL + '/api/municipalities';
  const token = process.env.REACT_APP_API_TOKEN;
  const headers = { Authorization: token };

  // Fetch provinces and cities on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await fetch(provinceUrl, { headers });
        if (!response.ok) throw new Error('Failed to retrieve provinces.');
        const jsonData = await response.json();
        setProvince(jsonData);
      } catch (error) {
        console.error(error);
        setProvinceError('No se pudieron cargar las provincias.');
      } finally {
        setLoadingProvinces(false);
      }
    };

    const fetchCities = async () => {
      try {
        const response = await fetch(cityUrl, { headers });
        if (!response.ok) throw new Error('Failed to retrieve cities.');
        const jsonData = await response.json();
        setCities(jsonData);
      } catch (error) {
        console.error(error);
        setCityError('No se pudieron cargar los municipios.');
      } finally {
        setLoadingCities(false);
      }
    };

    fetchProvinces();
    fetchCities();
  }, []);

  // Inicializa valores si estamos editando
  useEffect(() => {
    if (props.editing) {
      const initialProvince = province.find(p => p.id === props.provinceId);
      const initialCity = cities.find(c => c.id === props.municipalityId);
      setSelectedProvince(initialProvince || null);
      setSelectedCity(initialCity || null);
    }
  }, [props.editing, props.provinceId, props.municipalityId, province, cities]);

  // Filtra ciudades por provincia
  useEffect(() => {
    if (selectedProvince) {
      setFilteredCities(cities.filter(city => city.province_id === selectedProvince.id));
    } else {
      setFilteredCities(cities);
    }
  }, [selectedProvince, cities]);

  return (
    <>
      {/* Selector de provincia */}
      <FormControl sx={{ mt: 0, mr: 1, minWidth: 200 }} size="small" error={props.error}>
        <Autocomplete
          value={selectedProvince}
          options={province}
          loading={loadingProvinces}
          size="small"
          openOnFocus
          getOptionLabel={(option) => option.name}
          onChange={(event, newValue) => {
            setSelectedProvince(newValue);
            const syntheticEvent = {
              target: {
                name: props.provinceName,
                value: newValue ? newValue.id : ''
              }
            };
            props.onChange(syntheticEvent);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={props.label || "Provincia"}
              variant="outlined"
              error={!!provinceError}
              helperText={provinceError || ''}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingProvinces ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
          renderOption={(props, option) => (
            <MenuItem {...props} key={option.id} value={option.id}>
              {option.name}
            </MenuItem>
          )}
        />
        {props.errorField && <FormHelperText>{props.errorField}</FormHelperText>}
      </FormControl>

      {/* Selector de municipio */}
      <FormControl sx={{ mt: 0, mr: 1, minWidth: 200 }} size="small" error={props.error}>
        <Autocomplete
          options={filteredCities}
          value={selectedCity}
          loading={loadingCities}
          size="small"
          getOptionLabel={(option) => option.name}
          onChange={(event, newValue) => {
            setSelectedCity(newValue);
            const syntheticEvent = {
              target: {
                name: props.municipalityName,
                value: newValue ? newValue.id : ''
              }
            };
            props.onChange(syntheticEvent);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Municipio"
              variant="outlined"
              error={!!cityError}
              helperText={cityError || ''}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingCities ? <CircularProgress size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
          renderOption={(props, option) => (
            <MenuItem {...props} key={option.id} value={option.id}>
              {option.name}
            </MenuItem>
          )}
        />
        {props.errorField && <FormHelperText>{props.errorField}</FormHelperText>}
      </FormControl>
    </>
  );
};

export default ProvinceSelect;
