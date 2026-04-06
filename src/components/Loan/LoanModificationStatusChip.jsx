import React from "react";
import { Chip, Tooltip } from "@mui/material";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";

function getStatusUI(status, pendingCount = 0) {
  const s = String(status || "").toUpperCase();

  switch (s) {
    case "PENDING":
      return {
        label: pendingCount > 0 ? `${pendingCount} pendientes` : "Pendiente",
        color: "warning",
        icon: <HourglassTopIcon fontSize="small" />,
        tooltip: "Modificación registrada pendiente de aprobación",
      };
    case "IN_REVIEW":
      return {
        label: pendingCount > 0 ? `${pendingCount} pendientes` : "En revisión",
        color: "info",
        icon: <AutorenewIcon fontSize="small" />,
        tooltip: "Modificación en proceso de aprobación",
      };
    case "APPROVED":
      return {
        label: "Aprobada",
        color: "success",
        icon: <CheckCircleIcon fontSize="small" />,
        tooltip: "Modificación aprobada",
      };
    case "APPLIED":
      return {
        label: "Aplicada",
        color: "success",
        icon: <CheckCircleIcon fontSize="small" />,
        tooltip: "Modificación aplicada al crédito",
      };
    case "REJECTED":
      return {
        label: "Rechazada",
        color: "error",
        icon: <CancelIcon fontSize="small" />,
        tooltip: "Modificación rechazada",
      };
    default:
      return {
        label: "Sin modificación",
        color: "default",
        icon: null,
        tooltip: "No hay modificación registrada",
      };
  }
}

export default function LoanModificationStatusChip({
  status,
  pendingCount = 0,
  size = "small",
}) {
  const ui = getStatusUI(status, pendingCount);

  return (
    <Tooltip title={ui.tooltip}>
      <Chip
        size={size}
        color={ui.color}
        icon={ui.icon}
        label={ui.label}
        variant={ui.color === "default" ? "outlined" : "filled"}
        sx={{ fontWeight: 600 }}
      />
    </Tooltip>
  );
}
