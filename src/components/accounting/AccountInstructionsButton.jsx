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

// El texto de instrucciones viene de un PDF extraído a texto plano: cada
// salto de línea es solo el ancho de columna del PDF original, no un
// separador de párrafo (confirmado: ninguna de las 1114 entradas de
// muc_instructions.json usa doble salto de línea). Dejarlos tal cual con
// white-space:pre-wrap corta oraciones a la mitad visualmente. Aquí se
// reflowea a texto corrido y se quita la primera línea cuando repite
// "<código> <NOMBRE>", que ya se muestra en el título del diálogo.
function reflowInstructions(raw, mucCode) {
  if (!raw) return "";

  let text = raw.replace(/\r\n/g, "\n");

  const firstBreak = text.indexOf("\n");
  if (firstBreak !== -1 && mucCode && text.slice(0, firstBreak).trim().startsWith(mucCode)) {
    text = text.slice(firstBreak + 1);
  }

  return text.replace(/\n/g, " ").replace(/[ \t]+/g, " ").trim();
}

// Botón "Ver instrucciones" reutilizable — muestra la descripción y
// dinámica de cuenta del Capítulo III del MUC-CONAMI. Se oculta si la
// cuenta no trae texto (no debería pasar salvo cuentas estructurales de
// nivel 2 sin código propio en el manual).
export default function AccountInstructionsButton({ mucCode, accountName, instructions, size = "small" }) {
  const [open, setOpen] = useState(false);

  if (!instructions) return null;

  const reflowedInstructions = reflowInstructions(instructions, mucCode);

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
          <Box sx={{ fontSize: 14, lineHeight: 1.6 }}>
            {reflowedInstructions}
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
