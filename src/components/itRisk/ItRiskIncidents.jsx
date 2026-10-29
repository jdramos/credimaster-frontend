import React, { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Grid, MenuItem, Paper, Snackbar, Stack, Switch, Tab,
  Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import * as XLSX from "xlsx";
import API from "../../api";
import HelpButton from "../help/HelpButton";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportInteger, reportMoney, reportPeriod } from "../common/reportFormat";
import ItIncidentFormDialog from "./ItIncidentFormDialog";
import ItIncidentDetailDialog from "./ItIncidentDetailDialog";
import {
  ALERTS, BASE, INCIDENT_STATUS_COLORS, errorMessage, fmtDateTime, hoursText, nio, useItRiskPermissions,
} from "./itRiskShared";

// Registro de incidentes y eventos de TI — Norma sobre Gestión de Riesgo
// Tecnológico (CD-CONAMI-017-01AGO21-2014), Art. 28 (aviso a CONAMI inmediato
// y detalle a 24 h) y Art. 18 num. 1 (base histórica de eventos de pérdida).

export function DeadlineChip({ incident }) {
  const alert = incident.deadlines?.alert;
  if (!incident.reportable) return <Chip size="small" variant="outlined" label="No se informa" />;
  if (incident.status === "ANULADO") return null;
  if (!alert) {
    const late = incident.deadlines?.detail?.status === "ENVIADO_TARDE" || incident.deadlines?.initial?.status === "ENVIADO_TARDE";
    return <Chip size="small" color={late ? "warning" : "success"} label={late ? "Informado fuera de plazo" : "Informado"} />;
  }
  return <Chip size="small" color={ALERTS[alert].color} label={ALERTS[alert].label} />;
}

// Mismo texto que DeadlineChip, para imprimir.
const deadlineText = (incident) => {
  const alert = incident.deadlines?.alert;
  if (!incident.reportable) return "No se informa";
  if (incident.status === "ANULADO") return "";
  if (!alert) {
    const late = incident.deadlines?.detail?.status === "ENVIADO_TARDE" || incident.deadlines?.initial?.status === "ENVIADO_TARDE";
    return late ? "Informado fuera de plazo" : "Informado";
  }
  return ALERTS[alert].label;
};

const moneyColumn = (field, label) => ({ field, label, numeric: true, format: reportMoney });

export function AlertsBanner({ alerts, onOpen }) {
  if (!alerts?.total) return null;
  const urgent = alerts.overdue + alerts.initial_pending;
  return (
    <Alert severity={urgent ? "error" : "warning"} icon={<ReportProblemIcon />} sx={{ mb: 2 }}>
      <Typography fontWeight={700}>
        {alerts.total === 1 ? "1 incidente con aviso a CONAMI pendiente" : `${alerts.total} incidentes con aviso a CONAMI pendiente`}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2 }}>
        {alerts.items.map((a) => (
          <li key={a.id}>
            <Button size="small" sx={{ p: 0, minWidth: 0, textTransform: "none" }} onClick={() => onOpen(a.id)}>
              {a.incident_number}
            </Button>
            {` · ${a.title} — ${ALERTS[a.alert].label}`}
            {a.detail_due_at && (a.hours_left >= 0
              ? ` (el informe de 24 h vence el ${fmtDateTime(a.detail_due_at)}, faltan ${hoursText(a.hours_left)})`
              : ` (venció el ${fmtDateTime(a.detail_due_at)})`)}
          </li>
        ))}
      </Box>
    </Alert>
  );
}

