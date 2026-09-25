import React from "react";
import { Button, Typography, Grid } from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import { CompactAccordion } from "./primitives";

const LoanAdjudicationSection = ({ loanId, loanData, onOpenAdjudication }) => {
  if (!(loanId && loanData?.status === "DISBURSED")) return null;

  return (
    <Grid item xs={12}>
      <CompactAccordion title="Adjudicación de Bienes">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Registra la toma de posesión de un bien en cancelación total o parcial
          de este crédito (dación en pago o adjudicación judicial). Solo aplica a
          créditos en cartera vencida o cobro judicial — la elegibilidad la valida
          el sistema al guardar.
        </Typography>

        <Button
          variant="outlined"
          startIcon={<GavelIcon />}
          onClick={onOpenAdjudication}
        >
          Adjudicar Bien
        </Button>
      </CompactAccordion>
    </Grid>
  );
};

export default LoanAdjudicationSection;
