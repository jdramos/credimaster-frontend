import React, { useEffect, useState } from "react";
import { Alert, Box, Chip, LinearProgress, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import API from "../api";

// Estado de mora, próxima cuota y comportamiento de pago del crédito
// (GET /api/loans/:loanId/payment-profile). Se muestra dentro del
// "Resumen del crédito" de Registrar Pago para que el cajero/cobrador vea de
// un vistazo si el cliente está al día, cuánto debe vencido y cómo paga.

const money = (v) =>
  `C$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dmy = (v) => (v ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : "—");

const DELINQUENCY_COLOR = { AL_DIA: "success", ATRASADO: "warning", EN_MORA: "error" };
const BEHAVIOR_COLOR = { EXCELENTE: "success", BUENO: "success", REGULAR: "warning", MALO: "error", SIN_HISTORIAL: "default" };

const avgDaysText = (avg, hasHistory) => {
  if (!hasHistory) return "—";
  const n = Math.round(Number(avg) * 10) / 10;
  if (n === 0) return "Puntual";
  return n > 0 ? `${n} días tarde` : `${Math.abs(n)} días antes`;
};

const Tile = ({ label, value, sub, helper, tone }) => (
  <div className="bac-tile" style={{ minWidth: 170 }}>
    <div className="bac-tile__top">
      <span className="bac-tile__label">{label}</span>
    </div>
    <Tooltip title={helper || ""} arrow disableHoverListener={!helper}>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: 17,
          lineHeight: 1.2,
          color: tone === "error" ? "error.main" : tone === "warning" ? "warning.dark" : "text.primary",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Tooltip>
    {sub ? (
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
        {sub}
      </Typography>
    ) : null}
  </div>
);

// asOfDate: fecha de corte (estado de cuenta); sin ella, hoy. onLoaded recibe
// el perfil para que el padre lo use en impresión/Excel sin pedirlo dos veces.
export default function LoanPaymentProfile({ loanId, refreshKey, asOfDate, onLoaded }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    if (!loanId) {
      setProfile(null);
      return undefined;
    }
    setLoading(true);
    setError("");
    API.get(`/api/loans/${loanId}/payment-profile`, { params: asOfDate ? { date: asOfDate } : {} })
      .then(({ data }) => {
        if (!mounted) return;
        setProfile(data?.data || null);
        if (onLoaded) onLoaded(data?.data || null);
      })
      .catch((err) => mounted && setError(err?.response?.data?.message || "No se pudo cargar el comportamiento de pago."))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
    // onLoaded se omite a propósito: un callback nuevo en cada render del padre
    // no debe volver a pedir el perfil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId, refreshKey, asOfDate]);

  if (!loanId) return null;
  if (loading) return <Skeleton variant="rounded" height={150} />;
  if (error) return <Alert severity="warning" sx={{ py: 0.5 }}>{error}</Alert>;
  if (!profile) return null;

  const { delinquency: dq, next_installment: next, behavior: bh, loan } = profile;
  const hasHistory = bh.code !== "SIN_HISTORIAL";
  const paidPct = bh.total_installments ? (bh.paid_installments / bh.total_installments) * 100 : 0;

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <Chip size="small" color={DELINQUENCY_COLOR[dq.code] || "default"} label={dq.label} sx={{ fontWeight: 800 }} />
        {dq.portfolio_status_label ? (
          <Chip size="small" variant="outlined" label={`Cartera: ${dq.portfolio_status_label}`} />
        ) : null}
        <Chip
          size="small"
          variant="outlined"
          color={BEHAVIOR_COLOR[bh.code] || "default"}
          label={`Comportamiento: ${bh.label}`}
        />
      </Stack>

      {dq.overdue_installments > 0 ? (
        <Alert severity={dq.code === "EN_MORA" ? "error" : "warning"} sx={{ py: 0.25 }}>
          {dq.overdue_installments} cuota{dq.overdue_installments === 1 ? "" : "s"} vencida
          {dq.overdue_installments === 1 ? "" : "s"} por <b>{money(dq.overdue_amount)}</b>, la más antigua del{" "}
          {dmy(dq.oldest_overdue_date)} ({dq.days_late} días de atraso).
        </Alert>
      ) : null}

      <div className="bac-tiles">
        <Tile
          label="Días de atraso"
          value={dq.days_late}
          sub={dq.overdue_installments ? `${dq.overdue_installments} cuota(s) vencida(s)` : "Sin cuotas vencidas"}
          tone={DELINQUENCY_COLOR[dq.code]}
        />
        <Tile
          label="Próxima cuota"
          value={next ? money(next.amount) : "—"}
          sub={
            next
              ? `#${next.number} · ${dmy(next.date)} · ${next.days_until === 0 ? "vence hoy" : `en ${next.days_until} días`}`
              : "No hay cuotas por vencer"
          }
        />
        <Tile
          label="Pago promedio"
          value={avgDaysText(bh.avg_days, hasHistory)}
          sub={hasHistory ? `${bh.on_time_pct}% a tiempo · peor atraso ${bh.max_days_late} días` : "Aún no ha pagado cuotas"}
          helper="Días entre el vencimiento de cada cuota y la fecha en que se pagó. Las cuotas vencidas sin pagar cuentan con los días que llevan vencidas."
          tone={bh.code === "MALO" ? "error" : bh.code === "REGULAR" ? "warning" : undefined}
        />
        <Tile
          label="Último pago"
          value={bh.last_payment_date ? dmy(bh.last_payment_date) : "Sin pagos"}
          sub={bh.last_payment_date ? `${money(bh.last_payment_amount)} · ${bh.payments_count} pago(s) en total` : null}
        />
      </div>

      <Box sx={{ px: 0.5 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Cuotas pagadas: {bh.paid_installments} de {bh.total_installments}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Capital amortizado: {bh.principal_paid_pct}%
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={paidPct} sx={{ height: 6, borderRadius: 3, mt: 0.25 }} />
      </Box>

      <Typography variant="caption" sx={{ color: "text.secondary", px: 0.5 }}>
        Desembolso {dmy(loan.disbursement_date)} · {money(loan.amount)} ·{" "}
        {loan.interest_fixed_amount != null
          ? `interés fijo ${money(loan.interest_fixed_amount)} (${loan.interest_rate}% mensual)`
          : `${loan.interest_rate}% mensual`}{" "}
        {loan.interest_type.toLowerCase()} · {loan.frequency} · {loan.term_months} meses · vence {dmy(loan.due_date)}
        {loan.collector ? ` · Cobrador: ${loan.collector}` : ""}
      </Typography>
    </Stack>
  );
}
