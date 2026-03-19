import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Select, MenuItem, InputLabel, FormControl, Box, TextField,
    Snackbar, Alert
} from '@mui/material';
import API from '../api';
import { NumericFormat } from 'react-number-format';


function ApproverAddDialog({ open, onClose, branchId: initialBranchId, onSuccess }) {
    const [branches, setBranches] = useState([]);
    const [users, setUsers] = useState([]);
    const [maxAmount, setMaxAmount] = useState(0);
    const [selectedBranch, setSelectedBranch] = useState(initialBranchId || '');
    const [selectedUser, setSelectedUser] = useState('');
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        if (open) {
            API.get('/api/branches').then(res => setBranches(res.data));
        }
    }, [open]);

    useEffect(() => {
        if (selectedBranch) {
            API.get(`/api/users`).then(res => setUsers(res.data));
        } else {
            setUsers([]);
        }
        setSelectedUser('');
    }, [selectedBranch]);

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const handleAdd = async () => {
        if (!selectedUser || !selectedBranch || parseFloat(maxAmount) <= 0) {
            setSnackbar({
                open: true,
                message: 'Complete todos los campos y verifique el monto',
                severity: 'warning'
            });
            return;
        }

        try {
            await API.post('/api/approvers', {
                user_id: selectedUser,
                branch_id: selectedBranch,
                max_amount: parseFloat(maxAmount)
            });

            setSnackbar({
                open: true,
                message: 'Aprobador agregado correctamente',
                severity: 'success'
            });

            onClose();
            setSelectedBranch(initialBranchId || '');
            setSelectedUser('');
            setMaxAmount(0);

            if (onSuccess) onSuccess(); // para recargar lista si aplica
        } catch (err) {
            const errores = err.response?.data?.errors;
            const mensaje = errores
                ? errores.map(e => e.msg).join(', ')
                : err.response?.data?.error || 'Error inesperado.';

            setSnackbar({
                open: true,
                message: mensaje,
                severity: 'error'
            });
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle>Agregar aprobadores</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Sucursal</InputLabel>
                            <Select
                                label="Sucursal"
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                            >
                                {branches.map((branch) => (
                                    <MenuItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Usuario</InputLabel>
                            <Select
                                label="Usuario"
                                value={selectedUser}
                                onChange={(e) => setSelectedUser(e.target.value)}
                                disabled={!selectedBranch}
                            >
                                {users.map((user) => (
                                    <MenuItem key={user.id} value={user.id}>
                                        {user.full_name} ({user.user_name})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <NumericFormat
                            value={maxAmount}
                            customInput={TextField}
                            label="Monto máximo a aprobar"
                            thousandSeparator="," // Usa "." si prefieres formato latino
                            decimalSeparator="."
                            decimalScale={2}
                            prefix='C$'
                            allowNegative={false}
                            allowLeadingZeros={false}
                            onValueChange={(values) => {
                                setMaxAmount(values.floatValue || 0);
                            }}
                            fullWidth
                            margin="normal"
                        />

                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button
                        onClick={handleAdd}
                        disabled={!selectedUser || !selectedBranch}
                        variant="contained"
                    >
                        Agregar
                    </Button>
                </DialogActions>
            </Dialog>

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
        </>
    );
}

export default ApproverAddDialog;
