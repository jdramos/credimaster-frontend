import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, MenuItem, Paper, Snackbar, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import API from "../../api";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportMoney } from "../common/reportFormat";
import { MaintenanceDialog } from "./ItAssets";
import { VoidDialog } from "../itRisk/ItIncidentDetailDialog";
import { PageHeader, StateChip } from "./ItCommon";
import {
  BASE, daysText, errorMessage, fileDate, fmtDate, money, options, stateText, useItCatalog, useItLookups, useItPermissions,
} from "./itShared";

// Mantenimientos de equipos: plan preventivo (Art. 21 num. 1.2 de la norma
// CONAMI de riesgo tecnológico) y registro de preventivos y correctivos.
export default function ItMaintenances() {
  const { canManage, canVoid } = useItPermissions();
  const catalog = useItCatalog();
  const lookups = useItLookups();
  const [tab, setTab] = useState(0);
  const [schedule, setSchedule] = useState(null);
  const [rows, setRows] = useState(null);
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [voiding, setVoiding] = useState(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([
        API.get(`${BASE}/maintenances/schedule`),
        API.get(`${BASE}/maintenances`, { params: type ? { type } : {} }),
      ]);
      setSchedule(s.data);
      setRows(Array.isArray(m.data) ? m.data : []);
      setError("");
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los mantenimientos."));
    }
  }, [type]);
  useEffect(() => { load(); }, [load]);

  const overdue = (schedule?.items || []).filter((i) => i.maintenance.status === "VENCIDO").length;

  // Cada pestaña imprime/exporta su propia tabla.
  const planReport = () => ({
    title: "Plan de mantenimiento preventivo",
    orientation: "landscape",
    columns: [
      { field: "asset_code", label: "Código" },
      { field: "name", label: "Equipo" },
      { field: "category", label: "Categoría", format: (v) => catalog?.asset_categories?.[v] || v },
      { field: "branch_name", label: "Sucursal" },
      { field: "maintenance_frequency_months", label: "Frecuencia", format: (v) => `Cada ${v} meses` },
      { label: "Último preventivo", value: (a) => fmtDate(a.maintenance.last_preventive) },
      { label: "Próximo", value: (a) => `${fmtDate(a.maintenance.due_date)} (${daysText(a.maintenance.days_left)})` },
      { label: "Estado", value: (a) => stateText(a.maintenance.status) },
    ],
    rows: schedule?.items || [],
    fileName: `plan_mantenimiento_ti_${fileDate()}`,
  });
  const logReport = () => ({
    title: "Registro de mantenimientos",
    subtitle: type ? `Tipo: ${catalog?.maintenance_types?.[type] || type}` : "",
    orientation: "landscape",
    columns: [
      { field: "performed_at", label: "Fecha", format: fmtDate },
      { label: "Equipo", value: (m) => `${m.asset_code} · ${m.asset_name}` },
      { field: "maintenance_type", label: "Tipo", format: (v) => catalog?.maintenance_types?.[v] || v },
      { field: "description", label: "Trabajo realizado" },
      { field: "performed_by", label: "Por" },
      { field: "cost", label: "Costo", numeric: true, format: (v) => (v == null || v === "" ? "—" : reportMoney(v)) },
      { field: "currency", label: "Moneda" },
    ],
    rows: rows || [],
    fileName: `mantenimientos_ti_${fileDate()}`,
  });
  const tabRows = tab === 0 ? schedule?.items : rows;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <PageHeader title="Mantenimientos" subtitle="Plan de mantenimiento preventivo por equipo (Art. 21 num. 1.2) y registro de preventivos y correctivos." helpKey="ti.mantenimientos"
        actions={[
          <ReportExportButtons key="r" report={tab === 0 ? planReport : logReport} disabled={!tabRows?.length} />,
          canManage && <Button key="n" variant="contained" startIcon={<AddIcon />} onClick={() => setDialog({})}>Registrar mantenimiento</Button>,
        ]} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {overdue > 0 && <Alert severity="error" sx={{ mb: 2 }}>{overdue} equipo(s) con el mantenimiento preventivo vencido.</Alert>}
      {schedule?.assets_without_plan > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>{schedule.assets_without_plan} equipo(s) sin frecuencia de mantenimiento preventivo. Se define en la ficha del activo.</Alert>
      )}
      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Plan preventivo" />
        <Tab label="Registro" />
      </Tabs>
      {tab === 0 && (
        <Paper variant="outlined" sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Equipo</TableCell><TableCell>Sucursal</TableCell><TableCell>Frecuencia</TableCell><TableCell>Último preventivo</TableCell><TableCell>Próximo</TableCell><TableCell>Estado</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {!schedule && <TableRow><TableCell colSpan={7}><CircularProgress size={20} /></TableCell></TableRow>}
              {schedule && !schedule.items.length && <TableRow><TableCell colSpan={7}><Typography color="text.secondary">Ningún equipo tiene plan preventivo todavía.</Typography></TableCell></TableRow>}
              {(schedule?.items || []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell><Typography fontWeight={600} fontSize={13.5}>{a.asset_code} · {a.name}</Typography><Typography fontSize={12} color="text.secondary">{catalog?.asset_categories?.[a.category]}</Typography></TableCell>
                  <TableCell>{a.branch_name || "—"}</TableCell>
                  <TableCell>Cada {a.maintenance_frequency_months} meses</TableCell>
                  <TableCell>{fmtDate(a.maintenance.last_preventive)}</TableCell>
                  <TableCell>{fmtDate(a.maintenance.due_date)} ({daysText(a.maintenance.days_left)})</TableCell>
                  <TableCell><StateChip state={a.maintenance.status} /></TableCell>
                  <TableCell>{canManage && <Button size="small" onClick={() => setDialog({ assetId: a.id })}>Registrar</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      {tab === 1 && (
        <>
          <TextField select size="small" label="Tipo" value={type} onChange={(e) => setType(e.target.value)} sx={{ mb: 2, minWidth: 180 }}>
            <MenuItem value="">Todos</MenuItem>
            {options(catalog?.maintenance_types).map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <Paper variant="outlined" sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Equipo</TableCell><TableCell>Tipo</TableCell><TableCell>Trabajo realizado</TableCell><TableCell>Por</TableCell><TableCell align="right">Costo</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {(rows || []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(m.performed_at)}</TableCell>
                    <TableCell>{m.asset_code} · {m.asset_name}</TableCell>
                    <TableCell>{catalog?.maintenance_types?.[m.maintenance_type]}</TableCell>
                    <TableCell>{m.description}</TableCell>
                    <TableCell>{m.performed_by}</TableCell>
                    <TableCell align="right">{m.cost != null ? money(m.cost, m.currency) : "—"}</TableCell>
                    <TableCell>{canVoid && <Button size="small" color="error" onClick={() => setVoiding(m)}>Anular</Button>}</TableCell>
                  </TableRow>
                ))}
                {rows && !rows.length && <TableRow><TableCell colSpan={7}><Typography color="text.secondary">Sin mantenimientos registrados.</Typography></TableCell></TableRow>}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
      {dialog && (
        <MaintenanceDialog open catalog={catalog} assets={lookups.assets} assetId={dialog.assetId} onClose={() => setDialog(null)}
          onSaved={async () => { setDialog(null); setToast("Mantenimiento registrado."); await load(); }} />
      )}
      <VoidDialog open={Boolean(voiding)} title="Anular mantenimiento" onClose={() => setVoiding(null)}
        onConfirm={async (reason) => { await API.post(`${BASE}/maintenances/${voiding.id}/void`, { reason }); setVoiding(null); await load(); }} />
      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast("")} message={toast} />
    </Box>
  );
}
