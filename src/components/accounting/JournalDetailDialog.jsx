import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
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
import CancelIcon from "@mui/icons-material/Cancel";
import EditIcon from "@mui/icons-material/Edit";
import API from "../../api";
import { printAccountingReport } from "./printAccountingReport";

const money = (value) =>
  Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2 });

// Los comprobantes generados por otros módulos deben anularse desde su origen
// (que también revierte el registro asociado: cheque, desembolso, etc.), no
// desde el Libro Diario. Solo los MANUAL se pueden anular aquí.
const MODULE_ORIGIN = {
  BANKS: "Bancos (Cheques / Depósitos / Movimientos)",
  LOANS: "Créditos",
  CAJA: "Caja (Movimientos)",
  HR: "Recursos Humanos",
  PAYMENTS: "Pagos",
  FIXED_ASSETS: "Activo Fijo",
  BUSINESS_DAY: "Cierre del día",
};
const isManualOrigin = (sourceModule) =>
  !sourceModule || ["MANUAL", "ACCOUNTING"].includes(sourceModule);

export default function JournalDetailDialog({ open, onClose, journalId, canVoid = false, onRequestVoid, canEdit = false, onRequestEdit }) {
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

        <DialogActions sx={{ px: 2, py: 1.5 }}>
          {entry && entry.status !== "VOID" && (
            isManualOrigin(entry.source_module) ? (
              <Box sx={{ mr: "auto", display: "flex", gap: 1 }}>
                {canEdit && (
                  <Button
                    color="primary"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => onRequestEdit?.(entry)}
                    sx={{ textTransform: "none" }}
                  >
                    Editar
                  </Button>
                )}
                {canVoid && (
                  <Button
                    color="error"
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={() => onRequestVoid?.(entry)}
                    sx={{ textTransform: "none" }}
                  >
                    Anular comprobante
                  </Button>
                )}
              </Box>
            ) : (
              (canVoid || canEdit) && (
                <Alert severity="info" sx={{ mr: "auto", py: 0 }}>
                  Este comprobante proviene de {MODULE_ORIGIN[entry.source_module] || entry.source_module}.
                  Debe editarse/anularse desde ese módulo.
                </Alert>
              )
            )
          )}
          <Button onClick={onClose} variant="contained" sx={{ textTransform: "none" }}>
            Cerrar
          </Button>
        </DialogActions>
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
