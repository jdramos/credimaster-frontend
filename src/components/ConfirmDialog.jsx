import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";

import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const dialogTypes = {
  warning: {
    icon: <WarningAmberIcon />,
    color: "#F57C00",
    gradient: "linear-gradient(135deg, #0057B8, #003E8A)",
  },
  success: {
    icon: <CheckCircleOutlineIcon />,
    color: "#2E7D32",
    gradient: "linear-gradient(135deg, #2E7D32, #1B5E20)",
  },
  error: {
    icon: <ErrorOutlineIcon />,
    color: "#D32F2F",
    gradient: "linear-gradient(135deg, #D32F2F, #9A2424)",
  },
  info: {
    icon: <InfoOutlinedIcon />,
    color: "#0057B8",
    gradient: "linear-gradient(135deg, #0057B8, #003E8A)",
  },
};

const ConfirmDialog = ({
  open,
  type = "warning",
  title = "Confirmar acción",
  message = "¿Estás seguro de continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onClose,
  onConfirm,
  loading = false,
  hideCancel = false,
}) => {
  const config = dialogTypes[type] || dialogTypes.warning;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.25)",
        },
      }}
    >
      <Box
        sx={{
          height: 7,
          background: config.gradient,
        }}
      />

      <DialogTitle sx={{ textAlign: "center", pt: 3, pb: 1 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            mx: "auto",
            mb: 1.5,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: `${config.color}14`,
            color: config.color,
            "& svg": {
              fontSize: 42,
            },
          }}
        >
          {config.icon}
        </Box>

        <Typography variant="h6" fontWeight={800}>
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ textAlign: "center", px: 4 }}>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          pb: 3,
          pt: 2,
          justifyContent: hideCancel ? "center" : "space-between",
          gap: 1.5,
        }}
      >
        {!hideCancel && (
          <Button
            fullWidth
            onClick={onClose}
            variant="outlined"
            color="inherit"
            disabled={loading}
            sx={{
              borderRadius: 2,
              py: 1,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            {cancelText}
          </Button>
        )}

        <Button
          fullWidth
          onClick={onConfirm}
          variant="contained"
          disabled={loading}
          sx={{
            borderRadius: 2,
            py: 1,
            textTransform: "none",
            fontWeight: 800,
            background: config.gradient,
            boxShadow: "0 8px 18px rgba(0, 87, 184, 0.25)",
            "&:hover": {
              background: config.gradient,
              opacity: 0.95,
            },
          }}
        >
          {loading ? (
            <CircularProgress size={22} sx={{ color: "#fff" }} />
          ) : (
            confirmText
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
