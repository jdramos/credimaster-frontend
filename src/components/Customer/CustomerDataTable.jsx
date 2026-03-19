import React, { useMemo, useContext } from "react";
import {
	Tooltip,
	Box,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableBody,
	IconButton,
	TableContainer,
	Paper,
	TextField,
	Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import Show from '@mui/icons-material/Visibility';
import { Link } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";

function CustomerDataTable({ columns, data, route, loading, globalFilter, onGlobalFilterChange }) {
	const memoizedColumns = useMemo(() => columns, [columns]);
	const memoizedData = useMemo(() => data, [data]);
	const memoizedRoute = useMemo(() => route, [route]);
	const { permissions, role } = useContext(UserContext);

	return (
		<Box>
			<Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
				<Typography variant="h6">Clientes</Typography>
				<TextField
					label="Buscar"
					variant="outlined"
					size="small"
					value={globalFilter ?? ""}
					onChange={(e) => onGlobalFilterChange(e.target.value)}
					placeholder="Buscar cliente..."
					sx={{ width: '300px' }}
				/>
			</Box>
			<TableContainer component={Paper}>
				<Table size="small">
					<TableHead>
						<TableRow>
							{memoizedColumns.map((col, index) => (
								<TableCell key={index}><strong>{col.header}</strong></TableCell>
							))}
							<TableCell><strong>Acciones</strong></TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{memoizedData.map((row, rowIndex) => (
							<TableRow key={rowIndex} hover>
								{memoizedColumns.map((col, colIndex) => (
									<TableCell key={colIndex}>{row[col.accessorKey]}</TableCell>
								))}
								<TableCell>
									<Box sx={{ display: 'flex', gap: '8px' }}>
										{(role === 1 || permissions.includes('clientes.editar')) && (
											<Tooltip title="Editar">
												<Link to={`/${memoizedRoute}/editar/${row.id}`} state={{ record: row, edit: true }}>
													<IconButton size="small">
														<EditIcon fontSize="small" />
													</IconButton>
												</Link>
											</Tooltip>
										)}
										{(role === 1 || permissions.includes('clientes.mostrar')) && (
											<Tooltip title="Mostrar">
												<Link to={`/${memoizedRoute}/editar/${row.id}`} state={{ record: row, edit: false }}>
													<IconButton size="small">
														<Show fontSize="small" />
													</IconButton>
												</Link>
											</Tooltip>
										)}
									</Box>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</TableContainer>
			{loading && <Typography variant="body2" align="center" mt={2}>Cargando...</Typography>}
		</Box>
	);
}

export default CustomerDataTable;
