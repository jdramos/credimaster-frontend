import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import API from "../../api";

function statusColor(status) {
  switch ((status || "").toUpperCase()) {
    case "PENDING":
      return "warning";
    case "IN_REVIEW":
      return "info";
    case "APPROVED":
      return "success";
    case "APPLIED":
      return "success";
    case "REJECTED":
      return "error";
    default:
      return "default";
  }
}

export default function LoanModificationHistory({ loanId, onView }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!loanId) return;

    try {
      setLoading(true);
      setError("");
      const res = await API.get(`/api/loan-modifications/${loanId}`);
      setRows(res.data?.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Error cargando modificaciones.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [loanId]);

  if (loading) {
    return (
      <Box sx={{ py: 3, textAlign: "center" }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  return (
    <Box>
      {!!error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {rows.map((row) => (
          <Paper key={row.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {row.modification_type}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Justificación: {row.justification || "Sin detalle"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Solicitud: {row.request_date || row.created_at || ""}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  label={row.status || "N/D"}
                  color={statusColor(row.status)}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<VisibilityOutlinedIcon />}
                  onClick={() => onView?.(row)}
                >
                  Ver
                </Button>
              </Stack>
            </Stack>
          </Paper>
        ))}

        {!rows.length && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No hay modificaciones registradas para este crédito.
            </Typography>
          </Paper>
        )}
      </Stack>
    </Box>
  );
}
