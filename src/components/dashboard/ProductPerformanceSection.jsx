import React from "react";
import {
  Box, Chip, Grid, LinearProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import BAC from "../../styles/bac";

// Desempeño por producto financiero del tablero gerencial (data.by_product,
// ver backend api/loanProducts/productPerformance.js): cartera, cartera en
// riesgo (PAR 1: capital con algún atraso; no es el "% mora" de capital +
// interés vencidos de las tarjetas de saldo), PAR 30 y
// provisión al corte; colocación, clientes nuevos y recuperación del período.

const money = (v) =>
  new Intl.NumberFormat("es-NI", { style: "currency", currency: "NIO", maximumFractionDigits: 0 }).format(Number(v || 0));
const int = (v) => new Intl.NumberFormat("es-NI").format(Number(v || 0));
const pct = (v) => `${Number(v || 0).toFixed(2)}%`;
const shortMoney = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)} M` : v >= 1e3 ? `${Math.round(v / 1e3)} k` : v);

const Variation = ({ cur, prev, title }) => {
  if (!prev) return <Typography component="span" variant="caption" color="text.secondary">—</Typography>;
  const g = ((Number(cur || 0) - Number(prev)) / Math.abs(Number(prev))) * 100;
  return (
    <Typography component="span" variant="caption" title={title} sx={{ fontWeight: 800, color: g > 0 ? "success.main" : g < 0 ? "error.main" : "text.secondary" }}>
      {g > 0 ? "▲" : g < 0 ? "▼" : "="} {Math.abs(g).toFixed(1)}%
    </Typography>
  );
};

const moraColor = (v) => (v >= 10 ? "error.main" : v >= 5 ? "warning.main" : "text.primary");

export default function ProductPerformanceSection({ data, compareTitle, selectedProductId }) {
  if (!data?.rows?.length) return null;
  const { rows, totals } = data;
  const chartRows = rows
    .filter((r) => r.portfolio.capital > 0 || r.placement.amount > 0)
    .map((r) => ({ label: r.code || "Sin producto", capital: r.portfolio.capital, placement: r.placement.amount }));

  return (
    <Box data-testid="product-performance">
      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={chartRows.length ? 8 : 12}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, overflowX: "auto" }}>
            <Table size="small" sx={{ "& td, & th": { whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ pl: 0 }}>Producto</TableCell>
                  <TableCell align="right">Cartera</TableCell>
                  <TableCell align="right">Particip.</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Cartera en riesgo (PAR 1): capital de los créditos con al menos un día de atraso. No es el % de mora de las tarjetas de saldo, que solo cuenta lo vencido.">
                      <span>En riesgo</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">PAR 30</TableCell>
                  <TableCell align="right">Provisión</TableCell>
                  <TableCell align="right">Colocado</TableCell>
                  <TableCell align="right">Nuevos</TableCell>
                  <TableCell align="right">Recuperado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.product_id ?? "none"} selected={selectedProductId && String(selectedProductId) === String(r.product_id)}>
                    <TableCell sx={{ pl: 0 }}>
                      <Typography component="span" fontWeight={800} fontSize={13}>{r.code || "—"}</Typography>{" "}
                      <Typography component="span" fontSize={13}>{r.name}</Typography>
                      {r.status === "INACTIVE" && <Chip size="small" label="Inactivo" sx={{ ml: 0.75, height: 18, fontSize: 10 }} />}
                    </TableCell>
                    <TableCell align="right">
                      {money(r.portfolio.capital)}
                      <Box sx={{ fontSize: 11, color: "text.secondary" }}>
                        {int(r.portfolio.loans)} créd. · <Variation cur={r.portfolio.capital} prev={r.previous?.capital} title={compareTitle} />
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ minWidth: 90 }}>
                      {pct(r.portfolio.share)}
                      <LinearProgress variant="determinate" value={Math.min(100, Number(r.portfolio.share || 0))} sx={{ mt: 0.5, height: 4, borderRadius: 2 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ color: moraColor(r.portfolio.overdue_pct), fontWeight: 700 }}>
                      <Tooltip title={`Capital con días de atraso: ${money(r.portfolio.overdue_capital)}`}>
                        <span>{pct(r.portfolio.overdue_pct)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right">{pct(r.portfolio.par30_pct)}</TableCell>
                    <TableCell align="right">{money(r.portfolio.provision)}</TableCell>
                    <TableCell align="right">
                      {money(r.placement.amount)}
                      <Box sx={{ fontSize: 11, color: "text.secondary" }}>
                        {int(r.placement.loans)} créd. · <Variation cur={r.placement.amount} prev={r.previous?.placement_amount} title={compareTitle} />
                      </Box>
                    </TableCell>
                    <TableCell align="right">{int(r.placement.new_customers)}</TableCell>
                    <TableCell align="right">{money(r.collections.total)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ "& td": { fontWeight: 800, borderBottom: 0 } }}>
                  <TableCell sx={{ pl: 0 }}>Total</TableCell>
                  <TableCell align="right">{money(totals.portfolio.capital)}</TableCell>
                  <TableCell align="right">100.00%</TableCell>
                  <TableCell align="right" sx={{ color: moraColor(totals.portfolio.overdue_pct) }}>{pct(totals.portfolio.overdue_pct)}</TableCell>
                  <TableCell align="right">{pct(totals.portfolio.par30_pct)}</TableCell>
                  <TableCell align="right">{money(totals.portfolio.provision)}</TableCell>
                  <TableCell align="right">{money(totals.placement.amount)}</TableCell>
                  <TableCell align="right">{int(totals.placement.new_customers)}</TableCell>
                  <TableCell align="right">{money(totals.collections.total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
              Cartera, en riesgo (capital de créditos con algún atraso), PAR 30 y provisión estimada: último cierre de cada sucursal al corte, según el auxiliar de cartera.
              Colocado, clientes nuevos y recuperado (capital + interés): movimiento del período.
            </Typography>
          </Paper>
        </Grid>
        {chartRows.length > 0 && (
          <Grid item xs={12} lg={4}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, height: "100%", minHeight: 240, boxSizing: "border-box" }}>
              <Typography fontWeight={800} fontSize={13}>Cartera y colocación por producto</Typography>
              <ResponsiveContainer width="100%" height={Math.max(180, chartRows.length * 48 + 60)}>
                <BarChart data={chartRows} layout="vertical" margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E6EAF2" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={shortMoney} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={56} />
                  <RTooltip formatter={(v, name) => [money(v), name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="capital" name="Cartera" fill={BAC.primary} radius={[0, 4, 4, 0]} />
                  <Bar dataKey="placement" name="Colocado en el período" fill="#00838F" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
