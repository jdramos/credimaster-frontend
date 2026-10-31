import React, { useContext, useEffect, useState } from 'react';
import HelpButton from "./help/HelpButton";
import API from '../api';
import { UserContext } from '../contexts/UserContext';
import {
    Box, Typography, IconButton, Tooltip, TextField
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import BlockIcon from '@mui/icons-material/Block';
import LocationOffIcon from '@mui/icons-material/LocationOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Chip, Paper, Divider } from '@mui/material';
import { Button } from '@mui/material';
import { Dialog, DialogContent, DialogTitle, DialogActions, Alert } from '@mui/material';
import UserAdd from './UserAdd';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FormControlLabel, Checkbox } from '@mui/material';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import ReportExportButtons from './common/ReportExportButtons';
import { reportFilters } from './common/reportFormat';

// Accesos del usuario (web / app móvil) en texto, para la grilla y los reportes.
export const accessLabel = (user) => {
    if (user.web_access === undefined) return '';
    const parts = [];
    if (Number(user.web_access) === 1) parts.push('Web');
    if (Number(user.app_access) === 1) parts.push('App móvil');
    return parts.join(' + ') || 'Sin acceso';
};

const quotaText = (label, q) => (q.max === null ? `${label}: ${q.used} (sin límite)` : `${label}: ${q.used} de ${q.max}`);

// Usuarios activos por canal frente a lo contratado por la empresa.
export const UserQuotaIndicator = ({ quota }) => {
    if (!quota?.enabled) return null;
    return (
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1} data-testid="user-quota">
            <Typography variant="body2" color="text.secondary">Usuarios contratados:</Typography>
            {[['Web', quota.web], ['App móvil', quota.app]].map(([label, q]) => {
                const full = q.max !== null && q.used >= q.max;
                return (
                    <Tooltip
                        key={label}
                        title={full ? 'Cupo lleno: para dar este acceso a otro usuario desactive uno o amplíe el plan con su proveedor.' : 'Usuarios activos con este acceso / contratados'}
                    >
                        <Chip label={quotaText(label, q)} size="small" color={full ? 'warning' : 'default'} variant={full ? 'filled' : 'outlined'} />
                    </Tooltip>
                );
            })}
        </Box>
    );
};

