import React from "react";
import { Chip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";

export default function LoanStatusChip({ status, pendingApprovals = 0 }) {
  const s = String(status || "").toUpperCase();

  if (s === "APROBADO" || s === "APPROVED") {
    return (
      <Chip
        icon={<CheckCircleIcon fontSize="small" />}
        label="Aprobado"
        color="success"
        size="small"
      />
    );
  }

  if (s === "RECHAZADO" || s === "REJECTED") {
    return (
      <Chip
        icon={<CancelIcon fontSize="small" />}
        label="Rechazado"
        color="error"
        size="small"
      />
    );
  }

  return (
    <Chip
      icon={<HourglassEmptyIcon fontSize="small" />}
      label={
        pendingApprovals > 0
          ? `Pendiente (${pendingApprovals})`
          : "Pendiente"
      }
      color="warning"
      size="small"
    />
  );
}