import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import dayjs from "dayjs";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import CustomerSelect from "../Customer/CustomerSelect";
import LoanInfo from "../LoanInfo";
import { newClientReferenceId } from "../../utils/clientReferenceId";
import { money } from "./DenominationCounter";
import { printTellerReceipt } from "../../reports/tellerReceiptReport";
import AccountingSimulationButton from "../accounting/simulation/AccountingSimulationButton";

const CASH_PAYMENT_METHOD_ID = 1;

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const num = (v) => (v === "" || v == null ? 0 : Number(v));

// Cálculo del recibo de ventanilla; el backend lo repite con los TC de la
// base (cashSessionsService.recordPaymentTenderTx) y es el que vale.
export const computeTender = ({ amount, tenderedNio, tenderedFx, changeFx, buyRate, sellRate }) => {
  const fxIn = num(tenderedFx);
  const fxOut = num(changeFx);
  const received = round2(num(tenderedNio) + (fxIn > 0 ? fxIn * Number(buyRate || 0) : 0));
  const change = round2(received - num(amount));
  const changeFxValue = fxOut > 0 ? round2(fxOut * Number(sellRate || 0)) : 0;
  const changeNio = round2(change - changeFxValue);
  return { received, change, changeFxValue, changeNio };
};

const moneyField = (props) => (
  <TextField
    type="number"
    fullWidth
    size="small"
    inputProps={{ min: 0, step: "0.01" }}
    {...props}
  />
);

// Monto sugerido para un crédito: si tiene cuotas vencidas, todo lo atrasado
// (lo pendiente de esas cuotas + interés moratorio); si está al día, lo que
// falta de la próxima cuota. profile = GET /api/loans/:id/payment-profile.
export const suggestedAmounts = (profile, loan) => {
  const overdue = round2(Number(profile?.delinquency?.overdue_amount || 0) + Number(loan?.defaulted_interest || 0));
  const nextInstallment = round2(Number(profile?.next_installment?.amount || 0));
  return { overdue, nextInstallment, suggested: overdue > 0 ? overdue : nextInstallment };
};

