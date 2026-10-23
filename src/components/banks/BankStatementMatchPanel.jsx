import React, { useMemo, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import API from "../../api";

const money = (value) => Number(value || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (d) => (d ? String(d).slice(0, 10) : "");
const lineAmount = (l) => (Number(l.credit) > 0 ? Number(l.credit) : Number(l.debit));
const isCreditLine = (l) => Number(l.credit) > 0;

const MODE_LABEL = { AUTO: "Automático", MANUAL: "Manual", ENTRY: "Asiento generado" };

// Movimientos del estado de cuenta importado: pareados con libros y "solo en
// banco". Las partidas "solo en libros" (en tránsito) siguen en las tablas de
// BankReconciliation.jsx.
export default function BankStatementMatchPanel({
  lines, pendingChecks, pendingDeposits, pendingOutflows, currency, canManage, canCreateEntry, onChanged, onError,
}) {
  const [matchLine, setMatchLine] = useState(null);
  const [entryLine, setEntryLine] = useState(null);
  const [entryAccount, setEntryAccount] = useState(null);
  const [entryDescription, setEntryDescription] = useState("");
  const [accounts, setAccounts] = useState(null);
  const [noteLine, setNoteLine] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);

  const matched = useMemo(() => lines.filter((l) => l.match_type), [lines]);
  const bankOnly = useMemo(() => lines.filter((l) => !l.match_type), [lines]);

  const takenKeys = useMemo(() => new Set(matched.map((l) => `${l.match_type}:${l.match_id}`)), [matched]);

  const call = async (fn, successMessage) => {
    try {
      setBusy(true);
      const res = await fn();
      onChanged?.(res?.data?.message || successMessage);
      return true;
    } catch (error) {
      onError?.(error.response?.data?.message || "No se pudo completar la acción");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const unmatch = (line) => call(() => API.delete(`/api/banks/reconciliation/statement/lines/${line.id}/match`), "Movimiento despareado");

  const candidatesFor = (line) => {
    if (!line) return [];
    const amount = lineAmount(line);
    const rows = isCreditLine(line)
      ? pendingDeposits.map((d) => ({ type: "DEPOSIT", id: d.id, date: d.deposit_date, label: d.description, amount: Number(d.amount) }))
      : [
        ...pendingChecks.map((c) => ({ type: "CHECK", id: c.id, date: c.issue_date, label: `Cheque N° ${c.check_number} - ${c.beneficiary_name}`, amount: Number(c.amount) })),
        ...pendingOutflows.map((d) => ({ type: "DEPOSIT", id: d.id, date: d.deposit_date, label: d.description, amount: Number(d.amount) })),
      ];
    return rows
      .filter((r) => !takenKeys.has(`${r.type}:${r.id}`))
      .map((r) => ({ ...r, sameAmount: Math.round(r.amount * 100) === Math.round(amount * 100) }))
      .sort((a, b) => Number(b.sameAmount) - Number(a.sameAmount) || String(a.date).localeCompare(String(b.date)));
  };

  const doMatch = async (item) => {
    const ok = await call(
      () => API.put(`/api/banks/reconciliation/statement/lines/${matchLine.id}/match`, { match_type: item.type, match_id: item.id }),
      "Movimiento pareado",
    );
    if (ok) setMatchLine(null);
  };

  const openEntry = async (line) => {
    setEntryLine(line);
    setEntryAccount(null);
    setEntryDescription(line.description || line.reference || "");
    if (!accounts) {
      try {
        const res = await API.get("/api/accounting/accounts?is_active=1");
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setAccounts(list.filter((a) => Number(a.is_movement) === 1));
      } catch {
        setAccounts([]);
      }
    }
  };

  const doEntry = async () => {
    if (!entryAccount) {
      onError?.("Elija la cuenta contable de contrapartida");
      return;
    }
    const ok = await call(
      () => API.post(`/api/banks/reconciliation/statement/lines/${entryLine.id}/entry`, { account_id: entryAccount.id, description: entryDescription }),
      "Asiento generado",
    );
    if (ok) setEntryLine(null);
  };

  const openNote = (line) => {
    setNoteLine(line);
    setNoteText(line.resolution_notes || "");
  };

  const doNote = async () => {
    const ok = await call(
      () => API.put(`/api/banks/reconciliation/statement/lines/${noteLine.id}/resolution`, { resolution: "PARTIDA_CONCILIATORIA", notes: noteText }),
      "Marcada como partida conciliatoria",
    );
    if (ok) setNoteLine(null);
  };

  const clearNote = (line) => call(
    () => API.put(`/api/banks/reconciliation/statement/lines/${line.id}/resolution`, { resolution: "PENDIENTE" }),
    "Partida devuelta a pendiente",
  );

  const amountCells = (l) => (
    <>
      <TableCell align="right">{Number(l.debit) > 0 ? money(l.debit) : ""}</TableCell>
      <TableCell align="right">{Number(l.credit) > 0 ? money(l.credit) : ""}</TableCell>
    </>
  );

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Pareados con libros ({matched.length})
      </Typography>
      <Table size="small" sx={{ mb: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>Fecha banco</TableCell>
            <TableCell>Movimiento del banco</TableCell>
            <TableCell align="right">Débito</TableCell>
            <TableCell align="right">Crédito</TableCell>
            <TableCell>Partida en libros</TableCell>
            <TableCell>Pareo</TableCell>
            {canManage && <TableCell />}
          </TableRow>
        </TableHead>
        <TableBody>
          {matched.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{day(l.txn_date)}</TableCell>
              <TableCell>{[l.reference, l.description].filter(Boolean).join(" · ")}</TableCell>
              {amountCells(l)}
              <TableCell>
                {l.matched_item ? `${day(l.matched_item.date)} · ${l.matched_item.label}` : `${l.match_type} #${l.match_id}`}
              </TableCell>
              <TableCell><Chip size="small" label={MODE_LABEL[l.match_mode] || l.match_mode} color={l.match_mode === "AUTO" ? "success" : "default"} /></TableCell>
              {canManage && (
                <TableCell>
                  <Button size="small" startIcon={<LinkOffIcon />} disabled={busy} onClick={() => unmatch(l)} sx={{ textTransform: "none" }}>
                    Desparear
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {matched.length === 0 && (
            <TableRow><TableCell colSpan={canManage ? 7 : 6} align="center">Ningún movimiento pareado</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Solo en banco ({bankOnly.length}) — notas de débito/crédito, comisiones, intereses u otros no registrados en libros
      </Typography>
      <Table size="small" sx={{ mb: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>Fecha</TableCell>
            <TableCell>Movimiento del banco</TableCell>
            <TableCell align="right">Débito</TableCell>
            <TableCell align="right">Crédito</TableCell>
            <TableCell>Estado</TableCell>
            {canManage && <TableCell />}
          </TableRow>
        </TableHead>
        <TableBody>
          {bankOnly.map((l) => (
            <TableRow key={l.id}>
              <TableCell>{day(l.txn_date)}</TableCell>
              <TableCell>{[l.reference, l.description].filter(Boolean).join(" · ")}</TableCell>
              {amountCells(l)}
              <TableCell>
                {l.resolution === "PARTIDA_CONCILIATORIA"
                  ? <Chip size="small" color="info" label={`Partida conciliatoria: ${l.resolution_notes || ""}`} />
                  : <Chip size="small" color="error" label="Sin explicar" />}
              </TableCell>
              {canManage && (
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  <Button size="small" startIcon={<LinkIcon />} disabled={busy} onClick={() => setMatchLine(l)} sx={{ textTransform: "none" }}>
                    Parear
                  </Button>
                  {canCreateEntry && (
                    <Button size="small" disabled={busy} onClick={() => openEntry(l)} sx={{ textTransform: "none" }}>
                      Generar asiento
                    </Button>
                  )}
                  {l.resolution === "PARTIDA_CONCILIATORIA" ? (
                    <Button size="small" disabled={busy} onClick={() => clearNote(l)} sx={{ textTransform: "none" }}>Quitar partida</Button>
                  ) : (
                    <Button size="small" disabled={busy} onClick={() => openNote(l)} sx={{ textTransform: "none" }}>Partida conciliatoria</Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {bankOnly.length === 0 && (
            <TableRow><TableCell colSpan={canManage ? 6 : 5} align="center">Todos los movimientos del banco están pareados</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pareo manual */}
      <Dialog open={Boolean(matchLine)} onClose={() => setMatchLine(null)} maxWidth="md" fullWidth>
        <DialogTitle>Parear movimiento del banco</DialogTitle>
        <DialogContent dividers>
          {matchLine && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {day(matchLine.txn_date)} · {[matchLine.reference, matchLine.description].filter(Boolean).join(" · ")} ·{" "}
              {isCreditLine(matchLine) ? "Crédito" : "Débito"} {currency} {money(lineAmount(matchLine))}
            </Alert>
          )}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Partida pendiente en libros</TableCell>
                <TableCell align="right">Monto</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {candidatesFor(matchLine).map((c) => (
                <TableRow key={`${c.type}-${c.id}`}>
                  <TableCell>{day(c.date)}</TableCell>
                  <TableCell>{c.label}</TableCell>
                  <TableCell align="right">{money(c.amount)}</TableCell>
                  <TableCell>
                    <Button size="small" variant={c.sameAmount ? "contained" : "text"} disabled={busy || !c.sameAmount} onClick={() => doMatch(c)}>
                      {c.sameAmount ? "Parear" : "Monto distinto"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {matchLine && candidatesFor(matchLine).length === 0 && (
                <TableRow><TableCell colSpan={4} align="center">No hay partidas pendientes en libros de este tipo</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions><Button onClick={() => setMatchLine(null)}>Cerrar</Button></DialogActions>
      </Dialog>

      {/* Generar asiento */}
      <Dialog open={Boolean(entryLine)} onClose={() => setEntryLine(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{entryLine && isCreditLine(entryLine) ? "Registrar nota de crédito del banco" : "Registrar nota de débito del banco"}</DialogTitle>
        <DialogContent dividers>
          {entryLine && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Se registrará un {isCreditLine(entryLine) ? "ingreso" : "egreso"} bancario por {currency} {money(lineAmount(entryLine))} con fecha{" "}
              {day(entryLine.txn_date)}: {isCreditLine(entryLine) ? "débito al banco y crédito" : "crédito al banco y débito"} a la cuenta elegida.
              Queda pareado con este movimiento y se acredita al guardar la conciliación.
            </Typography>
          )}
          <Stack spacing={2}>
            <Autocomplete
              size="small"
              options={accounts || []}
              loading={!accounts}
              value={entryAccount}
              getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(_, value) => setEntryAccount(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cuenta de contrapartida"
                  helperText={entryLine && isCreditLine(entryLine) ? "Ej. 4101.01 Intereses por depósitos en entidades financieras del país" : "Ej. 5301.01.04 Comisiones por otros servicios"}
                />
              )}
            />
            <TextField size="small" label="Descripción" value={entryDescription} onChange={(e) => setEntryDescription(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEntryLine(null)} disabled={busy}>Cancelar</Button>
          <Button variant="contained" onClick={doEntry} disabled={busy}>Registrar</Button>
        </DialogActions>
      </Dialog>

      {/* Partida conciliatoria */}
      <Dialog open={Boolean(noteLine)} onClose={() => setNoteLine(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Dejar como partida conciliatoria</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ mb: 2 }}>
            La partida no se registra ahora; explica la diferencia de esta conciliación y sigue apareciendo hasta que se registre o se paree.
          </Typography>
          <TextField
            fullWidth size="small" label="Explicación" value={noteText} onChange={(e) => setNoteText(e.target.value)}
            placeholder="Ej. Pago de cliente por transferencia, ya registrado en Pagos"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteLine(null)} disabled={busy}>Cancelar</Button>
          <Button variant="contained" onClick={doNote} disabled={busy || !noteText.trim()}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
