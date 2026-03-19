import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
} from "@mui/material";

export default function LoanDisburseDialog({
  open,
  onClose,
  loan,
  onSubmit,
  loading = false,
  currentUserId = null,
}) {
  const [disbursedBy, setDisbursedBy] = useState("");

  useEffect(() => {
    setDisbursedBy(currentUserId || "");
  }, [currentUserId, open]);

  const handleSubmit = () => {
    onSubmit({ disbursed_by: disbursedBy });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Desembolsar crédito</DialogTitle>

      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Crédito #{loan?.id} · Cliente: {loan?.customer_name || loan?.customer_identification}
        </Alert>

        <TextField
          fullWidth
          label="Desembolsado por"
          value={disbursedBy}
          onChange={(e) => setDisbursedBy(e.target.value)}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          Confirmar desembolso
        </Button>
      </DialogActions>
    </Dialog>
  );
}