import React, { useEffect, useState } from "react";
import HelpButton from "../help/HelpButton";
import { Alert, Box, Grid, Paper, Stack, Typography } from "@mui/material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PaymentsIcon from "@mui/icons-material/Payments";
import ShieldIcon from "@mui/icons-material/Shield";
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ApartmentIcon from "@mui/icons-material/Apartment";
import KpiCard from "../dashboard/KpiCard";
import API from "../../api";
import BAC from "../../styles/bac";

// Paleta validada con el skill dataviz (mismos tonos ya corridos por
// scripts/validate_palette.js en el dashboard de cartera esta sesión: azul
// BAC.primary/rojo #C62828 pasan todos los checks CVD como par; barras de
// una sola serie usan un solo tono, sin necesidad de validar adyacencia).
const COST_COLOR = BAC.primary;
const NET_COLOR = "#C62828";

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", minimumFractionDigits: 2 }).format(
    Number(value || 0),
  );

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 2,
          bgcolor: BAC.soft,
          color: BAC.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      <Box>
        <Typography variant="h6" fontWeight={800} fontSize={16}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

export default function HrDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [headcount, setHeadcount] = useState([]);
  const [costByMonth, setCostByMonth] = useState([]);
  const [costByDept, setCostByDept] = useState([]);
  const [liability, setLiability] = useState(null);
  const [contractReminders, setContractReminders] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [headcountRes, monthRes, deptRes, liabilityRes, remindersRes] = await Promise.all([
          API.get("/api/hr/dashboard/headcount-by-department"),
          API.get("/api/hr/dashboard/payroll-cost-by-month"),
          API.get("/api/hr/dashboard/payroll-cost-by-department"),
          API.get("/api/hr/reports/prestaciones-sociales"),
          API.get("/api/hr/contract-reminders"),
        ]);

        setHeadcount(headcountRes.data?.data || []);
        setCostByMonth(monthRes.data?.data || []);
        setCostByDept(deptRes.data?.data || []);
        setLiability(liabilityRes.data?.data ?? liabilityRes.data ?? null);
        setContractReminders(remindersRes.data?.data || []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || "No se pudo cargar el dashboard de RRHH.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalHeadcount = headcount.reduce((sum, d) => sum + Number(d.headcount || 0), 0);
  const currentMonthCost = costByMonth.length ? costByMonth[costByMonth.length - 1].total_cost : 0;
  const totalAcumulado = liability?.totals?.total_acumulado ?? liability?.total_acumulado ?? null;

  return (
    <Box p={{ xs: 1.5, md: 2 }}>
      <Box
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          color: "#fff",
          background: `linear-gradient(120deg, ${BAC.text} 0%, ${BAC.primary} 100%)`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
          <Typography variant="h5" fontWeight={800}>
            Dashboard de RRHH
          </Typography>
          <HelpButton screenKey="rrhh.dashboard" sx={{ color: "white" }} />
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Headcount, costo de planilla y pasivo contingente por prestaciones
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Empleados Activos" value={totalHeadcount} type="number" icon={PeopleAltIcon} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Costo de Planilla (último mes)"
            value={currentMonthCost}
            icon={PaymentsIcon}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Pasivo por Prestaciones"
            value={totalAcumulado}
            icon={ShieldIcon}
            color="purple"
            subtitle="Si se liquidara hoy a todos"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Contratos por Vencer"
            value={contractReminders.length}
            type="number"
            icon={AssignmentLateIcon}
            color="warning"
            subtitle="Próximos 30 días"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 2, borderRadius: 3, height: 380 }}>
            <SectionHeader icon={ShowChartIcon} title="Costo de planilla por mes" subtitle="Corridas de nómina aprobadas" />
            {costByMonth.length === 0 && !loading ? (
              <Alert severity="info">Aún no hay corridas de nómina aprobadas.</Alert>
            ) : (
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={costByMonth}>
                  <defs>
                    <linearGradient id="gradCosto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COST_COLOR} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={COST_COLOR} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradNeto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={NET_COLOR} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={NET_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="total_cost" name="Costo bruto" stroke={COST_COLOR} strokeWidth={2.5} fill="url(#gradCosto)" />
                  <Area type="monotone" dataKey="total_net" name="Neto pagado" stroke={NET_COLOR} strokeWidth={2} fill="url(#gradNeto)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 2, borderRadius: 3, height: 380 }}>
            <SectionHeader icon={AccountTreeIcon} title="Empleados por departamento" />
            {headcount.length === 0 && !loading ? (
              <Alert severity="info">No hay empleados activos con departamento asignado.</Alert>
            ) : (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={headcount} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="department_name" tick={{ fontSize: 12 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="headcount" name="Empleados" fill={BAC.primary} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, borderRadius: 3, height: 360 }}>
            <SectionHeader icon={ApartmentIcon} title="Costo de planilla por departamento" subtitle="Acumulado histórico, corridas aprobadas" />
            {costByDept.length === 0 && !loading ? (
              <Alert severity="info">Aún no hay costo de planilla registrado por departamento.</Alert>
            ) : (
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={costByDept} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" vertical={false} />
                  <XAxis dataKey="department_name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={90} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="total_cost" name="Costo" fill={BAC.primary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
