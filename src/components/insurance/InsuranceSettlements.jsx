import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
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
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BlockIcon from "@mui/icons-material/Block";
import PaymentsIcon from "@mui/icons-material/Payments";
import UndoIcon from "@mui/icons-material/Undo";
import dayjs from "dayjs";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import { newClientReferenceId } from "../../utils/clientReferenceId";

// Liquidación de primas de microseguros a las aseguradoras y comisiones que
// la aseguradora reconoce (api/insurance/insuranceSettlementsController.js).
// Primas cobradas en las cuotas -> 2601.07; liquidar: débito 2601.07 /
// crédito banco o caja (cheque, egreso bancario o egreso de caja);
// comisión: débito 1601.06 / crédito 4301.01.05, cobrada por banco/caja o
// compensada en la liquidación. Anular nunca borra.

const API_URL = "/api/insurance/settlements";
const COMMISSIONS_URL = "/api/insurance/commissions";

const money = (v) =>
  `C$ ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dmy = (v) => (v ? dayjs(String(v).slice(0, 10)).format("DD/MM/YYYY") : "—");
const today = () => dayjs().format("YYYY-MM-DD");
const round2 = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

const METHOD_LABELS = { TRANSFERENCIA: "Transferencia", CHEQUE: "Cheque", CAJA: "Caja" };
const COLLECTION_LABELS = { COMPENSACION: "Compensada en liquidación", BANCO: "Banco", CAJA: "Caja" };
const COMMISSION_STATUS = {
  PENDIENTE: { label: "Por cobrar", color: "warning" },
  COBRADA: { label: "Cobrada", color: "success" },
  VOID: { label: "Anulada", color: "default" },
};

const headSx = { "& th": { backgroundColor: "#F8FAFC", fontWeight: 700, whiteSpace: "nowrap" } };
const paperSx = { p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" };

const StatusChip = ({ status }) =>
  status === "VOID" ? <Chip size="small" label="Anulada" /> : <Chip size="small" color="success" label="Vigente" />;

// ==========================================
// Diálogo de anulación (motivo obligatorio)
// ==========================================
function VoidDialog({ open, title, description, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
    }
  }, [open]);

  const confirm = async () => {
    if (!reason.trim()) {
      setError("Indique el motivo de la anulación.");
      return;
    }
    try {
      setSaving(true);
      await onConfirm(reason.trim());
    } catch (err) {
      setError(errorMessage(err, "No se pudo anular."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {description && <Alert severity="warning" sx={{ mb: 2 }}>{description}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          label="Motivo de la anulación"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button color="error" variant="contained" onClick={confirm} disabled={saving} sx={{ textTransform: "none" }}>
          {saving ? "Anulando..." : "Anular"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Selector de cuenta bancaria o caja (solo cuentas en C$, del endpoint
// funding-sources).
function FundingFields({ kind, sources, value, onChange }) {
  if (kind === "CAJA") {
    return (
      <TextField
        select
        fullWidth
        size="small"
        label="Caja"
        value={value.cash_register_id}
        onChange={(e) => onChange({ cash_register_id: e.target.value })}
      >
        {(sources.cash_registers || []).map((c) => (
          <MenuItem key={c.id} value={c.id}>{`${c.name} (${c.muc_code})`}</MenuItem>
        ))}
      </TextField>
    );
  }
  return (
    <TextField
      select
      fullWidth
      size="small"
      label="Cuenta bancaria"
      value={value.bank_account_id}
      onChange={(e) => onChange({ bank_account_id: e.target.value })}
    >
      {(sources.bank_accounts || []).map((b) => (
        <MenuItem key={b.id} value={b.id}>{`${b.account_alias} (${b.muc_code})`}</MenuItem>
      ))}
    </TextField>
  );
}

// ==========================================
// Nueva liquidación
// ==========================================
const emptySettlement = (initial = {}) => ({
  provider_id: initial.provider_id || "",
  date_from: initial.date_from || dayjs().startOf("month").format("YYYY-MM-DD"),
  date_to: initial.date_to || today(),
  settlement_date: today(),
  payment_method: "TRANSFERENCIA",
  bank_account_id: "",
  cash_register_id: "",
  check_number: "",
  document_reference: "",
  notes: "",
  accrue: false,
  commission_amount: "",
  compensate: false,
  compensate_ids: [],
});

function SettlementDialog({ open, initial, providers, sources, onClose, onSaved }) {
  const [form, setForm] = useState(emptySettlement(initial));
  const [preview, setPreview] = useState(null);
  const [pendingCommissions, setPendingCommissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const clientRef = useRef(null);

  useEffect(() => {
    if (open) {
      setForm(emptySettlement(initial));
      setPreview(null);
      setError("");
      clientRef.current = newClientReferenceId();
    }
  }, [open, initial]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Vista previa de las primas a liquidar y comisiones pendientes de la aseguradora.
  useEffect(() => {
    if (!open || !form.provider_id || !form.date_from || !form.date_to) return undefined;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      API.get(`${API_URL}/pending/items`, {
        params: { provider_id: form.provider_id, date_from: form.date_from, date_to: form.date_to },
      }),
      API.get(COMMISSIONS_URL, { params: { provider_id: form.provider_id, status: "PENDIENTE" } }),
    ])
      .then(([itemsRes, commRes]) => {
        if (cancelled) return;
        const data = itemsRes.data?.data || { items: [], premium: 0, commission_computed: 0 };
        setPreview(data);
        setPendingCommissions(commRes.data?.data || []);
        setForm((f) => ({
          ...f,
          commission_amount: data.commission_computed ? String(data.commission_computed) : f.commission_amount,
          accrue: f.accrue || Number(data.commission_computed) > 0,
          compensate_ids: [],
        }));
        setError("");
      })
      .catch((err) => !cancelled && setError(errorMessage(err, "No se pudieron cargar las primas pendientes.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, form.provider_id, form.date_from, form.date_to]);

  // Siguiente número de cheque sugerido por la cuenta bancaria.
  useEffect(() => {
    if (form.payment_method !== "CHEQUE" || !form.bank_account_id || form.check_number) return;
    const bank = (sources.bank_accounts || []).find((b) => b.id === form.bank_account_id);
    if (bank?.next_check_number) set({ check_number: String(bank.next_check_number) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.payment_method, form.bank_account_id]);

  const premium = round2(preview?.premium);
  const commission = form.accrue ? round2(form.commission_amount) : 0;
  const compensatedExisting = round2(
    pendingCommissions.filter((c) => form.compensate_ids.includes(c.id)).reduce((s, c) => s + Number(c.amount), 0),
  );
  const compensated = round2((form.accrue && form.compensate ? commission : 0) + compensatedExisting);
  const net = round2(premium - compensated);

  const toggleCompensate = (id) =>
    set({ compensate_ids: form.compensate_ids.includes(id) ? form.compensate_ids.filter((x) => x !== id) : [...form.compensate_ids, id] });

  const save = async () => {
    if (!form.provider_id) return setError("Seleccione la aseguradora.");
    if (!preview?.items?.length) return setError("No hay primas pendientes de liquidar en ese período.");
    if (form.payment_method === "CAJA" && !form.cash_register_id) return setError("Seleccione la caja.");
    if (form.payment_method !== "CAJA" && !form.bank_account_id) return setError("Seleccione la cuenta bancaria.");
    if (form.payment_method === "CHEQUE" && !form.check_number.trim()) return setError("Indique el número de cheque.");
    if (net <= 0) return setError("Las comisiones a compensar cubren las primas: no queda nada que pagar.");
    try {
      setSaving(true);
      const res = await API.post(API_URL, {
        provider_id: form.provider_id,
        date_from: form.date_from,
        date_to: form.date_to,
        settlement_date: form.settlement_date,
        payment_method: form.payment_method,
        bank_account_id: form.payment_method === "CAJA" ? null : form.bank_account_id,
        cash_register_id: form.payment_method === "CAJA" ? form.cash_register_id : null,
        check_number: form.payment_method === "CHEQUE" ? form.check_number.trim() : null,
        document_reference: form.document_reference || null,
        notes: form.notes || null,
        expected_premium: premium,
        commission: { accrue: form.accrue && commission > 0, amount: commission, compensate: form.compensate },
        compensate_commission_ids: form.compensate_ids,
        client_reference_id: clientRef.current,
      });
      onSaved(res.data?.data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo registrar la liquidación."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Nueva liquidación de primas</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              size="small"
              label="Aseguradora"
              value={form.provider_id}
              onChange={(e) => set({ provider_id: e.target.value })}
            >
              {providers.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth size="small" type="date" label="Pagos desde" InputLabelProps={{ shrink: true }}
              value={form.date_from} onChange={(e) => set({ date_from: e.target.value })} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField fullWidth size="small" type="date" label="Pagos hasta" InputLabelProps={{ shrink: true }}
              value={form.date_to} onChange={(e) => set({ date_to: e.target.value })} />
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: 1.5, my: 2, borderRadius: 2, background: "#F8FAFC" }}>
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center"><CircularProgress size={18} /><Typography variant="body2">Calculando primas pendientes…</Typography></Stack>
          ) : preview ? (
            <Typography variant="body2">
              {`${preview.items.length} pago(s) con prima pendiente · primas a liquidar `}
              <b>{money(premium)}</b>
              {preview.commission_computed > 0 && ` · comisión calculada ${money(preview.commission_computed)}`}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">Seleccione la aseguradora y el período de pagos.</Typography>
          )}
        </Paper>

        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Comisión de la aseguradora</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={<Checkbox checked={form.accrue} onChange={(e) => set({ accrue: e.target.checked, compensate: e.target.checked && form.compensate })} />}
              label="Devengar comisión"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="number" label="Monto de la comisión" disabled={!form.accrue}
              value={form.commission_amount} onChange={(e) => set({ commission_amount: e.target.value })}
              helperText="1601.06 contra 4301.01.05" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={<Checkbox checked={form.compensate} disabled={!form.accrue} onChange={(e) => set({ compensate: e.target.checked })} />}
              label="Compensar (pagar neto)"
            />
          </Grid>
        </Grid>
        {pendingCommissions.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">Compensar también comisiones ya devengadas por cobrar:</Typography>
            {pendingCommissions.map((c) => (
              <FormControlLabel
                key={c.id}
                control={<Checkbox size="small" checked={form.compensate_ids.includes(c.id)} onChange={() => toggleCompensate(c.id)} />}
                label={`#${c.id} · ${dmy(c.accrual_date)} · ${money(c.amount)}`}
              />
            ))}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Pago a la aseguradora</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="date" label="Fecha de la liquidación" InputLabelProps={{ shrink: true }}
              value={form.settlement_date} onChange={(e) => set({ settlement_date: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth size="small" label="Forma de pago" value={form.payment_method}
              onChange={(e) => set({ payment_method: e.target.value, check_number: "" })}>
              {Object.entries(METHOD_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FundingFields kind={form.payment_method} sources={sources} value={form} onChange={set} />
          </Grid>
          {form.payment_method === "CHEQUE" && (
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="Número de cheque" value={form.check_number}
                onChange={(e) => set({ check_number: e.target.value })} />
            </Grid>
          )}
          <Grid item xs={12} sm={form.payment_method === "CHEQUE" ? 8 : 12}>
            <TextField fullWidth size="small" label="Referencia (transferencia, recibo de la aseguradora)"
              value={form.document_reference} onChange={(e) => set({ document_reference: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Notas" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </Grid>
        </Grid>

        <Paper variant="outlined" sx={{ p: 1.5, mt: 2, borderRadius: 2 }}>
          <Table size="small">
            <TableBody>
              <TableRow><TableCell>Débito 2601.07 — primas por liquidar</TableCell><TableCell align="right">{money(premium)}</TableCell></TableRow>
              {compensated > 0 && (
                <TableRow><TableCell>Crédito 1601.06 — comisión compensada</TableCell><TableCell align="right">{money(compensated)}</TableCell></TableRow>
              )}
              <TableRow>
                <TableCell><b>{`Crédito ${form.payment_method === "CAJA" ? "caja" : "banco"} — neto a pagar`}</b></TableCell>
                <TableCell align="right"><b>{money(net)}</b></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={saving || loading || !preview?.items?.length} sx={{ textTransform: "none" }}>
          {saving ? "Registrando..." : "Registrar liquidación"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// Detalle de una liquidación
// ==========================================
function SettlementDetailDialog({ id, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setData(null);
    setError("");
    API.get(`${API_URL}/${id}`)
      .then((res) => setData(res.data?.data || null))
      .catch((err) => setError(errorMessage(err, "No se pudo cargar la liquidación.")));
  }, [id]);

  return (
    <Dialog open={Boolean(id)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{`Liquidación #${id || ""}`}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        {!data && !error && <CircularProgress size={22} />}
        {data && (
          <>
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}><Typography variant="body2"><b>Aseguradora:</b> {data.provider_name}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><b>Período de pagos:</b> {`${dmy(data.period_from)} al ${dmy(data.period_to)}`}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><b>Fecha:</b> {dmy(data.settlement_date)}</Typography></Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <b>Pago:</b> {METHOD_LABELS[data.payment_method]}
                  {data.check_number ? ` #${data.check_number}` : ""} · {data.bank_account_alias || data.cash_register_name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}><Typography variant="body2"><b>Primas:</b> {money(data.premium_amount)}</Typography></Grid>
              <Grid item xs={12} sm={4}><Typography variant="body2"><b>Comisión compensada:</b> {money(data.compensated_amount)}</Typography></Grid>
              <Grid item xs={12} sm={4}><Typography variant="body2"><b>Neto pagado:</b> {money(data.net_amount)}</Typography></Grid>
              {data.status === "VOID" && (
                <Grid item xs={12}>
                  <Alert severity="warning">{`Anulada el ${dmy(data.voided_at)} por ${data.voided_by_name || "—"}: ${data.void_reason || ""}`}</Alert>
                </Grid>
              )}
            </Grid>

            <Typography variant="subtitle2" fontWeight={700}>Asientos contables</Typography>
            <TableContainer sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead sx={headSx}>
                  <TableRow>
                    <TableCell>Comprobante</TableCell><TableCell>Cuenta</TableCell>
                    <TableCell align="right">Débito</TableCell><TableCell align="right">Crédito</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.entry_lines.map((l, i) => (
                    <TableRow key={`${l.journal_entry_id}-${i}`}>
                      <TableCell>{`${l.entry_no}${l.status === "VOID" ? " (anulado)" : ""}`}</TableCell>
                      <TableCell>{`${l.muc_code} ${l.account_name}`}</TableCell>
                      <TableCell align="right">{Number(l.debit) ? money(l.debit) : ""}</TableCell>
                      <TableCell align="right">{Number(l.credit) ? money(l.credit) : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="subtitle2" fontWeight={700}>{`Primas liquidadas (${data.items.length})`}</Typography>
            <TableContainer sx={{ maxHeight: 280 }}>
              <Table size="small" stickyHeader>
                <TableHead sx={headSx}>
                  <TableRow>
                    <TableCell>Fecha pago</TableCell><TableCell>Crédito</TableCell><TableCell>Cliente</TableCell>
                    <TableCell>Tipo de seguro</TableCell><TableCell align="right">Prima</TableCell><TableCell align="right">Comisión</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{dmy(it.payment_date)}</TableCell>
                      <TableCell>{it.credit_code || it.loan_id}</TableCell>
                      <TableCell>{it.customer_name}</TableCell>
                      <TableCell>{it.product_name || "Póliza colectiva"}</TableCell>
                      <TableCell align="right">{money(it.premium_amount)}</TableCell>
                      <TableCell align="right">{money(it.commission_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// Comisión manual (devengo) y cobro
// ==========================================
function CommissionDialog({ open, providers, onClose, onSaved }) {
  const blank = { provider_id: "", accrual_date: today(), period_from: "", period_to: "", base_amount: "", commission_rate: "", amount: "", document_reference: "", notes: "" };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(blank);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const suggested = form.base_amount && form.commission_rate ? round2((Number(form.base_amount) * Number(form.commission_rate)) / 100) : null;

  const save = async () => {
    if (!form.provider_id) return setError("Seleccione la aseguradora.");
    const amount = form.amount !== "" ? Number(form.amount) : suggested;
    if (!(amount > 0)) return setError("Indique el monto de la comisión.");
    try {
      setSaving(true);
      const res = await API.post(COMMISSIONS_URL, { ...form, amount });
      onSaved(res.data?.data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo registrar la comisión."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar comisión devengada</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={7}>
            <TextField select fullWidth size="small" label="Aseguradora" value={form.provider_id} onChange={(e) => set({ provider_id: e.target.value })}>
              {providers.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField fullWidth size="small" type="date" label="Fecha de devengo" InputLabelProps={{ shrink: true }}
              value={form.accrual_date} onChange={(e) => set({ accrual_date: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" type="date" label="Período desde" InputLabelProps={{ shrink: true }}
              value={form.period_from} onChange={(e) => set({ period_from: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth size="small" type="date" label="Período hasta" InputLabelProps={{ shrink: true }}
              value={form.period_to} onChange={(e) => set({ period_to: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" type="number" label="Base (primas)" value={form.base_amount} onChange={(e) => set({ base_amount: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" type="number" label="% comisión" value={form.commission_rate} onChange={(e) => set({ commission_rate: e.target.value })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth size="small" type="number" label="Monto" value={form.amount}
              placeholder={suggested ? String(suggested) : ""} onChange={(e) => set({ amount: e.target.value })} />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth size="small" label="Referencia (estado de cuenta de la aseguradora)" value={form.document_reference}
              onChange={(e) => set({ document_reference: e.target.value })} />
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary">Asiento: débito 1601.06 / crédito 4301.01.05.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={saving} sx={{ textTransform: "none" }}>
          {saving ? "Registrando..." : "Registrar comisión"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function CollectDialog({ commission, sources, onClose, onSaved }) {
  const [form, setForm] = useState({ method: "BANCO", bank_account_id: "", cash_register_id: "", collection_date: today(), document_reference: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (commission) {
      setForm({ method: "BANCO", bank_account_id: "", cash_register_id: "", collection_date: today(), document_reference: "" });
      setError("");
    }
  }, [commission]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const save = async () => {
    if (form.method === "BANCO" && !form.bank_account_id) return setError("Seleccione la cuenta bancaria.");
    if (form.method === "CAJA" && !form.cash_register_id) return setError("Seleccione la caja.");
    try {
      setSaving(true);
      const res = await API.post(`${COMMISSIONS_URL}/${commission.id}/collect`, form);
      onSaved(res.data?.data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo registrar el cobro."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(commission)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{`Cobrar comisión #${commission?.id || ""} · ${money(commission?.amount)}`}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={4}>
            <TextField select fullWidth size="small" label="Se recibe en" value={form.method} onChange={(e) => set({ method: e.target.value })}>
              <MenuItem value="BANCO">Banco</MenuItem>
              <MenuItem value="CAJA">Caja</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={8}>
            <FundingFields kind={form.method === "CAJA" ? "CAJA" : "BANCO"} sources={sources} value={form} onChange={set} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
              value={form.collection_date} onChange={(e) => set({ collection_date: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField fullWidth size="small" label="Referencia" value={form.document_reference} onChange={(e) => set({ document_reference: e.target.value })} />
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary">Asiento: débito banco/caja / crédito 1601.06.</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={saving} sx={{ textTransform: "none" }}>
          {saving ? "Registrando..." : "Registrar cobro"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ==========================================
// Pantalla
// ==========================================
export default function InsuranceSettlements() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canSettle = role === 1 || permissions.includes("seguros.liquidar");
  const canVoid = role === 1 || permissions.includes("seguros.liquidaciones.anular");

  const [tab, setTab] = useState(0);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const [providers, setProviders] = useState([]);
  const [sources, setSources] = useState({ bank_accounts: [], cash_registers: [] });

  const [pendingFilter, setPendingFilter] = useState({ date_from: "", date_to: "" });
  const [pending, setPending] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [settlementFilter, setSettlementFilter] = useState({ provider_id: "", status: "", from: "", to: "" });
  const [commissions, setCommissions] = useState([]);
  const [commissionFilter, setCommissionFilter] = useState({ provider_id: "", status: "" });
  const [asOf, setAsOf] = useState(today());
  const [recon, setRecon] = useState(null);
  const [loading, setLoading] = useState(false);

  const [newSettlement, setNewSettlement] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [collectTarget, setCollectTarget] = useState(null);

  useEffect(() => {
    API.get("/api/insurance/providers").then((res) => setProviders(res.data?.data || [])).catch(() => {});
    API.get(`${API_URL}/funding-sources`).then((res) => setSources(res.data?.data || {})).catch(() => {});
  }, []);

  const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== null));

  const loadPending = useCallback(async () => {
    const res = await API.get(`${API_URL}/pending`, { params: clean(pendingFilter) });
    setPending(res.data?.data || null);
  }, [pendingFilter]);
  const loadSettlements = useCallback(async () => {
    const res = await API.get(API_URL, { params: clean(settlementFilter) });
    setSettlements(res.data?.data || []);
  }, [settlementFilter]);
  const loadCommissions = useCallback(async () => {
    const res = await API.get(COMMISSIONS_URL, { params: clean(commissionFilter) });
    setCommissions(res.data?.data || []);
  }, [commissionFilter]);
  const loadRecon = useCallback(async () => {
    const res = await API.get(`${API_URL}/reconciliation`, { params: { as_of: asOf } });
    setRecon(res.data?.data || null);
  }, [asOf]);

  const loaders = useMemo(() => [loadPending, loadSettlements, loadCommissions, loadRecon], [loadPending, loadSettlements, loadCommissions, loadRecon]);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      await loaders[tab]();
    } catch (err) {
      showAlert(errorMessage(err, "No se pudo cargar la información."), "error");
    } finally {
      setLoading(false);
    }
  }, [loaders, tab]);

  useEffect(() => {
    refresh();
    // Solo al cambiar de pestaña; los filtros se aplican con "Consultar".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const afterChange = (message) => {
    showAlert(message);
    refresh();
  };

  const onSettlementSaved = (data) => {
    setNewSettlement(null);
    afterChange(`Liquidación registrada: primas ${money(data?.premium_amount)}, neto pagado ${money(data?.net_amount)} (comprobante ${data?.entry_no || "—"})`);
  };

  const confirmVoid = async (reason) => {
    const { kind, row } = voidTarget;
    const url = kind === "settlement" ? `${API_URL}/${row.id}/void`
      : kind === "commission" ? `${COMMISSIONS_URL}/${row.id}/void`
        : `/api/insurance/commission-collections/${row.collection_id}/void`;
    await API.post(url, { reason });
    setVoidTarget(null);
    afterChange(kind === "settlement" ? `Liquidación #${row.id} anulada` : kind === "commission" ? `Comisión #${row.id} anulada` : `Cobro de la comisión #${row.id} anulado`);
  };

  const providerSelect = (value, onChange, label = "Aseguradora") => (
    <TextField select size="small" label={label} value={value} onChange={onChange} sx={{ minWidth: 220 }}>
      <MenuItem value="">Todas</MenuItem>
      {providers.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
    </TextField>
  );

  const dateField = (label, value, onChange) => (
    <TextField size="small" type="date" label={label} InputLabelProps={{ shrink: true }} value={value} onChange={onChange} />
  );

  const consultButton = (
    <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={refresh}>
      Consultar
    </Button>
  );

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={paperSx}>
        <Box sx={{ mb: 1, display: "flex", justifyContent: "space-between", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReceiptLongIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Typography variant="h6" fontWeight={700}>Liquidación de Seguros</Typography>
              <Typography variant="body2" color="text.secondary">
                Primas cobradas en las cuotas (2601.07) pagadas a cada aseguradora y comisiones por comercialización (1601.06 / 4301.01.05)
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {canSettle && (
              <Button variant="contained" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={() => setNewSettlement({})}>
                Nueva liquidación
              </Button>
            )}
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: "1px solid #E5E7EB" }}>
          <Tab label="Pendiente de liquidar" sx={{ textTransform: "none" }} />
          <Tab label="Liquidaciones" sx={{ textTransform: "none" }} />
          <Tab label="Comisiones" sx={{ textTransform: "none" }} />
          <Tab label="Conciliación 2601.07" sx={{ textTransform: "none" }} />
        </Tabs>

        {loading && <CircularProgress size={22} sx={{ mb: 1 }} />}

        {tab === 0 && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
              {dateField("Pagos desde", pendingFilter.date_from, (e) => setPendingFilter((f) => ({ ...f, date_from: e.target.value })))}
              {dateField("Pagos hasta", pendingFilter.date_to, (e) => setPendingFilter((f) => ({ ...f, date_to: e.target.value })))}
              {consultButton}
            </Stack>
            {pending && (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={headSx}>
                      <TableRow>
                        <TableCell>Aseguradora</TableCell>
                        <TableCell align="right">% comisión</TableCell>
                        <TableCell align="right">Pagos</TableCell>
                        <TableCell align="right">Créditos</TableCell>
                        <TableCell>Desde</TableCell>
                        <TableCell>Hasta</TableCell>
                        <TableCell align="right">Primas pendientes</TableCell>
                        <TableCell align="right">Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pending.providers.map((p) => (
                        <TableRow key={p.provider_id}>
                          <TableCell>
                            {p.provider_name}
                            {p.is_default && <Chip size="small" variant="outlined" color="primary" label="Póliza colectiva" sx={{ ml: 1 }} />}
                          </TableCell>
                          <TableCell align="right">{p.commission_rate === null ? "—" : `${p.commission_rate.toFixed(2)}%`}</TableCell>
                          <TableCell align="right">{p.payments_count}</TableCell>
                          <TableCell align="right">{p.loans_count}</TableCell>
                          <TableCell>{dmy(p.first_payment_date)}</TableCell>
                          <TableCell>{dmy(p.last_payment_date)}</TableCell>
                          <TableCell align="right"><b>{money(p.premium)}</b></TableCell>
                          <TableCell align="right">
                            {canSettle && p.premium > 0 && (
                              <Button size="small" sx={{ textTransform: "none" }}
                                onClick={() => setNewSettlement({
                                  provider_id: p.provider_id,
                                  date_from: pendingFilter.date_from || p.first_payment_date,
                                  date_to: pendingFilter.date_to || p.last_payment_date,
                                })}>
                                Liquidar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {pending.unassigned.payments_count > 0 && (
                        <TableRow>
                          <TableCell><i>Sin aseguradora asignada</i></TableCell>
                          <TableCell align="right">—</TableCell>
                          <TableCell align="right">{pending.unassigned.payments_count}</TableCell>
                          <TableCell align="right">{pending.unassigned.loans_count}</TableCell>
                          <TableCell>{dmy(pending.unassigned.first_payment_date)}</TableCell>
                          <TableCell>{dmy(pending.unassigned.last_payment_date)}</TableCell>
                          <TableCell align="right">{money(pending.unassigned.premium)}</TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell colSpan={6}><b>Total pendiente</b></TableCell>
                        <TableCell align="right"><b>{money(pending.total_premium)}</b></TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                {pending.unassigned.payments_count > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {`${money(pending.unassigned.premium)} en primas de ${pending.unassigned.loans_count} crédito(s) no tienen aseguradora: registre el seguro contratado del crédito (Seguros Contratados) o marque una aseguradora como "Póliza colectiva por defecto" (Aseguradoras) para poder liquidarlas.`}
                  </Alert>
                )}
              </>
            )}
          </>
        )}

        {tab === 1 && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
              {providerSelect(settlementFilter.provider_id, (e) => setSettlementFilter((f) => ({ ...f, provider_id: e.target.value })))}
              <TextField select size="small" label="Estado" value={settlementFilter.status} sx={{ minWidth: 140 }}
                onChange={(e) => setSettlementFilter((f) => ({ ...f, status: e.target.value }))}>
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="ACTIVE">Vigentes</MenuItem>
                <MenuItem value="VOID">Anuladas</MenuItem>
              </TextField>
              {dateField("Desde", settlementFilter.from, (e) => setSettlementFilter((f) => ({ ...f, from: e.target.value })))}
              {dateField("Hasta", settlementFilter.to, (e) => setSettlementFilter((f) => ({ ...f, to: e.target.value })))}
              {consultButton}
            </Stack>
            <TableContainer sx={{ maxHeight: 560 }}>
              <Table size="small" stickyHeader>
                <TableHead sx={headSx}>
                  <TableRow>
                    <TableCell>#</TableCell><TableCell>Fecha</TableCell><TableCell>Aseguradora</TableCell><TableCell>Período</TableCell>
                    <TableCell align="right">Primas</TableCell><TableCell align="right">Comisión compensada</TableCell><TableCell align="right">Neto pagado</TableCell>
                    <TableCell>Forma de pago</TableCell><TableCell>Comprobante</TableCell><TableCell>Estado</TableCell><TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {settlements.length === 0 && (
                    <TableRow><TableCell colSpan={11} align="center">Sin liquidaciones registradas</TableCell></TableRow>
                  )}
                  {settlements.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>{s.id}</TableCell>
                      <TableCell>{dmy(s.settlement_date)}</TableCell>
                      <TableCell>{s.provider_name}</TableCell>
                      <TableCell>{`${dmy(s.period_from)} – ${dmy(s.period_to)}`}</TableCell>
                      <TableCell align="right">{money(s.premium_amount)}</TableCell>
                      <TableCell align="right">{money(s.compensated_amount)}</TableCell>
                      <TableCell align="right">{money(s.net_amount)}</TableCell>
                      <TableCell>{`${METHOD_LABELS[s.payment_method]}${s.check_number ? ` #${s.check_number}` : ""}`}</TableCell>
                      <TableCell>{s.entry_no || "—"}</TableCell>
                      <TableCell><StatusChip status={s.status} /></TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" aria-label={`Ver liquidación ${s.id}`} onClick={() => setDetailId(s.id)}><VisibilityIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        {canVoid && s.status === "ACTIVE" && (
                          <Tooltip title="Anular">
                            <IconButton size="small" color="error" aria-label={`Anular liquidación ${s.id}`} onClick={() => setVoidTarget({ kind: "settlement", row: s })}>
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {tab === 2 && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", rowGap: 1 }}>
              {providerSelect(commissionFilter.provider_id, (e) => setCommissionFilter((f) => ({ ...f, provider_id: e.target.value })))}
              <TextField select size="small" label="Estado" value={commissionFilter.status} sx={{ minWidth: 140 }}
                onChange={(e) => setCommissionFilter((f) => ({ ...f, status: e.target.value }))}>
                <MenuItem value="">Todas</MenuItem>
                {Object.entries(COMMISSION_STATUS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </TextField>
              {consultButton}
              {canSettle && (
                <Button variant="outlined" startIcon={<AddIcon />} sx={{ textTransform: "none" }} onClick={() => setCommissionOpen(true)}>
                  Registrar comisión
                </Button>
              )}
            </Stack>
            <TableContainer sx={{ maxHeight: 560 }}>
              <Table size="small" stickyHeader>
                <TableHead sx={headSx}>
                  <TableRow>
                    <TableCell>#</TableCell><TableCell>Devengo</TableCell><TableCell>Aseguradora</TableCell><TableCell>Período</TableCell>
                    <TableCell align="right">Base</TableCell><TableCell align="right">%</TableCell><TableCell align="right">Comisión</TableCell>
                    <TableCell>Comprobante</TableCell><TableCell>Estado</TableCell><TableCell>Cobro</TableCell><TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {commissions.length === 0 && (
                    <TableRow><TableCell colSpan={11} align="center">Sin comisiones registradas</TableCell></TableRow>
                  )}
                  {commissions.map((c) => {
                    const st = COMMISSION_STATUS[c.status] || COMMISSION_STATUS.PENDIENTE;
                    return (
                      <TableRow key={c.id} hover>
                        <TableCell>{c.id}</TableCell>
                        <TableCell>{dmy(c.accrual_date)}</TableCell>
                        <TableCell>{c.provider_name}</TableCell>
                        <TableCell>{c.period_from ? `${dmy(c.period_from)} – ${dmy(c.period_to)}` : "—"}</TableCell>
                        <TableCell align="right">{money(c.base_amount)}</TableCell>
                        <TableCell align="right">{c.commission_rate === null ? "—" : `${Number(c.commission_rate).toFixed(2)}%`}</TableCell>
                        <TableCell align="right">{money(c.amount)}</TableCell>
                        <TableCell>{c.entry_no || "—"}</TableCell>
                        <TableCell><Chip size="small" color={st.color} label={st.label} /></TableCell>
                        <TableCell>
                          {c.collection_id
                            ? `${COLLECTION_LABELS[c.collection_method]}${c.collection_settlement_id ? ` #${c.collection_settlement_id}` : ""} · ${dmy(c.collection_date)}${c.collection_entry_no ? ` · ${c.collection_entry_no}` : ""}`
                            : "—"}
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          {canSettle && c.status === "PENDIENTE" && (
                            <Tooltip title="Registrar cobro">
                              <IconButton size="small" color="primary" aria-label={`Cobrar comisión ${c.id}`} onClick={() => setCollectTarget(c)}><PaymentsIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          )}
                          {canVoid && c.status === "COBRADA" && c.collection_method !== "COMPENSACION" && (
                            <Tooltip title="Anular cobro">
                              <IconButton size="small" color="warning" aria-label={`Anular cobro de comisión ${c.id}`} onClick={() => setVoidTarget({ kind: "collection", row: c })}><UndoIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          )}
                          {canVoid && c.status === "PENDIENTE" && !c.settlement_id && (
                            <Tooltip title="Anular comisión">
                              <IconButton size="small" color="error" aria-label={`Anular comisión ${c.id}`} onClick={() => setVoidTarget({ kind: "commission", row: c })}><BlockIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {tab === 3 && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {dateField("Saldos al", asOf, (e) => setAsOf(e.target.value))}
              {consultButton}
            </Stack>
            {recon && (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={headSx}>
                      <TableRow>
                        <TableCell>Aseguradora</TableCell>
                        <TableCell align="right">Primas cobradas</TableCell>
                        <TableCell align="right">Liquidado</TableCell>
                        <TableCell align="right">Pendiente (2601.07)</TableCell>
                        <TableCell align="right">Comisión devengada</TableCell>
                        <TableCell align="right">Comisión cobrada</TableCell>
                        <TableCell align="right">Por cobrar (1601.06)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recon.providers.map((r) => (
                        <TableRow key={r.provider_id ?? "none"}>
                          <TableCell>{r.provider_id ? r.provider_name : <i>{r.provider_name}</i>}</TableCell>
                          <TableCell align="right">{money(r.collected)}</TableCell>
                          <TableCell align="right">{money(r.settled)}</TableCell>
                          <TableCell align="right"><b>{money(r.pending)}</b></TableCell>
                          <TableCell align="right">{money(r.commission_accrued)}</TableCell>
                          <TableCell align="right">{money(r.commission_collected)}</TableCell>
                          <TableCell align="right">{money(r.commission_receivable)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell><b>Total</b></TableCell>
                        <TableCell align="right"><b>{money(recon.totals.collected)}</b></TableCell>
                        <TableCell align="right"><b>{money(recon.totals.settled)}</b></TableCell>
                        <TableCell align="right"><b>{money(recon.totals.pending)}</b></TableCell>
                        <TableCell colSpan={2} />
                        <TableCell align="right"><b>{money(recon.commissions.receivable)}</b></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>

                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        {`Cuenta ${recon.accounts.payableMucCode || "2601.07"} — primas por liquidar`}
                      </Typography>
                      <Table size="small">
                        <TableBody>
                          <TableRow><TableCell>Pendiente según auxiliar (cobrado − liquidado)</TableCell><TableCell align="right">{money(recon.totals.pending)}</TableCell></TableRow>
                          {recon.voided_after_posting !== 0 && (
                            <TableRow><TableCell>Primas de pagos anulados después de contabilizados</TableCell><TableCell align="right">{money(recon.voided_after_posting)}</TableCell></TableRow>
                          )}
                          {recon.other_movements !== 0 && (
                            <TableRow><TableCell>Otros movimientos de la cuenta</TableCell><TableCell align="right">{money(recon.other_movements)}</TableCell></TableRow>
                          )}
                          <TableRow><TableCell>Saldo contable</TableCell><TableCell align="right"><b>{money(recon.gl_payable)}</b></TableCell></TableRow>
                          <TableRow>
                            <TableCell>Diferencia</TableCell>
                            <TableCell align="right">
                              <Chip size="small" color={recon.difference === 0 ? "success" : "error"} label={recon.difference === 0 ? "Cuadra" : money(recon.difference)} />
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        {`Cuenta ${recon.accounts.receivableMucCode || "1601.06"} — comisiones por cobrar`}
                      </Typography>
                      <Table size="small">
                        <TableBody>
                          <TableRow><TableCell>Por cobrar según auxiliar</TableCell><TableCell align="right">{money(recon.commissions.receivable)}</TableCell></TableRow>
                          <TableRow><TableCell>Saldo contable</TableCell><TableCell align="right"><b>{money(recon.commissions.gl_receivable)}</b></TableCell></TableRow>
                          <TableRow>
                            <TableCell>Diferencia</TableCell>
                            <TableCell align="right">
                              <Chip size="small" color={recon.commissions.difference === 0 ? "success" : "error"}
                                label={recon.commissions.difference === 0 ? "Cuadra" : money(recon.commissions.difference)} />
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Paper>
                  </Grid>
                </Grid>
              </>
            )}
          </>
        )}
      </Paper>

      <SettlementDialog
        open={Boolean(newSettlement)}
        initial={newSettlement || {}}
        providers={providers}
        sources={sources}
        onClose={() => setNewSettlement(null)}
        onSaved={onSettlementSaved}
      />
      <SettlementDetailDialog id={detailId} onClose={() => setDetailId(null)} />
      <CommissionDialog
        open={commissionOpen}
        providers={providers}
        onClose={() => setCommissionOpen(false)}
        onSaved={(c) => {
          setCommissionOpen(false);
          afterChange(`Comisión registrada por ${money(c?.amount)} (comprobante ${c?.entry_no || "—"})`);
        }}
      />
      <CollectDialog
        commission={collectTarget}
        sources={sources}
        onClose={() => setCollectTarget(null)}
        onSaved={(c) => {
          setCollectTarget(null);
          afterChange(`Cobro de comisión registrado (comprobante ${c?.collection_entry_no || "—"})`);
        }}
      />
      <VoidDialog
        open={Boolean(voidTarget)}
        title={
          voidTarget?.kind === "settlement" ? `Anular liquidación #${voidTarget.row.id}`
            : voidTarget?.kind === "commission" ? `Anular comisión #${voidTarget?.row.id}`
              : `Anular cobro de la comisión #${voidTarget?.row.id}`
        }
        description={
          voidTarget?.kind === "settlement"
            ? "Se anula el cheque/egreso y su asiento; las primas vuelven a quedar pendientes y las comisiones compensadas vuelven a quedar por cobrar. La comisión devengada con esta liquidación también se anula."
            : voidTarget?.kind === "collection"
              ? "Se anula el depósito o ingreso de caja del cobro; la comisión vuelve a quedar por cobrar."
              : "Se anula el asiento de devengo (1601.06 / 4301.01.05)."
        }
        onClose={() => setVoidTarget(null)}
        onConfirm={confirmVoid}
      />

      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
