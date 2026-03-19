import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Stack
} from '@mui/material';
import API from '../../api';

export default function EstadocivilDialog({ open, onClose, initial }) {
    const [form, setForm] = useState({ name: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(initial?.id ? { name: initial.description } : { name: '' });
    }, [initial, open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = {
                conami_code: Number(form.conami_code),
                description: String(form.description || '').trim()
            };
            if (!payload.conami_code || !payload.description) {
                throw new Error('CONAMI y Descripción son requeridos.');
            }
            if (initial?.id) {
                await API.put(`conami/estado_civil/${initial.id}`, payload);
            } else {
                await API.post('conami/estado_civil', payload);
            }
            onClose(true);
        } catch (err) {
            alert(err?.response?.data?.error || err.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
            <DialogTitle>{initial?.id ? 'Editar estado civil' : 'Nuevo estado civil'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Descripción"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={handleSave} variant="contained" disabled={saving}>
                    {initial?.id ? 'Actualizar' : 'Crear'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
