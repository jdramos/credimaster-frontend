import React, { useState } from "react";
import {
  IconButton,
  Tooltip,
  Popover,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import API from "../../api";

const SECTIONS = [
  { key: "do_content", label: "Qué hacer", icon: CheckCircleOutlineIcon, color: "#2e7d32" },
  { key: "dont_content", label: "Qué no hacer", icon: CancelOutlinedIcon, color: "#c62828" },
  { key: "careful_content", label: "Cuidado con", icon: WarningAmberIcon, color: "#ed6c02" },
];

// Cache en memoria por pestaña -- el contenido de ayuda casi no cambia y
// así no se repite la llamada cada vez que se abre el popover en la misma
// sesión. Se pierde al recargar la página, que es cuando queremos que un
// cambio hecho desde Superadmin se refleje.
const cache = new Map();

// Botón de ayuda ("?") reutilizable para cualquier pantalla del tenant. El
// contenido lo administra el superadmin de la plataforma (ver
// api/superadmin/screenHelpController.js) -- si la pantalla todavía no
// tiene ayuda configurada, el botón avisa en vez de fallar en silencio.
export default function HelpButton({ screenKey, sx }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [content, setContent] = useState(cache.get(screenKey) || null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleOpen = async (event) => {
    setAnchorEl(event.currentTarget);

    if (cache.has(screenKey)) {
      setContent(cache.get(screenKey));
      setNotFound(false);
      return;
    }

    try {
      setLoading(true);
      setNotFound(false);
      const res = await API.get(`/api/help/${screenKey}`);
      const data = res.data?.data || null;
      cache.set(screenKey, data);
      setContent(data);
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title="Ayuda de esta pantalla">
        <IconButton size="small" onClick={handleOpen} sx={{ opacity: 0.75, ...sx }}>
          <HelpOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { maxHeight: "70vh" } } }}
      >
        <Box sx={{ p: 2, maxWidth: 380, maxHeight: "70vh", overflowY: "auto" }}>
          {loading && <CircularProgress size={20} />}

          {!loading && notFound && (
            <Typography variant="body2" color="text.secondary">
              Aún no hay ayuda configurada para esta pantalla.
            </Typography>
          )}

          {!loading && content && (
            <>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
                {content.title}
              </Typography>
              {SECTIONS.map(({ key, label, icon: Icon, color }) => {
                const text = content[key];
                if (!text) return null;
                const items = text.split("\n").map((s) => s.trim()).filter(Boolean);
                if (items.length === 0) return null;
                return (
                  <Box key={key} sx={{ mb: 1.5, "&:last-child": { mb: 0 } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                      <Icon fontSize="small" sx={{ color }} />
                      <Typography variant="caption" fontWeight={700} sx={{ color }}>
                        {label}
                      </Typography>
                    </Box>
                    {items.map((item, i) => (
                      <Typography key={i} variant="body2" sx={{ pl: 3.5, mb: 0.25 }}>
                        • {item}
                      </Typography>
                    ))}
                  </Box>
                );
              })}
            </>
          )}
        </Box>
      </Popover>
    </>
  );
}
