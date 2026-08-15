import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Stack,
  Chip,
  Typography,
  Divider,
  TextField,
  IconButton,
  CircularProgress,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import { toast } from "react-toastify";
import API from "../../api";
import AttachmentThumb from "./AttachmentThumb";
import {
  statusLabel,
  statusColor,
  priorityLabel,
  priorityColor,
  categoryLabel,
  formatDateTime,
} from "./supportConstants";

const MAX_IMAGES = 5;
const attachmentUrlPath = (id) => `/api/support/attachments/${id}/url`;

export default function TicketDetailDialog({ open, ticketId, onClose, onChanged }) {
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [body, setBody] = useState("");
  const [images, setImages] = useState([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const res = await API.get(`/api/support/${ticketId}`);
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
    setTicket(null);
    onClose();
  };

  const handlePick = (e) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.warn(`Máximo ${MAX_IMAGES} imágenes`);
      return;
    }
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

  const handleSend = async () => {
    if (!body.trim() && images.length === 0) {
      toast.warn("Escribe un mensaje o adjunta una imagen");
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("body", body.trim());
      images.forEach((i) => fd.append("images", i.file));
      await API.post(`/api/support/${ticketId}/messages`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      images.forEach((i) => URL.revokeObjectURL(i.url));
      setImages([]);
      setBody("");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo enviar el mensaje");
    } finally {
      setSending(false);
    }
  };

  const openingAttachments = (ticket?.attachments || []).filter((a) => !a.message_id);
  const attByMessage = (mid) =>
    (ticket?.attachments || []).filter((a) => a.message_id === mid);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        <Typography variant="h6" fontWeight={800} noWrap>
          {ticket?.subject || "Ticket"}
        </Typography>
        {ticket && (
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}>
            <Chip size="small" label={statusLabel(ticket.status)} color={statusColor(ticket.status)} />
            <Chip size="small" variant="outlined" label={`Prioridad: ${priorityLabel(ticket.priority)}`} color={priorityColor(ticket.priority)} />
            <Chip size="small" variant="outlined" label={categoryLabel(ticket.category)} />
            <Chip size="small" variant="outlined" label={`#${ticket.id}`} />
          </Stack>
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
            {/* Apertura del ticket */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {ticket.created_by_name || "Tú"} · {formatDateTime(ticket.created_at)}
              </Typography>
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
              const mine = m.author_type === "TENANT";
              return (
                <Box
                  key={m.id}
                  sx={{
                    alignSelf: mine ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: mine ? "primary.light" : "divider",
                    bgcolor: mine ? "primary.main" : "background.paper",
                    color: mine ? "primary.contrastText" : "text.primary",
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {mine ? m.author_name || "Tú" : `Soporte · ${m.author_name || ""}`} ·{" "}
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
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <IconButton component="label" disabled={sending || images.length >= MAX_IMAGES} color="primary">
            <AddPhotoAlternateIcon />
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden multiple onChange={handlePick} />
          </IconButton>
          <TextField
            fullWidth
            size="small"
            placeholder="Escribe una respuesta..."
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
