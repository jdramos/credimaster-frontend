import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PaymentsIcon from "@mui/icons-material/Payments";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import CloseIcon from "@mui/icons-material/Close";
import BoltIcon from "@mui/icons-material/Bolt";
import FlagCircleIcon from "@mui/icons-material/FlagCircle";
import GavelIcon from "@mui/icons-material/Gavel";
import { NumericFormat } from "react-number-format";
import dayjs from "dayjs";
import API from "../../api";

const money = (v) =>
  Number(v || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

const EMPTY_APPLIED = {
  interest: 0,
  defaulted_interest: 0,
  insurance: 0,
  fee: 0,
  other_charges: 0,
  principal: 0,
};

// Mismo orden de aplicación que usa el backend (computePaymentAllocation):
// interés → moratorio → seguro/comisión/otros cargos de la cuota vigente →
// capital. Se muestra en ese orden para que la barra visual coincida
// exactamente con lo que el backend va a hacer.
const ALLOCATION_SEGMENTS = [
  { key: "interest", label: "Interés corriente", color: "#F59E0B" },
  { key: "defaulted_interest", label: "Interés moratorio", color: "#DC2626" },
  { key: "insurance", label: "Seguro", color: "#8B5CF6" },
  { key: "fee", label: "Comisión", color: "#0EA5E9" },
  { key: "other_charges", label: "Otros cargos", color: "#64748B" },
  { key: "principal", label: "Capital", color: "#059669" },
];

const METHOD_ICON_BY_NAME = {
  efectivo: LocalAtmIcon,
  cheque: ReceiptLongIcon,
  transferencia: SwapHorizIcon,
  "depósito": AccountBalanceIcon,
  deposito: AccountBalanceIcon,
};

// Keyframes inyectados como <style> plano en vez de usar el helper
// `keyframes` de @emotion/react: ese helper solo registra la regla en el
// stylesheet cuando el nombre serializado pasa por un componente procesado
// por emotion (sx, styled, css) — usarlo dentro de un `style={{}}` nativo
// de React (como en los <circle>/<path> del check de éxito) nunca inserta
// la regla @keyframes real, así que la animación no correría.
const QUICK_PAYMENT_KEYFRAMES = `
  @keyframes qpDrawIn { to { stroke-dashoffset: 0; } }
  @keyframes qpPopIn {
    0% { transform: scale(0.7); opacity: 0; }
    60% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); }
  }
`;

const ProgressRing = ({ percent, size = 58, stroke = 6, color = "#fff", track = "rgba(255,255,255,0.25)" }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <Box
        sx={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
          fontSize: 12, fontWeight: 900, color,
        }}
      >
        {Math.round(clamped)}%
      </Box>
    </Box>
  );
};

const SuccessCheck = () => (
  <Box sx={{ display: "grid", placeItems: "center", py: 3, animation: "qpPopIn 0.35s ease" }}>
    <style>{QUICK_PAYMENT_KEYFRAMES}</style>
    <svg width={92} height={92} viewBox="0 0 96 96">
      <circle
        cx="48" cy="48" r="42" fill="none" stroke="#059669" strokeWidth="4"
        pathLength="1" strokeDasharray="1" strokeDashoffset="1"
        style={{ animation: "qpDrawIn 0.5s ease forwards" }}
      />
      <path
        d="M28 50 L42 64 L70 34" fill="none" stroke="#059669" strokeWidth="6"
        strokeLinecap="round" strokeLinejoin="round"
        pathLength="1" strokeDasharray="1" strokeDashoffset="1"
        style={{ animation: "qpDrawIn 0.4s 0.45s ease forwards" }}
      />
    </svg>
  </Box>
);

