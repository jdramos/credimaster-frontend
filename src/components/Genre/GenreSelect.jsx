import React, { useEffect, useMemo, useState } from 'react';
import { Autocomplete, TextField, Box, CircularProgress, Typography, FormControl, GroupHeader } from '@mui/material';
import API from '../../api';

export default function GenreSelect({
    value,              // id seleccionado
    onChange,           // devuelve id
    label = "Género",
    disabled = false,
    required = false,
    size = "small"
}) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchGenres = async () => {
        try {
            setLoading(true);
            const res = await API.get('api/genres', {

            });
            const rows = res.data ?? [];
            setOptions(rows.map(r => ({
                id: r.id,
                name: r.name,
            })));
        } catch (e) {
            console.error('Error cargando géneros:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGenres(); }, []);


    const selected = useMemo(
        () => options.find(o => String(o.id) === String(value)) || null,
        [options, value]
    );

    return (
        <FormControl sx={{ mt: 0, ml: 0, minWidth: 500 }} size="large" >
            <Autocomplete
                options={options}
                value={selected}
                loading={loading}
                disabled={disabled}
                size={size}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                getOptionLabel={(opt) => opt ? `${opt.id} - ${opt.name}` : ''}
                onChange={(_, newVal) => onChange?.(newVal ? newVal.id : null)}
                clearOnBlur={false}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={label}
                        required={required}
                        InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                                <>
                                    {loading ? <CircularProgress size={18} /> : null}
                                    {params.InputProps.endAdornment}
                                </>
                            )
                        }}
                    />
                )}
                renderOption={(props, option) => (
                    <li {...props} style={{ paddingLeft: 24 }}>
                        {option.id} - {option.name}
                    </li>
                )}
            />
        </FormControl>
    );
}
