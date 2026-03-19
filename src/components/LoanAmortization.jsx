import React from "react";
import { styled } from "@mui/material/styles";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

function LoanAmortization({
  amortizationTable = [],
  totalPaymentAmount = 0,
  totalPrincipal = 0,
  totalInterest = 0,
  totalFee = 0,
  totalInsurance = 0,
  totalOtherCharges = 0,
}) {
  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: theme.palette.info.main,
      color: theme.palette.common.white,
      fontWeight: 700,
    },
    [`&.${tableCellClasses.body}`]: {
      fontSize: 14,
    },
  }));

  const safeNumber = (value) => {
    if (value === null || value === undefined || value === "") return 0;

    if (typeof value === "string") {
      const cleaned = value.replace(/,/g, "").trim();
      const parsed = Number(cleaned);
      return Number.isNaN(parsed) ? 0 : parsed;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatNumber = (value) =>
    safeNumber(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDate = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";

    return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString("en-GB");
  };

  return (
    <Paper id="amortization-table" sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <StyledTableCell>Cuota N°</StyledTableCell>
              <StyledTableCell>Fecha Cuota</StyledTableCell>
              <StyledTableCell align="right">Días transcurridos</StyledTableCell>
              <StyledTableCell align="right">Valor Cuota</StyledTableCell>
              <StyledTableCell align="right">Abono principal</StyledTableCell>
              <StyledTableCell align="right">Intereses</StyledTableCell>
              <StyledTableCell align="right">Comisiones</StyledTableCell>
              <StyledTableCell align="right">Seguros</StyledTableCell>
              <StyledTableCell align="right">Otros cargos</StyledTableCell>
              <StyledTableCell align="right">Saldo principal</StyledTableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {amortizationTable.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  No hay datos de amortización.
                </TableCell>
              </TableRow>
            ) : (
              amortizationTable.map((row, index) => (
                <TableRow key={index} hover>
                  <TableCell size="small" sx={{ width: 50 }}>
                    {row.paymentNumber ?? "N/A"}
                  </TableCell>

                  <TableCell sx={{ width: 100 }} size="small">
                    {formatDate(row.paymentDate)}
                  </TableCell>

                  <TableCell size="small" sx={{ width: 90 }} align="right">
                    {safeNumber(row.days).toFixed(2)}
                  </TableCell>

                  <TableCell size="small" sx={{ width: 110 }} align="right">
                    {formatNumber(row.paymentAmount)}
                  </TableCell>

                  <TableCell size="small" sx={{ width: 110 }} align="right">
                    {formatNumber(row.principal)}
                  </TableCell>

                  <TableCell size="small" sx={{ width: 110 }} align="right">
                    {formatNumber(row.interest)}
                  </TableCell>

                  <TableCell size="small" sx={{ width: 110 }} align="right">
                    {formatNumber(row.feeByPayment)}
                  </TableCell>

                  <TableCell size="small" sx={{ width: 110 }} align="right">
                    {formatNumber(row.insuranceByPayment)}
                  </TableCell>

                  <TableCell size="small" sx={{ width: 110 }} align="right">
                    {formatNumber(row.otherChargesByPayment)}
                  </TableCell>

                  <TableCell size="small" sx={{ width: 110 }} align="right">
                    {formatNumber(row.remainingBalance)}
                  </TableCell>
                </TableRow>
              ))
            )}

            <TableRow
              sx={{
                position: "sticky",
                bottom: 0,
                backgroundColor: "white",
                "& td": {
                  borderTop: "2px solid",
                  borderTopColor: "divider",
                  fontWeight: 700,
                },
              }}
            >
              <TableCell colSpan={2} align="right">
                Totales:
              </TableCell>

              <TableCell align="right">-</TableCell>

              <TableCell align="right">{formatNumber(totalPaymentAmount)}</TableCell>

              <TableCell align="right">{formatNumber(totalPrincipal)}</TableCell>

              <TableCell align="right">{formatNumber(totalInterest)}</TableCell>

              <TableCell align="right">{formatNumber(totalFee)}</TableCell>

              <TableCell align="right">{formatNumber(totalInsurance)}</TableCell>

              <TableCell align="right">{formatNumber(totalOtherCharges)}</TableCell>

              <TableCell align="right">-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default LoanAmortization;