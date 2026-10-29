import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import HelpButton from "../help/HelpButton";
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Paper, Snackbar, Stack, Tab, Tabs, TextField, Typography,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Autocomplete,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import * as XLSX from "xlsx";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import ReportExportButtons from "../common/ReportExportButtons";

// Integración de cuentas (api/accounting/accountIntegrationController.js):
// el saldo de una cuenta a una fecha de corte descompuesto por su auxiliar
// (crédito, cobrador, caja, aseguradora, factura) contra el libro mayor,
// con las partidas conciliatorias que explican la diferencia. Las cuentas
// sin auxiliar en el sistema siguen con la conciliación manual (saldo de la
// fuente externa + marcar partidas); bancos va a Conciliación Bancaria.

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (v) => (v ? String(v).slice(0, 10).split("-").reverse().join("/") : "—");
const headSx = { "& th": { backgroundColor: "#F8FAFC", fontWeight: 700, whiteSpace: "nowrap" } };
const paperSx = { p: 2, borderRadius: 3, border: "1px solid #E5E7EB" };

const DifferenceChip = ({ value, label = "Diferencia" }) => (
  <Chip
    size="small"
    color={Number(value) === 0 ? "success" : "error"}
    label={Number(value) === 0 ? `${label}: cuadra` : `${label}: C$ ${money(value)}`}
  />
);

const cellValue = (row, col) => {
  const v = row[col.field];
  if (col.type === "money") return money(v);
  if (col.type === "date") return dmy(v);
  return v ?? "—";
};

