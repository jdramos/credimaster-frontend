import React, { useEffect, useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  MenuItem, Paper, Snackbar, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import SendIcon from "@mui/icons-material/Send";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import * as XLSX from "xlsx";
import API from "../../api";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportFilters, reportInteger, reportMoney } from "../common/reportFormat";

// Reportes a la UAF (Resolución UAF-N-021-2019). Backend: /api/aml/uaf/*.
// El envío se hace en SIREL; aquí se calculan los reportes, se controla el
// plazo (día 10 del mes siguiente) y se guarda la constancia del envío.

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const periodLabel = (p) => {
  const [y, m] = String(p).slice(0, 7).split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
};
const lastMonths = (count) => {
  const d = new Date();
  return Array.from({ length: count }, (_, i) => {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
  });
};
const usd = (v) => (v == null ? "—" : `US$ ${Number(v).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const nio = (v) => (v == null ? "—" : `C$ ${Number(v).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const d10 = (v) => (v ? String(v).slice(0, 10) : "");

const STATUS = {
  ENVIADO: { label: "Enviado", color: "success" },
  ENVIADO_FUERA_DE_PLAZO: { label: "Enviado fuera de plazo", color: "warning" },
  PENDIENTE: { label: "Pendiente de envío", color: "info" },
  VENCIDO: { label: "Vencido", color: "error" },
  SIN_REGISTROS: { label: "Sin registros (va en RAII)", color: "default" },
  NO_APLICA: { label: "No aplica", color: "default" },
  CASOS_VENCIDOS: { label: "Hay casos vencidos", color: "error" },
  CASOS_POR_VENCER: { label: "Casos por vencer", color: "warning" },
};

function StatusChip({ status }) {
  const s = STATUS[status] || { label: status, color: "default" };
  return <Chip size="small" color={s.color} label={s.label} variant={s.color === "default" ? "outlined" : "filled"} />;
}

function RteCustomerRow({ c }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover onClick={() => setOpen((o) => !o)} sx={{ cursor: "pointer" }}>
        <TableCell sx={{ width: 36 }}><IconButton size="small">{open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}</IconButton></TableCell>
        <TableCell><Typography fontWeight={700} fontSize={13.5}>{c.customer_name}</Typography><Typography fontSize={12} color="text.secondary">{c.identification}</Typography></TableCell>
        <TableCell align="right">{c.transactions_count}</TableCell>
        <TableCell align="right">{nio(c.total_local)}</TableCell>
        <TableCell align="right"><b>{c.usd_incomplete ? "Sin tipo de cambio" : usd(c.total_usd)}</b></TableCell>
        <TableCell>{c.fractioned ? <Chip size="small" color="warning" label="Fraccionado" /> : ""}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, bgcolor: "var(--cm-surface, #F8FAFC)" }}>
          <Collapse in={open} unmountOnExit>
            <Table size="small" sx={{ my: 1 }}>
              <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Tipo</TableCell><TableCell>Crédito</TableCell><TableCell align="right">Monto</TableCell><TableCell align="right">T/C</TableCell><TableCell align="right">US$</TableCell></TableRow></TableHead>
              <TableBody>
                {c.transactions.map((t) => (
                  <TableRow key={`${t.kind}-${t.ref_id}`}>
                    <TableCell>{t.date}</TableCell><TableCell>{t.kind === "PAGO" ? "Pago recibido" : "Desembolso entregado"}</TableCell><TableCell>{t.credit_code || t.loan_id}</TableCell>
                    <TableCell align="right">{t.currency === "USD" ? usd(t.amount) : nio(t.amount)}</TableCell><TableCell align="right">{t.exchange_rate || "—"}</TableCell><TableCell align="right">{usd(t.amount_usd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

function SubmitDialog({ open, period, report, onClose, onDone }) {
  const [form, setForm] = useState({ sent_at: new Date().toISOString().slice(0, 10), sirel_receipt: "", notes: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm({ sent_at: new Date().toISOString().slice(0, 10), sirel_receipt: "", notes: "" });
      setFile(null);
      setError("");
    }
  }, [open]);

  const save = async () => {
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("period", period);
      fd.append("report_type", report.type);
      fd.append("records_count", String(report.records ?? 0));
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("file", file);
      await API.post("/api/aml/uaf/submissions", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo registrar el envío");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Registrar envío — {report?.label}</DialogTitle>
      <DialogContent dividers>
        <Typography fontSize={13.5} color="text.secondary" sx={{ mb: 2 }}>
          Período {periodLabel(period)}. Adjunte la copia del archivo enviado por SIREL: se conserva como constancia (Art. 7, mínimo 5 años). Un envío registrado no se puede reemplazar.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          <TextField type="date" label="Fecha de envío" InputLabelProps={{ shrink: true }} value={form.sent_at} onChange={(e) => setForm((f) => ({ ...f, sent_at: e.target.value }))} />
          <TextField label="Número de acuse de SIREL" value={form.sirel_receipt} onChange={(e) => setForm((f) => ({ ...f, sirel_receipt: e.target.value }))} />
          <TextField label="Notas" multiline minRows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          <Button component="label" variant="outlined" startIcon={<AttachFileIcon />} sx={{ textTransform: "none", alignSelf: "flex-start" }}>
            {file ? file.name : "Adjuntar copia del archivo enviado"}
            <input hidden type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={save} disabled={saving || !form.sent_at}>Registrar envío</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UafReports() {
  const months = useMemo(() => lastMonths(24), []);
  const [period, setPeriod] = useState(months[1]);
  const [tab, setTab] = useState("control");
  const [control, setControl] = useState(null);
  const [rte, setRte] = useState(null);
  const [inmov, setInmov] = useState(null);
  const [sales, setSales] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitFor, setSubmitFor] = useState(null);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const load = async () => {
    try {
      setLoading(true);
      const params = { params: { period } };
      const [c, r, i, s, h] = await Promise.all([
        API.get("/api/aml/uaf/control", params),
        API.get("/api/aml/uaf/rte", params),
        API.get("/api/aml/uaf/inmovilizacion", params),
        API.get("/api/aml/uaf/ventas", params),
        API.get("/api/aml/uaf/submissions"),
      ]);
      setControl(c.data); setRte(r.data); setInmov(i.data); setSales(s.data); setHistory(h.data || []);
    } catch (err) {
      setAlert({ open: true, severity: "error", message: err.response?.data?.message || "No se pudieron cargar los reportes" });
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [period]);

  const openFile = async (id) => {
    try {
      const { data } = await API.get(`/api/aml/uaf/submissions/${id}/file`);
      window.open(data.url, "_blank", "noopener");
    } catch (err) {
      setAlert({ open: true, severity: "error", message: err.response?.data?.message || "No se pudo abrir el archivo" });
    }
  };

  // Una fila por transacción con los campos del formulario "Agregar RTE de
  // Microfinancieras" de SIREL, en el orden del manual de la UAF (partes A-D).
  const exportRte = () => {
    const sirel = rte.sirel_rows || [];
    const summary = rte.reportable.map((c) => ({
      Cliente: c.customer_name, Identificación: c.identification, Transacciones: c.transactions_count,
      "Total C$": c.total_local, "Total US$": c.total_usd, "Tipo de transacción": c.fractioned ? "Fraccionada" : "Individual",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sirel.length ? sirel : [{ Nota: "Sin transacciones reportables en el período" }]), "RTE formato SIREL");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary.length ? summary : [{ Nota: "Sin clientes reportables" }]), "Resumen por cliente");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Notas para la carga en SIREL (Reporte de Transacciones en Efectivo → Agregar RTE de Microfinancieras)"],
      ["Código del sujeto obligado y del oficial de cumplimiento: SIREL los completa automáticamente."],
      ["Gestor de la operación: se asume que es el propio cliente; corríjalo si otra persona realizó la transacción."],
      ["Nombres y apellidos: se separan a partir del nombre completo registrado; revíselos antes de cargar. \"NT\" = no tiene."],
      ["Número de identificación: sin guiones, como lo pide SIREL."],
    ]), "Notas");
    XLSX.writeFile(wb, `RTE_SIREL_${period}.xlsx`);
  };

  const exportInmov = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inmov.frozen.map((f) => ({
      Cliente: f.customer_name, Identificación: f.identification, Motivo: f.frozen_reason, "Inmovilizado desde": d10(f.frozen_at),
      "Vigente": f.is_frozen ? "Sí" : "No", "Saldo de créditos": Number(f.loans_balance), "Solicitudes pendientes": f.pending_requests,
    }))), "Inmovilizaciones");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inmov.matches.map((m) => ({
      Fecha: d10(m.screened_at), Persona: m.subject_label, Tipo: m.subject_type, Lista: m.list_name, Resultado: m.result, Notas: m.notes,
    }))), "Coincidencias");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inmov.operations_of_frozen.map((o) => ({
      Fecha: o.payment_date, Cliente: o.customer_id, Crédito: o.credit_code, Monto: o.amount,
    }))), "Operaciones");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Resultados de búsqueda en listas del período"],
      ["Consultas realizadas", inmov.screenings_total],
      ["Resultados negativos (sin coincidencia)", inmov.screenings_negative],
      ["Coincidencias", inmov.matches.length],
      ["Barridos de cartera completa", inmov.portfolio_scans.length],
    ]), "Resultados de búsqueda");
    XLSX.writeFile(wb, `Deteccion_Inmovilizacion_${period}.xlsx`);
  };

  const exportSales = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sales.sales.map((s) => ({
      Fecha: s.sale_date, Bien: s.asset_description, Tipo: s.asset_type, "Dueño anterior": s.former_owner, Identificación: s.former_owner_identification,
      Crédito: s.credit_code, "Precio de venta": s.sale_price, "Tipo de cambio": s.exchange_rate || "", "Precio US$": s.sale_price_usd,
    }))), "Ventas");
    XLSX.writeFile(wb, `Ventas_${period}.xlsx`);
  };

  const exportRaii = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ["Reporte de Ausencia de Información de Interés (RAII) — Art. 19 Resolución UAF-N-021-2019"],
      ["Período", periodLabel(period)],
      ["Tipo de sujeto obligado", control.institution_type],
      [],
      ["Reportes sin información en el período"],
      ...control.raii.reports_without_records.map((r) => [r]),
    ]), "RAII");
    XLSX.writeFile(wb, `RAII_${period}.xlsx`);
  };

  // Definiciones para Imprimir / Excel de cada pestaña (las pestañas con Excel
  // en formato SIREL conservan su exportación propia).
  const periodText = () => periodLabel(period);
  const controlReport = () => ({
    title: "Reportes a la UAF — Control del mes",
    subtitle: reportFilters([["Sujeto obligado", control.institution_type], ["Vencimiento del período", control.due_date]]),
    period: periodText(),
    orientation: "landscape",
    columns: [
      { field: "label", label: "Reporte" },
      {
        label: "Base legal",
        value: (r) => [
          r.article,
          r.threshold_usd ? `umbral ${usd(r.threshold_usd)} al mes` : "",
          r.type === "RAII" && r.required ? `sin información: ${r.reports_without_records.join("; ")}` : "",
          r.type === "ROS" ? `casos abiertos: ${r.open_cases}` : "",
        ].filter(Boolean).join(" · "),
      },
      {
        label: "Registros",
        numeric: true,
        value: (r) => (r.type === "RAII" ? (r.required ? "Procede" : "—") : r.records),
        format: (v) => (typeof v === "number" ? reportInteger(v) : v),
      },
      { label: "Plazo", value: (r) => r.due_rule || r.due_date },
      { field: "status", label: "Estado", format: (v) => STATUS[v]?.label || v },
      {
        label: "Envío",
        value: (r) => (r.submission
          ? [r.submission.sent_at, r.submission.sirel_receipt ? `acuse ${r.submission.sirel_receipt}` : "", r.submission.file_name].filter(Boolean).join(" · ")
          : "—"),
      },
    ],
    rows: controlRows,
    fileName: `UAF_control_${period}`,
  });

  const rteReport = () => ({
    title: "Reporte de Transacciones en Efectivo (RTE) — Resumen por cliente",
    subtitle: `Umbral ${usd(rte.threshold_usd)} al mes · ${rte.cash_transactions} transacciones en efectivo de ${rte.customers_with_cash} clientes`,
    period: periodText(),
    columns: [
      { field: "customer_name", label: "Cliente" },
      { field: "identification", label: "Identificación" },
      { field: "transactions_count", label: "Transacciones", numeric: true, format: reportInteger },
      { field: "total_local", label: "Total C$", numeric: true, format: reportMoney },
      { label: "Total US$", numeric: true, value: (c) => (c.usd_incomplete ? null : c.total_usd), format: (v) => (v == null ? "Sin tipo de cambio" : reportMoney(v)) },
      { field: "fractioned", label: "Tipo de transacción", format: (v) => (v ? "Fraccionada" : "Individual") },
    ],
    rows: rte.reportable,
    fileName: `RTE_resumen_${period}`,
  });

  const inmovReport = () => {
    const nameOf = Object.fromEntries(inmov.frozen.map((f) => [f.customer_id, f.customer_name]));
    return {
      title: "Detección e inmovilización",
      subtitle: reportFilters([
        ["Consultas a listas", inmov.screenings_total],
        ["Resultados negativos", inmov.screenings_negative],
        ["Coincidencias", inmov.matches.length],
        ["Barridos de cartera", inmov.portfolio_scans.length],
      ]),
      period: periodText(),
      orientation: "landscape",
      columns: [
        { field: "person", label: "Persona" },
        { field: "identification", label: "Identificación" },
        { field: "date", label: "Fecha" },
        { field: "reason", label: "Motivo / lista" },
        { field: "detail", label: "Detalle" },
        { field: "amount", label: "Saldo / monto (C$)", numeric: true, format: (v) => (v == null || v === "" ? "" : reportMoney(v)) },
      ],
      rows: [
        { section: true, person: "Personas inmovilizadas" },
        ...inmov.frozen.map((f) => ({
          person: f.customer_name, identification: f.identification, date: d10(f.frozen_at), reason: f.frozen_reason,
          detail: f.is_frozen ? "Vigente" : "No vigente", amount: f.loans_balance,
        })),
        { section: true, person: "Coincidencias en listas" },
        ...inmov.matches.map((m) => ({ person: m.subject_label, date: d10(m.screened_at), reason: m.list_name, detail: m.notes })),
        ...(inmov.operations_of_frozen.length
          ? [
            { section: true, person: "Operaciones de personas inmovilizadas" },
            ...inmov.operations_of_frozen.map((o) => ({
              person: nameOf[o.customer_id] || o.customer_id, date: o.payment_date, reason: `Crédito ${o.credit_code}`, amount: o.amount,
            })),
          ]
          : []),
      ],
      fileName: `Deteccion_Inmovilizacion_${period}`,
    };
  };

  const salesReport = () => ({
    title: "Ventas de bienes no pagados por sus dueños",
    subtitle: `Umbral ${usd(sales.threshold_usd)} al mes`,
    period: periodText(),
    orientation: "landscape",
    columns: [
      { field: "sale_date", label: "Fecha" },
      { field: "asset_description", label: "Bien" },
      { field: "asset_type", label: "Tipo" },
      { field: "former_owner", label: "Dueño anterior" },
      { field: "former_owner_identification", label: "Identificación" },
      { field: "credit_code", label: "Crédito" },
      { field: "sale_price", label: "Precio de venta", numeric: true, format: reportMoney },
      { field: "exchange_rate", label: "Tipo de cambio", numeric: true, format: (v) => (v ? String(v) : "") },
      { field: "sale_price_usd", label: "Precio US$", numeric: true, format: reportMoney },
    ],
    rows: sales.sales,
    totals: [{ value: "Total del período (US$)", colspan: 8 }, { value: reportMoney(sales.total_usd), raw: Number(sales.total_usd || 0), numeric: true }],
    fileName: `Ventas_${period}`,
  });

  const historyReport = () => ({
    title: "Reportes a la UAF — Historial de envíos",
    columns: [
      { field: "period", label: "Período", format: (v) => periodLabel(v) },
      { field: "report_type", label: "Reporte" },
      { field: "records_count", label: "Registros", numeric: true, format: reportInteger },
      { field: "sent_at", label: "Enviado" },
      { field: "sirel_receipt", label: "Acuse SIREL" },
      { field: "file_name", label: "Archivo" },
      { field: "registered_by", label: "Registró" },
    ],
    rows: history,
    fileName: "UAF_historial_envios",
  });

  const exporters = { RTE: exportRte, INMOVILIZACION: exportInmov, VENTAS: exportSales, RAII: exportRaii };
  const tabFor = { RTE: "rte", INMOVILIZACION: "inmov", VENTAS: "ventas" };

  const controlRows = control ? [...control.reports, { ...control.raii, records: control.raii.required ? control.raii.reports_without_records.length : 0 }] : [];

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid var(--cm-border, #E5E7EB)", background: "var(--cm-paper, #fff)" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccountBalanceIcon sx={{ color: "var(--cm-error-text, #B91C1C)" }} />
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                <Typography variant="h6" fontWeight={700}>Reportes a la UAF</Typography>
                <HelpButton screenKey="cumplimiento.reportes-uaf" />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Resolución UAF-N-021-2019. Se envían por SIREL dentro de los primeros 10 días de cada mes; el ROS, a más tardar 30 días después de la alerta.
              </Typography>
            </Box>
          </Stack>
          <TextField select size="small" label="Período" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ width: 200 }}>
            {months.map((m) => <MenuItem key={m} value={m} sx={{ textTransform: "capitalize" }}>{periodLabel(m)}</MenuItem>)}
          </TextField>
        </Stack>

        {loading && <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ py: 4 }}><CircularProgress size={22} /><Typography color="text.secondary">Calculando reportes…</Typography></Stack>}

        {!loading && control && (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <Chip variant="outlined" label={`Sujeto obligado: ${control.institution_type}`} />
              <Chip variant="outlined" label={`Vencimiento del período: ${control.due_date}`} />
            </Stack>
            {control.warnings.map((w) => <Alert key={w} severity="warning" sx={{ mb: 1.5 }}>{w}</Alert>)}
            {control.open_ros_cases.some((c) => ["VENCIDO", "POR_VENCER"].includes(c.deadline_status)) && (
              <Alert severity="error" sx={{ mb: 1.5 }}>
                Hay casos ROS abiertos vencidos o por vencer el plazo de 30 días: {control.open_ros_cases.filter((c) => ["VENCIDO", "POR_VENCER"].includes(c.deadline_status)).map((c) => `${c.case_number} (${c.deadline_date})`).join(", ")}. Revíselos en Cumplimiento &gt; Casos ROS.
              </Alert>
            )}

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: "1px solid var(--cm-border, #E5E7EB)" }}>
              <Tab value="control" label="Control del mes" />
              <Tab value="rte" label={`RTE (${rte?.reportable.length ?? 0})`} />
              <Tab value="inmov" label="Detección e inmovilización" />
              {sales?.applicable && <Tab value="ventas" label={`Ventas (${sales.sales.length})`} />}
              <Tab value="historial" label="Historial de envíos" />
            </Tabs>

            {tab === "control" && (
              <>
                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 1 }}>
                  <ReportExportButtons size="small" report={controlReport} disabled={!controlRows.length} />
                </Stack>
                <Table size="small">
                  <TableHead>
                    <TableRow><TableCell>Reporte</TableCell><TableCell align="right">Registros</TableCell><TableCell>Plazo</TableCell><TableCell>Estado</TableCell><TableCell>Envío</TableCell><TableCell align="right">Acciones</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {controlRows.map((r) => (
                      <TableRow key={r.type}>
                        <TableCell>
                          <Typography fontWeight={700} fontSize={13.5}>{r.label}</Typography>
                          <Typography fontSize={12} color="text.secondary">
                            {r.article}
                            {r.threshold_usd ? ` · umbral ${usd(r.threshold_usd)} al mes` : ""}
                            {r.type === "RAII" && r.required ? ` · sin información: ${r.reports_without_records.join("; ")}` : ""}
                            {r.type === "ROS" ? ` · casos abiertos: ${r.open_cases}` : ""}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{r.type === "RAII" ? (r.required ? "Procede" : "—") : r.records}</TableCell>
                        <TableCell>{r.due_rule || r.due_date}</TableCell>
                        <TableCell><StatusChip status={r.status} /></TableCell>
                        <TableCell>
                          {r.submission ? (
                            <Stack spacing={0.25}>
                              <Typography fontSize={12.5}>{r.submission.sent_at}{r.submission.sirel_receipt ? ` · acuse ${r.submission.sirel_receipt}` : ""}</Typography>
                              {r.submission.file_name && <Button size="small" sx={{ p: 0, justifyContent: "flex-start", textTransform: "none" }} onClick={() => openFile(r.submission.id)}>{r.submission.file_name}</Button>}
                            </Stack>
                          ) : "—"}
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {tabFor[r.type] && <Button size="small" onClick={() => setTab(tabFor[r.type])} sx={{ textTransform: "none" }}>Ver detalle</Button>}
                            {exporters[r.type] && (r.type !== "RAII" || r.required) && (
                              <Button size="small" startIcon={<FileDownloadIcon />} onClick={exporters[r.type]} sx={{ textTransform: "none" }}>Excel</Button>
                            )}
                            {r.type !== "ROS" && !r.submission && r.status !== "NO_APLICA" && (r.type !== "RAII" || r.required) && (
                              <Button size="small" variant="contained" startIcon={<SendIcon />} onClick={() => setSubmitFor(r)} sx={{ textTransform: "none" }}>Registrar envío</Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}

            {tab === "rte" && rte && (
              <>
                <Typography fontSize={13.5} color="text.secondary" sx={{ mb: 1 }}>
                  Clientes cuyo efectivo del mes (pagos recibidos y desembolsos entregados en efectivo, individuales o fraccionados) alcanza {usd(rte.threshold_usd)} —
                  {" "}{rte.cash_transactions} transacciones en efectivo de {rte.customers_with_cash} clientes en el período.
                </Typography>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography fontSize={12.5} color="text.secondary">
                    El Excel trae los campos del formulario de SIREL en el orden del manual de la UAF. Revise los nombres separados y el gestor (se asume el propio cliente).
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <ReportExportButtons excel={false} size="small" report={rteReport} disabled={!rte.reportable.length} />
                    <Button size="small" startIcon={<FileDownloadIcon />} onClick={exportRte} sx={{ textTransform: "none", flexShrink: 0 }}>Exportar RTE (formato SIREL)</Button>
                  </Stack>
                </Stack>
                <Table size="small">
                  <TableHead><TableRow><TableCell /><TableCell>Cliente</TableCell><TableCell align="right">Transacciones</TableCell><TableCell align="right">Total C$</TableCell><TableCell align="right">Total US$</TableCell><TableCell /></TableRow></TableHead>
                  <TableBody>
                    {rte.reportable.map((c) => <RteCustomerRow key={c.customer_id} c={c} />)}
                    {!rte.reportable.length && <TableRow><TableCell colSpan={6}><Typography color="text.secondary" fontSize={13.5}>Ningún cliente alcanzó el umbral en el período.</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>
                {rte.undetermined.length > 0 && (
                  <>
                    <Alert severity="warning" sx={{ mt: 2, mb: 1 }}>
                      {rte.undetermined.length} cliente(s) con efectivo en el período no se pudieron evaluar porque falta el tipo de cambio. Regístrelo en Configuración &gt; Tipos de cambio.
                    </Alert>
                    <Table size="small">
                      <TableBody>{rte.undetermined.slice(0, 20).map((c) => <RteCustomerRow key={c.customer_id} c={c} />)}</TableBody>
                    </Table>
                  </>
                )}
              </>
            )}

            {tab === "inmov" && inmov && (
              <>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                  <Chip label={`Consultas a listas: ${inmov.screenings_total}`} />
                  <Chip color="success" variant="outlined" label={`Resultados negativos: ${inmov.screenings_negative}`} />
                  <Chip color={inmov.matches.length ? "error" : "default"} label={`Coincidencias: ${inmov.matches.length}`} />
                  <Chip label={`Barridos de cartera: ${inmov.portfolio_scans.length}`} />
                  <Box sx={{ flex: 1 }} />
                  <ReportExportButtons excel={false} size="small" report={inmovReport} />
                  <Button size="small" startIcon={<FileDownloadIcon />} onClick={exportInmov} sx={{ textTransform: "none" }}>Exportar</Button>
                </Stack>
                <Typography fontWeight={700} fontSize={14} sx={{ mb: 0.5 }}>Personas inmovilizadas</Typography>
                <Table size="small" sx={{ mb: 2 }}>
                  <TableHead><TableRow><TableCell>Cliente</TableCell><TableCell>Motivo</TableCell><TableCell>Desde</TableCell><TableCell align="right">Saldo de créditos</TableCell><TableCell>Vigente</TableCell></TableRow></TableHead>
                  <TableBody>
                    {inmov.frozen.map((f) => (
                      <TableRow key={f.customer_id}><TableCell>{f.customer_name}<Typography fontSize={12} color="text.secondary">{f.identification}</Typography></TableCell><TableCell>{f.frozen_reason}</TableCell><TableCell>{d10(f.frozen_at)}</TableCell><TableCell align="right">{nio(f.loans_balance)}</TableCell><TableCell>{f.is_frozen ? "Sí" : "No"}</TableCell></TableRow>
                    ))}
                    {!inmov.frozen.length && <TableRow><TableCell colSpan={5}><Typography color="text.secondary" fontSize={13.5}>Sin inmovilizaciones en el período.</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>
                <Typography fontWeight={700} fontSize={14} sx={{ mb: 0.5 }}>Coincidencias en listas</Typography>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Persona</TableCell><TableCell>Lista</TableCell><TableCell>Notas</TableCell></TableRow></TableHead>
                  <TableBody>
                    {inmov.matches.map((m) => <TableRow key={m.id}><TableCell>{d10(m.screened_at)}</TableCell><TableCell>{m.subject_label}</TableCell><TableCell>{m.list_name}</TableCell><TableCell>{m.notes}</TableCell></TableRow>)}
                    {!inmov.matches.length && <TableRow><TableCell colSpan={4}><Typography color="text.secondary" fontSize={13.5}>Sin coincidencias en el período.</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>
              </>
            )}

            {tab === "ventas" && sales?.applicable && (
              <>
                <Typography fontSize={13.5} color="text.secondary" sx={{ mb: 1 }}>
                  Ventas de bienes no pagados por sus dueños (garantías adjudicadas). Se reportan cuando en el mes suman {usd(sales.threshold_usd)} o más. Total del período: <b>{usd(sales.total_usd)}</b>.
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 1 }}><ReportExportButtons excel={false} size="small" report={salesReport} disabled={!sales.sales.length} /><Button size="small" startIcon={<FileDownloadIcon />} onClick={exportSales} sx={{ textTransform: "none" }}>Exportar ventas</Button></Stack>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Bien</TableCell><TableCell>Dueño anterior</TableCell><TableCell align="right">Precio</TableCell><TableCell align="right">US$</TableCell></TableRow></TableHead>
                  <TableBody>
                    {sales.sales.map((s) => <TableRow key={s.id}><TableCell>{s.sale_date}</TableCell><TableCell>{s.asset_description}</TableCell><TableCell>{s.former_owner}</TableCell><TableCell align="right">{nio(s.sale_price)}</TableCell><TableCell align="right">{usd(s.sale_price_usd)}</TableCell></TableRow>)}
                    {!sales.sales.length && <TableRow><TableCell colSpan={5}><Typography color="text.secondary" fontSize={13.5}>Sin ventas en el período.</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>
              </>
            )}

            {tab === "historial" && (
              <>
                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mb: 1 }}>
                  <ReportExportButtons size="small" report={historyReport} disabled={!history.length} />
                </Stack>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Período</TableCell><TableCell>Reporte</TableCell><TableCell align="right">Registros</TableCell><TableCell>Enviado</TableCell><TableCell>Acuse SIREL</TableCell><TableCell>Archivo</TableCell><TableCell>Registró</TableCell></TableRow></TableHead>
                  <TableBody>
                    {history.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell sx={{ textTransform: "capitalize" }}>{periodLabel(h.period)}</TableCell><TableCell>{h.report_type}</TableCell><TableCell align="right">{h.records_count}</TableCell>
                        <TableCell>{h.sent_at}</TableCell><TableCell>{h.sirel_receipt || "—"}</TableCell>
                        <TableCell>{h.file_name ? <Button size="small" sx={{ textTransform: "none" }} onClick={() => openFile(h.id)}>{h.file_name}</Button> : "—"}</TableCell><TableCell>{h.registered_by}</TableCell>
                      </TableRow>
                    ))}
                    {!history.length && <TableRow><TableCell colSpan={7}><Typography color="text.secondary" fontSize={13.5}>Aún no hay envíos registrados.</Typography></TableCell></TableRow>}
                  </TableBody>
                </Table>
              </>
            )}
          </>
        )}
      </Paper>

      <SubmitDialog
        open={Boolean(submitFor)}
        period={period}
        report={submitFor}
        onClose={() => setSubmitFor(null)}
        onDone={() => {
          setSubmitFor(null);
          setAlert({ open: true, severity: "success", message: "Envío registrado" });
          load();
        }}
      />

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={() => setAlert((a) => ({ ...a, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((a) => ({ ...a, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
