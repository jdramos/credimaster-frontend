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

const Stat = ({ label, value, strong = false, color }) => (
  <Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant={strong ? "h6" : "subtitle1"} sx={{ fontWeight: strong ? 700 : 500 }} color={color}>
      {value}
    </Typography>
  </Paper>
);

const time = (value) => (value ? String(value).replace("T", " ").slice(11, 16) : "");

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
