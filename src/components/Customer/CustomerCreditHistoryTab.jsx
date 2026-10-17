import React, { useEffect, useState } from "react";
import {
  Alert, Box, Chip, CircularProgress, Grid, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tooltip, Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import VisibilityIcon from "@mui/icons-material/Visibility";
import dayjs from "dayjs";
import API from "../../api";
import LoanDetailsModal from "../Loan/detail/LoanDetailsModal";

// Historial crediticio del cliente: todos sus créditos y su comportamiento de
// pago cuota por cuota. Backend: GET /api/customers/:id/credit-history
// (customerCreditHistoryController.js, donde están las definiciones).

const money = (v) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", maximumFractionDigits: 0 }).format(Number(v || 0));
const pct = (v) => (v == null ? "—" : `${Number(v).toFixed(0)}%`);
const dmy = (v) => (v ? dayjs(v).format("DD/MM/YYYY") : "—");
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const monthYear = (v) => (v ? `${MONTHS[dayjs(v).month()]} de ${dayjs(v).year()}` : "");

const RATING = {
  EXCELENTE: { label: "Excelente", color: "success", text: "Paga a tiempo; nunca se ha atrasado más de 7 días." },
  BUENO: { label: "Bueno", color: "info", text: "Atrasos ocasionales y cortos, nunca mayores a 30 días." },
  REGULAR: { label: "Regular", color: "warning", text: "Ha tenido atrasos de 31 a 90 días." },
  MALO: { label: "Malo", color: "error", text: "Atrasos mayores a 90 días o créditos saneados." },
  SIN_HISTORIAL: { label: "Sin historial", color: "default", text: "Todavía no tiene cuotas vencidas para evaluar." },
};

const STATUS = {
  DISBURSED: { label: "Vigente", color: "primary" },
  CANCELLED: { label: "Cancelado", color: "success" },
  C: { label: "Cancelado", color: "success" },
  WRITTEN_OFF: { label: "Saneado", color: "error" },
  APPROVED: { label: "Aprobado", color: "info" },
  PENDING: { label: "En trámite", color: "warning" },
  DRAFT: { label: "Borrador", color: "default" },
  REJECTED: { label: "Rechazado", color: "default" },
};

// Colores por tramo de atraso (los mismos en la leyenda y en cada cuota).
const useBuckets = () => {
  const t = useTheme();
  return {
    ON_TIME: { label: "A tiempo", color: t.palette.success.main },
    LATE_7: { label: "1 a 7 días", color: t.palette.warning.light },
    LATE_30: { label: "8 a 30 días", color: t.palette.warning.dark },
    LATE_MORE: { label: "Más de 30 días", color: t.palette.error.main },
    FUTURE: { label: "Por vencer", color: "transparent", border: t.palette.text.disabled },
    WRITTEN_OFF: { label: "Saneada", color: t.palette.text.disabled },
  };
};

const installmentTip = (i) => {
  const base = `Cuota ${i.number} · vence ${dmy(i.due_date)} · ${money(i.amount)}`;
  if (i.state === "PAID") return `${base} · pagada ${dmy(i.paid_date)}${i.days_late > 0 ? ` (${i.days_late} días tarde)` : " (a tiempo)"}`;
  if (i.state === "OVERDUE") return `${base} · vencida sin pagar (${i.days_late} días)`;
  if (i.state === "WRITTEN_OFF") return `${base} · crédito saneado`;
  return `${base} · por vencer`;
};

function Stat({ title, value, detail }) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, height: "100%" }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "text.secondary" }}>{title}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
      {detail && <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{detail}</Typography>}
    </Paper>
  );
}

