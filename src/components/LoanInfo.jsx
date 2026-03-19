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

const MetricRow = ({ label, a, b, c }) => (
  <TableRow hover>
    <TableCell sx={{ fontWeight: 800 }}>{label}</TableCell>
    <TableCell align="right">
      <Money value={a} />
    </TableCell>
    <TableCell align="right">
      <Money value={b} />
    </TableCell>
    <TableCell align="right">
      <Money value={c} />
    </TableCell>
  </TableRow>
);

const LoanInfo = ({ clientId }) => {
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!clientId) {
      setLoan(null);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const res = await API.get(`/api/loans/customer/${clientId}`);
        const validLoans = Array.isArray(res.data) ? res.data.filter((l) => Number(l?.id) > 0) : [];
        if (mounted) setLoan(validLoans[0] ?? {});
      } catch (err) {
        console.error("Error loading loans", err);
        if (mounted) setLoan({});
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [clientId]);

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

    return { currentTotal, defaultedTotal, overdueTotal };
  }, [loan]);

  if (!clientId) return null;

  // Loading UI
  if (loading) {
    return (
      <Card variant="outlined" className="bac-loan-card">
        <CardContent sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
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
              <Skeleton variant="rounded" height={78} sx={{ flex: 1, borderRadius: 3 }} />
              <Skeleton variant="rounded" height={78} sx={{ flex: 1, borderRadius: 3 }} />
              <Skeleton variant="rounded" height={78} sx={{ flex: 1, borderRadius: 3 }} />
            </Stack>

            <Skeleton variant="rounded" height={240} sx={{ borderRadius: 3 }} />
          </Stack>
        </CardContent>
      </Card>
    );
  }

  // Empty UI
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
        {/* Header BAC */}
        <div className="bac-loan-card__head">
          <div>
            <Typography variant="subtitle1" className="bac-loan-title">
              Resumen del crédito
            </Typography>
            <div className="bac-loan-subtitle">
              Saldos por concepto · Corriente, Mora y Vencido
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

        <Box sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            {/* Totales */}
            <div className="bac-tiles">
              <SummaryTile
                label="Saldo corriente"
                value={totals?.currentTotal ?? 0}
                helper="Capital + interés + seguro + comisión + otros cargos (corriente)."
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

            {/* Tabla */}
            <TableContainer className="bac-table">
              <Table size="small" className="bac-table">
                <TableHead>
                  <TableRow>
                    <TableCell>Concepto</TableCell>
                    <TableCell align="right">Corriente</TableCell>
                    <TableCell align="right">Mora</TableCell>
                    <TableCell align="right">Vencido</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  <MetricRow
                    label="Capital"
                    a={loan.capital_balance}
                    b={loan.defaulted_capital}
                    c={loan.overdue_capital}
                  />

                  <MetricRow
                    label="Intereses"
                    a={loan.interest_balance}
                    b={0}
                    c={loan.overdue_interest_balance}
                  />

                  <MetricRow
                    label="Interés moratorio"
                    a={0}
                    b={loan.defaulted_interest}
                    c={0}
                  />

                  <MetricRow
                    label="Seguro"
                    a={loan.insurance_balance}
                    b={loan.defaulted_insurance}
                    c={loan.overdue_insurance_balance}
                  />

                  <MetricRow
                    label="Comisión"
                    a={loan.fee_balance}
                    b={loan.defaulted_fee}
                    c={loan.overdue_fee_balance}
                  />

                  <MetricRow
                    label="Otros cargos"
                    a={loan.other_charges_balance}
                    b={loan.defaulted_other_charges}
                    c={loan.overdue_other_charges_balance}
                  />

                  {/* Total */}
                  <TableRow className="bac-table-total">
                    <TableCell>Total</TableCell>
                    <TableCell align="right">
                      <Money value={totals?.currentTotal ?? 0} bold />
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

            {/* Footer */}
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.25 }}>
              <span className="bac-footer">
                Cliente: {loan.customer_name ?? loan.customer_identification ?? "N/D"}
              </span>
              <span className="bac-footer">Crédito ID: {loan.id ?? "N/D"}</span>
            </Stack>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
};

export default LoanInfo;