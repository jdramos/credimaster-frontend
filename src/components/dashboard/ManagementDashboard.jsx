import React, { createContext, useContext, useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Grid, MenuItem, TextField, ToggleButton, ToggleButtonGroup, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import dayjs from "dayjs";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import LoyaltyIcon from "@mui/icons-material/Loyalty";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import FlagIcon from "@mui/icons-material/Flag";
import SavingsIcon from "@mui/icons-material/Savings";
import PercentIcon from "@mui/icons-material/Percent";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import InsightsIcon from "@mui/icons-material/Insights";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import BAC from "../../styles/bac";
import { getManagementDashboard } from "../../api/dashboardBalances";
import { UserContext } from "../../contexts/UserContext";
import BoardReportDialog from "./BoardReportDialog";
import ProductPerformanceSection from "./ProductPerformanceSection";

// Tablero gerencial: indicadores de FLUJO del período (clientes nuevos e
// inactivos, colocación, recuperación, cancelaciones, saneamientos, meta) que
// complementan los saldos al corte del dashboard. Backend:
// GET /api/dashboard/management (managementDashboardController.js).

const money = (v) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", maximumFractionDigits: 0 }).format(Number(v || 0));
const int = (v) => new Intl.NumberFormat("es-NI").format(Number(v || 0));
const growth = (c, p) => {
  const cur = Number(c || 0);
  const prev = Number(p || 0);
  if (!prev) return undefined;
  return ((cur - prev) / prev) * 100;
};
const day = (d) => dayjs(d).format("DD/MM/YYYY");
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const monthLabel = (p) => {
  const [y, m] = String(p).split("-");
  return `${MONTHS[Number(m) - 1]} ${String(y).slice(2)}`;
};

const pct = (v) => `${Number(v || 0).toFixed(2)}%`;

// Con qué período se comparan las variaciones ▲▼ (lo elige el usuario y se
// recuerda en este navegador).
const COMPARE_KEY = "dashboardCompare";
const COMPARE_OPTIONS = [
  { value: "month", label: "Mes anterior" },
  { value: "year", label: "Año anterior" },
];
const loadCompare = () => {
  try {
    const v = localStorage.getItem(COMPARE_KEY);
    return COMPARE_OPTIONS.some((o) => o.value === v) ? v : "month";
  } catch {
    return "month";
  }
};
// Texto del ▲▼ de cada tarjeta, p. ej. "vs. mes anterior (01/09/2026 – 16/09/2026)".
const CompareContext = createContext("vs. período anterior");

const GroupTitle = ({ children, hint }) => (
  <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 1.5, mb: 0.75 }}>
    <Typography fontWeight={800} fontSize={12} sx={{ textTransform: "uppercase", letterSpacing: 0.5, color: "text.primary" }}>
      {children}
    </Typography>
    {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
  </Stack>
);

const PALETTE = {
  primary: "#1565C0",
  success: "#2E7D32",
  warning: "#EF6C00",
  error: "#C62828",
  info: "#00838F",
  purple: "#6A1B9A",
};

// Tarjeta compacta: valor principal y, al lado, su cantidad (p. ej.
// "C$1,542,972 · 23 créditos"); debajo, la variación contra el período
// anterior y el detalle en una sola línea.
function StatCard({ title, value, extra, growth: g, invertGrowth = false, detail, icon: Icon, color = "primary", tooltip }) {
  const main = PALETTE[color] || PALETTE.primary;
  const compareTitle = useContext(CompareContext);
  const good = g == null ? 0 : invertGrowth ? -g : g;
  const card = (
    <Paper
      variant="outlined"
      sx={{ p: 1.5, borderRadius: 2.5, borderLeft: `4px solid ${main}`, height: "100%", boxSizing: "border-box" }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, color: "text.secondary" }}>
          {title}
        </Typography>
        {Icon && <Icon sx={{ fontSize: 18, color: main, flexShrink: 0 }} />}
      </Stack>
      <Stack direction="row" alignItems="baseline" columnGap={1} flexWrap="wrap" sx={{ mt: 0.25 }}>
        <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
        {extra && <Typography sx={{ fontSize: 13, fontWeight: 700, color: "text.secondary" }}>{extra}</Typography>}
      </Stack>
      <Typography component="div" sx={{ fontSize: 12, color: "text.secondary", lineHeight: 1.35, mt: 0.25 }}>
        {g != null && (
          <Box
            component="span"
            title={compareTitle}
            sx={{ fontWeight: 800, mr: 0.75, color: good > 0 ? "success.main" : good < 0 ? "error.main" : "text.secondary" }}
          >
            {g > 0 ? "▲" : g < 0 ? "▼" : "="} {Math.abs(g).toFixed(1)}%{" "}
          </Box>
        )}
        {detail}
      </Typography>
    </Paper>
  );
  return tooltip ? (
    <Tooltip title={tooltip}>
      <Box sx={{ height: "100%" }}>{card}</Box>
    </Tooltip>
  ) : (
    card
  );
}

