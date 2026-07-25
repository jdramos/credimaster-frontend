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
  MenuItem,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PrintIcon from "@mui/icons-material/Print";
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

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function CashRegisterStatement() {
  const { tenant } = useAuth();
  const [cashRegisters, setCashRegisters] = useState([]);
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "error", message: "" });

  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  useEffect(() => {
    API.get("/api/caja/registers").then((res) => setCashRegisters(res.data?.data || [])).catch(() => {});
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
      setStatement(null);
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

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <AccountBalanceWalletIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Estado de Cuenta de Caja</Typography>
            <Typography variant="body2" color="text.secondary">
              Saldo actual y movimientos de una caja en un rango de fechas
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
          <TextField
            select size="small" label="Caja" value={cashRegisterId}
            onChange={(e) => handleSelectRegister(e.target.value)}
            sx={{ width: 260 }}
          >
            {cashRegisters.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}{c.status === "CERRADA" ? " (cerrada)" : ""}</MenuItem>
            ))}
          </TextField>

          <TextField
            size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setStatement(null); }}
            sx={{ width: 170 }}
          />

          <TextField
            size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setStatement(null); }}
            sx={{ width: 170 }}
          />

          <Button variant="outlined" onClick={fetchStatement} disabled={loading} sx={{ textTransform: "none" }}>
            {loading ? "Cargando..." : "Consultar"}
          </Button>

          <Button
            variant="contained" startIcon={<PrintIcon />} disabled={!statement}
            onClick={handlePrint} sx={{ textTransform: "none" }}
          >
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
                </TableRow>
              ))}
              {statement.movements.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center">Sin movimientos en el rango seleccionado</TableCell></TableRow>
              )}
              <TableRow sx={{ "& td": { fontWeight: 700, borderTop: "2px solid #333" } }}>
                <TableCell colSpan={4} align="right">Totales del período</TableCell>
                <TableCell align="right">{money(statement.total_debit)}</TableCell>
                <TableCell align="right">{money(statement.total_credit)}</TableCell>
                <TableCell align="right">{money(statement.closing_balance)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      )}

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
