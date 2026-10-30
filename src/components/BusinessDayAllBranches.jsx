import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LockIcon from "@mui/icons-material/Lock";
import RefreshIcon from "@mui/icons-material/Refresh";

import API from "../api";
import { UserContext } from "../contexts/UserContext";
import useCachedFetch from "../hooks/useCachedFetch";

const formatDate = (value) => {
  if (!value) return "-";
  const [y, m, d] = String(value).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

// Apertura / cierre del día de varias sucursales a la vez. Cada sucursal
// avanza solo su próximo día pendiente (igual que en el modo de una
// sucursal) y se procesan una tras otra, nunca en paralelo: cada cierre
// toma el candado de su sucursal y contabiliza el día, y la base es
// compartida. Si una sucursal falla, se reporta y se sigue con las demás.
export default function BusinessDayAllBranches() {
  const { userBranches = [] } = useContext(UserContext) || {};
  const { data: allBranches } = useCachedFetch("/api/branches");

  const branches = useMemo(() => {
    const allowed = userBranches.map(Number);
    return (allBranches || []).filter((b) => allowed.includes(Number(b.id)));
  }, [allBranches, userBranches]);

  const [statuses, setStatuses] = useState({}); // branchId -> status | { error }
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState({}); // branchId -> bool
  const [results, setResults] = useState({}); // branchId -> { ok, message }
  const [running, setRunning] = useState(null); // "OPEN" | "CLOSE" | null
  const [current, setCurrent] = useState(null); // branchId en proceso
  const [confirm, setConfirm] = useState(null); // "OPEN" | "CLOSE" | null

  const loadStatuses = useCallback(async () => {
    if (!branches.length) return;
    setLoading(true);
    const next = {};
    await Promise.all(
      branches.map(async (b) => {
        try {
          const { data } = await API.get(`/api/business-day/status/${b.id}`);
          next[b.id] = data;
        } catch (err) {
          next[b.id] = { error: err.response?.data?.message || "No se pudo obtener el estado." };
        }
      }),
    );
    setStatuses(next);
    // Por defecto quedan marcadas todas las sucursales.
    setSelected((prev) => Object.fromEntries(branches.map((b) => [b.id, prev[b.id] ?? true])));
    setLoading(false);
  }, [branches]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  const eligible = (action) =>
    branches.filter((b) => selected[b.id] && statuses[b.id]?.pending_action === action);
  const toOpen = eligible("OPEN");
  const toClose = eligible("CLOSE");

  const allChecked = branches.length > 0 && branches.every((b) => selected[b.id]);
  const toggleAll = () => setSelected(Object.fromEntries(branches.map((b) => [b.id, !allChecked])));

  const run = async (action) => {
    setConfirm(null);
    setRunning(action);
    setResults({});
    const list = eligible(action);
    const isOpen = action === "OPEN";

    for (const b of list) {
      const st = statuses[b.id];
      setCurrent(b.id);
      try {
        const { data } = await API.post("/api/loans/balances", {
          branch_id: b.id,
          balance_type: isOpen ? "INITIAL" : "FINAL",
          balance_date: st.pending_date,
        });
        // Ver BusinessDayPanel: el saldo puede generarse aunque la
        // apertura/cierre del día falle; eso viene en day_opened/day_closed.
        const ok = isOpen ? data.day_opened !== false : data.day_closed !== false;
        const msg = isOpen ? data.day_open_message : data.day_close_message;
        setResults((prev) => ({
          ...prev,
          [b.id]: ok
            ? { ok: true, message: `${formatDate(st.pending_date)} ${isOpen ? "abierto" : "cerrado"} · ${data.loans_processed || 0} crédito(s)` }
            : { ok: false, message: `Saldo generado, pero el día no quedó ${isOpen ? "abierto" : "cerrado"}: ${msg || "motivo desconocido"}` },
        }));
      } catch (err) {
        setResults((prev) => ({
          ...prev,
          [b.id]: { ok: false, message: err.response?.data?.error || err.response?.data?.message || "No se pudo procesar." },
        }));
      }
    }

    setCurrent(null);
    setRunning(null);
    await loadStatuses();
  };

  const doneCount = Object.values(results).filter((r) => r.ok).length;
  const failCount = Object.values(results).filter((r) => !r.ok).length;
  const confirmList = confirm ? eligible(confirm) : [];

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid var(--cm-border, #E5E7EB)" }}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Cada sucursal avanza su próximo día pendiente. Marque las sucursales que quiere procesar; se procesan una
          tras otra y, si alguna falla, se sigue con las demás.
        </Typography>

        {loading && !Object.keys(statuses).length ? (
          <Box sx={{ textAlign: "center", my: 2 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox checked={allChecked} onChange={toggleAll} disabled={!!running} inputProps={{ "aria-label": "Todas las sucursales" }} />
                </TableCell>
                <TableCell>Sucursal</TableCell>
                <TableCell>Día pendiente</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Resultado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {branches.map((b) => {
                const st = statuses[b.id];
                const isOpen = st?.pending_action === "OPEN";
                const isDayDone = st?.pending_action === "NONE";
                const res = results[b.id];
                return (
                  <TableRow key={b.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={!!selected[b.id]}
                        onChange={() => setSelected((prev) => ({ ...prev, [b.id]: !prev[b.id] }))}
                        disabled={!!running}
                        inputProps={{ "aria-label": b.name }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{b.name}</TableCell>
                    <TableCell>
                      {st?.error ? "-" : formatDate(st?.pending_date)}
                      {st?.is_backlog && (
                        <Typography variant="caption" color="warning.main" sx={{ display: "block" }}>
                          {st.days_behind} día(s) de atraso
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {st?.error ? (
                        <Chip size="small" color="error" label="Sin estado" />
                      ) : st ? (
                        <Chip
                          size="small"
                          icon={isOpen || isDayDone ? <LockIcon /> : <LockOpenIcon />}
                          label={isDayDone ? "Día cerrado" : isOpen ? "Por abrir" : "Abierto"}
                          color={isOpen || isDayDone ? "default" : "success"}
                          sx={{ fontWeight: 700 }}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      {current === b.id ? (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CircularProgress size={14} />
                          <Typography variant="caption">Procesando…</Typography>
                        </Stack>
                      ) : res ? (
                        <Typography variant="caption" color={res.ok ? "success.main" : "error.main"} data-testid={`resultado-${b.id}`}>
                          {res.message}
                        </Typography>
                      ) : st?.error ? (
                        <Typography variant="caption" color="error.main">{st.error}</Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {(doneCount > 0 || failCount > 0) && !running && (
          <Alert severity={failCount ? "warning" : "success"}>
            {doneCount} sucursal(es) procesada(s) correctamente{failCount ? ` · ${failCount} con error (vea la columna Resultado)` : ""}.
          </Alert>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
          <Button
            variant="contained"
            color="success"
            startIcon={running === "OPEN" ? <CircularProgress size={16} color="inherit" /> : <LockOpenIcon />}
            disabled={!!running || !toOpen.length}
            onClick={() => setConfirm("OPEN")}
          >
            Aperturar ({toOpen.length})
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={running === "CLOSE" ? <CircularProgress size={16} color="inherit" /> : <LockIcon />}
            disabled={!!running || !toClose.length}
            onClick={() => setConfirm("CLOSE")}
          >
            Cerrar ({toClose.length})
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadStatuses} disabled={!!running || loading}>
            Actualizar
          </Button>
        </Stack>
      </Stack>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>{confirm === "OPEN" ? "Aperturar el día en varias sucursales" : "Cerrar el día en varias sucursales"}</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            {confirm === "CLOSE"
              ? "⚠️ El cierre es DEFINITIVO e IRREVERSIBLE: después no se podrán registrar más pagos, créditos, aprobaciones ni desembolsos de estas sucursales para ese día. Verifique que ya se registró todo lo pendiente."
              : "Se generará el saldo inicial y se abrirá el día en estas sucursales:"}
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 3 }}>
              {confirmList.map((b) => (
                <li key={b.id}>
                  {b.name} — {formatDate(statuses[b.id]?.pending_date)}
                </li>
              ))}
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancelar</Button>
          <Button variant="contained" color={confirm === "CLOSE" ? "error" : "primary"} onClick={() => run(confirm)}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
