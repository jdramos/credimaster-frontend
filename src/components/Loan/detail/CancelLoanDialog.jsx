import React, { useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Alert,
} from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import API from "../../../api";

// Anular solicitud: el botón solo se muestra si `canCancelLoan` (DRAFT/PENDING
// sin ninguna aprobación otorgada y con permiso). El backend revalida la regla.
const CancelLoanDialog = ({
  canCancelLoan,
  loanId,
  loanData,
  onLoanUpdated,
  onClose,
  notify,
}) => {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleSubmitCancel = async () => {
    if (!cancelReason.trim()) {
      notify?.("El motivo de la anulación es obligatorio.", "warning");
      return;
    }
    setCancelLoading(true);
    try {
      await API.put(`/api/loans/${loanId}/cancel`, {
        reason: cancelReason.trim(),
      });
      setCancelOpen(false);
      setCancelReason("");
      onLoanUpdated?.({ ...loanData, status: "CANCELLED" });
      notify?.("Solicitud de crédito anulada.", "success");
      setTimeout(() => onClose?.(), 600);
    } catch (error) {
      notify?.(
        error?.response?.data?.message || "No se pudo anular la solicitud.",
        "error",
      );
    } finally {
      setCancelLoading(false);
    }
  };

  if (!canCancelLoan) return null;

  return (
    <>
      <Button
        onClick={() => {
          setCancelReason("");
          setCancelOpen(true);
        }}
        variant="outlined"
        color="error"
        size="small"
        startIcon={<BlockIcon />}
        sx={{ mr: "auto" }}
      >
        Anular solicitud
      </Button>

      {/* ANULAR SOLICITUD DE CRÉDITO */}
      <Dialog
        open={cancelOpen}
        onClose={() => !cancelLoading && setCancelOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Anular solicitud de crédito
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Vas a anular la solicitud de crédito #{loanId}
            {loanData?.customer_name ? ` de ${loanData.customer_name}` : ""}. Esta
            acción no se puede deshacer y liberará las garantías vinculadas.
          </Alert>
          <TextField
            label="Motivo de la anulación"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            fullWidth
            required
            multiline
            minRows={3}
            autoFocus
            inputProps={{ maxLength: 255 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={cancelLoading}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSubmitCancel}
            disabled={cancelLoading || !cancelReason.trim()}
          >
            {cancelLoading ? "Anulando..." : "Anular solicitud"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CancelLoanDialog;
