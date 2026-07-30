import React, { useState } from "react";
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";

// Botón "Ver instrucciones" reutilizable — muestra la descripción y
// dinámica de cuenta del Capítulo III del MUC-CONAMI. Se oculta si la
// cuenta no trae texto (no debería pasar salvo cuentas estructurales de
// nivel 2 sin código propio en el manual).
export default function AccountInstructionsButton({ mucCode, accountName, instructions, size = "small" }) {
  const [open, setOpen] = useState(false);

  if (!instructions) return null;

  return (
    <>
      <Tooltip title="Ver instrucciones del MUC">
        <IconButton size={size} onClick={() => setOpen(true)}>
          <MenuBookIcon fontSize={size} />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          {mucCode} - {accountName}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Manual Único de Cuentas para IMF — Capítulo III, Descripción y Dinámica de Cuentas
            (Resolución CD-CONAMI-016-06JUL30-2014)
          </Typography>
          <Box sx={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6 }}>
            {instructions}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} sx={{ textTransform: "none" }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
