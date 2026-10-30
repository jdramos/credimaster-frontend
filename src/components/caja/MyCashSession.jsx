import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { UserContext } from "../../contexts/UserContext";
import DenominationCounter, { countTotals, emptyCount, money, toPayload } from "./DenominationCounter";
import CashSessionSummary, { buildCashSessionDetailReport } from "./CashSessionSummary";
import ReportExportButtons from "../common/ReportExportButtons";
import CloseCashSessionDialog from "./CloseCashSessionDialog";
import { printCashSessionReport } from "../../reports/cashSessionReport";
import TellerPaymentDialog from "./TellerPaymentDialog";
import FxOperationDialog from "./FxOperationDialog";
import AccountingSimulationButton from "../accounting/simulation/AccountingSimulationButton";

const round2 = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;

// "Mi caja": el cajero abre su turno contando el fondo, ve lo que lleva
// cobrado y lo cierra con el arqueo. Ver backend api/caja/cashSessionsController.js.
export default function MyCashSession() {
  const navigate = useNavigate();
  const { tenant } = useAuth() || {};
  const { permissions = [], role } = useContext(UserContext) || {};
  const canOperate = role === 1 || permissions.includes("caja.turnos.operar");
  const canRegisterMovements = role === 1 || permissions.includes("caja.movimientos.registrar");
  const canAddPayments = role === 1 || permissions.includes("pagos.insertar");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closeOpen, setCloseOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [fxOpen, setFxOpen] = useState(false);
  const [lastClosed, setLastClosed] = useState(null);

  // Apertura
  const [registerId, setRegisterId] = useState("");
  const [preview, setPreview] = useState(null);
  const [count, setCount] = useState(emptyCount());
  const [useFund, setUseFund] = useState(false);
  const [fundSourceId, setFundSourceId] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [allRegisters, setAllRegisters] = useState([]);
  const [notes, setNotes] = useState("");
  const [acceptDifference, setAcceptDifference] = useState(false);
  const [openError, setOpenError] = useState("");
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/api/caja/sessions/mine");
      setData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo consultar su caja");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Preselecciona la caja asignada al cajero (o la única disponible).
  useEffect(() => {
    if (!data || data.session) return;
    const regs = data.registers || [];
    const preferred = regs.find((r) => r.assigned_to_me) || (regs.length === 1 ? regs[0] : null);
    if (preferred) setRegisterId((current) => current || preferred.id);
  }, [data]);

  useEffect(() => {
    if (!data || data.session) return;
    API.get("/api/caja/registers", { params: { status: "ACTIVA" } })
      .then((res) => setAllRegisters(res.data?.data || []))
      .catch(() => setAllRegisters([]));
  }, [data]);

  useEffect(() => {
    setPreview(null);
    setAcceptDifference(false);
    setOpenError("");
    if (!registerId) return;
    API.get("/api/caja/sessions/opening-preview", { params: { cash_register_id: registerId } })
      .then((res) => setPreview(res.data?.data || null))
      .catch((err) => setOpenError(err.response?.data?.message || "No se pudo consultar la caja"));
  }, [registerId]);

  const selectedRegister = (data?.registers || []).find((r) => Number(r.id) === Number(registerId));
  const currencies = data?.currencies || [];
  const symbolOf = (code) => currencies.find((c) => c.code === code)?.symbol || code;
  const carry = preview?.carry_over || null;
  // Las divisas que quedaron en la caja conservan su costo; en la primera
  // apertura se valoran al TC de compra de la institución del día.
  const openingRates = useMemo(() => {
    const rates = {};
    for (const c of data?.currencies || []) {
      rates[c.code] = preview?.carry_over?.fx?.[c.code]?.rate || preview?.institution_rates?.[c.code]?.buy_rate || null;
    }
    return rates;
  }, [data, preview]);
  const totals = useMemo(() => countTotals(count, openingRates), [count, openingRates]);
  const fund = useFund ? round2(fundAmount || 0) : 0;
  const expectedNio = carry ? round2(Number(carry.carry_nio ?? carry.carry_over) + fund) : null;
  const diffNio = carry ? round2(totals.nio - expectedNio) : 0;
  const fxDiffs = carry
    ? Object.fromEntries(
      [...new Set([...Object.keys(totals.fx), ...Object.keys(carry.fx || {})])]
        .map((code) => [code, round2((totals.fx[code] || 0) - (carry.fx?.[code]?.qty || 0))])
        .filter(([, d]) => d !== 0),
    )
    : {};
  const hasOpeningDifference = diffNio !== 0 || Object.keys(fxDiffs).length > 0;

  // Cuerpo de la apertura; la simulación contable manda lo mismo.
  const buildOpenPayload = () => ({
    cash_register_id: registerId,
    denominations: toPayload(count),
    fund_source_cash_register_id: useFund ? fundSourceId || null : null,
    fund_amount: useFund ? fund : 0,
    accept_opening_difference: acceptDifference,
    notes: notes.trim() || undefined,
  });

  const handleOpen = async () => {
    setOpenError("");
    if (!registerId) {
      setOpenError("Elija la caja a abrir.");
      return;
    }
    if (totals.missingRate) {
      setOpenError(`Hay ${totals.missingCodes.join(", ")} en el conteo pero no hay TC de compra de la institución para hoy.`);
      return;
    }
    if (hasOpeningDifference && (!acceptDifference || !notes.trim())) {
      setOpenError("El fondo contado no coincide con lo que debería haber en la caja. Revise el conteo o confirme la diferencia con una nota.");
      return;
    }
    setOpening(true);
    try {
      await API.post("/api/caja/sessions", buildOpenPayload());
      setCount(emptyCount());
      setNotes("");
      setRegisterId("");
      setUseFund(false);
      setFundAmount("");
      setLastClosed(null);
      await load();
    } catch (err) {
      setOpenError(err.response?.data?.message || "No se pudo abrir la caja");
    } finally {
      setOpening(false);
    }
  };

  const print = (session) =>
    printCashSessionReport({ company: tenant, user: JSON.parse(localStorage.getItem("user") || "{}"), session });

  if (loading && !data) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const session = data?.session;

  return (
    <Box sx={{ p: { xs: 1, md: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <PointOfSaleIcon color="primary" />
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Mi caja</Typography>
        <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading}>Actualizar</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {data && !data.enabled && (
        <Alert severity="info">Los turnos de caja aún no están habilitados para esta empresa.</Alert>
      )}

      {lastClosed && (
        <Alert
          severity={Number(lastClosed.difference) === 0 ? "success" : "warning"}
          sx={{ mb: 2 }}
          action={<Button color="inherit" size="small" startIcon={<PrintIcon />} onClick={() => print(lastClosed)}>Comprobante</Button>}
        >
          Caja cerrada (turno #{lastClosed.id}). Contado {money(lastClosed.counted_amount)}, esperado {money(lastClosed.expected_amount)}
          {Number(lastClosed.difference) !== 0 && ` — ${Number(lastClosed.difference) < 0 ? "faltante" : "sobrante"} de ${money(Math.abs(lastClosed.difference))}`}.
        </Alert>
      )}

      {data?.enabled && session && (
        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">{session.register_name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {session.branch_name} · día {session.business_date} · abierta {String(session.opened_at || "").slice(11, 16)} · turno #{session.id}
              </Typography>
              <Typography variant="body2" color={Object.keys(data?.institution_rates || {}).length ? "text.secondary" : "warning.main"} data-testid="fx-rates">
                {Object.keys(data?.institution_rates || {}).length
                  ? `TC de la institución: ${Object.values(data.institution_rates)
                    .map((r) => `${r.currency_code} compra ${Number(r.buy_rate).toFixed(4)}${r.sell_rate ? ` / venta ${Number(r.sell_rate).toFixed(4)}` : ""}`)
                    .join(" · ")}`
                  : "Sin TC de la institución para hoy: no se reciben ni venden divisas"}
              </Typography>
            </Box>
            <Chip color="success" label="Abierta" />
            {canAddPayments && (
              <Button variant="contained" color="success" onClick={() => setPaymentOpen(true)}>
                Recibir pago
              </Button>
            )}
            {canOperate && currencies.some((c) => c.is_active) && (
              <Button variant="outlined" onClick={() => setFxOpen(true)}>
                Comprar / vender divisas
              </Button>
            )}
            {canRegisterMovements && (
              <Button variant="outlined" onClick={() => navigate(`/caja/movimientos?register=${session.cash_register_id}`)}>
                Ingreso / egreso
              </Button>
            )}
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => print(session)}>Imprimir</Button>
            <ReportExportButtons print={false} report={() => buildCashSessionDetailReport(session, currencies)} />
            <Button variant="contained" color="primary" onClick={() => setCloseOpen(true)}>Cerrar caja</Button>
          </Stack>
          <CashSessionSummary session={session} currencies={currencies} onChanged={load} />
        </Paper>
      )}

      {data?.enabled && !session && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Abrir caja</Typography>
          {data.policies?.require_for_payment && (
            <Alert severity="info" sx={{ mb: 2 }}>Para cobrar en efectivo en oficina debe tener su caja abierta.</Alert>
          )}
          {!canOperate && <Alert severity="warning" sx={{ mb: 2 }}>No tiene permiso para abrir turnos de caja.</Alert>}
          {data.registers?.length === 0 ? (
            <Alert severity="warning">No hay cajas disponibles para usted: todas tienen un turno abierto, están asignadas a otros cajeros o no hay cajas en córdobas con sucursal asignada.</Alert>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField select fullWidth label="Caja" value={registerId} onChange={(e) => setRegisterId(e.target.value)}>
                  {(data.registers || []).map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name} — {r.branch_name} ({r.account_code}){r.assigned_to_me ? " · asignada a usted" : ""}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {preview && (
                <Grid item xs={12} md={6}>
                  {!preview.day_ready && <Alert severity="error">El día operativo de la sucursal no está abierto.</Alert>}
                  {preview.day_ready && (preview.carry_over ? (
                    <Alert severity="info">
                      Quedó en la caja al cierre del turno #{preview.carry_over.last_session_id}:{" "}
                      <strong>{money(preview.carry_over.carry_nio ?? preview.carry_over.carry_over)}</strong>
                      {Object.entries(preview.carry_over.fx || {}).map(([code, c]) => (
                        <span key={code}> + <strong>{money(c.qty, symbolOf(code))}</strong></span>
                      ))}
                      {Number(preview.carry_over.out_of_shift_net) !== 0 && ` (incluye ${money(preview.carry_over.out_of_shift_net)} movidos fuera de turno)`}.
                    </Alert>
                  ) : (
                    <Alert severity="info">Primera apertura de esta caja: cuente el fondo con que inicia.</Alert>
                  ))}
                </Grid>
              )}

              {selectedRegister && (
                <>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={<Switch checked={useFund} onChange={(e) => setUseFund(e.target.checked)} />}
                      label="Recibo fondo de la bóveda"
                    />
                  </Grid>
                  {useFund && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField select fullWidth size="small" label="Bóveda (caja de origen)" value={fundSourceId} onChange={(e) => setFundSourceId(e.target.value)}>
                          {allRegisters.filter((r) => Number(r.id) !== Number(registerId)).map((r) => (
                            <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField fullWidth size="small" type="number" label="Monto del fondo" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} inputProps={{ min: 0, step: "0.01" }} />
                      </Grid>
                    </>
                  )}
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Conteo del fondo</Typography>
                    <DenominationCounter value={count} onChange={setCount} currencies={currencies} rates={openingRates} disabled={opening} />
                  </Grid>
                  {hasOpeningDifference && (
                    <Grid item xs={12}>
                      <Alert severity="warning" data-testid="opening-difference">
                        Debería haber {money(expectedNio)}
                        {Object.entries(carry?.fx || {}).map(([code, c]) => ` + ${money(c.qty, symbolOf(code))}`).join("")}; contó {money(totals.nio)}
                        {Object.entries(totals.fx).map(([code, q]) => ` + ${money(q, symbolOf(code))}`).join("")}.
                        {diffNio !== 0 && <> {diffNio < 0 ? "Faltante" : "Sobrante"} de <strong>{money(Math.abs(diffNio))}</strong>.</>}
                        {Object.entries(fxDiffs).map(([code, d]) => (
                          <span key={code}> {d < 0 ? "Faltante" : "Sobrante"} de <strong>{money(Math.abs(d), symbolOf(code))}</strong>.</span>
                        ))}
                        {" "}Revise el conteo; si es real, confírmelo y explíquelo en la nota.
                        <Box>
                          <FormControlLabel
                            control={<Checkbox checked={acceptDifference} onChange={(e) => setAcceptDifference(e.target.checked)} />}
                            label="Confirmo la diferencia"
                          />
                        </Box>
                      </Alert>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <TextField label="Nota de apertura" fullWidth multiline minRows={2} value={notes} onChange={(e) => setNotes(e.target.value)} inputProps={{ maxLength: 500 }} />
                  </Grid>
                </>
              )}
              {openError && (
                <Grid item xs={12}>
                  <Alert severity="error">{openError}</Alert>
                </Grid>
              )}
              <Grid item xs={12} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button variant="contained" onClick={handleOpen} disabled={opening || !canOperate || !registerId || (preview && !preview.day_ready)}>
                  {opening ? "Abriendo..." : "Abrir caja"}
                </Button>
                <AccountingSimulationButton
                  request={() => (registerId ? { method: "post", url: "/api/caja/sessions", data: buildOpenPayload() } : null)}
                  disabled={opening || !canOperate || !registerId}
                />
              </Grid>
            </Grid>
          )}
        </Paper>
      )}

      {/* Recepción de pagos en ventanilla: cualquier cliente de la empresa,
          también de otra sucursal; lo entregado en C$ y/o divisa, y el vuelto. */}
      {session && (
        <TellerPaymentDialog
          open={paymentOpen}
          session={session}
          currencies={currencies.filter((c) => c.is_active)}
          rates={data?.institution_rates}
          onClose={() => {
            setPaymentOpen(false);
            load();
          }}
        />
      )}
      {session && (
        <FxOperationDialog
          open={fxOpen}
          session={session}
          currencies={currencies.filter((c) => c.is_active)}
          rates={data?.institution_rates}
          onClose={() => {
            setFxOpen(false);
            load();
          }}
        />
      )}

      <CloseCashSessionDialog
        open={closeOpen}
        session={session}
        currencies={currencies}
        onClose={() => setCloseOpen(false)}
        onClosed={(closed) => {
          setCloseOpen(false);
          // Sin imprimir aquí: después del await el navegador bloquearía la
          // ventana; el comprobante queda en el botón del aviso.
          setLastClosed(closed);
          load();
        }}
      />
    </Box>
  );
}
