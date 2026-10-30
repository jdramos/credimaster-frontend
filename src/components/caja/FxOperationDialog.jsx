import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import CustomerSelect from "../Customer/CustomerSelect";
import { money } from "./DenominationCounter";
import { printFxOperationReceipt } from "../../reports/fxOperationReceiptReport";
import AccountingSimulationButton from "../accounting/simulation/AccountingSimulationButton";

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

// Compra o venta de divisas en la caja del turno. La persona siempre queda
// identificada (cliente o nombre + identificación) y pasa por el tamizaje de
// listas en el backend antes de operar.
//   COMPRA: la institución recibe la divisa y entrega C$ al TC de compra.
//   VENTA:  la institución recibe C$ y entrega la divisa al TC de venta.
export default function FxOperationDialog({ open, session, currencies = [], rates, onClose }) {
  const { tenant } = useAuth() || {};
  const [type, setType] = useState("COMPRA");
  const [currencyCode, setCurrencyCode] = useState("");
  const [amount, setAmount] = useState("");
  const [isCustomer, setIsCustomer] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [personName, setPersonName] = useState("");
  const [personId, setPersonId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => {
    setType("COMPRA");
    setCurrencyCode(currencies.find((c) => rates?.[c.code])?.code || currencies[0]?.code || "");
    setAmount("");
    setIsCustomer(false);
    setCustomerId("");
    setPersonName("");
    setPersonId("");
    setError("");
    setResult(null);
  };

  useEffect(() => {
    if (open) reset();
    // Solo al abrir el diálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const currency = currencies.find((c) => c.code === currencyCode) || null;
  const rate = type === "COMPRA" ? rates?.[currencyCode]?.buy_rate : rates?.[currencyCode]?.sell_rate;
  const nio = rate && Number(amount) > 0 ? round2(Number(amount) * rate) : 0;
  const available = session?.totals?.currencies?.[currencyCode]?.expected_qty || 0;

  // Cuerpo de la operación; la simulación contable manda lo mismo.
  const buildFxPayload = () => ({
    operation_type: type,
    currency_code: currency?.code,
    fx_amount: round2(amount),
    customer_id: isCustomer ? customerId : undefined,
    person_name: isCustomer ? undefined : personName.trim(),
    person_identification: isCustomer ? undefined : personId.trim(),
  });

  const submit = async () => {
    setError("");
    if (!currency) return setError("Elija la moneda.");
    if (!rate) return setError(`No hay TC de ${type === "COMPRA" ? "compra" : "venta"} de ${currency.code} para hoy.`);
    if (!(Number(amount) > 0)) return setError("Indique el monto.");
    if (isCustomer ? !customerId : !personName.trim() || !personId.trim()) {
      return setError("Identifique a la persona: nombre e identificación (o elija el cliente).");
    }
    setSaving(true);
    try {
      const res = await API.post(`/api/caja/sessions/${session.id}/fx-operations`, buildFxPayload());
      setResult({ ...res.data?.data, currency_name: currency.name });
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo registrar la operación");
    } finally {
      setSaving(false);
    }
  };

  const print = () =>
    printFxOperationReceipt({ company: tenant, user: JSON.parse(localStorage.getItem("user") || "{}"), session, operation: result });

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Compra / venta de divisas — {session?.register_name}</DialogTitle>
      <DialogContent dividers>
        {result ? (
          <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }} data-testid="fx-result">
            <Typography variant="overline">Entregue al cliente</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {result.operation_type === "COMPRA" ? money(result.nio_amount) : money(result.fx_amount, result.currency_symbol)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {result.operation_type === "COMPRA"
                ? `Recibió ${money(result.fx_amount, result.currency_symbol)} a ${Number(result.rate).toFixed(4)}`
                : `Recibió ${money(result.nio_amount)} a ${Number(result.rate).toFixed(4)}`}
              {" · "}{result.person_name}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <ToggleButtonGroup exclusive fullWidth size="small" value={type} onChange={(e, v) => v && setType(v)}>
                <ToggleButton value="COMPRA">Comprar divisas (cliente vende)</ToggleButton>
                <ToggleButton value="VENTA">Vender divisas (cliente compra)</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={4}>
              <TextField select fullWidth size="small" label="Moneda" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
                {currencies.map((c) => <MenuItem key={c.code} value={c.code}>{c.code} — {c.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={8}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label={`Monto en ${currency?.code || "divisa"}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputProps={{ min: 0, step: "0.01" }}
                InputProps={{ startAdornment: <InputAdornment position="start">{currency?.symbol || "—"}</InputAdornment> }}
                helperText={
                  rate
                    ? `TC de ${type === "COMPRA" ? "compra" : "venta"} ${Number(rate).toFixed(4)}${type === "VENTA" ? ` · en caja: ${money(available, currency?.symbol)}` : ""}`
                    : `Sin TC de ${type === "COMPRA" ? "compra" : "venta"} del día para ${currency?.code || "esta moneda"}`
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info" data-testid="fx-equivalent">
                {type === "COMPRA"
                  ? <>El cliente entrega {money(amount || 0, currency?.symbol)} y recibe <strong>{money(nio)}</strong>.</>
                  : <>El cliente paga <strong>{money(nio)}</strong> y recibe {money(amount || 0, currency?.symbol)}.</>}
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <ToggleButtonGroup exclusive size="small" value={isCustomer ? "C" : "P"} onChange={(e, v) => v && setIsCustomer(v === "C")}>
                <ToggleButton value="P">Persona</ToggleButton>
                <ToggleButton value="C">Cliente registrado</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            {isCustomer ? (
              <Grid item xs={12}>
                <CustomerSelect name="customer_id" size="small" fullWidth value={customerId} onChange={(e) => setCustomerId(e?.target?.value || "")} />
              </Grid>
            ) : (
              <>
                <Grid item xs={12} sm={7}>
                  <TextField fullWidth size="small" label="Nombre completo" value={personName} onChange={(e) => setPersonName(e.target.value)} inputProps={{ maxLength: 150 }} />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField fullWidth size="small" label="Identificación" value={personId} onChange={(e) => setPersonId(e.target.value)} inputProps={{ maxLength: 40 }} />
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                La persona se compara con las listas de riesgo (OFAC/ONU) antes de operar, y la operación cuenta para el RTE de la UAF.
              </Typography>
            </Grid>
          </Grid>
        )}
        {error && <Box sx={{ mt: 2 }}><Alert severity="error">{error}</Alert></Box>}
      </DialogContent>
      <DialogActions>
        {result ? (
          <>
            <Button startIcon={<PrintIcon />} onClick={print}>Imprimir comprobante</Button>
            <Button onClick={reset}>Otra operación</Button>
            <Button variant="contained" onClick={onClose}>Cerrar</Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving}>Cancelar</Button>
            <AccountingSimulationButton
              request={() => (currency && Number(amount) > 0 ? { method: "post", url: `/api/caja/sessions/${session.id}/fx-operations`, data: buildFxPayload() } : null)}
              disabled={saving}
            />
            <Button variant="contained" onClick={submit} disabled={saving}>
              {saving ? "Registrando..." : type === "COMPRA" ? "Registrar compra" : "Registrar venta"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
