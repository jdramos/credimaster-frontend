import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import API from "../../api";
import DenominationCounter, { countTotals, emptyCount, money, toPayload } from "./DenominationCounter";

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

const DiffLine = ({ label, diff, symbol }) =>
  diff === 0 ? (
    <Typography variant="body2" color="success.main">{label}: cuadra</Typography>
  ) : (
    <Typography variant="body2" color={diff < 0 ? "error.main" : "warning.main"}>
      {label}: {diff < 0 ? "faltante" : "sobrante"} de <strong>{money(Math.abs(diff), symbol)}</strong>
    </Typography>
  );

// Cierre de un turno de caja: conteo por denominación, comparado por moneda
// contra el esperado (C$ y cada divisa; el backend lo recalcula y
// contabiliza la diferencia valorando las divisas a su costo) y traslado
// opcional del efectivo a la bóveda (C$ y divisas) o al banco (C$). La usan
// "Mi caja" y la supervisión.
export default function CloseCashSessionDialog({ open, session, currencies: currenciesProp, onClose, onClosed }) {
  const [count, setCount] = useState(emptyCount());
  const [dayRates, setDayRates] = useState({});
  const [catalog, setCatalog] = useState([]);
  const [notes, setNotes] = useState("");
  const [transferType, setTransferType] = useState("");
  const [transferRegisterId, setTransferRegisterId] = useState("");
  const [transferBankId, setTransferBankId] = useState("");
  const [transferNio, setTransferNio] = useState("");
  const [transferFx, setTransferFx] = useState({});
  const [registers, setRegisters] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !session) return;
    setCount(emptyCount());
    setNotes("");
    setTransferType("");
    setTransferRegisterId("");
    setTransferBankId("");
    setTransferNio("");
    setTransferFx({});
    setError("");
    API.get("/api/caja/sessions/opening-preview", { params: { cash_register_id: session.cash_register_id } })
      .then((res) => setDayRates(res.data?.data?.institution_rates || {}))
      .catch(() => setDayRates({}));
    if (!currenciesProp) {
      API.get("/api/caja/currencies").then((res) => setCatalog(res.data?.data || [])).catch(() => setCatalog([]));
    }
    API.get("/api/caja/registers", { params: { status: "ACTIVA" } })
      .then((res) => setRegisters((res.data?.data || []).filter((r) => Number(r.id) !== Number(session.cash_register_id))))
      .catch(() => setRegisters([]));
    // Solo quien ve Bancos puede elegir una cuenta; si no, se ofrece la bóveda.
    API.get("/api/banks/accounts", { params: { status: "ACTIVA" } })
      .then((res) => setBankAccounts(res.data?.data || []))
      .catch(() => setBankAccounts([]));
  }, [open, session, currenciesProp]);

  const currencies = currenciesProp || catalog;
  const symbolOf = (code) => currencies.find((c) => c.code === code)?.symbol || code;
  const t = session?.totals || {};
  const expectedFx = useMemo(() => session?.totals?.currencies || {}, [session]);
  const expectedNio = Number(t.expected_nio ?? t.expected_amount ?? 0);
  // Cada divisa se valora a su costo en la caja (o al TC de compra del día
  // si aparece una que no se esperaba).
  const rates = useMemo(() => {
    const r = {};
    for (const c of currencies) r[c.code] = expectedFx[c.code]?.book_rate || dayRates[c.code]?.buy_rate || null;
    return r;
  }, [currencies, expectedFx, dayRates]);
  const totals = useMemo(() => countTotals(count, rates), [count, rates]);
  const diffNio = round2(totals.nio - expectedNio);
  const fxCodes = [...new Set([...Object.keys(expectedFx), ...Object.keys(totals.fx)])];
  const fxDiffs = Object.fromEntries(fxCodes.map((code) => [code, round2((totals.fx[code] || 0) - Number(expectedFx[code]?.expected_qty || 0))]));
  const hasDifference = diffNio !== 0 || Object.values(fxDiffs).some((d) => d !== 0);

  const handleSubmit = async () => {
    setError("");
    if (totals.missingRate) {
      setError(`Hay ${totals.missingCodes.join(", ")} en el conteo pero no hay TC de compra de la institución para hoy.`);
      return;
    }
    if (hasDifference && !notes.trim()) {
      setError("El conteo no cuadra: explique la diferencia en la nota.");
      return;
    }
    let transfer = null;
    if (transferType) {
      const nio = round2(transferNio || 0);
      const amountsFx = transferType === "BOVEDA"
        ? Object.fromEntries(Object.entries(transferFx).map(([code, v]) => [code, round2(v || 0)]).filter(([, v]) => v > 0))
        : {};
      if (!(nio > 0 || Object.keys(amountsFx).length)) {
        setError("Indique el monto a trasladar.");
        return;
      }
      transfer = transferType === "BOVEDA"
        ? { type: "BOVEDA", cash_register_id: transferRegisterId, amount_nio: nio, amounts_fx: amountsFx }
        : { type: "BANCO", bank_account_id: transferBankId, amount_nio: nio };
    }
    setSaving(true);
    try {
      const res = await API.post(`/api/caja/sessions/${session.id}/close`, {
        denominations: toPayload(count),
        notes: notes.trim() || undefined,
        transfer,
      });
      onClosed?.(res.data?.data);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cerrar la caja");
    } finally {
      setSaving(false);
    }
  };

  if (!session) return null;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Cerrar caja — {session.register_name} (turno #{session.id})</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Cuente el efectivo de la caja por denominación. Esperado según el sistema: <strong>{money(expectedNio)}</strong>
          {Object.entries(expectedFx).filter(([, c]) => Number(c.expected_qty)).map(([code, c]) => (
            <span key={code}> + <strong>{money(c.expected_qty, symbolOf(code))}</strong></span>
          ))}.
        </Typography>
        <DenominationCounter value={count} onChange={setCount} currencies={currencies} rates={rates} disabled={saving} />

        <Box sx={{ mt: 2 }}>
          {hasDifference ? (
            <Alert severity={diffNio < 0 || Object.values(fxDiffs).some((d) => d < 0) ? "error" : "warning"} data-testid="close-difference">
              <DiffLine label="Córdobas" diff={diffNio} symbol="C$" />
              {fxCodes.map((code) => <DiffLine key={code} label={code} diff={fxDiffs[code]} symbol={symbolOf(code)} />)}
              <Typography variant="caption">Se registrará contra Faltantes (1909.01) o Sobrantes de caja (2901.01).</Typography>
            </Alert>
          ) : (
            <Alert severity="success">La caja cuadra con el esperado.</Alert>
          )}
        </Box>

        <TextField
          label={hasDifference ? "Nota del cierre (obligatoria por la diferencia)" : "Nota del cierre"}
          fullWidth
          multiline
          minRows={2}
          sx={{ mt: 2 }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          inputProps={{ maxLength: 500 }}
        />

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Traslado del efectivo (opcional)
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="Trasladar a"
              value={transferType}
              onChange={(e) => {
                setTransferType(e.target.value);
                if (e.target.value && !transferNio) setTransferNio(String(totals.nio || ""));
                if (e.target.value === "BOVEDA" && !Object.keys(transferFx).length) {
                  setTransferFx(Object.fromEntries(Object.entries(totals.fx).map(([code, q]) => [code, String(q)])));
                }
              }}
            >
              <MenuItem value="">No trasladar (queda en la caja)</MenuItem>
              <MenuItem value="BOVEDA">Bóveda / otra caja</MenuItem>
              <MenuItem value="BANCO" disabled={!bankAccounts.length}>Banco (depósito en C$)</MenuItem>
            </TextField>
          </Grid>
          {transferType === "BOVEDA" && (
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth size="small" label="Caja de destino" value={transferRegisterId} onChange={(e) => setTransferRegisterId(e.target.value)}>
                {registers.map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          {transferType === "BANCO" && (
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth size="small" label="Cuenta bancaria" value={transferBankId} onChange={(e) => setTransferBankId(e.target.value)}>
                {bankAccounts.map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.bank_name} — {b.account_number}</MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          {transferType && (
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" type="number" label="C$" value={transferNio}
                onChange={(e) => setTransferNio(e.target.value)} inputProps={{ min: 0, step: "0.01" }} />
            </Grid>
          )}
          {transferType === "BOVEDA" && Object.keys(totals.fx).map((code) => (
            <Grid item xs={6} sm={2} key={code}>
              <TextField fullWidth size="small" type="number" label={symbolOf(code)} value={transferFx[code] ?? ""}
                onChange={(e) => setTransferFx({ ...transferFx, [code]: e.target.value })} inputProps={{ min: 0, step: "0.01" }} />
            </Grid>
          ))}
        </Grid>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" color="primary" onClick={handleSubmit} disabled={saving}>
          {saving ? "Cerrando..." : "Cerrar caja"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