export default function CustomerCreditHistoryTab({ customerId }) {
  const buckets = useBuckets();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [loanModal, setLoanModal] = useState({ open: false, loan: null, guarantees: [], identification: null, loadingId: null });

  useEffect(() => {
    if (!customerId) return undefined;
    let cancelled = false;
    setState({ loading: true, data: null, error: "" });
    API.get(`/api/customers/${customerId}/credit-history`)
      .then((res) => !cancelled && setState({ loading: false, data: res.data?.data || null, error: "" }))
      .catch((err) => !cancelled && setState({ loading: false, data: null, error: err.response?.data?.message || "No se pudo cargar el historial crediticio." }));
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const openLoan = async (loanId) => {
    setLoanModal((m) => ({ ...m, loadingId: loanId }));
    try {
      const [loanRes, guaranteesRes] = await Promise.all([API.get(`/api/loans/${loanId}`), API.get(`/api/guarantees/${customerId}`)]);
      const body = loanRes?.data;
      const loan = Array.isArray(body) ? body[0] : body?.data || body;
      if (loan) setLoanModal({ open: true, loan, guarantees: guaranteesRes.data || [], identification: loan.customer_identification, loadingId: null });
      else setLoanModal((m) => ({ ...m, loadingId: null }));
    } catch {
      setLoanModal((m) => ({ ...m, loadingId: null }));
    }
  };

  if (state.loading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={26} />
      </Box>
    );
  }
  if (state.error) return <Alert severity="error">{state.error}</Alert>;
  if (!state.data) return null;

  const { summary: s, collections: c, loans } = state.data;
  const rating = RATING[s.rating] || RATING.SIN_HISTORIAL;
  const disbursed = loans.filter((l) => l.disbursement_date);

  if (!loans.length) {
    return <Alert severity="info">El cliente todavía no tiene créditos registrados.</Alert>;
  }

  return (
    <Box data-testid="credit-history">
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16 }}>Comportamiento crediticio</Typography>
            <Typography variant="body2" color="text.secondary">
              {s.customer_since
                ? `Cliente desde ${monthYear(s.customer_since)} (${s.months_as_customer} ${s.months_as_customer === 1 ? "mes" : "meses"}). ${rating.text}`
                : rating.text}
            </Typography>
          </Box>
          <Chip label={rating.label} color={rating.color} sx={{ fontWeight: 800, fontSize: 14, px: 1 }} data-testid="credit-rating" />
        </Stack>
      </Paper>

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} md={2}>
          <Stat
            title="Créditos"
            value={s.disbursed_loans}
            detail={`${s.active_loans} vigentes · ${s.paid_off_loans} cancelados${s.written_off_loans ? ` · ${s.written_off_loans} saneados` : ""}${s.in_process_loans ? ` · ${s.in_process_loans} en trámite` : ""}`}
          />
        </Grid>
        <Grid item xs={6} md={2}>
          <Stat title="Total desembolsado" value={money(s.total_disbursed)} />
        </Grid>
        <Grid item xs={6} md={2}>
          <Stat title="Saldo actual" value={money(s.current_balance)} detail={s.current_days_late ? `${s.current_days_late} días de atraso hoy` : "al día"} />
        </Grid>
        <Grid item xs={6} md={2}>
          <Stat title="Puntualidad" value={pct(s.on_time_pct)} detail={`${pct(s.within_7_pct)} con hasta 7 días · ${s.due_installments} cuotas vencidas`} />
        </Grid>
        <Grid item xs={6} md={2}>
          <Stat
            title="Máximo atraso"
            value={`${s.max_days_late} días`}
            detail={s.avg_days_late_when_late ? `${s.avg_days_late_when_late} días en promedio cuando se atrasa` : "nunca se ha atrasado"}
          />
        </Grid>
        <Grid item xs={6} md={2}>
          <Stat
            title="Gestiones de cobro"
            value={c.actions}
            detail={c.promises ? `${c.promises_kept} promesas cumplidas · ${c.promises_broken} incumplidas` : c.last_action_date ? `última ${dmy(c.last_action_date)}` : "sin gestiones"}
          />
        </Grid>
      </Grid>

      {disbursed.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1} sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 800 }}>Comportamiento de pago por cuota</Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {Object.entries(buckets).map(([k, b]) => (
                <Stack key={k} direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: b.color, border: b.border ? `1px solid ${b.border}` : "none" }} />
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{b.label}</Typography>
                </Stack>
              ))}
            </Stack>
          </Stack>
          <Stack spacing={1.25}>
            {disbursed.map((l) => (
              <Stack key={l.id} direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                <Box sx={{ minWidth: 190 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Crédito {l.credit_code}</Typography>
                  <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                    {dmy(l.disbursement_date)} · {money(l.amount)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {l.installments.map((i) => {
                    const b = buckets[i.bucket] || buckets.FUTURE;
                    return (
                      <Tooltip key={i.number} title={installmentTip(i)} arrow>
                        <Box
                          data-bucket={i.bucket}
                          sx={{ width: 16, height: 16, borderRadius: 0.75, bgcolor: b.color, border: b.border ? `1px solid ${b.border}` : "none", cursor: "default" }}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {["Crédito", "Estado", "Desembolso", "Monto", "Plazo", "Tasa", "Saldo", "Cuotas", "Puntualidad", "Máx. atraso", "Clasif.", "Cierre", ""].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 800, whiteSpace: "nowrap", bgcolor: "action.hover" }} align={["Monto", "Saldo", "Tasa", "Puntualidad", "Máx. atraso"].includes(h) ? "right" : "left"}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loans.map((l) => {
              const st = STATUS[l.status] || { label: l.status, color: "default" };
              const b = l.behavior;
              return (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{l.credit_code}</TableCell>
                  <TableCell><Chip size="small" label={st.label} color={st.color} variant={st.color === "default" ? "outlined" : "filled"} /></TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{l.disbursement_date ? dmy(l.disbursement_date) : `Solicitud ${dmy(l.request_date)}`}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{money(l.amount)}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{l.term} {l.frequency ? `· ${l.frequency}` : ""}</TableCell>
                  <TableCell align="right">{l.interest_rate == null ? "—" : `${l.interest_rate}%`}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{l.status === "WRITTEN_OFF" ? `${money(l.writeoff_amount)} saneado` : money(l.balance)}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{b ? `${b.paid_installments}/${b.installments}${b.overdue_installments ? ` (${b.overdue_installments} vencidas)` : ""}` : "—"}</TableCell>
                  <TableCell align="right">{b ? pct(b.on_time_pct) : "—"}</TableCell>
                  <TableCell align="right">{b ? `${b.max_days_late} d` : "—"}</TableCell>
                  <TableCell>{l.classification || "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {l.writeoff_date ? `Saneado ${dmy(l.writeoff_date)}` : l.cancellation_date ? `Cancelado ${dmy(l.cancellation_date)}` : "—"}
                  </TableCell>
                  <TableCell align="right">
                    {l.disbursement_date && (
                      <Tooltip title="Ver crédito">
                        <span>
                          <IconButton size="small" onClick={() => openLoan(l.id)} disabled={loanModal.loadingId === l.id} aria-label={`Ver crédito ${l.credit_code}`}>
                            {loanModal.loadingId === l.id ? <CircularProgress size={16} /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {loanModal.open && loanModal.loan && (
        <LoanDetailsModal
          open={loanModal.open}
          loan={loanModal.loan}
          guarantees={loanModal.guarantees}
          loading={false}
          clientId={customerId}
          clientIdentification={loanModal.identification}
          onClose={() => setLoanModal({ open: false, loan: null, guarantees: [], identification: null, loadingId: null })}
        />
      )}
    </Box>
  );
}
