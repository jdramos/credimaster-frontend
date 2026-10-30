import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  IconButton, MenuItem, Paper, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RefreshIcon from "@mui/icons-material/Refresh";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EventNoteIcon from "@mui/icons-material/EventNote";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useCompany } from "../itRisk/itRiskShared";
import { REPORT_TYPES, reportSpec, formatCell, fmtDate, fmtMoney, printNgrcReport, exportNgrcExcel } from "../../reports/ngrcReports";
import { BASE, errorMessage, lastMonthEnd, todayISO, useNgrcPermissions } from "./ngrcShared";

const MAX_ROWS_ON_SCREEN = 400;
const NUMERIC = ["money", "int", "pct"];
const KIND_OPTIONS = [
  { value: "PRENDARIA", label: "Prendaria (anual)" },
  { value: "HIPOTECARIA", label: "Hipotecaria (3 años)" },
  { value: "OTRA", label: "Otra (sin valuación periódica)" },
];

// Corte por omisión: cierre del mes anterior para los reportes de cartera;
// hoy para los que miran plazos por cliente o bien.
const defaultCut = (type) => (["CLIENTES_DESACTUALIZADOS", "VALUACIONES"].includes(type) ? todayISO() : lastMonthEnd());

function ValuationDialog({ open, asset, onClose, onChanged }) {
  const { canManage, canVoid } = useNgrcPermissions();
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!asset) return;
    API.get(`${BASE}/valuations`, { params: { asset_type: asset.asset_type, asset_id: asset.asset_id } })
      .then(({ data }) => setHistory(data))
      .catch((err) => setError(errorMessage(err, "No se pudo cargar el historial.")));
  }, [asset]);

  useEffect(() => {
    if (!open) return;
    setForm({ valuation_date: todayISO(), valuation_value: "", appraiser_name: "", appraiser_registry: "", is_independent: false, notes: "" });
    setFile(null);
    setError("");
    load();
  }, [open, load]);

  if (!asset) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async () => {
    try {
      setSaving(true);
      setError("");
      const fd = new FormData();
      fd.append("asset_type", asset.asset_type);
      fd.append("asset_id", asset.asset_id);
      Object.entries(form).forEach(([k, v]) => fd.append(k, k === "is_independent" ? (v ? "1" : "0") : v ?? ""));
      if (file) fd.append("file", file);
      await API.post(`${BASE}/valuations`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChanged?.();
      onClose();
    } catch (err) {
      setError(errorMessage(err, "No se pudo registrar la valuación."));
    } finally {
      setSaving(false);
    }
  };

  const voidOne = async (v) => {
    const reason = window.prompt("Motivo de la anulación de la valuación:");
    if (!reason) return;
    try {
      await API.post(`${BASE}/valuations/${v.id}/void`, { reason });
      load();
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err, "No se pudo anular."));
    }
  };

  const download = async (v) => {
    try {
      const { data } = await API.get(`${BASE}/valuations/${v.id}/file`);
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      setError(errorMessage(err, "No se pudo obtener el documento."));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Valuaciones · {asset.label}</DialogTitle>
      <DialogContent dividers>
        {asset.needs_independent && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Este bien vale más de US$25,000: la valuación debe hacerla un perito valuador independiente inscrito en el Registro de Peritos Valuadores de la CONAMI (Art. 54).
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography fontWeight={700} fontSize={14} sx={{ mb: 1 }}>Historial</Typography>
        {history.length ? (
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell><TableCell align="right">Valor</TableCell><TableCell>Perito</TableCell><TableCell>Inscripción</TableCell>
                <TableCell>Registró</TableCell><TableCell>Estado</TableCell><TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((v) => (
                <TableRow key={v.id} sx={v.voided_at ? { opacity: 0.55 } : undefined}>
                  <TableCell>{fmtDate(v.valuation_date)}</TableCell>
                  <TableCell align="right">{fmtMoney(v.valuation_value)}</TableCell>
                  <TableCell>{v.appraiser_name}{Number(v.is_independent) === 1 ? " (independiente)" : ""}</TableCell>
                  <TableCell>{v.appraiser_registry || "—"}</TableCell>
                  <TableCell>{v.registered_by_name}</TableCell>
                  <TableCell>{v.voided_at ? `Anulada: ${v.void_reason}` : "Vigente"}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {v.file_name && <Button size="small" onClick={() => download(v)}>Documento</Button>}
                    {canVoid && !v.voided_at && <Button size="small" color="error" onClick={() => voidOne(v)}>Anular</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography fontSize={13} color="text.secondary" sx={{ mb: 2 }}>Sin avalúos registrados: se toma el de {asset.asset_type === "GARANTIA" ? "constitución de la garantía" : "adjudicación"}.</Typography>
        )}
        {canManage && (
          <>
            <Typography fontWeight={700} fontSize={14} sx={{ mb: 1 }}>Registrar nuevo avalúo</Typography>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField type="date" label="Fecha del avalúo" InputLabelProps={{ shrink: true }} value={form.valuation_date || ""} onChange={set("valuation_date")} fullWidth />
                <TextField type="number" label="Valor (C$)" value={form.valuation_value || ""} onChange={set("valuation_value")} fullWidth />
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Perito valuador" value={form.appraiser_name || ""} onChange={set("appraiser_name")} fullWidth />
                <TextField label="Inscripción en CONAMI" value={form.appraiser_registry || ""} onChange={set("appraiser_registry")} fullWidth />
              </Stack>
              <FormControlLabel control={<Checkbox checked={Boolean(form.is_independent)} onChange={set("is_independent")} />} label="Perito independiente de la institución" />
              <TextField label="Notas" value={form.notes || ""} onChange={set("notes")} multiline minRows={2} />
              <Button component="label" variant="outlined" startIcon={<AttachFileIcon />} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
                {file ? file.name : "Adjuntar informe del avalúo"}
                <input hidden type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </Button>
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        {canManage && <Button variant="contained" onClick={save} disabled={saving}>Registrar avalúo</Button>}
      </DialogActions>
    </Dialog>
  );
}

function SpecTable({ section, actions, selection }) {
  const rows = section.rows.slice(0, MAX_ROWS_ON_SCREEN);
  const selectable = Boolean(selection);
  return (
    <TableContainer sx={{ maxHeight: 560, border: "1px solid var(--cm-border, #E2E8F0)", borderRadius: 1 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {selectable && (
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  checked={rows.length > 0 && rows.every((r) => selection.selected.has(r[selection.key]))}
                  indeterminate={rows.some((r) => selection.selected.has(r[selection.key])) && !rows.every((r) => selection.selected.has(r[selection.key]))}
                  onChange={(e) => selection.toggleAll(rows.map((r) => r[selection.key]), e.target.checked)}
                />
              </TableCell>
            )}
            {section.columns.map((c) => (
              <TableCell key={c.key} align={NUMERIC.includes(c.type) ? "right" : "left"} sx={{ fontWeight: 700, whiteSpace: "nowrap", bgcolor: "var(--cm-surface, #F1F5F9)" }}>{c.label}</TableCell>
            ))}
            {actions && <TableCell sx={{ bgcolor: "var(--cm-surface, #F1F5F9)" }} />}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} hover>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox size="small" checked={selection.selected.has(r[selection.key])} onChange={(e) => selection.toggle(r[selection.key], e.target.checked)} />
                </TableCell>
              )}
              {section.columns.map((c) => (
                <TableCell key={c.key} align={NUMERIC.includes(c.type) ? "right" : "left"} sx={{ fontSize: 12.5 }}>{formatCell(r[c.key], c.type)}</TableCell>
              ))}
              {actions && <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{actions(r)}</TableCell>}
            </TableRow>
          ))}
          {section.totals && (
            <TableRow>
              {selectable && <TableCell />}
              {section.columns.map((c) => (
                <TableCell key={c.key} align={NUMERIC.includes(c.type) ? "right" : "left"} sx={{ fontWeight: 800 }}>
                  {section.totals[c.key] == null ? "" : formatCell(section.totals[c.key], c.type)}
                </TableCell>
              ))}
              {actions && <TableCell />}
            </TableRow>
          )}
          {!section.rows.length && (
            <TableRow><TableCell colSpan={section.columns.length + 2} sx={{ color: "text.secondary" }}>Sin registros.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      {section.rows.length > MAX_ROWS_ON_SCREEN && (
        <Typography fontSize={12} color="text.secondary" sx={{ p: 1 }}>Se muestran {MAX_ROWS_ON_SCREEN} de {section.rows.length} filas; el Excel y la impresión incluyen todas.</Typography>
      )}
    </TableContainer>
  );
}

export default function NgrcReportView({ initialType = "CLASIFICACION", initialCut, onTypeChange }) {
  const { user } = useAuth() || {};
  const company = useCompany();
  const { canManage } = useNgrcPermissions();
  const [type, setType] = useState(initialType);
  const [cut, setCut] = useState(initialCut || defaultCut(initialType));
  const [from, setFrom] = useState("");
  const [all, setAll] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [asset, setAsset] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkKind, setBulkKind] = useState("");

  useEffect(() => {
    setType(initialType);
    setCut(initialCut || defaultCut(initialType));
  }, [initialType, initialCut]);

  const meta = REPORT_TYPES[type];

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    const params = { cut };
    if (meta.needsFrom && from) params.from = from;
    if (meta.allOption && all) params.all = "1";
    API.get(`${BASE}/reports/${type}`, { params })
      .then(({ data: d }) => {
        setData(d);
        setSelected(new Set());
      })
      .catch((err) => {
        setData(null);
        setError(errorMessage(err, "No se pudo generar el reporte."));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, cut, from, all]);

  useEffect(() => {
    load();
  }, [load]);

  const spec = useMemo(() => (data && data.type === type ? reportSpec(type, data) : null), [data, type]);

  const changeType = (t) => {
    setType(t);
    setCut(defaultCut(t));
    setFrom("");
    setAll(false);
    setData(null);
    onTypeChange?.(t);
  };

  const setKind = async (ids, kind) => {
    try {
      await API.put(`${BASE}/guarantees/kind`, { ids, guarantee_kind: kind || null });
      load();
    } catch (err) {
      setError(errorMessage(err, "No se pudo clasificar la garantía."));
    }
  };

  const selection = {
    key: "guarantee_id",
    selected,
    toggle: (id, on) => setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; }),
    toggleAll: (ids, on) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; }),
  };

  const valuationActions = (assetType) => (r) => (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
      {assetType === "GARANTIA" && canManage && (
        <TextField select size="small" value={r.guarantee_kind || ""} onChange={(e) => setKind([r.guarantee_id], e.target.value)} sx={{ minWidth: 150 }} SelectProps={{ displayEmpty: true }}>
          <MenuItem value=""><em>Sin clasificar</em></MenuItem>
          {KIND_OPTIONS.map((k) => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
        </TextField>
      )}
      <Tooltip title="Avalúos">
        <IconButton
          size="small"
          onClick={() => setAsset(assetType === "GARANTIA"
            ? { asset_type: "GARANTIA", asset_id: r.guarantee_id, label: `Garantía #${r.guarantee_id} · ${r.description}` }
            : { asset_type: "ADJUDICACION", asset_id: r.adjudication_id, label: `Bien adjudicado #${r.adjudication_id} · ${r.description}`, needs_independent: r.needs_independent_appraiser })}
        >
          <EventNoteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <TextField select label="Reporte" value={type} onChange={(e) => changeType(e.target.value)} sx={{ minWidth: 320 }}>
            {Object.entries(REPORT_TYPES).map(([k, r]) => <MenuItem key={k} value={k}>{r.article} · {r.title}</MenuItem>)}
          </TextField>
          {meta.needsFrom && (
            <TextField type="date" label="Desde" InputLabelProps={{ shrink: true }} value={from || data?.from || ""} onChange={(e) => setFrom(e.target.value)} />
          )}
          <TextField type="date" label={meta.dateLabel} InputLabelProps={{ shrink: true }} value={cut} inputProps={{ max: todayISO() }} onChange={(e) => setCut(e.target.value)} />
          {meta.allOption && <FormControlLabel control={<Switch checked={all} onChange={(e) => setAll(e.target.checked)} />} label="Incluir los que están al día" />}
          <Box sx={{ flex: 1 }} />
          <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Actualizar</Button>
          <Button variant="outlined" startIcon={<PrintIcon />} disabled={!spec} onClick={() => printNgrcReport({ company, user, spec })}>Imprimir</Button>
          <Button variant="contained" startIcon={<FileDownloadIcon />} disabled={!spec} onClick={() => exportNgrcExcel(spec, { companyName: company.commercial_name || company.legal_name, fileName: `NGRC_${type}_${cut}.xlsx` })}>Excel</Button>
        </Stack>
        <Typography fontSize={12.5} color="text.secondary" sx={{ mt: 1.5 }}>{meta.hint}</Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>}

      {!loading && spec && (
        <Stack spacing={2}>
          <Stack direction="row" flexWrap="wrap" gap={1.5}>
            {spec.kpis.map((k) => (
              <Paper key={k.label} variant="outlined" sx={{ p: 1.5, minWidth: 170, flex: "1 1 170px" }}>
                <Typography fontSize={18} fontWeight={800} color="primary.dark">{k.type ? formatCell(k.value, k.type) : k.value}</Typography>
                <Typography fontSize={11.5} color="text.secondary" sx={{ textTransform: "uppercase" }}>{k.label}</Typography>
              </Paper>
            ))}
          </Stack>
          {spec.notes.length > 0 && (
            <Alert severity="info" icon={false}>
              {spec.notes.map((n) => <Typography key={n} fontSize={12.5}>• {n}</Typography>)}
            </Alert>
          )}
          {spec.sections.map((s) => (
            <Box key={s.title}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                <Typography fontWeight={800} fontSize={14.5}>{s.title}</Typography>
                {s.assetType === "GARANTIA" && canManage && selected.size > 0 && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontSize={12.5}>{selected.size} seleccionada(s):</Typography>
                    <TextField select size="small" value={bulkKind} onChange={(e) => setBulkKind(e.target.value)} sx={{ minWidth: 190 }} SelectProps={{ displayEmpty: true }}>
                      <MenuItem value=""><em>Elegir tipo…</em></MenuItem>
                      {KIND_OPTIONS.map((k) => <MenuItem key={k.value} value={k.value}>{k.label}</MenuItem>)}
                    </TextField>
                    <Button size="small" variant="contained" disabled={!bulkKind} onClick={() => setKind([...selected], bulkKind)}>Clasificar</Button>
                  </Stack>
                )}
              </Stack>
              <SpecTable
                section={s}
                actions={s.assetType ? valuationActions(s.assetType) : null}
                selection={s.assetType === "GARANTIA" && canManage ? selection : null}
              />
            </Box>
          ))}
        </Stack>
      )}

      <ValuationDialog open={Boolean(asset)} asset={asset} onClose={() => setAsset(null)} onChanged={load} />
    </Box>
  );
}
