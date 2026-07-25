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
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { printCashRegisterStatementReport } from "../../reports/cashRegisterStatementReport";

const SOURCE_LABELS = {
  CAJA: "Caja",
  BANKS: "Bancos",
  LOANS: "Créditos",
  FIXED_ASSETS: "Activo Fijo",
  PAYMENTS: "Pagos",
  BUSINESS_DAY: "Cierre del día",
};

const emptyLine = () => ({ account: null, debit: "", credit: "", description: "" });

const emptyForm = {
  movement_type: "INGRESO",
  movement_date: new Date().toISOString().slice(0, 10),
  description: "",
  lines: [emptyLine()],
};

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function CashMovementsList() {
  const { tenant } = useAuth();
  const [cashRegisters, setCashRegisters] = useState([]);
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [accounts, setAccounts] = useState([]);

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "error", message: "" });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  useEffect(() => {
    API.get("/api/caja/registers", { params: { status: "ACTIVA" } }).then((res) => setCashRegisters(res.data?.data || [])).catch(() => {});
    API.get(`/api/accounting/accounts?is_active=1`).then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAccounts(list.filter((a) => Number(a.is_movement) === 1));
    }).catch(() => {});
  }, []);

  const selectedCashRegister = useMemo(
    () => cashRegisters.find((c) => c.id === cashRegisterId) || null,
    [cashRegisters, cashRegisterId],
  );

  const handleSelectRegister = (id) => {
    setCashRegisterId(id);
    setStatement(null);
    const reg = cashRegisters.find((c) => c.id === id);
    if (reg) setStartDate(String(reg.opening_date).slice(0, 10));
  };

  const fetchStatement = async () => {
    if (!cashRegisterId || !startDate || !endDate) {
      showAlert("Elija la caja y el rango de fechas");
      return;
    }
    if (startDate > endDate) {
      showAlert("La fecha inicial no puede ser mayor a la fecha final");
      return;
    }

    try {
      setLoading(true);
      const res = await API.get(`/api/caja/registers/${cashRegisterId}/statement`, {
        params: { start_date: startDate, end_date: endDate },
      });
      setStatement(res.data?.data || null);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo cargar el estado de cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!statement) return;
    printCashRegisterStatementReport({
      company: tenant,
      user: JSON.parse(localStorage.getItem("user") || "{}"),
      cashRegister: statement.cash_register,
      startDate: statement.start_date,
      endDate: statement.end_date,
      openingBalance: statement.opening_balance,
      movements: statement.movements,
      totalDebit: statement.total_debit,
      totalCredit: statement.total_credit,
      closingBalance: statement.closing_balance,
    });
  };

  const currencySymbol = statement?.cash_register?.currency_symbol || selectedCashRegister?.currency_symbol || "C$";

  // ==========================================
  // NUEVO MOVIMIENTO (ingreso/egreso manual)
  // ==========================================
  const handleOpenDialog = () => {
    if (!cashRegisterId) {
      showAlert("Elija primero la caja");
      return;
    }
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const isIngreso = form.movement_type === "INGRESO";

  const updateLine = (index, field, value) => {
    setForm((f) => {
      const lines = [...f.lines];
      lines[index] = { ...lines[index], [field]: value };
      return { ...f, lines };
    });
  };
  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));
  const removeLine = (index) => setForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }));

  const netAmount = useMemo(
    () => form.lines.reduce((sum, l) => sum + (isIngreso ? (Number(l.credit) || 0) - (Number(l.debit) || 0) : (Number(l.debit) || 0) - (Number(l.credit) || 0)), 0),
    [form.lines, isIngreso],
  );

  const handleSaveMovement = async () => {
    if (!form.movement_date || !form.description) {
      showAlert("Complete fecha y descripción");
      return;
    }
    if (form.lines.some((l) => !l.account || (!Number(l.debit) && !Number(l.credit)))) {
      showAlert("Cada línea debe tener cuenta y un monto en débito o crédito");
      return;
    }
    if (netAmount <= 0) {
      showAlert(`El neto de las líneas (lo que ${isIngreso ? "entra a" : "sale de"} la caja) debe ser mayor a 0`);
      return;
    }

    try {
      setSaving(true);
      const res = await API.post("/api/caja/movements", {
        cash_register_id: cashRegisterId,
        movement_type: form.movement_type,
        movement_date: form.movement_date,
        description: form.description,
        lines: form.lines.map((l) => ({
          account_id: l.account.id,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || undefined,
        })),
      });
      showAlert(`${isIngreso ? "Ingreso" : "Egreso"} registrado por ${currencySymbol} ${money(res.data.data.amount)} (comprobante ${res.data.data.entry_no})`, "success");
      setDialogOpen(false);
      fetchStatement();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al registrar el movimiento");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ANULAR (solo movimientos manuales de caja — source_type CASH_MOVEMENT)
  // ==========================================
  const confirmVoid = async () => {
    if (!voidTarget) return;
    const confirmed = window.confirm(`¿Confirma anular este movimiento de ${currencySymbol} ${money(Math.abs(voidTarget.debit - voidTarget.credit))}?\n\nEsta acción anula el comprobante contable asociado.`);
    if (!confirmed) return;

    try {
      setVoiding(true);
      await API.put(`/api/caja/movements/${voidTarget.source_id}/void`, { void_reason: voidReason || null });
      showAlert("Movimiento anulado", "success");
      setVoidTarget(null);
      setVoidReason("");
      fetchStatement();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al anular el movimiento");
    } finally {
      setVoiding(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <PaymentsIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Movimientos de Caja</Typography>
            <Typography variant="body2" color="text.secondary">
              Saldo, movimientos y registro de ingresos/egresos de una caja
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
          <TextField
            select size="small" label="Caja" value={cashRegisterId}
            onChange={(e) => handleSelectRegister(e.target.value)}
            sx={{ width: 240 }}
          >
            {cashRegisters.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>

          <TextField
            size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setStatement(null); }}
            sx={{ width: 160 }}
          />

          <TextField
            size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setStatement(null); }}
            sx={{ width: 160 }}
          />

          <Button variant="outlined" onClick={fetchStatement} disabled={loading} sx={{ textTransform: "none" }}>
            {loading ? "Cargando..." : "Consultar"}
          </Button>

          <Box sx={{ flex: 1 }} />

          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog} sx={{ textTransform: "none" }}>
            Nuevo movimiento
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchStatement} sx={{ textTransform: "none" }}>
            Actualizar
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} disabled={!statement} onClick={handlePrint} sx={{ textTransform: "none" }}>
            Imprimir
          </Button>
        </Stack>

        {statement && (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
            <Chip label={`Saldo inicial (${statement.start_date}): ${currencySymbol} ${money(statement.opening_balance)}`} />
            <Chip label={`Total débitos: ${currencySymbol} ${money(statement.total_debit)}`} color="success" variant="outlined" />
            <Chip label={`Total créditos: ${currencySymbol} ${money(statement.total_credit)}`} color="error" variant="outlined" />
            <Chip
              label={`Saldo actual (${statement.end_date}): ${currencySymbol} ${money(statement.closing_balance)}`}
              color={Number(statement.closing_balance) >= 0 ? "primary" : "error"}
            />
          </Stack>
        )}
      </Paper>

      {statement && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Movimientos — {statement.cash_register.name}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Comprobante</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Débito</TableCell>
                <TableCell align="right">Crédito</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ "& td": { fontWeight: 700, bgcolor: "#F8FAFC" } }}>
                <TableCell>{statement.start_date}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell>SALDO INICIAL</TableCell>
                <TableCell align="right" />
                <TableCell align="right" />
                <TableCell align="right">{money(statement.opening_balance)}</TableCell>
                <TableCell />
              </TableRow>
              {statement.movements.map((m, idx) => (
                <TableRow key={idx}>
                  <TableCell>{String(m.entry_date).slice(0, 10)}</TableCell>
                  <TableCell>{m.entry_no}</TableCell>
                  <TableCell>{SOURCE_LABELS[m.source_module] || m.source_module}</TableCell>
                  <TableCell>{m.description}</TableCell>
                  <TableCell align="right">{Number(m.debit) > 0 ? money(m.debit) : ""}</TableCell>
                  <TableCell align="right">{Number(m.credit) > 0 ? money(m.credit) : ""}</TableCell>
                  <TableCell align="right">{money(m.balance)}</TableCell>
                  <TableCell align="center">
                    {m.source_type === "CASH_MOVEMENT" && (
                      <Tooltip title="Anular movimiento">
                        <IconButton size="small" color="error" onClick={() => { setVoidTarget(m); setVoidReason(""); }}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {statement.movements.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">Sin movimientos en el rango seleccionado</TableCell></TableRow>
              )}
              <TableRow sx={{ "& td": { fontWeight: 700, borderTop: "2px solid #333" } }}>
                <TableCell colSpan={4} align="right">Totales del período</TableCell>
                <TableCell align="right">{money(statement.total_debit)}</TableCell>
                <TableCell align="right">{money(statement.total_credit)}</TableCell>
                <TableCell align="right">{money(statement.closing_balance)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* ========== NUEVO MOVIMIENTO ========== */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo movimiento — {selectedCashRegister?.name}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <ToggleButtonGroup
                exclusive size="small" value={form.movement_type}
                onChange={(_, value) => value && setForm((f) => ({ ...f, movement_type: value }))}
              >
                <ToggleButton value="INGRESO" color="success" sx={{ textTransform: "none", px: 3 }}>Ingreso</ToggleButton>
                <ToggleButton value="EGRESO" color="error" sx={{ textTransform: "none", px: 3 }}>Egreso</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
                value={form.movement_date}
                onChange={(e) => setForm((f) => ({ ...f, movement_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Descripción"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={isIngreso ? "Ej: Aporte de capital" : "Ej: Compra de papelería"}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Líneas ({isIngreso ? "origen del ingreso" : "gasto/destino del egreso"} — la caja se {isIngreso ? "debita" : "acredita"} automático por el neto)
              </Typography>

              {form.lines.map((line, index) => (
                <Box key={index} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 110px 110px 40px" }, gap: 1, mb: 1, alignItems: "center" }}>
                  <Autocomplete
                    size="small"
                    options={accounts}
                    value={line.account}
                    getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    onChange={(_, value) => updateLine(index, "account", value)}
                    renderInput={(params) => <TextField {...params} label="Cuenta" />}
                  />
                  <TextField
                    size="small" label="Detalle"
                    value={line.description}
                    onChange={(e) => updateLine(index, "description", e.target.value)}
                  />
                  <TextField
                    size="small" type="number" label="Débito"
                    value={line.debit}
                    onChange={(e) => updateLine(index, "debit", e.target.value)}
                  />
                  <TextField
                    size="small" type="number" label="Crédito"
                    value={line.credit}
                    onChange={(e) => updateLine(index, "credit", e.target.value)}
                  />
                  <IconButton size="small" onClick={() => removeLine(index)} disabled={form.lines.length === 1}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

              <Button size="small" onClick={addLine} sx={{ textTransform: "none", mt: 0.5 }}>+ Agregar línea</Button>

              <Box sx={{ mt: 2 }}>
                <Chip
                  color={netAmount > 0 ? (isIngreso ? "success" : "error") : "default"}
                  label={`Monto del ${isIngreso ? "ingreso" : "egreso"} (neto): ${currencySymbol} ${money(netAmount)}`}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveMovement} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : `Registrar ${isIngreso ? "ingreso" : "egreso"}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========== ANULAR ========== */}
      <Dialog open={Boolean(voidTarget)} onClose={() => setVoidTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Anular movimiento</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth size="small" label="Motivo de anulación (opcional)" multiline minRows={2} sx={{ mt: 1 }}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidTarget(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmVoid} disabled={voiding} sx={{ textTransform: "none" }}>
            {voiding ? "Anulando..." : "Anular"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
