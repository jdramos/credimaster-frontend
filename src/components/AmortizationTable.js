import React from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from "@mui/material";

const AmortizationTable = ({ amortizationTable }) => (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Cuota N°</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Valor Cuota</TableCell>
                        <TableCell>Abono Principal</TableCell>
                        <TableCell>Intereses</TableCell>
                        <TableCell>Saldo Principal</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {amortizationTable.map((row, index) => (
                        <TableRow key={index}>
                            <TableCell>{row.paymentNumber}</TableCell>
                            <TableCell>{new Date(row.paymentDate).toLocaleDateString()}</TableCell>
                            <TableCell>{row.paymentAmount}</TableCell>
                            <TableCell>{row.principal}</TableCell>
                            <TableCell>{row.interest}</TableCell>
                            <TableCell>{row.remainingBalance}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    </Paper>
);

export default AmortizationTable;
