import React, { useState } from "react";
import {
  Typography,
  Grid,
  CircularProgress,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
} from "@mui/material";
import dayjs from "dayjs";
import API from "../../../api";
import { Muted, CompactAccordion, formatMoney } from "./primitives";

// Historial de pagos aplicados al crédito. Se carga de forma perezosa la
// primera vez que se expande el acordeón para no encarecer la apertura del
// modal.
const LoanPaymentHistorySection = ({ loanId }) => {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);

  const loadPayments = async () => {
    if (!loanId) {
      setPayments([]);
      setSummary(null);
      setLoaded(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await API.get(`/api/payments`, {
        params: { loanId, page: 1, pageSize: 200 },
      });

      setPayments(Array.isArray(res.data?.data) ? res.data.data : []);
      setSummary(res.data?.summary || null);
      setLoaded(true);
    } catch (err) {
      console.error("Error cargando historial de pagos:", err);
      setError(
        err.response?.data?.error || "No se pudo cargar el historial de pagos.",
      );
      setPayments([]);
      setSummary(null);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const rowTotal = (p) =>
    Number(p?.principal_payment || 0) +
    Number(p?.interest_payment || 0) +
    Number(p?.insurance_payment || 0) +
    Number(p?.fee_payment || 0) +
    Number(p?.other_charges_payment || 0) +
    Number(p?.defaulted_interest || 0);

  return (
    <Grid item xs={12}>
      <CompactAccordion
        title="Historial de pagos"
        onChange={(event, expanded) => {
          if (expanded && !loaded && !loading) loadPayments();
        }}
        chip={
          loaded && !error ? (
            <Chip
              label={`Pagos: ${payments.length} — C$ ${formatMoney(
                summary?.total_collected,
              )}`}
              size="small"
              variant="outlined"
              color={payments.length > 0 ? "success" : "default"}
            />
          ) : null
        }
      >
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height={70}
          >
            <CircularProgress size={26} />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !loaded ? (
          <Muted variant="body2">Expande para cargar los pagos.</Muted>
        ) : payments.length === 0 ? (
          <Alert severity="info">
            Este crédito no tiene pagos registrados.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.100" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Fecha</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Capital
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Interés
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Mora
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Seguro
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Comisión
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Otros
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Total
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Forma de pago</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Cobrador</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      {p.payment_date
                        ? dayjs(p.payment_date).format("DD/MM/YYYY")
                        : "—"}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(p.principal_payment)}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(p.interest_payment)}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(p.defaulted_interest)}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(p.insurance_payment)}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(p.fee_payment)}
                    </TableCell>
                    <TableCell align="right">
                      {formatMoney(p.other_charges_payment)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                        {formatMoney(rowTotal(p))}
                      </Typography>
                    </TableCell>
                    <TableCell>{p.forma_pago_name || "—"}</TableCell>
                    <TableCell>{p.collector_name || "—"}</TableCell>
                  </TableRow>
                ))}

                {summary && (
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell sx={{ fontWeight: 800 }}>Totales</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {formatMoney(summary.total_principal)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {formatMoney(summary.total_interest)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {formatMoney(summary.total_defaulted_interest)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {formatMoney(summary.total_insurance)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {formatMoney(summary.total_fee)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {formatMoney(summary.total_other_charges)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {formatMoney(summary.total_collected)}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CompactAccordion>
    </Grid>
  );
};

export default LoanPaymentHistorySection;