function IncidentsTab({ catalog, rows, loading, filters, setFilters, onOpen, onNew, canManage }) {
  const types = catalog?.incident_types || {};
  const exportExcel = () => {
    const data = rows.map((r) => ({
      Registro: r.incident_number,
      Tipo: types[r.incident_type]?.short || r.incident_type,
      Título: r.title,
      Ocurrencia: fmtDateTime(r.occurred_at),
      Detección: fmtDateTime(r.detected_at),
      Solución: r.ended_at ? fmtDateTime(r.ended_at) : "",
      "Sistemas afectados": r.affected_systems,
      "Clientes afectados": Number(r.affected_customers_count || 0),
      "Pérdida (C$)": Number(r.economic_loss || 0),
      "Frustración de ganancia (C$)": Number(r.lost_profit || 0),
      Causa: catalog?.causes?.[r.cause_category] || r.cause_category,
      Severidad: catalog?.severities?.[r.severity] || r.severity,
      Estado: catalog?.incident_statuses?.[r.status] || r.status,
      Responsable: r.responsible_name,
      "Aviso inicial": r.notices?.find((n) => n.notice_type === "INICIAL" && !n.voided_at)?.reference || "",
      "Detalle 24 h": r.notices?.find((n) => n.notice_type === "DETALLE" && !n.voided_at)?.reference || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Incidentes TI");
    XLSX.writeFile(wb, `incidentes_ti_${dayjs().format("YYYYMMDD")}.xlsx`);
  };

  // Impresión con las columnas principales del Excel (las 16 no caben en una hoja).
  const buildPrintReport = () => {
    const sum = (f) => rows.reduce((s, r) => s + Number(r[f] || 0), 0);
    return {
      title: "Incidentes y eventos de TI",
      subtitle: [
        filters.type && `Tipo: ${types[filters.type]?.short || filters.type}`,
        `Estado: ${filters.status ? catalog?.incident_statuses?.[filters.status] || filters.status : "Vigentes"}`,
        filters.include_voided && "Incluye anulados",
      ].filter(Boolean).join(" · "),
      orientation: "landscape",
      columns: [
        { field: "incident_number", label: "Registro" },
        { field: "incident_type", label: "Tipo", format: (v) => types[v]?.short || v },
        { field: "title", label: "Título" },
        { field: "occurred_at", label: "Ocurrencia", format: fmtDateTime },
        { field: "detected_at", label: "Detección", format: fmtDateTime },
        { field: "affected_customers_count", label: "Clientes afectados", numeric: true, format: reportInteger },
        moneyColumn("economic_loss", "Pérdida (C$)"),
        moneyColumn("lost_profit", "Frustración de ganancia (C$)"),
        { field: "severity", label: "Severidad", format: (v) => catalog?.severities?.[v] || v },
        { field: "status", label: "Estado", format: (v) => catalog?.incident_statuses?.[v] || v },
        { label: "Aviso CONAMI", value: deadlineText },
      ],
      rows,
      totals: [
        { value: `Total (${rows.length})`, colspan: 5 },
        { value: reportInteger(sum("affected_customers_count")), raw: sum("affected_customers_count"), numeric: true },
        { value: reportMoney(sum("economic_loss")), raw: sum("economic_loss"), numeric: true },
        { value: reportMoney(sum("lost_profit")), raw: sum("lost_profit"), numeric: true },
        { value: "", colspan: 3 },
      ],
    };
  };

  return (
    <>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ md: "center" }}>
        <TextField select size="small" label="Tipo" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} sx={{ minWidth: 240 }}>
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(types).map(([k, t]) => <MenuItem key={k} value={k}>{t.short}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Estado" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} sx={{ minWidth: 170 }}>
          <MenuItem value="">Vigentes</MenuItem>
          {Object.entries(catalog?.incident_statuses || {}).map(([k, label]) => <MenuItem key={k} value={k}>{label}</MenuItem>)}
        </TextField>
        <FormControlLabel
          control={<Switch checked={filters.include_voided} onChange={(e) => setFilters((f) => ({ ...f, include_voided: e.target.checked }))} />}
          label="Incluir anulados"
        />
        <Box sx={{ flex: 1 }} />
        <ReportExportButtons excel={false} report={buildPrintReport} disabled={!rows.length} />
        <Button variant="outlined" onClick={exportExcel} disabled={!rows.length}>Excel</Button>
        {canManage && <Button variant="contained" startIcon={<AddIcon />} onClick={onNew}>Registrar incidente</Button>}
      </Stack>
      <Paper variant="outlined" sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Registro</TableCell>
              <TableCell>Evento</TableCell>
              <TableCell>Detección</TableCell>
              <TableCell align="right">Clientes</TableCell>
              <TableCell align="right">Impacto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Aviso CONAMI</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={7}><CircularProgress size={20} /></TableCell></TableRow>
            )}
            {!loading && !rows.length && (
              <TableRow><TableCell colSpan={7}><Typography color="text.secondary">No hay incidentes registrados con estos filtros.</Typography></TableCell></TableRow>
            )}
            {!loading && rows.map((r) => (
              <TableRow key={r.id} hover sx={{ cursor: "pointer", opacity: r.status === "ANULADO" ? 0.55 : 1 }} onClick={() => onOpen(r.id)}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{r.incident_number}</TableCell>
                <TableCell>
                  <Typography fontWeight={600} fontSize={13.5}>{r.title}</Typography>
                  <Typography fontSize={12} color="text.secondary">{types[r.incident_type]?.short}</Typography>
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.detected_at)}</TableCell>
                <TableCell align="right">{Number(r.affected_customers_count || 0).toLocaleString("es-NI")}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{nio(Number(r.economic_loss || 0) + Number(r.lost_profit || 0))}</TableCell>
                <TableCell><Chip size="small" color={INCIDENT_STATUS_COLORS[r.status]} label={catalog?.incident_statuses?.[r.status] || r.status} /></TableCell>
                <TableCell><DeadlineChip incident={r} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}

export function LossAnalysisTab() {
  const [range, setRange] = useState({ from: "", to: "" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async (params = {}) => {
    try {
      const { data: res } = await API.get(`${BASE}/incidents/loss-analysis`, { params });
      setData(res);
      setRange({ from: res.from, to: res.to });
      setError("");
    } catch (err) {
      setError(errorMessage(err, "No se pudo calcular el análisis."));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Las cuatro tablas del análisis en un solo reporte, una sección por tabla.
  const buildReport = () => {
    const groups = [
      ["Por tipo de evento", data.by_type],
      ["Por causa", data.by_cause],
      ["Por severidad", data.by_severity],
      ["Por mes de ocurrencia", data.by_month],
    ];
    return {
      title: "Análisis de pérdidas por riesgo tecnológico (Art. 18)",
      subtitle: [
        `Eventos: ${data.total.count}`,
        `Frecuencia anual: ${data.total.annual_frequency}`,
        `Impacto total: ${nio(data.total.total_impact)}`,
        `Impacto anualizado: ${nio(data.total.annual_impact)}`,
        `Clientes afectados: ${data.total.affected_customers.toLocaleString("es-NI")}`,
      ].join(" · "),
      period: reportPeriod(data.from, data.to),
      orientation: "landscape",
      columns: [
        { label: "Agrupación", value: (r) => r.label || r.month },
        { field: "count", label: "Eventos", numeric: true, format: reportInteger },
        { field: "annual_frequency", label: "Frecuencia anual", numeric: true, format: (v) => String(v ?? "") },
        moneyColumn("economic_loss", "Pérdida"),
        moneyColumn("lost_profit", "Frustración de ganancia"),
        moneyColumn("total_impact", "Impacto total"),
        moneyColumn("avg_impact", "Impacto promedio"),
        moneyColumn("max_impact", "Mayor impacto"),
      ],
      rows: groups.flatMap(([title, list]) => [{ section: true, label: title }, ...list]),
      fileName: `analisis_perdidas_ti_${data.from || ""}_${data.to || ""}`,
    };
  };

  const table = (title, rows, keyLabel) => (
    <Paper variant="outlined" sx={{ mb: 2, overflowX: "auto" }}>
      <Typography fontWeight={700} sx={{ px: 2, pt: 1.5 }}>{title}</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{keyLabel}</TableCell>
            <TableCell align="right">Eventos</TableCell>
            <TableCell align="right">Frecuencia anual</TableCell>
            <TableCell align="right">Pérdida</TableCell>
            <TableCell align="right">Frustración de ganancia</TableCell>
            <TableCell align="right">Impacto total</TableCell>
            <TableCell align="right">Impacto promedio</TableCell>
            <TableCell align="right">Mayor impacto</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key || r.month}>
              <TableCell>{r.label || r.month}</TableCell>
              <TableCell align="right">{r.count}</TableCell>
              <TableCell align="right">{r.annual_frequency}</TableCell>
              <TableCell align="right">{nio(r.economic_loss)}</TableCell>
              <TableCell align="right">{nio(r.lost_profit)}</TableCell>
              <TableCell align="right"><b>{nio(r.total_impact)}</b></TableCell>
              <TableCell align="right">{nio(r.avg_impact)}</TableCell>
              <TableCell align="right">{nio(r.max_impact)}</TableCell>
            </TableRow>
          ))}
          {!rows.length && <TableRow><TableCell colSpan={8}><Typography color="text.secondary">Sin eventos en el rango.</Typography></TableCell></TableRow>}
        </TableBody>
      </Table>
    </Paper>
  );

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Base histórica de eventos de pérdida o frustración de ganancia por riesgo tecnológico (Art. 18 num. 1.1), con su frecuencia (1.2) e impacto (1.3).
        Incluye todos los tipos de evento del registro, excepto los anulados. La frecuencia anual se calcula sobre los meses del rango.
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }} value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        <TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }} value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        <Button variant="outlined" onClick={() => load(range)}>Calcular</Button>
        <Box sx={{ flex: 1 }} />
        <ReportExportButtons report={buildReport} disabled={!data} />
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {data && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              ["Eventos", data.total.count],
              ["Frecuencia anual", data.total.annual_frequency],
              ["Impacto total", nio(data.total.total_impact)],
              ["Impacto anualizado", nio(data.total.annual_impact)],
              ["Clientes afectados", data.total.affected_customers.toLocaleString("es-NI")],
            ].map(([label, value]) => (
              <Grid item xs={6} md key={label}>
                <Paper variant="outlined" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="h6" fontWeight={800}>{value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
          {table("Por tipo de evento", data.by_type, "Tipo")}
          {table("Por causa", data.by_cause, "Causa")}
          {table("Por severidad", data.by_severity, "Severidad")}
          {table("Por mes de ocurrencia", data.by_month, "Mes")}
        </>
      )}
      {!data && !error && <CircularProgress size={20} />}
    </>
  );
}