// Recepción de un pago en la caja de ventanilla: monto a aplicar, lo que
// entrega el cliente en C$ y/o una divisa (TC de compra de la institución) y
// el vuelto (C$ y/o esa divisa al TC de venta). Cobra créditos de cualquier
// sucursal. rates: { USD: { buy_rate, sell_rate }, EUR: {...} } del día.
export default function TellerPaymentDialog({ open, session, currencies = [], rates, onClose, onPaid }) {
  const { tenant } = useAuth() || {};
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [loans, setLoans] = useState([]);
  const [loanId, setLoanId] = useState("");
  const [amount, setAmount] = useState("");
  const [tenderedNio, setTenderedNio] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [tenderedFx, setTenderedFx] = useState("");
  const [changeFx, setChangeFx] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const referenceRef = useRef(null);

  const withRate = currencies.filter((c) => rates?.[c.code]?.buy_rate);
  const currency = currencies.find((c) => c.code === currencyCode) || null;
  const buyRate = rates?.[currencyCode]?.buy_rate || null;
  const sellRate = rates?.[currencyCode]?.sell_rate || null;
  const symbol = currency?.symbol || "";

  const reset = () => {
    setCustomerId("");
    setCustomerName("");
    setLoans([]);
    setLoanId("");
    setAmount("");
    setTenderedNio("");
    setCurrencyCode(withRate[0]?.code || "");
    setTenderedFx("");
    setChangeFx("");
    setError("");
    setResult(null);
    setSuggestion(null);
    referenceRef.current = newClientReferenceId();
  };

  useEffect(() => {
    if (open) reset();
    // Solo al abrir el diálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setLoans([]);
    setLoanId("");
    if (!customerId) return;
    API.get(`/api/loans/customer/${customerId}`, { params: { cash_session: 1 } })
      .then((res) => {
        const list = (res.data || []).filter((l) => Number(l.id) > 0);
        setLoans(list);
        if (list.length === 1) setLoanId(list[0].id);
      })
      .catch(() => setError("No se pudieron cargar los créditos del cliente"));
  }, [customerId]);

  const loan = loans.find((l) => Number(l.id) === Number(loanId)) || null;

  // Al elegir el crédito: monto por defecto = lo atrasado o la próxima cuota.
  useEffect(() => {
    setSuggestion(null);
    if (!loan) return undefined;
    let active = true;
    API.get(`/api/loans/${loan.id}/payment-profile`)
      .then((res) => {
        if (!active) return;
        const s = suggestedAmounts(res.data?.data || res.data, loan);
        setSuggestion(s);
        if (s.suggested > 0) setAmount(String(s.suggested));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // Solo al cambiar de crédito; loan se busca por loanId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId, loans]);
  const calc = useMemo(
    () => computeTender({ amount, tenderedNio, tenderedFx, changeFx, buyRate, sellRate }),
    [amount, tenderedNio, tenderedFx, changeFx, buyRate, sellRate],
  );

  const validate = () => {
    if (!loan) return "Elija el crédito.";
    if (!(num(amount) > 0)) return "Indique el monto a aplicar al crédito.";
    if (num(tenderedFx) > 0 && !buyRate) return "No hay TC de compra de la institución para hoy en esa moneda.";
    if (num(changeFx) > 0 && !sellRate) return "No hay TC de venta de la institución para hoy en esa moneda: el vuelto va en córdobas.";
    if (calc.received <= 0) return "Indique cuánto entregó el cliente.";
    if (calc.received < num(amount)) return `Lo entregado (${money(calc.received)}) no alcanza para el pago de ${money(amount)}.`;
    if (calc.changeNio < 0) return "El vuelto en divisa es mayor que el vuelto.";
    return "";
  };

  // Cuerpo del pago; la simulación contable manda lo mismo.
  const buildPaymentParams = (confirmDuplicate = false) => ({
    loan_id: loan.id,
    branch_id: loan.branch_id,
    payment_date: dayjs().format("YYYY-MM-DD"),
    payment_amount: round2(amount),
    payment_method_id: CASH_PAYMENT_METHOD_ID,
    client_reference_id: referenceRef.current,
    confirm_duplicate: confirmDuplicate || undefined,
    tender: {
      tendered_nio: round2(num(tenderedNio)),
      currency_code: num(tenderedFx) > 0 || num(changeFx) > 0 ? currencyCode : undefined,
      tendered_fx: round2(num(tenderedFx)),
      change_fx: round2(num(changeFx)),
    },
  });

  const submit = async (confirmDuplicate = false) => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setSaving(true);
    let retry = false;
    try {
      const res = await API.post("/api/payments", { params: buildPaymentParams(confirmDuplicate) });
      setResult({ ...res.data, loan, customer_name: customerName });
      onPaid?.(res.data);
    } catch (err) {
      const data = err.response?.data || {};
      if (data.code === "POSSIBLE_DUPLICATE") {
        retry = window.confirm(`${data.error}\n\n¿Desea registrar este pago de todas formas?`);
      } else {
        setError(data.error || data.message || "No se pudo registrar el pago");
      }
    } finally {
      setSaving(false);
    }
    if (retry) await submit(true);
  };

  const print = () =>
    printTellerReceipt({
      company: tenant,
      user: JSON.parse(localStorage.getItem("user") || "{}"),
      session,
      result,
    });

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Recibir pago — {session?.register_name}</DialogTitle>
      <DialogContent dividers>
        {result ? (
          <Box data-testid="teller-result">
            <Alert severity="success" sx={{ mb: 2 }}>
              Pago #{result.payment_id} registrado: {money(result.tender?.payment_amount)} al crédito {result.loan?.credit_code || result.loan?.id}.
            </Alert>
            <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="overline">Entregue de vuelto</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }} data-testid="change-to-give">
                {money(result.tender?.change_nio)}
                {Number(result.tender?.change_fx) > 0 && ` + ${money(result.tender.change_fx, result.tender.currency_symbol)}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recibido {money(result.tender?.received_total)}
                {Number(result.tender?.tendered_fx) > 0 && ` (incluye ${money(result.tender.tendered_fx, result.tender.currency_symbol)} a TC ${Number(result.tender.buy_rate).toFixed(4)})`}
              </Typography>
            </Paper>
          </Box>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Stack spacing={2}>
                <CustomerSelect
                  name="customer_id"
                  size="small"
                  fullWidth
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e?.target?.value || "");
                    setCustomerName(e?.target?.customer_name || "");
                  }}
                />
                <TextField select label="Crédito" size="small" fullWidth value={loanId} onChange={(e) => setLoanId(e.target.value)}>
                  {loans.map((l) => (
                    <MenuItem key={l.id} value={l.id}>
                      {l.credit_code || `#${l.id}`} · {money(l.approved_amount)} · {l.branch_name || "Sin sucursal"}
                    </MenuItem>
                  ))}
                </TextField>
                {loan && (
                  <LoanInfo clientId={customerId} loanId={loan.id} paymentAmount={num(amount)} cashSessionMode />
                )}
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <Stack spacing={2}>
                {moneyField({
                  label: "Monto a aplicar al crédito",
                  value: amount,
                  onChange: (e) => setAmount(e.target.value),
                  InputProps: { startAdornment: <InputAdornment position="start">C$</InputAdornment> },
                  helperText: suggestion
                    ? suggestion.overdue > 0
                      ? "Sugerido: todo lo atrasado (cuotas vencidas + interés moratorio)"
                      : "Sugerido: la próxima cuota"
                    : " ",
                })}
                {suggestion && (suggestion.overdue > 0 || suggestion.nextInstallment > 0) && (
                  <Stack direction="row" spacing={1} data-testid="amount-shortcuts">
                    {suggestion.overdue > 0 && (
                      <Chip size="small" color="error" variant="outlined" label={`Atrasado ${money(suggestion.overdue)}`}
                        onClick={() => setAmount(String(suggestion.overdue))} />
                    )}
                    {suggestion.nextInstallment > 0 && (
                      <Chip size="small" color="primary" variant="outlined" label={`Próxima cuota ${money(suggestion.nextInstallment)}`}
                        onClick={() => setAmount(String(suggestion.nextInstallment))} />
                    )}
                  </Stack>
                )}
                <Divider textAlign="left"><Typography variant="caption">El cliente entrega</Typography></Divider>
                {moneyField({
                  label: "Efectivo en córdobas",
                  value: tenderedNio,
                  onChange: (e) => setTenderedNio(e.target.value),
                  InputProps: { startAdornment: <InputAdornment position="start">C$</InputAdornment> },
                })}
                <Stack direction="row" spacing={1}>
                  <TextField
                    select
                    size="small"
                    label="Divisa"
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
                    sx={{ minWidth: 110 }}
                    disabled={!withRate.length}
                  >
                    {withRate.map((c) => <MenuItem key={c.code} value={c.code}>{c.code}</MenuItem>)}
                  </TextField>
                  {moneyField({
                    label: "Efectivo en divisa",
                    value: tenderedFx,
                    onChange: (e) => setTenderedFx(e.target.value),
                    disabled: !buyRate,
                    helperText: buyRate
                      ? `TC de compra ${Number(buyRate).toFixed(4)}${num(tenderedFx) > 0 ? ` = ${money(round2(num(tenderedFx) * buyRate))}` : ""}`
                      : "Sin TC de compra del día: no se reciben divisas",
                    InputProps: { startAdornment: <InputAdornment position="start">{symbol || "—"}</InputAdornment> },
                  })}
                </Stack>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Total recibido</Typography>
                    <Typography variant="body2" data-testid="received-total"><strong>{money(calc.received)}</strong></Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Vuelto</Typography>
                    <Typography variant="body2" color={calc.change < 0 ? "error" : "inherit"} data-testid="change-total">
                      <strong>{calc.change < 0 ? `Faltan ${money(-calc.change)}` : money(calc.change)}</strong>
                    </Typography>
                  </Stack>
                </Paper>
                {calc.change > 0 && (
                  <>
                    {moneyField({
                      label: `Vuelto en ${currencyCode || "divisa"} (opcional)`,
                      value: changeFx,
                      onChange: (e) => setChangeFx(e.target.value),
                      disabled: !sellRate,
                      helperText: sellRate
                        ? `TC de venta ${Number(sellRate).toFixed(4)}${num(changeFx) > 0 ? ` = ${money(calc.changeFxValue)}` : ""}`
                        : "Sin TC de venta del día: el vuelto va en córdobas",
                      InputProps: { startAdornment: <InputAdornment position="start">{symbol || "—"}</InputAdornment> },
                    })}
                    <Alert severity={calc.changeNio < 0 ? "error" : "info"} data-testid="change-breakdown">
                      Entregar {money(Math.max(calc.changeNio, 0))}
                      {num(changeFx) > 0 && ` + ${money(changeFx, symbol)}`}
                    </Alert>
                  </>
                )}
              </Stack>
            </Grid>
          </Grid>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        {result ? (
          <>
            <Button startIcon={<PrintIcon />} onClick={print}>Imprimir recibo</Button>
            <Button onClick={reset}>Otro cobro</Button>
            <Button variant="contained" onClick={onClose}>Cerrar</Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={saving}>Cancelar</Button>
            {/* La simulación no graba: no hace falta el aviso de pago repetido. */}
            <AccountingSimulationButton
              request={() => (validate() ? null : { method: "post", url: "/api/payments", data: { params: buildPaymentParams(true) } })}
              disabled={saving}
            />
            <Button variant="contained" color="success" onClick={() => submit(false)} disabled={saving}>
              {saving ? "Registrando..." : "Registrar pago"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
