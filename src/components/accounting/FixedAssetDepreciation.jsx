import React, { useContext, useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, MenuItem, Paper, Snackbar, Stack, TextField, Typography, Divider,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress,
} from "@mui/material";
import EventRepeatIcon from "@mui/icons-material/EventRepeat";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { printAccountingReport } from "./printAccountingReport";
import JournalDetailDialog from "./JournalDetailDialog";
import { UserContext } from "../../contexts/UserContext";

const CATEGORY_LABELS = {
  EDIFICIO: "Edificio",
  INSTALACION: "Instalación",
  MOBILIARIO: "Mobiliario",
  EQUIPO: "Equipo",
  COMPUTACION: "Equipo de Cómputo",
  VEHICULO: "Vehículo",
};

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const lastDayOfMonth = (year, month) => {
  const day = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export default function FixedAssetDepreciation() {
  const { permissions = [], role } = useContext(UserContext) || {};
  const canRunDepreciation = role === 1 || permissions.includes("activo_fijo.depreciacion.generar");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState([]);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRun, setDetailRun] = useState(null);
  const [detailLines, setDetailLines] = useState([]);

  const [journalOpen, setJournalOpen] = useState(false);
  const [selectedJournalId, setSelectedJournalId] = useState(null);

  const handleOpenJournal = (journalEntryId) => {
    if (!journalEntryId) return;
    setSelectedJournalId(journalEntryId);
    setJournalOpen(true);
  };

  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  const yearOptions = Array.from({ length: 7 }, (_, i) => now.getFullYear() - i);

  const fetchRuns = async () => {
    try {
      const res = await API.get("/api/fixed-assets/depreciation/runs");
      setRuns(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo cargar el historial de depreciación");
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      setPreview(null);
      const res = await API.get("/api/fixed-assets/depreciation/preview", { params: { year, month } });
      setPreview(res.data);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo generar la vista previa");
    } finally {
      setLoading(false);
    }
  };

  const doRun = async () => {
    const runDate = lastDayOfMonth(year, month);
    const confirmed = window.confirm(
      `¿Confirma generar la depreciación de ${MONTH_NAMES[month - 1]} ${year}?\n\n` +
      `Activos incluidos: ${preview?.total_assets_included}\n` +
      `Total a depreciar: C$ ${money(preview?.total_depreciation_amount)}\n` +
      `Fecha contable: ${runDate}\n\n` +
      `Esta acción genera comprobantes contables permanentes. Solo se puede revertir anulándolos (no eliminar).`
    );
    if (!confirmed) return;

    try {
      setRunning(true);
      const res = await API.post("/api/fixed-assets/depreciation/run", { year, month, run_date: runDate });
      showAlert(
        `Depreciación de ${MONTH_NAMES[month - 1]} ${year} generada (${res.data.data.total_assets_included} activos, C$ ${money(res.data.data.total_depreciation_amount)})`,
        "success",
      );
      fetchPreview();
      fetchRuns();
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo generar la depreciación");
    } finally {
      setRunning(false);
    }
  };

  const openDetail = async (run) => {
    setDetailOpen(true);
    setDetailRun(run);
    setDetailLines([]);

    try {
      setDetailLoading(true);
      const res = await API.get("/api/fixed-assets/depreciation/detail", { params: { run_id: run.id } });
      setDetailLines(res.data?.data?.lines || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo cargar el detalle de depreciación");
    } finally {
      setDetailLoading(false);
    }
  };

  // Agrupa las líneas por categoría (tipo de activo) — el backend ya las
  // ordena por category_code, así que basta con partirlas donde cambia la
  // categoría. Cada grupo lleva su propio subtotal.
  const groupedDetail = React.useMemo(() => {
    const groups = [];
    let current = null;

    detailLines.forEach((row) => {
      if (!current || current.category_code !== row.category_code) {
        current = { category_code: row.category_code, label: CATEGORY_LABELS[row.category_code] || row.category_code, rows: [] };
        groups.push(current);
      }
      current.rows.push(row);
    });

    return groups.map((g) => ({
      ...g,
      subtotal: {
        acquisition_cost: g.rows.reduce((s, r) => s + Number(r.acquisition_cost || 0), 0),
        depreciation_amount: g.rows.reduce((s, r) => s + Number(r.depreciation_amount || 0), 0),
        accumulated_depreciation_after: g.rows.reduce((s, r) => s + Number(r.accumulated_depreciation_after || 0), 0),
        book_value: g.rows.reduce((s, r) => s + Number(r.book_value || 0), 0),
      },
    }));
  }, [detailLines]);

  const printDetail = () => {
    if (!detailRun || !detailLines.length) return;

    const totalAcquisition = detailLines.reduce((sum, r) => sum + Number(r.acquisition_cost || 0), 0);
    const totalMonth = detailLines.reduce((sum, r) => sum + Number(r.depreciation_amount || 0), 0);
    const totalAccumulated = detailLines.reduce((sum, r) => sum + Number(r.accumulated_depreciation_after || 0), 0);
    const totalBookValue = detailLines.reduce((sum, r) => sum + Number(r.book_value || 0), 0);

    // Filas planas con marcadores section/total — así printAccountingReport
    // (ya usado por Balance de Comprobación, Mayor General, etc.) las
    // renderiza como encabezado de grupo y subtotal sin necesitar lógica
    // nueva en ese módulo compartido.
    const printRows = [];
    groupedDetail.forEach((g) => {
      printRows.push({ section: true, asset_code: g.label });
      g.rows.forEach((r) => printRows.push(r));
      printRows.push({
        total: true,
        asset_code: `Subtotal ${g.label}`,
        acquisition_cost: g.subtotal.acquisition_cost,
        depreciation_amount: g.subtotal.depreciation_amount,
        accumulated_depreciation_after: g.subtotal.accumulated_depreciation_after,
        book_value: g.subtotal.book_value,
      });
    });

    printAccountingReport({
      title: "Detalle de Depreciación",
      subtitle: `${MONTH_NAMES[detailRun.period_month - 1]} ${detailRun.period_year}`,
      period: String(detailRun.run_date).slice(0, 10),
      columns: [
        { field: "asset_code", label: "Código" },
        { field: "description", label: "Nombre" },
        { field: "acquisition_date", label: "Fecha adquisición", value: (row) => (row.acquisition_date ? String(row.acquisition_date).slice(0, 10) : "") },
        { field: "useful_life_months", label: "Vida útil (meses)" },
        { field: "depreciation_method", label: "Método" },
        { field: "acquisition_cost", label: "Valor de adquisición", numeric: true, format: money },
        { field: "depreciation_amount", label: "Depreciación del mes", numeric: true, format: money },
        { field: "accumulated_depreciation_after", label: "Depreciación acumulada", numeric: true, format: money },
        { field: "book_value", label: "Valor en libros", numeric: true, format: money },
      ],
      rows: printRows,
      totals: [
        { value: "Totales", colspan: 5 },
        { value: money(totalAcquisition), numeric: true },
        { value: money(totalMonth), numeric: true },
        { value: money(totalAccumulated), numeric: true },
        { value: money(totalBookValue), numeric: true },
      ],
    });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <EventRepeatIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Depreciación de Activos Fijos</Typography>
            <Typography variant="body2" color="text.secondary">
              Genera el gasto por depreciación (línea recta) del período seleccionado
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 2 }}>
          <TextField select size="small" label="Año" value={year} onChange={(e) => { setYear(Number(e.target.value)); setPreview(null); }} sx={{ width: 140 }}>
            {yearOptions.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Mes" value={month} onChange={(e) => { setMonth(Number(e.target.value)); setPreview(null); }} sx={{ width: 180 }}>
            {MONTH_NAMES.map((name, i) => <MenuItem key={name} value={i + 1}>{name}</MenuItem>)}
          </TextField>

          <Button variant="outlined" onClick={fetchPreview} disabled={loading}>Ver vista previa</Button>
        </Stack>

        {preview && (
          <>
            <Divider sx={{ my: 2 }} />

            {preview.already_run && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Ya se generó la depreciación de {MONTH_NAMES[month - 1]} {year} (run #{preview.run_id}). No se puede generar dos veces.
              </Alert>
            )}

            {!preview.already_run && preview.total_assets_included === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                No hay activos con depreciación pendiente para este período.
              </Alert>
            )}

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              {preview.categories.map((c) => (
                <Chip key={c.category_code} label={`${CATEGORY_LABELS[c.category_code] || c.category_code}: C$ ${money(c.total)} (${c.asset_count})`} />
              ))}
              <Chip color="primary" label={`Total: C$ ${money(preview.total_depreciation_amount)}`} />
            </Stack>

            {canRunDepreciation && (
              <Button
                variant="contained"
                color="error"
                disabled={running || preview.already_run || preview.total_assets_included === 0}
                onClick={doRun}
              >
                {running ? "Generando..." : `Generar depreciación de ${MONTH_NAMES[month - 1]} ${year}`}
              </Button>
            )}
          </>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Historial de depreciaciones generadas</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Período</TableCell>
              <TableCell>Fecha contable</TableCell>
              <TableCell align="right">Activos</TableCell>
              <TableCell align="right">Total depreciado</TableCell>
              <TableCell>Comprobante(s)</TableCell>
              <TableCell align="right">Detalle</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{MONTH_NAMES[r.period_month - 1]} {r.period_year}</TableCell>
                <TableCell>{String(r.run_date).slice(0, 10)}</TableCell>
                <TableCell align="right">{r.total_assets_included}</TableCell>
                <TableCell align="right">C$ {money(r.total_depreciation_amount)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(r.journal_entries || []).map((je) => (
                      <Button
                        key={je.id}
                        size="small"
                        onClick={() => handleOpenJournal(je.id)}
                        sx={{ textTransform: "none", minWidth: 0, p: 0, fontWeight: 700 }}
                      >
                        {je.entry_no}
                      </Button>
                    ))}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openDetail(r)} sx={{ textTransform: "none" }}>
                    Ver detalle
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {runs.length === 0 && (
              <TableRow><TableCell colSpan={6} align="center">Sin corridas registradas todavía</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontWeight: 900 }}>
          Detalle de depreciación — {detailRun ? `${MONTH_NAMES[detailRun.period_month - 1]} ${detailRun.period_year}` : ""}
          <Button
            size="small"
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={printDetail}
            disabled={!detailLines.length}
            sx={{ textTransform: "none" }}
          >
            Imprimir
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {detailLoading ? (
            <CircularProgress size={24} />
          ) : (
            <Table size="small" sx={{ "& td, & th": { py: 0.5, px: 1, fontSize: 12.5 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Fecha adquisición</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Método</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Vida útil (meses)</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Valor de adquisición</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Depreciación del mes</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Depreciación acumulada</TableCell>
                  <TableCell sx={{ fontWeight: 800 }} align="right">Valor en libros</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedDetail.map((g) => (
                  <React.Fragment key={g.category_code}>
                    <TableRow sx={{ bgcolor: "#EEF2F7" }}>
                      <TableCell colSpan={9} sx={{ fontWeight: 900 }}>{g.label}</TableCell>
                    </TableRow>
                    {g.rows.map((row) => (
                      <TableRow key={row.asset_code} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{row.asset_code}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell>{row.acquisition_date ? String(row.acquisition_date).slice(0, 10) : ""}</TableCell>
                        <TableCell>{row.depreciation_method}</TableCell>
                        <TableCell align="right">{row.useful_life_months ?? ""}</TableCell>
                        <TableCell align="right">{money(row.acquisition_cost)}</TableCell>
                        <TableCell align="right">{money(row.depreciation_amount)}</TableCell>
                        <TableCell align="right">{money(row.accumulated_depreciation_after)}</TableCell>
                        <TableCell align="right">{money(row.book_value)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                      <TableCell colSpan={5} sx={{ fontWeight: 800 }}>Subtotal {g.label}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{money(g.subtotal.acquisition_cost)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{money(g.subtotal.depreciation_amount)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{money(g.subtotal.accumulated_depreciation_after)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>{money(g.subtotal.book_value)}</TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
                {!detailLines.length && (
                  <TableRow><TableCell colSpan={9} align="center">Sin activos en esta corrida</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <JournalDetailDialog
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
        journalId={selectedJournalId}
      />

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
