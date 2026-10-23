import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress,
  MenuItem, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import API from "../../api";
import HelpButton from "../help/HelpButton";
import { buildAssessmentReportHtml, downloadWord, printHtml } from "../../reports/itRiskLetters";
import ItAssessmentItemDialog from "./ItAssessmentItemDialog";
import { VoidDialog } from "./ItIncidentDetailDialog";
import {
  BASE, CATEGORY_COLORS, ITEM_STATUS_COLORS, errorMessage, fmtDate, useCompany, useItRiskPermissions,
} from "./itRiskShared";
import { useAuth } from "../../contexts/AuthContext";

// Autoevaluación anual de riesgo tecnológico (Art. 16 de la Norma
// CD-CONAMI-017-01AGO21-2014): lista de verificación de los Arts. 5 a 18
// (y 28) con estado, evidencia, responsable y plan de mejora; la categoría de
// infracción del Art. 21 prioriza las brechas. Informe para la Junta Directiva.

const ASSESSMENT_STATUS = {
  BORRADOR: { label: "Borrador", color: "warning" },
  PRESENTADA: { label: "Presentada a la Junta", color: "success" },
  ANULADA: { label: "Anulada", color: "default" },
};

const pct = (v) => (v == null ? "—" : `${Number(v).toLocaleString("es-NI", { maximumFractionDigits: 1 })}%`);

function NewAssessmentDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setForm({ year: String(dayjs().year()), assessment_date: dayjs().format("YYYY-MM-DD"), coordinator: "", scope_notes: "" });
      setError("");
    }
  }, [open]);
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await API.post(`${BASE}/assessments`, form);
      onCreated(data.id);
    } catch (err) {
      setError(errorMessage(err, "No se pudo crear la autoevaluación."));
    } finally {
      setSaving(false);
    }
  };
  const set = (f) => (e) => setForm((x) => ({ ...x, [f]: e.target.value }));
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nueva autoevaluación anual</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Se crea la lista de verificación de los Arts. 5 a 18 y 28. Si hay una autoevaluación de un año anterior, se copian los responsables y los planes de mejora pendientes; el estado de cada requisito se vuelve a evaluar.
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}><TextField fullWidth size="small" type="number" label="Año" value={form.year || ""} onChange={set("year")} /></Grid>
          <Grid item xs={6}><TextField fullWidth size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }} value={form.assessment_date || ""} onChange={set("assessment_date")} /></Grid>
          <Grid item xs={12}><TextField fullWidth size="small" label="Coordinador(a)" value={form.coordinator || ""} onChange={set("coordinator")} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={2} size="small" label="Alcance y metodología (opcional)" value={form.scope_notes || ""} onChange={set("scope_notes")} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>Crear</Button>
      </DialogActions>
    </Dialog>
  );
}

function PresentDialog({ open, assessment, catalog, onClose, onDone }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setForm({ presented_to_board_at: dayjs().format("YYYY-MM-DD"), board_minutes_ref: "", exposure_level: "", conclusions: "" });
      setError("");
    }
  }, [open]);
  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await API.post(`${BASE}/assessments/${assessment.id}/present`, form);
      onDone();
    } catch (err) {
      setError(errorMessage(err, "No se pudo registrar la presentación."));
    } finally {
      setSaving(false);
    }
  };
  const set = (f) => (e) => setForm((x) => ({ ...x, [f]: e.target.value }));
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Registrar presentación a la Junta Directiva</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Art. 16: los resultados de la autoevaluación y el nivel de exposición al riesgo tecnológico se presentan a la Junta Directiva al menos una vez al año. Después de registrarla, la autoevaluación queda de solo lectura.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={6}><TextField fullWidth size="small" type="date" label="Fecha de la sesión" InputLabelProps={{ shrink: true }} value={form.presented_to_board_at || ""} onChange={set("presented_to_board_at")} /></Grid>
          <Grid item xs={6}><TextField fullWidth size="small" label="No. de acta" value={form.board_minutes_ref || ""} onChange={set("board_minutes_ref")} /></Grid>
          <Grid item xs={12}>
            <TextField select fullWidth size="small" label="Nivel de exposición al riesgo tecnológico" value={form.exposure_level || ""} onChange={set("exposure_level")}>
              {Object.entries(catalog?.exposure_levels || {}).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={3} size="small" label="Conclusiones y acuerdos" value={form.conclusions || ""} onChange={set("conclusions")} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>Registrar</Button>
      </DialogActions>
    </Dialog>
  );
}

