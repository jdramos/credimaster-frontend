import React, { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tabs, TextField, Typography,
} from "@mui/material";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import PrintIcon from "@mui/icons-material/Print";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { useCompany } from "../itRisk/itRiskShared";
import {
  NORM_NAME, NORM_REF, OBLIGATION_STATUS, DUE_BASIS, REPORT_TYPES, fmtDate, obligationsSpec, printNgrcReport, exportNgrcExcel,
} from "../../reports/ngrcReports";
import NgrcRecordDialog from "./NgrcRecordDialog";
import NgrcReportView from "./NgrcReportView";
import { BASE, daysText, errorMessage, frequencyLabel, useNgrcPermissions } from "./ngrcShared";

// Cumplimiento de la NGRC (Resolución CD-CONAMI-019-02MAY25-2023): estado y
// plazos de cada obligación periódica, reportes que salen del sistema,
// registro de lo cumplido (actas, envíos, dictámenes) y configuración de
// avisos. Solo empresas normadas por la CONAMI. Backend: /api/ngrc.

const TABS = ["obligaciones", "reportes", "registro", "configuracion"];

function StatusChip({ status }) {
  const s = OBLIGATION_STATUS[status] || { label: status, color: "default" };
  return <Chip size="small" color={s.color} label={s.label} variant={s.color === "default" ? "outlined" : "filled"} />;
}

