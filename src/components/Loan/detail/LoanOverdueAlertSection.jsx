import React, { useMemo, useState } from "react";
import { Alert, AlertTitle, Box, Button, Collapse, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import dayjs from "dayjs";

const money = (n) =>
  new Intl.NumberFormat("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

// Deriva las cuotas vencidas de la propia tabla de amortización ya cargada
// por useLoanDetailsData (sin fetch nuevo) -- mismo criterio que usa el
// backend para days_overdue/overdue_installments en GET /api/loans/:id
// (payment_number > 0, status distinto de PAID, fecha de cuota ya pasada, y
// saldo pendiente de esa cuota mayor a cero).
function getOverdueRows(amortizationTable) {
  const today = dayjs().format("YYYY-MM-DD");

  return amortizationTable
    .filter((row) => row.paymentNumber > 0 && row.status !== "PAID" && row.paymentDate < today)
    .map((row) => {
      const owedPrincipal = Math.max(row.principal - row.paidPrincipal, 0);
      const owedInterest = Math.max(row.interest - row.paidInterest, 0);
      return { ...row, owedAmount: owedPrincipal + owedInterest };
    })
    .filter((row) => row.owedAmount > 0);
}

const LoanOverdueAlertSection = ({ loanData, amortizationTable = [] }) => {
  const [expanded, setExpanded] = useState(false);

  const overdueRows = useMemo(() => getOverdueRows(amortizationTable), [amortizationTable]);

  const daysOverdue = Number(loanData?.days_overdue || 0);

  if (loanData?.status !== "DISBURSED" || daysOverdue <= 0) return null;

  return (
    <Box sx={{ mb: 1.25 }}>
      <Alert severity="error" variant="filled">
        <AlertTitle sx={{ fontWeight: 900 }}>Crédito en mora</AlertTitle>
        {daysOverdue} día{daysOverdue === 1 ? "" : "s"} de mora — {overdueRows.length} cuota
        {overdueRows.length === 1 ? "" : "s"} vencida{overdueRows.length === 1 ? "" : "s"}
        {loanData?.overdue_amount ? ` — C$ ${money(loanData.overdue_amount)} en mora` : ""}
        {overdueRows.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => setExpanded((v) => !v)}
              sx={{ textTransform: "none" }}
            >
              {expanded ? "Ocultar cuotas en mora" : "Ver cuotas en mora"}
            </Button>
          </Box>
        )}
      </Alert>

      <Collapse in={expanded}>
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell sx={{ fontWeight: 800 }}>Cuota N°</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Fecha</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Monto vencido</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overdueRows.map((row) => (
                <TableRow key={row.paymentNumber}>
                  <TableCell>{row.paymentNumber}</TableCell>
                  <TableCell>{dayjs(row.paymentDate).format("DD/MM/YYYY")}</TableCell>
                  <TableCell align="right">C$ {money(row.owedAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Box>
  );
};

export default LoanOverdueAlertSection;
