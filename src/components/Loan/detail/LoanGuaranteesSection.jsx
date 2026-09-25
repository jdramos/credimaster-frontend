import React from "react";
import { Grid, Chip } from "@mui/material";
import GuaranteesTable from "../../GuranteeTable";
import { CompactAccordion, formatMoney } from "./primitives";

const LoanGuaranteesSection = ({
  currentClientId,
  isReadOnly,
  guaranteesTotal,
  onTotalChange,
}) => (
  <Grid item xs={12}>
    <CompactAccordion
      title="Garantías"
      chip={
        <Chip
          label={`Total: C$ ${formatMoney(guaranteesTotal)}`}
          size="small"
          color={guaranteesTotal > 0 ? "success" : "default"}
          variant={guaranteesTotal > 0 ? "filled" : "outlined"}
          sx={{ fontWeight: 900 }}
        />
      }
    >
      <GuaranteesTable
        customerId={currentClientId}
        readOnly={isReadOnly}
        onTotalChange={onTotalChange}
      />
    </CompactAccordion>
  </Grid>
);

export default LoanGuaranteesSection;
