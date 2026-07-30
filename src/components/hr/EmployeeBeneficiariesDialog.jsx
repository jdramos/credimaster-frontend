import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableHead, TableBody, TableRow, TableCell,
  TextField, IconButton, Tooltip, Typography, CircularProgress, Box, Alert, Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import dayjs from "dayjs";
import API from "../../api";

const emptyRow = { full_name: "", relationship: "", birth_date: "", id_card: "", phone: "", percentage: "" };

// Beneficiarios declarados por el empleado (registro/INSS) — datos
// declarativos sin ningún cálculo detrás, CRUD directo con borrado real
// (a diferencia de préstamos/liquidaciones, no hay rastro de auditoría
// legal/financiera que preservar aquí).
export default function EmployeeBeneficiariesDialog({ open, onClose, employeeId, employeeName }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newRow, setNewRow] = useState(emptyRow);
  const [savingNew, setSavingNew] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchRows = () => {
    if (!employeeId) return;
    setLoading(true);
    API.get(`/api/hr/employees/${employeeId}/beneficiaries`)
      .then((res) => setRows(res.data?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      fetchRows();
      setNewRow(emptyRow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employeeId]);

  const handleAdd = async () => {
    if (!newRow.full_name || !newRow.relationship) {
      showAlert("Nombre y parentesco son requeridos", "error");
      return;
    }
    try {
      setSavingNew(true);
      await API.post(`/api/hr/employees/${employeeId}/beneficiaries`, {
        ...newRow,
        birth_date: newRow.birth_date || null,
        percentage: newRow.percentage || null,
      });
      setNewRow(emptyRow);
      fetchRows();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al agregar el beneficiario", "error");
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`¿Eliminar a "${row.full_name}" de los beneficiarios?`)) return;
    try {
      await API.delete(`/api/hr/employees/${employeeId}/beneficiaries/${row.id}`);
      fetchRows();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al eliminar el beneficiario", "error");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Beneficiarios — {employeeName}</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700 } }}>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Parentesco</TableCell>
                  <TableCell>Fecha nac.</TableCell>
                  <TableCell>Cédula</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>%</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.full_name}</TableCell>
                    <TableCell>{row.relationship}</TableCell>
                    <TableCell>{row.birth_date ? dayjs(row.birth_date).format("DD/MM/YYYY") : "-"}</TableCell>
                    <TableCell>{row.id_card || "-"}</TableCell>
                    <TableCell>{row.phone || "-"}</TableCell>
                    <TableCell>{row.percentage != null ? `${row.percentage}%` : "-"}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Eliminar">
                        <IconButton size="small" onClick={() => handleDelete(row)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

                <TableRow>
                  <TableCell>
                    <TextField
                      size="small" placeholder="Nombre completo" fullWidth
                      value={newRow.full_name}
                      onChange={(e) => setNewRow((r) => ({ ...r, full_name: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" placeholder="Cónyuge, hijo/a..." fullWidth
                      value={newRow.relationship}
                      onChange={(e) => setNewRow((r) => ({ ...r, relationship: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" type="date" InputLabelProps={{ shrink: true }}
                      value={newRow.birth_date}
                      onChange={(e) => setNewRow((r) => ({ ...r, birth_date: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" placeholder="Cédula" sx={{ width: 110 }}
                      value={newRow.id_card}
                      onChange={(e) => setNewRow((r) => ({ ...r, id_card: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" placeholder="Teléfono" sx={{ width: 100 }}
                      value={newRow.phone}
                      onChange={(e) => setNewRow((r) => ({ ...r, phone: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small" type="number" sx={{ width: 70 }}
                      value={newRow.percentage}
                      onChange={(e) => setNewRow((r) => ({ ...r, percentage: e.target.value }))}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Agregar">
                      <span>
                        <IconButton size="small" color="primary" onClick={handleAdd} disabled={savingNew}>
                          {savingNew ? <CircularProgress size={16} /> : <AddIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}

          {!loading && !rows.length && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1, textAlign: "center" }}>
              Sin beneficiarios registrados aún — agréguelos abajo.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </>
  );
}
