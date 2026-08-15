import React, { useContext, useEffect, useMemo, useState } from "react";
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
  Autocomplete,
} from "@mui/material";
import API from "../../api";
import { loanApi } from "../../api/loanApi";
import { UserContext } from "../../contexts/UserContext";
import { useAuth } from "../../contexts/AuthContext";
import { printCheckDisbursementDetail } from "../../reports/checkDisbursementDetailReport";

const money = (n) =>
  Number(n || 0).toLocaleString("es-NI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function LoanBatchDisbursementDialog({ open, onClose, onSuccess, defaultMethod }) {
  const { user } = useContext(UserContext);
  const currentUserId = user?.id ?? null;
  const { user: authUser, tenant } = useAuth();

  const [method, setMethod] = useState(defaultMethod || "CHEQUE");
  const [bankAccountId, setBankAccountId] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [cashRegisterId, setCashRegisterId] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cashRegisters, setCashRegisters] = useState([]);
  const [loans, setLoans] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [deliveryAgentId, setDeliveryAgentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setMethod(defaultMethod || "CHEQUE");
    setBankAccountId("");
    setCheckNumber("");
    setBeneficiaryName("");
    setCashRegisterId("");
    setSelectedIds([]);
    setSearch("");
    setError("");
    setDeliveryAgentId(currentUserId);

    API.get("/api/banks/accounts", { params: { status: "ACTIVA" } })
      .then((res) => setBankAccounts(res.data?.data || []))
      .catch(() => setBankAccounts([]));
    API.get("/api/caja/registers", { params: { status: "ACTIVA" } })
      .then((res) => setCashRegisters(res.data?.data || []))
      .catch(() => setCashRegisters([]));
    API.get("/api/users")
      .then((res) => {
        const active = (res.data || []).filter((u) => u.user_status === 1 || u.user_status === undefined);
        setDeliveryAgents(active);
      })
      .catch(() => setDeliveryAgents([]));

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
    if (!deliveryAgentId) {
      setError("Debe indicar quién le va a entregar el cheque/efectivo al cliente");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await loanApi.createBatchRemittance({
        loan_ids: selectedIds,
        disbursement_method: method,
        bank_account_id: method !== "EFECTIVO" ? bankAccountId : null,
        check_number: method === "CHEQUE" ? checkNumber : null,
        beneficiary_name: method === "CHEQUE" ? beneficiaryName : null,
        cash_register_id: method === "EFECTIVO" ? cashRegisterId : null,
        delivery_agent_id: deliveryAgentId,
      });

      // Al desembolsar con cheque, imprimir automáticamente el detalle con los
      // créditos que respaldan el cheque (el asiento consolida el monto).
      const bankCheckId = res?.data?.bank_check_id;
      if (method === "CHEQUE" && bankCheckId) {
        try {
          const det = await API.get(`/api/loans/remittances/check/${bankCheckId}/supporting`);
          const data = det.data?.data || {};
          printCheckDisbursementDetail({
            company: {
              commercial_name: tenant?.commercial_name || tenant?.name,
              legal_name: tenant?.legal_name || tenant?.company_name,
              logo_url: tenant?.logo_url,
              tax_id: tenant?.tax_id,
              address: tenant?.address,
              phone: tenant?.phone,
            },
            user: { full_name: authUser?.full_name },
            check: data.check || {},
            loans: data.loans || [],
            total: data.total || 0,
          });
        } catch {
          // Si falla la impresión, el desembolso igual se registró; no se bloquea.
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Error al desembolsar los créditos");
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
          transferencia o movimiento de caja. Se emite un solo comprobante por el monto total y los
          créditos quedan desembolsados de inmediato, pendientes solo de entregar el cheque/efectivo
          al cliente.
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

          {method === "CHEQUE" && (
            <TextField
              fullWidth
              label="Beneficiario del cheque"
              placeholder="A nombre de quién se emite el cheque"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              helperText="Si se deja vacío, se usa el detalle del desembolso."
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

          <Autocomplete
            options={deliveryAgents}
            getOptionLabel={(o) => o.full_name || ""}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            value={deliveryAgents.find((u) => u.id === deliveryAgentId) || null}
            onChange={(_, newValue) => setDeliveryAgentId(newValue?.id || null)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="¿Quién le va a entregar el cheque/efectivo al cliente?"
                helperText="Puede ser usted mismo, o un gestor que lo entregará después"
              />
            )}
          />

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
        <Button onClick={handleSubmit} variant="contained" disabled={loading || !deliveryAgentId}>
          {loading ? "Desembolsando..." : "Confirmar desembolso"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
