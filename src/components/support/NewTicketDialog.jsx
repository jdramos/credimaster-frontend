import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CloseIcon from "@mui/icons-material/Close";
import { toast } from "react-toastify";
import API from "../../api";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS } from "./supportConstants";

const MAX_IMAGES = 5;

export default function NewTicketDialog({ open, onClose, onCreated }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("error");
  const [priority, setPriority] = useState("media");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]); // { file, url }
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setSubject("");
    setCategory("error");
    setPriority("media");
    setDescription("");
    images.forEach((i) => URL.revokeObjectURL(i.url));
    setImages([]);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
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
    const next = picked.slice(0, room).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...next]);
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].url);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      toast.warn("El asunto es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("subject", subject.trim());
      fd.append("category", category);
      fd.append("priority", priority);
      fd.append("description", description);
      images.forEach((i) => fd.append("images", i.file));

      await API.post("/api/support", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Ticket creado");
      reset();
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "No se pudo crear el ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>Nuevo ticket de soporte</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            label="Asunto"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            required
            inputProps={{ maxLength: 200 }}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="Categoría"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              fullWidth
            >
              {CATEGORY_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Prioridad"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              fullWidth
            >
              {PRIORITY_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label="Describe el problema"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={4}
            placeholder="¿Qué pasó? ¿En qué pantalla? ¿Qué esperabas que sucediera?"
          />

          <Box>
            <Button
              startIcon={<AddPhotoAlternateIcon />}
              variant="outlined"
              component="label"
              disabled={images.length >= MAX_IMAGES}
            >
              Adjuntar imágenes ({images.length}/{MAX_IMAGES})
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                multiple
                onChange={handlePick}
              />
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              Solo imágenes (JPG, PNG, WEBP, GIF), máx. 10 MB cada una.
            </Typography>

            {images.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", gap: 1 }}>
                {images.map((img, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      position: "relative",
                      width: 84,
                      height: 84,
                      borderRadius: 2,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <img
                      src={img.url}
                      alt={`adjunto ${idx + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeImage(idx)}
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        bgcolor: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
                      }}
                    >
                      <CloseIcon fontSize="inherit" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? "Enviando..." : "Crear ticket"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
