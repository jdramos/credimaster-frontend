import React, { useEffect, useState } from 'react';
import API from '../api';
import {
    Box, Typography, IconButton, Tooltip, TextField
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlockIcon from '@mui/icons-material/Block';
import { Chip, Paper, Divider } from '@mui/material';
import { Button } from '@mui/material';
import { Dialog, DialogContent } from '@mui/material';
import UserAdd from './UserAdd';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FormControlLabel, Checkbox } from '@mui/material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const UsersList = () => {
    const [rows, setRows] = useState([]);
    const [filteredRows, setFilteredRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [openAddModal, setOpenAddModal] = useState(false);
    const [editUser, setEditUser] = useState(false);
    const [showInactive, setShowInactive] = useState(true);
    const [viewUser, setViewUser] = useState(null);


    const exportToExcel = () => {
        const worksheetData = filteredRows.map(user => ({
            ID: user.id,
            Usuario: user.user_name,
            'Nombre Completo': user.full_name,
            Email: user.email,
            Rol: user.role_name,
            Estado: user.user_status,
            Sucursales: user.branch_name,
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

        saveAs(blob, `usuarios-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };



    const fetchUsers = () => {
        setLoading(true);
        API.get('/api/users')
            .then(res => {
                const dataWithId = res.data.map(user => ({
                    ...user,
                    id: user.id,
                    user_status: user.user_status === 1 ? 'Activo' : 'Inactivo'
                }));
                setRows(dataWithId);
                setFilteredRows(dataWithId);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, []);


    useEffect(() => {
        const lowerSearch = search.toLowerCase();
        const filtered = rows.filter(user => {
            const matchesSearch =
                user.user_name.toLowerCase().includes(lowerSearch) ||
                user.full_name.toLowerCase().includes(lowerSearch) ||
                user.email.toLowerCase().includes(lowerSearch) ||
                user.role_name.toLowerCase().includes(lowerSearch) ||
                user.branch_name?.toLowerCase().includes(lowerSearch);

            const isActive = user.user_status === 'Activo';

            return matchesSearch && (showInactive || isActive);
        });

        setFilteredRows(filtered);
    }, [search, rows]);

    const handleEdit = (user) => {
        setEditUser({ user });
        setOpenAddModal(true);
    };


    const handleView = (user) => {
        console.log('Ver:', user);
    };

    const handleDisable = (user) => {
        console.log('Desactivar:', user);
    };

    const notifySuccess = () => {
        toast.success('Usuario agregado correctamente', {
            position: 'top-center',
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
        });
    };


    const columns = [
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'user_name', headerName: 'Usuario', width: 150 },
        { field: 'full_name', headerName: 'Nombre Completo', width: 200 },
        { field: 'email', headerName: 'Email', width: 200 },
        { field: 'role_name', headerName: 'Rol', width: 150 },
        {
            field: 'user_status',
            headerName: 'Estado',
            width: 120,
            renderCell: (params) => (
                <Chip
                    label={params.value}
                    color={params.value === 'Activo' ? 'success' : 'error'}
                    size="small"
                />
            )
        },

        {
            field: 'branch_name',
            headerName: 'Sucursales',
            width: 300,
            renderCell: (params) => {
                const branches = params.value?.split(',') || [];
                return (
                    <Box sx={{
                        display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', // 🔹 Centrado vertical
                        gap: 0.5,
                        height: '100%'
                    }}>
                        {branches.map((name, index) => (
                            <Chip key={index} label={name.trim()} size="small" color="primary" />
                        ))}
                    </Box>
                );
            }

        }
        ,
        {
            field: 'acciones',
            headerName: 'Acciones',
            width: 150,
            sortable: false,
            renderCell: (params) => (
                <>
                    <Tooltip title="Ver">
                        <IconButton
                            onClick={() => setViewUser(params.row)}
                            color="primary"
                        >
                            <VisibilityIcon />
                        </IconButton>

                    </Tooltip>
                    <Tooltip title="Editar">
                        <IconButton onClick={() => {
                            setEditUser(params.row); // 👉 pasa los datos al estado
                            setOpenAddModal(true);   // 👉 abre el modal
                        }} color="success">
                            <EditIcon />
                        </IconButton>

                    </Tooltip>
                    <Tooltip title="Desactivar">
                        <IconButton onClick={() => handleDisable(params.row)} color="error">
                            <BlockIcon />
                        </IconButton>
                    </Tooltip>
                </>
            )
        }
    ];

    return (
        <>
            <Box p={3} sx={{ height: '100vh', overflowY: 'auto', width: '100%' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5">Lista de Usuarios</Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => setOpenAddModal(true)}
                    >
                        Agregar Usuario
                    </Button>
                    <Button
                        variant="outlined"
                        color="success"
                        onClick={exportToExcel}
                    >
                        Exportar a Excel
                    </Button>


                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Mostrar usuarios inactivos"
                    />

                </Box>

                <>

                    <TextField
                        label="Buscar usuario..."
                        variant="outlined"
                        fullWidth
                        margin="normal"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                </>


                <Box sx={{ height: 600, width: '100%' }}>
                    <DataGrid
                        rows={filteredRows}
                        columns={columns}
                        pageSize={10}
                        rowsPerPageOptions={[5, 10, 20]}
                        loading={loading}
                    />
                </Box>
            </Box>

            <Dialog
                open={openAddModal}
                onClose={() => setOpenAddModal(false)}
                fullWidth
                maxWidth="md"
            >
                <DialogContent>

                    <UserAdd
                        userToEdit={editUser}
                        onClose={(wasCreated = false) => {
                            setOpenAddModal(false);
                            setEditUser(null);
                            fetchUsers();
                            if (wasCreated) {
                                notifySuccess(); // ✅ Solo se muestra si fue creación
                            }
                        }}
                    />

                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(viewUser)}
                onClose={() => setViewUser(null)}
                fullWidth
                maxWidth="sm"
            >
                <DialogContent>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Información del Usuario
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box display="flex" flexDirection="column" gap={2}>
                            <Typography><strong>Usuario:</strong> {viewUser?.user_name}</Typography>
                            <Typography><strong>Nombre completo:</strong> {viewUser?.full_name}</Typography>
                            <Typography><strong>Email:</strong> {viewUser?.email}</Typography>
                            <Typography><strong>Rol:</strong> {viewUser?.role_name}</Typography>
                            <Typography><strong>Estado:</strong> {viewUser?.user_status}</Typography>
                            <Box>
                                <Typography><strong>Sucursales:</strong></Typography>
                                <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                                    {(viewUser?.branch_name?.split(',') || []).map((branch, index) => (
                                        <Chip key={index} label={branch.trim()} size="small" color="primary" />
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    </Paper>
                </DialogContent>
            </Dialog>


            <ToastContainer />

        </>

    );
};

export default UsersList;

