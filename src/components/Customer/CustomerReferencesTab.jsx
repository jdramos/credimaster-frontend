import React, { forwardRef, useImperativeHandle } from 'react';
import { TextField, Divider, Box, Grid } from '@mui/material';
import DividerChip from "../DividerChip";

const CustomerReferencesTab = forwardRef(({ customer, setCustomer, errors, setErrors, mode }, ref) => {
    useImperativeHandle(ref, () => ({
        validate: () => {
            let valid = true;
            const newErrors = {};


            const fields = [
                "reference_name",
                "reference_address",
                "reference_telephone",
                "reference_known_time",
                "reference_relationship",
                "reference2_name",
                "reference2_address",
                "reference2_telephone",
                "reference2_known_time",
                "reference2_relationship",
            ];

            fields.forEach(field => {
                if (!customer[field]) {
                    newErrors[field] = "Este campo es requerido";
                    valid = false;
                }
            });


            return {ok: valid, errors: newErrors};
        }
    }));

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCustomer(prev => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const isReadOnly = mode === 'show';

    const fieldStyle = { mb: 2 };

    return (
        <Grid container spacing={4} padding={2}>
            <Grid item xs={12} md={6}>
                <DividerChip label="Referencia 1" />

                <TextField label="Nombre" name="reference_name" value={customer.reference_name}
                    onChange={handleInputChange} error={!!errors.reference_name}
                    helperText={errors.reference_name} fullWidth size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Identificación" name="reference_identity" value={customer.reference_identity}
                    onChange={handleInputChange} error={!!errors.reference_identity}
                    helperText={errors.reference_identity} fullWidth size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Dirección" name="reference_address" value={customer.reference_address}
                    onChange={handleInputChange} error={!!errors.reference_address}
                    helperText={errors.reference_address} fullWidth multiline size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Centro laboral" name="reference_workplace" value={customer.reference_workplace}
                    onChange={handleInputChange} error={!!errors.reference_workplace}
                    helperText={errors.reference_workplace} fullWidth size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Teléfono" name="reference_telephone" value={customer.reference_telephone}
                    onChange={handleInputChange} error={!!errors.reference_telephone}
                    helperText={errors.reference_telephone} size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Tiempo de conocerlo" name="reference_known_time" value={customer.reference_known_time}
                    onChange={handleInputChange} error={!!errors.reference_known_time}
                    helperText={errors.reference_known_time} size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Relación" name="reference_relationship" value={customer.reference_relationship}
                    onChange={handleInputChange} error={!!errors.reference_relationship}
                    helperText={errors.reference_relationship} size='small' disabled={isReadOnly} sx={fieldStyle}
                />
            </Grid>

            <Grid item xs={12} md={6}>
                <DividerChip label="Referencia 2" />

                <TextField label="Nombre" name="reference2_name" value={customer.reference2_name}
                    onChange={handleInputChange} error={!!errors.reference2_name}
                    helperText={errors.reference2_name} fullWidth size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Identificación" name="reference2_identity" value={customer.reference2_identity}
                    onChange={handleInputChange} error={!!errors.reference2_identity}
                    helperText={errors.reference2_identity} fullWidth size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Dirección" name="reference2_address" value={customer.reference2_address}
                    onChange={handleInputChange} error={!!errors.reference2_address}
                    helperText={errors.reference2_address} fullWidth multiline size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Centro laboral" name="reference2_workplace" value={customer.reference2_workplace}
                    onChange={handleInputChange} error={!!errors.reference2_workplace}
                    helperText={errors.reference2_workplace} fullWidth size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Teléfono" name="reference2_telephone" value={customer.reference2_telephone}
                    onChange={handleInputChange} error={!!errors.reference2_telephone}
                    helperText={errors.reference2_telephone} size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Tiempo de conocerlo" name="reference2_known_time" value={customer.reference2_known_time}
                    onChange={handleInputChange} error={!!errors.reference2_known_time}
                    helperText={errors.reference2_known_time} size='small' disabled={isReadOnly} sx={fieldStyle}
                />

                <TextField label="Relación" name="reference2_relationship" value={customer.reference2_relationship}
                    onChange={handleInputChange} error={!!errors.reference2_relationship}
                    helperText={errors.reference2_relationship} size='small' disabled={isReadOnly} sx={fieldStyle}
                />
            </Grid>
        </Grid>
    );
});

export default CustomerReferencesTab;