const SETTINGS_FIELDS = [
  ["recipient_name", "Nombre del Presidente(a) Ejecutivo(a) de CONAMI", "Si se deja vacío, el escrito va dirigido al cargo"],
  ["recipient_title", "Cargo del destinatario", ""],
  ["recipient_entity", "Institución", ""],
  ["recipient_address", "Dirección", ""],
  ["signer_name", "Firmante", "Por omisión, el representante legal de Datos legales de la IMF"],
  ["signer_title", "Cargo del firmante", ""],
  ["city", "Ciudad del escrito", ""],
];

export function LetterSettingsTab({ settings, canConfigure, onSaved }) {
  const [form, setForm] = useState(settings || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setForm(settings || {}), [settings]);
  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await API.put(`${BASE}/settings`, form);
      onSaved(data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Paper variant="outlined" sx={{ p: 2, maxWidth: 760 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Datos con que se generan los escritos del Art. 28 dirigidos al Presidente Ejecutivo de CONAMI.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2}>
        {SETTINGS_FIELDS.map(([field, label, help]) => (
          <Grid item xs={12} md={field === "recipient_address" ? 12 : 6} key={field}>
            <TextField fullWidth size="small" label={label} helperText={help} value={form[field] || ""} disabled={!canConfigure}
              onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} />
          </Grid>
        ))}
      </Grid>
      {canConfigure && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button variant="contained" onClick={save} disabled={saving}>Guardar</Button>
        </Stack>
      )}
    </Paper>
  );
}

