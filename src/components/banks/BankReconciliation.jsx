import React, { useContext, useEffect, useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Alert, Box, Button, Checkbox, Chip, MenuItem, Paper, Snackbar, Stack, TextField, Typography, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, ToggleButton, ToggleButtonGroup,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import BankStatementImportDialog from "./BankStatementImportDialog";
import BankStatementMatchPanel from "./BankStatementMatchPanel";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportMoney, reportDate } from "../common/reportFormat";

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const MODULE_LABELS = {
  PAYMENTS: "Pagos de créditos",
  LOANS: "Créditos",
  OBLIGACIONES: "Obligaciones financieras",
  MANUAL: "Asientos manuales",
  FIXED_ASSETS: "Activo fijo",
  BANKS: "Bancos (otras cuentas)",
  CAJA: "Caja",
};

export default function BankReconciliation() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canSaveReconciliation = role === 1 || permissions.includes("bancos.conciliacion.gestionar");
  const canCreateEntry = role === 1 || (canSaveReconciliation && permissions.includes("bancos.depositos.registrar"));
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [statementDate, setStatementDate] = useState(new Date().toISOString().slice(0, 10));
  const [statementBalance, setStatementBalance] = useState("");
  const [bookBasis, setBookBasis] = useState(null);

  const [worksheet, setWorksheet] = useState(null);
  const [statement, setStatement] = useState(null);
  const [clearedChecks, setClearedChecks] = useState(new Set());
  const [clearedDeposits, setClearedDeposits] = useState(new Set());
  const [clearedOutflows, setClearedOutflows] = useState(new Set());

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [imports, setImports] = useState([]);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  const selectedAccount = useMemo(() => bankAccounts.find((b) => String(b.id) === String(bankAccountId)) || null, [bankAccounts, bankAccountId]);
  const currency = worksheet?.currency_symbol || selectedAccount?.currency_symbol || "C$";

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

  const fetchImports = async (accountId) => {
    try {
      const res = await API.get("/api/banks/reconciliation/statement/imports", { params: { bank_account_id: accountId } });
      setImports(res.data?.data || []);
    } catch {
      setImports([]);
    }
  };

  useEffect(() => {
    if (bankAccountId) {
      fetchHistory(bankAccountId);
      fetchImports(bankAccountId);
    } else {
      setHistory([]);
      setImports([]);
    }
    setBookBasis(null);
  }, [bankAccountId]);

  const fetchStatement = async ({ fillBalance = false } = {}) => {
    try {
      const res = await API.get("/api/banks/reconciliation/statement/workspace", { params: { bank_account_id: bankAccountId, statement_date: statementDate } });
      setStatement(res.data);
      if (res.data?.suggested_statement_balance !== null && res.data?.suggested_statement_balance !== undefined) {
        setStatementBalance((prev) => (fillBalance || prev === "" ? String(res.data.suggested_statement_balance) : prev));
      }
    } catch {
      setStatement(null);
    }
  };

  const fetchWorksheet = async ({ basis = bookBasis, keepSelections = false, fillBalance = false } = {}) => {
    if (!bankAccountId || !statementDate) {
      showAlert("Elija la cuenta bancaria y la fecha de corte");
      return;
    }
    try {
      setLoading(true);
      const params = { bank_account_id: bankAccountId, statement_date: statementDate };
      if (basis) params.book_basis = basis;
      const res = await API.get("/api/banks/reconciliation/worksheet", { params });
      setWorksheet(res.data);
      setBookBasis(res.data.book_basis);
      if (!keepSelections) {
        setClearedChecks(new Set());
        setClearedDeposits(new Set());
        setClearedOutflows(new Set());
      }
      if (res.data.statement_import_enabled) await fetchStatement({ fillBalance });
      else setStatement(null);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo cargar la conciliación");
    } finally {
      setLoading(false);
    }
  };

  const refreshAfterChange = (message) => {
    if (message) showAlert(message, "success");
    fetchWorksheet({ keepSelections: true });
  };

  const toggle = (setter) => (id) => setter((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleCheck = toggle(setClearedChecks);
  const toggleDeposit = toggle(setClearedDeposits);
  const toggleOutflow = toggle(setClearedOutflows);

  // Partidas de libros pareadas con una línea del banco: se marcan solas.
  const matchedByBank = useMemo(() => {
    const map = new Map();
    (statement?.lines || []).forEach((l) => {
      if (l.match_type) map.set(`${l.match_type}:${l.match_id}`, l);
    });
    return map;
  }, [statement]);

  const isCheckCleared = (id) => clearedChecks.has(id) || matchedByBank.has(`CHECK:${id}`);
  const isDepositCleared = (id) => clearedDeposits.has(id) || matchedByBank.has(`DEPOSIT:${id}`);
  const isOutflowCleared = (id) => clearedOutflows.has(id) || matchedByBank.has(`DEPOSIT:${id}`);

  const summary = useMemo(() => {
    if (!worksheet) return null;

    const outstandingChecksTotal = worksheet.outstanding_checks
      .filter((c) => !isCheckCleared(c.id))
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const transitDepositsTotal = worksheet.transit_deposits
      .filter((d) => !isDepositCleared(d.id))
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const transitOutflowsTotal = (worksheet.transit_outflows || [])
      .filter((d) => !isOutflowCleared(d.id))
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const bankOnly = (statement?.lines || []).filter((l) => !l.match_type);
    const reconcilingItemsTotal = round2(bankOnly
      .filter((l) => l.resolution === "PARTIDA_CONCILIATORIA")
      .reduce((s, l) => s + Number(l.credit || 0) - Number(l.debit || 0), 0));
    const unexplainedLines = bankOnly.filter((l) => l.resolution !== "PARTIDA_CONCILIATORIA").length;

    const adjustedBankBalance = round2(Number(statementBalance || 0) - outstandingChecksTotal - transitOutflowsTotal + transitDepositsTotal);
    const difference = round2(adjustedBankBalance - worksheet.book_balance);
    const adjustedBookBalance = round2(worksheet.book_balance + reconcilingItemsTotal);
    const unexplainedDifference = round2(adjustedBankBalance - adjustedBookBalance);

    return {
      outstandingChecksTotal, transitDepositsTotal, transitOutflowsTotal, adjustedBankBalance, difference,
      reconcilingItemsTotal, adjustedBookBalance, unexplainedDifference, unexplainedLines,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worksheet, statement, clearedChecks, clearedDeposits, clearedOutflows, statementBalance, matchedByBank]);

  const changeBasis = (_, value) => {
    if (!value || value === bookBasis) return;
    setBookBasis(value);
    fetchWorksheet({ basis: value, keepSelections: true });
  };

  const doSave = async () => {
    const allChecks = worksheet.outstanding_checks.filter((c) => isCheckCleared(c.id)).map((c) => c.id);
    const allDeposits = [
      ...worksheet.transit_deposits.filter((d) => isDepositCleared(d.id)).map((d) => d.id),
      ...(worksheet.transit_outflows || []).filter((d) => isOutflowCleared(d.id)).map((d) => d.id),
    ];
    const confirmed = window.confirm(
      `¿Confirma guardar la conciliación de la cuenta al ${statementDate}?\n\n` +
      `Saldo según banco: ${currency} ${money(statementBalance)}\n` +
      `Saldo según libros: ${currency} ${money(worksheet.book_balance)}\n` +
      `Diferencia: ${currency} ${money(summary.difference)}\n` +
      (statement?.lines?.length ? `Diferencia no explicada: ${currency} ${money(summary.unexplainedDifference)}\n` : "") +
      `\nSe marcarán ${allChecks.length} cheque(s) y ${allDeposits.length} depósito(s)/egreso(s) como conciliados.`
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      const res = await API.post("/api/banks/reconciliation", {
        bank_account_id: bankAccountId,
        statement_date: statementDate,
        statement_balance: Number(statementBalance || 0),
        book_basis: worksheet.book_basis,
        cleared_check_ids: allChecks,
        cleared_deposit_ids: allDeposits,
      });
      showAlert(`Conciliación guardada (${res.data.data.items_marked} partida(s) marcadas)`, "success");
      setWorksheet(null);
      setStatement(null);
      setStatementBalance("");
      setClearedChecks(new Set());
      setClearedDeposits(new Set());
      setClearedOutflows(new Set());
      fetchHistory(bankAccountId);
      fetchImports(bankAccountId);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo guardar la conciliación");
    } finally {
      setSaving(false);
    }
  };

  const reMatch = async () => {
    try {
      const res = await API.post("/api/banks/reconciliation/statement/auto-match", { bank_account_id: bankAccountId });
      refreshAfterChange(res.data?.message);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo parear");
    }
  };

  const onImported = (data) => {
    setImportOpen(false);
    const extra = data.warnings?.length ? ` ${data.warnings.join(" ")}` : "";
    showAlert(
      `Importados ${data.lines_imported} movimiento(s), ${data.auto_matched} pareado(s) automáticamente` +
      `${data.skipped_duplicates ? `, ${data.skipped_duplicates} ya existían` : ""}.${extra}`,
      data.warnings?.length ? "warning" : "success",
    );
    if (data.statement_date && data.statement_date !== statementDate && !worksheet) setStatementDate(data.statement_date);
    fetchImports(bankAccountId);
    if (worksheet) fetchWorksheet({ keepSelections: true, fillBalance: true });
  };

  const openImportFile = async (imp) => {
    try {
      const res = await API.get(`/api/banks/reconciliation/statement/imports/${imp.id}/file`);
      window.open(res.data.data.url, "_blank", "noopener");
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo abrir el archivo");
    }
  };

  const voidImport = async (imp) => {
    const reason = window.prompt(`Motivo para anular la importación "${imp.file_name}":`);
    if (reason === null) return;
    try {
      await API.put(`/api/banks/reconciliation/statement/imports/${imp.id}/void`, { void_reason: reason });
      showAlert("Importación anulada", "success");
      fetchImports(bankAccountId);
      if (worksheet) fetchWorksheet({ keepSelections: true });
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo anular la importación");
    }
  };

  const bankDateFor = (key) => {
    const line = matchedByBank.get(key);
    return line ? String(line.txn_date).slice(0, 10) : null;
  };

  const sharing = worksheet?.gl_sharing;
  const otherModules = (sharing?.other_modules || []).filter((m) => Number(m.debit) || Number(m.credit));
  const statementEnabled = Boolean(worksheet?.statement_import_enabled);

  // Hoja de conciliación tal como se ve: resumen + partidas pendientes con su marca.
  const buildWorksheetReport = () => {
    const concept = (partida, monto) => ({ partida, monto });
    const section = (partida) => ({ section: true, partida });
    const bankLines = statement?.lines || [];
    const rows = [
      section("Resumen"),
      concept("Saldo según banco", Number(statementBalance || 0)),
      concept("Saldo según libros", worksheet.book_balance),
      concept("Cheques pendientes", summary.outstandingChecksTotal),
      concept("Otros egresos pendientes", summary.transitOutflowsTotal),
      concept("Depósitos en tránsito", summary.transitDepositsTotal),
      concept("Saldo banco ajustado", summary.adjustedBankBalance),
      concept("Diferencia", summary.difference),
      ...(bankLines.length ? [
        concept("Partidas conciliatorias", summary.reconcilingItemsTotal),
        concept("Diferencia no explicada", summary.unexplainedDifference),
        section("Estado de cuenta del banco"),
        ...bankLines.map((l) => ({
          partida: Number(l.credit) > 0 ? "Banco · Crédito" : "Banco · Débito",
          fecha: l.txn_date,
          referencia: l.reference,
          descripcion: l.description,
          monto: Number(l.credit) > 0 ? Number(l.credit) : Number(l.debit),
          estado: l.match_type
            ? `Pareado: ${l.matched_item?.label || `${l.match_type} #${l.match_id}`}`
            : l.resolution === "PARTIDA_CONCILIATORIA" ? `Partida conciliatoria: ${l.resolution_notes || ""}` : "Sin explicar",
        })),
      ] : []),
      section("Solo en libros — cheques emitidos pendientes"),
      ...worksheet.outstanding_checks.map((c) => ({
        partida: "Cheque", fecha: c.issue_date, referencia: c.check_number, descripcion: c.beneficiary_name, monto: Number(c.amount),
        estado: isCheckCleared(c.id) ? "Cobrado" : "Pendiente",
      })),
      section("Solo en libros — otros egresos pendientes"),
      ...(worksheet.transit_outflows || []).map((d) => ({
        partida: "Egreso", fecha: d.deposit_date, descripcion: d.description, monto: Number(d.amount),
        estado: isOutflowCleared(d.id) ? "Confirmado" : "Pendiente",
      })),
      section("Solo en libros — depósitos en tránsito"),
      ...worksheet.transit_deposits.map((d) => ({
        partida: "Depósito", fecha: d.deposit_date, descripcion: d.description, monto: Number(d.amount),
        estado: isDepositCleared(d.id) ? "Acreditado" : "En tránsito",
      })),
    ];
    return {
      title: "Conciliación bancaria",
      subtitle: `${selectedAccount?.account_alias || ""} · Base libros: ${worksheet.book_basis === "SUBLEDGER" ? "movimientos de la cuenta bancaria" : "cuenta contable"} · Moneda: ${currency}`,
      period: `Al ${statementDate}`,
      fileName: `conciliacion_bancaria_${statementDate}`,
      sheetName: "Conciliación",
      columns: [
        { field: "partida", label: "Partida" },
        { field: "fecha", label: "Fecha", format: reportDate },
        { field: "referencia", label: "Referencia / N°" },
        { field: "descripcion", label: "Descripción" },
        { label: "Monto", value: (r) => (r.section ? null : r.monto), numeric: true, format: (v) => (v === null || v === undefined ? "" : reportMoney(v)) },
        { field: "estado", label: "Estado" },
      ],
      rows,
    };
  };

  const buildHistoryReport = () => ({
    title: "Historial de conciliaciones bancarias",
    subtitle: `${selectedAccount?.account_alias || ""} · Moneda: ${currency}`,
    fileName: "historial_conciliaciones",
    sheetName: "Historial",
    columns: [
      { field: "statement_date", label: "Fecha de corte", format: reportDate },
      { label: "Base libros", value: (r) => (r.book_basis === "SUBLEDGER" ? "Cuenta bancaria" : "Cuenta contable") },
      { label: "Saldo banco", value: (r) => Number(r.statement_balance || 0), numeric: true, format: reportMoney },
      { label: "Saldo libros", value: (r) => Number(r.book_balance || 0), numeric: true, format: reportMoney },
      { label: "Diferencia", value: (r) => Number(r.difference || 0), numeric: true, format: reportMoney },
      {
        label: "No explicada",
        value: (r) => (r.unexplained_difference === null || r.unexplained_difference === undefined ? null : Number(r.unexplained_difference)),
        numeric: true,
        format: (v) => (v === null || v === undefined ? "—" : reportMoney(v)),
      },
    ],
    rows: history,
  });

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <AccountBalanceWalletIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>Conciliación Bancaria</Typography>
              <HelpButton screenKey="bancos.conciliacion" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Importe el estado de cuenta del banco y compárelo contra libros a una fecha de corte
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField
            select size="small" label="Cuenta bancaria" value={bankAccountId}
            onChange={(e) => { setBankAccountId(e.target.value); setWorksheet(null); setStatement(null); setStatementBalance(""); }}
            sx={{ width: 260 }}
          >
            {bankAccounts.map((b) => <MenuItem key={b.id} value={b.id}>{b.account_alias}</MenuItem>)}
          </TextField>

          <TextField
            size="small" type="date" label="Fecha de corte" InputLabelProps={{ shrink: true }}
            value={statementDate}
            onChange={(e) => { setStatementDate(e.target.value); setWorksheet(null); setStatement(null); }}
            sx={{ width: 180 }}
          />

          <TextField
            size="small" type="number" label="Saldo según banco"
            value={statementBalance}
            onChange={(e) => setStatementBalance(e.target.value)}
            sx={{ width: 180 }}
          />

          <Button variant="outlined" onClick={() => fetchWorksheet()} disabled={loading}>Cargar</Button>
          {canSaveReconciliation && (
            <Button
              variant="outlined" startIcon={<UploadFileIcon />} disabled={!bankAccountId}
              onClick={() => setImportOpen(true)} sx={{ textTransform: "none" }}
            >
              Importar estado de cuenta
            </Button>
          )}
          <ReportExportButtons report={buildWorksheetReport} disabled={!worksheet || !summary} />
        </Stack>

        {statement?.suggested_statement_balance_source && worksheet && (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: -1, mb: 2 }}>
            {statement.suggested_statement_balance_source}: {currency} {money(statement.suggested_statement_balance)}
          </Typography>
        )}

        {worksheet && (
          <>
            <Divider sx={{ my: 2 }} />

            {worksheet.last_reconciliation_date && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Última conciliación de esta cuenta: {String(worksheet.last_reconciliation_date).slice(0, 10)}
              </Alert>
            )}

            <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} sx={{ mb: 1 }}>
              <Typography variant="body2" fontWeight={600}>Saldo según libros calculado con:</Typography>
              <ToggleButtonGroup size="small" exclusive value={worksheet.book_basis} onChange={changeBasis}>
                <ToggleButton value="SUBLEDGER" sx={{ textTransform: "none" }}>
                  Movimientos de esta cuenta bancaria ({currency} {money(worksheet.subledger_book_balance)})
                </ToggleButton>
                <ToggleButton value="GL" sx={{ textTransform: "none" }}>
                  Cuenta contable {sharing?.gl_account?.muc_code || ""} ({money(worksheet.gl_book_balance)})
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {sharing?.is_shared && (
              <Alert severity="warning" sx={{ mb: 1 }}>
                La cuenta contable {sharing.gl_account?.muc_code} {sharing.gl_account?.account_name} también la usa(n):{" "}
                {sharing.other_bank_accounts.map((b) => `${b.account_alias}${b.currency_symbol && b.currency_symbol !== currency ? ` (${b.currency_symbol})` : ""}`).join(", ")}.
                {" "}Su saldo contable mezcla varias cuentas bancaria{sharing.other_bank_accounts.some((b) => b.currency_symbol && b.currency_symbol !== currency) ? " y monedas" : "s"},
                por eso se recomienda conciliar con los movimientos de esta cuenta bancaria (cheques, depósitos y egresos registrados en Bancos).
                Para separarlas, asigne a cada cuenta bancaria su propia subcuenta 1102.01.xx.
              </Alert>
            )}
            {worksheet.book_basis === "SUBLEDGER" && otherModules.length > 0 && (
              <Alert severity="info" sx={{ mb: 1 }}>
                Desde {String(sharing.period_start).slice(0, 10)} otros módulos registraron directo en la cuenta contable sin pasar por Bancos:{" "}
                {otherModules.map((m) => `${MODULE_LABELS[m.source_module] || m.source_module} (${m.entries} asiento(s), débitos ${money(m.debit)} / créditos ${money(m.credit)})`).join("; ")}.
                {" "}No cuentan en el saldo de esta cuenta bancaria. Si aparecen en el estado de cuenta, déjelos como partida conciliatoria indicando dónde están registrados en lugar de generar otro asiento.
              </Alert>
            )}

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ my: 2 }}>
              <Chip label={`Saldo según libros: ${currency} ${money(worksheet.book_balance)}`} />
              <Chip label={`Cheques pendientes: ${currency} ${money(summary.outstandingChecksTotal)}`} color="warning" />
              <Chip label={`Otros egresos pendientes: ${currency} ${money(summary.transitOutflowsTotal)}`} color="warning" />
              <Chip label={`Depósitos en tránsito: ${currency} ${money(summary.transitDepositsTotal)}`} color="warning" />
              <Chip label={`Saldo banco ajustado: ${currency} ${money(summary.adjustedBankBalance)}`} color="info" />
              <Chip
                color={summary.difference === 0 ? "success" : "error"}
                label={`Diferencia: ${currency} ${money(summary.difference)}`}
              />
              {statement?.lines?.length > 0 && (
                <>
                  <Chip label={`Partidas conciliatorias: ${currency} ${money(summary.reconcilingItemsTotal)}`} color="info" />
                  <Chip
                    color={summary.unexplainedDifference === 0 ? "success" : "error"}
                    label={`Diferencia no explicada: ${currency} ${money(summary.unexplainedDifference)}`}
                  />
                </>
              )}
            </Stack>

            {statementEnabled && statement && (
              <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>Estado de cuenta del banco</Typography>
                  {canSaveReconciliation && statement.lines.length > 0 && (
                    <Button size="small" onClick={reMatch} sx={{ textTransform: "none" }}>Parear automáticamente</Button>
                  )}
                </Stack>
                {statement.lines.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No hay movimientos del banco importados pendientes hasta esta fecha. Use "Importar estado de cuenta" para cargar el Excel o CSV del banco,
                    o escriba el saldo a mano y marque las partidas cobradas.
                  </Typography>
                ) : (
                  <>
                    {summary.unexplainedLines > 0 && (
                      <Alert severity="warning" sx={{ mb: 1 }}>
                        {summary.unexplainedLines} movimiento(s) del banco sin explicar: paréelos, genere su asiento o déjelos como partida conciliatoria.
                      </Alert>
                    )}
                    <BankStatementMatchPanel
                      lines={statement.lines}
                      pendingChecks={worksheet.outstanding_checks}
                      pendingDeposits={worksheet.transit_deposits}
                      pendingOutflows={worksheet.transit_outflows || []}
                      currency={currency}
                      canManage={canSaveReconciliation}
                      canCreateEntry={canCreateEntry}
                      onChanged={refreshAfterChange}
                      onError={(m) => showAlert(m)}
                    />
                  </>
                )}
                {statement.lines_after_statement_date > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {statement.lines_after_statement_date} movimiento(s) importado(s) con fecha posterior al corte quedan para la próxima conciliación.
                  </Typography>
                )}
              </Paper>
            )}

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Solo en libros — cheques emitidos pendientes ({worksheet.outstanding_checks.length})
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
                {worksheet.outstanding_checks.map((c) => {
                  const bankDate = bankDateFor(`CHECK:${c.id}`);
                  return (
                    <TableRow key={c.id}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={isCheckCleared(c.id)} disabled={Boolean(bankDate)} onChange={() => toggleCheck(c.id)} />
                      </TableCell>
                      <TableCell>{c.check_number}</TableCell>
                      <TableCell>{String(c.issue_date).slice(0, 10)}</TableCell>
                      <TableCell>{c.beneficiary_name}{bankDate && <Chip size="small" sx={{ ml: 1 }} label={`Banco ${bankDate}`} />}</TableCell>
                      <TableCell align="right">{money(c.amount)}</TableCell>
                    </TableRow>
                  );
                })}
                {worksheet.outstanding_checks.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center">Sin cheques pendientes</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Solo en libros — otros egresos pendientes ({(worksheet.transit_outflows || []).length})
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
                {(worksheet.transit_outflows || []).map((d) => {
                  const bankDate = bankDateFor(`DEPOSIT:${d.id}`);
                  return (
                    <TableRow key={d.id}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={isOutflowCleared(d.id)} disabled={Boolean(bankDate)} onChange={() => toggleOutflow(d.id)} />
                      </TableCell>
                      <TableCell>{String(d.deposit_date).slice(0, 10)}</TableCell>
                      <TableCell>{d.description}{bankDate && <Chip size="small" sx={{ ml: 1 }} label={`Banco ${bankDate}`} />}</TableCell>
                      <TableCell align="right">{money(d.amount)}</TableCell>
                    </TableRow>
                  );
                })}
                {(worksheet.transit_outflows || []).length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center">Sin otros egresos pendientes</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Solo en libros — depósitos en tránsito ({worksheet.transit_deposits.length})
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
                {worksheet.transit_deposits.map((d) => {
                  const bankDate = bankDateFor(`DEPOSIT:${d.id}`);
                  return (
                    <TableRow key={d.id}>
                      <TableCell padding="checkbox">
                        <Checkbox size="small" checked={isDepositCleared(d.id)} disabled={Boolean(bankDate)} onChange={() => toggleDeposit(d.id)} />
                      </TableCell>
                      <TableCell>{String(d.deposit_date).slice(0, 10)}</TableCell>
                      <TableCell>{d.description}{bankDate && <Chip size="small" sx={{ ml: 1 }} label={`Banco ${bankDate}`} />}</TableCell>
                      <TableCell align="right">{money(d.amount)}</TableCell>
                    </TableRow>
                  );
                })}
                {worksheet.transit_deposits.length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center">Sin depósitos en tránsito</TableCell></TableRow>
                )}
              </TableBody>
            </Table>

            {canSaveReconciliation && (
              <Button variant="contained" color="primary" disabled={saving} onClick={doSave} sx={{ textTransform: "none" }}>
                {saving ? "Guardando..." : "Guardar conciliación"}
              </Button>
            )}
          </>
        )}
      </Paper>

      {imports.length > 0 && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Estados de cuenta importados</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Archivo</TableCell>
                <TableCell>Período</TableCell>
                <TableCell align="right">Movimientos</TableCell>
                <TableCell align="right">Saldo final</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {imports.map((imp) => (
                <TableRow key={imp.id}>
                  <TableCell>{imp.id}</TableCell>
                  <TableCell>{imp.file_name}</TableCell>
                  <TableCell>{String(imp.period_start || "").slice(0, 10)} al {String(imp.period_end || "").slice(0, 10)}</TableCell>
                  <TableCell align="right">{imp.line_count}</TableCell>
                  <TableCell align="right">{imp.closing_balance === null ? "—" : money(imp.closing_balance)}</TableCell>
                  <TableCell>
                    <Chip size="small" color={imp.status === "ANULADO" ? "default" : "success"} label={imp.status === "ANULADO" ? "Anulado" : `Vigente${Number(imp.reconciled_lines) ? ` · ${imp.reconciled_lines} conciliado(s)` : ""}`} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {Boolean(Number(imp.has_file)) && (
                      <Button size="small" onClick={() => openImportFile(imp)} sx={{ textTransform: "none" }}>Ver archivo</Button>
                    )}
                    {canSaveReconciliation && imp.status === "ACTIVO" && !Number(imp.reconciled_lines) && (
                      <Button size="small" color="error" onClick={() => voidImport(imp)} sx={{ textTransform: "none" }}>Anular</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>Historial de conciliaciones</Typography>
          <ReportExportButtons size="small" report={buildHistoryReport} disabled={!history.length} />
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha de corte</TableCell>
              <TableCell>Base libros</TableCell>
              <TableCell align="right">Saldo banco</TableCell>
              <TableCell align="right">Saldo libros</TableCell>
              <TableCell align="right">Diferencia</TableCell>
              <TableCell align="right">No explicada</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{String(r.statement_date).slice(0, 10)}</TableCell>
                <TableCell>{r.book_basis === "SUBLEDGER" ? "Cuenta bancaria" : "Cuenta contable"}</TableCell>
                <TableCell align="right">{currency} {money(r.statement_balance)}</TableCell>
                <TableCell align="right">{currency} {money(r.book_balance)}</TableCell>
                <TableCell align="right">{currency} {money(r.difference)}</TableCell>
                <TableCell align="right">{r.unexplained_difference === null || r.unexplained_difference === undefined ? "—" : `${currency} ${money(r.unexplained_difference)}`}</TableCell>
              </TableRow>
            ))}
            {history.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">{bankAccountId ? "Sin conciliaciones registradas" : "Elija una cuenta bancaria"}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <BankStatementImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        bankAccount={selectedAccount}
        defaultStatementDate={statementDate}
        onImported={onImported}
      />

      <Snackbar open={alert.open} autoHideDuration={6000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
