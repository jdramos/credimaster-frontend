import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, List, ListItem, ListItemText, Stack, TextField, Typography } from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import API from "../../api";
import { VoidDialog } from "../itRisk/ItIncidentDetailDialog";
import { BASE, errorMessage, fmtDateTime, openSignedFile, useItPermissions } from "./itShared";

// Adjuntos de un registro de TI (factura, contrato firmado, evidencia...).
// Se anulan, no se borran.
export default function ItAttachments({ entityType, entityId, canUpload }) {
  const { canVoid } = useItPermissions();
  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [voiding, setVoiding] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await API.get(`${BASE}/attachments/${entityType}/${entityId}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los adjuntos."));
    }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const uploadFile = async () => {
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("description", description);
      await API.post(`${BASE}/attachments/${entityType}/${entityId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setFile(null);
      setDescription("");
      await load();
    } catch (err) {
      setError(errorMessage(err, "No se pudo adjuntar el archivo."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <List dense disablePadding>
        {rows.map((a) => (
          <ListItem key={a.id} disableGutters
            secondaryAction={
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => openSignedFile(`${BASE}/attachment-files/${a.id}`).catch((e) => setError(errorMessage(e, "No se pudo abrir.")))}>Ver</Button>
                {!a.voided_at && canVoid && <Button size="small" color="error" onClick={() => setVoiding(a)}>Anular</Button>}
              </Stack>
            }>
            <ListItemText
              primary={<span style={a.voided_at ? { textDecoration: "line-through", color: "var(--cm-text-3, #94A3B8)" } : undefined}>{a.file_name}</span>}
              secondary={a.voided_at ? `Anulado: ${a.void_reason}` : `${a.description ? `${a.description} · ` : ""}${a.uploaded_by_name || ""} · ${fmtDateTime(a.uploaded_at)}`}
            />
          </ListItem>
        ))}
        {!rows.length && <Typography variant="body2" color="text.secondary">Sin archivos.</Typography>}
      </List>
      {canUpload && (
        <Box sx={{ mt: 1, display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Button component="label" size="small" startIcon={<AttachFileIcon />}>
            {file ? file.name : "Elegir archivo"}
            <input hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
          <TextField size="small" label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} sx={{ flex: 1, minWidth: 180 }} />
          <Button size="small" variant="outlined" onClick={uploadFile} disabled={!file || saving}>Adjuntar</Button>
        </Box>
      )}
      <VoidDialog open={Boolean(voiding)} title={`Anular ${voiding?.file_name || ""}`} onClose={() => setVoiding(null)}
        onConfirm={async (reason) => { await API.post(`${BASE}/attachment-files/${voiding.id}/void`, { reason }); setVoiding(null); await load(); }} />
    </Box>
  );
}