function ObligationsTab({ data, onRegister, onComplete, onOpenReport }) {
  const { canManage } = useNgrcPermissions();
  const groups = [
    ["CONAMI", "Envíos a la CONAMI"],
    ["JUNTA", "Junta Directiva"],
    ["INTERNA", "Internas (revisadas por la CONAMI en supervisión)"],
  ];
  return (
    <Stack spacing={3}>
      {groups.map(([audience, title]) => (
        <Box key={audience}>
          <Typography fontWeight={800} fontSize={15} sx={{ mb: 1 }}>{title}</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "var(--cm-surface, #F1F5F9)" } }}>
                  <TableCell>Artículo</TableCell>
                  <TableCell>Obligación</TableCell>
                  <TableCell>Frecuencia</TableCell>
                  <TableCell>Período</TableCell>
                  <TableCell>Vence</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Último registro</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {data.obligations.filter((o) => o.audience === audience).map((o) => {
                  const c = o.current || {};
                  const pendingRecord = c.record && !c.record.completed_date ? c.record : null;
                  const last = o.history?.find((h) => h.completed_date);
                  return (
                    <TableRow key={o.code} hover sx={{ verticalAlign: "top" }}>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{o.article}</TableCell>
                      <TableCell sx={{ maxWidth: 380 }}>
                        <Typography fontSize={13.5} fontWeight={600}>{o.title}</Typography>
                        <Typography fontSize={12} color="text.secondary">{o.due_rule}</Typography>
                        {o.backlog?.length > 0 && (
                          <Typography fontSize={12} color="error.main">
                            Atrasados: {o.backlog.map((p) => `${p.period_label} (venció ${fmtDate(p.due_date)})`).join(", ")}
                          </Typography>
                        )}
                        {c.note && <Typography fontSize={12} color="text.secondary">{c.note}</Typography>}
                      </TableCell>
                      <TableCell>{frequencyLabel(o)}</TableCell>
                      <TableCell>
                        {c.period_label || "—"}
                        {o.kind === "POR_ELEMENTO" && c.total != null && (
                          <Typography fontSize={12} color={c.overdue ? "error.main" : "text.secondary"}>
                            {c.overdue || 0} vencidos · {c.due_soon || 0} por vencer de {c.total}
                          </Typography>
                        )}
                        {o.next && <Typography fontSize={12} color="text.secondary">Próximo: {o.next.period_label}, vence {fmtDate(o.next.due_date)}{o.next.due_estimated ? " (estimado)" : ""}</Typography>}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {fmtDate(c.due_date || o.due_date)}
                        <Typography fontSize={11.5} color="text.secondary">{DUE_BASIS[c.due_basis] || ""}</Typography>
                        {c.days_left != null && ["PENDIENTE", "POR_VENCER", "VENCIDO", "EN_PROCESO"].includes(c.status) && (
                          <Typography fontSize={11.5} color={c.days_left < 0 ? "error.main" : "text.secondary"}>{daysText(c.days_left)}</Typography>
                        )}
                      </TableCell>
                      <TableCell><StatusChip status={o.status} /></TableCell>
                      <TableCell sx={{ fontSize: 12.5 }}>
                        {c.record?.board_session_date && <div>Sesión de Junta {fmtDate(c.record.board_session_date)}</div>}
                        {last ? (
                          <>
                            <div>{fmtDate(last.completed_date)}{last.reference ? ` · ${last.reference}` : ""}</div>
                            <Typography fontSize={11.5} color="text.secondary">{last.registered_by_name}</Typography>
                          </>
                        ) : !c.record ? "—" : null}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        {o.report && <Button size="small" onClick={() => onOpenReport(o.report, c.cut_date)}>Reporte</Button>}
                        {o.kind === "ICC" && <Button size="small" component={RouterLink} to={o.path}>Ir al ICC</Button>}
                        {canManage && pendingRecord && <Button size="small" variant="outlined" onClick={() => onComplete(o, pendingRecord)}>Completar</Button>}
                        {canManage && !pendingRecord && ["CALENDARIO", "ROTATIVA"].includes(o.kind) && (
                          <Button size="small" variant="contained" onClick={() => onRegister(o, c.period_key)}>Registrar</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </Stack>
  );
}

function RecordsTab({ refreshKey, onChanged }) {
  const { canVoid } = useNgrcPermissions();
  const [rows, setRows] = useState([]);
  const [includeVoided, setIncludeVoided] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    API.get(`${BASE}/records`, { params: includeVoided ? { include_voided: "1" } : {} })
      .then(({ data }) => setRows(data))
      .catch((err) => setError(errorMessage(err, "No se pudo cargar el registro.")));
  }, [includeVoided]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const voidOne = async (r) => {
    const reason = window.prompt("Motivo de la anulación (el registro no se borra, queda anulado):");
    if (!reason) return;
    try {
      await API.post(`${BASE}/records/${r.id}/void`, { reason });
      load();
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err, "No se pudo anular."));
    }
  };

  const download = async (r) => {
    try {
      const { data } = await API.get(`${BASE}/records/${r.id}/file`);
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      setError(errorMessage(err, "No se pudo obtener el documento."));
    }
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
        <Button size="small" onClick={() => setIncludeVoided((v) => !v)}>{includeVoided ? "Ocultar anulados" : "Mostrar anulados"}</Button>
      </Stack>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, bgcolor: "var(--cm-surface, #F1F5F9)" } }}>
              <TableCell>Obligación</TableCell><TableCell>Período</TableCell><TableCell>Sesión de Junta</TableCell><TableCell>Acta</TableCell>
              <TableCell>Cumplido</TableCell><TableCell>Referencia</TableCell><TableCell>Registró</TableCell><TableCell>Estado</TableCell><TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} sx={r.active_marker ? undefined : { opacity: 0.55 }}>
                <TableCell sx={{ maxWidth: 320, fontSize: 12.5 }}>{r.obligation_title}</TableCell>
                <TableCell>{r.period_key?.startsWith("R-") ? "—" : r.period_key}</TableCell>
                <TableCell>{fmtDate(r.board_session_date)}</TableCell>
                <TableCell>{r.board_minutes_ref || "—"}</TableCell>
                <TableCell>{fmtDate(r.completed_date)}</TableCell>
                <TableCell sx={{ fontSize: 12.5 }}>{r.reference || "—"}{r.notes ? <Typography fontSize={11.5} color="text.secondary">{r.notes}</Typography> : null}</TableCell>
                <TableCell sx={{ fontSize: 12.5 }}>{r.registered_by_name}<Typography fontSize={11.5} color="text.secondary">{String(r.created_at || "").slice(0, 10)}</Typography></TableCell>
                <TableCell>{r.active_marker ? (r.completed_date ? "Vigente" : "En proceso") : `Anulado: ${r.void_reason}`}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  {r.file_name && <Button size="small" onClick={() => download(r)}>Documento</Button>}
                  {canVoid && r.active_marker ? <Button size="small" color="error" onClick={() => voidOne(r)}>Anular</Button> : null}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={9} sx={{ color: "text.secondary" }}>Aún no hay cumplimientos registrados.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

const SETTING_FIELDS = [
  ["dias_aviso", "Días de aviso antes del vencimiento", "Desde cuántos días antes se marca «por vencer» y aparece el aviso en la barra superior."],
  ["dias_plazo_interno", "Plazo interno tras el corte (días)", "Para los reportes cuyo día de entrega no fija la norma: exposición trimestral, prorrogados y reestructurados, listado de adjudicados, informe trimestral de abogados."],
  ["dias_sesion_junta", "Meta para la sesión de Junta tras el corte semestral (días)", "Solo estima el vencimiento de la calificación hasta que se registre la sesión; luego rigen los 30 días del Art. 9."],
  ["dias_informe_abogados", "Plazo del informe mensual de abogados (días tras el cierre del mes)", ""],
];

function SettingsTab({ settings, onSaved }) {
  const { canConfigure } = useNgrcPermissions();
  const [form, setForm] = useState(settings);
  const [msg, setMsg] = useState(null);
  useEffect(() => setForm(settings), [settings]);

  const save = async () => {
    try {
      const payload = Object.fromEntries(SETTING_FIELDS.map(([k]) => [k, Number(form[k])]));
      payload.cumplimiento_desde = form.cumplimiento_desde || null;
      await API.put(`${BASE}/settings`, payload);
      setMsg({ severity: "success", text: "Configuración guardada." });
      onSaved?.();
    } catch (err) {
      setMsg({ severity: "error", text: errorMessage(err, "No se pudo guardar.") });
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, maxWidth: 760 }}>
      {msg && <Alert severity={msg.severity} sx={{ mb: 2 }}>{msg.text}</Alert>}
      <Stack spacing={2.5}>
        {SETTING_FIELDS.map(([k, label, help]) => (
          <TextField key={k} type="number" label={label} helperText={help} value={form[k] ?? ""} disabled={!canConfigure} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
        ))}
        <TextField
          type="date"
          label="Seguimiento desde"
          InputLabelProps={{ shrink: true }}
          value={form.cumplimiento_desde || ""}
          disabled={!canConfigure}
          onChange={(e) => setForm((f) => ({ ...f, cumplimiento_desde: e.target.value }))}
          helperText="Los plazos que vencieron antes de esta fecha no se reclaman (puesta en marcha). Vacía = se reclaman todos los períodos recientes."
        />
        {canConfigure && <Button variant="contained" onClick={save} sx={{ alignSelf: "flex-start" }}>Guardar</Button>}
      </Stack>
    </Paper>
  );
}

