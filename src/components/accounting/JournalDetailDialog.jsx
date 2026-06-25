import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Snackbar,
  Typography,
} from "@mui/material";
import API from "../../api";

export default function JournalDetailDialog({ open, onClose, journalId }) {
  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState(null);

  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const showAlert = (message, severity = "error") => {
    setAlert({
      open: true,
      severity,
      message,
    });
  };

  const fetchDetail = async () => {
    if (!journalId) return;

    try {
      setLoading(true);
      setEntry(null);

      const res = await API.get(`/api/accounting/journal/${journalId}`);

      const json = res.data || {};

      if (json.ok === false) {
        throw new Error(json.message || "Error cargando comprobante");
      }

      const data = json.data || json;

      setEntry({
        ...(data.entry || {}),
        details: data.lines || data.details || [],
      });
    } catch (error) {
      showAlert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Error cargando comprobante",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, journalId]);

  const details = entry?.details || [];

  const totalDebit = details.reduce(
    (sum, row) => sum + Number(row.debit || 0),
    0,
  );

  const totalCredit = details.reduce(
    (sum, row) => sum + Number(row.credit || 0),
    0,
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Detalle del comprobante
        </DialogTitle>

        <DialogContent dividers>
          {loading ? (
            <Typography>Cargando...</Typography>
          ) : !entry ? (
            <Typography>No hay información</Typography>
          ) : (
            <>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "180px 1fr 180px 160px",
                  },
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Comprobante
                  </Typography>

                  <Typography fontWeight={800}>
                    {entry.entry_number || entry.entry_no}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Descripción
                  </Typography>

                  <Typography fontWeight={700}>
                    {entry.description || entry.memo || entry.concept || ""}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fecha
                  </Typography>

                  <Typography fontWeight={700}>
                    {entry.entry_date
                      ? String(entry.entry_date).substring(0, 10)
                      : ""}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estado
                  </Typography>

                  <Box sx={{ mt: 0.5 }}>
                    {entry.status === "VOID" ? (
                      <Chip size="small" color="error" label="Anulado" />
                    ) : (
                      <Chip size="small" color="success" label="Aplicado" />
                    )}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 140px 140px",
                  gap: 1,
                  mb: 1,
                  px: 1,
                }}
              >
                <Typography fontWeight={900}>Cuenta</Typography>

                <Typography fontWeight={900}>Descripción</Typography>

                <Typography fontWeight={900}>Débito</Typography>

                <Typography fontWeight={900}>Crédito</Typography>
              </Box>

              {(entry.details || []).map((row, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2fr 2fr 140px 140px",
                    gap: 1,
                    mb: 1,
                    p: 1,
                    borderRadius: 2,
                    border: "1px solid #E5E7EB",
                    alignItems: "center",
                  }}
                >
                  <Typography fontWeight={700}>
                    {row.muc_code} - {row.account_name}
                  </Typography>

                  <Typography>{row.description}</Typography>

                  <Typography fontWeight={700}>
                    {Number(row.debit || 0).toLocaleString("es-NI", {
                      minimumFractionDigits: 2,
                    })}
                  </Typography>

                  <Typography fontWeight={700}>
                    {Number(row.credit || 0).toLocaleString("es-NI", {
                      minimumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
              ))}

              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "#F8FAFC",
                  border: "1px solid #E5E7EB",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Typography fontWeight={900}>
                  Débito:{" "}
                  {totalDebit.toLocaleString("es-NI", {
                    minimumFractionDigits: 2,
                  })}
                </Typography>

                <Typography fontWeight={900}>
                  Crédito:{" "}
                  {totalCredit.toLocaleString("es-NI", {
                    minimumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() =>
          setAlert((prev) => ({
            ...prev,
            open: false,
          }))
        }
      >
        <Alert
          severity={alert.severity}
          onClose={() =>
            setAlert((prev) => ({
              ...prev,
              open: false,
            }))
          }
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
}
