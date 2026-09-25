import React, { useCallback, useEffect, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Box,
  Stack,
  Typography,
  Button,
  Chip,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import HeadsetMicIcon from "@mui/icons-material/HeadsetMic";
import { toast } from "react-toastify";
import API from "../../api";
import NewTicketDialog from "./NewTicketDialog";
import TicketDetailDialog from "./TicketDetailDialog";
import {
  STATUS_OPTIONS,
  statusLabel,
  statusColor,
  priorityLabel,
  priorityColor,
  formatDateTime,
} from "./supportConstants";

export default function SupportTickets() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/support", {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudieron cargar los tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <HeadsetMicIcon color="primary" />
            <Typography variant="h5" fontWeight={900}>
              Soporte
            </Typography>
            <HelpButton screenKey="soporte.tickets" />
          </Stack>
          <Typography color="text.secondary">
            Reporta problemas de la aplicación y da seguimiento a tus tickets.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField
            select
            size="small"
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title="Actualizar">
            <IconButton onClick={load}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}>
            Nuevo ticket
          </Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={70}>#</TableCell>
              <TableCell>Asunto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Prioridad</TableCell>
              <TableCell>Última actividad</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={26} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 5, color: "text.secondary" }}>
                  No tienes tickets todavía. Crea uno con “Nuevo ticket”.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow
                  key={r.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => setDetailId(r.id)}
                >
                  <TableCell>{r.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{r.subject}</TableCell>
                  <TableCell>
                    <Chip size="small" label={statusLabel(r.status)} color={statusColor(r.status)} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={priorityLabel(r.priority)}
                      color={priorityColor(r.priority)}
                    />
                  </TableCell>
                  <TableCell>{formatDateTime(r.last_message_at || r.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <NewTicketDialog open={newOpen} onClose={() => setNewOpen(false)} onCreated={load} />
      <TicketDetailDialog
        open={detailId != null}
        ticketId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={load}
      />
    </Box>
  );
}
