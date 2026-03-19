import React, { useState } from 'react';
import {
    Container,
    Typography,
    Button,
    CircularProgress,
    TextField,
    Box
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import API from '../api';
import dayjs from 'dayjs';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const SinRiesgoReport = () => {
    const [fechaFin, setFechaFin] = useState(dayjs());
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState("");
    const [selectionModel, setSelectionModel] = useState([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const formattedDate = fechaFin.format("YYYY-MM-DD");

            const res = await API.post("api/sinriesgo", {
                fechaFin: formattedDate
            });

            const withId = res.data.map((row, index) => ({ id: index + 1, ...row }));
            setRows(withId);
            setSelectionModel([]);
        } catch (err) {
            console.error("Error al consultar reporte:", err);
            setError("No se pudo cargar el reporte.");
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        if (rows.length === 0) return;

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], { type: "application/octet-stream" });
        saveAs(data, `reporte_sin_riesgo_${dayjs().format("YYYYMMDD")}.xlsx`);
    };

    const deleteSelected = () => {
        setRows(rows.filter((row) => !selectionModel.includes(row.id)));
        setSelectionModel([]);
    };

    const columns = [
        { field: 'tipoEntidad', headerName: 'Entidad', flex: 1 },
        { field: 'correlativo', headerName: 'Correlativo', flex: 1 },
        { field: 'fecha_reporte', headerName: 'Fecha', flex: 1 },
        { field: 'municipio', headerName: 'Municipio', flex: 1 },
        { field: 'depto', headerName: 'Depto', flex: 1 },
        { field: 'cedula', headerName: 'Cédula', flex: 1 },
        { field: 'nombre', headerName: 'Nombre', flex: 1.5 },
        { field: 'telefono', headerName: 'Teléfono', flex: 1 },
        { field: 'dir_domicilio', headerName: 'Domicilio', flex: 2 },
        { field: 'dir_negocio', headerName: 'Negocio', flex: 2 },
    ];

    const filteredRows = rows.filter((row) =>
        Object.values(row).some((value) =>
            value?.toString().toLowerCase().includes(searchText.toLowerCase())
        )
    );

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Typography variant="h5" gutterBottom>
                Reporte Sin Riesgo
            </Typography>

            {/* Selector de fecha y botones */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                    label="Fecha Fin"
                    value={fechaFin}
                    onChange={(newValue) => setFechaFin(newValue)}
                    renderInput={(params) => <TextField {...params} sx={{ mr: 2 }} />}
                />
            </LocalizationProvider>

            <Button
                variant="contained"
                color="primary"
                onClick={fetchData}
                disabled={loading}
                sx={{ mr: 2 }}
            >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Consultar"}
            </Button>

            {rows.length > 0 && (
                <>
                    <Button
                        variant="outlined"
                        color="success"
                        onClick={exportToExcel}
                        sx={{ ml: 2 }}
                    >
                        Exportar a Excel
                    </Button>

                    <Button
                        variant="outlined"
                        color="error"
                        onClick={deleteSelected}
                        sx={{ ml: 2 }}
                        disabled={selectionModel.length === 0}
                    >
                        Eliminar seleccionadas
                    </Button>

                </>
            )}

            {error && (
                <Typography color="error" sx={{ mt: 2 }}>
                    {error}
                </Typography>
            )}

            {/* 🔎 Barra de búsqueda */}
            {rows.length > 0 && (
                <Box sx={{ mt: 3, mb: 2 }}>
                    <TextField
                        label="Buscar en todas las columnas"
                        variant="outlined"
                        fullWidth
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </Box>
            )}

            {rows.length > 0 && (
                <div style={{ height: 600, width: '100%' }}>
                    <DataGrid
                        rows={filteredRows}
                        columns={columns}
                        pageSize={10}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        checkboxSelection
                        disableSelectionOnClick
                        components={{ Toolbar: GridToolbar }}
                        selectionModel={selectionModel}
                        onSelectionModelChange={(newSelection) => {
                            // En v5 es array, en v6 puede ser Set u objeto
                            const ids = Array.isArray(newSelection)
                                ? newSelection
                                : Array.from(newSelection);

                            setSelectionModel(ids);
                        }}
                    />
                </div>
            )}
        </Container>
    );
};

export default SinRiesgoReport;
