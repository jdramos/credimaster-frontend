import React from "react";
import { Grid } from "@mui/material";
import LoanAmortization from "../../LoanAmortization";
import { CompactAccordion } from "./primitives";

const LoanAmortizationSection = ({
  amortizationTable,
  totalPaymentAmount,
  totalPrincipal,
  totalInterest,
  totalFee,
  totalInsurance,
  totalOtherCharges,
}) => (
  <Grid item xs={12}>
    <CompactAccordion title="Tabla de amortización">
      <LoanAmortization
        amortizationTable={amortizationTable}
        totalPaymentAmount={totalPaymentAmount}
        totalPrincipal={totalPrincipal}
        totalInterest={totalInterest}
        totalFee={totalFee}
        totalInsurance={totalInsurance}
        totalOtherCharges={totalOtherCharges}
      />
    </CompactAccordion>
  </Grid>
);

export default LoanAmortizationSection;
