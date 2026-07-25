import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, MenuItem, Paper, Snackbar, Stack, TextField, Typography, Accordion,
  AccordionSummary, AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DescriptionIcon from "@mui/icons-material/Description";
import API from "../../api";

export default function FinancialStatementNotes() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [notes, setNotes] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  const fetchNotes = async (targetYear) => {
    try {
      setLoading(true);
      const res = await API.get("/api/accounting/notes", { params: { year: targetYear } });
      const data = res.data?.data || [];
      setNotes(data);
      setDrafts(Object.fromEntries(data.map((n) => [n.id, n.content || ""])));
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudieron cargar las notas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(year); }, [year]);

  const saveNote = async (note, status) => {
    try {
      setSavingId(note.id);
      await API.put(`/api/accounting/notes/${note.id}`, {
        content: drafts[note.id] ?? note.content,
        status: status || note.status,
      });
      showAlert("Nota guardada correctamente", "success");
      fetchNotes(year);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo guardar la nota");
    } finally {
      setSavingId(null);
    }
  };

  const completedCount = useMemo(
    () => notes.filter((n) => (n.content || "").trim().length > 0).length,
    [notes],
  );

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear + 1; y >= currentYear - 5; y--) years.push(y);
    return years;
  }, [currentYear]);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <DescriptionIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Notas a los Estados Financieros</Typography>
            <Typography variant="body2" color="text.secondary">
              13 notas obligatorias del Manual Único de Cuentas CONAMI (Cap. IV)
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TextField select size="small" label="Año" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ width: 140 }}>
            {yearOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
          <Chip color={completedCount === 13 ? "success" : "warning"} label={`Notas con contenido: ${completedCount} / 13`} />
        </Stack>

        {loading && <Typography variant="body2" color="text.secondary">Cargando...</Typography>}

        {!loading && notes.map((note) => (
          <Accordion key={note.id} disableGutters sx={{ mb: 1, border: "1px solid #E5E7EB", borderRadius: 2, "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                <Typography sx={{ flex: 1 }}>{note.note_number}. {note.title}</Typography>
                <Chip
                  size="small"
                  color={note.status === "FINAL" ? "success" : "default"}
                  label={note.status === "FINAL" ? "Definitiva" : "Borrador"}
                />
                {(note.content || "").trim().length === 0 && <Chip size="small" color="warning" label="Vacía" />}
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <TextField
                multiline
                minRows={4}
                fullWidth
                placeholder="Redacte el contenido de esta nota..."
                value={drafts[note.id] ?? ""}
                onChange={(e) => setDrafts((p) => ({ ...p, [note.id]: e.target.value }))}
                sx={{ mb: 1 }}
              />
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={savingId === note.id}
                  onClick={() => saveNote(note, "DRAFT")}
                >
                  Guardar borrador
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={savingId === note.id}
                  onClick={() => saveNote(note, "FINAL")}
                >
                  Marcar como definitiva
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Paper>

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
