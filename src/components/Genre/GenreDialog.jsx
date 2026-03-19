import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Stack
} from '@mui/material';
import API from '../../api';

export default function GenreDialog({ open, onClose, initial }) {
    const [form, setForm] = useState({ name: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(initial?.id ? { name: initial.name } : { name: '' });
    }, [initial, open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((p) => ({ ...p, [name]: value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = {
                name: String(form.name || '').trim()
            };
            if (!payload.name) {
                throw new Error('Nombre es requerido.');
            }
            if (initial?.id) {
                await API.put(`/genres/${initial.id}`, payload);
            } else {
                await API.post('/genres', payload);
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
            <DialogTitle>{initial?.id ? 'Editar género' : 'Nuevo género'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Nombre"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        autoFocus
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
