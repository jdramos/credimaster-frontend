import React from "react";
import { Box, Grid, TextField, Typography, Divider } from "@mui/material";

// Denominaciones del córdoba (BCN). Las de cada divisa vienen del catálogo de
// monedas (backend: currencies), que es el que valida y recalcula el total:
// el que se muestra aquí es solo informativo.
export const NIO_DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 1, 0.5, 0.25, 0.1, 0.05];

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

export const money = (value, symbol = "C$") =>
  `${symbol} ${Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const emptyCount = () => ({ NIO: {} });

const sumCount = (byValue = {}) =>
  round2(Object.entries(byValue).reduce((s, [value, qty]) => s + Number(value) * (Number(qty) || 0), 0));

// Totales del conteo: córdobas, cantidad por divisa y su valor en C$ a la
// tasa indicada por moneda (rates: { USD: 36.4, EUR: 39 }).
export const countTotals = (count, rates = {}) => {
  const nio = sumCount(count?.NIO);
  const fx = {};
  const missingCodes = [];
  let fxValue = 0;
  for (const [code, byValue] of Object.entries(count || {})) {
    if (code === "NIO") continue;
    const qty = sumCount(byValue);
    if (!qty) continue;
    fx[code] = qty;
    const rate = Number(rates?.[code]) || 0;
    if (!rate) missingCodes.push(code);
    else fxValue = round2(fxValue + qty * rate);
  }
  return { nio, fx, fxValue, total: round2(nio + fxValue), missingRate: missingCodes.length > 0, missingCodes };
};

// Solo las cantidades mayores a 0, como las espera el backend.
export const toPayload = (count) =>
  Object.fromEntries(
    Object.entries(count || {}).map(([code, byValue]) => [
      code,
      Object.fromEntries(Object.entries(byValue || {}).filter(([, qty]) => Number(qty) > 0).map(([v, qty]) => [v, Number(qty)])),
    ]),
  );

const label = (symbol, value) => `${symbol}${value < 1 ? value.toFixed(2) : value.toLocaleString("es-NI")}`;

// Conteo por denominación del córdoba y de cada divisa del catálogo.
export default function DenominationCounter({ value, onChange, currencies = [], rates = {}, disabled = false }) {
  const totals = countTotals(value, rates);
  const groups = [
    { code: "NIO", symbol: "C$", name: "Córdobas", denominations: NIO_DENOMINATIONS },
    ...currencies.map((c) => ({ code: c.code, symbol: c.symbol, name: c.name, denominations: c.denominations })),
  ];

  const setQty = (code, denom, raw) => {
    const qty = raw === "" ? "" : Math.max(0, Math.floor(Number(raw) || 0));
    onChange({ ...value, [code]: { ...(value?.[code] || {}), [String(denom)]: qty } });
  };

  return (
    <Box>
      <Grid container spacing={2}>
        {groups.map((g) => {
          const qty = g.code === "NIO" ? totals.nio : totals.fx[g.code] || 0;
          const rate = Number(rates?.[g.code]) || 0;
          return (
            <Grid item xs={12} md={groups.length > 2 ? 4 : 6} key={g.code}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{g.name}</Typography>
              <Grid container spacing={1}>
                {g.denominations.map((d) => (
                  <Grid item xs={6} sm={4} key={d}>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      disabled={disabled}
                      label={label(g.symbol, d)}
                      inputProps={{ min: 0, step: 1, "aria-label": `Cantidad ${label(g.symbol, d)}` }}
                      value={value?.[g.code]?.[String(d)] ?? ""}
                      onChange={(e) => setQty(g.code, d, e.target.value)}
                    />
                  </Grid>
                ))}
              </Grid>
              <Typography variant="body2" sx={{ mt: 1 }} data-testid={`total-${g.code}`}>
                Total: <strong>{money(qty, g.symbol)}</strong>
                {g.code !== "NIO" && qty > 0 && (
                  rate
                    ? ` = ${money(round2(qty * rate))} (a ${rate.toFixed(4)})`
                    : <Typography component="span" color="error" variant="body2"> — sin tipo de cambio</Typography>
                )}
              </Typography>
            </Grid>
          );
        })}
      </Grid>
      <Divider sx={{ my: 1.5 }} />
      <Typography variant="subtitle1" data-testid="counted-total">
        Total contado: <strong>{money(totals.nio)}</strong>
        {Object.entries(totals.fx).map(([code, qty]) => {
          const g = groups.find((x) => x.code === code);
          return <span key={code}> + <strong>{money(qty, g?.symbol || code)}</strong></span>;
        })}
        {totals.fxValue > 0 && ` (equivale a ${money(totals.total)})`}
      </Typography>
    </Box>
  );
}
