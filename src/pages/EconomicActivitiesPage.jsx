import React, { useEffect, useMemo, useState } from 'react';
import {
	Box, Button, Container, Paper, Stack, TextField,
	Snackbar, Alert, IconButton, Tooltip, Typography
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import API from '../api';
import EconomicActivityDialog from '../components/conami/ActividadEconomicaDialog';

export default function EconomicActivitiesPage() {
	const [rows, setRows] = useState([]);
	const [total, setTotal] = useState(0);
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
			const sortBy = sortModel[0]?.field || 'id';
			const sortDir = sortModel[0]?.sort || 'asc';
			const params = {
				page: page + 1,       // API espera base 1
				pageSize,
				sortBy,
				sortDir,
				search
			};
			const res = await API.get('api/conami/actividad_economica', { params });
			setRows(res.data.rows || []);
			setTotal(res.data.total || 0);
		} catch (err) {
			console.error(err);
			setSnack({ open: true, severity: 'error', message: 'Error cargando datos' });
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchData(); }, [page, pageSize, sortModel, search]);

	const columns = useMemo(() => ([
		{ field: 'id', headerName: 'ID', width: 90 },
		{
			field: 'conami_code',
			headerName: 'Código CONAMI',
			width: 160,
			renderCell: (params) => {
				const isBold = String(params.value).endsWith('00');
				return (
					<span style={{ fontWeight: isBold ? 'bold' : 'normal' }}>
						{params.value}
					</span>
				);
			}
		},
		{
			field: 'description',
			headerName: 'Descripción',
			flex: 1,
			minWidth: 240,
			renderCell: (params) => {
				const isBold = String(params.row.conami_code).endsWith('00');
				return (
					<span style={{ fontWeight: isBold ? 'bold' : 'normal' }}>
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
					<Typography variant="h5">Actividades económicas</Typography>
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
						rows={rows}
						columns={columns}
						rowCount={total}
						loading={loading}
						getRowId={(r) => r.id}
						paginationMode="server"
						sortingMode="server"
						filterMode="server"
						paginationModel={{ page, pageSize }}
						onPaginationModelChange={(model) => {
							setPage(model.page);
							setPageSize(model.pageSize);
						}}
						pageSizeOptions={[5, 10, 20, 50]}

						sortModel={sortModel}
						onSortModelChange={setSortModel}
						disableRowSelectionOnClick
					/>
				</div>
			</Paper>

			<EconomicActivityDialog
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
