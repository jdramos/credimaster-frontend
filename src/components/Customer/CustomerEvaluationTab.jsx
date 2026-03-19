import React, { forwardRef, useImperativeHandle } from 'react';
import { Box, Typography, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const fields = [
    { key: 'business_type_name', label: 'Actividad Económica del Cliente', weight: 50 },
    { key: 'total_loans', label: 'Clientes / Tipo de Clientes', weight: 10 },
    { key: 'productOrService', label: 'Producto / Servicio', weight: 10 },
    { key: 'creditLimit', label: 'Límite de Crédito', weight: 10 },
    { key: 'chanel', label: 'Canal de Distribución', weight: 10 },
    { key: 'province_name', label: 'Zona Geográfica', weight: 10 },
];

const CustomerEvaluationTab = forwardRef(({ customer }, ref) => {
    useImperativeHandle(ref, () => ({
        validate: () => {
            return fields.every(f => customer.scores?.[f.key] !== undefined && !isNaN(customer.scores[f.key]));
        },
        getTotalScore: () => {
            return fields.reduce((total, f) => {
                const score = parseFloat(customer.scores?.[f.key]) || 0;
                const weighted = (score * f.weight) / 100;
                return total + weighted;
            }, 0);
        }
    }));

    return (
        <Box mt={2}>
            <Typography variant="h6" gutterBottom>Evaluación y Puntaje Ponderado</Typography>
            <Divider sx={{ mb: 2 }} />

            <TableContainer component={Paper}>
                <Table size="small">

                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Descripción</strong></TableCell>
                            <TableCell><strong>Valor</strong></TableCell>
                            <TableCell align="center"><strong>Peso (%)</strong></TableCell>
                            <TableCell align="center"><strong>Ponderación</strong></TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {fields.map(({ key, label, weight }) => {
                            const value = customer[key] || '—';
                            const totalLoans = customer.total_loans || 0;
                            if (key === 'total_loans') {
                                if (totalLoans <= 1) {
                                    return (
                                        <TableRow key={key}>
                                            <TableCell>{label}</TableCell>
                                            <TableCell>Cliente ocasional</TableCell>
                                            <TableCell align="center">{weight}%</TableCell>
                                            <TableCell align="center">—</TableCell>
                                        </TableRow>
                                    );
                                }
                            }
                            const rawScore = parseFloat(customer.scores?.[key]) || 0;
                            const weightedScore = ((rawScore * weight) / 100).toFixed(2);

                            return (
                                <TableRow key={key}>
                                    <TableCell>{label}</TableCell>
                                    <TableCell>{value}</TableCell>
                                    <TableCell align="center">{weight}%</TableCell>
                                    <TableCell align="center">{weightedScore}</TableCell>
                                </TableRow>
                            );
                        })}

                        <TableRow>
                            <TableCell colSpan={2} align="right"><strong>Total</strong></TableCell>
                            <TableCell align="center">
                                <strong>
                                    {fields.reduce((sum, f) => {
                                        const score = parseFloat(customer.scores?.[f.key]) || 0;
                                        return sum + (score * f.weight) / 100;
                                    }, 0).toFixed(2)}
                                </strong>
                            </TableCell>
                        </TableRow>
                    </TableBody>

                </Table>
            </TableContainer>
        </Box>
    );
});

export default CustomerEvaluationTab;
