import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import API from "../../api";
import { money } from "./DenominationCounter";
import { reportMoney } from "../common/reportFormat";

const Stat = ({ label, value, strong = false, color }) => (
  <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant={strong ? "h6" : "subtitle1"} sx={{ fontWeight: strong ? 700 : 500 }} color={color}>
      {value}
    </Typography>
  </Paper>
);

const time = (value) => (value ? String(value).replace("T", " ").slice(11, 16) : "");

// Excel del detalle de un turno (lo mismo que muestra este componente):
// resumen del arqueo, compraventa de divisas, cobros y movimientos.
export const buildCashSessionDetailReport = (session, currencies = []) => {
  const t = session?.totals || {};
  const closed = session?.status === "CERRADA";
  const difference = Number(session?.difference || 0);
  const symbolOf = (code) => currencies.find((c) => c.code === code)?.symbol || code;
  const section = (concept) => ({ section: true, concept });
  const line = (concept, amount, extra = {}) => ({ concept, amount: amount === null || amount === undefined ? null : Number(amount), ...extra });
  const rows = [
    section("Resumen"),
    line("Fondo de apertura", t.opening_amount),
    line(`Cobros en efectivo (${t.payments_count || 0})`, t.payments_total),
    line(`Ingresos (${t.ingresos_count || 0})`, t.ingresos_total),
    line(`Arqueos de cobradores (${t.arqueos_count || 0})`, t.arqueos_total),
    line(`Egresos (${t.egresos_count || 0})`, -Number(t.egresos_total || 0)),
    line(`Desembolsos (${t.disbursements_count || 0})`, -Number(t.disbursements_total || 0)),
    ...(Number(t.voids_out_total) !== 0 || Number(t.voids_in_total) !== 0
      ? [line("Anulaciones de turnos cerrados", Number(t.voids_in_total || 0) - Number(t.voids_out_total || 0))] : []),
    ...(Number(t.fx_operations_count || 0) > 0 ? [line(`Compraventa de divisas (${t.fx_operations_count}), neto en C$`, t.fx_operations_nio)] : []),
    ...(Number(t.fx_gain || 0) !== 0 ? [line("Ganancia en divisas (vuelto y ventas)", t.fx_gain)] : []),
    line("Esperado en córdobas", t.expected_nio ?? t.expected_amount),
    ...Object.entries(t.currencies || {})
      .filter(([, c]) => Number(c.expected_qty) || Number(c.payments_in) || Number(c.bought) || Number(c.sold))
      .map(([code, c]) => line(`Esperado en ${code}${c.book_rate ? ` (costo ${Number(c.book_rate).toFixed(4)})` : ""}`, c.expected_qty, { reference: symbolOf(code) })),
    ...(closed ? [
      line("Contado en córdobas", session.counted_nio ?? session.counted_amount),
      ...Object.entries(t.fx_close || {}).filter(([, c]) => Number(c.counted_qty))
        .map(([code, c]) => line(`Contado en ${code}`, c.counted_qty, { reference: symbolOf(code) })),
      line(difference < 0 ? "Faltante" : difference > 0 ? "Sobrante" : "Diferencia", Math.abs(difference)),
    ] : []),
  ];
  const fxOperations = session?.fx_operations || [];
  if (fxOperations.length) {
    rows.push(section("Compraventa de divisas"));
    fxOperations.forEach((f) => rows.push(line(
      `${f.operation_type === "COMPRA" ? "Compra" : "Venta"} ${f.currency_symbol || f.currency_code} ${Number(f.fx_amount || 0).toFixed(2)} a ${Number(f.rate).toFixed(4)} — ${f.person_name} (${f.person_identification})`,
      f.operation_type === "COMPRA" ? -f.nio_amount : f.nio_amount,
      { id: f.id, time: time(f.created_at), status: f.status === "ANULADO" ? "Anulada" : "Registrada" },
    )));
  }
  rows.push(section("Cobros en efectivo"));
  (session?.payments || []).forEach((p) => rows.push(line(
    p.customer_name,
    p.voided_in_this_session ? -p.amount : p.amount,
    {
      id: `#${p.id}`,
      time: time(p.created_at),
      reference: p.credit_code || p.loan_id,
      status: p.voided_in_this_session ? "Anulado (sale de este turno)" : p.payment_status === "A" ? "Activo" : "Anulado",
    },
  )));
  rows.push(section("Movimientos de caja"));
  (session?.movements || []).forEach((m) => rows.push(line(
    `${m.movement_type === "INGRESO" ? "Ingreso" : Number(m.is_disbursement) ? "Desembolso" : "Egreso"}: ${m.description || ""}`,
    m.movement_type === "INGRESO" ? m.amount : -m.amount,
    {
      id: m.id,
      reference: m.entry_no,
      status: m.voided_in_this_session ? "Anulado (cargado a este turno)" : m.status === "REGISTRADO" ? "Registrado" : "Anulado",
    },
  )));
  (session?.arqueos || []).forEach((a) => rows.push(line(
    `Arqueo de cobrador: ${a.collector_name || ""}`,
    a.counted_amount,
    { id: `A-${a.id}`, status: a.status === "REGISTRADO" ? "Registrado" : "Anulado" },
  )));
  return {
    title: "Detalle de turno de caja",
    subtitle: `${session?.register_name || ""} · Turno #${session?.id || ""} · ${session?.user_name || ""} · ${closed ? "Cerrada" : "Abierta"}`,
    period: session?.business_date ? `Día operativo ${session.business_date}` : "",
    fileName: `turno_caja_${session?.id || ""}_${session?.business_date || ""}`,
    sheetName: "Turno de caja",
    columns: [
      { field: "id", label: "#" },
      { field: "time", label: "Hora" },
      { field: "concept", label: "Concepto" },
      { field: "reference", label: "Crédito / comprobante" },
      { label: "Monto", value: (r) => r.amount, numeric: true, format: (v) => (v === null || v === undefined ? "" : reportMoney(v)) },
      { field: "status", label: "Estado" },
    ],
    rows,
  };
};

