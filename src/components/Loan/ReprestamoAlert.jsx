import React from "react";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";

// Alerta de la política de represtamo (peor atraso / créditos saneados; ver
// api/customer/represtamoEligibility.js en el backend). No bloquea la
// solicitud: avisa que irá obligatoriamente a Comité de Crédito.
export default function ReprestamoAlert({ eligibility, sx }) {
  if (!eligibility || eligibility.eligible) return null;
  return (
    <Alert severity="warning" sx={{ mb: 2, borderRadius: 2, ...sx }}>
      <Typography sx={{ fontWeight: 800 }}>
        Cliente no apto para represtamo según la política de crédito
      </Typography>
      <Typography variant="body2">Motivo: {(eligibility.reasons || []).join("; ")}.</Typography>
      <Typography variant="body2">
        La solicitud no se bloquea, pero se enviará obligatoriamente a Comité de Crédito, aunque el monto esté por debajo del
        mínimo de comité.
      </Typography>
    </Alert>
  );
}
