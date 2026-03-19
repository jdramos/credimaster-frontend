import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Button, FormControl, InputLabel, Select, MenuItem, Box, Snackbar, Alert
} from '@mui/material';
import API from '../api';
import { NumericFormat } from 'react-number-format';

export default function ApproverEditDialog({ open, onClose, approver, onSuccess }) {
    const [maxAmount, setMaxAmount] = useState(approver?.max_amount ?? 0);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        if (approver) {
            setMaxAmount(approver.max_amount);
        }
    }, [approver]);

    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    const handleSave = async () => {
        try {
            await API.put(`/api/approvers/${approver.id}`, {
                max_amount: parseFloat(maxAmount)
            });

            setSnackbar({
                open: true,
                message: 'Monto actualizado correctamente',
                severity: 'success'
            });

            onClose();
            if (onSuccess) onSuccess();
        } catch (err) {
            const msg = err?.response?.data?.error || 'Error al actualizar';
            setSnackbar({ open: true, message: msg, severity: 'error' });
        }
    };

    return (
        <>
            <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
                <DialogTitle>Modificar aprobador</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <TextField
                            label="Usuario"
                            value={approver?.full_name ?? ''}
                            fullWidth
                            disabled
                        />

                        <TextField
                            label="Sucursal"
                            value={approver?.branch_name ?? ''}
                            fullWidth
                            disabled
                            sx={{ mt: 2 }}
                        />

                        <NumericFormat
                            label="Nuevo monto máximo"
                            value={maxAmount}
                            customInput={TextField}
                            thousandSeparator=","
                            decimalSeparator="."
                            decimalScale={2}
                            allowNegative={false}
                            onValueChange={(values) => setMaxAmount(values.floatValue || 0)}
                            fullWidth
                            margin="normal"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained">Guardar</Button>
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
