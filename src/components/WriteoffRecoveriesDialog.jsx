import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import API from "../api";
import { UserContext } from "../contexts/UserContext";
import { newClientReferenceId } from "../utils/clientReferenceId";

// Recuperaciones de un crédito saneado (api/loan/writeoffRecoveriesController.js):
// resumen (saneado / recuperado / principal pendiente), registro de un cobro
// nuevo e historial con anulación. Se contabiliza al registrar:
// caja o banco contra 4201.02, y reversa en cuentas de orden 8204.02 / 8604.01.

const money = (v) =>
  `C$ ${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dmy = (v) => (v ? dayjs(String(v).slice(0, 10)).format("DD/MM/YYYY") : "—");
const CASH_ID = 1;

const emptyForm = { amount: "", id_forma_pago: "", collector_id: "", document_reference: "", notes: "" };

export default function WriteoffRecoveriesDialog({ open, loan, startWithForm = false, onClose, onChanged }) {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canRegister = role === 1 || permissions.includes("creditos.saneados.recuperar");
  const canVoid = role === 1 || permissions.includes("creditos.saneados.anular");

  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formasPago, setFormasPago] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [saving, setSaving] = useState(false);
  const clientReferenceIdRef = useRef(null);

  const [voiding, setVoiding] = useState(null);
  const [voidReason, setVoidReason] = useState("");

  const load = async () => {
    if (!loan?.id) return;
    setLoading(true);
    setError("");
    try {
      const [s, h] = await Promise.all([
        API.get(`/api/writeoff-recoveries/summary/${loan.id}`),
        API.get("/api/writeoff-recoveries", { params: { loan_id: loan.id } }),
      ]);
      setSummary(s.data?.data || null);
      setHistory(h.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron cargar las recuperaciones.");
    } finally {
      setLoading(false);
    }
  };

  const openForm = () => {
    // Un código por cada registro: un doble clic o un reintento no cobra dos veces.
    clientReferenceIdRef.current = newClientReferenceId();
    setForm({ ...emptyForm, collector_id: "" });
    setFormOpen(true);
    setMessage("");
  };

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setVoiding(null);
    setFormOpen(false);
    load();
    API.get("/api/payments/formas-pago")
      .then((res) => {
        const rows = res.data?.data || [];
        setFormasPago(rows);
        const def = rows.find((r) => Number(r.is_default) === 1);
        if (def) setForm((f) => ({ ...f, id_forma_pago: f.id_forma_pago || def.id }));
      })
      .catch(() => setFormasPago([]));
    API.get("/api/collectors")
      .then((res) => setCollectors((Array.isArray(res.data) ? res.data : []).filter((c) => Number(c.active ?? 1) === 1)))
      .catch(() => setCollectors([]));
    if (startWithForm && canRegister) openForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loan?.id]);

  const isCash = Number(form.id_forma_pago) === CASH_ID;
  const amount = Number(form.amount);
  const pending = Number(summary?.principal_pending || 0);
  const amountValid = amount > 0;
  const canSubmit = amountValid && form.id_forma_pago && !saving;

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await API.post("/api/writeoff-recoveries", {
        loan_id: loan.id,
        amount,
        id_forma_pago: Number(form.id_forma_pago),
        collector_id: isCash && form.collector_id ? Number(form.collector_id) : null,
        document_reference: form.document_reference,
        notes: form.notes,
        client_reference_id: clientReferenceIdRef.current,
      });
      const rec = res.data?.data;
      setMessage(
        res.data?.duplicate
          ? "Esta recuperación ya estaba registrada."
          : `Recuperación registrada por ${money(rec?.amount)} (comprobante ${rec?.entry_no || "—"}).`,
      );
      setFormOpen(false);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo registrar la recuperación.");
    } finally {
      setSaving(false);
    }
  };

  const confirmVoid = async () => {
    setSaving(true);
    setError("");
    try {
      await API.post(`/api/writeoff-recoveries/${voiding.id}/void`, { reason: voidReason.trim() });
      setMessage(`Recuperación de ${money(voiding.amount)} anulada.`);
      setVoiding(null);
      setVoidReason("");
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo anular la recuperación.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Recuperaciones del crédito saneado #{loan?.credit_code}
        <Typography variant="body2" color="text.secondary">
          {loan?.customer_name}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage("")}>
            {message}
          </Alert>
        )}

        {summary && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Saneado el {dmy(summary.writeoff_date)}</Typography>
              <Typography fontWeight={800}>{money(summary.writeoff_original_amount)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Recuperado</Typography>
              <Typography fontWeight={800} color="success.main">{money(summary.total_recovered)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Principal saneado pendiente</Typography>
              <Typography fontWeight={800}>{money(summary.principal_pending)}</Typography>
            </Box>
          </Stack>
        )}

        {canRegister && !formOpen && (
          <Button variant="contained" onClick={openForm} sx={{ mb: 2 }}>
            Registrar recuperación
          </Button>
        )}

        {formOpen && (
          <Box sx={{ p: 2, mb: 2, border: "1px solid var(--cm-border, #E5E7EB)", borderRadius: 2, background: "var(--cm-surface, #F8FAFC)" }}>
            <Typography fontWeight={700} sx={{ mb: 1.5 }}>Nueva recuperación (fecha de hoy)</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Monto recuperado"
                type="number"
                size="small"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                inputProps={{ min: 0, step: "0.01" }}
                error={form.amount !== "" && !amountValid}
                helperText={
                  amountValid && amount > pending
                    ? `${money(amount - pending)} excede el principal saneado pendiente: se registra como intereses recuperados.`
                    : " "
                }
                sx={{ minWidth: 200 }}
                autoFocus
              />
              <TextField
                select
                label="Forma de pago"
                size="small"
                value={form.id_forma_pago}
                onChange={(e) => setForm({ ...form, id_forma_pago: e.target.value, collector_id: "" })}
                sx={{ minWidth: 180 }}
              >
                {formasPago.map((f) => (
                  <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>
                ))}
              </TextField>
              {isCash && (
                <TextField
                  select
                  label="Cobrador (si cobró en calle)"
                  size="small"
                  value={form.collector_id}
                  onChange={(e) => setForm({ ...form, collector_id: e.target.value })}
                  helperText={form.collector_id ? "Queda en custodia del cobrador hasta su arqueo." : "Sin cobrador: entra a caja."}
                  sx={{ minWidth: 220 }}
                >
                  <MenuItem value="">— Pagado en oficina —</MenuItem>
                  {collectors.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Referencia (recibo, cheque, transferencia)"
                size="small"
                value={form.document_reference}
                onChange={(e) => setForm({ ...form, document_reference: e.target.value })}
                inputProps={{ maxLength: 100 }}
                sx={{ minWidth: 260 }}
              />
              <TextField
                label="Notas"
                size="small"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                inputProps={{ maxLength: 500 }}
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }} justifyContent="flex-end">
              <Button onClick={() => setFormOpen(false)} disabled={saving}>Cancelar</Button>
              <Button variant="contained" onClick={submit} disabled={!canSubmit}>
                {saving ? <CircularProgress size={20} /> : "Guardar recuperación"}
              </Button>
            </Stack>
          </Box>
        )}

        <Divider sx={{ mb: 1 }} />
        <Typography fontWeight={700} sx={{ mb: 1 }}>Historial de recuperaciones</Typography>
        {loading ? (
          <Box sx={{ py: 3, textAlign: "center" }}><CircularProgress size={24} /></Box>
        ) : history.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Este crédito no tiene recuperaciones registradas.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell>Forma de pago</TableCell>
                  <TableCell>Cobrador</TableCell>
                  <TableCell>Comprobante</TableCell>
                  <TableCell>Registró</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((r) => (
                  <TableRow key={r.id} sx={r.status === "VOID" ? { "& td": { color: "text.disabled" } } : undefined}>
                    <TableCell>{dmy(r.recovery_date)}</TableCell>
                    <TableCell align="right">{money(r.amount)}</TableCell>
                    <TableCell>
                      {r.forma_pago_name}
                      {r.document_reference ? ` · ${r.document_reference}` : ""}
                    </TableCell>
                    <TableCell>{r.collector_name || "—"}</TableCell>
                    <TableCell>
                      <Tooltip title={r.memo_entry_no ? `Cuentas de orden: ${r.memo_entry_no} (${r.memo_muc_code})` : "Sin reversión en cuentas de orden"}>
                        <span>{r.entry_no || "—"}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{r.created_by_name || "—"}</TableCell>
                    <TableCell>
                      {r.status === "VOID" ? (
                        <Tooltip title={`${r.voided_by_name || ""} ${dmy(r.voided_at)}: ${r.void_reason || ""}`}>
                          <Chip size="small" label="Anulada" />
                        </Tooltip>
                      ) : (
                        <Chip size="small" color="success" label="Vigente" />
                      )}
                    </TableCell>
                    <TableCell>
                      {canVoid && r.status === "ACTIVE" && (
                        <Button size="small" color="error" onClick={() => { setVoiding(r); setVoidReason(""); }}>
                          Anular
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {voiding && (
          <Box sx={{ p: 2, mt: 2, border: "1px solid", borderColor: "error.light", borderRadius: 2 }}>
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              Anular la recuperación de {money(voiding.amount)} del {dmy(voiding.recovery_date)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Se anulan también sus comprobantes contables. El registro no se borra: queda como anulado.
            </Typography>
            <TextField
              label="Motivo de la anulación"
              size="small"
              fullWidth
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              inputProps={{ maxLength: 500 }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} justifyContent="flex-end">
              <Button onClick={() => setVoiding(null)} disabled={saving}>Cancelar</Button>
              <Button variant="contained" color="error" onClick={confirmVoid} disabled={!voidReason.trim() || saving}>
                Confirmar anulación
              </Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
