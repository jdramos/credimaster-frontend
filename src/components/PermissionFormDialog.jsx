import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button
} from '@mui/material';
import axios from 'axios';

const PermissionFormDialog = ({ open, onClose, onSuccess, permissionToEdit }) => {
    const [permissionName, setPermissionName] = useState('');
    const [permissionTag, setPermissionTag] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (permissionToEdit) {
            setPermissionName(permissionToEdit.permission_name || '');
            setPermissionTag(permissionToEdit.permission_tag || '');
        } else {
            setPermissionName('');
            setPermissionTag('');
        }
    }, [permissionToEdit]);

    const handleSubmit = async () => {
        if (!permissionName || !permissionTag) return;
        setLoading(true);
        try {
            const payload = {
                permission_name: permissionName,
                permission_tag: permissionTag
            };
            const endpoint = permissionToEdit
                ? `${process.env.REACT_APP_API_BASE_URL}/api/permissions/${permissionToEdit.id}`
                : `${process.env.REACT_APP_API_BASE_URL}/api/permissions`;
            const method = permissionToEdit ? 'put' : 'post';

            await axios[method](endpoint, payload, {
                headers: { Authorization: process.env.REACT_APP_API_TOKEN }
            });

            onSuccess();
        } catch (err) {
            console.error('Error al guardar el permiso:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>{permissionToEdit ? 'Editar Permiso' : 'Agregar Permiso'}</DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    label="Nombre del Permiso"
                    margin="normal"
                    value={permissionName}
                    onChange={(e) => setPermissionName(e.target.value)}
                />
                <TextField
                    fullWidth
                    label="Etiqueta del Permiso"
                    margin="normal"
                    value={permissionTag}
                    onChange={(e) => setPermissionTag(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || !permissionName || !permissionTag}
                >
                    {permissionToEdit ? 'Actualizar' : 'Guardar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PermissionFormDialog;
