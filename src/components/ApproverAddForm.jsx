import React, { useEffect, useState } from 'react';
import API from '../api';
import {
    TextField, Select, MenuItem, Button, Snackbar, Alert, Box, InputLabel, FormControl
} from '@mui/material';

function AddApproverForm({ branchId }) {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        API.get('/api/users')
            .then(res => setUsers(res.data))
            .catch(err => console.error(err));
    }, []);

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleSubmit = async (e) => {
        setSnackbar({
            open: true,
            message: 'Aprobador agregado correctamente.',
            severity: 'success'
        });

        e.preventDefault();

    }



    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}
        >
            <h3>Agregar Aprobador</h3>

            <FormControl fullWidth>
                <InputLabel>Usuario</InputLabel>
                <Select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    required
                    label="Usuario"
                >
                    <MenuItem value="" disabled>Seleccione un usuario</MenuItem>
                    {users.map(u => (
                        <MenuItem key={u.id} value={u.id}>
                            {u.full_name} ({u.email})
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <TextField
                type="number"
                label="Monto máximo a aprobar (C$)"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                required
                inputProps={{ min: 0, step: 0.01 }}
                fullWidth
            />

            <Button type="submit" variant="contained">
                Agregar
            </Button>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snackbar.severity} variant="filled" onClose={handleCloseSnackbar}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default AddApproverForm;