function AssessmentDetail({ id, catalog, onBack, onChanged }) {
  const { canManageAssessment, canVoid } = useItRiskPermissions();
  const company = useCompany();
  const { user } = useAuth() || {};
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [itemId, setItemId] = useState(null);
  const [filters, setFilters] = useState({ article: "", status: "", category: "" });
  const [presenting, setPresenting] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const { data: res } = await API.get(`${BASE}/assessments/${id}`);
      setData(res);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar la autoevaluación."));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(
    () => (data?.items || []).filter((i) =>
      (!filters.article || i.article === filters.article) &&
      (!filters.status || i.status === filters.status) &&
      (!filters.category || i.infraction_category === filters.category)),
    [data, filters],
  );
  const articles = useMemo(() => [...new Set((data?.items || []).map((i) => i.article))], [data]);

  const report = async (format) => {
    try {
      const { data: res } = await API.get(`${BASE}/assessments/${id}/report`);
      const html = buildAssessmentReportHtml({ company, user, report: res });
      if (format === "word") downloadWord(html, `Autoevaluacion_riesgo_tecnologico_${res.assessment.year}`);
      else printHtml(html);
    } catch (err) {
      setError(errorMessage(err, "No se pudo generar el informe."));
    }
  };

  if (error && !data) return <Alert severity="error">{error}</Alert>;
  if (!data) return <CircularProgress size={24} />;
  const s = data.summary;
  const status = ASSESSMENT_STATUS[data.status];
  const selected = data.items.find((i) => i.id === itemId) || null;

  return (
    <>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>Volver</Button>
        <Typography variant="h6" fontWeight={800}>Autoevaluación {data.year}</Typography>
        <Chip size="small" color={status.color} label={status.label} />
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => report("pdf")}>Informe para la Junta</Button>
        <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => report("word")}>Word</Button>
        {data.status === "BORRADOR" && canManageAssessment && (
          <Button variant="contained" onClick={() => setPresenting(true)}>Presentar a la Junta</Button>
        )}
        {data.status !== "ANULADA" && canVoid && <Button color="error" onClick={() => setVoiding(true)}>Anular</Button>}
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {data.status === "PRESENTADA" && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Presentada a la Junta Directiva el {fmtDate(data.presented_to_board_at)}, acta {data.board_minutes_ref}. Nivel de exposición: {catalog?.exposure_levels?.[data.exposure_level]}.
        </Alert>
      )}
      {data.status === "ANULADA" && <Alert severity="warning" sx={{ mb: 2 }}>Anulada por {data.voided_by_name}: {data.void_reason}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Cumplimiento ponderado</Typography>
            <Typography variant="h5" fontWeight={800}>{pct(s.compliance_pct)}</Typography>
            <LinearProgress variant="determinate" value={Number(s.compliance_pct || 0)} sx={{ mt: 1 }} />
            <Typography variant="caption" color="text.secondary">{s.evaluated} de {s.total} requisitos evaluados</Typography>
          </Paper>
        </Grid>
        {s.by_category.map((c) => (
          <Grid item xs={12} sm={4} md={3} key={c.key}>
            <Paper variant="outlined" sx={{ p: 1.5, cursor: "pointer" }} onClick={() => setFilters((f) => ({ ...f, category: f.category === c.key ? "" : c.key }))}>
              <Stack direction="row" justifyContent="space-between">
                <Chip size="small" color={CATEGORY_COLORS[c.key]} label={`Infracción ${catalog?.infraction_categories?.[c.key]?.toLowerCase() || c.key}`} />
                <Typography fontWeight={800}>{pct(c.compliance_pct)}</Typography>
              </Stack>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {c.NO_CUMPLE} no cumple · {c.PARCIAL} parcial · {c.PENDIENTE} sin evaluar
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 1.5 }}>
        <TextField select size="small" label="Artículo" value={filters.article} onChange={(e) => setFilters((f) => ({ ...f, article: e.target.value }))} sx={{ minWidth: 160 }}>
          <MenuItem value="">Todos</MenuItem>
          {articles.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Estado" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} sx={{ minWidth: 180 }}>
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(catalog?.item_statuses || {}).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Categoría (Art. 21)" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} sx={{ minWidth: 180 }}>
          <MenuItem value="">Todas</MenuItem>
          {Object.entries(catalog?.infraction_categories || {}).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
        </TextField>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>{items.length} requisito(s)</Typography>
      </Stack>

      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Req.</TableCell>
              <TableCell>Requisito</TableCell>
              <TableCell>Infracción</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Responsable</TableCell>
              <TableCell>Plan de mejora</TableCell>
              <TableCell align="right">Adjuntos</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.id} hover sx={{ cursor: "pointer" }} onClick={() => setItemId(i.id)}>
                <TableCell sx={{ whiteSpace: "nowrap", verticalAlign: "top" }}>
                  <Typography fontWeight={700} fontSize={13}>{i.item_code}</Typography>
                  <Typography fontSize={11.5} color="text.secondary">{i.article}</Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 480, verticalAlign: "top" }}>{i.requirement}</TableCell>
                <TableCell sx={{ verticalAlign: "top" }}>
                  <Chip size="small" variant="outlined" color={CATEGORY_COLORS[i.infraction_category]} label={catalog?.infraction_categories?.[i.infraction_category] || i.infraction_category} />
                  <Typography fontSize={11} color="text.secondary">{i.infraction_ref.replace("Art. 21 num. ", "21.")}</Typography>
                </TableCell>
                <TableCell sx={{ verticalAlign: "top" }}>
                  <Chip size="small" color={ITEM_STATUS_COLORS[i.status]} variant={i.status === "PENDIENTE" ? "outlined" : "filled"} label={catalog?.item_statuses?.[i.status] || i.status} />
                </TableCell>
                <TableCell sx={{ verticalAlign: "top" }}>{i.responsible || "—"}</TableCell>
                <TableCell sx={{ maxWidth: 280, verticalAlign: "top" }}>
                  {i.improvement_plan || "—"}
                  {i.due_date && <Typography fontSize={11} color="text.secondary">Compromiso: {fmtDate(i.due_date)}</Typography>}
                </TableCell>
                <TableCell align="right" sx={{ verticalAlign: "top" }}>{(i.evidence || []).filter((e) => !e.voided_at).length || ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {selected && (
        <ItAssessmentItemDialog
          assessment={data}
          item={selected}
          catalog={catalog}
          onClose={() => setItemId(null)}
          onSaved={async (close) => {
            await load();
            onChanged();
            if (close) {
              setItemId(null);
              setToast("Requisito guardado.");
            }
          }}
        />
      )}
      <PresentDialog open={presenting} assessment={data} catalog={catalog} onClose={() => setPresenting(false)}
        onDone={async () => { setPresenting(false); await load(); onChanged(); setToast("Presentación registrada."); }} />
      <VoidDialog open={voiding} title={`Anular la autoevaluación ${data.year}`} onClose={() => setVoiding(false)}
        onConfirm={async (reason) => { await API.post(`${BASE}/assessments/${id}/void`, { reason }); setVoiding(false); await load(); onChanged(); }} />
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </>
  );
}