const UsersList = () => {
    const { permissions = [], role } = useContext(UserContext) || {};
    const canCreateUser = role === 1 || permissions.includes('usuarios.insertar');
    const canEditUser = role === 1 || permissions.includes('usuarios.editar');
    const [rows, setRows] = useState([]);
    const [filteredRows, setFilteredRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [openAddModal, setOpenAddModal] = useState(false);
    const [editUser, setEditUser] = useState(false);
    const [showInactive, setShowInactive] = useState(true);
    const [viewUser, setViewUser] = useState(null);
    // Excepciones a la ubicación obligatoria de la app móvil, por id de usuario.
    const [exemptions, setExemptions] = useState({});
    const [locationUser, setLocationUser] = useState(null);
    const [locationReason, setLocationReason] = useState('');
    const [locationError, setLocationError] = useState('');
    const [locationSaving, setLocationSaving] = useState(false);
    const [quota, setQuota] = useState(null);
    // { user, active } del usuario a activar/desactivar (confirmación).
    const [statusUser, setStatusUser] = useState(null);
    const [statusError, setStatusError] = useState('');
    const [statusSaving, setStatusSaving] = useState(false);


    const exportToExcel = () => {
        const worksheetData = filteredRows.map(user => ({
            ID: user.id,
            Usuario: user.user_name,
            'Nombre Completo': user.full_name,
            Email: user.email,
            Rol: user.role_name,
            Estado: user.user_status,
            Acceso: accessLabel(user),
            Sucursales: user.branch_name,
            'Ubicación en la app': exemptions[user.id] ? 'Exenta' : 'Obligatoria',
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

        saveAs(blob, `usuarios-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };



    // Impresión con las mismas columnas y filas que el Excel.
    const buildReport = () => ({
        title: 'Lista de Usuarios',
        subtitle: reportFilters([
            ['Búsqueda', search.trim()],
            ['Inactivos', showInactive ? '' : 'ocultos'],
            ['Contratados', quota?.enabled ? `${quotaText('web', quota.web)} · ${quotaText('app móvil', quota.app)}` : ''],
        ]),
        columns: [
            { field: 'id', label: 'ID' },
            { field: 'user_name', label: 'Usuario' },
            { field: 'full_name', label: 'Nombre Completo' },
            { field: 'email', label: 'Email' },
            { field: 'role_name', label: 'Rol' },
            { field: 'user_status', label: 'Estado' },
            { label: 'Acceso', value: accessLabel },
            { field: 'branch_name', label: 'Sucursales' },
            { label: 'Ubicación en la app', value: (r) => (exemptions[r.id] ? 'Exenta' : 'Obligatoria') },
        ],
        rows: filteredRows,
        totals: [{ value: `Usuarios: ${filteredRows.length}`, colspan: 9 }],
        orientation: 'landscape',
    });

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

    const fetchQuota = () => {
        API.get('/api/users/quota')
            .then(res => setQuota(res.data?.enabled ? res.data : null))
            .catch(() => setQuota(null));
    };

    const fetchExemptions = () => {
        API.get('/api/users/location-exemptions')
            .then(res => setExemptions(Object.fromEntries((res.data?.data || []).map(e => [e.user_id, e]))))
            .catch(err => console.error(err));
    };

    useEffect(() => {
        fetchUsers();
        fetchExemptions();
        fetchQuota();
    }, []);

    const openLocationDialog = (user) => {
        setLocationUser(user);
        setLocationReason(exemptions[user.id]?.reason || '');
        setLocationError('');
    };

    const saveLocationExemption = async (exempt) => {
        setLocationError('');
        if (exempt && locationReason.trim().length < 5) {
            setLocationError('Indique el motivo de la excepción (mínimo 5 caracteres).');
            return;
        }
        setLocationSaving(true);
        try {
            await API.put(`/api/users/${locationUser.id}/location-exemption`, { exempt, reason: locationReason.trim() });
            toast.success(exempt ? 'Excepción guardada' : 'Excepción quitada', { position: 'top-center', autoClose: 3000 });
            setLocationUser(null);
            fetchExemptions();
        } catch (err) {
            setLocationError(err.response?.data?.message || 'No se pudo guardar la excepción');
        } finally {
            setLocationSaving(false);
        }
    };


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
    }, [search, rows, showInactive]);

    const handleEdit = (user) => {
        setEditUser({ user });
        setOpenAddModal(true);
    };


    const handleView = (user) => {
        console.log('Ver:', user);
    };

    const saveStatus = async () => {
        const { user, active } = statusUser;
        setStatusSaving(true);
        setStatusError('');
        try {
            await API.put(`/api/users/${user.id}/status`, { active });
            toast.success(active ? 'Usuario activado' : 'Usuario desactivado', { position: 'top-center', autoClose: 3000 });
            setStatusUser(null);
            fetchUsers();
            fetchQuota();
        } catch (err) {
            setStatusError(err.response?.data?.message || 'No se pudo cambiar el estado del usuario');
        } finally {
            setStatusSaving(false);
        }
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
        { field: 'department_name', headerName: 'Departamento', width: 150 },
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

        ...(quota?.enabled ? [{
            field: 'access',
            headerName: 'Acceso',
            width: 140,
            sortable: false,
            valueGetter: (params) => accessLabel(params.row),
        }] : []),
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
            field: 'location_exempt',
            headerName: 'Ubicación en la app',
            width: 170,
            sortable: false,
            renderCell: (params) => {
                const ex = exemptions[params.row.id];
                return ex ? (
                    <Tooltip title={`Exenta: ${ex.reason}`}>
                        <Chip label="Exenta" color="warning" size="small" />
                    </Tooltip>
                ) : (
                    <Chip label="Obligatoria" size="small" variant="outlined" />
                );
            }
        },
        {
            field: 'acciones',
            headerName: 'Acciones',
            width: 220,
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
                    {canEditUser && (
                        <Tooltip title="Editar">
                            <IconButton onClick={() => {
                                setEditUser(params.row); // 👉 pasa los datos al estado
                                setOpenAddModal(true);   // 👉 abre el modal
                            }} color="success">
                                <EditIcon />
                            </IconButton>

                        </Tooltip>
                    )}
                    {canEditUser && (
                        <Tooltip title="Ubicación en la app (excepción)">
                            <IconButton onClick={() => openLocationDialog(params.row)} color={exemptions[params.row.id] ? 'warning' : 'default'}>
                                <LocationOffIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    {canEditUser && (params.row.user_status === 'Activo' ? (
                        <Tooltip title="Desactivar">
                            <IconButton onClick={() => { setStatusError(''); setStatusUser({ user: params.row, active: false }); }} color="error">
                                <BlockIcon />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <Tooltip title="Activar">
                            <IconButton onClick={() => { setStatusError(''); setStatusUser({ user: params.row, active: true }); }} color="success">
                                <CheckCircleOutlineIcon />
                            </IconButton>
                        </Tooltip>
                    ))}
                </>
            )
        }
    ];

    return (
        <>
            <Box p={3} sx={{ height: '100vh', overflowY: 'auto', width: '100%' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={0.25}>
                        <Typography variant="h5">Lista de Usuarios</Typography>
                        <HelpButton screenKey="usuarios.listado" />
                    </Box>
                    {canCreateUser && (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => setOpenAddModal(true)}
                        >
                            Agregar Usuario
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        color="success"
                        onClick={exportToExcel}
                    >
                        Exportar a Excel
                    </Button>
                    <ReportExportButtons excel={false} report={buildReport} disabled={loading || !filteredRows.length} />


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
                    <UserQuotaIndicator quota={quota} />

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
                        initialState={{ pagination: { pageSize: 10 } }}
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
                            fetchQuota();
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
                            {viewUser?.web_access !== undefined && (
                                <Typography><strong>Acceso:</strong> {accessLabel(viewUser)}</Typography>
                            )}
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


            <Dialog open={Boolean(locationUser)} onClose={() => !locationSaving && setLocationUser(null)} fullWidth maxWidth="sm">
                <DialogTitle>Ubicación en la app — {locationUser?.full_name}</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Por defecto la app móvil bloquea toda operación mientras el usuario no tenga la ubicación activa.
                        Con una excepción, a este usuario no se le exige. Queda registrado quién la creó y el motivo.
                    </Typography>
                    {locationUser && exemptions[locationUser.id] ? (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            Este usuario está exento. Creada por {exemptions[locationUser.id].created_by_name || '—'} el {String(exemptions[locationUser.id].created_at || '').replace('T', ' ').slice(0, 16)}.
                        </Alert>
                    ) : (
                        <Alert severity="info" sx={{ mb: 2 }}>A este usuario se le exige la ubicación.</Alert>
                    )}
                    <TextField
                        label="Motivo de la excepción"
                        fullWidth
                        multiline
                        minRows={2}
                        value={locationReason}
                        onChange={(e) => setLocationReason(e.target.value)}
                        inputProps={{ maxLength: 300 }}
                    />
                    {locationError && <Alert severity="error" sx={{ mt: 2 }}>{locationError}</Alert>}
                </DialogContent>
                <DialogActions>
                    {locationUser && exemptions[locationUser.id] && (
                        <Button color="error" disabled={locationSaving} onClick={() => saveLocationExemption(false)}>Quitar excepción</Button>
                    )}
                    <Button disabled={locationSaving} onClick={() => setLocationUser(null)}>Cancelar</Button>
                    <Button variant="contained" disabled={locationSaving} onClick={() => saveLocationExemption(true)}>
                        {locationUser && exemptions[locationUser.id] ? 'Guardar motivo' : 'Crear excepción'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={Boolean(statusUser)} onClose={() => !statusSaving && setStatusUser(null)} fullWidth maxWidth="sm">
                <DialogTitle>{statusUser?.active ? 'Activar' : 'Desactivar'} usuario — {statusUser?.user.full_name}</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2">
                        {statusUser?.active
                            ? 'El usuario podrá volver a iniciar sesión. Ocupará un usuario contratado en cada acceso que tenga (web y/o app móvil).'
                            : 'El usuario no podrá iniciar sesión y su sesión abierta se cerrará. Libera su cupo de usuarios contratados.'}
                    </Typography>
                    {statusUser && accessLabel(statusUser.user) && (
                        <Typography variant="body2" sx={{ mt: 1 }}><strong>Acceso:</strong> {accessLabel(statusUser.user)}</Typography>
                    )}
                    {statusError && <Alert severity="error" sx={{ mt: 2 }}>{statusError}</Alert>}
                </DialogContent>
                <DialogActions>
                    <Button disabled={statusSaving} onClick={() => setStatusUser(null)}>Cancelar</Button>
                    <Button variant="contained" color={statusUser?.active ? 'success' : 'error'} disabled={statusSaving} onClick={saveStatus}>
                        {statusUser?.active ? 'Activar' : 'Desactivar'}
                    </Button>
                </DialogActions>
            </Dialog>

            <ToastContainer />

        </>

    );
};

export default UsersList;

