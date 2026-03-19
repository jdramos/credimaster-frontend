import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import {
    Box,
    TextField,
    IconButton,
    Typography,
    Grid,
    Divider,
    TableRow,
    TableCell,

} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { NumericFormat } from 'react-number-format';
import { Label } from 'reactstrap';


const CustomerGuaranteesTab = forwardRef(({ guarantees, setGuarantees, mode }, ref) => {

    const cleanedGuarantees = guarantees.map(g => ({
        ...g,
        value: typeof g.value === 'string' ? parseFloat(g.value.replace(/[^0-9.]/g, '')) : g.value
    }));

    const totalValue = guarantees.reduce((acc, g) => acc + Number(g.value || 0), 0);
    const totalGuaranteeValue = useMemo(() => {
        return guarantees.reduce((sum, g) => sum + Number(g.value || 0), 0);
    }, [guarantees]);


    useImperativeHandle(ref, () => ({
        validate: () => {
            let valid = true;
            let newErrors = {};
            for (let i = 0; i < guarantees.length; i++) {
                const g = guarantees[i];
                const rawValue = typeof g.value === 'string'
                    ? parseFloat(g.value.replace(/[^0-9.]/g, '')) // quita todo excepto números y punto
                    : g.value;

                if (!g.article || isNaN(rawValue) || rawValue <= 0) {
                    valid = false;
                }
            }

            return {ok: valid, errors: newErrors}
        }
    }));


    const handleChange = (index, field, value) => {
        const updated = [...guarantees];
        updated[index][field] = value;
        setGuarantees(updated);
    };


    const handleDelete = (index) => {
        const updated = [...guarantees];
        updated.splice(index, 1);
        setGuarantees(updated);
    };

    const addGuarantee = () => {
        setGuarantees([...guarantees, { article: "", series: "", brand: "", value: 0 }]);
    };
    const isReadOnly = mode === 'show';

    return (
        <Box mt={2}>
            <Typography variant="h6">Garantías</Typography>
            <Divider sx={{ mb: 2 }} />

            {guarantees.map((g, index) => (
                <Grid container spacing={1} key={index} alignItems="center" mb={1}>
                    <Grid item xs={2}>
                        <TextField
                            label="Artículo"
                            value={g.article}
                            onChange={(e) => handleChange(index, 'article', e.target.value)}
                            fullWidth
                            name='article'
                            size='small'
                            disabled={isReadOnly}
                        />
                    </Grid>
                    <Grid item xs={2}>
                        <TextField
                            label="Serie"
                            value={g.series}
                            onChange={(e) => handleChange(index, 'series', e.target.value)}
                            fullWidth
                            name='series'
                            size='small'
                            disabled={isReadOnly}
                        />
                    </Grid>
                    <Grid item xs={2}>
                        <TextField
                            label="Marca"
                            value={g.brand}
                            onChange={(e) => handleChange(index, 'brand', e.target.value)}
                            fullWidth
                            name='brand'
                            size='small'
                            disabled={isReadOnly}
                        />
                    </Grid>

                    <Grid item xs={2} key={index}>
                        <NumericFormat
                            customInput={TextField}
                            decimalScale={2}
                            decimalSeparator='.'
                            thousandSeparator=','
                            prefix="C$"
                            label="Valor"
                            name='value'
                            value={g.value}
                            onValueChange={(values) => handleChange(index, 'value', values.floatValue)}
                            size='small'
                            fullWidth
                            disabled={isReadOnly}
                        />
                    </Grid>

                    {!isReadOnly && (
                        <Grid item xs={2}>
                            <IconButton onClick={() => handleDelete(index)} color="error">
                                <DeleteIcon />
                            </IconButton>
                        </Grid>
                    )}


                </Grid>
            ))}


            {!isReadOnly && (
                <Box mt={2}>
                    <IconButton onClick={addGuarantee} color="primary">+ Agregar Garantía</IconButton>
                </Box>
            )}
            <TableRow>
                <TableCell align="right">
                    <Box mt={2}>
                        <Typography variant="subtitle1" fontWeight="bold">
                            Total Garantías:
                        </Typography>
                        <NumericFormat
                            value={totalGuaranteeValue}
                            displayType="text"
                            thousandSeparator
                            decimalSeparator="."
                            decimalScale={2}
                            fixedDecimalScale
                            prefix="C$ "
                            renderText={(value) => (
                                <Typography variant="h6" color="primary" sx={{ mt: 0.5 }}>
                                    {value}
                                </Typography>
                            )}
                        />
                    </Box>

                </TableCell>
            </TableRow>

        </Box>
    );
});

export default CustomerGuaranteesTab;