export default function NgrcCompliance() {
  const { user } = useAuth() || {};
  const company = useCompany();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "obligaciones";
  const reportType = REPORT_TYPES[params.get("reporte")] ? params.get("reporte") : "CLASIFICACION";
  const reportCut = params.get("corte") || undefined;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    API.get(`${BASE}/obligations`)
      .then(({ data: d }) => {
        setData(d);
        setError("");
      })
      .catch((err) => setError(errorMessage(err, "No se pudo calcular el estado de las obligaciones.")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const go = (next) => setParams((p) => {
    const n = new URLSearchParams(p);
    Object.entries(next).forEach(([k, v]) => (v == null ? n.delete(k) : n.set(k, v)));
    return n;
  });

  const changed = () => setRefreshKey((k) => k + 1);
  const spec = data ? obligationsSpec(data) : null;

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ md: "center" }} spacing={1.5} sx={{ mb: 2 }}>
        <FactCheckIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={900} fontSize={20}>Cumplimiento NGRC</Typography>
          <Typography fontSize={12.5} color="text.secondary">{NORM_NAME} · {NORM_REF}</Typography>
        </Box>
        {tab === "obligaciones" && spec && (
          <>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => printNgrcReport({ company, user, spec })}>Imprimir calendario</Button>
            <Button startIcon={<FileDownloadIcon />} onClick={() => exportNgrcExcel(spec, { companyName: company.commercial_name || company.legal_name, fileName: `NGRC_calendario_${data.as_of}.xlsx` })}>Excel</Button>
          </>
        )}
      </Stack>

      {data?.alerts?.total > 0 && tab === "obligaciones" && (
        <Alert severity={data.alerts.overdue ? "error" : "warning"} sx={{ mb: 2 }}>
          {data.alerts.overdue ? `${data.alerts.overdue} obligación(es) vencida(s)` : ""}{data.alerts.overdue && data.alerts.due_soon ? " y " : ""}
          {data.alerts.due_soon ? `${data.alerts.due_soon} por vencer en los próximos ${data.settings.dias_aviso} días` : ""}.
        </Alert>
      )}
      {data?.scoped && <Alert severity="info" sx={{ mb: 2 }}>Las cifras y conteos se limitan a las sucursales asignadas a su usuario.</Alert>}

      <Tabs value={tab} onChange={(_, v) => go({ tab: v })} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }} variant="scrollable">
        <Tab value="obligaciones" label="Obligaciones" />
        <Tab value="reportes" label="Reportes" />
        <Tab value="registro" label="Registro de cumplimiento" />
        <Tab value="configuracion" label="Configuración" />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && !data && tab !== "reportes" && <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>}

      {tab === "obligaciones" && data && (
        <ObligationsTab
          data={data}
          onRegister={(o, period) => setDialog({ obligation: o, period })}
          onComplete={(o, record) => setDialog({ obligation: o, record })}
          onOpenReport={(type, cut) => go({ tab: "reportes", reporte: type, corte: cut && ["CLIENTES_DESACTUALIZADOS", "VALUACIONES"].includes(type) ? null : cut || null })}
        />
      )}
      {tab === "reportes" && (
        <NgrcReportView initialType={reportType} initialCut={reportCut} onTypeChange={(t) => go({ reporte: t, corte: null })} />
      )}
      {tab === "registro" && <RecordsTab refreshKey={refreshKey} onChanged={changed} />}
      {tab === "configuracion" && data && <SettingsTab settings={data.settings} onSaved={changed} />}

      <NgrcRecordDialog
        open={Boolean(dialog)}
        obligation={dialog?.obligation}
        record={dialog?.record}
        defaultPeriod={dialog?.period}
        onClose={() => setDialog(null)}
        onDone={() => {
          setDialog(null);
          changed();
        }}
      />
    </Box>
  );
}
