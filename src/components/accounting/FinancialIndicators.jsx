import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Collapse, IconButton, MenuItem, Paper, Snackbar,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import InsightsIcon from "@mui/icons-material/Insights";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import { LineChart, Line, ResponsiveContainer, Tooltip as RTooltip, ReferenceLine, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

// Indicadores financieros en el formato del reporte de la CONAMI, calculados
// desde la contabilidad (backend: GET /api/accounting/financial-indicators),
// comparados con el sector y con su análisis cualitativo. El reporte de la
// CONAMI se carga desde aquí (o desde el superadmin) y el selector "Comparar
// con" solo elige una IMF del reporte para ponerla al lado (no se guarda).

const LEVEL_STYLE = {
  FUERTE: { color: "#166534", bg: "#DCFCE7", label: "Fuerte" },
  FAVORABLE: { color: "#1E40AF", bg: "#DBEAFE", label: "Favorable" },
  OBSERVACION: { color: "#92400E", bg: "#FEF3C7", label: "En observación" },
  DEBIL: { color: "#991B1B", bg: "#FEE2E2", label: "Débil" },
};

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const periodLabel = (p) => {
  if (!p) return "";
  const [y, m] = p.slice(0, 7).split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
};

const fmt = (v, unit) => {
  if (v == null) return "—";
  if (unit === "veces") return `${(v / 100).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x`;
  return `${v.toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

const lastMonths = (count) => {
  const out = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
};

// Barra con la posición del valor frente al rango P25–P75 del sector.
function SectorBar({ ind }) {
  const s = ind.sector;
  if (!s || s.median == null || ind.value == null) return <Typography variant="caption" color="text.secondary">—</Typography>;
  const lo = Math.min(s.p25, ind.value);
  const hi = Math.max(s.p75, ind.value);
  const span = hi - lo || 1;
  const pos = (x) => `${((x - lo) / span) * 100}%`;
  const style = LEVEL_STYLE[ind.level] || { color: "#475569" };
  return (
    <Tooltip title={`Sector: P25 ${fmt(s.p25, ind.unit)} · mediana ${fmt(s.median, ind.unit)} · P75 ${fmt(s.p75, ind.unit)}${ind.percentile != null ? ` · percentil ${ind.percentile}` : ""}`}>
      <Box sx={{ position: "relative", height: 18, minWidth: 140 }}>
        <Box sx={{ position: "absolute", top: 7, left: 0, right: 0, height: 4, bgcolor: "#E5E7EB", borderRadius: 2 }} />
        <Box sx={{ position: "absolute", top: 5, height: 8, left: pos(s.p25), width: `calc(${pos(s.p75)} - ${pos(s.p25)})`, bgcolor: "#CBD5E1", borderRadius: 2 }} />
        <Box sx={{ position: "absolute", top: 3, height: 12, width: 2, left: pos(s.median), bgcolor: "#475569" }} />
        <Box sx={{ position: "absolute", top: 2, width: 14, height: 14, ml: "-7px", left: pos(ind.value), borderRadius: "50%", bgcolor: style.color, border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,.15)" }} />
      </Box>
    </Tooltip>
  );
}

function TrendIcon({ ind }) {
  if (ind.value == null || ind.previous == null) return null;
  const d = ind.value - ind.previous;
  const threshold = ind.unit === "veces" ? 1 : 0.05;
  if (Math.abs(d) < threshold) return <TrendingFlatIcon fontSize="small" sx={{ color: "#94A3B8" }} />;
  const improving = ind.polarity === "higher" ? d > 0 : ind.polarity === "lower" ? d < 0 : null;
  const color = improving == null ? "#64748B" : improving ? "#16A34A" : "#DC2626";
  return d > 0 ? <TrendingUpIcon fontSize="small" sx={{ color }} /> : <TrendingDownIcon fontSize="small" sx={{ color }} />;
}

const money = (v) => (v == null ? "—" : `C$ ${v.toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

// La fórmula con los montos de la contabilidad: numerador ÷ denominador = valor.
function CalculationDetail({ ind }) {
  const p = ind.parts;
  if (!p) return null;
  const line = (sign, label, amount) => (
    <TableRow>
      <TableCell sx={{ border: 0, py: 0.25, px: 0, width: 18, color: "text.secondary", fontWeight: 700 }}>{sign}</TableCell>
      <TableCell sx={{ border: 0, py: 0.25, pl: 0.5, fontSize: 12.5 }}>{label}</TableCell>
      <TableCell align="right" sx={{ border: 0, py: 0.25, pr: 0, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{money(amount)}</TableCell>
    </TableRow>
  );
  return (
    <Box sx={{ mt: 1.25, p: 1.25, bgcolor: "#fff", border: "1px solid #E5E7EB", borderRadius: 2, maxWidth: 560 }}>
      <Typography fontSize={11.5} fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, mb: 0.5 }}>
        Cálculo al corte
      </Typography>
      <Table size="small" aria-label={`Cálculo de ${ind.label}`}>
        <TableBody>
          {line("", p.num_label, p.num)}
          {line("÷", p.den_label, p.den)}
          <TableRow>
            <TableCell sx={{ borderTop: "1px solid #E5E7EB", borderBottom: 0, py: 0.5, px: 0, color: "text.secondary", fontWeight: 700 }}>=</TableCell>
            <TableCell sx={{ borderTop: "1px solid #E5E7EB", borderBottom: 0, py: 0.5, pl: 0.5, fontSize: 12.5 }}>{ind.label}</TableCell>
            <TableCell align="right" sx={{ borderTop: "1px solid #E5E7EB", borderBottom: 0, py: 0.5, pr: 0, fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>
              {ind.value == null ? "No aplica" : fmt(ind.value, ind.unit)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
}

// Valor de la IMF elegida y diferencia contra el tenant, coloreada según la polaridad.
function CompareCell({ ind }) {
  if (ind.compare_value == null) return <Typography fontSize={13.5} color="text.secondary">—</Typography>;
  const d = ind.value == null ? null : ind.value - ind.compare_value;
  const flat = d != null && Math.abs(d) < (ind.unit === "veces" ? 1 : 0.05);
  const better = d == null || flat || ind.polarity === "neutral" ? null : ind.polarity === "higher" ? d > 0 : d < 0;
  const color = better == null ? "text.secondary" : better ? "#16A34A" : "#DC2626";
  const size = d == null ? "" : ind.unit === "veces" ? `${(Math.abs(d) / 100).toFixed(2)} x` : `${Math.abs(d).toFixed(2)} pp`;
  const sign = d == null || flat ? "" : d > 0 ? "+" : "−";
  return (
    <>
      <Typography fontSize={13.5}>{fmt(ind.compare_value, ind.unit)}</Typography>
      {d != null && <Typography fontSize={11} sx={{ color }}>Usted: {flat ? "igual" : `${sign}${size}`}</Typography>}
    </>
  );
}

function IndicatorRow({ ind, series, comparing }) {
  const [open, setOpen] = useState(false);
  const style = LEVEL_STYLE[ind.level];
  const chartData = series.map((s) => ({
    period: periodLabel(s.period).slice(0, 3),
    value: s.values[ind.key] == null ? null : ind.unit === "veces" ? s.values[ind.key] / 100 : s.values[ind.key],
  }));
  const median = ind.sector?.median == null ? null : ind.unit === "veces" ? ind.sector.median / 100 : ind.sector.median;

  return (
    <>
      <TableRow hover sx={{ cursor: "pointer", "& > td": { borderBottom: open ? "none" : undefined } }} onClick={() => setOpen((o) => !o)}>
        <TableCell sx={{ width: 36, pr: 0 }}>
          <IconButton size="small">{open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}</IconButton>
        </TableCell>
        <TableCell>
          <Typography fontSize={13.5} fontWeight={700}>{ind.label}</Typography>
          <Typography fontSize={11.5} color="text.secondary">{ind.what}</Typography>
        </TableCell>
        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
            <TrendIcon ind={ind} />
            <Typography fontWeight={800} fontSize={14.5}>{fmt(ind.value, ind.unit)}</Typography>
          </Stack>
          <Typography fontSize={11} color="text.secondary">Mes ant.: {fmt(ind.previous, ind.unit)}</Typography>
        </TableCell>
        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
          <Typography fontSize={13.5}>{fmt(ind.sector?.median, ind.unit)}</Typography>
        </TableCell>
        {comparing && <TableCell align="right" sx={{ whiteSpace: "nowrap" }}><CompareCell ind={ind} /></TableCell>}
        <TableCell sx={{ minWidth: 170 }}><SectorBar ind={ind} /></TableCell>
        <TableCell align="center">
          {style ? (
            <Chip size="small" label={style.label} sx={{ bgcolor: style.bg, color: style.color, fontWeight: 800 }} />
          ) : (
            <Typography variant="caption" color="text.secondary">{ind.polarity === "neutral" ? "Estructura" : "—"}</Typography>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={comparing ? 7 : 6} sx={{ py: 0, bgcolor: "#F8FAFC" }}>
          <Collapse in={open} unmountOnExit>
            <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ py: 2, px: 1 }}>
              <Box sx={{ flex: 1.4 }}>
                <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>Análisis</Typography>
                <Typography fontSize={13.5} sx={{ mt: 0.5, lineHeight: 1.6 }}>{ind.text}</Typography>
                <Typography fontSize={11.5} color="text.secondary" sx={{ mt: 1 }}>Fórmula: {ind.formula}</Typography>
                <CalculationDetail ind={ind} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 260, height: 150 }}>
                <Typography fontSize={12} fontWeight={800} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>Últimos 6 meses</Typography>
                <ResponsiveContainer width="100%" height={125}>
                  <LineChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={50} />
                    <RTooltip formatter={(v) => (v == null ? "—" : ind.unit === "veces" ? `${v.toFixed(2)} x` : `${v.toFixed(2)}%`)} />
                    {median != null && <ReferenceLine y={median} stroke="#94A3B8" strokeDasharray="4 4" label={{ value: "Mediana sector", fontSize: 10, fill: "#64748B", position: "insideTopRight" }} />}
                    <Line type="monotone" dataKey="value" stroke="#0057B8" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Stack>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function FinancialIndicators() {
  const months = useMemo(() => lastMonths(24), []);
  const { role, permissions } = useContext(UserContext) || {};
  const canUpload = role === 1 || (permissions || []).includes("contabilidad.cuentas.gestionar");
  // Período vacío = el backend usa el corte del último reporte de la CONAMI cargado.
  const [period, setPeriod] = useState("");
  const [compare, setCompare] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const fileRef = useRef(null);

  const load = async (p, c) => {
    try {
      setLoading(true);
      const params = {};
      if (p) params.period = p;
      if (c) params.compare = c;
      const res = await API.get("/api/accounting/financial-indicators", { params });
      const d = res.data?.data || null;
      setData(d);
      // La IMF elegida no está en el reporte de este período: se suelta.
      if (c && d && !d.compare_institution) setCompare(null);
    } catch (error) {
      setAlert({ open: true, severity: "error", message: error.response?.data?.message || "No se pudieron calcular los indicadores" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(period, compare); }, [period, compare]);

  const uploadReport = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", file);
      const res = await API.post("/api/accounting/financial-indicators/sector-report", form, { headers: { "Content-Type": "multipart/form-data" } });
      setAlert({ open: true, severity: "success", message: res.data?.message || "Reporte cargado" });
      // Pasa al mes del reporte cargado para comparar con datos del mismo corte.
      const reportPeriod = String(res.data?.period || "").slice(0, 7);
      if (reportPeriod && reportPeriod !== (period || data?.period)) setPeriod(reportPeriod);
      else load(period, compare);
    } catch (error) {
      setAlert({ open: true, severity: "error", message: error.response?.data?.message || "No se pudo cargar el reporte" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const reportMonths = useMemo(() => new Set((data?.report_periods || []).map((r) => r.period)), [data]);
  const shownPeriod = period || data?.period || "";
  const periodOptions = useMemo(
    () => (shownPeriod && !months.includes(shownPeriod) ? [shownPeriod, ...months] : months),
    [months, shownPeriod],
  );
  const comparing = Boolean(data?.compare_institution);

  const exportExcel = () => {
    if (!data) return;
    const rows = data.indicators.map((i) => {
      const g = data.groups.find((x) => x.key === i.group);
      const conv = (v) => (v == null ? "" : i.unit === "veces" ? +(v / 100).toFixed(2) : v);
      return {
        Grupo: g?.label,
        Indicador: i.label,
        Unidad: i.unit === "veces" ? "veces" : "%",
        Valor: conv(i.value),
        Numerador: i.parts?.num_label || "",
        "Monto numerador (C$)": i.parts?.num ?? "",
        Denominador: i.parts?.den_label || "",
        "Monto denominador (C$)": i.parts?.den ?? "",
        "Mes anterior": conv(i.previous),
        "Mediana sector": conv(i.sector?.median),
        "P25 sector": conv(i.sector?.p25),
        "P75 sector": conv(i.sector?.p75),
        Percentil: i.percentile ?? "",
        Nivel: LEVEL_STYLE[i.level]?.label || (i.polarity === "neutral" ? "Estructura" : ""),
        ...(data.compare_institution
          ? {
              [data.compare_institution]: conv(i.compare_value),
              Diferencia: i.value == null || i.compare_value == null ? "" : conv(+(i.value - i.compare_value).toFixed(2)),
            }
          : {}),
        Fórmula: i.formula,
        Análisis: i.text,
      };
    });
    const summary = [
      [`Indicadores financieros — ${periodLabel(data.period)} (corte ${data.cut_date})`],
      [data.sector ? `Comparado con el reporte de la CONAMI de ${periodLabel(data.sector.period)} (${data.sector.institutions_count} instituciones)` : "Sin reporte del sector"],
      ...(data.compare_institution ? [[`Comparación con: ${data.compare_institution}`]] : []),
      [],
      ...data.summary.paragraphs.map((p) => [p.pillar, p.text]),
      [],
      ["Fortalezas", data.summary.strengths.join("; ")],
      ["Alertas", data.summary.alerts.join("; ")],
      ["En observación", data.summary.watch.join("; ")],
      ...(data.summary.data_warnings || []).map((w) => ["Advertencia contable", w]),
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Resumen");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Indicadores");
    XLSX.writeFile(wb, `Indicadores_financieros_${data.period}.xlsx`);
  };

  const counts = useMemo(() => {
    const c = { FUERTE: 0, FAVORABLE: 0, OBSERVACION: 0, DEBIL: 0 };
    (data?.indicators || []).forEach((i) => { if (i.level) c[i.level] += 1; });
    return c;
  }, [data]);

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <InsightsIcon sx={{ color: "#0057B8" }} />
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                <Typography variant="h6" fontWeight={700}>Indicadores financieros</Typography>
                <HelpButton screenKey="contabilidad.indicadores-financieros" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Formato del reporte de Indicadores Financieros de la CONAMI, calculados desde su contabilidad y comparados con el sector
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField select size="small" label="Período" value={shownPeriod} onChange={(e) => setPeriod(e.target.value)} sx={{ width: 220 }}>
              {periodOptions.map((m) => (
                <MenuItem key={m} value={m}>
                  {periodLabel(m)}
                  {reportMonths.has(m) && <Chip size="small" label="CONAMI" sx={{ ml: 1, height: 18, fontSize: 10.5 }} />}
                </MenuItem>
              ))}
            </TextField>
            {canUpload && (
              <>
                <input ref={fileRef} type="file" accept=".xls,.xlsx" hidden data-testid="conami-report-input" onChange={(e) => uploadReport(e.target.files?.[0])} />
                <Tooltip title="Suba el reporte de Indicadores Financieros que publica la CONAMI (reporte_18.xls) para actualizar los datos del sector">
                  <span>
                    <Button
                      variant="outlined"
                      startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileIcon />}
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                    >
                      Actualizar con reporte CONAMI
                    </Button>
                  </span>
                </Tooltip>
              </>
            )}
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportExcel} disabled={!data} sx={{ textTransform: "none" }}>
              Excel
            </Button>
          </Stack>
        </Stack>

        {loading && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 4, justifyContent: "center" }}>
            <CircularProgress size={22} /> <Typography color="text.secondary">Calculando indicadores…</Typography>
          </Stack>
        )}

        {!loading && data && (
          <>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
              {data.sector ? (
                <Chip color="info" variant="outlined" label={`Sector: reporte CONAMI de ${periodLabel(data.sector.period)} · ${data.sector.institutions_count} instituciones`} />
              ) : (
                <Chip color="warning" variant="outlined" label="Aún no hay un reporte de la CONAMI cargado para este período" />
              )}
              <Chip variant="outlined" label={`Corte contable: ${data.cut_date}`} />
              <Box sx={{ flex: 1 }} />
              {data.sector && (
                <Autocomplete
                  size="small"
                  sx={{ width: 320 }}
                  options={data.sector.institutions}
                  value={compare}
                  onChange={(_, v) => setCompare(v || null)}
                  renderInput={(params) => <TextField {...params} label="Comparar con (IMF del reporte CONAMI)" />}
                />
              )}
            </Stack>

            {data.sector_period_mismatch && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Para {periodLabel(data.period)} no hay reporte de la CONAMI cargado: la comparación usa el de {periodLabel(data.sector.period)}.
                {canUpload ? " Use «Actualizar con reporte CONAMI» para subir el del mismo mes." : ""}
              </Alert>
            )}

            {(data.summary.data_warnings || []).length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography fontWeight={700} fontSize={14}>Revise la contabilidad antes de interpretar los indicadores</Typography>
                {data.summary.data_warnings.map((w) => <Typography key={w} fontSize={13}>• {w}</Typography>)}
              </Alert>
            )}

            {/* Resumen ejecutivo */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, bgcolor: "#F8FAFC", border: "1px solid #E5E7EB" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} justifyContent="space-between" sx={{ mb: 1.5 }}>
                <Typography fontWeight={800} fontSize={16}>Resumen ejecutivo — {periodLabel(data.period)}</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {Object.entries(LEVEL_STYLE).map(([k, s]) => (
                    <Chip key={k} size="small" label={`${s.label}: ${counts[k]}`} sx={{ bgcolor: s.bg, color: s.color, fontWeight: 800 }} />
                  ))}
                </Stack>
              </Stack>
              <Stack spacing={1.25}>
                {data.summary.paragraphs.map((p) => (
                  <Box key={p.pillar}>
                    <Typography fontSize={12} fontWeight={800} color="#0057B8" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{p.pillar}</Typography>
                    <Typography fontSize={13.5} sx={{ lineHeight: 1.6 }}>{p.text}</Typography>
                  </Box>
                ))}
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography fontSize={12} fontWeight={800} color="#166534" sx={{ textTransform: "uppercase" }}>Fortalezas</Typography>
                  {data.summary.strengths.length ? data.summary.strengths.map((s) => <Typography key={s} fontSize={13}>• {s}</Typography>) : <Typography fontSize={13} color="text.secondary">—</Typography>}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography fontSize={12} fontWeight={800} color="#991B1B" sx={{ textTransform: "uppercase" }}>Alertas</Typography>
                  {data.summary.alerts.length ? data.summary.alerts.map((s) => <Typography key={s} fontSize={13}>• {s}</Typography>) : <Typography fontSize={13} color="text.secondary">—</Typography>}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography fontSize={12} fontWeight={800} color="#92400E" sx={{ textTransform: "uppercase" }}>En observación</Typography>
                  {data.summary.watch.length ? data.summary.watch.map((s) => <Typography key={s} fontSize={13}>• {s}</Typography>) : <Typography fontSize={13} color="text.secondary">—</Typography>}
                </Box>
              </Stack>
            </Paper>

            {/* Indicadores por grupo */}
            {data.groups.map((g) => {
              const items = data.indicators.filter((i) => i.group === g.key);
              return (
                <Paper key={g.key} elevation={0} sx={{ mb: 2, borderRadius: 3, border: "1px solid #E5E7EB", overflow: "hidden" }}>
                  <Box sx={{ px: 2, py: 1.25, bgcolor: "#0B3D91" }}>
                    <Typography fontWeight={800} color="#fff" fontSize={14.5}>{g.label}</Typography>
                  </Box>
                  <Box sx={{ overflowX: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell />
                          <TableCell>Indicador</TableCell>
                          <TableCell align="right">Su institución</TableCell>
                          <TableCell align="right">Mediana sector</TableCell>
                          {comparing && <TableCell align="right">{data.compare_institution}</TableCell>}
                          <TableCell>Posición en el sector</TableCell>
                          <TableCell align="center">Nivel</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((ind) => <IndicatorRow key={ind.key} ind={ind} series={data.series} comparing={comparing} />)}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              );
            })}

            <Typography fontSize={11.5} color="text.secondary">
              Calculado con los asientos contabilizados hasta la fecha de corte, según las cuentas del Manual Único de Cuentas. El nivel compara su resultado con los cuartiles de las IMF del reporte de la CONAMI; las referencias generales (por ejemplo, mora mayor a 10%) son criterios prudenciales de microfinanzas, no límites normativos. Haga clic en un indicador para ver su análisis y tendencia.
            </Typography>
          </>
        )}
      </Paper>

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert((a) => ({ ...a, open: false }))}>
        <Alert severity={alert.severity} onClose={() => setAlert((a) => ({ ...a, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
