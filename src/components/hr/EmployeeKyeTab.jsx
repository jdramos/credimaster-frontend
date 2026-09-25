import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import API from "../../api";

const STATUS_CHIP = {
  PENDING: { label: "Pendiente", color: "default" },
  OK: { label: "Conforme", color: "success" },
  OBSERVED: { label: "Con observación", color: "warning" },
  NA: { label: "No aplica", color: "default" },
};

// "Conozca a su Empleado": checklist de verificación al contratar (Art. 30
// CD-CONAMI-070-01OCT07-2025, "conozca a su empleado"), distinto y
// complementario al tamizaje contra listas de sanciones que ya corre
// automático al crear el usuario del sistema. El checklist se siembra solo
// al crear el empleado (api/hr/employeeKyeController.js::ensureEmployeeKye).
export default function EmployeeKyeTab({ employeeId, canManage }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingCode, setSavingCode] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});
  const [error, setError] = useState("");

  const loadItems = () => {
    if (!employeeId) return;
    setLoading(true);
    setError("");
    API.get(`/api/hr/employees/${employeeId}/kye`)
      .then((res) => setItems(res.data?.data || []))
      .catch((err) => setError(err?.response?.data?.message || "No se pudo cargar el checklist"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleStatusChange = async (item, status) => {
    try {
      setSavingCode(item.code);
      await API.put(`/api/hr/employees/${employeeId}/kye/${item.code}`, {
        status,
        notes: notesDraft[item.code] ?? item.notes ?? null,
      });
      loadItems();
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo registrar la verificación");
    } finally {
      setSavingCode(null);
    }
  };

  const handleNotesBlur = async (item) => {
    const draft = notesDraft[item.code];
    if (draft === undefined || draft === (item.notes || "")) return;
    try {
      setSavingCode(item.code);
      await API.put(`/api/hr/employees/${employeeId}/kye/${item.code}`, {
        status: item.status,
        notes: draft || null,
      });
      loadItems();
    } catch (err) {
      setError(err?.response?.data?.message || "No se pudo guardar la nota");
    } finally {
      setSavingCode(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Verificación al contratar (identidad, antecedentes y referencias) — Art. 30 CD-CONAMI-070-01OCT07-2025.
        Distinto del tamizaje contra listas de sanciones, que corre automáticamente.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

      <TableContainer sx={{ border: "1px solid #E5E7EB", borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#F9FAFB" }}>
              <TableCell sx={{ fontWeight: 800 }}>Verificación</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Estado</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Notas</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Registrado por</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const cfg = STATUS_CHIP[item.status] || STATUS_CHIP.PENDING;
              return (
                <TableRow key={item.code} hover>
                  <TableCell>
                    {item.title}
                    {item.is_mandatory ? null : (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Opcional
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <TextField
                        select
                        size="small"
                        value={item.status}
                        onChange={(e) => handleStatusChange(item, e.target.value)}
                        disabled={savingCode === item.code}
                        sx={{ minWidth: 160 }}
                      >
                        <MenuItem value="PENDING">Pendiente</MenuItem>
                        <MenuItem value="OK">Conforme</MenuItem>
                        <MenuItem value="OBSERVED">Con observación</MenuItem>
                        <MenuItem value="NA">No aplica</MenuItem>
                      </TextField>
                    ) : (
                      <Chip size="small" label={cfg.label} color={cfg.color} />
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: 220 }}>
                    {canManage ? (
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Notas (opcional)"
                        value={notesDraft[item.code] ?? item.notes ?? ""}
                        onChange={(e) => setNotesDraft((prev) => ({ ...prev, [item.code]: e.target.value }))}
                        onBlur={() => handleNotesBlur(item)}
                        disabled={savingCode === item.code}
                      />
                    ) : (
                      item.notes || "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {item.validated_by ? (
                      <Stack spacing={0}>
                        <Typography variant="body2">{item.validated_by}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(item.validated_at).format("DD/MM/YYYY HH:mm")}
                        </Typography>
                      </Stack>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Sin verificaciones registradas.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
