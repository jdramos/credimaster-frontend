import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Checkbox, Chip, MenuItem, Paper, Snackbar, Stack, TextField, Typography, Divider,
  Table, TableHead, TableRow, TableCell, TableBody,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import API from "../../api";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function BankReconciliation() {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [statementBalance, setStatementBalance] = useState("");

  const [worksheet, setWorksheet] = useState(null);
  const [clearedChecks, setClearedChecks] = useState(new Set());
  const [clearedDeposits, setClearedDeposits] = useState(new Set());
  const [clearedOutflows, setClearedOutflows] = useState(new Set());

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  useEffect(() => {
    API.get("/api/banks/accounts", { params: { status: "ACTIVA" } }).then((res) => setBankAccounts(res.data?.data || [])).catch(() => {});
  }, []);

  const fetchHistory = async (accountId) => {
    try {
      const res = await API.get("/api/banks/reconciliation", { params: { bank_account_id: accountId } });
      setHistory(res.data?.data || []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    if (bankAccountId) fetchHistory(bankAccountId);
    else setHistory([]);
  }, [bankAccountId]);

  const fetchWorksheet = async () => {
    if (!bankAccountId || !statementDate) {
      showAlert("Elija la cuenta bancaria y la fecha de corte");
      return;
    }
    try {
      setLoading(true);
      setWorksheet(null);
      const res = await API.get("/api/banks/reconciliation/worksheet", { params: { bank_account_id: bankAccountId, statement_date: statementDate } });
      setWorksheet(res.data);
      setClearedChecks(new Set());
      setClearedDeposits(new Set());
      setClearedOutflows(new Set());
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo cargar la conciliación");
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (id) => setClearedChecks((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleDeposit = (id) => setClearedDeposits((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleOutflow = (id) => setClearedOutflows((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const summary = useMemo(() => {
    if (!worksheet) return null;

    const outstandingChecksTotal = worksheet.outstanding_checks
      .filter((c) => !clearedChecks.has(c.id))
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const transitDepositsTotal = worksheet.transit_deposits
      .filter((d) => !clearedDeposits.has(d.id))
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const transitOutflowsTotal = (worksheet.transit_outflows || [])
      .filter((d) => !clearedOutflows.has(d.id))
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const adjustedBankBalance = Number(statementBalance || 0) - outstandingChecksTotal - transitOutflowsTotal + transitDepositsTotal;
    const difference = Number((adjustedBankBalance - worksheet.book_balance).toFixed(2));

    return { outstandingChecksTotal, transitDepositsTotal, transitOutflowsTotal, adjustedBankBalance, difference };
  }, [worksheet, clearedChecks, clearedDeposits, clearedOutflows, statementBalance]);

  const doSave = async () => {
    const confirmed = window.confirm(
      `¿Confirma guardar la conciliación de la cuenta al ${statementDate}?\n\n` +
      `Saldo según banco: C$ ${money(statementBalance)}\n` +
      `Saldo según libros: C$ ${money(worksheet.book_balance)}\n` +
      `Diferencia: C$ ${money(summary.difference)}\n\n` +
      `Se marcarán ${clearedChecks.size} cheque(s), ${clearedDeposits.size} depósito(s) y ${clearedOutflows.size} otro(s) egreso(s) como conciliados.`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      const res = await API.post("/api/banks/reconciliation", {
        bank_account_id: bankAccountId,
        statement_date: statementDate,
        statement_balance: Number(statementBalance || 0),
        cleared_check_ids: Array.from(clearedChecks),
        cleared_deposit_ids: [...Array.from(clearedDeposits), ...Array.from(clearedOutflows)],
      });
      showAlert(`Conciliación guardada (${res.data.data.items_marked} partida(s) marcadas)`, "success");
      setWorksheet(null);
      setStatementBalance("");
      setClearedOutflows(new Set());
      fetchHistory(bankAccountId);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo guardar la conciliación");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <AccountBalanceWalletIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Conciliación Bancaria</Typography>
            <Typography variant="body2" color="text.secondary">
              Compara el saldo según el banco contra el saldo según libros a una fecha de corte
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField
            select size="small" label="Cuenta bancaria" value={bankAccountId}
            onChange={(e) => { setBankAccountId(e.target.value); setWorksheet(null); }}
            sx={{ width: 240 }}
          >
            {bankAccounts.map((b) => <MenuItem key={b.id} value={b.id}>{b.account_alias}</MenuItem>)}
          </TextField>

          <TextField
            size="small" type="date" label="Fecha de corte" InputLabelProps={{ shrink: true }}
            value={statementDate}
            onChange={(e) => { setStatementDate(e.target.value); setWorksheet(null); }}
            sx={{ width: 180 }}
          />

          <TextField
            size="small" type="number" label="Saldo según banco"
            value={statementBalance}
            onChange={(e) => setStatementBalance(e.target.value)}
            sx={{ width: 180 }}
          />

          <Button variant="outlined" onClick={fetchWorksheet} disabled={loading}>Cargar</Button>
        </Stack>

        {worksheet && (
          <>
            <Divider sx={{ my: 2 }} />

            {worksheet.last_reconciliation_date && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Última conciliación de esta cuenta: {String(worksheet.last_reconciliation_date).slice(0, 10)}
              </Alert>
            )}

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip label={`Saldo según libros: C$ ${money(worksheet.book_balance)}`} />
              <Chip label={`Cheques pendientes: C$ ${money(summary.outstandingChecksTotal)}`} color="warning" />
              <Chip label={`Otros egresos pendientes: C$ ${money(summary.transitOutflowsTotal)}`} color="warning" />
              <Chip label={`Depósitos en tránsito: C$ ${money(summary.transitDepositsTotal)}`} color="warning" />
              <Chip label={`Saldo banco ajustado: C$ ${money(summary.adjustedBankBalance)}`} color="info" />
              <Chip
                color={summary.difference === 0 ? "success" : "error"}
                label={`Diferencia: C$ ${money(summary.difference)}`}
              />
            </Stack>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Cheques emitidos pendientes ({worksheet.outstanding_checks.length})
            </Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">Cobrado</TableCell>
                  <TableCell>N°</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Beneficiario</TableCell>
                  <TableCell align="right">Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {worksheet.outstanding_checks.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={clearedChecks.has(c.id)} onChange={() => toggleCheck(c.id)} />
                    </TableCell>
                    <TableCell>{c.check_number}</TableCell>
                    <TableCell>{String(c.issue_date).slice(0, 10)}</TableCell>
                    <TableCell>{c.beneficiary_name}</TableCell>
                    <TableCell align="right">{money(c.amount)}</TableCell>
                  </TableRow>
                ))}
                {worksheet.outstanding_checks.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center">Sin cheques pendientes</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Otros egresos pendientes ({(worksheet.transit_outflows || []).length})
            </Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">Confirmado</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(worksheet.transit_outflows || []).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={clearedOutflows.has(d.id)} onChange={() => toggleOutflow(d.id)} />
                    </TableCell>
                    <TableCell>{String(d.deposit_date).slice(0, 10)}</TableCell>
                    <TableCell>{d.description}</TableCell>
                    <TableCell align="right">{money(d.amount)}</TableCell>
                  </TableRow>
                ))}
                {(worksheet.transit_outflows || []).length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center">Sin otros egresos pendientes</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Depósitos en tránsito ({worksheet.transit_deposits.length})
            </Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">Acreditado</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {worksheet.transit_deposits.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={clearedDeposits.has(d.id)} onChange={() => toggleDeposit(d.id)} />
                    </TableCell>
                    <TableCell>{String(d.deposit_date).slice(0, 10)}</TableCell>
                    <TableCell>{d.description}</TableCell>
                    <TableCell align="right">{money(d.amount)}</TableCell>
                  </TableRow>
                ))}
                {worksheet.transit_deposits.length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center">Sin depósitos en tránsito</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            <Button variant="contained" color="primary" disabled={saving} onClick={doSave} sx={{ textTransform: "none" }}>
              {saving ? "Guardando..." : "Guardar conciliación"}
            </Button>
          </>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Historial de conciliaciones</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha de corte</TableCell>
              <TableCell align="right">Saldo banco</TableCell>
              <TableCell align="right">Saldo libros</TableCell>
              <TableCell align="right">Diferencia</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{String(r.statement_date).slice(0, 10)}</TableCell>
                <TableCell align="right">C$ {money(r.statement_balance)}</TableCell>
                <TableCell align="right">C$ {money(r.book_balance)}</TableCell>
                <TableCell align="right">C$ {money(r.difference)}</TableCell>
              </TableRow>
            ))}
            {history.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center">{bankAccountId ? "Sin conciliaciones registradas" : "Elija una cuenta bancaria"}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
