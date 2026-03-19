import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const money = (n) =>
  new Intl.NumberFormat("es-NI", {
    style: "currency",
    currency: "NIO",
    minimumFractionDigits: 2,
  }).format(Number(n || 0));

export default function LoanAmortizationModal({
  open,
  onClose,
  rows = [],
  title = "Tabla de amortización",
}) {
  const totals = rows.reduce(
    (acc, row) => {
      const principal = Number(row.payment_principal ?? row.principal ?? 0);
      const interest = Number(row.payment_interest ?? row.interest ?? 0);
      const insurance = Number(row.payment_insurance ?? row.insuranceByPayment ?? 0);
      const fee = Number(row.payment_fee ?? row.feeByPayment ?? 0);
      const other = Number(row.payment_other_charges ?? row.otherChargesByPayment ?? 0);

      acc.principal += principal;
      acc.interest += interest;
      acc.insurance += insurance;
      acc.fee += fee;
      acc.other += other;

      return acc;
    },
    { principal: 0, interest: 0, insurance: 0, fee: 0, other: 0 }
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell align="right">Capital</TableCell>
                <TableCell align="right">Interés</TableCell>
                <TableCell align="right">Seguro</TableCell>
                <TableCell align="right">Comisión</TableCell>
                <TableCell align="right">Otros</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => {
                const principal = Number(row.payment_principal ?? row.principal ?? 0);
                const interest = Number(row.payment_interest ?? row.interest ?? 0);
                const insurance = Number(row.payment_insurance ?? row.insuranceByPayment ?? 0);
                const fee = Number(row.payment_fee ?? row.feeByPayment ?? 0);
                const other = Number(row.payment_other_charges ?? row.otherChargesByPayment ?? 0);
                const total = principal + interest + insurance + fee + other;

                return (
                  <TableRow key={index}>
                    <TableCell>{row.payment_number ?? row.paymentNumber ?? index + 1}</TableCell>
                    <TableCell>{row.payment_date ?? row.paymentDate ?? ""}</TableCell>
                    <TableCell align="right">{money(principal)}</TableCell>
                    <TableCell align="right">{money(interest)}</TableCell>
                    <TableCell align="right">{money(insurance)}</TableCell>
                    <TableCell align="right">{money(fee)}</TableCell>
                    <TableCell align="right">{money(other)}</TableCell>
                    <TableCell align="right">{money(total)}</TableCell>
                  </TableRow>
                );
              })}

              <TableRow sx={{ "& td": { fontWeight: 700 } }}>
                <TableCell colSpan={2}>Totales</TableCell>
                <TableCell align="right">{money(totals.principal)}</TableCell>
                <TableCell align="right">{money(totals.interest)}</TableCell>
                <TableCell align="right">{money(totals.insurance)}</TableCell>
                <TableCell align="right">{money(totals.fee)}</TableCell>
                <TableCell align="right">{money(totals.other)}</TableCell>
                <TableCell align="right">
                  {money(
                    totals.principal +
                      totals.interest +
                      totals.insurance +
                      totals.fee +
                      totals.other
                  )}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );
}