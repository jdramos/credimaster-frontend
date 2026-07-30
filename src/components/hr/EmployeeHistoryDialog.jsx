import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableHead, TableBody, TableRow, TableCell,
  Typography, CircularProgress, Box, Chip,
} from "@mui/material";
import dayjs from "dayjs";
import API from "../../api";

const MOTIVO_LABELS = {
  RENUNCIA: "Renuncia voluntaria",
  DESPIDO_JUSTIFICADO: "Despido con causa justificada",
  DESPIDO_INJUSTIFICADO: "Despido sin causa justificada",
  MUTUO_ACUERDO: "Mutuo acuerdo",
};

const fmtDate = (value) => (value ? dayjs(value).format("DD/MM/YYYY") : "-");

// Historial de "cuándo entró, cuándo salió, si volvió a entrar" — una fila
// por período de empleo, alimentada por hr_employee_history. Solo lectura:
// la baja/reingreso se hace desde EmployeesList.jsx, esto solo lo muestra.
export default function EmployeeHistoryDialog({ open, onClose, employeeId, employeeName }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !employeeId) return;

    setLoading(true);
    API.get(`/api/hr/employees/${employeeId}/history`)
      .then((res) => setRows(res.data?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [open, employeeId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Historial de empleo — {employeeName}</DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                <TableCell>Ingreso</TableCell>
                <TableCell>Salida</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell>Comentario</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{fmtDate(row.entry_date)}</TableCell>
                  <TableCell>
                    {row.exit_date ? fmtDate(row.exit_date) : <Chip size="small" color="success" label="Activo" />}
                  </TableCell>
                  <TableCell>{row.motivo_salida ? (MOTIVO_LABELS[row.motivo_salida] || row.motivo_salida) : "-"}</TableCell>
                  <TableCell sx={{ whiteSpace: "pre-wrap" }}>{row.comment || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!loading && !rows.length && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
            Sin períodos de empleo registrados.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}
