import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Alert,
  Stack,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Chip,
} from "@mui/material";
import API from "../../api";
import { loanApi } from "../../api/loanApi";

const money = (n) =>
  Number(n || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function LoanBatchDisbursementDialog({ open, onClose, onSuccess, defaultMethod }) {
  const [method, setMethod] = useState(defaultMethod || "CHEQUE");
  const [bankAccountId, setBankAccountId] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [loans, setLoans] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setMethod(defaultMethod || "CHEQUE");
    setBankAccountId("");
    setCheckNumber("");
    setCashRegisterId("");
    setSelectedIds([]);
    setSearch("");
    setError("");

    API.get("/api/banks/accounts", { params: { status: "ACTIVA" } })
      .then((res) => setBankAccounts(res.data?.data || []))
      .catch(() => setBankAccounts([]));
    API.get("/api/caja/registers", { params: { status: "ACTIVA" } })
      .then((res) => setCashRegisters(res.data?.data || []))
      .catch(() => setCashRegisters([]));

    setLoadingLoans(true);
    loanApi
      .listDisbursableLoans()
      .then((res) => setLoans(res?.data || []))
      .catch(() => setLoans([]))
      .finally(() => setLoadingLoans(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleBankAccountChange = (id) => {
    setBankAccountId(id);
    const account = bankAccounts.find((b) => String(b.id) === String(id));
    if (method === "CHEQUE" && account) {
      setCheckNumber(account.next_check_number || "");
    }
  };

  const filteredLoans = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return loans;
    return loans.filter(
      (l) =>
        String(l.id).includes(term) ||
        String(l.credit_code || "").toLowerCase().includes(term) ||
        (l.customer_name || "").toLowerCase().includes(term) ||
        (l.customer_identification || "").toLowerCase().includes(term),
    );
  }, [loans, search]);

  const selectedLoans = useMemo(
    () => loans.filter((l) => selectedIds.includes(l.id)),
    [loans, selectedIds],
  );

  const totalAmount = useMemo(
    () => selectedLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0),
    [selectedLoans],
  );

  const branchMismatch = useMemo(() => {
    if (selectedLoans.length < 2) return false;
    const firstBranch = selectedLoans[0].branch_id;
    return selectedLoans.some((l) => l.branch_id !== firstBranch);
  }, [selectedLoans]);

  const toggleLoan = (loanId) => {
    setSelectedIds((prev) =>
      prev.includes(loanId) ? prev.filter((id) => id !== loanId) : [...prev, loanId],
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setError("Debe seleccionar al menos un crédito a desembolsar");
      return;
    }
    if (branchMismatch) {
      setError("Todos los créditos seleccionados deben pertenecer a la misma sucursal");
      return;
    }
    if (method !== "EFECTIVO" && !bankAccountId) {
      setError("Debe seleccionar la cuenta bancaria");
      return;
    }
    if (method === "CHEQUE" && !checkNumber) {
      setError("Debe indicar el número de cheque");
      return;
    }
    if (method === "EFECTIVO" && !cashRegisterId) {
      setError("Debe seleccionar la caja");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await loanApi.createBatchRemittance({
        loan_ids: selectedIds,
        disbursement_method: method,
        bank_account_id: method !== "EFECTIVO" ? bankAccountId : null,
        check_number: method === "CHEQUE" ? checkNumber : null,
        cash_register_id: method === "EFECTIVO" ? cashRegisterId : null,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Error al registrar el desembolso por lote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Desembolsar créditos</DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Seleccione los créditos aprobados y aún no desembolsados que saldrán en este cheque,
          transferencia o movimiento de caja. Se emite un solo comprobante por el monto total y se
          registra contra la cuenta de Remesas en Tránsito hasta que se confirme cada desembolso.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <FormControl>
            <FormLabel>Forma de pago</FormLabel>
            <RadioGroup row value={method} onChange={(e) => setMethod(e.target.value)}>
              <FormControlLabel value="CHEQUE" control={<Radio />} label="Cheque" />
              <FormControlLabel value="TRANSFERENCIA" control={<Radio />} label="Transferencia" />
              <FormControlLabel value="EFECTIVO" control={<Radio />} label="Efectivo" />
            </RadioGroup>
          </FormControl>

          {(method === "CHEQUE" || method === "TRANSFERENCIA") && (
            <TextField
              select
              fullWidth
              label="Cuenta bancaria"
              value={bankAccountId}
              onChange={(e) => handleBankAccountChange(e.target.value)}
            >
              {bankAccounts.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.account_alias} ({b.currency_symbol} {Number(b.current_balance || 0).toLocaleString()})
                </MenuItem>
              ))}
            </TextField>
          )}

          {method === "CHEQUE" && (
            <TextField
              fullWidth
              label="Número de cheque"
              value={checkNumber}
              onChange={(e) => setCheckNumber(e.target.value)}
            />
          )}

          {method === "EFECTIVO" && (
            <TextField
              select
              fullWidth
              label="Caja"
              value={cashRegisterId}
              onChange={(e) => setCashRegisterId(e.target.value)}
            >
              {cashRegisters.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            fullWidth
            size="small"
            label="Buscar crédito (número, cliente, cédula)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {branchMismatch && (
            <Alert severity="warning">
              Los créditos seleccionados pertenecen a sucursales distintas — solo se puede agrupar
              en un mismo comprobante créditos de la misma sucursal.
            </Alert>
          )}

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Crédito</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Sucursal</TableCell>
                <TableCell align="right">Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingLoans && (
                <TableRow>
                  <TableCell colSpan={5}>Cargando créditos…</TableCell>
                </TableRow>
              )}
              {!loadingLoans && filteredLoans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No hay créditos aprobados pendientes de desembolsar.</TableCell>
                </TableRow>
              )}
              {filteredLoans.map((loan) => (
                <TableRow
                  key={loan.id}
                  hover
                  selected={selectedIds.includes(loan.id)}
                  onClick={() => toggleLoan(loan.id)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedIds.includes(loan.id)} />
                  </TableCell>
                  <TableCell>
                    #{loan.id}
                    {loan.credit_code ? ` · ${loan.credit_code}` : ""}
                  </TableCell>
                  <TableCell>
                    {loan.customer_name}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {loan.customer_identification}
                    </Typography>
                  </TableCell>
                  <TableCell>{loan.branch_name || "—"}</TableCell>
                  <TableCell align="right">C$ {money(loan.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Chip label={`${selectedIds.length} crédito(s) seleccionado(s)`} />
            <Typography sx={{ fontWeight: 700 }}>Total: C$ {money(totalAmount)}</Typography>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Registrando..." : "Confirmar desembolso"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
