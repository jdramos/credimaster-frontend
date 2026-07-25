import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { printAccountingReport } from "./printAccountingReport";

const money = (value) =>
  Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2 });

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

  const handlePrint = () => {
    if (!entry) return;

    printAccountingReport({
      title: "Comprobante Contable",
      subtitle: `N° ${entry.entry_number || entry.entry_no || ""}`,
      period: entry.entry_date ? String(entry.entry_date).substring(0, 10) : "",
      columns: [
        { field: "account", label: "Cuenta", value: (row) => `${row.muc_code} - ${row.account_name}` },
        { field: "description", label: "Descripción" },
        { field: "debit", label: "Débito", numeric: true, format: money },
        { field: "credit", label: "Crédito", numeric: true, format: money },
      ],
      rows: details,
      totals: [
        { value: "Totales", colspan: 2 },
        { value: money(totalDebit), numeric: true },
        { value: money(totalCredit), numeric: true },
      ],
    });
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Detalle del comprobante
          <Button
            size="small"
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={!entry}
            sx={{ textTransform: "none" }}
          >
            Imprimir
          </Button>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2 }}>
          {loading ? (
            <Typography variant="body2">Cargando...</Typography>
          ) : !entry ? (
            <Typography variant="body2">No hay información</Typography>
          ) : (
            <>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "140px 1fr 110px 100px",
                  },
                  gap: 1.5,
                  mb: 1.5,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Comprobante
                  </Typography>

                  <Typography variant="body2" fontWeight={700}>
                    {entry.entry_number || entry.entry_no}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Descripción
                  </Typography>

                  <Typography variant="body2" fontWeight={600}>
                    {entry.description || entry.memo || entry.concept || ""}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Fecha
                  </Typography>

                  <Typography variant="body2" fontWeight={600}>
                    {entry.entry_date
                      ? String(entry.entry_date).substring(0, 10)
                      : ""}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estado
                  </Typography>

                  <Box sx={{ mt: 0.25 }}>
                    {entry.status === "VOID" ? (
                      <Chip size="small" color="error" label="Anulado" />
                    ) : (
                      <Chip size="small" color="success" label="Aplicado" />
                    )}
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              <TableContainer>
                <Table size="small" sx={{ "& td, & th": { py: 0.5, px: 1, fontSize: 13 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Cuenta</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Descripción</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Débito</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Crédito</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {details.map((row, index) => (
                      <TableRow key={index} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {row.muc_code} - {row.account_name}
                        </TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell align="right">{money(row.debit)}</TableCell>
                        <TableCell align="right">{money(row.credit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  mt: 1.5,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: "#F8FAFC",
                  border: "1px solid #E5E7EB",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 3,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" fontWeight={800}>
                  Débito: {money(totalDebit)}
                </Typography>

                <Typography variant="body2" fontWeight={800}>
                  Crédito: {money(totalCredit)}
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