// Desglose del arqueo de un turno y lo que entró/salió de la caja en él, por
// moneda. onChanged: tras anular una compraventa de divisas (turno abierto).
export default function CashSessionSummary({ session, currencies = [], onChanged }) {
  const [voidError, setVoidError] = useState("");
  const t = session?.totals || {};
  const closed = session?.status === "CERRADA";
  const difference = Number(session?.difference || 0);
  const symbolOf = (code) => currencies.find((c) => c.code === code)?.symbol || code;
  const fxTotals = Object.entries(t.currencies || {});
  const fxClose = t.fx_close || {};
  const fxOperations = session?.fx_operations || [];
  const payments = session?.payments || [];
  const movements = session?.movements || [];
  const arqueos = session?.arqueos || [];

  return (
    <Box>
      <Grid container spacing={1.5}>
        <Grid item xs={6} md={3}><Stat label="Fondo de apertura" value={money(t.opening_amount)} /></Grid>
        <Grid item xs={6} md={3}><Stat label={`Cobros en efectivo (${t.payments_count || 0})`} value={money(t.payments_total)} /></Grid>
        <Grid item xs={6} md={3}><Stat label={`Ingresos (${t.ingresos_count || 0})`} value={money(t.ingresos_total)} /></Grid>
        <Grid item xs={6} md={3}><Stat label={`Arqueos de cobradores (${t.arqueos_count || 0})`} value={money(t.arqueos_total)} /></Grid>
        <Grid item xs={6} md={3}><Stat label={`Egresos (${t.egresos_count || 0})`} value={money(-Number(t.egresos_total || 0))} /></Grid>
        <Grid item xs={6} md={3}><Stat label={`Desembolsos (${t.disbursements_count || 0})`} value={money(-Number(t.disbursements_total || 0))} /></Grid>
        {(Number(t.voids_out_total) !== 0 || Number(t.voids_in_total) !== 0) && (
          <Grid item xs={6} md={3}>
            <Stat label="Anulaciones de turnos cerrados" value={money(Number(t.voids_in_total || 0) - Number(t.voids_out_total || 0))} />
          </Grid>
        )}
        {Number(t.fx_operations_count || 0) > 0 && (
          <Grid item xs={6} md={3}><Stat label={`Compraventa de divisas (${t.fx_operations_count}), neto en C$`} value={money(t.fx_operations_nio)} /></Grid>
        )}
        {Number(t.fx_gain || 0) !== 0 && (
          <Grid item xs={6} md={3}><Stat label="Ganancia en divisas (vuelto y ventas)" value={money(t.fx_gain)} /></Grid>
        )}
        <Grid item xs={6} md={3}>
          <Stat label="Esperado en córdobas" value={money(t.expected_nio ?? t.expected_amount)} strong />
        </Grid>
        {fxTotals.filter(([, c]) => Number(c.expected_qty) || Number(c.payments_in) || Number(c.bought) || Number(c.sold)).map(([code, c]) => (
          <Grid item xs={6} md={3} key={code}>
            <Stat
              label={`Esperado en ${code}${c.book_rate ? ` (costo ${Number(c.book_rate).toFixed(4)})` : ""}`}
              value={money(c.expected_qty, symbolOf(code))}
              strong
            />
          </Grid>
        ))}
        {closed && (
          <>
            <Grid item xs={6} md={3}>
              <Stat
                label="Contado"
                value={`${money(session.counted_nio ?? session.counted_amount)}${Object.entries(fxClose)
                  .filter(([, c]) => Number(c.counted_qty))
                  .map(([code, c]) => ` + ${money(c.counted_qty, symbolOf(code))}`)
                  .join("")}`}
                strong
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <Stat
                label={difference < 0 ? "Faltante" : difference > 0 ? "Sobrante" : "Diferencia"}
                value={money(Math.abs(difference))}
                strong
                color={difference < 0 ? "error.main" : difference > 0 ? "warning.main" : "success.main"}
              />
            </Grid>
          </>
        )}
      </Grid>

      {fxOperations.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Compraventa de divisas</Typography>
          {voidError && <Alert severity="error" sx={{ mb: 1 }}>{voidError}</Alert>}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Hora</TableCell>
                <TableCell>Operación</TableCell>
                <TableCell>Persona</TableCell>
                <TableCell align="right">Divisa</TableCell>
                <TableCell align="right">TC</TableCell>
                <TableCell align="right">C$</TableCell>
                <TableCell align="right">Ganancia</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fxOperations.map((f) => (
                <TableRow key={`f-${f.id}`}>
                  <TableCell>{f.id}</TableCell>
                  <TableCell>{time(f.created_at)}</TableCell>
                  <TableCell>{f.operation_type === "COMPRA" ? "Compra" : "Venta"}</TableCell>
                  <TableCell>{f.person_name} ({f.person_identification})</TableCell>
                  <TableCell align="right">{money(f.fx_amount, f.currency_symbol || f.currency_code)}</TableCell>
                  <TableCell align="right">{Number(f.rate).toFixed(4)}</TableCell>
                  <TableCell align="right">{money(f.operation_type === "COMPRA" ? -f.nio_amount : f.nio_amount)}</TableCell>
                  <TableCell align="right">{f.operation_type === "VENTA" ? money(f.gain) : ""}</TableCell>
                  <TableCell>
                    {f.status === "ANULADO" ? (
                      <Chip size="small" label="Anulada" />
                    ) : !closed && onChanged ? (
                      <Button
                        size="small"
                        color="warning"
                        onClick={async () => {
                          const reason = window.prompt("Motivo de la anulación");
                          if (!reason) return;
                          setVoidError("");
                          try {
                            await API.put(`/api/caja/fx-operations/${f.id}/void`, { void_reason: reason });
                            onChanged();
                          } catch (err) {
                            setVoidError(err.response?.data?.message || "No se pudo anular la operación");
                          }
                        }}
                      >
                        Anular
                      </Button>
                    ) : (
                      <Chip size="small" color="success" label="Registrada" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Cobros en efectivo</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Pago</TableCell>
            <TableCell>Hora</TableCell>
            <TableCell>Crédito</TableCell>
            <TableCell>Cliente</TableCell>
            <TableCell align="right">Monto</TableCell>
            <TableCell>Estado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.length === 0 && (
            <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary">Sin cobros en este turno.</Typography></TableCell></TableRow>
          )}
          {payments.map((p) => (
            <TableRow key={`p-${p.id}`}>
              <TableCell>#{p.id}</TableCell>
              <TableCell>{time(p.created_at)}</TableCell>
              <TableCell>{p.credit_code || p.loan_id}</TableCell>
              <TableCell>{p.customer_name}</TableCell>
              <TableCell align="right">{money(p.voided_in_this_session ? -p.amount : p.amount)}</TableCell>
              <TableCell>
                {p.voided_in_this_session
                  ? <Chip size="small" color="warning" label="Anulado (sale de este turno)" />
                  : p.payment_status === "A" ? <Chip size="small" color="success" label="Activo" /> : <Chip size="small" label="Anulado" />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Movimientos de caja</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Descripción</TableCell>
            <TableCell>Comprobante</TableCell>
            <TableCell align="right">Monto</TableCell>
            <TableCell>Estado</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {movements.length === 0 && arqueos.length === 0 && (
            <TableRow><TableCell colSpan={6}><Typography variant="body2" color="text.secondary">Sin movimientos en este turno.</Typography></TableCell></TableRow>
          )}
          {movements.map((m) => (
            <TableRow key={`m-${m.id}`}>
              <TableCell>{m.id}</TableCell>
              <TableCell>{m.movement_type === "INGRESO" ? "Ingreso" : Number(m.is_disbursement) ? "Desembolso" : "Egreso"}</TableCell>
              <TableCell>{m.description}</TableCell>
              <TableCell>{m.entry_no}</TableCell>
              <TableCell align="right">{money(m.movement_type === "INGRESO" ? m.amount : -m.amount)}</TableCell>
              <TableCell>
                {m.voided_in_this_session
                  ? <Chip size="small" color="warning" label="Anulado (cargado a este turno)" />
                  : m.status === "REGISTRADO" ? <Chip size="small" color="success" label="Registrado" /> : <Chip size="small" label="Anulado" />}
              </TableCell>
            </TableRow>
          ))}
          {arqueos.map((a) => (
            <TableRow key={`a-${a.id}`}>
              <TableCell>A-{a.id}</TableCell>
              <TableCell>Arqueo de cobrador</TableCell>
              <TableCell>{a.collector_name}</TableCell>
              <TableCell />
              <TableCell align="right">{money(a.counted_amount)}</TableCell>
              <TableCell>
                {a.status === "REGISTRADO" ? <Chip size="small" color="success" label="Registrado" /> : <Chip size="small" label="Anulado" />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
