import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Paper,
    IconButton,
    Button,
    Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { NumericFormat } from 'react-number-format';

const GuaranteesTable = ({ guarantees, setGuarantees }) => {

    const handleChange = (e, rowIndex) => {
        const { name, value } = e.target;
        const newGuarantees = [...guarantees];
        newGuarantees[rowIndex] = { ...newGuarantees[rowIndex], [name]: value };
        setGuarantees(newGuarantees);
    };

    const handleAddRow = () => {
        const newGuarantees = [...guarantees];
        newGuarantees.push({ article: '', series: '', brand: '', value: 0.00 });
        setGuarantees(newGuarantees);
    };

    const handleDelete = (rowIndex) => {
        const newGuarantees = guarantees.filter((_, index) => index !== rowIndex);
        setGuarantees(newGuarantees);
    };

    const totalValue = guarantees.reduce((total, row) => total + parseFloat(row.value || 0), 0);

    return (
        <div>

            <TableContainer component={Paper}>
                <Table aria-label="guarantees table">
                    <TableHead>
                        <TableRow>
                            <TableCell align="center">Artículo</TableCell>
                            <TableCell align="center">N° de serie</TableCell>
                            <TableCell align="center">Marca/modelo</TableCell>
                            <TableCell align="center">Valor</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {guarantees.map((row, rowIndex) => (
                            <TableRow key={rowIndex} sx={{ gap: 0 }}>
                                <TableCell>
                                    <TextField
                                        name="article"
                                        value={row.article}
                                        onChange={(e) => handleChange(e, rowIndex)}
                                        variant="outlined"
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        name="series"
                                        value={row.series}
                                        onChange={(e) => handleChange(e, rowIndex)}
                                        variant="outlined"
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        name="brand"
                                        value={row.brand}
                                        onChange={(e) => handleChange(e, rowIndex)}
                                        variant="outlined"
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <NumericFormat
                                        customInput={TextField}
                                        variant="outlined"
                                        margin="normal"
                                        type="text"
                                        id="value"
                                        name="value"
                                        value={row.value}
                                        onValueChange={({ value }) => handleChange({ target: { name: 'value', value } }, rowIndex)}
                                        thousandSeparator={true}
                                        decimalSeparator="."
                                        decimalScale={2}
                                        fixedDecimalScale
                                        size="small"
                                        prefix="C$"
                                    />

                                </TableCell>
                                <TableCell size="small" align="justify">
                                    <Tooltip title="Agregar" placement="bottom">
                                        {rowIndex === guarantees.length - 1 && (
                                            <IconButton onClick={handleAddRow}>
                                                <AddIcon />
                                            </IconButton>
                                        )}
                                    </Tooltip>
                                </TableCell>

                                <TableCell size="small" align="justify">
                                    <Tooltip title="Eliminar" placement="bottom">
                                        <IconButton onClick={() => handleDelete(rowIndex)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>

                            </TableRow>
                        ))}

                        <TableRow>
                            <TableCell colSpan={3} align="right"><strong>Total Garantías</strong></TableCell>
                            <TableCell align="center">
                                <NumericFormat
                                    value={totalValue}
                                    displayType={'text'}
                                    thousandSeparator={true}
                                    decimalSeparator="."
                                    decimalScale={2}
                                    fixedDecimalScale
                                    prefix="C$"
                                />
                            </TableCell>
                            <TableCell />
                        </TableRow>
                    </TableBody>

                </Table>
            </TableContainer>
        </div>
    );
};

export default GuaranteesTable;