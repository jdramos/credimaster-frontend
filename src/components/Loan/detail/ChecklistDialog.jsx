import React from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Alert,
} from "@mui/material";
import CustomerChecklist from "../../Customer/CustomerCheckList";
import BAC from "../../../styles/bac";

const ChecklistDialog = ({ open, onClose, customerId, customerName }) => (
  <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
    <DialogTitle
      sx={{
        fontWeight: 800,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      Checklist documental del cliente
    </DialogTitle>

    <DialogContent sx={{ p: 2, backgroundColor: BAC.white }}>
      {open && customerId ? (
        <CustomerChecklist
          customerId={customerId}
          customerName={customerName}
          readOnly={false}
          title="Checklist documental del cliente"
          showCompletedSummary={true}
          autoHideCompleted={false}
        />
      ) : (
        <Alert severity="info">No hay documentos disponibles.</Alert>
      )}
    </DialogContent>

    <DialogActions sx={{ p: 2, backgroundColor: BAC.white }}>
      <Button
        onClick={onClose}
        variant="contained"
        sx={{
          borderRadius: 2,
          fontWeight: 900,
          bgcolor: BAC.primary,
          "&:hover": { bgcolor: BAC.primaryDark },
        }}
      >
        Cerrar
      </Button>
    </DialogActions>
  </Dialog>
);

export default ChecklistDialog;