function RankingTable({ title, rows, columns }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: "100%" }}>
      <Typography fontWeight={800} fontSize={14} mb={1}>{title}</Typography>
      {rows.length ? (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ pl: 0 }}>#</TableCell>
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align || "left"}>{c.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.id}>
                <TableCell sx={{ pl: 0, color: "text.secondary" }}>{i + 1}</TableCell>
                {columns.map((c) => (
                  <TableCell key={c.key} align={c.align || "left"} sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: c.align === "right" ? "nowrap" : undefined }}>
                    {c.render ? c.render(r) : r[c.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Typography variant="body2" color="text.secondary">Sin movimientos en el período.</Typography>
      )}
    </Paper>
  );
}

// products: catálogo de productos financieros (filtro propio del tablero; las
// tarjetas de saldo del dashboard no se filtran por producto).
export default function ManagementDashboard({ params, reloadKey, products = [] }) {
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [productId, setProductId] = useState("");
  const [boardOpen, setBoardOpen] = useState(false);
  const [compare, setCompare] = useState(loadCompare);
  const { role, permissions = [] } = useContext(UserContext) || {};
  // El informe a la Junta incluye cifras contables consolidadas.
  const canBoardReport = Number(role) === 1 || (permissions.includes("balances.ver") && permissions.includes("contabilidad.ver"));

  useEffect(() => {
    // Espera la primera carga del dashboard (reloadKey) para no consultar dos veces.
    if (!reloadKey || !params?.date_from || !params?.date_to) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: "" }));
    getManagementDashboard({
      date_from: params.date_from,
      date_to: params.date_to,
      branch_id: params.branch_id,
      promoter_id: params.promoter_id,
      collector_id: params.collector_id,
      product_id: productId || undefined,
      compare,
    })
      .then((res) => !cancelled && setState({ loading: false, data: res?.data || null, error: "" }))
      .catch((err) => !cancelled && setState({ loading: false, data: null, error: err.response?.data?.message || "No se pudo cargar el tablero gerencial." }));
    return () => {
      cancelled = true;
    };
    // Se recarga al aplicar filtros (reloadKey) o al cambiar la comparación,
    // no con cada cambio en los campos de fecha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, compare, productId]);

  const changeCompare = (_e, value) => {
    if (!value) return;
    setCompare(value);
    try {
      localStorage.setItem(COMPARE_KEY, value);
    } catch {
      // sin almacenamiento local: la elección dura solo esta visita
    }
  };

  if (state.loading && !state.data) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress size={24} />
      </Paper>
    );
  }
  if (state.error) return <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{state.error}</Alert>;
  if (!state.data) return null;

  const { current: c, previous: p, placement_goal: goal, trend, top_promoters: topPromoters, top_collectors: topCollectors } = state.data;
  const comparison = state.data.comparison || { label: "período anterior", from: p.range.from, to: p.range.to };
  const compareRangeText = `${day(comparison.from)} – ${day(comparison.to)}`;
  // Sin movimiento en el período de comparación (p. ej. el año anterior a que
  // la institución empezara a operar) no hay variaciones que mostrar.
  const noPreviousData = !p.disbursements.loans && !p.collections.payments && !p.customers.active;
  const chartData = trend.map((t) => ({ ...t, label: monthLabel(t.period) }));
  const goalPct = goal?.achievement;
  const productName = productId ? products.find((x) => String(x.id) === String(productId)) : null;

  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3, position: "relative" }} data-testid="management-dashboard">
      {state.loading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, borderRadius: "12px 12px 0 0" }} />}
      <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap" useFlexGap>
        <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: BAC.soft, color: BAC.primary, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <InsightsIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6" fontWeight={800} fontSize={16}>Indicadores gerenciales</Typography>
          <Typography variant="caption" color="text.secondary">
            Movimiento del {day(c.range.from)} al {day(c.range.to)}
          </Typography>
        </Box>
        {products.length > 0 && (
          <TextField
            select
            size="small"
            label="Producto"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            sx={{ minWidth: 170 }}
            SelectProps={{ displayEmpty: true }}
            InputLabelProps={{ shrink: true }}
            inputProps={{ "aria-label": "Producto" }}
          >
            <MenuItem value="">Todos los productos</MenuItem>
            {products.map((x) => (
              <MenuItem key={x.id} value={String(x.id)}>{x.code} — {x.name}{x.status === "INACTIVE" ? " (inactivo)" : ""}</MenuItem>
            ))}
          </TextField>
        )}
        <Stack alignItems="flex-end" spacing={0.25}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>Comparar con</Typography>
            <ToggleButtonGroup size="small" exclusive value={compare} onChange={changeCompare} aria-label="Comparar con">
              {COMPARE_OPTIONS.map((o) => (
                <ToggleButton key={o.value} value={o.value} sx={{ py: 0.25, px: 1.25, textTransform: "none", fontWeight: 700, fontSize: 12 }}>
                  {o.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }} data-testid="compare-period">
            ▲▼ vs. {comparison.label}: {compareRangeText}
          </Typography>
        </Stack>
        {canBoardReport && (
          <Button size="small" variant="outlined" startIcon={<HistoryEduIcon />} onClick={() => setBoardOpen(true)} sx={{ whiteSpace: "nowrap" }}>
            Informe a la Junta
          </Button>
        )}
      </Stack>
      {boardOpen && <BoardReportDialog open={boardOpen} onClose={() => setBoardOpen(false)} />}
      {productName && (
        <Alert severity="info" sx={{ mt: 1.5, py: 0, borderRadius: 2 }}>
          Indicadores gerenciales del producto {productName.code} — {productName.name}. Las tarjetas de saldo de arriba son del total de la cartera.
        </Alert>
      )}
      {noPreviousData && (
        <Alert severity="info" sx={{ mt: 1.5, py: 0, borderRadius: 2 }}>
          No hay movimientos en el período de comparación ({compareRangeText}), por eso las tarjetas no muestran variación.
        </Alert>
      )}
      <CompareContext.Provider value={`vs. ${comparison.label} (${compareRangeText})`}>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <GroupTitle hint="crédito vivo a la fecha de corte">Clientes</GroupTitle>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard title="Clientes activos" value={int(c.customers.active)} growth={growth(c.customers.active, p.customers.active)} detail="al corte" icon={PeopleAltIcon} color="primary" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Nuevos y recurrentes"
                value={int(c.customers.new)}
                extra="nuevos"
                growth={growth(c.customers.new, p.customers.new)}
                detail={`${int(c.customers.recurrent)} recurrentes (renovaron)`}
                icon={PersonAddAlt1Icon}
                color="success"
                tooltip="Nuevos: su primer crédito se desembolsó en el período. Recurrentes: recibieron un crédito en el período y ya habían tenido otro."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Clientes inactivos"
                value={int(c.customers.inactive)}
                detail={`${int(c.customers.became_inactive)} se inactivaron en el período`}
                icon={PersonOffIcon}
                color="warning"
                tooltip="Tuvieron crédito pero no tienen ninguno vivo al corte. Se inactivaron: terminaron de pagar en el período y no renovaron."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Retención"
                value={c.customers.retention_rate == null ? "—" : pct(c.customers.retention_rate)}
                detail={c.customers.retention_rate == null ? "nadie terminó de pagar en el período" : `de ${int(c.customers.ended)} que terminaron de pagar`}
                icon={LoyaltyIcon}
                color="purple"
                tooltip="De los clientes que terminaron de pagar un crédito en el período, cuántos tienen un crédito vivo al corte."
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} lg={5}>
          <GroupTitle hint="desembolsos del período">Colocación</GroupTitle>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <StatCard
                title="Desembolsado"
                value={money(c.disbursements.amount)}
                extra={`${int(c.disbursements.loans)} créditos`}
                growth={growth(c.disbursements.amount, p.disbursements.amount)}
                detail={`${int(c.disbursements.new_loans)} nuevos · ${int(c.disbursements.recurrent_loans)} renovaciones · promedio ${money(c.disbursements.average)}`}
                icon={RequestQuoteIcon}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <StatCard
                title="Meta de colocación"
                value={goal ? pct(goalPct ?? 0) : "—"}
                detail={goal ? `${money(goal.actual_amount)} de ${money(goal.target_amount)}` : productId ? "las metas del presupuesto no se desglosan por producto" : "sin presupuesto activo con metas para estos meses"}
                icon={FlagIcon}
                color={!goal ? "primary" : goalPct >= 100 ? "success" : goalPct >= 80 ? "warning" : "error"}
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} lg={7}>
          <GroupTitle hint="pagos aplicados en el período">Recuperación</GroupTitle>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Recuperado"
                value={money(c.collections.total)}
                extra={`${int(c.collections.payments)} pagos`}
                growth={growth(c.collections.total, p.collections.total)}
                detail={`Capital ${money(c.collections.principal)} · Interés ${money(c.collections.interest)} · Mora ${money(c.collections.late_interest)}`}
                icon={SavingsIcon}
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Eficiencia de cobro"
                value={c.collections.efficiency == null ? "—" : pct(c.collections.efficiency)}
                detail={`programado ${money(c.collections.expected)}`}
                icon={PercentIcon}
                color={c.collections.efficiency == null ? "primary" : c.collections.efficiency >= 95 ? "success" : c.collections.efficiency >= 80 ? "warning" : "error"}
                tooltip="Capital e interés cobrados frente a las cuotas que vencían en el período. Incluye el cobro de atrasos anteriores, por eso puede superar 100%."
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Créditos cancelados"
                value={int(c.paid_off.loans)}
                growth={growth(c.paid_off.loans, p.paid_off.loans)}
                detail="terminaron de pagar"
                icon={TaskAltIcon}
                color="info"
              />
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <GroupTitle hint="créditos dados de baja como incobrables">Cartera saneada</GroupTitle>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Saneado en el período"
                value={money(c.write_offs.period_amount)}
                extra={`${int(c.write_offs.period_loans)} créditos`}
                icon={RemoveCircleOutlineIcon}
                color="error"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                title="Saneado acumulado"
                value={money(c.write_offs.total_amount)}
                extra={`${int(c.write_offs.total_loans)} créditos`}
                detail="al corte"
                icon={RemoveCircleOutlineIcon}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              {c.write_offs.recoveries_available ? (
                <StatCard
                  title="Recuperación de saneados"
                  value={money(c.write_offs.recovered_amount)}
                  growth={growth(c.write_offs.recovered_amount, p.write_offs?.recovered_amount)}
                  detail={
                    c.write_offs.recoveries
                      ? `${int(c.write_offs.recoveries)} cobros de ${int(c.write_offs.recovered_loans)} créditos`
                      : "sin recuperaciones en el período"
                  }
                  icon={SavingsIcon}
                  color="purple"
                  tooltip="Cobros registrados sobre créditos saneados en el período (Cartera saneada → Registrar recuperación), sin contar los anulados. Se contabilizan en 4201.02."
                />
              ) : (
                <StatCard
                  title="Recuperación de saneados"
                  value="—"
                  detail="no disponible"
                  icon={SavingsIcon}
                  color="purple"
                  tooltip="Esta base de datos aún no tiene el registro de recuperaciones de cartera saneada."
                />
              )}
            </Grid>
          </Grid>
        </Grid>
        {state.data.by_product && (
          <Grid item xs={12}>
            <GroupTitle hint="cartera al corte y movimiento del período">Desempeño por producto</GroupTitle>
            <ProductPerformanceSection
              data={state.data.by_product}
              selectedProductId={productId}
              compareTitle={`vs. ${comparison.label} (${compareRangeText})`}
            />
          </Grid>
        )}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, height: 300 }}>
            <Typography fontWeight={800} fontSize={14}>Colocación y recuperación, últimos 12 meses</Typography>
            <Typography variant="caption" color="text.secondary">Montos en córdobas por mes</Typography>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: 8 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6EAF2" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)} M` : v >= 1e3 ? `${Math.round(v / 1e3)} k` : v)} />
                <RTooltip
                  formatter={(v, name) => [money(v), name]}
                  labelFormatter={(l, payload) => {
                    const row = payload?.[0]?.payload;
                    return row ? `${l} · ${int(row.disbursed_loans)} créditos · ${int(row.new_customers)} clientes nuevos` : l;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="disbursed_amount" name="Desembolsado" fill={BAC.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected_amount" name="Recuperado" fill="#00838F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <RankingTable
            title="Promotores con más colocación"
            rows={topPromoters}
            columns={[
              { key: "name", label: "Promotor" },
              { key: "loans", label: "Créd.", align: "right", render: (r) => int(r.loans) },
              { key: "amount", label: "Monto", align: "right", render: (r) => money(r.amount) },
            ]}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <RankingTable
            title="Cobradores con más recuperación"
            rows={topCollectors}
            columns={[
              { key: "name", label: "Cobrador" },
              { key: "payments", label: "Pagos", align: "right", render: (r) => int(r.payments) },
              { key: "amount", label: "Monto", align: "right", render: (r) => money(r.amount) },
            ]}
          />
        </Grid>
      </Grid>
      </CompareContext.Provider>
    </Paper>
  );
}

