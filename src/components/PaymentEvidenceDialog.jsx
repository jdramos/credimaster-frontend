import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import API from "../api";

const KIND_LABEL = { PHOTO: "Foto del cobro", SIGNATURE: "Firma del cliente" };

// Foto y/o firma que el cobrador subió desde la app móvil como respaldo de un
// pago (GET /api/payments/:id/evidence). Las URLs de descarga son temporales
// (15 min), por eso se piden cada vez que se abre el diálogo.
export default function PaymentEvidenceDialog({ payment, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!payment) return undefined;
    let cancelled = false;
    setItems([]);
    setError("");
    setLoading(true);
    API.get(`/api/payments/${payment.id}/evidence`)
      .then(({ data }) => {
        if (!cancelled) setItems(data?.data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || "No se pudo cargar la evidencia.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [payment]);

  return (
    <Dialog open={!!payment} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Respaldo del cobro #{payment?.id}
        <Typography variant="body2" color="text.secondary">
          {payment?.customer_name || "Cliente"} — Crédito {payment?.loan_id}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box textAlign="center" py={3}><CircularProgress size={28} /></Box>
        )}
        {!!error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && items.length === 0 && (
          <Typography color="text.secondary">Este pago no tiene foto ni firma.</Typography>
        )}
        <Stack spacing={2}>
          {items.map((it) => (
            <Box key={it.id}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                {KIND_LABEL[it.kind] || it.kind}
              </Typography>
              <Box
                component="img"
                src={it.url}
                alt={KIND_LABEL[it.kind] || it.kind}
                sx={{
                  width: "100%",
                  maxHeight: 420,
                  objectFit: "contain",
                  bgcolor: "var(--cm-paper, #fff)",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              />
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
