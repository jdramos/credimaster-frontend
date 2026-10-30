import React, { useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import CalculateIcon from "@mui/icons-material/Calculate";
import ReportExportButtons from "../../common/ReportExportButtons";
import { reportMoney } from "../../common/reportFormat";
import {
  buildSimulationReport, requestAccountingSimulation, TIMING_LABELS, useCanSimulateAccounting,
} from "./accountingSimulation";

// Asientos de una simulación: un bloque por comprobante (momento, fecha,
// sucursal, descripción) con sus cuentas MUC, totales y si cuadra.
export const AccountingSimulationView = ({ simulation }) => {
  const entries = simulation?.entries || [];
  const totals = simulation?.totals || { debit: 0, credit: 0, balanced: true };

  return (
    <Stack spacing={2}>
      {(simulation?.notes || []).map((note) => (
        <Alert key={note} severity="info" variant="outlined" sx={{ py: 0 }}>{note}</Alert>
      ))}

      {entries.map((entry, index) => (
        <Box key={`${entry.source_type}-${index}`} sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ px: 1.5, py: 1, bgcolor: "action.hover" }}>
            <Typography variant="subtitle2">Comprobante {index + 1}</Typography>
            <Chip size="small" color={entry.timing === "DAY_CLOSE" ? "warning" : "primary"} label={TIMING_LABELS[entry.timing] || entry.timing} />
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
              {[entry.entry_date, entry.branch_name, entry.description].filter(Boolean).join(" · ")}
            </Typography>
            <Chip size="small" variant="outlined" color={entry.balanced ? "success" : "error"} label={entry.balanced ? "Cuadrado" : "Descuadrado"} />
          </Stack>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Código MUC</TableCell>
                  <TableCell>Cuenta</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Débito</TableCell>
                  <TableCell align="right">Crédito</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entry.lines.map((line, lineIndex) => (
                  <TableRow key={`${line.account_id}-${lineIndex}`}>
                    <TableCell sx={{ whiteSpace: "nowrap", fontFamily: "monospace" }}>{line.account_code}</TableCell>
                    <TableCell>{line.account_name}</TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{line.description}</TableCell>
                    <TableCell align="right">{line.debit ? reportMoney(line.debit) : ""}</TableCell>
                    <TableCell align="right">{line.credit ? reportMoney(line.credit) : ""}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{reportMoney(entry.total_debit)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>{reportMoney(entry.total_credit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>
        </Box>
      ))}

      {entries.length > 0 && (
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
          <Typography variant="body2">Total débito: <b>{reportMoney(totals.debit)}</b></Typography>
          <Typography variant="body2">Total crédito: <b>{reportMoney(totals.credit)}</b></Typography>
          <Chip color={totals.balanced ? "success" : "error"} label={totals.balanced ? "Débito = Crédito" : "Débito ≠ Crédito"} />
        </Stack>
      )}
    </Stack>
  );
};

// Botón "Ver simulación contable" para el diálogo o pantalla de una
// operación, junto a Confirmar. `request` es una función que devuelve
// { method, url, data, params }: exactamente lo que se mandaría al confirmar
// (si devuelve null, la operación aún no está completa y no se simula).
// Sin el módulo de contabilidad o sin el permiso, no se muestra.
const AccountingSimulationButton = ({ request, disabled = false, label = "Ver simulación contable", title, size = "medium", variant = "outlined", sx }) => {
  const canSimulate = useCanSimulateAccounting();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [error, setError] = useState("");

  if (!canSimulate) return null;

  const handleClick = async () => {
    const config = typeof request === "function" ? request() : request;
    setOpen(true);
    setSimulation(null);
    setError("");
    if (!config) {
      setError("Complete los datos de la operación para ver su simulación contable.");
      return;
    }
    setLoading(true);
    try {
      setSimulation(await requestAccountingSimulation(config));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const dialogTitle = title || `Simulación contable${simulation?.operation ? ` — ${simulation.operation}` : ""}`;

  return (
    <>
      <Button variant={variant} size={size} color="secondary" startIcon={<CalculateIcon />} onClick={handleClick} disabled={disabled || loading} sx={{ textTransform: "none", ...sx }}>
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent dividers>
          {loading && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 3 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Simulando la operación (no se graba nada)...</Typography>
            </Stack>
          )}
          {error && <Alert severity="warning">{error}</Alert>}
          {simulation && <AccountingSimulationView simulation={simulation} />}
        </DialogContent>
        <DialogActions>
          {simulation && <ReportExportButtons report={() => buildSimulationReport(simulation, { title: dialogTitle })} />}
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AccountingSimulationButton;
