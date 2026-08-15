import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import SendIcon from "@mui/icons-material/Send";
import PreviewIcon from "@mui/icons-material/Preview";
import SaveIcon from "@mui/icons-material/Save";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import API from "../../api";

const EVENT_LABELS = {
  REMINDER_UPCOMING: "Recordatorio (por vencer)",
  REMINDER_OVERDUE: "Aviso de mora",
  PAYMENT_CONFIRMATION: "Confirmación de pago",
  COLLECTOR_DIGEST: "Digest operativo",
};

const CHANNEL_LABELS = { EMAIL: "Email", SMS: "SMS", WHATSAPP: "WhatsApp" };

export default function NotificationsManager() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const [settings, setSettings] = useState({});
  const [channels, setChannels] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [log, setLog] = useState([]);
  const [logStatus, setLogStatus] = useState("");
  const [preview, setPreview] = useState(null);

  const [testChannel, setTestChannel] = useState("EMAIL");
  const [testTo, setTestTo] = useState("");

  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });
  const notify = (message, severity = "success") =>
    setAlert({ open: true, severity, message });

  const setField = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await API.get("/api/notifications/config");
      setSettings(res.data?.settings || {});
      setChannels(res.data?.channels || []);
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando configuración", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await API.get("/api/notifications/templates");
      setTemplates(res.data?.data || []);
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando plantillas", "error");
    }
  };

  const loadLog = async () => {
    try {
      const params = {};
      if (logStatus) params.status = logStatus;
      const res = await API.get("/api/notifications/log", { params });
      setLog(res.data?.data || []);
    } catch (e) {
      notify(e.response?.data?.message || "Error cargando bitácora", "error");
    }
  };

  useEffect(() => {
    loadConfig();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (tab === 2) loadLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, logStatus]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      await API.put("/api/notifications/config", { settings });
      notify("Configuración guardada");
      loadConfig();
    } catch (e) {
      notify(e.response?.data?.message || "Error guardando", "error");
    } finally {
      setSaving(false);
    }
  };

  const run = async (dryRun) => {
    setRunning(true);
    setPreview(null);
    try {
      const res = await API.post(
        `/api/notifications/run${dryRun ? "?dry_run=1" : ""}`,
        {},
      );
      if (dryRun) {
        setPreview(res.data?.reminders?.preview || []);
        notify(
          `Vista previa: ${res.data?.reminders?.generated || 0} mensajes se enviarían`,
          "info",
        );
      } else {
        const r = res.data?.reminders || {};
        const d = res.data?.digest || {};
        notify(
          `Enviadas ${r.sent || 0} · Fallidas ${r.failed || 0} · Omitidas ${r.skipped || 0} · Digest ${d.sent || 0}`,
          (r.failed || 0) > 0 ? "warning" : "success",
        );
        if (tab === 2) loadLog();
      }
    } catch (e) {
      notify(e.response?.data?.message || "Error al ejecutar", "error");
    } finally {
      setRunning(false);
    }
  };

  const sendTest = async () => {
    try {
      await API.post("/api/notifications/test", { channel: testChannel, to: testTo });
      notify("Mensaje de prueba enviado");
    } catch (e) {
      notify(e.response?.data?.message || "Error enviando prueba", "error");
    }
  };

  const saveTemplate = async (tpl) => {
    try {
      await API.put(`/api/notifications/templates/${tpl.id}`, {
        subject: tpl.subject,
        body: tpl.body,
        is_active: tpl.is_active ? 1 : 0,
      });
      notify("Plantilla guardada");
    } catch (e) {
      notify(e.response?.data?.message || "Error guardando plantilla", "error");
    }
  };

  const updateTemplateField = (id, key, value) =>
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [key]: value } : t)),
    );

  const channelChip = (key) => {
    const st = channels.find((c) => c.channel === key);
    const configured = st?.configured;
    return (
      <Chip
        size="small"
        color={configured ? "success" : "default"}
        variant={configured ? "filled" : "outlined"}
        label={configured ? "Configurado" : "Pendiente credenciales"}
      />
    );
  };

  const ALL_CHANNELS = ["WHATSAPP", "EMAIL", "SMS"];
  const getPriority = () => {
    const list = String(settings.channel_priority || "WHATSAPP,EMAIL,SMS")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((c) => ALL_CHANNELS.includes(c));
    ALL_CHANNELS.forEach((c) => {
      if (!list.includes(c)) list.push(c);
    });
    return list;
  };
  const moveChannel = (index, dir) => {
    const list = getPriority();
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    setField("channel_priority", list.join(","));
  };
  const isEnabled = (c) => settings[`channel_${c.toLowerCase()}_enabled`] === "1";

  const previewColumns = useMemo(
    () => [
      { field: "event_type", headerName: "Evento", width: 180, valueGetter: (p) => EVENT_LABELS[p.value] || p.value },
      { field: "channel", headerName: "Canal", width: 100 },
      { field: "customer_name", headerName: "Cliente", flex: 1, minWidth: 180 },
      { field: "to", headerName: "Destino", width: 180 },
      { field: "loan_id", headerName: "Crédito", width: 90 },
      { field: "amount", headerName: "Monto", width: 110 },
      { field: "due_date", headerName: "Vence", width: 110 },
    ],
    [],
  );

  const logColumns = useMemo(
    () => [
      { field: "created_at", headerName: "Fecha", width: 160, valueGetter: (p) => String(p.value || "").replace("T", " ").slice(0, 19) },
      { field: "event_type", headerName: "Evento", width: 170, valueGetter: (p) => EVENT_LABELS[p.value] || p.value },
      { field: "channel", headerName: "Canal", width: 90 },
      { field: "to_address", headerName: "Destino", flex: 1, minWidth: 180 },
      { field: "loan_id", headerName: "Crédito", width: 90 },
      {
        field: "status",
        headerName: "Estado",
        width: 120,
        renderCell: (p) => {
          const map = { SENT: "success", FAILED: "error", PENDING: "warning", SKIPPED: "default" };
          return <Chip size="small" color={map[p.value] || "default"} label={p.value} />;
        },
      },
      { field: "error", headerName: "Detalle", flex: 1, minWidth: 200 },
    ],
    [],
  );

  if (loading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
          <NotificationsActiveIcon sx={{ color: "#0057B8" }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>Notificaciones</Typography>
            <Typography variant="body2" color="text.secondary">
              Recordatorios de pago, avisos de mora y confirmaciones — multicanal
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={() => run(true)}
            disabled={running}
          >
            Vista previa
          </Button>
          <Button
            variant="contained"
            startIcon={running ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
            onClick={() => run(false)}
            disabled={running}
            sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" } }}
          >
            Enviar ahora
          </Button>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Configuración" />
          <Tab label="Plantillas" />
          <Tab label="Bitácora" />
        </Tabs>

        {/* ---- CONFIGURACIÓN ---- */}
        {tab === 0 && (
          <Stack spacing={3}>
            {preview && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Vista previa — {preview.length} mensaje(s) se enviarían ahora:
                </Typography>
                <Box sx={{ height: 260 }}>
                  <DataGrid
                    rows={preview.map((r, i) => ({ id: i, ...r }))}
                    columns={previewColumns}
                    density="compact"
                    hideFooter={preview.length <= 100}
                    disableRowSelectionOnClick
                  />
                </Box>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Canales</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.channel_email_enabled === "1"}
                        onChange={(e) => setField("channel_email_enabled", e.target.checked ? "1" : "0")}
                      />
                    }
                    label="Email"
                  />
                  {channelChip("EMAIL")}
                </Box>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.channel_sms_enabled === "1"}
                        onChange={(e) => setField("channel_sms_enabled", e.target.checked ? "1" : "0")}
                      />
                    }
                    label="SMS"
                  />
                  {channelChip("SMS")}
                </Box>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.channel_whatsapp_enabled === "1"}
                        onChange={(e) => setField("channel_whatsapp_enabled", e.target.checked ? "1" : "0")}
                      />
                    }
                    label="WhatsApp"
                  />
                  {channelChip("WHATSAPP")}
                </Box>
              </Stack>
              <Alert severity="info" sx={{ mt: 1 }}>
                Las credenciales de SMS (Twilio) y WhatsApp (Meta Cloud API) se configuran en variables de entorno del servidor. Un canal habilitado pero "Pendiente" (sin credenciales) se salta en la cascada y cae al siguiente.
              </Alert>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Prioridad de canales (cascada)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                A cada cliente se le envía <strong>un solo mensaje</strong>, por el primer canal disponible en este orden. Así el SMS (el más caro) solo se usa si el cliente no tiene WhatsApp ni email. Ordena de preferido/más barato (arriba) a último recurso (abajo).
              </Typography>
              <Stack spacing={1} sx={{ maxWidth: 460 }}>
                {getPriority().map((c, i) => (
                  <Paper
                    key={c}
                    variant="outlined"
                    sx={{ p: 1, display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Typography sx={{ width: 22, fontWeight: 700, textAlign: "center" }}>
                      {i + 1}
                    </Typography>
                    <Typography sx={{ flex: 1 }}>{CHANNEL_LABELS[c]}</Typography>
                    {!isEnabled(c) && (
                      <Chip size="small" variant="outlined" label="Deshabilitado" />
                    )}
                    {channelChip(c)}
                    <IconButton size="small" disabled={i === 0} onClick={() => moveChannel(i, -1)}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      disabled={i === getPriority().length - 1}
                      onClick={() => moveChannel(i, 1)}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                ))}
              </Stack>
            </Box>

            <Divider />

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                size="small"
                label="Nombre de la institución"
                value={settings.institution_name || ""}
                onChange={(e) => setField("institution_name", e.target.value)}
                sx={{ minWidth: 260 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notify_customer === "1"}
                    onChange={(e) => setField("notify_customer", e.target.checked ? "1" : "0")}
                  />
                }
                label="Avisar al cliente"
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                size="small"
                label="Días antes del vencimiento"
                helperText="Separados por comas. Ej: 3,1"
                value={settings.reminder_days_before || ""}
                onChange={(e) => setField("reminder_days_before", e.target.value)}
                sx={{ minWidth: 240 }}
              />
              <TextField
                size="small"
                label="Días de mora para avisar"
                helperText="Separados por comas. Ej: 1,7,15,30"
                value={settings.overdue_days || ""}
                onChange={(e) => setField("overdue_days", e.target.value)}
                sx={{ minWidth: 240 }}
              />
            </Stack>

            <Divider />

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.send_collector_digest === "1"}
                    onChange={(e) => setField("send_collector_digest", e.target.checked ? "1" : "0")}
                  />
                }
                label="Enviar digest operativo por email"
              />
              <TextField
                fullWidth
                size="small"
                sx={{ mt: 1 }}
                label="Correos que reciben el digest"
                helperText="Separados por comas"
                value={settings.digest_recipients || ""}
                onChange={(e) => setField("digest_recipients", e.target.value)}
              />
            </Box>

            <Box>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveConfig}
                disabled={saving}
                sx={{ background: "#0057B8", "&:hover": { background: "#003E8A" } }}
              >
                Guardar configuración
              </Button>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Enviar mensaje de prueba</Typography>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <TextField
                  select
                  size="small"
                  label="Canal"
                  value={testChannel}
                  onChange={(e) => setTestChannel(e.target.value)}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="EMAIL">Email</MenuItem>
                  <MenuItem value="SMS">SMS</MenuItem>
                  <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
                </TextField>
                <TextField
                  size="small"
                  label="Destino (correo o teléfono)"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  sx={{ minWidth: 260 }}
                />
                <Button variant="outlined" onClick={sendTest} disabled={!testTo}>
                  Enviar prueba
                </Button>
              </Stack>
            </Box>
          </Stack>
        )}

        {/* ---- PLANTILLAS ---- */}
        {tab === 1 && (
          <Stack spacing={2}>
            {templates.map((tpl) => (
              <Paper key={tpl.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
                  <Chip size="small" color="primary" label={EVENT_LABELS[tpl.event_type] || tpl.event_type} />
                  <Chip size="small" variant="outlined" label={CHANNEL_LABELS[tpl.channel] || tpl.channel} />
                  <Box sx={{ flex: 1 }} />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(tpl.is_active)}
                        onChange={(e) => updateTemplateField(tpl.id, "is_active", e.target.checked ? 1 : 0)}
                      />
                    }
                    label="Activa"
                  />
                  <Button size="small" variant="contained" startIcon={<SaveIcon />} onClick={() => saveTemplate(tpl)}>
                    Guardar
                  </Button>
                </Stack>
                {tpl.channel === "EMAIL" && (
                  <TextField
                    fullWidth
                    size="small"
                    label="Asunto"
                    sx={{ mb: 1 }}
                    value={tpl.subject || ""}
                    onChange={(e) => updateTemplateField(tpl.id, "subject", e.target.value)}
                  />
                )}
                <TextField
                  fullWidth
                  size="small"
                  label="Contenido"
                  multiline
                  minRows={3}
                  value={tpl.body || ""}
                  onChange={(e) => updateTemplateField(tpl.id, "body", e.target.value)}
                />
              </Paper>
            ))}
            <Alert severity="info">
              Variables disponibles: {"{{customer_name}}"}, {"{{amount}}"}, {"{{due_date}}"}, {"{{days_overdue}}"}, {"{{loan_id}}"}, {"{{branch_name}}"}, {"{{institution_name}}"}.
            </Alert>
          </Stack>
        )}

        {/* ---- BITÁCORA ---- */}
        {tab === 2 && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <TextField
                select
                size="small"
                label="Estado"
                value={logStatus}
                onChange={(e) => setLogStatus(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="SENT">Enviados</MenuItem>
                <MenuItem value="FAILED">Fallidos</MenuItem>
                <MenuItem value="SKIPPED">Omitidos</MenuItem>
                <MenuItem value="PENDING">Pendientes</MenuItem>
              </TextField>
              <Button variant="outlined" onClick={loadLog}>Actualizar</Button>
            </Stack>
            <Box sx={{ height: 560 }}>
              <DataGrid
                rows={log}
                columns={logColumns}
                getRowId={(r) => r.id}
                density="compact"
                pageSizeOptions={[25, 50, 100]}
                initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
                disableRowSelectionOnClick
              />
            </Box>
          </Stack>
        )}
      </Paper>

      <Snackbar
        open={alert.open}
        autoHideDuration={5000}
        onClose={() => setAlert((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
