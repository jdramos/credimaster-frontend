import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Tooltip } from "@mui/material";
import BrokenImageIcon from "@mui/icons-material/BrokenImage";
import API from "../../api";

// Miniatura de un adjunto (imagen) de un ticket. Pide la URL firmada al
// endpoint indicado (difiere entre empresa y admin) y la muestra; al hacer
// clic abre la imagen en tamaño completo en otra pestaña.
export default function AttachmentThumb({ attachment, urlPath, size = 88 }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    API.get(urlPath(attachment.id))
      .then((res) => {
        if (active) setUrl(res.data?.url || null);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [attachment.id, urlPath]);

  const common = {
    width: size,
    height: size,
    borderRadius: 2,
    overflow: "hidden",
    border: "1px solid",
    borderColor: "divider",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: "action.hover",
    flex: "0 0 auto",
  };

  if (error) {
    return (
      <Tooltip title={attachment.file_name || "No disponible"}>
        <Box sx={common}>
          <BrokenImageIcon color="disabled" />
        </Box>
      </Tooltip>
    );
  }

  if (!url) {
    return (
      <Box sx={common}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  return (
    <Tooltip title={attachment.file_name || "Ver imagen"}>
      <Box
        component="a"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ ...common, cursor: "pointer", p: 0 }}
      >
        <img
          src={url}
          alt={attachment.file_name || "adjunto"}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </Box>
    </Tooltip>
  );
}
