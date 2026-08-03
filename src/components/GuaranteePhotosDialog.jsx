import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import PhotoCameraBackIcon from "@mui/icons-material/PhotoCameraBack";
import API from "../api";
import { UserContext } from "../contexts/UserContext";

const GuaranteePhotosDialog = ({ open, onClose, guaranteeId, guaranteeLabel = "", readOnly = false }) => {
  const { role, permissions = [] } = useContext(UserContext) || {};
  const canUpload = !readOnly && (role === 1 || permissions.includes("garantias.insertar"));
  const canDelete = !readOnly && (role === 1 || permissions.includes("garantias.eliminar"));

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const loadPhotos = async () => {
    if (!guaranteeId) return;
    setLoading(true);
    setError("");
    try {
      const res = await API.get(`/api/guarantees/${guaranteeId}/photos`);
      setPhotos(res.data?.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.message || "No se pudieron cargar las fotos de la garantía",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guaranteeId]);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await API.post(`/api/guarantees/${guaranteeId}/photos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadPhotos();
    } catch (err) {
      setError(
        err?.response?.data?.message || "No se pudo subir la foto",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId) => {
    if (!window.confirm("¿Eliminar esta foto?")) return;
    try {
      await API.delete(`/api/guarantees/photos/${photoId}`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(
        err?.response?.data?.message || "No se pudo eliminar la foto",
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PhotoCameraBackIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            Fotos de la garantía{guaranteeLabel ? ` — ${guaranteeLabel}` : ""}
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack alignItems="center" py={3}>
            <CircularProgress size={28} />
          </Stack>
        ) : photos.length === 0 ? (
          <Alert severity="info">Esta garantía no tiene fotos adjuntas.</Alert>
        ) : (
          <ImageList cols={3} gap={8}>
            {photos.map((photo) => (
              <ImageListItem key={photo.id}>
                <a href={photo.url} target="_blank" rel="noreferrer">
                  <img
                    src={photo.url}
                    alt={photo.file_name || "Foto de garantía"}
                    loading="lazy"
                    style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 4 }}
                  />
                </a>
                {canDelete && (
                  <ImageListItemBar
                    position="top"
                    sx={{ background: "transparent" }}
                    actionIcon={
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(photo.id)}
                        sx={{ color: "#fff", bgcolor: "rgba(0,0,0,0.5)", m: 0.5 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    }
                    actionPosition="right"
                  />
                )}
              </ImageListItem>
            ))}
          </ImageList>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={handleFileSelected}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {canUpload && (
          <Button
            variant="contained"
            startIcon={uploading ? <CircularProgress size={16} color="inherit" /> : <AddPhotoAlternateIcon />}
            onClick={handlePickFile}
            disabled={uploading}
          >
            {uploading ? "Subiendo..." : "Subir foto"}
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GuaranteePhotosDialog;
