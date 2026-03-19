import React, { useEffect, useState } from 'react';
import {
	Typography,
	List,
	ListItem,
	ListItemText,
	IconButton,
	Paper,
	Divider,
	Box,
	Stack,
	Button,
	Collapse,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import API from '../api';
import ApproverAddDialog from './ApproverAddDialog';
import ApproverEditDialog from './ApproverEditDialog';

export default function ApproverList({ refresh }) {
	const [groupedApprovers, setGroupedApprovers] = useState({});
	const [expanded, setExpanded] = useState({});
	const [dialogOpen, setDialogOpen] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [approverToDelete, setApproverToDelete] = useState(null);

	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [approverToEdit, setApproverToEdit] = useState(null);

	const openEditDialog = (approver) => {
		setApproverToEdit(approver);
		setEditDialogOpen(true);
	};


	const load = async () => {
		const res = await API.get('/api/approvers');
		const data = res.data;

		const grouped = data.reduce((acc, item) => {
			if (!acc[item.branch_name]) acc[item.branch_name] = [];
			acc[item.branch_name].push(item);
			return acc;
		}, {});

		setGroupedApprovers(grouped);

		const initialExpanded = {};
		Object.keys(grouped).forEach(branch => {
			initialExpanded[branch] = true;
		});
		setExpanded(initialExpanded);
	};

	useEffect(() => {
		load();
	}, [refresh]);

	const toggleExpand = (branch) => {
		setExpanded(prev => ({ ...prev, [branch]: !prev[branch] }));
	};

	const confirmDelete = (approver) => {
		setApproverToDelete(approver);
		setConfirmOpen(true);
	};

	const handleDeleteConfirmed = async () => {
		if (!approverToDelete) return;
		await API.delete(`/api/approvers/${approverToDelete.id}`);
		setConfirmOpen(false);
		setApproverToDelete(null);
		load();
	};

	return (
		<div>
			<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} mt={2}>
				<Typography variant="h6">Aprobadores por Sucursal</Typography>
				<Button
					variant="outlined"
					startIcon={<AddCircleIcon />}
					onClick={() => setDialogOpen(true)}
				>
					Agregar Aprobador
				</Button>
			</Stack>

			<ApproverAddDialog
				open={dialogOpen}
				onClose={() => {
					setDialogOpen(false);
					load();
				}}
			/>

			{Object.entries(groupedApprovers).map(([branch, approvers]) => (
				<Paper key={branch} sx={{ mb: 3, p: 2 }}>
					<Stack direction="row" justifyContent="space-between" alignItems="center">
						<Typography variant="subtitle1" color="primary">{branch}</Typography>
						<IconButton onClick={() => toggleExpand(branch)}>
							{expanded[branch] ? <ExpandLess /> : <ExpandMore />}
						</IconButton>
					</Stack>
					<Divider sx={{ my: 1 }} />

					<Collapse in={expanded[branch]}>
						<List dense>
							{approvers.map(a => (
								<ListItem
									key={a.id}
									alignItems="flex-start"
									secondaryAction={
										<Box>
											<IconButton edge="end" aria-label="edit" onClick={() => openEditDialog(a)} mr={4}>
												<EditIcon />
											</IconButton>
											<IconButton edge="end" aria-label="delete" onClick={() => confirmDelete(a)}>
												<DeleteIcon />
											</IconButton>
										</Box>
									}

								>
									<ListItemText
										primary={a.full_name}
										secondary={
											<Box sx={{ display: 'flex', flexDirection: 'column' }}>
												<span>Email: {a.email ?? 'N/A'}</span>
												<span>Rol: {a.role_name ?? 'N/A'}</span>
												<span>Monto máximo: C$ {Number(a.max_amount ?? 0).toLocaleString('en-US', {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2
												})}</span>
											</Box>
										}
									/>
								</ListItem>
							))}
						</List>
					</Collapse>
				</Paper>
			))}

			<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
				<DialogTitle>¿Confirmar eliminación?</DialogTitle>
				<DialogContent>
					<DialogContentText>
						¿Estás seguro que deseas eliminar al aprobador{' '}
						<strong>{approverToDelete?.user_name}</strong>? Esta acción no se puede deshacer.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmOpen(false)} color="inherit">
						Cancelar
					</Button>
					<Button onClick={handleDeleteConfirmed} color="error" variant="contained">
						Eliminar
					</Button>
				</DialogActions>
			</Dialog>

			<ApproverEditDialog
				open={editDialogOpen}
				onClose={() => setEditDialogOpen(false)}
				approver={approverToEdit}
				onSuccess={load}
			/>

		</div>
	);
}