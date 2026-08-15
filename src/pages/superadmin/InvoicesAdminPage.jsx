import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Chip,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Button,
  Grid,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import PaidIcon from "@mui/icons-material/Paid";
import BlockIcon from "@mui/icons-material/Block";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { toast } from "react-toastify";
import API from "../../api";

const BASE = "/api/superadmin";

const STATUS_OPTIONS = [
  { value: "TODAS", label: "Todas" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "VENCIDA", label: "Vencida" },
  { value: "PAGADA", label: "Pagada" },
  { value: "ANULADA", label: "Anulada" },
];

const statusChip = (eff) => {
  const map = {
    PENDIENTE: { label: "Pendiente", color: "warning" },
    VENCIDA: { label: "Vencida", color: "error" },
    PAGADA: { label: "Pagada", color: "success" },
    ANULADA: { label: "Anulada", color: "default" },
  };
  const c = map[eff] || { label: eff || "-", color: "default" };
  return <Chip size="small" label={c.label} color={c.color} />;
};

const money = (v, currency = "NIO") =>
  `${currency} ${Number(v || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("es-NI") : "-");
const todayISO = () => new Date().toISOString().slice(0, 10);

function SummaryCard({ title, count, amount, color }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderLeft: `4px solid`, borderLeftColor: color }}>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" fontWeight={900}>
        {count}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {amount}
      </Typography>
    </Paper>
  );
}

export default function InvoicesAdminPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);

  const [filters, setFilters] = useState({
    status: "TODAS",
    tenant_id: "",
    from: "",
    to: "",
    search: "",
  });

  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    tenant_id: "",
    amount: "",
    issue_date: todayISO(),
    due_date: todayISO(),
    notes: "",
  });
  const [savingNew, setSavingNew] = useState(false);

  const [payInvoice, setPayInvoice] = useState(null);
  const [payForm, setPayForm] = useState({ paid_date: todayISO(), paid_amount: "", reference: "", notes: "" });
  const [savingPay, setSavingPay] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status && filters.status !== "TODAS") params.status = filters.status;
      if (filters.tenant_id) params.tenant_id = filters.tenant_id;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.search.trim()) params.search = filters.search.trim();
      const res = await API.get(`${BASE}/invoices`, { params });
      setRows(res.data?.data || []);
      setSummary(res.data?.summary || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudieron cargar las facturas");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    API.get(`${BASE}/tenants`)
      .then((res) => setTenants(res.data?.data || []))
      .catch(() => setTenants([]));
  }, []);

  const tenantName = (t) => t.commercial_name || t.legal_name || t.tenant_code || `#${t.id}`;

  const openNew = () => {
    setNewForm({ tenant_id: "", amount: "", issue_date: todayISO(), due_date: todayISO(), notes: "" });
    setNewOpen(true);
  };

  const submitNew = async () => {
    if (!newForm.tenant_id) return toast.warn("Selecciona una empresa");
    if (!newForm.amount || Number(newForm.amount) <= 0) return toast.warn("Monto inválido");
    setSavingNew(true);
    try {
      await API.post(`${BASE}/tenants/${newForm.tenant_id}/invoices`, {
        amount: newForm.amount,
        issue_date: newForm.issue_date,
        due_date: newForm.due_date,
        notes: newForm.notes,
      });
      toast.success("Factura creada");
      setNewOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo crear la factura");
    } finally {
      setSavingNew(false);
    }
  };

  const openPay = (inv) => {
    setPayInvoice(inv);
    setPayForm({ paid_date: todayISO(), paid_amount: inv.amount, reference: inv.invoice_number || "", notes: "" });
  };

  const submitPay = async () => {
    if (!payInvoice) return;
    setSavingPay(true);
    try {
      await API.post(`${BASE}/invoices/${payInvoice.id}/pay`, payForm);
      toast.success("Factura pagada");
      setPayInvoice(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo pagar la factura");
    } finally {
      setSavingPay(false);
    }
  };

  const annul = async (inv) => {
    if (!window.confirm(`¿Anular la factura ${inv.invoice_number}?`)) return;
    try {
      await API.put(`${BASE}/invoices/${inv.id}`, { status: "ANULADA" });
      toast.success("Factura anulada");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo anular la factura");
    }
  };

  const generateMonth = async () => {
    if (!window.confirm("¿Generar las facturas del mes para todas las empresas con cuota configurada?")) return;
    setGenerating(true);
    try {
      const res = await API.post(`${BASE}/invoices/generate`);
      toast.success(res.data?.message || "Facturas generadas");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudieron generar las facturas");
    } finally {
      setGenerating(false);
    }
  };

  const cards = useMemo(() => {
    if (!summary) return [];
    return [
      { title: "Total facturado", count: summary.total_count, amount: money(summary.total_amount), color: "#005EB8" },
      { title: "Pagadas", count: summary.pagadas_count, amount: money(summary.pagadas_amount), color: "#2E7D32" },
      { title: "Pendientes", count: summary.pendientes_count, amount: money(summary.pendientes_amount), color: "#ED6C02" },
      { title: "Vencidas", count: summary.vencidas_count, amount: money(summary.vencidas_amount), color: "#D32F2F" },
    ];
  }, [summary]);

  return (
    <Box>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Facturas
          </Typography>
          <Typography color="text.secondary">Control de cobro a las empresas.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<AutorenewIcon />} onClick={generateMonth} disabled={generating}>
            {generating ? "Generando..." : "Generar facturas del mes"}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            Nueva factura
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {cards.map((c) => (
          <Grid item xs={6} md={3} key={c.title}>
            <SummaryCard {...c} />
          </Grid>
        ))}
      </Grid>

      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }} alignItems="center">
          <TextField select size="small" label="Estado" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} sx={{ minWidth: 140 }}>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Empresa" value={filters.tenant_id} onChange={(e) => setFilters((f) => ({ ...f, tenant_id: e.target.value }))} sx={{ minWidth: 180 }}>
            <MenuItem value="">Todas</MenuItem>
            {tenants.map((t) => (
              <MenuItem key={t.id} value={t.id}>{tenantName(t)}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" type="date" label="Vence desde" InputLabelProps={{ shrink: true }} value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          <TextField size="small" type="date" label="Vence hasta" InputLabelProps={{ shrink: true }} value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          <TextField size="small" label="Buscar" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && load()} sx={{ minWidth: 160 }} />
          <Tooltip title="Actualizar">
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nº Factura</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Emisión</TableCell>
              <TableCell>Vencimiento</TableCell>
              <TableCell align="right">Monto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}><CircularProgress size={26} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: "text.secondary" }}>No hay facturas con estos filtros.</TableCell></TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{r.invoice_number}</TableCell>
                  <TableCell>{r.commercial_name || r.legal_name || `#${r.tenant_id}`}</TableCell>
                  <TableCell>{fmtDate(r.issue_date)}</TableCell>
                  <TableCell>
                    {fmtDate(r.due_date)}
                    {Number(r.days_overdue) > 0 && (
                      <Typography variant="caption" color="error" sx={{ display: "block" }}>
                        {r.days_overdue} día(s) de atraso
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{money(r.amount, r.currency)}</TableCell>
                  <TableCell>{statusChip(r.effective_status)}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      {["PENDIENTE", "VENCIDA"].includes(r.effective_status) && (
                        <>
                          <Tooltip title="Registrar pago">
                            <IconButton size="small" color="success" onClick={() => openPay(r)}>
                              <PaidIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Anular factura">
                            <IconButton size="small" color="error" onClick={() => annul(r)}>
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* NUEVA FACTURA */}
      <Dialog open={newOpen} onClose={() => !savingNew && setNewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Nueva factura</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField select label="Empresa" value={newForm.tenant_id} onChange={(e) => setNewForm((f) => ({ ...f, tenant_id: e.target.value }))} fullWidth required>
              {tenants.map((t) => (
                <MenuItem key={t.id} value={t.id}>{tenantName(t)}</MenuItem>
              ))}
            </TextField>
            <TextField label="Monto" type="number" value={newForm.amount} onChange={(e) => setNewForm((f) => ({ ...f, amount: e.target.value }))} fullWidth required />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Fecha de emisión" type="date" InputLabelProps={{ shrink: true }} value={newForm.issue_date} onChange={(e) => setNewForm((f) => ({ ...f, issue_date: e.target.value }))} fullWidth />
              <TextField label="Fecha de vencimiento" type="date" InputLabelProps={{ shrink: true }} value={newForm.due_date} onChange={(e) => setNewForm((f) => ({ ...f, due_date: e.target.value }))} fullWidth />
            </Stack>
            <TextField label="Notas" value={newForm.notes} onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewOpen(false)} disabled={savingNew}>Cancelar</Button>
          <Button variant="contained" onClick={submitNew} disabled={savingNew}>{savingNew ? "Guardando..." : "Crear factura"}</Button>
        </DialogActions>
      </Dialog>

      {/* PAGAR FACTURA */}
      <Dialog open={!!payInvoice} onClose={() => !savingPay && setPayInvoice(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Registrar pago — {payInvoice?.invoice_number}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label="Fecha de pago" type="date" InputLabelProps={{ shrink: true }} value={payForm.paid_date} onChange={(e) => setPayForm((f) => ({ ...f, paid_date: e.target.value }))} fullWidth />
            <TextField label="Monto pagado" type="number" value={payForm.paid_amount} onChange={(e) => setPayForm((f) => ({ ...f, paid_amount: e.target.value }))} fullWidth helperText={payInvoice ? `Monto de la factura: ${money(payInvoice.amount, payInvoice.currency)}` : ""} />
            <TextField label="Referencia" value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} fullWidth />
            <TextField label="Notas" value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayInvoice(null)} disabled={savingPay}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={submitPay} disabled={savingPay}>{savingPay ? "Guardando..." : "Registrar pago"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
