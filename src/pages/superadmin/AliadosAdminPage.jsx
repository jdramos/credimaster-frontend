import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import PaidIcon from "@mui/icons-material/Paid";
import ReceiptIcon from "@mui/icons-material/Receipt";
import RefreshIcon from "@mui/icons-material/Refresh";
import { toast } from "react-toastify";
import API from "../../api";
import ReportExportButtons from "../../components/common/ReportExportButtons";
import { openReportPopup, printAccountingReport } from "../../components/accounting/printAccountingReport";
import { reportFilters, reportMoney, reportPeriod } from "../../components/common/reportFormat";
import {
  ALIADOS_URL,
  COMMISSION_STATUS,
  COMMISSION_TYPE_OPTIONS,
  PAYMENT_CONCEPT_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  aliadoFormFromRow,
  conceptLabel,
  describeRule,
  effectiveRule,
  emptyAliadoForm,
  fmtAmount,
  isoDate,
  monthRange,
  money,
  paymentMethodLabel,
  todayISO,
  totalsByCurrency,
} from "./aliados";

// Aliados (referidores) del superadmin: catálogo, empresas que trajo cada
// uno, comisiones generadas por los pagos de esas empresas, liquidaciones
// (pago al aliado) y reporte por período. Las comisiones nacen solas al
// registrar el pago de la empresa (Empresas > Facturación o Facturas); aquí
// solo se consultan, se anulan o se liquidan.

const errMsg = (err, fallback) => err?.response?.data?.message || fallback;
const tenantLabel = (r) => r.commercial_name || r.legal_name || r.tenant_code || `#${r.tenant_id}`;
const statusChip = (status) => {
  const c = COMMISSION_STATUS[status] || { label: status, color: "default" };
  return <Chip size="small" label={c.label} color={c.color} />;
};
// Fila de totales del reporte: una sola fila, así que con varias monedas cada
// celda lleva "USD x / NIO y" (texto); con una sola moneda va el número.
const totalCell = (list, field) => ({
  value: list.map((t) => reportMoney(t[field])).join(" / "),
  raw: list.length === 1 ? list[0][field] : undefined,
  numeric: true,
});
const currencyTotals = (list, fields, labelColspan, extraCols = 0) =>
  list.length
    ? [
        { value: `Totales ${list.map((t) => t.currency).join(" / ")}`, colspan: labelColspan },
        ...fields.map((f) => totalCell(list, f)),
        ...(extraCols ? [{ value: "", colspan: extraCols }] : []),
      ]
    : [];

function Toolbar({ children }) {
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, mb: 2 }} alignItems="center">
      {children}
    </Stack>
  );
}

function AliadoSelect({ aliados, value, onChange, label = "Aliado", allLabel = "Todos", sx }) {
  return (
    <TextField select size="small" label={label} value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 200, ...sx }}>
      <MenuItem value="">{allLabel}</MenuItem>
      {aliados.map((a) => (
        <MenuItem key={a.id} value={String(a.id)}>{a.name}{a.status !== "ACTIVE" ? " (inactivo)" : ""}</MenuItem>
      ))}
    </TextField>
  );
}

function ReasonDialog({ open, title, text, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setReason(""); }, [open]);
  const confirm = async () => {
    if (!reason.trim()) return toast.warn("Indique el motivo");
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent dividers>
        {text && <Typography variant="body2" sx={{ mb: 2 }}>{text}</Typography>}
        <TextField label="Motivo" fullWidth required multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} inputProps={{ maxLength: 255 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancelar</Button>
        <Button variant="contained" color="error" onClick={confirm} disabled={busy}>{busy ? "Anulando..." : "Anular"}</Button>
      </DialogActions>
    </Dialog>
  );
}

const LoadingRow = ({ cols }) => (
  <TableRow><TableCell colSpan={cols} align="center" sx={{ py: 5 }}><CircularProgress size={26} /></TableCell></TableRow>
);
const EmptyRow = ({ cols, text }) => (
  <TableRow><TableCell colSpan={cols} align="center" sx={{ py: 5, color: "text.secondary" }}>{text}</TableCell></TableRow>
);

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