export default function ItRiskAssessments() {
  const { canManageAssessment } = useItRiskPermissions();
  const [catalog, setCatalog] = useState(null);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await API.get(`${BASE}/assessments`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar las autoevaluaciones."));
    }
  }, []);

  useEffect(() => {
    API.get(`${BASE}/catalog`).then(({ data }) => setCatalog(data)).catch((err) => setError(errorMessage(err, "No se pudo cargar el catálogo.")));
    load();
  }, [load]);

  const currentYear = dayjs().year();
  const hasCurrent = (rows || []).some((r) => r.year === currentYear && r.status !== "ANULADA");
  const lastPresented = (rows || []).find((r) => r.status === "PRESENTADA");

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography variant="h5" fontWeight={800}>Autoevaluación de riesgo tecnológico</Typography>
        <HelpButton screenKey="riesgo-tecnologico.autoevaluacion" />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Art. 16 de la Norma CD-CONAMI-017-01AGO21-2014: autoevaluación conforme a la norma, presentada al menos una vez al año a la Junta Directiva junto con el nivel de exposición al riesgo tecnológico.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {selectedId ? (
        <AssessmentDetail id={selectedId} catalog={catalog} onBack={() => { setSelectedId(null); load(); }} onChanged={load} />
      ) : (
        <>
          {rows && !hasCurrent && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No hay autoevaluación de {currentYear}.
              {lastPresented ? ` La última presentada a la Junta Directiva es la de ${lastPresented.year} (${fmtDate(lastPresented.presented_to_board_at)}).` : " Aún no se ha presentado ninguna a la Junta Directiva."}
            </Alert>
          )}
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
            {canManageAssessment && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)}>Nueva autoevaluación</Button>}
          </Stack>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Año</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Cumplimiento</TableCell>
                  <TableCell align="right">Evaluados</TableCell>
                  <TableCell align="right">Brechas</TableCell>
                  <TableCell>Junta Directiva</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!rows && <TableRow><TableCell colSpan={7}><CircularProgress size={20} /></TableCell></TableRow>}
                {rows && !rows.length && (
                  <TableRow><TableCell colSpan={7}><Typography color="text.secondary">Todavía no hay autoevaluaciones.</Typography></TableCell></TableRow>
                )}
                {(rows || []).map((r) => (
                  <TableRow key={r.id} hover sx={{ cursor: "pointer", opacity: r.status === "ANULADA" ? 0.55 : 1 }} onClick={() => setSelectedId(r.id)}>
                    <TableCell><b>{r.year}</b></TableCell>
                    <TableCell>{fmtDate(r.assessment_date)}</TableCell>
                    <TableCell><Chip size="small" color={ASSESSMENT_STATUS[r.status].color} label={ASSESSMENT_STATUS[r.status].label} /></TableCell>
                    <TableCell align="right">{pct(r.summary.compliance_pct)}</TableCell>
                    <TableCell align="right">{r.summary.evaluated} / {r.summary.total}</TableCell>
                    <TableCell align="right">{r.summary.gaps_count}</TableCell>
                    <TableCell>{r.presented_to_board_at ? `${fmtDate(r.presented_to_board_at)} · acta ${r.board_minutes_ref}` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
      <NewAssessmentDialog open={creating} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); load(); setSelectedId(id); }} />
    </Box>
  );
}
