import React from "react";
import {
  Typography,
  Box,
  Alert,
  IconButton,
  Chip,
  Stack,
  Avatar,
} from "@mui/material";
import dayjs from "dayjs";
import CloseIcon from "@mui/icons-material/Close";
import BlockIcon from "@mui/icons-material/Block";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { HeaderBar, HeaderLeft } from "./primitives";
import HelpButton from "../../help/HelpButton";

const LoanHeaderBar = ({ loan, onClose }) => (
  <HeaderBar>
    <HeaderLeft>
      <Avatar sx={{ bgcolor: "rgba(255,255,255,0.15)", width: 34, height: 34 }}>
        <AccountBalanceIcon fontSize="small" />
      </Avatar>

      <Box>
        <Typography variant="caption" sx={{ opacity: 0.9, lineHeight: 1 }}>
          Gestión de Crédito
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
            Detalle de Préstamo
          </Typography>
          <HelpButton screenKey="creditos.detalle" sx={{ color: "white" }} />
        </Box>
      </Box>
    </HeaderLeft>

    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        label={`Crédito #${loan?.id ?? ""}`}
        size="small"
        sx={{
          bgcolor: "rgba(255,255,255,0.18)",
          color: "white",
          fontWeight: 800,
        }}
      />

      <IconButton onClick={onClose} sx={{ color: "white" }} size="small">
        <CloseIcon />
      </IconButton>
    </Stack>
  </HeaderBar>
);

export const CancelledLoanBanner = ({ loanData }) => {
  if (String(loanData?.status || "").toUpperCase() !== "CANCELLED") return null;

  return (
    <Alert severity="error" icon={<BlockIcon />} sx={{ mb: 1.5, fontWeight: 700 }}>
      Solicitud ANULADA
      {loanData?.cancelled_by ? ` por ${loanData.cancelled_by}` : ""}
      {loanData?.cancelled_at
        ? ` el ${dayjs(loanData.cancelled_at).format("DD/MM/YYYY HH:mm")}`
        : ""}
      .
      {loanData?.cancellation_reason
        ? ` Motivo: ${loanData.cancellation_reason}`
        : ""}
    </Alert>
  );
};

export default LoanHeaderBar;
