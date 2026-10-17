import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Button, Container, Paper, Stack, TextField,
    Snackbar, Alert, IconButton, Tooltip, Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import API from '../api';
import GenreDialog from '../components/Genre/GenreDialog';

export default function EconomicActivitiesPage() {
    // GET api/genres devuelve el catálogo completo (arreglo plano, sin paginar/ordenar/buscar),
    // así que la paginación, el orden y la búsqueda se hacen en el cliente.
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(0);            // DataGrid usa base 0
    const [pageSize, setPageSize] = useState(10);
    const [sortModel, setSortModel] = useState([{ field: 'id', sort: 'asc' }]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const [snack, setSnack] = useState({ open: false, severity: 'success', message: '' });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await API.get('api/genres');
            const data = res?.data;
            setRows(Array.isArray(data) ? data : (data?.rows || []));
        } catch (err) {
            console.error(err);
            setSnack({ open: true, severity: 'error', message: 'Error cargando datos' });
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchData(); }, []);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => String(r.name ?? '').toLowerCase().includes(q));
    }, [rows, search]);

    const columns = useMemo(() => ([
        { field: 'id', headerName: 'ID', width: 90 },
        {
            field: 'name',
            headerName: 'Descripción',
            flex: 1,
            minWidth: 240,
            renderCell: (params) => {
                return (
                    <span >
                        {params.value}
                    </span>
                );
            }
        },
        {
            field: 'actions',
            headerName: 'Acciones',
            width: 110,
            sortable: false,
            filterable: false,
            renderCell: (params) => (
                <Box>
                    <Tooltip title="Editar">
                        <IconButton
                            size="small"
                            onClick={() => {
                                setEditing(params.row);
                                setDialogOpen(true);
                            }}
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            )
        }
    ]), []);


    return (
        <Container maxWidth="md" sx={{ py: 3 }}>
            <Paper sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h5">Géneros</Typography>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => { setEditing(null); setDialogOpen(true); }}
                    >
                        Agregar
                    </Button>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Buscar por descripción..."
                        value={search}
                        onChange={(e) => { setPage(0); setSearch(e.target.value); }}
                    />
                </Stack>

                <div style={{ height: 540, width: '100%' }}>
                    <DataGrid
                        rows={filteredRows}
                        columns={columns}
                        loading={loading}
                        getRowId={(r) => r.id}
                        page={page}
                        pageSize={pageSize}
                        onPageChange={(newPage) => setPage(newPage)}
                        onPageSizeChange={(newPageSize) => {
                            setPage(0);
                            setPageSize(newPageSize);
                        }}
                        rowsPerPageOptions={[5, 10, 20, 50]}

                        sortModel={sortModel}
                        onSortModelChange={setSortModel}
                        disableSelectionOnClick
                    />
                </div>
            </Paper>

            <GenreDialog
                open={dialogOpen}
                initial={editing}
                onClose={(changed) => {
                    setDialogOpen(false);
                    setEditing(null);
                    if (changed) {
                        setSnack({ open: true, severity: 'success', message: 'Guardado correctamente' });
                        fetchData();
                    }
                }}
            />

            <Snackbar
                open={snack.open}
                autoHideDuration={2500}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
            >
                <Alert severity={snack.severity} variant="filled">{snack.message}</Alert>
            </Snackbar>
        </Container>
    );
}
