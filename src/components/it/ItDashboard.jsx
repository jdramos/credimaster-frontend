import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Grid, List, ListItemButton, ListItemText, Paper, Typography } from "@mui/material";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { Kpi, PageHeader } from "./ItCommon";
import { BASE, errorMessage, useItCatalog } from "./itShared";

// Tablero de Gestión de TI: cifras del inventario y lo que requiere atención
// (mantenimientos, licencias, respaldos, tickets, contratos y, en una IMF,
// los avisos a CONAMI del Art. 28).

const KIND_LABEL = { MANTENIMIENTO: "Mantenimiento", LICENCIA: "Licencia", RESPALDO: "Respaldo", TICKET: "Mesa de ayuda", CONTRATO: "Contrato", CONAMI: "Aviso CONAMI" };

export default function ItDashboard() {
  const navigate = useNavigate();
  const catalog = useItCatalog();
  const { tenant } = useAuth() || {};
  const mods = tenant?.enabled_modules ?? null;
  const riskEnabled = mods === null || (Array.isArray(mods) && mods.includes("it_risk"));
  const [data, setData] = useState(null);
  const [risk, setRisk] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get(`${BASE}/dashboard`).then(({ data: d }) => setData(d)).catch((err) => setError(errorMessage(err, "No se pudo cargar el tablero de TI.")));
    if (riskEnabled) API.get("/api/it_risk/incidents/alerts").then(({ data: d }) => setRisk(d)).catch(() => setRisk(null));
  }, [riskEnabled]);

  if (error) return <Box sx={{ p: 3 }}><Alert severity="error">{error}</Alert></Box>;
  if (!data) return <Box sx={{ p: 3 }}><CircularProgress size={24} /></Box>;

  const attention = [
    ...(risk?.items || []).map((r) => ({
      kind: "CONAMI", severity: ["VENCIDO", "AVISO_INICIAL_PENDIENTE"].includes(r.alert) ? "error" : "warning", ref: r.incident_number,
      text: `${r.title}: aviso a CONAMI pendiente (Art. 28)`, link: "/ti/riesgo/incidentes",
    })),
    ...data.attention,
  ];
  const a = data.assets;
  const t = data.tickets;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <PageHeader title="Tablero de TI" subtitle="Inventario, mantenimientos, licencias, respaldos, soporte y contratos en un vistazo." helpKey="ti.tablero" />
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={2}><Kpi label="Activos vigentes" value={a.total} hint={`${a.critical} de criticidad alta o crítica`} onClick={() => navigate("/ti/activos")} /></Grid>
        <Grid item xs={6} md={2}><Kpi label="Mantenimientos vencidos" value={data.maintenance.overdue} color={data.maintenance.overdue ? "error.main" : undefined} hint={`${data.maintenance.upcoming} próximos · ${a.without_maintenance_plan} sin plan`} onClick={() => navigate("/ti/mantenimientos")} /></Grid>
        <Grid item xs={6} md={2}><Kpi label="Licencias por renovar" value={data.licenses.expired + data.licenses.expiring} color={data.licenses.expired ? "error.main" : undefined} hint={`${data.licenses.expired} vencidas · ${data.licenses.over_assigned} sobreasignadas`} onClick={() => navigate("/ti/licencias")} /></Grid>
        <Grid item xs={6} md={2}><Kpi label="Respaldos con alerta" value={data.backups.late + data.backups.restore_overdue} color={data.backups.late ? "error.main" : undefined} hint={`${data.backups.late} atrasados · ${data.backups.restore_overdue} sin prueba vigente`} onClick={() => navigate("/ti/respaldos")} /></Grid>
        <Grid item xs={6} md={2}><Kpi label="Tickets pendientes" value={t.active} color={t.sla_overdue ? "error.main" : undefined} hint={`${t.sla_overdue} fuera de tiempo`} onClick={() => navigate("/ti/mesa-de-ayuda")} /></Grid>
        <Grid item xs={6} md={2}><Kpi label="Contratos por renovar" value={data.contracts.expired + data.contracts.expiring} hint={`${data.contracts.with_clause_gaps} con cláusulas por confirmar`} onClick={() => navigate("/ti/contratos")} /></Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={700} sx={{ mb: 1 }}>Requiere atención</Typography>
            {!attention.length && <Alert severity="success">Todo al día.</Alert>}
            <List dense disablePadding>
              {attention.slice(0, 40).map((x, i) => (
                <ListItemButton key={`${x.kind}-${x.ref}-${i}`} onClick={() => navigate(x.link)} sx={{ borderLeft: 3, borderColor: x.severity === "error" ? "error.main" : "warning.main", mb: 0.5 }}>
                  <ListItemText primary={`${KIND_LABEL[x.kind] || x.kind} · ${x.ref}`} secondary={x.text} />
                </ListItemButton>
              ))}
            </List>
            {attention.length > 40 && <Typography variant="caption" color="text.secondary">y {attention.length - 40} más.</Typography>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography fontWeight={700} sx={{ mb: 1 }}>Mesa de ayuda (últimos 30 días)</Typography>
            <Typography variant="body2">Tickets abiertos: <b>{t.opened_30d}</b></Typography>
            <Typography variant="body2">Tiempo promedio de solución: <b>{t.avg_resolution_hours_30d == null ? "—" : `${t.avg_resolution_hours_30d} h`}</b></Typography>
            <Typography variant="body2">Resueltos dentro de la meta: <b>{t.sla_met_pct_30d == null ? "—" : `${t.sla_met_pct_30d}%`}</b></Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Pendientes por prioridad: {Object.entries(t.by_priority).map(([p, n]) => `${catalog?.ticket_priorities?.[p] || p} ${n}`).join(" · ")}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography fontWeight={700} sx={{ mb: 1 }}>Inventario por categoría</Typography>
            {Object.entries(a.by_category).sort((x, y) => y[1] - x[1]).map(([k, n]) => (
              <Typography key={k} variant="body2">{catalog?.asset_categories?.[k] || k}: <b>{n}</b></Typography>
            ))}
            {!Object.keys(a.by_category).length && <Typography variant="body2" color="text.secondary">Todavía no hay activos registrados.</Typography>}
            {a.warranty_expiring > 0 && <Typography variant="body2" sx={{ mt: 1 }}>{a.warranty_expiring} garantía(s) vencen en los próximos {catalog?.warranty_notice_days || 60} días.</Typography>}
          </Paper>
          {riskEnabled && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>Riesgo tecnológico (CONAMI)</Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>{risk?.total ? `${risk.total} incidente(s) con aviso a CONAMI pendiente.` : "Sin avisos a CONAMI pendientes."}</Typography>
              <Button size="small" onClick={() => navigate("/ti/riesgo/incidentes")}>Incidentes (Art. 28)</Button>
              <Button size="small" onClick={() => navigate("/ti/riesgo/autoevaluacion")}>Autoevaluación (Art. 16)</Button>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
