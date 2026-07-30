import React, { useState } from "react";
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Typography,
  CircularProgress,
  Box,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import { getAccountHistory } from "../../api/budget";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", minimumFractionDigits: 2 }).format(Number(value || 0));

// Botón + diálogo reutilizable para ver el histórico real de una cuenta MUC
// (últimos 3 años, mes a mes) — referencia para quien está digitando el
// presupuesto de un año nuevo. Se usa tanto en el editor por departamento
// como en el editor de líneas por cuenta del admin.
export default function AccountHistoryButton({ accountId, label, mucCode, beforeYear }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleOpen = async () => {
    setOpen(true);
    if (data) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getAccountHistory(accountId, { years: 3, beforeYear });
      setData(res?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  };

  const hasMovements = data?.years?.some((y) => y.total !== 0);

  return (
    <>
      <Tooltip title="Ver historial (últimos 3 años)">
        <span>
          <IconButton size="small" onClick={handleOpen} disabled={!accountId}>
            <HistoryIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Historial — {label} {mucCode ? `(${mucCode})` : ""}
        </DialogTitle>
        <DialogContent>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {!loading && error && (
            <Typography variant="body2" color="error">{error}</Typography>
          )}

          {!loading && !error && data && (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small" sx={{ minWidth: 1000 }}>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                    <TableCell>Año</TableCell>
                    {MONTH_LABELS.map((m) => (
                      <TableCell key={m} align="right">{m}</TableCell>
                    ))}
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.years.map((y) => (
                    <TableRow key={y.year} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{y.year}</TableCell>
                      {y.months.map((v, idx) => (
                        <TableCell key={idx} align="right">{formatCurrency(v)}</TableCell>
                      ))}
                      <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(y.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {!hasMovements && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
                  No hay movimientos registrados en los últimos años para esta cuenta.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
