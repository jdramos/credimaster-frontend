import React from "react";
import Chip from "@mui/material/Chip";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CancelIcon from "@mui/icons-material/Cancel";

export default function ApprovalStatusChip({ approvalStatus, pendingApprovals = 0 }) {
  if (approvalStatus === "APPROVED") {
    return (
      <Chip
        size="small"
        color="success"
        icon={<DoneAllIcon />}
        label="Aprobaciones completas"
      />
    );
  }

  if (approvalStatus === "REJECTED") {
    return (
      <Chip
        size="small"
        color="error"
        icon={<CancelIcon />}
        label="Rechazado"
      />
    );
  }

  return (
    <Chip
      size="small"
      color="warning"
      icon={<PendingActionsIcon />}
      label={`Pendientes: ${pendingApprovals || 0}`}
    />
  );
}