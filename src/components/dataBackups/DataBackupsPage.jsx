import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import CloudDownloadRoundedIcon from "@mui/icons-material/CloudDownloadRounded";
import BackupRoundedIcon from "@mui/icons-material/BackupRounded";
import API from "../../api";
import ReportExportButtons from "../common/ReportExportButtons";
import { BACKUP_LEVELS, BACKUPS_CHANGED_EVENT, backupStatusText } from "./backupAlert";

const STATUS = {
  GENERANDO: { label: "Generando…", color: "info" },
  LISTO: { label: "Listo", color: "success" },
  FALLIDO: { label: "Falló", color: "error" },
  EXPIRADO: { label: "Vencido", color: "default" },
};

const POLL_MS = 4000;

export const formatSize = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const formatNumber = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("es-NI"));
const formatDateTime = (value) => (value ? String(value).slice(0, 16) : "—");

const apiMessage = (err, fallback) => err?.response?.data?.message || fallback;

// La alerta de la barra superior se actualiza al generar o descargar.
const notifyChanged = () => window.dispatchEvent(new Event(BACKUPS_CHANGED_EVENT));

// Configuración → Respaldo de datos: la empresa genera y descarga su propia
// copia de la información (base de datos completa + Excel por módulo).
export default function DataBackupsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [starting, setStarting] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await API.get("/api/data-backups");
      setData(res.data);
      setError("");
      return res.data;
    } catch (err) {
      setError(apiMessage(err, "No se pudo obtener el historial de respaldos."));
      return null;
    }
  }, []);

  const rows = data?.data || [];
  const generating = rows.some((r) => r.status === "GENERANDO");

  useEffect(() => {
    load();
  }, [load]);

  // Mientras haya uno generándose se consulta el estado cada pocos segundos.
  useEffect(() => {
    if (!generating) return undefined;
    timer.current = setTimeout(async () => {
      const fresh = await load();
      const before = rows.find((r) => r.status === "GENERANDO");
      const after = before && fresh?.data?.find((r) => r.id === before.id);
      if (after?.status === "LISTO") setNotice("El respaldo está listo. Use \"Descargar\" para guardarlo.");
      if (after && after.status !== "GENERANDO") notifyChanged();
    }, POLL_MS);
    return () => clearTimeout(timer.current);
  }, [generating, rows, load]);

  const handleGenerate = async () => {
    setStarting(true);
    setNotice("");
    try {
      await API.post("/api/data-backups");
      setNotice("Se está generando el respaldo. Puede seguir trabajando; tarda unos minutos.");
      await load();
      notifyChanged();
    } catch (err) {
      setError(apiMessage(err, "No se pudo iniciar el respaldo."));
    } finally {
      setStarting(false);
    }
  };

  const handleDownload = async (row) => {
    setDownloading(row.id);
    try {
      const res = await API.post(`/api/data-backups/${row.id}/download`);
      const link = document.createElement("a");
      link.href = res.data?.data?.url;
      link.download = res.data?.data?.file_name || "respaldo.zip";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      await load();
      notifyChanged();
    } catch (err) {
      setError(apiMessage(err, "No se pudo descargar el respaldo."));
      await load();
    } finally {
      setDownloading(null);
    }
  };

  const buildReport = () => ({
    title: "Historial de respaldos de datos",
    fileName: "historial_respaldos",
    orientation: "landscape",
    columns: [
      { key: "id", label: "No." },
      { key: "requested_at", label: "Solicitado" },
      { key: "requested_by_name", label: "Generado por" },
      { key: "status_label", label: "Estado" },
      { key: "size", label: "Tamaño" },
      { key: "tables_count", label: "Tablas", type: "number" },
      { key: "rows_count", label: "Filas", type: "number" },
      { key: "expires_at", label: "Disponible hasta" },
      { key: "download_count", label: "Descargas", type: "number" },
      { key: "sql_sha256", label: "SHA-256 de la base" },
    ],
    rows: rows.map((r) => ({ ...r, status_label: STATUS[r.status]?.label || r.status, size: formatSize(r.size_bytes) })),
  });

  const migrated = data?.migrated !== false;
  const backupStatus = data?.backup_status;
  const level = backupStatus && BACKUP_LEVELS[backupStatus.level];
  const allBranches = data?.all_branches !== false;

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>Respaldo de datos</Typography>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <ReportExportButtons report={buildReport} disabled={!rows.length} />
          <Button
            variant="contained"
            startIcon={starting || generating ? <CircularProgress size={16} color="inherit" /> : <BackupRoundedIcon />}
            onClick={handleGenerate}
            disabled={!data || !migrated || !allBranches || starting || generating}
            sx={{ textTransform: "none" }}
          >
            {generating ? "Generando…" : "Generar respaldo"}
          </Button>
        </Stack>
      </Stack>

      {level && (
        <Alert
          severity={level.severity}
          variant="filled"
          sx={{ mb: 2, bgcolor: level.bg, color: level.fg, "& .MuiAlert-icon": { color: level.fg } }}
        >
          <b>{level.title}.</b> {backupStatusText(backupStatus)}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}
      {data && !migrated && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          El respaldo de datos todavía no está instalado en esta empresa. Pida a soporte que ejecute la actualización.
        </Alert>
      )}
      {data && migrated && !allBranches && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          El respaldo incluye los datos de todas las sucursales: solo lo puede generar un usuario con acceso a todas.
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>Qué contiene</Typography>
          <Typography variant="body2" component="div">
            Un archivo .zip con:
            <ul style={{ marginTop: 4, marginBottom: 8 }}>
              <li><b>base_de_datos.sql</b>: copia completa de la información de la empresa. Sirve para restaurar el sistema.</li>
              <li><b>Excel</b> de clientes, créditos, pagos y contabilidad, para revisar los datos sin restaurar nada.</li>
              <li><b>LEAME.txt</b> con las instrucciones de restauración y la huella SHA-256 para comprobar que el archivo no cambió.</li>
            </ul>
            No incluye las contraseñas ni la verificación en dos pasos de los usuarios, ni los archivos adjuntos (expedientes,
            fotos, comprobantes). Cada respaldo queda disponible para descargar {data?.retention_days || 7} días.
          </Typography>
          <Alert severity="warning" sx={{ mt: 1.5 }}>
            El respaldo contiene información confidencial de los clientes. Guárdelo en un lugar seguro y no lo envíe por correo ni chat.
          </Alert>
        </CardContent>
      </Card>

      <TableContainer component={Card} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Solicitado</TableCell>
              <TableCell>Generado por</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Tamaño</TableCell>
              <TableCell align="right">Filas</TableCell>
              <TableCell>Disponible hasta</TableCell>
              <TableCell align="right">Descargas</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {!data && (
              <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            )}
            {data && !rows.length && (
              <TableRow><TableCell colSpan={8} align="center">Todavía no se ha generado ningún respaldo.</TableCell></TableRow>
            )}
            {rows.map((r) => {
              const status = STATUS[r.status] || { label: r.status, color: "default" };
              const chip = <Chip size="small" label={status.label} color={status.color} />;
              return (
                <TableRow key={r.id} hover>
                  <TableCell>{formatDateTime(r.requested_at)}</TableCell>
                  <TableCell>{r.requested_by_name || "—"}</TableCell>
                  <TableCell>{r.status === "FALLIDO" && r.error_message ? <Tooltip title={r.error_message}>{chip}</Tooltip> : chip}</TableCell>
                  <TableCell align="right">{formatSize(r.size_bytes)}</TableCell>
                  <TableCell align="right">
                    {r.rows_count != null ? (
                      <Tooltip title={`${formatNumber(r.tables_count)} tablas · SHA-256 ${r.sql_sha256 || ""}`}>
                        <span>{formatNumber(r.rows_count)}</span>
                      </Tooltip>
                    ) : "—"}
                  </TableCell>
                  <TableCell>{r.status === "LISTO" ? formatDateTime(r.expires_at) : "—"}</TableCell>
                  <TableCell align="right">
                    {r.download_count ? (
                      <Tooltip title={`Última: ${formatDateTime(r.last_downloaded_at)} · ${r.last_downloaded_by_name || ""}`}>
                        <span>{r.download_count}</span>
                      </Tooltip>
                    ) : 0}
                  </TableCell>
                  <TableCell align="right">
                    {r.status === "LISTO" && (
                      <Button
                        size="small"
                        startIcon={downloading === r.id ? <CircularProgress size={14} /> : <CloudDownloadRoundedIcon />}
                        onClick={() => handleDownload(r)}
                        disabled={downloading !== null || !allBranches}
                        sx={{ textTransform: "none" }}
                      >
                        Descargar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
