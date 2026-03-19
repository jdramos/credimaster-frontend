import React from "react";
import { Tooltip, Box, Table, TableHead, TableRow, TableCell, TableBody, IconButton, TableContainer, Paper } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { Link } from "react-router-dom";

function DataTable({ columns, data, route }) {
    return (
        <TableContainer component={Paper}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        {columns.map((col, index) => (
                            <TableCell key={index}><strong>{col.header}</strong></TableCell>
                        ))}
                        <TableCell><strong>Acciones</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((row, rowIndex) => (
                        <TableRow key={rowIndex} hover>
                            {columns.map((col, colIndex) => (
                                <TableCell key={colIndex}>{row[col.accessorKey]}</TableCell>
                            ))}
                            <TableCell>
                                <Tooltip title="Editar">
                                    <Box>
                                        <Link to={`/${route}/editar/${row.id}`} state={{ record: row }}>
                                            <IconButton size="small">
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Link>
                                    </Box>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

export default DataTable;
