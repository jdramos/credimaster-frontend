import React, { useEffect, useMemo, useState } from 'react';
import { Autocomplete, TextField, Box, CircularProgress, Typography, FormControl, GroupHeader } from '@mui/material';
import { createFilterOptions } from '@mui/material/Autocomplete';
import API from '../../api';

const filter = createFilterOptions({
    stringify: (option) => `${option.conami_code} ${option.description}` // busca por ambos
});

export default function EconomicActivitySelect({
    value,              // id seleccionado
    onChange,           // devuelve id
    label = "Actividad Económica",
    disabled = false,
    required = false,
    size = "small"
}) {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            const res = await API.get('api/conami/actividad_economica', {
                params: { page: 1, pageSize: 9999, sortBy: 'conami_code', sortDir: 'asc' }
            });
            const rows = res.data?.rows ?? [];
            setOptions(rows.map(r => ({
                id: r.id,
                conami_code: String(r.conami_code),
                description: r.description,
                isBold: String(r.conami_code).endsWith('00')
            })));
        } catch (e) {
            console.error('Error cargando actividades:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchActivities(); }, []);


    const selected = useMemo(
        () => options.find(o => String(o.id) === String(value)) || null,
        [options, value]
    );

    return (
        <FormControl sx={{ mt: 0, ml: 0, minWidth: 500 }} size="large" >
            <Autocomplete

                value={selected}
                loading={loading}
                disabled={disabled}
                size={size}
                filterOptions={filter}
                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                getOptionLabel={(opt) => opt ? `${opt.conami_code} - ${opt.description}` : ''}
                onChange={(_, newVal) => onChange?.(newVal ? newVal.id : null)}
                clearOnBlur={false}
                options={options.filter(o => !o.isGroup)}   // 👈 solo las no-grupo son seleccionables
                groupBy={(option) => {
                    // agrupa por el código padre (terminado en 00)
                    const prefix = option.conami_code.slice(0, -2) + '00';
                    const group = options.find(o => o.conami_code === prefix);
                    return group ? `${group.conami_code} - ${group.description}` : 'Otros';
                }}
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
                        {option.conami_code} - {option.description}
                    </li>
                )}
            />
        </FormControl>
    );
}