const exportIntegration = (data) => {
  const cols = data.columns || [];
  const sheetRows = (data.rows || []).map((r) => Object.fromEntries(cols.map((c) => [c.header, c.type === "money" ? Number(r[c.field] || 0) : (r[c.field] ?? "")])));
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  const summary = [
    { Concepto: "Cuenta", Valor: `${data.account.muc_code} - ${data.account.account_name}` },
    { Concepto: "Fecha de corte", Valor: data.as_of },
    { Concepto: "Auxiliar", Valor: data.kind_label },
    { Concepto: "Total del auxiliar", Valor: data.subledger_total },
    ...(data.reconciling || []).map((r) => ({ Concepto: r.label, Valor: r.amount })),
    { Concepto: "Saldo esperado en libros", Valor: data.expected_gl },
    { Concepto: "Saldo en libros", Valor: data.gl_balance },
    { Concepto: "Diferencia sin explicar", Valor: data.difference },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Resumen");
  XLSX.utils.book_append_sheet(wb, ws, "Detalle");
  XLSX.writeFile(wb, `integracion_${data.account.muc_code}_${data.as_of}.xlsx`);
};

// Impresión de una integración: el mismo detalle y resumen que exporta
// exportIntegration (hojas Detalle y Resumen), en una sola tabla.
const buildIntegrationReport = (data) => {
  const cols = data.columns || [];
  const first = cols[0]?.field || "label";
  const amountField = [...cols].reverse().find((c) => c.type === "money")?.field || cols[cols.length - 1]?.field || "amount";
  const summaryRow = (label, amount, extra = {}) => ({ [first]: label, [amountField]: Number(amount || 0), ...extra });
  return {
    title: "Integración de cuentas",
    subtitle: `${data.account.muc_code} - ${data.account.account_name} · ${data.kind_label || ""}`,
    period: `Al ${dmy(data.as_of)}`,
    fileName: `integracion_${data.account.muc_code}_${data.as_of}`,
    orientation: cols.length > 7 ? "landscape" : "portrait",
    columns: cols.map((c) => (c.type === "money"
      ? { field: c.field, label: c.header, numeric: true, format: (v) => (v === undefined || v === null || v === "" ? "" : money(v)) }
      : { field: c.field, label: c.header, format: (v) => (c.type === "date" ? (v ? dmy(v) : "") : v ?? "") })),
    rows: [
      ...(data.rows || []),
      { section: true, [first]: "Resumen" },
      summaryRow(`Total del auxiliar (${(data.rows || []).length})`, data.subledger_total, { total: true }),
      ...(data.reconciling || []).map((r) => summaryRow(r.label, r.amount)),
      summaryRow("Saldo esperado en libros", data.expected_gl),
      summaryRow("Saldo en libros", data.gl_balance, { total: true }),
      summaryRow("Diferencia sin explicar", data.difference, { total: true }),
    ],
  };
};

// Detalle de una integración (en vivo o guardada).
function IntegrationDetail({ data, filter = "" }) {
  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return data.rows || [];
    return (data.rows || []).filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [data, filter]);
  const cols = data.columns || [];

  return (
    <>
      <TableContainer sx={{ maxHeight: 480, border: "1px solid #E5E7EB", borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead sx={headSx}>
            <TableRow>
              {cols.map((c) => (
                <TableCell key={c.field} align={c.type === "money" ? "right" : "left"}>{c.header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key} hover>
                {cols.map((c) => (
                  <TableCell key={c.field} align={c.type === "money" ? "right" : "left"}>
                    {cellValue(r, c)}
                    {c.field === "label" && r.flag && <Chip size="small" color="warning" variant="outlined" label={r.flag} sx={{ ml: 1 }} />}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={Math.max(cols.length, 1)} align="center">Sin saldos en el auxiliar a la fecha</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Table size="small" sx={{ mt: 1, maxWidth: 640, ml: "auto" }}>
        <TableBody>
          <TableRow>
            <TableCell>{`Total del auxiliar (${(data.rows || []).length})`}</TableCell>
            <TableCell align="right"><b>C$ {money(data.subledger_total)}</b></TableCell>
          </TableRow>
          {(data.reconciling || []).map((r) => (
            <TableRow key={r.label}>
              <TableCell>{r.label}</TableCell>
              <TableCell align="right">C$ {money(r.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell>Saldo esperado en libros</TableCell>
            <TableCell align="right">C$ {money(data.expected_gl)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Saldo en libros</TableCell>
            <TableCell align="right"><b>C$ {money(data.gl_balance)}</b></TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Diferencia sin explicar</TableCell>
            <TableCell align="right"><DifferenceChip value={data.difference} label="Diferencia" /></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
}

export default function AccountIntegration() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canSave = role === 1 || permissions.includes("contabilidad.conciliacion.gestionar");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [integrable, setIntegrable] = useState(new Map());
  const [account, setAccount] = useState(null);
  const [asOf, setAsOf] = useState(today());

  const [integration, setIntegration] = useState(null);
  const [filter, setFilter] = useState("");

  // Conciliación manual (cuentas sin auxiliar)
  const [worksheet, setWorksheet] = useState(null);
  const [externalBalance, setExternalBalance] = useState("");
  const [clearedLines, setClearedLines] = useState(new Set());

  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [savedView, setSavedView] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  useEffect(() => {
    API.get("/api/accounting/accounts?is_active=1").then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAccounts(list.filter((a) => Number(a.is_movement) === 1));
    }).catch(() => setAccounts([]));
    API.get("/api/accounting/integration/accounts").then((res) => {
      setIntegrable(new Map((res.data?.data || []).map((r) => [Number(r.account_id), r])));
    }).catch(() => setIntegrable(new Map()));
  }, []);

  // Las cuentas con auxiliar primero en el selector.
  const accountOptions = useMemo(() => [...accounts].sort((a, b) => {
    const ia = integrable.has(Number(a.id)) ? 0 : 1;
    const ib = integrable.has(Number(b.id)) ? 0 : 1;
    return ia - ib || String(a.muc_code).localeCompare(String(b.muc_code));
  }), [accounts, integrable]);

  // ?account_id=… (desde el resumen o un enlace)
  useEffect(() => {
    const id = Number(searchParams.get("account_id"));
    if (id && accounts.length && !account) setAccount(accounts.find((a) => Number(a.id) === id) || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, searchParams]);

  const fetchHistory = async (accountId) => {
    try {
      const res = await API.get("/api/accounting/reconciliation", { params: { account_id: accountId } });
      setHistory(res.data?.data || []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    setIntegration(null);
    setWorksheet(null);
    if (account) fetchHistory(account.id);
    else setHistory([]);
  }, [account]);

  const isManual = integration && !integration.kind;

  const load = async () => {
    if (!account || !asOf) {
      showAlert("Elija la cuenta y la fecha de corte");
      return;
    }
    try {
      setLoading(true);
      setIntegration(null);
      setWorksheet(null);
      setFilter("");
      const res = await API.get("/api/accounting/integration", { params: { account_id: account.id, as_of: asOf } });
      const data = res.data?.data;
      setIntegration(data);
      if (data && !data.kind) {
        const ws = await API.get("/api/accounting/reconciliation/worksheet", { params: { account_id: account.id, statement_date: asOf } });
        setWorksheet(ws.data);
        setClearedLines(new Set());
      }
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo cargar la integración");
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/accounting/integration/summary", { params: { as_of: asOf } });
      setSummary(res.data?.data || null);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo calcular el resumen");
    } finally {
      setLoading(false);
    }
  };

  const openFromSummary = (row) => {
    setAccount(accounts.find((a) => Number(a.id) === Number(row.account.id)) || null);
    setTab(0);
  };

  const saveIntegration = async () => {
    try {
      setSaving(true);
      await API.post("/api/accounting/integration", { account_id: account.id, as_of: asOf, notes: notes || null });
      showAlert(`Integración de ${account.muc_code} al ${dmy(asOf)} guardada`, "success");
      setNotes("");
      fetchHistory(account.id);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo guardar la integración");
    } finally {
      setSaving(false);
    }
  };

  const manualDifference = useMemo(() => {
    if (!worksheet || externalBalance === "") return null;
    return Number((Number(externalBalance) - worksheet.book_balance).toFixed(2));
  }, [worksheet, externalBalance]);

  const toggleLine = (id) => setClearedLines((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const saveManual = async () => {
    const confirmed = window.confirm(
      `¿Confirma guardar la conciliación de "${account.muc_code} - ${account.account_name}" al ${asOf}?\n\n` +
      `Saldo según fuente externa: C$ ${money(externalBalance)}\n` +
      `Saldo según libros: C$ ${money(worksheet.book_balance)}\n` +
      `Diferencia: C$ ${money(manualDifference)}\n\n` +
      `Se marcarán ${clearedLines.size} partida(s) como conciliadas.`,
    );
    if (!confirmed) return;
    try {
      setSaving(true);
      const res = await API.post("/api/accounting/reconciliation", {
        account_id: account.id,
        statement_date: asOf,
        external_balance: Number(externalBalance || 0),
        cleared_line_ids: Array.from(clearedLines),
        notes: notes || null,
      });
      showAlert(`Conciliación guardada (${res.data.data.items_marked} partida(s) marcadas)`, "success");
      setWorksheet(null);
      setIntegration(null);
      setExternalBalance("");
      setNotes("");
      fetchHistory(account.id);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo guardar la conciliación");
    } finally {
      setSaving(false);
    }
  };

  const buildSummaryReport = () => ({
    title: "Resumen de cuentas con auxiliar",
    period: `Al ${dmy(summary?.as_of || asOf)}`,
    fileName: `integracion_resumen_${summary?.as_of || asOf}`,
    columns: [
      { label: "Cuenta", value: (r) => `${r.account.muc_code} - ${r.account.account_name}` },
      { label: "Auxiliar", value: (r) => (r.unavailable ? "No disponible" : r.kind_label) },
      { field: "gl_balance", label: "Libros", numeric: true, format: money },
      { label: "Auxiliar", numeric: true, value: (r) => (r.unavailable ? "" : r.subledger_total), format: (v) => (v === "" ? "—" : money(v)) },
      { field: "reconciling_total", label: "Partidas conciliatorias", numeric: true, format: (v) => (v ? money(v) : "—") },
      { label: "Diferencia sin explicar", numeric: true, value: (r) => (r.unavailable ? "" : r.difference), format: (v) => (v === "" ? "—" : Number(v) === 0 ? "Cuadra" : money(v)) },
    ],
    rows: summary?.accounts || [],
  });

  const buildHistoryReport = () => ({
    title: "Historial de integraciones y conciliaciones",
    subtitle: account ? `${account.muc_code} - ${account.account_name}` : "",
    fileName: `integracion_historial_${account?.muc_code || ""}`,
    columns: [
      { field: "statement_date", label: "Fecha de corte", format: (v) => String(v || "").slice(0, 10) },
      { label: "Tipo", value: (r) => (r.source_kind ? "Integración" : "Conciliación manual") },
      { field: "external_balance", label: "Auxiliar / fuente externa", numeric: true, format: money },
      { field: "book_balance", label: "Saldo libros", numeric: true, format: money },
      { field: "difference", label: "Diferencia", numeric: true, format: money },
      { field: "notes", label: "Notas", format: (v) => v || "" },
    ],
    rows: history,
  });

  const savedViewData = savedView?.integration_snapshot ? {
    account: { muc_code: savedView.muc_code, account_name: savedView.account_name || "" },
    as_of: String(savedView.statement_date || "").slice(0, 10),
    kind_label: savedView.integration_snapshot.kind_label,
    columns: savedView.integration_snapshot.columns,
    rows: savedView.integration_snapshot.rows,
    reconciling: savedView.integration_snapshot.reconciling,
    subledger_total: savedView.subledger_total,
    expected_gl: savedView.external_balance,
    gl_balance: savedView.book_balance,
    difference: Number((Number(savedView.book_balance) - Number(savedView.external_balance)).toFixed(2)),
  } : null;

  const openSaved = async (row) => {
    try {
      const res = await API.get(`/api/accounting/integration/saved/${row.id}`);
      setSavedView(res.data?.data || null);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo abrir la integración guardada");
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ ...paperSx, mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <AccountBalanceWalletIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h6" fontWeight={700}>Integración de cuentas</Typography>
              <HelpButton screenKey="contabilidad.conciliacion" />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Detalle del saldo de cada cuenta por su auxiliar (crédito, cobrador, caja, aseguradora, proveedor) a una fecha de corte, contra el libro mayor
            </Typography>
          </Box>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: "1px solid #E5E7EB" }}>
          <Tab label="Por cuenta" sx={{ textTransform: "none" }} />
          <Tab label="Resumen de cuentas con auxiliar" sx={{ textTransform: "none" }} />
        </Tabs>

        {tab === 0 && (
          <>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
              <Autocomplete
                size="small"
                options={accountOptions}
                value={account}
                groupBy={(o) => (integrable.has(Number(o.id)) ? "Con auxiliar en el sistema" : "Conciliación manual")}
                getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => setAccount(value)}
                sx={{ width: 380 }}
                renderInput={(params) => <TextField {...params} label="Cuenta contable" />}
              />
              <TextField
                size="small" type="date" label="Fecha de corte" InputLabelProps={{ shrink: true }}
                value={asOf}
                onChange={(e) => { setAsOf(e.target.value); setIntegration(null); setWorksheet(null); }}
                sx={{ width: 180 }}
              />
              <Button variant="outlined" onClick={load} disabled={loading || !account} sx={{ textTransform: "none" }}>
                {loading ? "Cargando..." : "Cargar"}
              </Button>
            </Stack>

            {loading && <CircularProgress size={22} />}

            {integration?.kind === "BANK" && (
              <Alert
                severity="info"
                action={<Button color="inherit" size="small" onClick={() => navigate(integration.redirect)}>Ir a Conciliación Bancaria</Button>}
              >
                {`${integration.account.muc_code} es una cuenta de bancos: se concilia contra el estado de cuenta del banco en Bancos > Conciliación Bancaria.`}
                {integration.bank_accounts?.length > 1 && ` Esta cuenta contable la comparten ${integration.bank_accounts.length} cuentas bancarias (${integration.bank_accounts.map((b) => b.account_alias).join(", ")}).`}
              </Alert>
            )}

            {integration?.unavailable && <Alert severity="warning">{integration.unavailable}</Alert>}

            {integration?.kind && integration.kind !== "BANK" && !integration.unavailable && (
              <>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  <Chip color="primary" variant="outlined" label={integration.kind_label} />
                  <Chip label={`Libros: C$ ${money(integration.gl_balance)}`} />
                  <Chip label={`Auxiliar: C$ ${money(integration.subledger_total)}`} />
                  {integration.reconciling?.length > 0 && <Chip label={`Partidas conciliatorias: C$ ${money(integration.reconciling_total)}`} />}
                  <DifferenceChip value={integration.difference} label="Diferencia sin explicar" />
                </Stack>
                {(integration.notes || []).map((n) => <Alert key={n} severity="info" sx={{ mb: 1 }}>{n}</Alert>)}
                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                  <TextField size="small" label="Buscar en el detalle" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ width: 280 }} />
                  <Button size="small" startIcon={<FileDownloadIcon />} sx={{ textTransform: "none" }} onClick={() => exportIntegration(integration)}>
                    Exportar a Excel
                  </Button>
                  <ReportExportButtons excel={false} size="small" report={() => buildIntegrationReport(integration)} />
                </Stack>
                <IntegrationDetail data={integration} filter={filter} />
                {canSave && (
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 2 }}>
                    <TextField fullWidth size="small" label="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    <Button variant="contained" disabled={saving} onClick={saveIntegration} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
                      {saving ? "Guardando..." : "Guardar integración"}
                    </Button>
                  </Stack>
                )}
              </>
            )}

            {isManual && worksheet && (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Esta cuenta no tiene auxiliar en el sistema: concílela contra una fuente externa (conteo físico, confirmación de terceros, subsidiario externo).
                </Alert>
                {worksheet.last_reconciliation_date && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Última conciliación de esta cuenta: {String(worksheet.last_reconciliation_date).slice(0, 10)}
                  </Alert>
                )}
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }} alignItems="center">
                  <TextField
                    size="small" type="number" label="Saldo según fuente externa"
                    value={externalBalance}
                    onChange={(e) => setExternalBalance(e.target.value)}
                    sx={{ width: 220 }}
                  />
                  <Chip label={`Saldo según libros: C$ ${money(worksheet.book_balance)}`} />
                  <Chip label={`Partidas abiertas: ${worksheet.open_items.length}`} color="warning" />
                  {manualDifference !== null && <DifferenceChip value={manualDifference} />}
                </Stack>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Partidas abiertas ({worksheet.open_items.length}) — marque las que ya están confirmadas contra la fuente externa
                </Typography>
                <Table size="small" sx={{ mb: 2 }}>
                  <TableHead sx={headSx}>
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
                {canSave && (
                  <Button variant="contained" disabled={saving || externalBalance === ""} onClick={saveManual} sx={{ textTransform: "none" }}>
                    {saving ? "Guardando..." : "Guardar conciliación"}
                  </Button>
                )}
              </>
            )}
          </>
        )}

        {tab === 1 && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                size="small" type="date" label="Fecha de corte" InputLabelProps={{ shrink: true }}
                value={asOf} onChange={(e) => setAsOf(e.target.value)} sx={{ width: 180 }}
              />
              <Button variant="outlined" onClick={loadSummary} disabled={loading} sx={{ textTransform: "none" }}>
                {loading ? "Calculando..." : "Calcular"}
              </Button>
              <ReportExportButtons report={buildSummaryReport} disabled={!summary?.accounts?.length} />
            </Stack>
            {loading && <CircularProgress size={22} />}
            {summary && (
              <TableContainer>
                <Table size="small">
                  <TableHead sx={headSx}>
                    <TableRow>
                      <TableCell>Cuenta</TableCell>
                      <TableCell>Auxiliar</TableCell>
                      <TableCell align="right">Libros</TableCell>
                      <TableCell align="right">Auxiliar</TableCell>
                      <TableCell align="right">Partidas conciliatorias</TableCell>
                      <TableCell align="right">Diferencia sin explicar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary.accounts.map((r) => (
                      <TableRow key={r.account.id} hover sx={{ cursor: "pointer" }} onClick={() => openFromSummary(r)}>
                        <TableCell>{`${r.account.muc_code} - ${r.account.account_name}`}</TableCell>
                        <TableCell>{r.unavailable ? "No disponible" : r.kind_label}</TableCell>
                        <TableCell align="right">{money(r.gl_balance)}</TableCell>
                        <TableCell align="right">{r.unavailable ? "—" : money(r.subledger_total)}</TableCell>
                        <TableCell align="right">{r.reconciling_total ? money(r.reconciling_total) : "—"}</TableCell>
                        <TableCell align="right">{r.unavailable ? "—" : <DifferenceChip value={r.difference} label="Dif." />}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Paper>

      {tab === 0 && (
        <Paper elevation={0} sx={paperSx}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>Historial de integraciones y conciliaciones</Typography>
            <ReportExportButtons report={buildHistoryReport} disabled={!history.length} size="small" />
          </Stack>
          <Table size="small">
            <TableHead sx={headSx}>
              <TableRow>
                <TableCell>Fecha de corte</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell align="right">Auxiliar / fuente externa</TableCell>
                <TableCell align="right">Saldo libros</TableCell>
                <TableCell align="right">Diferencia</TableCell>
                <TableCell>Notas</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{String(r.statement_date).slice(0, 10)}</TableCell>
                  <TableCell>{r.source_kind ? "Integración" : "Conciliación manual"}</TableCell>
                  <TableCell align="right">C$ {money(r.external_balance)}</TableCell>
                  <TableCell align="right">C$ {money(r.book_balance)}</TableCell>
                  <TableCell align="right">C$ {money(r.difference)}</TableCell>
                  <TableCell>{r.notes || ""}</TableCell>
                  <TableCell align="right">
                    {r.source_kind && <Button size="small" sx={{ textTransform: "none" }} onClick={() => openSaved(r)}>Ver detalle</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center">{account ? "Sin integraciones ni conciliaciones registradas" : "Elija una cuenta contable"}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={Boolean(savedView)} onClose={() => setSavedView(null)} maxWidth="lg" fullWidth>
        <DialogTitle>{savedView ? `Integración ${savedView.muc_code} al ${dmy(savedView.statement_date)}` : ""}</DialogTitle>
        <DialogContent>
          {savedView?.integration_snapshot && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{savedView.integration_snapshot.kind_label}</Typography>
              <Divider sx={{ mb: 1 }} />
              <IntegrationDetail data={savedViewData} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          {savedViewData && <ReportExportButtons size="small" report={() => buildIntegrationReport(savedViewData)} />}
          <Button onClick={() => setSavedView(null)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