// Modal enfocado en UN crédito ya identificado (se abre desde el detalle del
// crédito) — a diferencia de PaymentForm.jsx (que también sirve para elegir
// cliente/crédito desde cero), aquí no hay nada que seleccionar: solo monto
// y forma de pago. Reutiliza exactamente el mismo contrato de backend
// (POST /api/payments, POST /api/payments/simulate) para no divergir del
// cálculo real de aplicación del pago.
export default function QuickPaymentModal({ open, onClose, onSuccess, loan }) {
  const loanBase = loan?.data || loan || {};
  const loanId = loanBase.id || loanBase.loan_id || loanBase.credit_id;

  const [loanFull, setLoanFull] = useState(null);
  const [loadingLoan, setLoadingLoan] = useState(true);

  const [formasPago, setFormasPago] = useState([]);
  const [methodId, setMethodId] = useState("");

  const [amount, setAmount] = useState("");
  const [applied, setApplied] = useState(EMPTY_APPLIED);
  const [simulating, setSimulating] = useState(false);
  const [simulateError, setSimulateError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "error" });

  useEffect(() => {
    if (!open) return;

    setAmount("");
    setApplied(EMPTY_APPLIED);
    setSimulateError("");
    setSubmitError("");
    setSuccess(null);
    setMethodId("");
    setLoadingLoan(true);

    API.get("/api/payments/formas-pago")
      .then((res) => {
        const rows = res.data?.data || [];
        setFormasPago(rows);
        const def = rows.find((r) => Number(r.is_default) === 1);
        if (def) setMethodId(def.id);
      })
      .catch(() => setFormasPago([]));

    const customerId = loanBase.customer_id;
    if (customerId && loanId) {
      API.get(`/api/loans/customer/${customerId}`)
        .then((res) => {
          const rows = res.data || [];
          const full = rows.find((l) => Number(l.id) === Number(loanId));
          setLoanFull(full || loanBase);
        })
        .catch(() => setLoanFull(loanBase))
        .finally(() => setLoadingLoan(false));
    } else {
      setLoanFull(loanBase);
      setLoadingLoan(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loanId]);

  const paymentAmount = Number(amount || 0);

  useEffect(() => {
    if (!loanId || !paymentAmount || paymentAmount <= 0) {
      setApplied(EMPTY_APPLIED);
      setSimulateError("");
      return;
    }

    const t = setTimeout(async () => {
      try {
        setSimulating(true);
        setSimulateError("");
        const res = await API.post("/api/payments/simulate", {
          params: {
            loan_id: loanId,
            payment_date: dayjs().format("YYYY-MM-DD"),
            payment_amount: paymentAmount,
          },
        });
        setApplied(res.data?.applied || EMPTY_APPLIED);
      } catch (err) {
        setSimulateError(err.response?.data?.error || err.response?.data?.message || "No se pudo calcular la aplicación del pago.");
        setApplied(EMPTY_APPLIED);
      } finally {
        setSimulating(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [loanId, paymentAmount]);

  const balanceTotal = useMemo(() => {
    if (!loanFull) return 0;
    return round2(
      Number(loanFull.capital_balance || 0) +
        Number(loanFull.interest_balance || 0) +
        Number(loanFull.defaulted_interest || 0) +
        Number(loanFull.insurance_balance || 0) +
        Number(loanFull.fee_balance || 0) +
        Number(loanFull.other_charges_balance || 0),
    );
  }, [loanFull]);

  const approvedAmount = Number(loanFull?.approved_amount || loanFull?.amount || 0);
  const capitalBalance = Number(loanFull?.capital_balance || 0);
  const paidPercent = approvedAmount > 0
    ? ((approvedAmount - capitalBalance + Math.min(applied.principal, capitalBalance)) / approvedAmount) * 100
    : 0;

  const defaultedDays = Number(loanFull?.defaulted_days || 0);
  const defaultedInterest = Number(loanFull?.defaulted_interest || 0);
  const todayTotal = Number(loanFull?.today_total_payment || 0);

  const segments = ALLOCATION_SEGMENTS
    .map((s) => ({ ...s, value: Number(applied[s.key] || 0) }))
    .filter((s) => s.value > 0.004);
  const appliedTotal = segments.reduce((sum, s) => sum + s.value, 0);

  const quickChips = [
    todayTotal > 0.004 && { label: `Cuota de hoy · C$${money(todayTotal)}`, value: todayTotal, icon: <FlagCircleIcon fontSize="small" /> },
    defaultedDays > 0 && defaultedInterest > 0.004 && { label: `Solo mora · C$${money(defaultedInterest)}`, value: defaultedInterest, icon: <GavelIcon fontSize="small" /> },
    balanceTotal > 0.004 && { label: `Cancelar todo · C$${money(balanceTotal)}`, value: balanceTotal, icon: <BoltIcon fontSize="small" /> },
  ].filter(Boolean);

  const handleSubmit = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      setSubmitError("Ingrese un monto mayor a cero.");
      return;
    }
    if (!methodId) {
      setSubmitError("Seleccione una forma de pago.");
      return;
    }

    const branchId = loanFull?.branch_id || loanBase.branch_id;
    if (!branchId) {
      setSubmitError("Este crédito no tiene sucursal asignada.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError("");
      const res = await API.post("/api/payments", {
        params: {
          loan_id: loanId,
          branch_id: branchId,
          payment_date: dayjs().format("YYYY-MM-DD"),
          payment_amount: paymentAmount,
          payment_method_id: Number(methodId),
        },
      });

      setSuccess(res.data);
      setTimeout(() => onSuccess?.(res.data), 1300);
    } catch (error) {
      setSnackbar({
        open: true,
        severity: "error",
        message: error.response?.data?.error || error.response?.data?.message || "Error al registrar el pago",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const customerName = loanFull?.customer_name || loanBase.customer_name || loanBase.full_name || "";

  return (
    <>
      <Dialog
        open={open}
        onClose={submitting ? undefined : onClose}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
      >
        <Box
          sx={{
            px: 3, py: 2.5,
            background: "linear-gradient(135deg, #059669 0%, #0D9488 100%)",
            color: "#fff",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <ProgressRing percent={loadingLoan ? 0 : paidPercent} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1 }}>
                Crédito #{loanId}
              </Typography>
              <Typography variant="h6" fontWeight={900} noWrap>
                {customerName || "Registrar pago"}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                Capital pagado hasta ahora
              </Typography>
            </Box>
          </Stack>
        </Box>

        <DialogContent sx={{ p: 2.5, background: "#F8FAFC" }}>
          {loadingLoan ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress size={28} />
            </Box>
          ) : success ? (
            <Box textAlign="center">
              <SuccessCheck />
              <Typography variant="h6" fontWeight={900} color="#059669">
                ¡Pago registrado!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                C$ {money(paymentAmount)} aplicados al crédito #{loanId}
              </Typography>
              {success.loan?.status === "CANCELLED" && (
                <Chip
                  label="Crédito cancelado en su totalidad"
                  color="success"
                  sx={{ mt: 1.5, fontWeight: 800 }}
                />
              )}
            </Box>
          ) : (
            <Stack spacing={2}>
              {defaultedDays > 0 && (
                <Alert severity="warning" icon={<GavelIcon fontSize="small" />} sx={{ borderRadius: 2 }}>
                  <strong>{defaultedDays} día{defaultedDays === 1 ? "" : "s"} en mora</strong>
                  {defaultedInterest > 0.004 && <> · interés moratorio: C$ {money(defaultedInterest)}</>}
                </Alert>
              )}

              {submitError && <Alert severity="error" sx={{ borderRadius: 2 }}>{submitError}</Alert>}

              <Box>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
                  Accesos rápidos
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {quickChips.map((c) => (
                    <Chip
                      key={c.label}
                      icon={c.icon}
                      label={c.label}
                      onClick={() => setAmount(c.value)}
                      variant={Number(amount) === c.value ? "filled" : "outlined"}
                      color={Number(amount) === c.value ? "success" : "default"}
                      sx={{ fontWeight: 700, borderRadius: 2 }}
                    />
                  ))}
                  {quickChips.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Sin sugerencias — ingrese el monto manualmente.
                    </Typography>
                  )}
                </Stack>
              </Box>

              <NumericFormat
                customInput={TextField}
                label="Monto a pagar"
                value={amount}
                onValueChange={(v) => setAmount(v.floatValue || "")}
                thousandSeparator="," decimalSeparator="." decimalScale={2} fixedDecimalScale
                allowNegative={false}
                fullWidth autoFocus
                InputProps={{ startAdornment: <Typography sx={{ mr: 0.5, color: "text.secondary" }}>C$</Typography> }}
              />

              <Box>
                <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
                  Forma de pago
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {formasPago.map((f) => {
                    const Icon = METHOD_ICON_BY_NAME[String(f.name).toLowerCase()] || PaymentsIcon;
                    const isSelected = Number(methodId) === Number(f.id);
                    return (
                      <Box
                        key={f.id}
                        onClick={() => setMethodId(f.id)}
                        sx={{
                          cursor: "pointer",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          gap: 0.5, width: 78, height: 66, borderRadius: 3,
                          border: isSelected ? "2px solid #059669" : "1px solid #E2E8F0",
                          background: isSelected ? "#ECFDF5" : "#fff",
                          color: isSelected ? "#059669" : "#64748B",
                          transition: "all 0.15s ease",
                          "&:hover": { borderColor: "#059669" },
                        }}
                      >
                        <Icon fontSize="small" />
                        <Typography variant="caption" fontWeight={700} noWrap sx={{ maxWidth: 70, textAlign: "center" }}>
                          {f.name}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              {paymentAmount > 0 && (
                <Box sx={{ border: "1px solid #E2E8F0", borderRadius: 3, overflow: "hidden", background: "#fff" }}>
                  <Box sx={{ px: 2, py: 1.2, background: "#F1F5F9" }}>
                    <Typography variant="caption" fontWeight={800} color="text.secondary">
                      Cómo se aplicará el pago
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, opacity: simulating ? 0.55 : 1, transition: "opacity 0.2s" }}>
                    {simulateError ? (
                      <Alert severity="error" sx={{ borderRadius: 2 }}>{simulateError}</Alert>
                    ) : (
                      <>
                        <Box sx={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", background: "#F1F5F9", mb: 1.5 }}>
                          {segments.map((s) => (
                            <Box
                              key={s.key}
                              sx={{
                                width: appliedTotal > 0 ? `${(s.value / appliedTotal) * 100}%` : 0,
                                background: s.color,
                                transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
                              }}
                            />
                          ))}
                        </Box>

                        <Stack spacing={0.6}>
                          {segments.map((s) => (
                            <Stack key={s.key} direction="row" alignItems="center" spacing={1}>
                              <Box sx={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                              <Typography variant="body2" sx={{ flex: 1 }} color="text.secondary">{s.label}</Typography>
                              <Typography variant="body2" fontWeight={800}>C$ {money(s.value)}</Typography>
                            </Stack>
                          ))}
                          {segments.length === 0 && !simulating && (
                            <Typography variant="body2" color="text.secondary">Ingrese un monto válido para ver la aplicación.</Typography>
                          )}
                        </Stack>
                      </>
                    )}
                  </Box>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>

        {!success && !loadingLoan && (
          <DialogActions sx={{ px: 2.5, py: 1.75, borderTop: "1px solid #E2E8F0", background: "#fff" }}>
            <Button onClick={onClose} disabled={submitting} startIcon={<CloseIcon />} sx={{ fontWeight: 800, borderRadius: 2 }}>
              Cancelar
            </Button>
            <Divider flexItem orientation="vertical" sx={{ mx: "auto" }} />
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || simulating || !paymentAmount}
              startIcon={submitting ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <PaymentsIcon />}
              sx={{
                fontWeight: 900, borderRadius: 2, px: 3,
                background: "#059669",
                "&:hover": { background: "#047857" },
              }}
            >
              {submitting ? "Guardando..." : "Registrar pago"}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((p) => ({ ...p, open: false }))} sx={{ width: "100%", borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
