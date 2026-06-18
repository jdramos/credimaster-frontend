import React, { useMemo, useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Skeleton,
  Tooltip,
  IconButton,
  Alert,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { NumericFormat } from "react-number-format";
import API from "../api";

const toMoney = (v) => Number(v || 0);

const Money = ({ value, bold = false }) => (
  <Typography
    component="span"
    sx={{
      fontVariantNumeric: "tabular-nums",
      fontWeight: bold ? 800 : 600,
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
    }}
  >
    <NumericFormat
      value={toMoney(value)}
      displayType="text"
      thousandSeparator=","
      decimalSeparator="."
      decimalScale={2}
      fixedDecimalScale
      prefix="C$"
    />
  </Typography>
);

const SummaryTile = ({ label, value, helper }) => (
  <div className="bac-tile">
    <div className="bac-tile__top">
      <span className="bac-tile__label">{label}</span>

      {helper ? (
        <Tooltip title={helper} arrow>
          <IconButton size="small" className="bac-icon-muted">
            <InfoOutlinedIcon fontSize="inherit" />
          </IconButton>
        </Tooltip>
      ) : null}
    </div>

    <div className="bac-tile__value">
      <Money value={value} bold />
    </div>
  </div>
);

const MetricRow = ({ label, corriente, pagadoHoy, mora, vencido }) => (
  <TableRow hover>
    <TableCell sx={{ fontWeight: 800 }}>{label}</TableCell>
    <TableCell align="right">
      <Money value={corriente} />
    </TableCell>
    <TableCell align="right">
      <Money value={pagadoHoy} />
    </TableCell>
    <TableCell align="right">
      <Money value={mora} />
    </TableCell>
    <TableCell align="right">
      <Money value={vencido} />
    </TableCell>
  </TableRow>
);

const LoanInfo = ({
  clientId,
  loanId,
  refreshKey,
  paymentPreview = null,
  paymentAmount = 0,
}) => {
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let mounted = true;

    if (!clientId) {
      setLoan(null);
      setLoadError("");
      return;
    }

    const loadLoan = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const res = await API.get(`/api/loans/customer/${clientId}`);

        const validLoans = Array.isArray(res.data)
          ? res.data.filter((l) => Number(l?.id) > 0)
          : [];

        const selectedLoan =
          loanId != null
            ? validLoans.find((l) => Number(l.id) === Number(loanId))
            : null;

        if (mounted) {
          setLoan(selectedLoan || validLoans[0] || {});
        }
      } catch (err) {
        console.error("Error loading loan info:", err);

        if (mounted) {
          setLoan({});
          setLoadError(
            err?.response?.data?.error ||
              err?.response?.data?.message ||
              "No se pudo cargar la información del crédito.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadLoan();

    return () => {
      mounted = false;
    };
  }, [clientId, loanId, refreshKey]);

  const totals = useMemo(() => {
    if (!loan || Object.keys(loan).length === 0) return null;

    const currentTotal =
      toMoney(loan.capital_balance) +
      toMoney(loan.interest_balance) +
      toMoney(loan.insurance_balance) +
      toMoney(loan.fee_balance) +
      toMoney(loan.other_charges_balance);

    const defaultedTotal =
      toMoney(loan.defaulted_capital) +
      toMoney(loan.defaulted_interest) +
      toMoney(loan.defaulted_insurance) +
      toMoney(loan.defaulted_fee) +
      toMoney(loan.defaulted_other_charges);

    const overdueTotal =
      toMoney(loan.overdue_capital) +
      toMoney(loan.overdue_interest_balance) +
      toMoney(loan.overdue_insurance_balance) +
      toMoney(loan.overdue_fee_balance) +
      toMoney(loan.overdue_other_charges_balance);

    const todayTotal =
      toMoney(loan.today_total_payment) ||
      toMoney(loan.today_principal_payment) +
        toMoney(loan.today_interest_payment) +
        toMoney(loan.today_defaulted_interest) +
        toMoney(loan.today_insurance_payment) +
        toMoney(loan.today_fee_payment) +
        toMoney(loan.today_other_charges_payment);

    const grandTotal = currentTotal + defaultedTotal + overdueTotal;

    return {
      currentTotal,
      defaultedTotal,
      overdueTotal,
      todayTotal,
      grandTotal,
    };
  }, [loan]);

  const previewTotals = useMemo(() => {
    if (!paymentPreview && !paymentAmount) return null;

    const amount = toMoney(paymentAmount);

    return {
      paymentAmount: amount,
      projectedBalance: Math.max(toMoney(totals?.grandTotal) - amount, 0),
    };
  }, [paymentPreview, paymentAmount, totals]);

  if (!clientId) return null;

  if (loading) {
    return (
      <Card variant="outlined" className="bac-loan-card">
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between">
              <Box>
                <Skeleton variant="text" width={180} height={28} />
                <Skeleton variant="text" width={260} height={18} />
              </Box>
              <Stack direction="row" spacing={1}>
                <Skeleton variant="rounded" width={160} height={28} />
                <Skeleton variant="rounded" width={120} height={28} />
              </Stack>
            </Stack>

            <Divider />

            <Stack direction={{ xs: "column", md: "row" }} spacing={1.25}>
              <Skeleton variant="rounded" height={78} sx={{ flex: 1 }} />
              <Skeleton variant="rounded" height={78} sx={{ flex: 1 }} />
              <Skeleton variant="rounded" height={78} sx={{ flex: 1 }} />
            </Stack>

            <Skeleton variant="rounded" height={240} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card variant="outlined" className="bac-loan-card">
        <CardContent sx={{ p: 2 }}>
          <Alert severity="error">{loadError}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!loan || Object.keys(loan).length === 0) {
    return (
      <Card variant="outlined" className="bac-loan-card">
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography variant="subtitle1" className="bac-loan-title">
              Resumen del crédito
            </Typography>
            <Typography variant="body2" className="bac-loan-subtitle">
              Sin créditos para este cliente.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  const classification = loan.provision_code ?? "N/A";
  const status = loan.loan_status ?? loan.status ?? "N/A";

  return (
    <Card variant="outlined" className="bac-loan-card">
      <CardContent sx={{ p: 0 }}>
        <div className="bac-loan-card__head compact">
          <div>
            <Typography variant="subtitle1" className="bac-loan-title">
              Resumen del crédito
            </Typography>

            <div className="bac-loan-subtitle">
              Crédito: {loan.credit_code ?? loan.id ?? "N/D"} · Cliente:{" "}
              {loan.customer_name ?? loan.customer_identification ?? "N/D"}
            </div>
          </div>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              size="small"
              variant="outlined"
              label={`Clasificación: ${classification}`}
              className="bac-chip bac-chip--outline"
            />
            <Chip
              size="small"
              label={`Estado: ${status}`}
              className="bac-chip bac-chip--solid"
            />
          </Stack>
        </div>

        <Box sx={{ p: 1 }}>
          <Stack spacing={0.75}>
            <div className="bac-tiles">
              <SummaryTile
                label="Saldo corriente"
                value={totals?.currentTotal ?? 0}
                helper="Capital + interés + seguro + comisión + otros cargos corrientes."
              />

              <SummaryTile
                label="Saldo mora"
                value={totals?.defaultedTotal ?? 0}
                helper="Capital en mora + interés moratorio + cargos en mora."
              />

              <SummaryTile
                label="Saldo vencido"
                value={totals?.overdueTotal ?? 0}
                helper="Capital + interés + cargos vencidos."
              />
            </div>

            {previewTotals ? (
              <Alert severity="info" sx={{ py: 0.5 }}>
                Pago ingresado:{" "}
                <Money value={previewTotals.paymentAmount} bold /> · Saldo
                estimado después del pago:{" "}
                <Money value={previewTotals.projectedBalance} bold />
              </Alert>
            ) : null}

            <TableContainer
              className="bac-table"
              sx={{
                maxHeight: 260,
                borderRadius: 1.5,
                "& .MuiTableCell-root": {
                  py: 0.45,
                  px: 0.75,
                  fontSize: 12,
                  lineHeight: 1.15,
                },
                "& .MuiTableHead-root .MuiTableCell-root": {
                  fontSize: 11,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  bgcolor: "grey.100",
                  whiteSpace: "nowrap",
                },
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Concepto</TableCell>
                    <TableCell align="right">Corriente</TableCell>
                    <TableCell align="right">Pagado hoy</TableCell>
                    <TableCell align="right">Mora</TableCell>
                    <TableCell align="right">Vencido</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  <MetricRow
                    label="Capital"
                    corriente={loan.capital_balance}
                    pagadoHoy={loan.today_principal_payment}
                    mora={loan.defaulted_capital}
                    vencido={loan.overdue_capital}
                  />

                  <MetricRow
                    label="Intereses"
                    corriente={loan.interest_balance}
                    pagadoHoy={loan.today_interest_payment}
                    mora={0}
                    vencido={loan.overdue_interest_balance}
                  />

                  <MetricRow
                    label="Interés moratorio"
                    corriente={0}
                    pagadoHoy={loan.today_defaulted_interest}
                    mora={loan.defaulted_interest}
                    vencido={0}
                  />

                  <MetricRow
                    label="Seguro"
                    corriente={loan.insurance_balance}
                    pagadoHoy={loan.today_insurance_payment}
                    mora={loan.defaulted_insurance}
                    vencido={loan.overdue_insurance_balance}
                  />

                  <MetricRow
                    label="Comisión"
                    corriente={loan.fee_balance}
                    pagadoHoy={loan.today_fee_payment}
                    mora={loan.defaulted_fee}
                    vencido={loan.overdue_fee_balance}
                  />

                  <MetricRow
                    label="Otros cargos"
                    corriente={loan.other_charges_balance}
                    pagadoHoy={loan.today_other_charges_payment}
                    mora={loan.defaulted_other_charges}
                    vencido={loan.overdue_other_charges_balance}
                  />

                  <TableRow className="bac-table-total">
                    <TableCell sx={{ fontWeight: 900 }}>Total</TableCell>
                    <TableCell align="right">
                      <Money value={totals?.currentTotal ?? 0} bold />
                    </TableCell>
                    <TableCell align="right">
                      <Money value={totals?.todayTotal ?? 0} bold />
                    </TableCell>
                    <TableCell align="right">
                      <Money value={totals?.defaultedTotal ?? 0} bold />
                    </TableCell>
                    <TableCell align="right">
                      <Money value={totals?.overdueTotal ?? 0} bold />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Stack
              direction="row"
              justifyContent="space-between"
              sx={{ mt: 0.25 }}
            >
              <span className="bac-footer">
                Cliente:{" "}
                {loan.customer_name ?? loan.customer_identification ?? "N/D"}
              </span>

              <span className="bac-footer">
                Crédito: {loan.credit_code ?? loan.id ?? "N/D"}
              </span>

              <span className="bac-footer">
                Total saldo: <Money value={totals?.grandTotal ?? 0} bold />
              </span>
            </Stack>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default LoanInfo;
