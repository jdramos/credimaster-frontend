import React, { useCallback, useEffect, useState } from "react";
import {
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Divider,
  CircularProgress,
} from "@mui/material";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import API from "../../api";

const BAC = {
  primary: "#D32F2F",
  primaryDark: "#9A2424",
  border: "#E5E7EB",
};

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-NI");
}

/**
 * Deja constancia de consultas a la central de riesgo (buro de credito /
 * SIN RIESGO) por deudor, garante o conyuge. Este registro es el que exige
 * complianceController antes de permitir la aprobacion del credito.
 */
export default function RiskBureauQueryPanel({ customerId, loanId, readOnly = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [personRole, setPersonRole] = useState("DEBTOR");
  const [bureauName, setBureauName] = useState("SIN RIESGO");
  const [queryReference, setQueryReference] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [resultSummary, setResultSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadHistory = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const { data } = await API.get(`/api/risk-bureau-queries/customer/${customerId}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSave = async () => {
    if (!customerId) return;
    if (!bureauName.trim()) {
      setError("Indique el nombre de la central consultada.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await API.post("/api/risk-bureau-queries", {
        customer_id: customerId,
        loan_id: loanId || null,
        person_role: personRole,
        bureau_name: bureauName.trim(),
        query_reference: queryReference.trim() || null,
        risk_level: riskLevel.trim() || null,
        result_summary: resultSummary.trim() || null,
      });

      setSuccess("Consulta registrada correctamente.");
      setQueryReference("");
      setRiskLevel("");
      setResultSummary("");
      await loadHistory();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "No se pudo registrar la consulta.");
    } finally {
      setSaving(false);
    }
  };

  if (!customerId) return null;

  return (
    <Paper
      elevation={0}
      sx={{ p: 2, borderRadius: 2, border: `1px solid ${BAC.border}`, bgcolor: "#fff", mt: 1.5 }}
    >
      <Stack spacing={1.5}>
        <Typography variant="subtitle2" fontWeight={900}>
          Consultas a central de riesgo (evidencia)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Registro manual de la consulta realizada al buró de crédito / SIN RIESGO. Requerido
          para poder aprobar el crédito.
        </Typography>

        {!readOnly && (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} flexWrap="wrap" useFlexGap>
            <TextField
              select
              label="Rol"
              value={personRole}
              onChange={(e) => setPersonRole(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="DEBTOR">Deudor</MenuItem>
              <MenuItem value="GUARANTOR">Garante</MenuItem>
              <MenuItem value="SPOUSE">Cónyuge</MenuItem>
            </TextField>
            <TextField
              label="Central consultada"
              value={bureauName}
              onChange={(e) => setBureauName(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            />
            <TextField
              label="Referencia / folio"
              value={queryReference}
              onChange={(e) => setQueryReference(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
            />
            <TextField
              label="Nivel de riesgo"
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
            />
            <TextField
              label="Resumen del resultado"
              value={resultSummary}
              onChange={(e) => setResultSummary(e.target.value)}
              size="small"
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <FactCheckIcon />}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                whiteSpace: "nowrap",
                bgcolor: BAC.primary,
                "&:hover": { bgcolor: BAC.primaryDark },
              }}
            >
              Registrar
            </Button>
          </Stack>
        )}

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Divider />

        <TableContainer sx={{ border: `1px solid ${BAC.border}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "#F9FAFB" }}>
                <TableCell sx={{ fontWeight: 800 }}>Rol</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Central</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Nivel de riesgo</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Resumen</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Registrado por</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Fecha</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Sin consultas registradas.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        r.person_role === "DEBTOR"
                          ? "Deudor"
                          : r.person_role === "GUARANTOR"
                            ? "Garante"
                            : "Cónyuge"
                      }
                    />
                  </TableCell>
                  <TableCell>{r.bureau_name}</TableCell>
                  <TableCell>{r.risk_level || "-"}</TableCell>
                  <TableCell>{r.result_summary || "-"}</TableCell>
                  <TableCell>{r.queried_by || "-"}</TableCell>
                  <TableCell>{formatDateTime(r.queried_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Paper>
  );
}
