import React, { useState } from "react";
import { Alert, Box, Button, Checkbox, FormControlLabel, Stack, Typography } from "@mui/material";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

// Los códigos de recuperación se muestran UNA sola vez (el servidor guarda
// solo su hash). Se exige confirmar que se guardaron antes de continuar.
export default function RecoveryCodesPanel({ codes = [], onDone, doneLabel = "Continuar" }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob(
      [`CrediMaster - códigos de recuperación (verificación en dos pasos)\nCada código sirve una sola vez.\n\n${text}\n`],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "credimaster-codigos-recuperacion.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
        Códigos de recuperación
      </Typography>
      <Alert severity="warning" sx={{ mt: 1 }}>
        Guárdelos en un lugar seguro. Si pierde su teléfono, cada código le permite entrar una vez. No se volverán a
        mostrar.
      </Alert>

      <Box
        data-testid="recovery-codes"
        sx={{
          mt: 2,
          p: 2,
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 1,
          border: "1px dashed",
          borderColor: "divider",
          borderRadius: 2,
          fontFamily: "monospace",
          fontSize: 16,
          textAlign: "center",
        }}
      >
        {codes.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Button size="small" startIcon={<ContentCopyRoundedIcon />} onClick={copy} sx={{ textTransform: "none" }}>
          {copied ? "Copiados" : "Copiar"}
        </Button>
        <Button size="small" startIcon={<DownloadRoundedIcon />} onClick={download} sx={{ textTransform: "none" }}>
          Descargar .txt
        </Button>
      </Stack>

      <FormControlLabel
        sx={{ mt: 1 }}
        control={<Checkbox checked={saved} onChange={(e) => setSaved(e.target.checked)} />}
        label="Ya guardé mis códigos de recuperación"
      />

      <Button variant="contained" fullWidth disabled={!saved} onClick={onDone} sx={{ mt: 1, fontWeight: 800 }}>
        {doneLabel}
      </Button>
    </Box>
  );
}
