import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Chip,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import { toast } from "react-toastify";
import API from "../../api";
import AttachmentThumb from "../../components/support/AttachmentThumb";
import {
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  statusLabel,
  statusColor,
  priorityLabel,
  priorityColor,
  categoryLabel,
  formatDateTime,
} from "../../components/support/supportConstants";

const MAX_IMAGES = 5;
const BASE = "/api/superadmin/support";
const attachmentUrlPath = (id) => `${BASE}/attachments/${id}/url`;

function AdminTicketDetail({ ticketId, open, onClose, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [images, setImages] = useState([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const res = await API.get(`${BASE}/tickets/${ticketId}`);
      setTicket(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo cargar el ticket");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (ticket) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket]);

  const handleClose = () => {
    if (sending) return;
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
    setBody("");
    setInternal(false);
    setTicket(null);
    onClose();
  };

  const handlePick = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return;
    setImages((prev) => [
      ...prev,
      ...picked.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].url);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const updateTicket = async (payload, okMsg) => {
    try {
      await API.put(`${BASE}/tickets/${ticketId}`, payload);
      if (okMsg) toast.success(okMsg);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo actualizar");
    }
  };

  const handleSend = async () => {
    if (!body.trim() && images.length === 0) {
      toast.warn("Escribe un mensaje o adjunta una imagen");
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("body", body.trim());
      fd.append("is_internal_note", internal ? "1" : "0");
      images.forEach((i) => fd.append("images", i.file));
      await API.post(`${BASE}/tickets/${ticketId}/messages`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      images.forEach((i) => URL.revokeObjectURL(i.url));
      setImages([]);
      setBody("");
      setInternal(false);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo enviar la respuesta");
    } finally {
      setSending(false);
    }
  };

  const openingAttachments = (ticket?.attachments || []).filter((a) => !a.message_id);
  const attByMessage = (mid) => (ticket?.attachments || []).filter((a) => a.message_id === mid);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        <Typography variant="h6" fontWeight={800} noWrap>
          {ticket?.subject || "Ticket"}
        </Typography>
        {ticket && (
          <Typography variant="body2" color="text.secondary">
            {ticket.tenant_name || `Empresa #${ticket.tenant_id}`} · {ticket.created_by_name} · #{ticket.id}
          </Typography>
        )}
        <IconButton onClick={handleClose} sx={{ position: "absolute", top: 12, right: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "background.default" }}>
        {loading || !ticket ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            {/* Controles de gestión */}
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }} alignItems="center">
              <TextField
                select
                size="small"
                label="Estado"
                value={ticket.status}
                onChange={(e) => updateTicket({ status: e.target.value }, "Estado actualizado")}
                sx={{ minWidth: 150 }}
              >
                {STATUS_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Prioridad"
                value={ticket.priority}
                onChange={(e) => updateTicket({ priority: e.target.value }, "Prioridad actualizada")}
                sx={{ minWidth: 140 }}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                size="small"
                variant="outlined"
                startIcon={<AssignmentIndIcon />}
                onClick={() => updateTicket({ assign_to_me: true }, "Asignado a ti")}
              >
                {ticket.assigned_admin_name ? `Asignado: ${ticket.assigned_admin_name}` : "Asignármelo"}
              </Button>
            </Stack>

            <Divider />

            {/* Apertura */}
            <Box sx={{ p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
              <Typography variant="caption" color="text.secondary">
                {ticket.created_by_name} · {formatDateTime(ticket.created_at)}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ my: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                <Chip size="small" variant="outlined" label={categoryLabel(ticket.category)} />
              </Stack>
              <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                {ticket.description || <em>(sin descripción)</em>}
              </Typography>
              {openingAttachments.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}>
                  {openingAttachments.map((a) => (
                    <AttachmentThumb key={a.id} attachment={a} urlPath={attachmentUrlPath} />
                  ))}
                </Stack>
              )}
            </Box>

            {/* Hilo */}
            {(ticket.messages || []).map((m) => {
              const isAdmin = m.author_type === "ADMIN";
              const note = Number(m.is_internal_note) === 1;
              return (
                <Box
                  key={m.id}
                  sx={{
                    alignSelf: isAdmin ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: note ? "warning.main" : isAdmin ? "primary.light" : "divider",
                    bgcolor: note ? "warning.light" : isAdmin ? "primary.main" : "background.paper",
                    color: note ? "warning.contrastText" : isAdmin ? "primary.contrastText" : "text.primary",
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.85 }}>
                    {note ? "Nota interna · " : ""}
                    {isAdmin ? `Soporte · ${m.author_name || ""}` : m.author_name || "Empresa"} ·{" "}
                    {formatDateTime(m.created_at)}
                  </Typography>
                  <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>{m.body}</Typography>
                  {attByMessage(m.id).length > 0 && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}>
                      {attByMessage(m.id).map((a) => (
                        <AttachmentThumb key={a.id} attachment={a} urlPath={attachmentUrlPath} size={72} />
                      ))}
                    </Stack>
                  )}
                </Box>
              );
            })}
            <div ref={bottomRef} />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 1, p: 2 }}>
        {images.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            {images.map((img, idx) => (
              <Box key={idx} sx={{ position: "relative", width: 64, height: 64, borderRadius: 1.5, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
                <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <IconButton size="small" onClick={() => removeImage(idx)} sx={{ position: "absolute", top: 0, right: 0, bgcolor: "rgba(0,0,0,0.55)", color: "#fff" }}>
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
        <FormControlLabel
          control={<Checkbox checked={internal} onChange={(e) => setInternal(e.target.checked)} />}
          label="Nota interna (no visible para la empresa)"
        />
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <IconButton component="label" disabled={sending || images.length >= MAX_IMAGES} color="primary">
            <AddPhotoAlternateIcon />
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden multiple onChange={handlePick} />
          </IconButton>
          <TextField
            fullWidth
            size="small"
            placeholder={internal ? "Nota interna..." : "Responder a la empresa..."}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            multiline
            maxRows={4}
            disabled={sending}
          />
          <Button variant="contained" endIcon={<SendIcon />} onClick={handleSend} disabled={sending}>
            {sending ? "..." : "Enviar"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

export default function SupportAdminPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search.trim()) params.search = search.trim();
      const res = await API.get(`${BASE}/tickets`, { params });
      setRows(Array.isArray(res.data?.tickets) ? res.data.tickets : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudieron cargar los tickets");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={900}>
            Soporte
          </Typography>
          <Typography color="text.secondary">
            Tickets reportados por las empresas.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          <TextField
            size="small"
            label="Buscar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            sx={{ minWidth: 180 }}
          />
          <TextField select size="small" label="Estado" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">Todos</MenuItem>
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Prioridad" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="">Todas</MenuItem>
            {PRIORITY_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
          <Tooltip title="Actualizar">
            <IconButton onClick={load}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={60}>#</TableCell>
              <TableCell>Empresa</TableCell>
              <TableCell>Asunto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Prioridad</TableCell>
              <TableCell>Asignado</TableCell>
              <TableCell>Última actividad</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={26} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, color: "text.secondary" }}>
                  No hay tickets con estos filtros.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => setDetailId(r.id)}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{r.tenant_name || `#${r.tenant_id}`}</TableCell>
                  <TableCell>{r.subject}</TableCell>
                  <TableCell>
                    <Chip size="small" label={statusLabel(r.status)} color={statusColor(r.status)} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={priorityLabel(r.priority)} color={priorityColor(r.priority)} />
                  </TableCell>
                  <TableCell>{r.assigned_admin_name || "—"}</TableCell>
                  <TableCell>{formatDateTime(r.last_message_at || r.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <AdminTicketDetail
        ticketId={detailId}
        open={detailId != null}
        onClose={() => setDetailId(null)}
        onChanged={load}
      />
    </Box>
  );
}
