import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Autocomplete,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Divider,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import BlockIcon from "@mui/icons-material/Block";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { printLiquidationReport } from "../../reports/printLiquidationReport";

const API_URL = "/api/hr/liquidations";

const MOTIVO_LABELS = {
  RENUNCIA: "Renuncia voluntaria",
  DESPIDO_JUSTIFICADO: "Despido con causa justificada",
  DESPIDO_INJUSTIFICADO: "Despido sin causa justificada",
  MUTUO_ACUERDO: "Mutuo acuerdo",
};

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const emptyForm = { employee: null, termination_date: "", motivo: "RENUNCIA", pending_days: "0" };

export default function LiquidationsList() {
  const { tenant } = useAuth();
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchLiquidations = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setRows(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar liquidaciones", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidations();
    API.get("/api/hr/employees?status=ACTIVO").then((res) => setEmployees(res.data?.data || [])).catch(() => {});
  }, []);

  const handleOpenCreate = () => {
    setForm(emptyForm);
    setPreview(null);
    setDialogOpen(true);
  };

  const buildPayload = () => ({
    employee_id: form.employee?.id,
    termination_date: form.termination_date,
    motivo: form.motivo,
    pending_days: Number(form.pending_days || 0),
  });

  const handlePreview = async () => {
    if (!form.employee || !form.termination_date) {
      showAlert("Complete el empleado y la fecha de terminación", "error");
      return;
    }
    try {
      setPreviewing(true);
      const res = await API.post(`${API_URL}/preview`, buildPayload());
      setPreview(res.data?.data || null);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al calcular la liquidación", "error");
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      await API.post(API_URL, buildPayload());
      showAlert("Liquidación generada correctamente");
      setDialogOpen(false);
      fetchLiquidations();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al generar la liquidación", "error");
    } finally {
      setConfirming(false);
    }
  };

  const handleVoid = async (row) => {
    const reason = window.prompt(`Indique el motivo de anulación de la liquidación de "${row.employee_name}":`);
    if (reason === null) return;
    try {
      await API.put(`${API_URL}/${row.id}/void`, { void_reason: reason });
      showAlert("Liquidación anulada correctamente");
      fetchLiquidations();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al anular la liquidación", "error");
    }
  };

  const handlePrint = async (id) => {
    try {
      const res = await API.get(`${API_URL}/${id}`);
      printLiquidationReport({ company: tenant, user: currentUser, liquidation: res.data?.data });
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al generar el documento", "error");
    }
  };

  const columns = useMemo(() => [
    { field: "employee_name", headerName: "Empleado", flex: 1, minWidth: 180 },
    { field: "termination_date", headerName: "Terminación", width: 120, renderCell: (p) => String(p.value).slice(0, 10) },
    { field: "motivo", headerName: "Motivo", width: 200, renderCell: (p) => MOTIVO_LABELS[p.value] || p.value },
    { field: "total_bruto", headerName: "Bruto", width: 120, renderCell: (p) => `C$ ${money(p.value)}` },
    { field: "total_neto", headerName: "Neto", width: 120, renderCell: (p) => `C$ ${money(p.value)}` },
    {
      field: "status",
      headerName: "Estado",
      width: 110,
      renderCell: (p) => <Chip size="small" color={p.value === "APROBADA" ? "success" : "default"} label={p.value === "APROBADA" ? "Aprobada" : "Anulada"} />,
    },
    {
      field: "actions",
      headerName: "Acciones",
      width: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Imprimir">
            <IconButton size="small" onClick={() => handlePrint(params.row.id)}>
              <PrintIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {params.row.status === "APROBADA" && (
            <Tooltip title="Anular">
              <IconButton size="small" color="error" onClick={() => handleVoid(params.row)}>
                <BlockIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ], []);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonRemoveIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Liquidaciones</Typography>
              <Typography variant="body2" color="text.secondary">
                Finiquitos por terminación laboral (Art. 45 Código del Trabajo)
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={handleOpenCreate}>
              Nueva liquidación
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={fetchLiquidations}>
              Actualizar
            </Button>
          </Box>
        </Box>

        <Box sx={{ height: 560, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            disableRowSelectionOnClick
            sx={{
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F8FAFC", fontWeight: 700 },
            }}
          />
        </Box>
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva liquidación</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={employees}
                value={form.employee}
                getOptionLabel={(o) => o.full_name || ""}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => { setForm((f) => ({ ...f, employee: value })); setPreview(null); }}
                renderInput={(params) => <TextField {...params} label="Empleado" />}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" type="date" label="Fecha de terminación" InputLabelProps={{ shrink: true }}
                value={form.termination_date}
                onChange={(e) => { setForm((f) => ({ ...f, termination_date: e.target.value })); setPreview(null); }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select fullWidth size="small" label="Motivo"
                value={form.motivo}
                onChange={(e) => { setForm((f) => ({ ...f, motivo: e.target.value })); setPreview(null); }}
              >
                {Object.entries(MOTIVO_LABELS).map(([code, label]) => (
                  <MenuItem key={code} value={code}>{label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth size="small" type="number" label="Días de salario pendiente"
                value={form.pending_days}
                onChange={(e) => { setForm((f) => ({ ...f, pending_days: e.target.value })); setPreview(null); }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Button variant="outlined" sx={{ textTransform: "none" }} disabled={previewing} onClick={handlePreview}>
                {previewing ? "Calculando..." : "Calcular vista previa"}
              </Button>
            </Grid>

            {preview && (
              <Grid item xs={12}>
                <Table size="small">
                  <TableBody>
                    <TableRow><TableCell>Años de servicio</TableCell><TableCell align="right">{preview.years_of_service}</TableCell></TableRow>
                    <TableRow><TableCell>Salario pendiente ({preview.pending_days} días)</TableCell><TableCell align="right">C$ {money(preview.salario_pendiente)}</TableCell></TableRow>
                    <TableRow><TableCell>Vacaciones no gozadas ({preview.vacaciones_dias} días)</TableCell><TableCell align="right">C$ {money(preview.vacaciones_monto)}</TableCell></TableRow>
                    <TableRow><TableCell>Aguinaldo proporcional</TableCell><TableCell align="right">C$ {money(preview.aguinaldo_monto)}</TableCell></TableRow>
                    <TableRow><TableCell>Indemnización (Art. 45)</TableCell><TableCell align="right">C$ {money(preview.indemnizacion_monto)}</TableCell></TableRow>
                    <TableRow><TableCell><strong>Total bruto</strong></TableCell><TableCell align="right"><strong>C$ {money(preview.total_bruto)}</strong></TableCell></TableRow>
                    <TableRow><TableCell>IR</TableCell><TableCell align="right">- C$ {money(preview.ir)}</TableCell></TableRow>
                    <TableRow><TableCell>INSS laboral</TableCell><TableCell align="right">- C$ {money(preview.inss_laboral)}</TableCell></TableRow>
                    <TableRow><TableCell>Préstamo pendiente</TableCell><TableCell align="right">- C$ {money(preview.prestamo_deduccion)}</TableCell></TableRow>
                    <TableRow><TableCell><strong>Neto a pagar</strong></TableCell><TableCell align="right"><strong>C$ {money(preview.total_neto)}</strong></TableCell></TableRow>
                  </TableBody>
                </Table>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!preview || confirming}
            sx={{ textTransform: "none" }}
            onClick={handleConfirm}
          >
            {confirming ? "Generando..." : "Confirmar y generar liquidación"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