export default function ItRiskIncidents() {
  const { canManageIncidents, canConfigure } = useItRiskPermissions();
  const [tab, setTab] = useState(0);
  const [catalog, setCatalog] = useState(null);
  const [settings, setSettings] = useState(null);
  const [rows, setRows] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ type: "", status: "", include_voided: false });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    Promise.all([API.get(`${BASE}/catalog`), API.get(`${BASE}/settings`)])
      .then(([c, s]) => {
        setCatalog(c.data);
        setSettings(s.data);
      })
      .catch((err) => setError(errorMessage(err, "No se pudo cargar el módulo de Riesgo Tecnológico.")));
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      if (filters.include_voided) params.include_voided = "1";
      const [list, al] = await Promise.all([
        API.get(`${BASE}/incidents`, { params }),
        API.get(`${BASE}/incidents/alerts`),
      ]);
      setRows(Array.isArray(list.data) ? list.data : []);
      setAlerts(al.data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo cargar el registro de incidentes."));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const onSaved = (incident) => {
    setFormOpen(false);
    setToast(editing ? "Incidente actualizado." : `Incidente ${incident.incident_number} registrado.`);
    setEditing(null);
    loadRows();
    setDetailId(incident.id);
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <Typography variant="h5" fontWeight={800}>Incidentes y eventos de TI</Typography>
        <HelpButton screenKey="riesgo-tecnologico.incidentes" />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Norma sobre Gestión de Riesgo Tecnológico (CD-CONAMI-017-01AGO21-2014). Art. 28: aviso por escrito e inmediato al Presidente Ejecutivo de CONAMI y detalle de resultados y acciones dentro de las 24 horas siguientes.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <AlertsBanner alerts={alerts} onOpen={setDetailId} />

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Registro" />
        <Tab label="Análisis de pérdidas (Art. 18)" />
        <Tab label="Escritos a CONAMI" />
      </Tabs>

      {tab === 0 && (
        <IncidentsTab catalog={catalog} rows={rows} loading={loading} filters={filters} setFilters={setFilters}
          onOpen={setDetailId} onNew={() => { setEditing(null); setFormOpen(true); }} canManage={canManageIncidents} />
      )}
      {tab === 1 && <LossAnalysisTab />}
      {tab === 2 && <LetterSettingsTab settings={settings} canConfigure={canConfigure} onSaved={(s) => { setSettings(s); setToast("Configuración guardada."); }} />}

      <ItIncidentFormDialog open={formOpen} catalog={catalog} incident={editing} onClose={() => setFormOpen(false)} onSaved={onSaved} />
      <ItIncidentDetailDialog
        incidentId={detailId}
        catalog={catalog}
        settings={settings}
        onClose={() => setDetailId(null)}
        onEdit={(incident) => { setDetailId(null); setEditing(incident); setFormOpen(true); }}
        onChanged={loadRows}
      />
      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
