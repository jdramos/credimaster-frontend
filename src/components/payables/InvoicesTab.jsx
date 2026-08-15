import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Paper, Snackbar, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import PaymentsIcon from "@mui/icons-material/Payments";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PostAddIcon from "@mui/icons-material/PostAdd";
import API from "../../api";
import PaymentDialog from "./PaymentDialog";
import StatementDialog from "./StatementDialog";

const money = (v) => Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateStr = (v) => (v ? String(v).slice(0, 10) : "");
const today = () => new Date().toISOString().slice(0, 10);

const STATUS = { PENDING: ["Pendiente", "warning"], PARTIAL: ["Parcial", "info"], PAID: ["Pagada", "success"], CANCELLED: ["Anulada", "default"] };

const emptyDistLine = () => ({ account: null, branch: null, amount: "" });
const emptyForm = {
  id: null, provider: null, document_number: "", document_date: today(), due_date: "",
  concept: "", amount: "", retention_base: "", retention_code: "", retention_rate: "", retention_amount: "",
  dist: [emptyDistLine()],
};

export default function InvoicesTab() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ count: 0, amount: 0, balance: 0 });
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [codes, setCodes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ provider_id: "", status: "", open: false });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [statement, setStatement] = useState({ open: false, providerId: null });
  const [cn, setCn] = useState({ open: false, invoice: null, amount: "", document_number: "", date: today() });
  const [pmts, setPmts] = useState({ open: false, invoice: null, rows: [] });
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const notify = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchLists = async () => {
    try {
      const [p, c, a, br] = await Promise.all([
        API.get("/api/providers", { params: { active: 1 } }),
        API.get("/api/retentions/codes"),
        API.get("/api/accounting/accounts", { params: { is_active: 1 } }),
        API.get("/api/branches/accessible"),
      ]);
      setProviders(Array.isArray(p.data) ? p.data : p.data?.data || []);
      setCodes(c.data?.data || []);
      const acc = Array.isArray(a.data) ? a.data : a.data?.data || [];
      setAccounts(acc.filter((x) => Number(x.is_movement) === 1));
      setBranches(Array.isArray(br.data) ? br.data : br.data?.data || []);
    } catch (e) { /* opcional */ }
  };

  const fetchRows = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.provider_id) params.provider_id = filters.provider_id;
      if (filters.status) params.status = filters.status;
      if (filters.open) params.open = "1";
      const res = await API.get("/api/payables/invoices", { params });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || { count: 0, amount: 0, balance: 0 });
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando facturas", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLists(); fetchRows(); /* eslint-disable-next-line */ }, []);

  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onPickProvider = (prov) => {
    // Prefill de retención según la config del proveedor.
    let code = form.retention_code, rate = form.retention_rate;
    if (prov && Number(prov.applies_retention) === 1 && prov.retention_code) {
      code = prov.retention_code;
      const c = codes.find((x) => x.code === code);
      rate = c?.default_rate ?? "";
    }
    setForm((p) => ({ ...p, provider: prov, retention_code: code, retention_rate: rate }));
  };

  // La retención se calcula sobre la base imponible (si está vacía, sobre el
  // total). Con IVA, la base es el monto antes de IVA.
  const retentionComputed = useMemo(() => {
    const base = Number(form.retention_base || form.amount || 0), rate = Number(form.retention_rate || 0);
    return Math.round(base * rate) / 100;
  }, [form.retention_base, form.amount, form.retention_rate]);

  // Al cambiar el total, la base sigue al total mientras no se haya editado a
  // mano (evita retenciones sobre una base vieja).
  const onAmountChange = (v) => setForm((p) => ({
    ...p,
    amount: v,
    retention_base: (p.retention_base === "" || p.retention_base === p.amount) ? v : p.retention_base,
  }));

  const openNew = () => { setForm({ ...emptyForm, dist: [emptyDistLine()] }); setOpen(true); };
  const openEdit = async (row) => {
    try {
      const res = await API.get(`/api/payables/invoices/${row.id}`);
      const inv = res.data?.data || row;
      const dist = (inv.lines || []).map((l) => ({
        account: accounts.find((x) => x.id === l.account_id) || null,
        branch: branches.find((b) => b.id === l.branch_id) || null,
        amount: l.amount,
      }));
      setForm({
        id: inv.id, provider: providers.find((p) => p.id === inv.provider_id) || { id: inv.provider_id, name: inv.provider_name },
        document_number: inv.document_number || "", document_date: dateStr(inv.document_date),
        due_date: dateStr(inv.due_date), concept: inv.concept || "", amount: inv.amount,
        retention_base: inv.retention_base ?? "",
        retention_code: inv.retention_code || "", retention_rate: inv.retention_rate ?? "", retention_amount: inv.retention_amount ?? "",
        dist: dist.length ? dist : [emptyDistLine()],
      });
      setOpen(true);
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando factura", "error");
    }
  };

  const setDist = (i, key, val) => setForm((p) => ({ ...p, dist: p.dist.map((d, j) => (j === i ? { ...d, [key]: val } : d)) }));
  const addDist = () => setForm((p) => ({ ...p, dist: [...p.dist, emptyDistLine()] }));
  const removeDist = (i) => setForm((p) => ({ ...p, dist: p.dist.filter((_, j) => j !== i) }));
  const distTotal = useMemo(() => form.dist.reduce((s, d) => s + (Number(d.amount) || 0), 0), [form.dist]);

  const save = async () => {
    if (!form.provider?.id || !form.document_date || !form.amount) {
      notify("Proveedor, fecha y monto son obligatorios", "warning"); return;
    }
    const lines = form.dist
      .filter((d) => d.account && Number(d.amount) > 0)
      .map((d) => ({ account_id: d.account.id, branch_id: d.branch?.id || null, amount: Number(d.amount) }));
    if (!lines.length) { notify("Agregue al menos una línea de distribución del gasto", "warning"); return; }
    if (Math.abs(distTotal - Number(form.amount)) > 0.01) {
      notify(`La distribución (${money(distTotal)}) no cuadra con el monto (${money(form.amount)})`, "warning"); return;
    }
    const payload = {
      provider_id: form.provider.id, document_number: form.document_number || null,
      document_date: form.document_date, due_date: form.due_date || null, concept: form.concept || null,
      lines,
      amount: Number(form.amount),
      retention_base: form.retention_base === "" ? null : Number(form.retention_base),
      retention_code: form.retention_code || null,
      retention_rate: form.retention_rate === "" ? null : Number(form.retention_rate),
      retention_amount: form.retention_amount === "" ? retentionComputed : Number(form.retention_amount),
    };
    try {
      if (form.id) await API.put(`/api/payables/invoices/${form.id}`, payload);
      else await API.post("/api/payables/invoices", payload);
      notify("Factura guardada"); setOpen(false); fetchRows();
    } catch (e) { notify(e.response?.data?.message || "Error guardando", "error"); }
  };

  const cancel = async (id) => {
    if (!window.confirm("¿Anular esta factura?")) return;
    try { await API.put(`/api/payables/invoices/${id}/cancel`); fetchRows(); }
    catch (e) { notify(e.response?.data?.message || "Error", "error"); }
  };

  const openPayments = async (invoice) => {
    try {
      const res = await API.get(`/api/payables/invoices/${invoice.id}/payments`);
      setPmts({ open: true, invoice, rows: res.data?.data || [] });
    } catch (e) { notify(e.response?.data?.message || "Error cargando pagos", "error"); }
  };

  const voidDirectPayment = async (journalEntryId) => {
    if (!window.confirm("¿Anular este pago directo? Se reversará el comprobante y se restaurará el saldo de la factura.")) return;
    try {
      await API.post("/api/payables/payments/void", { journal_entry_id: journalEntryId });
      notify("Pago anulado");
      setPmts((p) => ({ ...p, open: false }));
      fetchRows();
    } catch (e) { notify(e.response?.data?.message || "Error anulando pago", "error"); }
  };

  const voidAdvanceApplication = async (journalEntryId) => {
    if (!window.confirm("¿Anular esta aplicación de anticipo? Se restaura el saldo de la factura y el disponible del anticipo.")) return;
    try {
      await API.post("/api/payables/advances/void-application", { journal_entry_id: journalEntryId });
      notify("Aplicación de anticipo anulada");
      setPmts((p) => ({ ...p, open: false }));
      fetchRows();
    } catch (e) { notify(e.response?.data?.message || "Error", "error"); }
  };

  const voidCreditNote = async (paymentId) => {
    if (!window.confirm("¿Anular esta nota de crédito? Se devuelve el saldo a la factura.")) return;
    try {
      await API.post("/api/payables/credit-notes/void", { payment_id: paymentId });
      notify("Nota de crédito anulada");
      setPmts((p) => ({ ...p, open: false }));
      fetchRows();
    } catch (e) { notify(e.response?.data?.message || "Error", "error"); }
  };

  const saveCreditNote = async () => {
    if (!cn.invoice || !cn.amount) return;
    try {
      await API.post(`/api/payables/invoices/${cn.invoice.id}/credit-note`, {
        amount: Number(cn.amount), document_number: cn.document_number || null, date: cn.date,
      });
      notify("Nota de crédito aplicada");
      setCn({ open: false, invoice: null, amount: "", document_number: "", date: today() });
      fetchRows();
    } catch (e) { notify(e.response?.data?.message || "Error", "error"); }
  };

  const columns = useMemo(() => [
    { field: "provider_name", headerName: "Proveedor", flex: 1, minWidth: 180 },
    { field: "document_number", headerName: "Factura", width: 110, valueGetter: (p) => p.value || "—" },
    { field: "document_date", headerName: "Fecha", width: 105, valueGetter: (p) => dateStr(p.value) },
    { field: "due_date", headerName: "Vence", width: 105, valueGetter: (p) => dateStr(p.value) || "—" },
    { field: "amount", headerName: "Monto", width: 120, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "retention_amount", headerName: "Retención", width: 110, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "balance", headerName: "Saldo", width: 120, type: "number", valueFormatter: (p) => money(p.value) },
    { field: "days_old", headerName: "Días", width: 70, type: "number" },
    {
      field: "status", headerName: "Estado", width: 110,
      renderCell: (p) => { const s = STATUS[p.value] || [p.value, "default"]; return <Chip size="small" color={s[1]} label={s[0]} />; },
    },
    {
      field: "actions", headerName: "", width: 200, sortable: false,
      renderCell: (p) => (
        <Stack direction="row">
          <Tooltip title="Estado de cuenta">
            <IconButton size="small" onClick={() => setStatement({ open: true, providerId: p.row.provider_id })}>
              <ReceiptLongIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {Number(p.row.paid_amount) > 0 && (
            <Tooltip title="Ver pagos">
              <IconButton size="small" onClick={() => openPayments(p.row)}>
                <PaymentsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {p.row.status !== "CANCELLED" && Number(p.row.balance) > 0.009 && (
            <Tooltip title="Nota de crédito">
              <IconButton size="small" color="secondary"
                onClick={() => setCn({ open: true, invoice: p.row, amount: "", document_number: "", date: today() })}>
                <PostAddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {Number(p.row.paid_amount) === 0 && p.row.status !== "CANCELLED" && (
            <>
              <Tooltip title="Editar">
                <IconButton size="small" onClick={() => openEdit(p.row)}><EditIcon fontSize="small" /></IconButton>
              </Tooltip>
              <Tooltip title="Anular">
                <IconButton size="small" color="error" onClick={() => cancel(p.row.id)}><BlockIcon fontSize="small" /></IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      ),
    },
  ], [providers]);

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
        <Autocomplete size="small" options={providers} sx={{ minWidth: 220 }}
          getOptionLabel={(o) => o.name}
          onChange={(_, v) => setFilters((p) => ({ ...p, provider_id: v?.id || "" }))}
          renderInput={(params) => <TextField {...params} label="Proveedor" />} />
        <TextField select size="small" label="Estado" value={filters.status} sx={{ minWidth: 150 }}
          onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="PENDING">Pendientes</MenuItem>
          <MenuItem value="PARTIAL">Parciales</MenuItem>
          <MenuItem value="PAID">Pagadas</MenuItem>
        </TextField>
        <Button variant="outlined" onClick={fetchRows} sx={{ textTransform: "none" }}>Buscar</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<PaymentsIcon />} onClick={() => setPaymentOpen(true)}
          sx={{ textTransform: "none" }}>
          Registrar pago
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
          sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>
          Nueva factura
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        <Chip label={`Facturas: ${summary.count}`} />
        <Chip color="primary" label={`Monto: C$ ${money(summary.amount)}`} />
        <Chip color="warning" label={`Saldo: C$ ${money(summary.balance)}`} />
      </Stack>

      <Box sx={{ height: 540 }}>
        <DataGrid rows={rows} columns={columns} loading={loading} getRowId={(r) => r.id}
          density="compact" pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }} disableRowSelectionOnClick />
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{form.id ? "Editar" : "Nueva"} factura por pagar</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Autocomplete size="small" options={providers} value={form.provider}
              getOptionLabel={(o) => (o.ruc ? `${o.name} (${o.ruc})` : o.name)}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(_, v) => onPickProvider(v)}
              renderInput={(params) => <TextField {...params} label="Proveedor" />} />
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="N° factura" value={form.document_number}
                onChange={(e) => setF("document_number", e.target.value)} sx={{ flex: 1 }} />
              <TextField size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
                value={form.document_date} onChange={(e) => setF("document_date", e.target.value)} />
              <TextField size="small" type="date" label="Vence" InputLabelProps={{ shrink: true }}
                value={form.due_date} onChange={(e) => setF("due_date", e.target.value)} />
            </Stack>
            <TextField size="small" label="Concepto" value={form.concept} onChange={(e) => setF("concept", e.target.value)} />
            <Stack direction="row" spacing={1}>
              <TextField size="small" type="number" label="Monto total (con IVA)" value={form.amount}
                onChange={(e) => onAmountChange(e.target.value)} sx={{ flex: 1 }} />
              <TextField size="small" type="number" label="Base imponible (retención)" value={form.retention_base}
                onChange={(e) => setF("retention_base", e.target.value)} sx={{ flex: 1 }}
                helperText="Antes de IVA" />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField select size="small" label="Retención" value={form.retention_code} sx={{ flex: 1 }}
                onChange={(e) => {
                  const c = codes.find((x) => x.code === e.target.value);
                  setForm((p) => ({ ...p, retention_code: e.target.value, retention_rate: c?.default_rate ?? "" }));
                }}>
                <MenuItem value="">Sin retención</MenuItem>
                {codes.filter((c) => c.default_rate != null).map((c) => (
                  <MenuItem key={c.code} value={c.code}>{c.code} — {c.description} ({c.default_rate}%)</MenuItem>
                ))}
              </TextField>
              {form.retention_code && (
                <Chip color="success" label={`Retención: C$ ${money(retentionComputed)}`} />
              )}
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Distribución del gasto (cuenta / sucursal)</Typography>
              <Stack spacing={1}>
                {form.dist.map((d, i) => (
                  <Stack key={i} direction={{ xs: "column", md: "row" }} spacing={1}>
                    <Autocomplete size="small" options={accounts} value={d.account} sx={{ flex: 2 }}
                      getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      onChange={(_, v) => setDist(i, "account", v)}
                      renderInput={(params) => <TextField {...params} label="Cuenta de gasto" />} />
                    <Autocomplete size="small" options={branches} value={d.branch} sx={{ flex: 1, minWidth: 140 }}
                      getOptionLabel={(o) => o.name}
                      isOptionEqualToValue={(o, v) => o.id === v.id}
                      onChange={(_, v) => setDist(i, "branch", v)}
                      renderInput={(params) => <TextField {...params} label="Sucursal" />} />
                    <TextField size="small" type="number" label="Monto" value={d.amount} sx={{ width: 130 }}
                      onChange={(e) => setDist(i, "amount", e.target.value)} />
                    <IconButton size="small" color="error" onClick={() => removeDist(i)} disabled={form.dist.length === 1}>
                      <BlockIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Button size="small" onClick={addDist} sx={{ textTransform: "none" }}>+ Agregar línea</Button>
                <Box sx={{ flex: 1 }} />
                <Chip size="small"
                  color={Math.abs(distTotal - Number(form.amount || 0)) < 0.01 && distTotal > 0 ? "success" : "warning"}
                  label={`Distribuido: C$ ${money(distTotal)} / Total: C$ ${money(form.amount || 0)}`} />
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={save}
            sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <PaymentDialog open={paymentOpen} onClose={() => setPaymentOpen(false)}
        providers={providers} accounts={accounts} onSaved={fetchRows} notify={notify} />

      <StatementDialog open={statement.open} providerId={statement.providerId}
        onClose={() => setStatement({ open: false, providerId: null })} notify={notify} />

      <Dialog open={pmts.open} onClose={() => setPmts((p) => ({ ...p, open: false }))} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Pagos de la factura {pmts.invoice?.document_number || ""}</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Aquí puedes anular pagos <strong>directos</strong> (efectivo/transferencia), <strong>aplicaciones de anticipo</strong> y <strong>notas de crédito</strong> — se restaura el saldo de la factura. Los pagos por <strong>cheque</strong> se anulan desde Bancos (el saldo se restaura solo).
          </Alert>
          <Stack spacing={1}>
            {pmts.rows.map((r) => {
              const isDirect = !r.bank_check_id && r.journal_entry_id && (r.method === "CASH" || r.method === "TRANSFER");
              const label = { CHECK: "Cheque", CASH: "Efectivo", TRANSFER: "Transferencia", ADVANCE: "Anticipo", CREDIT_NOTE: "Nota de crédito" }[r.method] || r.method;
              return (
                <Stack key={r.id} direction="row" spacing={1} alignItems="center">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{dateStr(r.payment_date)} · {label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      C$ {money(r.amount_applied)}{r.check_number ? ` · cheque ${r.check_number}` : ""}{r.reference ? ` · ${r.reference}` : ""}
                    </Typography>
                  </Box>
                  {isDirect ? (
                    <Button size="small" color="error" onClick={() => voidDirectPayment(r.journal_entry_id)} sx={{ textTransform: "none" }}>
                      Anular
                    </Button>
                  ) : r.method === "ADVANCE" ? (
                    <Button size="small" color="error" onClick={() => voidAdvanceApplication(r.journal_entry_id)} sx={{ textTransform: "none" }}>
                      Anular aplicación
                    </Button>
                  ) : r.method === "CREDIT_NOTE" ? (
                    <Button size="small" color="error" onClick={() => voidCreditNote(r.id)} sx={{ textTransform: "none" }}>
                      Anular nota
                    </Button>
                  ) : (
                    <Chip size="small" variant="outlined" label="Anular en Bancos" />
                  )}
                </Stack>
              );
            })}
            {!pmts.rows.length && <Typography variant="body2" color="text.secondary">Sin pagos.</Typography>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPmts((p) => ({ ...p, open: false }))} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cn.open} onClose={() => setCn((c) => ({ ...c, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Nota de crédito — {cn.invoice?.document_number || ""}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="info">Reduce el saldo por pagar de la factura (sin movimiento de efectivo).</Alert>
            <TextField size="small" type="number" label="Monto" value={cn.amount}
              onChange={(e) => setCn((c) => ({ ...c, amount: e.target.value }))} />
            <TextField size="small" label="N° documento" value={cn.document_number}
              onChange={(e) => setCn((c) => ({ ...c, document_number: e.target.value }))} />
            <TextField size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
              value={cn.date} onChange={(e) => setCn((c) => ({ ...c, date: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCn((c) => ({ ...c, open: false }))} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={saveCreditNote}
            sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" }, textTransform: "none" }}>Aplicar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={4000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
