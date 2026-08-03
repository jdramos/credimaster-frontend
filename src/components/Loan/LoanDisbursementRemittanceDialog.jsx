import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import API from "../../api";
import { loanApi } from "../../api/loanApi";

export default function LoanDisbursementRemittanceDialog({ open, onClose, loan, onSuccess }) {
  const [method, setMethod] = useState("CHEQUE");
  const [bankAccountId, setBankAccountId] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setMethod("CHEQUE");
    setBankAccountId("");
    setCheckNumber("");
    setCashRegisterId("");
    setError("");

    API.get("/api/banks/accounts", { params: { status: "ACTIVA" } })
      .then((res) => setBankAccounts(res.data?.data || []))
      .catch(() => setBankAccounts([]));
    API.get("/api/caja/registers", { params: { status: "ACTIVA" } })
      .then((res) => setCashRegisters(res.data?.data || []))
      .catch(() => setCashRegisters([]));
  }, [open]);

  const handleBankAccountChange = (id) => {
    setBankAccountId(id);
    const account = bankAccounts.find((b) => String(b.id) === String(id));
    if (method === "CHEQUE" && account) {
      setCheckNumber(account.next_check_number || "");
    }
  };

  const handleSubmit = async () => {
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

      await loanApi.createRemittance(loan.id, {
        disbursement_method: method,
        bank_account_id: method !== "EFECTIVO" ? bankAccountId : null,
        check_number: method === "CHEQUE" ? checkNumber : null,
        cash_register_id: method === "EFECTIVO" ? cashRegisterId : null,
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Error al registrar la forma de desembolso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Forma de desembolso</DialogTitle>

      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          Crédito #{loan?.id} · {loan?.credit_code ? `Código ${loan.credit_code} · ` : ""}
          Cliente: {loan?.customer_name || loan?.customer_identification} · Monto: C${" "}
          {Number(loan?.approved_amount ?? loan?.amount ?? 0).toLocaleString()}
        </Alert>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Antes de desembolsar, elija cómo saldrá el dinero. Esto emite el cheque, la
          transferencia o el egreso de caja correspondiente y lo registra contra la cuenta de
          Remesas en Tránsito hasta que se confirme el desembolso.
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
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Registrando..." : "Confirmar forma de desembolso"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
