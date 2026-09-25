import React from "react";
import { Typography, Stepper, Step, StepLabel } from "@mui/material";
import dayjs from "dayjs";

// Historial visual del proceso del crédito (solicitado -> autorizado ->
// desembolsado -> entregado). El paso "activo" se deduce de qué fechas
// existen realmente en el registro (no del status), y si el crédito quedó
// RECHAZADO/ANULADO antes de llegar más lejos, el siguiente paso se marca
// en rojo en vez de gris "pendiente".
const LoanProcessStepper = ({ loan }) => {
  const statusUpper = String(loan?.status || "").toUpperCase();
  const isRejected = statusUpper === "REJECTED";
  const isCancelled = statusUpper === "CANCELLED";

  const steps = [
    { key: "requested", label: "Solicitado", date: loan?.date },
    { key: "approved", label: "Autorizado", date: loan?.approval_date },
    { key: "disbursed", label: "Desembolsado", date: loan?.disbursement_date },
    { key: "delivered", label: "Entregado", date: loan?.delivered_at },
  ];

  let lastReachedIndex = -1;
  steps.forEach((s, i) => {
    if (s.date) lastReachedIndex = i;
  });
  const activeStep = lastReachedIndex + 1;
  const terminalErrorIndex = isRejected || isCancelled ? lastReachedIndex + 1 : -1;

  return (
    <Stepper activeStep={activeStep} alternativeLabel sx={{ py: 0.5 }}>
      {steps.map((s, i) => {
        const hasDate = !!s.date;
        const isTerminalError = i === terminalErrorIndex;
        const caption = hasDate
          ? dayjs(s.date).format("DD/MM/YYYY")
          : isTerminalError
            ? isRejected
              ? "Rechazado"
              : "Anulado"
            : "Pendiente";

        return (
          <Step key={s.key} completed={hasDate}>
            <StepLabel
              error={isTerminalError}
              optional={
                <Typography
                  variant="caption"
                  color={isTerminalError ? "error" : "text.secondary"}
                >
                  {caption}
                </Typography>
              }
            >
              {s.label}
            </StepLabel>
          </Step>
        );
      })}
    </Stepper>
  );
};

export default LoanProcessStepper;
