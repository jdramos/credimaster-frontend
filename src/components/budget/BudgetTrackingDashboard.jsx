import React, { useEffect, useMemo, useState } from "react";
import HelpButton from "../help/HelpButton";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Chip,
  Stack,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import dayjs from "dayjs";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PercentIcon from "@mui/icons-material/Percent";
import FlagIcon from "@mui/icons-material/Flag";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import KpiCard from "../dashboard/KpiCard";
import { getBudgetTracking } from "../../api/budget";
import { getDashboardCatalogs } from "../../api/dashboardBalances";
import ReportExportButtons from "../common/ReportExportButtons";
import { reportMoney, reportPercent, reportFilters } from "../common/reportFormat";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", minimumFractionDigits: 2 }).format(Number(value || 0));

const STATUS_CHIP = {
  OK: { label: "OK", color: "success" },
  WARNING: { label: "Atención", color: "warning" },
  ALERT: { label: "Alerta", color: "error" },
};

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 2 }}>
      <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: "var(--cm-surface, #EEF3FB)", color: "var(--cm-primary-text, #0F4C81)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      <Box>
        <Typography variant="h6" fontWeight={800} fontSize={16}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Stack>
  );
}

export default function BudgetTrackingDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [month, setMonth] = useState(dayjs().month() + 1);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getBudgetTracking(id, { month, branch_id: branchId || undefined });
      setData(res?.data || null);
    } catch (error) {
      console.error("getBudgetTracking error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDashboardCatalogs().then((res) => setBranches(res?.data?.branches || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, month, branchId]);

  const accountChartData = useMemo(
    () => (data?.accounts || []).map((a) => ({ name: a.muc_code, Presupuestado: a.budgeted_month, Real: a.actual_month })),
    [data],
  );

  const placementChartData = useMemo(
    () => (data?.placement || []).map((p) => ({ name: p.branch_name, Meta: p.target_month, Real: p.actual_month })),
    [data],
  );

  const consumedPct = data?.summary?.total_budgeted_month > 0
    ? Math.round((data.summary.total_actual_month / data.summary.total_budgeted_month) * 100)
    : 0;

  const placementPct = data?.summary?.total_placement_target_month > 0
    ? Math.round((data.summary.total_placement_actual_month / data.summary.total_placement_target_month) * 100)
    : 0;

  // Reporte de ejecución presupuestaria: resumen del mes y las dos tablas.
  const buildReport = () => {
    const section = (concept) => ({ section: true, concept });
    const amount = (field) => (r) => (r[field] === null || r[field] === undefined ? null : Number(r[field]));
    const fmt = (v) => (v === null || v === undefined ? "" : reportMoney(v));
    const rows = [
      section("Resumen del mes"),
      {
        concept: "Presupuesto operativo (total)",
        month_plan: data.summary.total_budgeted_month, month_actual: data.summary.total_actual_month, pct: consumedPct,
      },
      {
        concept: "Colocación de cartera (total)",
        month_plan: data.summary.total_placement_target_month, month_actual: data.summary.total_placement_actual_month, pct: placementPct,
      },
      { concept: `Cuentas en alerta: ${data.summary.accounts_in_alert || 0}` },
      section("Presupuesto operativo vs real (por cuenta MUC)"),
      ...data.accounts.map((a) => ({
        concept: `${a.muc_code} ${a.account_name || ""}`, type: a.account_type,
        month_plan: a.budgeted_month, month_actual: a.actual_month, ytd_plan: a.budgeted_ytd, ytd_actual: a.actual_ytd,
        pct: a.variance_pct, status: a.status,
      })),
      section("Colocación de cartera vs meta (por sucursal)"),
      ...data.placement.map((p) => ({
        concept: p.branch_name,
        month_plan: p.target_month, month_actual: p.actual_month, ytd_plan: p.target_ytd, ytd_actual: p.actual_ytd,
        pct: p.variance_pct, status: p.status,
      })),
    ];
    return {
      title: "Ejecución presupuestaria",
      subtitle: reportFilters([
        ["Presupuesto", data.budget ? `${data.budget.name} (${data.budget.year_no})` : ""],
        ["Sucursal (colocación)", branchId ? branches.find((b) => String(b.id) === String(branchId))?.name : "Todas"],
      ]),
      period: `${MONTHS[month - 1]} ${data.budget?.year_no || ""}`,
      orientation: "landscape",
      fileName: `ejecucion_presupuestaria_${data.budget?.year_no || ""}_${String(month).padStart(2, "0")}`,
      sheetName: "Ejecución",
      columns: [
        { field: "concept", label: "Cuenta / sucursal" },
        { field: "type", label: "Tipo" },
        { label: "Presup. / meta mes", value: amount("month_plan"), numeric: true, format: fmt },
        { label: "Real mes", value: amount("month_actual"), numeric: true, format: fmt },
        { label: "Presup. / meta YTD", value: amount("ytd_plan"), numeric: true, format: fmt },
        { label: "Real YTD", value: amount("ytd_actual"), numeric: true, format: fmt },
        { label: "% del mes", value: amount("pct"), numeric: true, format: reportPercent },
        { field: "status", label: "Estado", format: (v) => STATUS_CHIP[v]?.label || v || "" },
      ],
      rows,
    };
  };

  return (
    <Box sx={{ p: 2 }}>
      <Breadcrumbs sx={{ mb: 1.5 }}>
        <Link component={RouterLink} to="/presupuesto" underline="hover">Presupuestos</Link>
        <Typography color="text.primary">{data?.budget ? `${data.budget.name} (${data.budget.year_no})` : "..."}</Typography>
        <Typography color="text.primary">Seguimiento</Typography>
      </Breadcrumbs>

      <Box
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          color: "#fff",
          background: "linear-gradient(120deg, #0B1F3A 0%, #0F4C81 100%)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Typography variant="h5" fontWeight={800}>Seguimiento de Presupuesto</Typography>
              <HelpButton screenKey="presupuesto.seguimiento" sx={{ color: "white" }} />
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {data?.budget?.name} — {MONTHS[month - 1]} {data?.budget?.year_no}
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => navigate("/presupuesto")} sx={{ color: "#fff", borderColor: "rgba(255,255,255,.4)", textTransform: "none" }}>
            Volver
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <TextField select size="small" label="Mes" value={month} onChange={(e) => setMonth(Number(e.target.value))} sx={{ minWidth: 160 }}>
            {MONTHS.map((m, idx) => (
              <MenuItem key={m} value={idx + 1}>{m}</MenuItem>
            ))}
          </TextField>

          <TextField select size="small" label="Sucursal (colocación)" value={branchId} onChange={(e) => setBranchId(e.target.value)} sx={{ minWidth: 220 }}>
            <MenuItem value="">Todas</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>

          <Button variant="outlined" startIcon={<RefreshIcon />} sx={{ textTransform: "none" }} onClick={load}>
            Actualizar
          </Button>
          <ReportExportButtons report={buildReport} disabled={!data || loading} />
        </Stack>
      </Paper>

      {loading ? (
        <Box py={8} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      ) : !data ? null : (
        <>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(6, 1fr)" }, gap: 2, mb: 3 }}>
            <KpiCard title="Presupuestado (mes)" value={data.summary.total_budgeted_month} icon={AccountBalanceIcon} color="primary" />
            <KpiCard title="Gastado (mes)" value={data.summary.total_actual_month} icon={TrendingUpIcon} color="info" />
            <KpiCard title="% Consumido" value={consumedPct} type="percent" icon={PercentIcon} color={consumedPct >= 90 ? "error" : "warning"} />
            <KpiCard title="Cuentas en alerta" value={data.summary.accounts_in_alert} type="number" icon={WarningAmberIcon} color="error" />
            <KpiCard title="Meta colocación (mes)" value={data.summary.total_placement_target_month} icon={FlagIcon} color="purple" />
            <KpiCard title="Colocado (mes)" value={data.summary.total_placement_actual_month} type="currency" icon={ShowChartIcon} color={placementPct < 80 ? "error" : "success"} />
          </Box>

          <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
            <SectionHeader icon={AccountBalanceIcon} title="Presupuesto operativo vs real" subtitle="Por cuenta MUC, mes seleccionado" />

            {accountChartData.length > 0 && (
              <Box sx={{ height: 320, mb: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={accountChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Presupuestado" fill="#1565c0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Real" fill="#ef6c00" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, backgroundColor: "var(--cm-surface, #F8FAFC)" } }}>
                    <TableCell>Cuenta</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell align="right">Presup. mes</TableCell>
                    <TableCell align="right">Real mes</TableCell>
                    <TableCell align="right">Presup. YTD</TableCell>
                    <TableCell align="right">Real YTD</TableCell>
                    <TableCell align="right">% consumido</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.accounts.map((a) => (
                    <TableRow key={a.account_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{a.muc_code}</Typography>
                        <Typography variant="caption" color="text.secondary">{a.account_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={a.account_type} color={a.account_type === "GASTO" ? "error" : "success"} />
                      </TableCell>
                      <TableCell align="right">{formatCurrency(a.budgeted_month)}</TableCell>
                      <TableCell align="right">{formatCurrency(a.actual_month)}</TableCell>
                      <TableCell align="right">{formatCurrency(a.budgeted_ytd)}</TableCell>
                      <TableCell align="right">{formatCurrency(a.actual_ytd)}</TableCell>
                      <TableCell align="right">{a.variance_pct}%</TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={STATUS_CHIP[a.status]?.label} color={STATUS_CHIP[a.status]?.color} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!data.accounts.length && (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Este presupuesto todavía no tiene líneas por cuenta.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>

          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <SectionHeader icon={FlagIcon} title="Colocación de cartera vs meta" subtitle="Por sucursal, mes seleccionado" />

            {placementChartData.length > 0 && (
              <Box sx={{ height: 280, mb: 3 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={placementChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Meta" fill="#6a1b9a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Real" fill="#2e7d32" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, backgroundColor: "var(--cm-surface, #F8FAFC)" } }}>
                    <TableCell>Sucursal</TableCell>
                    <TableCell align="right">Meta mes</TableCell>
                    <TableCell align="right">Real mes</TableCell>
                    <TableCell align="right">Meta YTD</TableCell>
                    <TableCell align="right">Real YTD</TableCell>
                    <TableCell align="right">% de meta</TableCell>
                    <TableCell align="center">Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.placement.map((p) => (
                    <TableRow key={p.branch_id ?? "consolidado"} hover>
                      <TableCell>{p.branch_name}</TableCell>
                      <TableCell align="right">{formatCurrency(p.target_month)}</TableCell>
                      <TableCell align="right">{formatCurrency(p.actual_month)}</TableCell>
                      <TableCell align="right">{formatCurrency(p.target_ytd)}</TableCell>
                      <TableCell align="right">{formatCurrency(p.actual_ytd)}</TableCell>
                      <TableCell align="right">{p.variance_pct}%</TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={STATUS_CHIP[p.status]?.label} color={STATUS_CHIP[p.status]?.color} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {!data.placement.length && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                          Este presupuesto todavía no tiene metas de colocación.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
}
