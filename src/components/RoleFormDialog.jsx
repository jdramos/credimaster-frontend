import React, { useEffect, useState } from 'react';
import {
	Box, Typography, Button, TextField, CircularProgress, Paper, List, ListItem, ListItemText
} from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import axios from 'axios';

// ... (código anterior sin cambios)

const RoleFormDialog = ({ role, onClose, refreshTrigger }) => {
	const [roleName, setRoleName] = useState(role?.role_name || '');
	const [permissions, setPermissions] = useState([]);
	const [assignedPermissions, setAssignedPermissions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [filterText, setFilterText] = useState('');

	useEffect(() => {
		const fetchPermissions = async () => {
			try {
				const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/permissions`, {
					headers: { Authorization: process.env.REACT_APP_API_TOKEN }
				});
				setPermissions(res.data);
			} catch (err) {
				console.error('Error al cargar permisos:', err);
			}
		};

		fetchPermissions();
	}, [refreshTrigger]);

	useEffect(() => {
		const fetchRolePermissions = async () => {
			if (!role) return;
			try {
				const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/roles/${role.id}/permissions`, {
					headers: { Authorization: process.env.REACT_APP_API_TOKEN }
				});
				setAssignedPermissions(res.data);
			} catch (err) {
				console.error('Error al obtener permisos del rol:', err);
			}
		};

		fetchRolePermissions();
	}, [role]);

	const handleSubmit = async () => {
		if (!roleName) return;
		setLoading(true);
		const payload = {
			role_name: roleName,
			roles_permissions: assignedPermissions.map(p => p.id)
		};
		try {
			if (role) {
				await axios.put(`${process.env.REACT_APP_API_BASE_URL}/api/roles/${role.id}`, payload, {
					headers: { Authorization: process.env.REACT_APP_API_TOKEN }
				});
			} else {
				await axios.post(`${process.env.REACT_APP_API_BASE_URL}/api/roles`, payload, {
					headers: { Authorization: process.env.REACT_APP_API_TOKEN }
				});
			}
			onClose();
		} catch (err) {
			console.error('Error al guardar el rol:', err);
		} finally {
			setLoading(false);
		}
	};

	const onDragEnd = (result) => {
		const { source, destination } = result;
		if (!destination) return;

		const sourceList = source.droppableId === 'available' ? permissions : assignedPermissions;
		const item = sourceList[source.index];

		if (source.droppableId !== destination.droppableId) {
			if (destination.droppableId === 'assigned') {
				setAssignedPermissions([...assignedPermissions, item]);
				setPermissions(permissions.filter(p => p.id !== item.id));
			} else {
				setPermissions([...permissions, item]);
				setAssignedPermissions(assignedPermissions.filter(p => p.id !== item.id));
			}
		}
	};

	const filteredPermissions = permissions.filter(perm =>
		perm.permission_name.toLowerCase().includes(filterText.toLowerCase())
	);

	return (
		<Box>
			<TextField
				label="Nombre del Rol"
				fullWidth
				margin="normal"
				value={roleName}
				onChange={(e) => setRoleName(e.target.value)}
			/>

			<DragDropContext onDragEnd={onDragEnd}>
				<Box display="flex" gap={2} mt={2}>
					<Box flex={1}>
						<Typography variant="subtitle1">Permisos disponibles</Typography>
						<TextField
							fullWidth
							size="small"
							label="Buscar permiso"
							value={filterText}
							onChange={(e) => setFilterText(e.target.value)}
						/>
						<Droppable droppableId="available">
							{(provided) => (
								<Paper
									ref={provided.innerRef}
									{...provided.droppableProps}
									sx={{ minHeight: 300, mt: 1, p: 1 }}
								>
									<List>
										{filteredPermissions.map((perm, index) => (
											<Draggable key={perm.id} draggableId={String(perm.id)} index={index}>
												{(provided) => (
													<ListItem
														ref={provided.innerRef}
														{...provided.draggableProps}
														{...provided.dragHandleProps}
													>
														<ListItemText primary={perm.permission_name} />
													</ListItem>
												)}
											</Draggable>
										))}
										{provided.placeholder}
									</List>
								</Paper>
							)}
						</Droppable>
					</Box>

					<Box flex={1}>
						<Typography variant="subtitle1">Permisos asignados</Typography>
						<Droppable droppableId="assigned">
							{(provided) => (
								<Paper
									ref={provided.innerRef}
									{...provided.droppableProps}
									sx={{ minHeight: 300, mt: 4, p: 1 }}
								>
									<List>
										{assignedPermissions.map((perm, index) => (
											<Draggable key={perm.id} draggableId={`assigned-${perm.id}`} index={index}>
												{(provided) => (
													<ListItem
														ref={provided.innerRef}
														{...provided.draggableProps}
														{...provided.dragHandleProps}
													>
														<ListItemText primary={perm.permission_name} />
													</ListItem>
												)}
											</Draggable>
										))}
										{provided.placeholder}
									</List>
								</Paper>
							)}
						</Droppable>
					</Box>
				</Box>
			</DragDropContext>

			<Box mt={3} display="flex" justifyContent="flex-end" gap={2}>
				<Button variant="outlined" onClick={onClose}>Cancelar</Button>
				<Button variant="contained" onClick={handleSubmit} disabled={loading}>
					{role ? 'Actualizar' : 'Crear'}
				</Button>
			</Box>
		</Box>
	);
};

export default RoleFormDialog;