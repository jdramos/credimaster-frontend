import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Table, TableHead, TableBody, TableRow,
    TableCell, TextField, Button, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, MenuItem, Tooltip
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon, Save as SaveIcon } from '@mui/icons-material';
import axios from 'axios';
import { useContext } from 'react';
import { UserContext } from '../contexts/UserContext'; // ajusta la ruta
import API from '../api'; // ajusta la ruta
import { NumericFormat } from 'react-number-format';


const policyTypes = ['number', 'boolean', 'text', 'percentage', 'json'];

const CreditPolicyManager = () => {
    const [policies, setPolicies] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [newPolicy, setNewPolicy] = useState({
        policy_key: '',
        policy_name: '',
        policy_value: '',
        policy_type: 'text',
        description: '',
    });
    const { user } = useContext(UserContext);
    const isAdmin = user?.user === 1 || user?.permissions?.includes('manejar_politicas_credito');
    const { permissions, role } = useContext(UserContext);

    const URL = process.env.REACT_APP_API_BASE_URL + '/api/credit-policies';

    const fetchPolicies = async () => {
        try {
            const res = await API.get(URL);
            setPolicies(res.data);
        } catch (err) {
            console.error('Error al obtener políticas:', err);
        }
    };

    useEffect(() => {
        fetchPolicies();
    }, []); // 👈 se ejecuta solo una vez

    const handleChange = (e) => {
        setNewPolicy({ ...newPolicy, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        const { policy_value, policy_type } = newPolicy;

        // Validación básica
        if (!newPolicy.policy_key || !newPolicy.policy_name || !policy_value) {
            alert("Todos los campos son obligatorios.");
            return;
        }

        if (newPolicy.policy_key === 'max_late_interest_rate') {
            const num = parseFloat(policy_value);

            //validar que la tasa de interés máxima por no sea mayor a la cuarta parte de la tasa de interés máxima por mora

            const maxLateInterestRate = parseFloat(policies.find(p => p.policy_key === 'max_late_interest_rate')?.policy_value) || 0;
            const maxInterestRate = parseFloat(policies.find(p => p.policy_key === 'max_interest_rate')?.policy_value) || 0;
            if (num > (maxInterestRate / 4)) {
                alert("El valor de 'max_late_interest_rate' no puede ser mayor que 'max_interest_rate'.");
                return;
            }


            if (isNaN(num) || num < 0) {
                alert("El valor de 'max_late_interest_rate' debe ser un número mayor o igual a 0.");
                return;
            }
            // Validación específica por tipo
            if (policy_type === 'number' || policy_type === 'percentage') {
                const num = parseFloat(policy_value);
                if (isNaN(num)) {
                    alert("El valor debe ser numérico.");
                    return;
                }
                if (policy_type === 'percentage' && (num <= 0)) {
                    alert("El porcentaje debe ser mayor que 0.");
                    return;
                }
            }
        }

        if (policy_type === 'boolean' && !['true', 'false'].includes(policy_value.toLowerCase())) {
            alert("El valor booleano debe ser 'true' o 'false'.");
            return;
        }

        try {
            if (editingPolicy) {
                await API.put(`${URL}/${newPolicy.policy_key}`, newPolicy);
            } else {
                await API.post(URL, newPolicy); // O solo API.post('/', newPolicy)
            }

            setOpenDialog(false);
            fetchPolicies();
        } catch (error) {
            alert("Error al guardar: " + error.message);
        }
    };


    const handleEdit = (policy) => {
        setNewPolicy(policy);
        setEditingPolicy(policy);
        setOpenDialog(true);
    };

    const handleAdd = () => {
        setNewPolicy({
            policy_key: '',
            policy_name: '',
            policy_value: '',
            policy_type: 'text',
            description: '',
        });
        setEditingPolicy(null);
        setOpenDialog(true);
    };

    return (
        <Box p={3}>
            <Typography variant="h5" gutterBottom>
                Políticas de Crédito
            </Typography>


            {(role === 1 || permissions.includes('creditos.crear'))
                && (<Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
                    Nueva política
                </Button>
                )}

            <Table sx={{ mt: 2 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>Clave</TableCell>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Valor</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell>Acciones</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {policies.map((p) => (
                        <TableRow key={p.policy_key}>
                            <TableCell>{p.policy_key}</TableCell>
                            <TableCell>{p.policy_name}</TableCell>
                            <TableCell>{p.policy_value}</TableCell>
                            <TableCell>{p.policy_type}</TableCell>
                            <TableCell>{p.description}</TableCell>
                            <TableCell>
                                <Tooltip title="Editar">
                                    {(role === 1 || permissions.includes('politicas.editar'))
                                        && (<IconButton onClick={() => handleEdit(p)}><EditIcon /></IconButton>
                                        )}

                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingPolicy ? 'Editar Política' : 'Nueva Política'}</DialogTitle>
                <DialogContent>
                    <TextField
                        label="Clave"
                        name="policy_key"
                        value={newPolicy.policy_key}
                        onChange={handleChange}
                        fullWidth
                        margin="dense"
                        disabled={!!editingPolicy}
                    />
                    <TextField
                        label="Nombre"
                        name="policy_name"
                        value={newPolicy.policy_name}
                        onChange={handleChange}
                        fullWidth
                        margin="dense"
                    />
                    <NumericFormat
                        customInput={TextField}
                        thousandSeparator=","
                        decimalSeparator="."
                        decimalScale={2}

                        prefix="C$ "
                        label="Valor"
                        name="policy_value"
                        value={newPolicy.policy_value}
                        onChange={handleChange}
                        fullWidth
                        margin="dense"

                    />

                    <TextField
                        label="Tipo"
                        name="policy_type"
                        value={newPolicy.policy_type}
                        onChange={handleChange}
                        select
                        fullWidth
                        margin="dense"
                    >
                        {policyTypes.map((type) => (
                            <MenuItem key={type} value={type}>{type}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label="Descripción"
                        name="description"
                        value={newPolicy.description}
                        onChange={handleChange}
                        fullWidth
                        margin="dense"
                        multiline
                        rows={2}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                    <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CreditPolicyManager;
