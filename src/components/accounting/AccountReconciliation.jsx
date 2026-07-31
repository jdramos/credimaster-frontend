import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Checkbox, Chip, Paper, Snackbar, Stack, TextField, Typography, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, Autocomplete,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function AccountReconciliation() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canSaveReconciliation = role === 1 || permissions.includes("contabilidad.conciliacion.gestionar");

  const [accounts, setAccounts] = useState([]);
  const [account, setAccount] = useState(null);
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [externalBalance, setExternalBalance] = useState("");
  const [notes, setNotes] = useState("");

  const [worksheet, setWorksheet] = useState(null);
  const [clearedLines, setClearedLines] = useState(new Set());

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  useEffect(() => {
    API.get("/api/accounting/accounts?is_active=1").then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAccounts(list.filter((a) => Number(a.is_movement) === 1));
    }).catch(() => setAccounts([]));
  }, []);

  const fetchHistory = async (accountId) => {
    try {
      const res = await API.get("/api/accounting/reconciliation", { params: { account_id: accountId } });
      setHistory(res.data?.data || []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    if (account) fetchHistory(account.id);
    else setHistory([]);
  }, [account]);

  const fetchWorksheet = async () => {
    if (!account || !statementDate) {
      showAlert("Elija la cuenta y la fecha de corte");
      return;
    }
    try {
      setLoading(true);
      setWorksheet(null);
      const res = await API.get("/api/accounting/reconciliation/worksheet", {
        params: { account_id: account.id, statement_date: statementDate },
      });
      setWorksheet(res.data);
      setClearedLines(new Set());
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo cargar la conciliación");
    } finally {
      setLoading(false);
    }
  };

  const toggleLine = (id) => setClearedLines((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const difference = useMemo(() => {
    if (!worksheet || externalBalance === "") return null;
    return Number((Number(externalBalance) - worksheet.book_balance).toFixed(2));
  }, [worksheet, externalBalance]);

  const doSave = async () => {
    const confirmed = window.confirm(
      `¿Confirma guardar la conciliación de "${account.muc_code} - ${account.account_name}" al ${statementDate}?\n\n` +
      `Saldo según fuente externa: C$ ${money(externalBalance)}\n` +
      `Saldo según libros: C$ ${money(worksheet.book_balance)}\n` +
      `Diferencia: C$ ${money(difference)}\n\n` +
      `Se marcarán ${clearedLines.size} partida(s) como conciliadas.`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      const res = await API.post("/api/accounting/reconciliation", {
        account_id: account.id,
        statement_date: statementDate,
        external_balance: Number(externalBalance || 0),
        cleared_line_ids: Array.from(clearedLines),
        notes: notes || null,
      });
      showAlert(`Conciliación guardada (${res.data.data.items_marked} partida(s) marcadas)`, "success");
      setWorksheet(null);
      setExternalBalance("");
      setNotes("");
      fetchHistory(account.id);
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
            <Typography variant="h6" fontWeight={700}>Conciliación de Cuentas</Typography>
            <Typography variant="body2" color="text.secondary">
              Compara el saldo de cualquier cuenta contable contra una fuente externa (subsidiario, conteo físico, confirmación de terceros) a una fecha de corte
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
          <Autocomplete
            size="small"
            options={accounts}
            value={account}
            getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            onChange={(_, value) => { setAccount(value); setWorksheet(null); }}
            sx={{ width: 320 }}
            renderInput={(params) => <TextField {...params} label="Cuenta contable" />}
          />

          <TextField
            size="small" type="date" label="Fecha de corte" InputLabelProps={{ shrink: true }}
            value={statementDate}
            onChange={(e) => { setStatementDate(e.target.value); setWorksheet(null); }}
            sx={{ width: 180 }}
          />

          <TextField
            size="small" type="number" label="Saldo según fuente externa"
            value={externalBalance}
            onChange={(e) => setExternalBalance(e.target.value)}
            sx={{ width: 220 }}
          />

          <Button variant="outlined" onClick={fetchWorksheet} disabled={loading || !account}>Cargar</Button>
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
              <Chip label={`Partidas abiertas: ${worksheet.open_items.length}`} color="warning" />
              {difference !== null && (
                <Chip
                  color={difference === 0 ? "success" : "error"}
                  label={`Diferencia: C$ ${money(difference)}`}
                />
              )}
            </Stack>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Partidas abiertas ({worksheet.open_items.length}) — marque las que ya están confirmadas contra la fuente externa
            </Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">Conciliado</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Comprobante</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Débito</TableCell>
                  <TableCell align="right">Crédito</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {worksheet.open_items.map((item) => (
                  <TableRow key={item.journal_line_id}>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={clearedLines.has(item.journal_line_id)} onChange={() => toggleLine(item.journal_line_id)} />
                    </TableCell>
                    <TableCell>{String(item.entry_date).slice(0, 10)}</TableCell>
                    <TableCell>{item.entry_no}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell align="right">{Number(item.debit) > 0 ? money(item.debit) : ""}</TableCell>
                    <TableCell align="right">{Number(item.credit) > 0 ? money(item.credit) : ""}</TableCell>
                  </TableRow>
                ))}
                {worksheet.open_items.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center">Sin partidas abiertas</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            <TextField
              fullWidth size="small" label="Notas (opcional)" multiline minRows={2} sx={{ mb: 2 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            {canSaveReconciliation && (
              <Button variant="contained" color="primary" disabled={saving || externalBalance === ""} onClick={doSave} sx={{ textTransform: "none" }}>
                {saving ? "Guardando..." : "Guardar conciliación"}
              </Button>
            )}
          </>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Historial de conciliaciones</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha de corte</TableCell>
              <TableCell align="right">Saldo externo</TableCell>
              <TableCell align="right">Saldo libros</TableCell>
              <TableCell align="right">Diferencia</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{String(r.statement_date).slice(0, 10)}</TableCell>
                <TableCell align="right">C$ {money(r.external_balance)}</TableCell>
                <TableCell align="right">C$ {money(r.book_balance)}</TableCell>
                <TableCell align="right">C$ {money(r.difference)}</TableCell>
              </TableRow>
            ))}
            {history.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center">{account ? "Sin conciliaciones registradas" : "Elija una cuenta contable"}</TableCell></TableRow>
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