function AliadosTab({ aliados, loading, reload }) {
  const [status, setStatus] = useState("ACTIVE");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | row
  const [form, setForm] = useState(emptyAliadoForm);
  const [saving, setSaving] = useState(false);

  const rows = aliados.filter((a) => {
    if (status && a.status !== status) return false;
    const q = search.trim().toLowerCase();
    return !q || [a.name, a.id_number, a.email, a.phone].some((v) => String(v || "").toLowerCase().includes(q));
  });

  const open = (row) => {
    setEditing(row || "new");
    setForm(row ? aliadoFormFromRow(row) : emptyAliadoForm);
  };
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async () => {
    if (!form.name.trim()) return toast.warn("El nombre es requerido");
    if (form.commission_value === "") return toast.warn("Indique la comisión por mensualidad");
    setSaving(true);
    try {
      const payload = {
        ...form,
        commission_value: Number(form.commission_value),
        impl_commission_type: form.impl_commission_type || null,
        impl_commission_value: form.impl_commission_type ? form.impl_commission_value : null,
      };
      if (editing === "new") await API.post(ALIADOS_URL, payload);
      else await API.put(`${ALIADOS_URL}/${editing.id}`, payload);
      toast.success(editing === "new" ? "Aliado creado" : "Aliado actualizado");
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(errMsg(err, "No se pudo guardar el aliado"));
    } finally {
      setSaving(false);
    }
  };

  const buildReport = () => ({
    title: "Catálogo de aliados",
    subtitle: reportFilters([["Estado", status === "ACTIVE" ? "Activos" : status === "INACTIVE" ? "Inactivos" : "Todos"], ["Búsqueda", search.trim()]]),
    fileName: "aliados",
    orientation: "landscape",
    columns: [
      { field: "name", label: "Aliado" },
      { field: "id_number", label: "Cédula / RUC" },
      { field: "phone", label: "Teléfono" },
      { field: "email", label: "Correo" },
      { label: "Forma de pago", value: (r) => paymentMethodLabel(r.payment_method) },
      { label: "Cuenta", value: (r) => [r.bank_name, r.bank_account, r.bank_account_currency, r.bank_account_holder].filter(Boolean).join(" · ") },
      { label: "Comisión mensualidad", value: (r) => describeRule(r.commission_type, r.commission_value) },
      { label: "Comisión implementación", value: (r) => describeRule(r.impl_commission_type, r.impl_commission_value) },
      { field: "active_tenants", label: "Empresas activas", numeric: true },
      { label: "Pendiente de pago", value: (r) => r.pending_by_currency.map((p) => money(p.amount, p.currency)).join(" / ") || "—" },
      { label: "Estado", value: (r) => (r.status === "ACTIVE" ? "Activo" : "Inactivo") },
    ],
    rows,
  });

  return (
    <>
      <Toolbar>
        <TextField select size="small" label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="ACTIVE">Activos</MenuItem>
          <MenuItem value="INACTIVE">Inactivos</MenuItem>
        </TextField>
        <TextField size="small" label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nombre, cédula, correo" />
        <Box sx={{ flexGrow: 1 }} />
        <ReportExportButtons report={buildReport} disabled={!rows.length} size="small" />
        <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => open(null)} sx={{ textTransform: "none" }}>Nuevo aliado</Button>
      </Toolbar>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Aliado</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell>Pago al aliado</TableCell>
              <TableCell>Comisión mensualidad</TableCell>
              <TableCell>Comisión implementación</TableCell>
              <TableCell align="right">Empresas activas</TableCell>
              <TableCell align="right">Pendiente</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow cols={9} /> : !rows.length ? <EmptyRow cols={9} text="No hay aliados con estos filtros." /> : rows.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell>
                  <Typography fontWeight={700} variant="body2">{a.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{a.id_number || "Sin cédula/RUC"}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{a.phone || "—"}</Typography>
                  <Typography variant="caption" color="text.secondary">{a.email || ""}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{paymentMethodLabel(a.payment_method)}</Typography>
                  <Typography variant="caption" color="text.secondary">{[a.bank_name, a.bank_account, a.bank_account_currency].filter(Boolean).join(" · ")}</Typography>
                </TableCell>
                <TableCell>{describeRule(a.commission_type, a.commission_value)}</TableCell>
                <TableCell>{describeRule(a.impl_commission_type, a.impl_commission_value)}</TableCell>
                <TableCell align="right">{a.active_tenants}</TableCell>
                <TableCell align="right">{a.pending_by_currency.map((p) => money(p.amount, p.currency)).join(" / ") || "—"}</TableCell>
                <TableCell><Chip size="small" label={a.status === "ACTIVE" ? "Activo" : "Inactivo"} color={a.status === "ACTIVE" ? "success" : "default"} /></TableCell>
                <TableCell align="center">
                  <Tooltip title="Editar"><IconButton size="small" onClick={() => open(a)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!editing} onClose={() => !saving && setEditing(null)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800 }}>{editing === "new" ? "Nuevo aliado" : `Editar aliado — ${editing?.name || ""}`}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}><TextField label="Nombre o razón social" fullWidth size="small" required value={form.name} onChange={set("name")} /></Grid>
            <Grid item xs={6} md={3}><TextField label="Cédula / RUC" fullWidth size="small" value={form.id_number} onChange={set("id_number")} /></Grid>
            <Grid item xs={6} md={3}>
              <TextField select label="Estado" fullWidth size="small" value={form.status} onChange={set("status")}>
                <MenuItem value="ACTIVE">Activo</MenuItem>
                <MenuItem value="INACTIVE">Inactivo (no genera comisiones)</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}><TextField label="Teléfono" fullWidth size="small" value={form.phone} onChange={set("phone")} /></Grid>
            <Grid item xs={6} md={5}><TextField label="Correo" fullWidth size="small" value={form.email} onChange={set("email")} /></Grid>
            <Grid item xs={12}><Typography variant="subtitle2" fontWeight={800} sx={{ mt: 1 }}>Cómo se le paga</Typography></Grid>
            <Grid item xs={6} md={3}>
              <TextField select label="Forma de pago" fullWidth size="small" value={form.payment_method} onChange={set("payment_method")}>
                {PAYMENT_METHOD_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}><TextField label="Banco" fullWidth size="small" value={form.bank_name} onChange={set("bank_name")} /></Grid>
            <Grid item xs={6} md={3}><TextField label="Nº de cuenta" fullWidth size="small" value={form.bank_account} onChange={set("bank_account")} /></Grid>
            <Grid item xs={6} md={3}><TextField label="Moneda de la cuenta" fullWidth size="small" value={form.bank_account_currency} onChange={set("bank_account_currency")} placeholder="USD / NIO" /></Grid>
            <Grid item xs={12} md={6}><TextField label="Titular de la cuenta" fullWidth size="small" value={form.bank_account_holder} onChange={set("bank_account_holder")} /></Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 1 }}>Comisión por defecto</Typography>
              <Typography variant="caption" color="text.secondary">
                Se puede cambiar por empresa en Empresas → Editar. El monto fijo es por mensualidad y se prorratea si la empresa paga parcial; va en la moneda en que paga la empresa.
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField select label="Mensualidad: tipo" fullWidth size="small" value={form.commission_type} onChange={set("commission_type")}>
                {COMMISSION_TYPE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField label={form.commission_type === "PERCENT" ? "Mensualidad: %" : "Mensualidad: monto"} type="number" fullWidth size="small" required value={form.commission_value} onChange={set("commission_value")} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField select label="Implementación: tipo" fullWidth size="small" InputLabelProps={{ shrink: true }} SelectProps={{ displayEmpty: true }} value={form.impl_commission_type} onChange={set("impl_commission_type")}>
                <MenuItem value="">Sin comisión</MenuItem>
                {COMMISSION_TYPE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField label={form.impl_commission_type === "PERCENT" ? "Implementación: %" : "Implementación: monto"} type="number" fullWidth size="small"
                value={form.impl_commission_value} onChange={set("impl_commission_value")} disabled={!form.impl_commission_type}
                helperText={form.impl_commission_type === "FIXED" ? "Tope total; se prorratea sobre el monto de implementación" : ""} />
            </Grid>
            <Grid item xs={12}><TextField label="Notas" fullWidth size="small" multiline minRows={2} value={form.notes} onChange={set("notes")} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Empresas por aliado
// ---------------------------------------------------------------------------

function AssignmentsTab({ aliados }) {
  const [aliadoId, setAliadoId] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`${ALIADOS_URL}/assignments`, { params: { aliado_id: aliadoId || undefined, status: status || undefined } });
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(errMsg(err, "No se pudieron cargar las empresas"));
    } finally {
      setLoading(false);
    }
  }, [aliadoId, status]);
  useEffect(() => { load(); }, [load]);

  const flat = useMemo(
    () => rows.flatMap((r) => (r.totals.length ? r.totals : [{ currency: r.tenant_currency, accrued: 0, paid: 0, pending: 0 }]).map((t, i) => ({ ...r, ...t, first: i === 0 }))),
    [rows],
  );
  const totals = totalsByCurrency(flat, ["accrued", "paid", "pending"]);

  const buildReport = () => ({
    title: "Empresas por aliado",
    subtitle: reportFilters([["Aliado", aliados.find((a) => String(a.id) === aliadoId)?.name], ["Estado", status === "ACTIVE" ? "Vigentes" : status === "ENDED" ? "Terminadas" : "Todas"]]),
    fileName: "aliados_empresas",
    orientation: "landscape",
    columns: [
      { field: "aliado_name", label: "Aliado" },
      { label: "Empresa", value: (r) => `${r.tenant_code} - ${tenantLabel(r)}` },
      { label: "Desde", value: (r) => isoDate(r.start_date) },
      { label: "Hasta", value: (r) => isoDate(r.effective_end_date) || "Sin límite" },
      { label: "Comisión mensualidad", value: (r) => `${effectiveRule(r).text}${effectiveRule(r).own ? " (propia)" : ""}` },
      { label: "Comisión implementación", value: (r) => `${effectiveRule(r, "impl").text}${effectiveRule(r, "impl").own ? " (propia)" : ""}` },
      { label: "Estado", value: (r) => (r.status === "ACTIVE" ? "Vigente" : "Terminada") },
      { field: "currency", label: "Moneda" },
      { field: "accrued", label: "Devengado", numeric: true, format: reportMoney },
      { field: "paid", label: "Pagado", numeric: true, format: reportMoney },
      { field: "pending", label: "Pendiente", numeric: true, format: reportMoney },
    ],
    rows: flat,
    totals: currencyTotals(totals, ["accrued", "paid", "pending"], 8),
  });

  return (
    <>
      <Toolbar>
        <AliadoSelect aliados={aliados} value={aliadoId} onChange={setAliadoId} />
        <TextField select size="small" label="Estado" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="ACTIVE">Vigentes</MenuItem>
          <MenuItem value="ENDED">Terminadas</MenuItem>
        </TextField>
        <Button size="small" startIcon={<RefreshIcon />} onClick={load} sx={{ textTransform: "none" }}>Actualizar</Button>
        <Box sx={{ flexGrow: 1 }} />
        <ReportExportButtons report={buildReport} disabled={!flat.length} size="small" />
      </Toolbar>
      <Alert severity="info" sx={{ mb: 2 }}>El aliado de cada empresa se asigna o cambia en Empresas → Nueva / Editar.</Alert>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Aliado</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Vigencia</TableCell>
              <TableCell>Comisión</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Devengado</TableCell>
              <TableCell align="right">Pagado</TableCell>
              <TableCell align="right">Pendiente</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow cols={8} /> : !flat.length ? <EmptyRow cols={8} text="No hay empresas asignadas con estos filtros." /> : flat.map((r) => (
              <TableRow key={`${r.id}-${r.currency}`} hover>
                <TableCell>{r.first ? r.aliado_name : ""}</TableCell>
                <TableCell>{r.first ? <><b>{r.tenant_code}</b> — {tenantLabel(r)}</> : ""}</TableCell>
                <TableCell>{r.first ? `${isoDate(r.start_date)} → ${isoDate(r.effective_end_date) || "sin límite"}` : ""}</TableCell>
                <TableCell>
                  {r.first && (
                    <Typography variant="body2">
                      Mens.: {effectiveRule(r).text}{effectiveRule(r).own ? " (propia)" : ""}
                      <br />Impl.: {effectiveRule(r, "impl").text}{effectiveRule(r, "impl").own ? " (propia)" : ""}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{r.first && <Chip size="small" label={r.status === "ACTIVE" ? "Vigente" : "Terminada"} color={r.status === "ACTIVE" ? "success" : "default"} />}</TableCell>
                <TableCell align="right">{money(r.accrued, r.currency)}</TableCell>
                <TableCell align="right">{money(r.paid, r.currency)}</TableCell>
                <TableCell align="right">{money(r.pending, r.currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Comisiones (+ liquidar)
// ---------------------------------------------------------------------------

function CommissionsTab({ aliados, tenants, onSettled }) {
  const [filters, setFilters] = useState({ aliado_id: "", tenant_id: "", status: "PENDIENTE", concept: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [voiding, setVoiding] = useState(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleForm, setSettleForm] = useState({ settlement_date: todayISO(), payment_method: "TRANSFERENCIA", reference: "", receipt_number: "", notes: "" });
  const [settling, setSettling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await API.get(`${ALIADOS_URL}/commissions`, { params });
      setRows(res.data?.data || []);
      setSelected([]);
    } catch (err) {
      toast.error(errMsg(err, "No se pudieron cargar las comisiones"));
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  const setF = (k) => (v) => setFilters((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));
  const pendingRows = rows.filter((r) => r.status === "PENDIENTE");
  const picked = rows.filter((r) => selected.includes(r.id));
  const pickedAliados = new Set(picked.map((r) => r.aliado_id));
  const pickedCurrencies = new Set(picked.map((r) => r.currency));
  const canSettle = picked.length > 0 && pickedAliados.size === 1 && pickedCurrencies.size === 1;
  const pickedTotal = Math.round(picked.reduce((s, r) => s + Number(r.amount), 0) * 100) / 100;

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected((s) => (s.length === pendingRows.length ? [] : pendingRows.map((r) => r.id)));

  const voidCommission = async (reason) => {
    try {
      await API.post(`${ALIADOS_URL}/commissions/${voiding.id}/void`, { reason });
      toast.success("Comisión anulada");
      setVoiding(null);
      load();
    } catch (err) {
      toast.error(errMsg(err, "No se pudo anular la comisión"));
    }
  };

  const settle = async () => {
    if (!settleForm.settlement_date) return toast.warn("Indique la fecha de pago");
    setSettling(true);
    try {
      const res = await API.post(`${ALIADOS_URL}/settlements`, { ...settleForm, aliado_id: picked[0].aliado_id, commission_ids: selected });
      toast.success(res.data?.message || "Liquidación registrada");
      setSettleOpen(false);
      load();
      onSettled?.();
    } catch (err) {
      toast.error(errMsg(err, "No se pudo registrar la liquidación"));
    } finally {
      setSettling(false);
    }
  };

  const totals = totalsByCurrency(rows.filter((r) => r.status !== "ANULADA"), ["payment_amount", "amount"]);
  const buildReport = () => ({
    title: "Comisiones de aliados",
    subtitle: reportFilters([
      ["Aliado", aliados.find((a) => String(a.id) === filters.aliado_id)?.name],
      ["Empresa", tenants.find((t) => String(t.id) === filters.tenant_id)?.legal_name],
      ["Estado", filters.status && COMMISSION_STATUS[filters.status]?.label],
      ["Concepto", filters.concept && conceptLabel(filters.concept)],
    ]),
    period: reportPeriod(filters.from, filters.to),
    fileName: "aliados_comisiones",
    orientation: "landscape",
    columns: [
      { label: "Fecha pago", value: (r) => isoDate(r.payment_date) },
      { field: "aliado_name", label: "Aliado" },
      { label: "Empresa", value: (r) => `${r.tenant_code} - ${tenantLabel(r)}` },
      { label: "Concepto", value: (r) => conceptLabel(r.concept) },
      { field: "currency", label: "Moneda" },
      { field: "payment_amount", label: "Pago de la empresa", numeric: true, format: reportMoney },
      { label: "Regla", value: (r) => describeRule(r.commission_type, r.commission_value) },
      { field: "amount", label: "Comisión", numeric: true, format: reportMoney },
      { label: "Estado", value: (r) => COMMISSION_STATUS[r.status]?.label || r.status },
      { label: "Liquidación", value: (r) => r.settlement_number || (r.status === "ANULADA" ? r.void_reason : "") },
    ],
    rows,
    totals: totals.length
      ? [
          { value: `Totales sin anuladas ${totals.map((t) => t.currency).join(" / ")}`, colspan: 5 },
          totalCell(totals, "payment_amount"),
          { value: "" },
          totalCell(totals, "amount"),
          { value: "", colspan: 2 },
        ]
      : [],
  });

  return (
    <>
      <Toolbar>
        <AliadoSelect aliados={aliados} value={filters.aliado_id} onChange={setF("aliado_id")} />
        <TextField select size="small" label="Empresa" value={filters.tenant_id} onChange={setF("tenant_id")} sx={{ minWidth: 200 }}>
          <MenuItem value="">Todas</MenuItem>
          {tenants.map((t) => <MenuItem key={t.id} value={String(t.id)}>{t.tenant_code} — {t.commercial_name || t.legal_name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Estado" value={filters.status} onChange={setF("status")} sx={{ minWidth: 130 }}>
          <MenuItem value="">Todas</MenuItem>
          {Object.entries(COMMISSION_STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Concepto" value={filters.concept} onChange={setF("concept")} sx={{ minWidth: 150 }}>
          <MenuItem value="">Todos</MenuItem>
          {PAYMENT_CONCEPT_OPTIONS.filter((o) => o.value !== "OTRO").map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="Pago desde" InputLabelProps={{ shrink: true }} value={filters.from} onChange={setF("from")} />
        <TextField size="small" type="date" label="Pago hasta" InputLabelProps={{ shrink: true }} value={filters.to} onChange={setF("to")} />
        <Box sx={{ flexGrow: 1 }} />
        <ReportExportButtons report={buildReport} disabled={!rows.length} size="small" />
        <Tooltip title={picked.length && !canSettle ? "Seleccione comisiones de un solo aliado y una sola moneda" : ""}>
          <span>
            <Button variant="contained" size="small" color="success" startIcon={<PaidIcon />} disabled={!canSettle} onClick={() => setSettleOpen(true)} sx={{ textTransform: "none" }}>
              Liquidar seleccionadas{picked.length ? ` (${picked.length})` : ""}
            </Button>
          </span>
        </Tooltip>
      </Toolbar>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox size="small" disabled={!pendingRows.length} checked={!!pendingRows.length && selected.length === pendingRows.length}
                  indeterminate={selected.length > 0 && selected.length < pendingRows.length} onChange={toggleAll} />
              </TableCell>
              <TableCell>Fecha pago</TableCell>
              <TableCell>Aliado</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Concepto</TableCell>
              <TableCell align="right">Pago empresa</TableCell>
              <TableCell>Regla</TableCell>
              <TableCell align="right">Comisión</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow cols={10} /> : !rows.length ? <EmptyRow cols={10} text="No hay comisiones con estos filtros." /> : rows.map((r) => (
              <TableRow key={r.id} hover selected={selected.includes(r.id)}>
                <TableCell padding="checkbox">
                  <Checkbox size="small" disabled={r.status !== "PENDIENTE"} checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                </TableCell>
                <TableCell>{isoDate(r.payment_date)}</TableCell>
                <TableCell>{r.aliado_name}</TableCell>
                <TableCell><b>{r.tenant_code}</b> — {tenantLabel(r)}</TableCell>
                <TableCell>{conceptLabel(r.concept)}</TableCell>
                <TableCell align="right">{money(r.payment_amount, r.currency)}</TableCell>
                <TableCell>
                  {describeRule(r.commission_type, r.commission_value)}
                  {r.commission_type === "FIXED" && r.units != null && Number(r.units) !== 1 && (
                    <Typography variant="caption" color="text.secondary" component="div">× {Number(r.units).toLocaleString("es-NI", { maximumFractionDigits: 4 })}</Typography>
                  )}
                </TableCell>
                <TableCell align="right"><b>{money(r.amount, r.currency)}</b></TableCell>
                <TableCell>
                  {statusChip(r.status)}
                  {r.settlement_number && <Typography variant="caption" color="text.secondary" component="div">{r.settlement_number}</Typography>}
                  {r.status === "ANULADA" && <Typography variant="caption" color="text.secondary" component="div">{r.void_reason}</Typography>}
                </TableCell>
                <TableCell align="center">
                  {r.status === "PENDIENTE" && (
                    <Tooltip title="Anular comisión"><IconButton size="small" color="error" onClick={() => setVoiding(r)}><BlockIcon fontSize="small" /></IconButton></Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ReasonDialog open={!!voiding} title="Anular comisión" onClose={() => setVoiding(null)} onConfirm={voidCommission}
        text={voiding ? `${voiding.aliado_name} · ${tenantLabel(voiding)} · ${money(voiding.amount, voiding.currency)}. La comisión queda anulada (no se borra) y no se puede liquidar.` : ""} />

      <Dialog open={settleOpen} onClose={() => !settling && setSettleOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Liquidar comisiones — {picked[0]?.aliado_name}</DialogTitle>
        <DialogContent dividers>
          <Alert severity="success" sx={{ mb: 2 }}>
            {picked.length} comisión(es) por {money(pickedTotal, picked[0]?.currency)}
          </Alert>
          <Grid container spacing={1.5}>
            <Grid item xs={6}>
              <TextField label="Fecha de pago" type="date" fullWidth size="small" InputLabelProps={{ shrink: true }} value={settleForm.settlement_date}
                onChange={(e) => setSettleForm((f) => ({ ...f, settlement_date: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField select label="Forma de pago" fullWidth size="small" value={settleForm.payment_method} onChange={(e) => setSettleForm((f) => ({ ...f, payment_method: e.target.value }))}>
                {PAYMENT_METHOD_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField label="Referencia (transferencia / cheque)" fullWidth size="small" value={settleForm.reference} onChange={(e) => setSettleForm((f) => ({ ...f, reference: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Nº de comprobante" fullWidth size="small" value={settleForm.receipt_number} onChange={(e) => setSettleForm((f) => ({ ...f, receipt_number: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notas" fullWidth size="small" multiline minRows={2} value={settleForm.notes} onChange={(e) => setSettleForm((f) => ({ ...f, notes: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettleOpen(false)} disabled={settling}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={settle} disabled={settling}>{settling ? "Registrando..." : "Registrar pago al aliado"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Liquidaciones
// ---------------------------------------------------------------------------

export const buildSettlementReceipt = (s) => ({
  title: `Comprobante de liquidación ${s.settlement_number}`,
  subtitle: [
    `Aliado: ${s.aliado_name}${s.aliado_id_number ? ` (${s.aliado_id_number})` : ""}`,
    `Pago: ${paymentMethodLabel(s.payment_method)}${s.reference ? ` · Ref. ${s.reference}` : ""}${s.receipt_number ? ` · Comprobante ${s.receipt_number}` : ""}`,
    [s.bank_name, s.bank_account, s.bank_account_holder].filter(Boolean).join(" · "),
    s.status === "ANULADA" ? `ANULADA: ${s.void_reason || ""}` : "",
  ].filter(Boolean).join(" | "),
  period: `Pagado el ${isoDate(s.settlement_date)}`,
  fileName: `liquidacion_${s.settlement_number}`,
  columns: [
    { label: "Fecha pago empresa", value: (r) => isoDate(r.payment_date) },
    { label: "Empresa", value: (r) => `${r.tenant_code} - ${tenantLabel(r)}` },
    { label: "Concepto", value: (r) => conceptLabel(r.concept) },
    { field: "payment_amount", label: "Pago de la empresa", numeric: true, format: reportMoney },
    { label: "Regla", value: (r) => describeRule(r.commission_type, r.commission_value) },
    { field: "settled_amount", label: `Comisión (${s.currency})`, numeric: true, format: reportMoney },
  ],
  rows: s.items || [],
  totals: [
    { value: `Total pagado ${s.currency}`, colspan: 5 },
    { value: reportMoney(s.total_amount), raw: s.total_amount, numeric: true },
  ],
});

function SettlementsTab({ aliados, refreshKey }) {
  const [filters, setFilters] = useState({ aliado_id: "", status: "", from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voiding, setVoiding] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await API.get(`${ALIADOS_URL}/settlements`, { params });
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(errMsg(err, "No se pudieron cargar las liquidaciones"));
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const setF = (k) => (v) => setFilters((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  // La ventana se abre en el clic (si no, el navegador la bloquea tras el await).
  const printReceipt = async (s) => {
    const popup = openReportPopup();
    if (!popup) return toast.error("El navegador bloqueó la ventana de impresión");
    try {
      const res = await API.get(`${ALIADOS_URL}/settlements/${s.id}`);
      await printAccountingReport({ ...buildSettlementReceipt(res.data.data), popup });
    } catch (err) {
      popup.close();
      toast.error(errMsg(err, "No se pudo generar el comprobante"));
    }
  };

  const voidSettlement = async (reason) => {
    try {
      await API.post(`${ALIADOS_URL}/settlements/${voiding.id}/void`, { reason });
      toast.success("Liquidación anulada; sus comisiones vuelven a pendiente");
      setVoiding(null);
      load();
    } catch (err) {
      toast.error(errMsg(err, "No se pudo anular la liquidación"));
    }
  };

  const totals = totalsByCurrency(rows.filter((r) => r.status === "PAGADA"), ["total_amount"]);
  const buildReport = () => ({
    title: "Liquidaciones a aliados",
    subtitle: reportFilters([["Aliado", aliados.find((a) => String(a.id) === filters.aliado_id)?.name], ["Estado", filters.status === "PAGADA" ? "Vigentes" : filters.status === "ANULADA" ? "Anuladas" : ""]]),
    period: reportPeriod(filters.from, filters.to),
    fileName: "aliados_liquidaciones",
    orientation: "landscape",
    columns: [
      { field: "settlement_number", label: "Nº" },
      { label: "Fecha", value: (r) => isoDate(r.settlement_date) },
      { field: "aliado_name", label: "Aliado" },
      { label: "Forma de pago", value: (r) => paymentMethodLabel(r.payment_method) },
      { field: "reference", label: "Referencia" },
      { field: "receipt_number", label: "Comprobante" },
      { field: "items_count", label: "Comisiones", numeric: true },
      { field: "currency", label: "Moneda" },
      { field: "total_amount", label: "Total", numeric: true, format: reportMoney },
      { label: "Estado", value: (r) => (r.status === "PAGADA" ? "Pagada" : `Anulada: ${r.void_reason || ""}`) },
    ],
    rows,
    totals: currencyTotals(totals, ["total_amount"], 8, 1),
  });

  return (
    <>
      <Toolbar>
        <AliadoSelect aliados={aliados} value={filters.aliado_id} onChange={setF("aliado_id")} />
        <TextField select size="small" label="Estado" value={filters.status} onChange={setF("status")} sx={{ minWidth: 130 }}>
          <MenuItem value="">Todas</MenuItem>
          <MenuItem value="PAGADA">Vigentes</MenuItem>
          <MenuItem value="ANULADA">Anuladas</MenuItem>
        </TextField>
        <TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }} value={filters.from} onChange={setF("from")} />
        <TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={filters.to} onChange={setF("to")} />
        <Box sx={{ flexGrow: 1 }} />
        <ReportExportButtons report={buildReport} disabled={!rows.length} size="small" />
      </Toolbar>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nº</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Aliado</TableCell>
              <TableCell>Pago</TableCell>
              <TableCell align="right">Comisiones</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow cols={8} /> : !rows.length ? <EmptyRow cols={8} text="No hay liquidaciones con estos filtros." /> : rows.map((s) => (
              <TableRow key={s.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{s.settlement_number}</TableCell>
                <TableCell>{isoDate(s.settlement_date)}</TableCell>
                <TableCell>{s.aliado_name}</TableCell>
                <TableCell>
                  <Typography variant="body2">{paymentMethodLabel(s.payment_method)}{s.reference ? ` · ${s.reference}` : ""}</Typography>
                  {s.receipt_number && <Typography variant="caption" color="text.secondary">Comprobante {s.receipt_number}</Typography>}
                </TableCell>
                <TableCell align="right">{s.items_count}</TableCell>
                <TableCell align="right"><b>{money(s.total_amount, s.currency)}</b></TableCell>
                <TableCell>
                  <Chip size="small" label={s.status === "PAGADA" ? "Pagada" : "Anulada"} color={s.status === "PAGADA" ? "success" : "default"} />
                  {s.status === "ANULADA" && <Typography variant="caption" color="text.secondary" component="div">{s.void_reason}</Typography>}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Imprimir comprobante"><IconButton size="small" onClick={() => printReceipt(s)}><ReceiptIcon fontSize="small" /></IconButton></Tooltip>
                  {s.status === "PAGADA" && (
                    <Tooltip title="Anular liquidación"><IconButton size="small" color="error" onClick={() => setVoiding(s)}><BlockIcon fontSize="small" /></IconButton></Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <ReasonDialog open={!!voiding} title={`Anular liquidación ${voiding?.settlement_number || ""}`} onClose={() => setVoiding(null)} onConfirm={voidSettlement}
        text="La liquidación queda anulada (no se borra) y sus comisiones vuelven a pendiente para liquidarse de nuevo." />
    </>
  );
}

// ---------------------------------------------------------------------------
// Reporte por aliado y período
// ---------------------------------------------------------------------------

function ReportTab({ aliados }) {
  const [filters, setFilters] = useState(() => ({ ...monthRange(), aliado_id: "" }));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!filters.from || !filters.to) return;
    setLoading(true);
    try {
      const res = await API.get(`${ALIADOS_URL}/report`, { params: { from: filters.from, to: filters.to, aliado_id: filters.aliado_id || undefined } });
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(errMsg(err, "No se pudo generar el reporte"));
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  const setF = (k) => (v) => setFilters((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));
  const FIELDS = ["accrued", "paid", "pending", "settled_in_period", "pending_balance"];
  const totals = totalsByCurrency(rows, FIELDS);

  const buildReport = () => ({
    title: "Comisiones por aliado",
    subtitle: reportFilters([["Aliado", aliados.find((a) => String(a.id) === filters.aliado_id)?.name]]),
    period: reportPeriod(filters.from, filters.to),
    fileName: `aliados_comisiones_${filters.from}_${filters.to}`,
    orientation: "landscape",
    columns: [
      { field: "aliado_name", label: "Aliado" },
      { field: "aliado_id_number", label: "Cédula / RUC" },
      { field: "currency", label: "Moneda" },
      { field: "tenants_count", label: "Empresas con pagos", numeric: true },
      { field: "accrued", label: "Devengado", numeric: true, format: reportMoney },
      { field: "paid", label: "Pagado", numeric: true, format: reportMoney },
      { field: "pending", label: "Pendiente", numeric: true, format: reportMoney },
      { field: "settled_in_period", label: "Liquidado en el período", numeric: true, format: reportMoney },
      { field: "pending_balance", label: "Saldo pendiente total", numeric: true, format: reportMoney },
    ],
    rows,
    totals: currencyTotals(totals, FIELDS, 4),
  });

  return (
    <>
      <Toolbar>
        <TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }} value={filters.from} onChange={setF("from")} />
        <TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={filters.to} onChange={setF("to")} />
        <AliadoSelect aliados={aliados} value={filters.aliado_id} onChange={setF("aliado_id")} />
        <Button size="small" startIcon={<RefreshIcon />} onClick={load} sx={{ textTransform: "none" }}>Actualizar</Button>
        <Box sx={{ flexGrow: 1 }} />
        <ReportExportButtons report={buildReport} disabled={!rows.length} size="small" />
      </Toolbar>
      <Alert severity="info" sx={{ mb: 2 }}>
        Devengado, pagado y pendiente: comisiones de los pagos de las empresas con fecha en el período (sin anuladas).
        Liquidado: lo pagado a los aliados en el período. Saldo pendiente total: todo lo que se les debe hoy, de cualquier fecha.
      </Alert>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Aliado</TableCell>
              <TableCell>Moneda</TableCell>
              <TableCell align="right">Empresas</TableCell>
              <TableCell align="right">Devengado</TableCell>
              <TableCell align="right">Pagado</TableCell>
              <TableCell align="right">Pendiente</TableCell>
              <TableCell align="right">Liquidado en el período</TableCell>
              <TableCell align="right">Saldo pendiente total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow cols={8} /> : !rows.length ? <EmptyRow cols={8} text="Sin comisiones ni liquidaciones en el período." /> : (
              <>
                {rows.map((r) => (
                  <TableRow key={`${r.aliado_id}-${r.currency}`} hover>
                    <TableCell>{r.aliado_name}</TableCell>
                    <TableCell>{r.currency}</TableCell>
                    <TableCell align="right">{r.tenants_count}</TableCell>
                    {FIELDS.map((f) => <TableCell key={f} align="right">{fmtAmount(r[f])}</TableCell>)}
                  </TableRow>
                ))}
                {totals.map((t) => (
                  <TableRow key={`total-${t.currency}`} sx={{ "& td": { fontWeight: 800, bgcolor: "action.hover" } }}>
                    <TableCell colSpan={3}>Total {t.currency}</TableCell>
                    {FIELDS.map((f) => <TableCell key={f} align="right">{fmtAmount(t[f])}</TableCell>)}
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

// ---------------------------------------------------------------------------

const TABS = [
  { key: "aliados", label: "Aliados" },
  { key: "empresas", label: "Empresas por aliado" },
  { key: "comisiones", label: "Comisiones" },
  { key: "liquidaciones", label: "Liquidaciones" },
  { key: "reporte", label: "Reporte por período" },
];

export default function AliadosAdminPage() {
  const [tab, setTab] = useState("aliados");
  const [aliados, setAliados] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [settledKey, setSettledKey] = useState(0);

  const loadAliados = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(ALIADOS_URL);
      setAliados(res.data?.data || []);
      setUnavailable(false);
    } catch (err) {
      setUnavailable(true);
      toast.error(errMsg(err, "No se pudieron cargar los aliados"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAliados();
    API.get("/api/superadmin/tenants")
      .then((res) => setTenants(res.data?.data || []))
      .catch(() => setTenants([]));
  }, [loadAliados]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={900}>Aliados</Typography>
          <Typography variant="body2" color="text.secondary">
            Quienes traen empresas y ganan comisión por cada mensualidad (y, si se pactó, por la implementación) que la empresa paga.
          </Typography>
        </Box>
      </Stack>
      {unavailable && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No se pudo leer el módulo de aliados. Si es la primera vez, falta correr la migración db/license/033_create_aliados.js.
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile>
        {TABS.map((t) => <Tab key={t.key} value={t.key} label={t.label} sx={{ textTransform: "none", fontWeight: 700 }} />)}
      </Tabs>
      {tab === "aliados" && <AliadosTab aliados={aliados} loading={loading} reload={loadAliados} />}
      {tab === "empresas" && <AssignmentsTab aliados={aliados} />}
      {tab === "comisiones" && <CommissionsTab aliados={aliados} tenants={tenants} onSettled={() => { setSettledKey((k) => k + 1); loadAliados(); }} />}
      {tab === "liquidaciones" && <SettlementsTab aliados={aliados} refreshKey={settledKey} />}
      {tab === "reporte" && <ReportTab aliados={aliados} />}
    </Box>
  );
}
