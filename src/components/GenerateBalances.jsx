import React, { useState } from 'react';
import {
    Button, LinearProgress, Alert, Box, Typography, Dialog,
    DialogTitle, DialogContent, DialogContentText, DialogActions,
    List, ListItem, ListItemText, Select, MenuItem, FormControl, InputLabel,
    TextField
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import BranchSelect from './BranchSelect';
import API from '../api'; // tu archivo de instancia de axios

const GenerateBalances = () => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const [processedLoans, setProcessedLoans] = useState(0);
    const [logs, setLogs] = useState([]);
    const [openConfirm, setOpenConfirm] = useState(false);
    const [balanceType, setBalanceType] = useState('INITIAL');
    const [branchId, setBranchId] = useState('');
    const [branchName, setBranchName] = useState(''); // para mostrar nombre de sucursal
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [openRegenerateDialog, setOpenRegenerateDialog] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [openDatePicker, setOpenDatePicker] = useState(false);


    const handleConfirm = async () => {
        if (!branchId) {
            setError('⚠️ Debe seleccionar una sucursal antes de generar balances.');
            return;
        }

        // Verificar si ya existen saldos
        try {
            const { data } = await API.get(
                `${process.env.REACT_APP_API_BASE_URL}/api/balances/balance-exist`,
                {
                    params: {
                        branch_id: branchId,
                        balance_type: balanceType,
                        balance_date: selectedDate.format('YYYY-MM-DD'),
                    }
                }
            );

            if (data.exists) {
                setOpenRegenerateDialog(true); // abrir nuevo diálogo
            } else {
                setOpenConfirm(true); // continuar con confirmación normal
            }

        } catch (err) {
            setError('❌ Error al verificar saldos existentes.');
            return;
        }


    };


    const handleCloseConfirm = () => {
        setOpenConfirm(false);
    };

    const getCurrentTime = () => {
        const now = new Date();
        return now.toLocaleTimeString('es-ES', { hour12: false });
    };

    const addLog = (message) => {
        const timestamp = getCurrentTime();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    const clearLogs = () => {

        setProgress(0);
        setSuccess(null);
        setError(null);
        setLogs([]);
        setProcessedLoans(0);
        setOpenConfirm(false);
    }

    const handleGenerate = async () => {
        clearLogs(); // Limpiar logs y estados antes de iniciar el proceso
        if (selectedDate.isAfter(dayjs(), 'day')) {
            setError('⚠️ La fecha seleccionada no puede ser futura.');
            return;
        }

        setLoading(true);
        addLog('✅ Conectado al servidor');
        addLog(`🏢 Sucursal: ${branchName}`);
        addLog(`🔄 Iniciando generación de saldo tipo: ${balanceType === 'INITIAL' ? 'Inicial' : 'Final'}`);

        const progressInterval = setInterval(() => {
            setProgress(prev => (prev >= 90 ? prev : prev + 5));
            setProcessedLoans(prev => {
                const newCount = prev + 1;
                addLog(`🔄 Procesando préstamo #${newCount}...`);
                return newCount;
            });
        }, 700);

        try {
            const response = await API.post(
                `${process.env.REACT_APP_API_BASE_URL}/api/loans/balances`,
                {
                    branch_id: branchId,
                    balance_type: balanceType,
                    balance_date: selectedDate.format('YYYY-MM-DD')
                }
            );

            clearInterval(progressInterval);
            setProgress(100);

            if (response.data.generated_dates) {
                response.data.generated_dates.forEach(date => {
                    addLog(`📅 Saldo generado para ${dayjs(date).format('DD/MM/YYYY')}`);
                });
            }

            if (response.data.warning) {
                addLog(`⚠️ ${response.data.warning}`);
                setError(response.data.warning); // <-- aquí lo ponemos como error tipo "warning" visualmente
            } else {
                addLog('✅ Balances generados exitosamente');
                addLog(`📊 Total préstamos procesados: ${processedLoans}`);
                setSuccess('✅ Balances generados exitosamente.');
            }
        } catch (err) {
            clearInterval(progressInterval);

            if (err.code === 'ECONNABORTED') {
                addLog('⚡ Tiempo de espera excedido. El servidor no respondió.');
                setError('⚡ Tiempo de espera excedido. El servidor no respondió.');
            } else if (err.response) {
                addLog(`❌ ${err.response.data.error || `Error del servidor (código ${err.response.status})`}`);
                setError(`❌ ${err.response.data.error || `Error del servidor (código ${err.response.status})`}`);
            } else {
                addLog('❌ Error de conexión. No se pudo contactar al servidor.');
                setError('❌ Error de conexión. No se pudo contactar al servidor.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBranchChange = (e) => {
        const selected = e?.target?.value || e;
        setBranchId(selected.id || selected);
        setBranchName(selected.name || 'Sucursal seleccionada');
        clearLogs(); // Limpiar logs al cambiar sucursal
    };

    return (
        <Box sx={{ width: '100%', maxWidth: 600, margin: 'auto', textAlign: 'center', mt: 5 }}>
            <Typography variant="h5" gutterBottom>
                Generar Balances
            </Typography>

<LocalizationProvider dateAdapter={AdapterDayjs}>
 <DatePicker
  label="Fecha de saldo"
  value={selectedDate}
  onChange={(newValue) => setSelectedDate(newValue)}
  format="DD/MM/YYYY"
  disabled={loading}
  maxDate={dayjs()}
  minDate={dayjs('2000-01-01')}
  open={openDatePicker}
  onOpen={() => setOpenDatePicker(true)}
  onClose={() => setOpenDatePicker(false)}
  renderInput={(params) => (
    <TextField
      {...params}
      fullWidth
      onClick={() => setOpenDatePicker(true)}
      inputProps={{
        ...params.inputProps,
        readOnly: true
      }}
    />
  )}
/>
</LocalizationProvider>



            {/* Selector tipo de saldo */}
            <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="balance-type-label">Tipo de Saldo</InputLabel>
                <Select
                    labelId="balance-type-label"
                    value={balanceType}
                    label="Tipo de Saldo"
                    onChange={(e) => setBalanceType(e.target.value)}
                    disabled={loading}
                >
                    <MenuItem value="INITIAL">Saldo Inicial</MenuItem>
                    <MenuItem value="FINAL">Saldo Final</MenuItem>
                </Select>
            </FormControl>

            {/* Selector de sucursal */}
            <FormControl fullWidth sx={{ mt: 2 }}>
                <BranchSelect
                    size="lg"
                    value={branchId}
                    onChange={handleBranchChange}
                    label="Seleccione Sucursal"
                    name="branch_id"
                />
            </FormControl>

            {/* Botón para confirmar */}
            <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3 }}
                onClick={handleConfirm}
                disabled={loading}
            >
                {loading ? 'Procesando...' : 'Generar saldo'}
            </Button>

            {/* Barra de progreso */}
            {loading && (
                <Box sx={{ mt: 3 }}>
                    <LinearProgress variant="determinate" value={progress} />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        🔄 Procesados: {processedLoans} préstamos...
                    </Typography>
                </Box>
            )}

            {/* Bitácora */}
            {logs.length > 0 && (
                <Box sx={{ mt: 3, textAlign: 'left' }}>
                    <Typography variant="h6">Bitácora:</Typography>
                    <List dense>
                        {logs.map((log, index) => (
                            <ListItem key={index}>
                                <ListItemText primary={log} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}

            {/* Mensajes */}
            {success && (
                <Alert severity="success" sx={{ mt: 3 }}>
                    {success}
                </Alert>
            )}
            {error && (
                <Alert severity="error" sx={{ mt: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Confirmación */}
            <Dialog open={openConfirm} onClose={handleCloseConfirm}>
                <DialogTitle>Confirmar acción</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {balanceType === 'FINAL'
                            ? '⚠️ Está generando un saldo FINAL. ¿Está completamente seguro? Este proceso impacta reportes de cierre.'
                            : '¿Está seguro que desea generar el saldo INICIAL?'}
                    </DialogContentText>

                    {/* Contador en vivo */}
                    {loading && (
                        <Typography variant="body2" sx={{ mt: 2 }}>
                            🔄 Procesados: {processedLoans} préstamos...
                        </Typography>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleCloseConfirm} color="secondary" disabled={loading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleGenerate} color="primary" disabled={loading}>
                        {loading ? 'Procesando...' : 'Confirmar'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openRegenerateDialog} onClose={() => setOpenRegenerateDialog(false)}>
                <DialogTitle>Regenerar saldos existentes</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ⚠️ Ya existen saldos generados para esta fecha
                        ({selectedDate.format('DD/MM/YYYY')})
                        y tipo ({balanceType === 'INITIAL' ? 'Inicial' : 'Final'}).<br />
                        ¿Desea reemplazarlos y regenerar los saldos?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenRegenerateDialog(false)} color="secondary">
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => {
                            setIsRegenerating(true); // ✅ activar modo regeneración
                            setOpenRegenerateDialog(false);
                            setOpenConfirm(true); // mostrar diálogo de confirmación normal
                        }}
                        color="primary"
                    >
                        Sí, continuar
                    </Button>

                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default GenerateBalances;
