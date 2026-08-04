import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Chip,
  Alert,
  Snackbar,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import SavingsIcon from "@mui/icons-material/Savings";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import PrintIcon from "@mui/icons-material/Print";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import API from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { numberToWords } from "./numberToWords";
import { printBankAccountStatementReport } from "../../reports/bankAccountStatementReport";
import LoanBatchDisbursementDialog from "../Loan/LoanBatchDisbursementDialog";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

const CHECKS_URL = "/api/banks/checks";
const DEPOSITS_URL = "/api/banks/deposits";
const COLLECTOR_CUSTODY_MUC_CODE = "1101.03";

const SOURCE_LABELS = {
  BANKS: "Bancos",
  LOANS: "Créditos",
  FIXED_ASSETS: "Activo Fijo",
  PAYMENTS: "Pagos",
  BUSINESS_DAY: "Cierre del día",
};

const CHECK_STATUS_CHIP = {
  EMITIDO: { label: "Emitido", color: "info" },
  COBRADO: { label: "Cobrado", color: "success" },
  ANULADO: { label: "Anulado", color: "default" },
};

const DEPOSIT_STATUS_CHIP = {
  EN_TRANSITO: { label: "En tránsito", color: "warning" },
  ACREDITADO: { label: "Acreditado", color: "success" },
  ANULADO: { label: "Anulado", color: "default" },
};

const emptyLine = () => ({ account: null, debit: "", credit: "", description: "" });

const emptyCheckForm = {
  bank_account_id: "",
  check_number: "",
  issue_date: new Date().toISOString().slice(0, 10),
  beneficiary_name: "",
  vendor: null,
  concept: "",
  lines: [emptyLine()],
};

const emptyMovementForm = {
  movement_type: "INGRESO",
  bank_account_id: "",
  deposit_date: new Date().toISOString().slice(0, 10),
  description: "",
  collector: null,
  lines: [emptyLine()],
};

const money = (value) => Number(value || 0).toLocaleString("es-NI", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function BankMovementsList() {
  const { tenant } = useAuth();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [accounts, setAccounts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [collectorCustody, setCollectorCustody] = useState(null);

  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "error", message: "" });

  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [batchDisbursementOpen, setBatchDisbursementOpen] = useState(false);
  const [checkDialogOpen, setCheckDialogOpen] = useState(false);
  const [checkForm, setCheckForm] = useState(emptyCheckForm);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const [saving, setSaving] = useState(false);

  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const [checkDetail, setCheckDetail] = useState(null);
  const [depositDetail, setDepositDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const showAlert = (message, severity = "error") => setAlert({ open: true, severity, message });

  useEffect(() => {
    API.get("/api/banks/accounts", { params: { status: "ACTIVA" } }).then((res) => setBankAccounts(res.data?.data || [])).catch(() => {});
    API.get(`/api/accounting/accounts?is_active=1`).then((res) => {
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAccounts(list.filter((a) => Number(a.is_movement) === 1));
    }).catch(() => {});
    API.get("/api/vendors").then((res) => setVendors(Array.isArray(res.data) ? res.data : res.data?.data || [])).catch(() => setVendors([]));
    API.get("/api/collectors").then((res) => setCollectors(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  const selectedBankAccount = useMemo(
    () => bankAccounts.find((b) => b.id === bankAccountId) || null,
    [bankAccounts, bankAccountId],
  );

  const handleSelectAccount = (id) => {
    setBankAccountId(id);
    setStatement(null);
    const acc = bankAccounts.find((b) => b.id === id);
    if (acc) setStartDate(String(acc.opening_date).slice(0, 10));
  };

  const fetchStatement = async () => {
    if (!bankAccountId || !startDate || !endDate) {
      showAlert("Elija la cuenta bancaria y el rango de fechas");
      return;
    }
    if (startDate > endDate) {
      showAlert("La fecha inicial no puede ser mayor a la fecha final");
      return;
    }

    try {
      setLoading(true);
      const res = await API.get(`/api/banks/accounts/${bankAccountId}/statement`, {
        params: { start_date: startDate, end_date: endDate },
      });
      setStatement(res.data?.data || null);
    } catch (error) {
      showAlert(error.response?.data?.message || "No se pudo cargar el estado de cuenta");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!statement) return;
    printBankAccountStatementReport({
      company: tenant,
      user: JSON.parse(localStorage.getItem("user") || "{}"),
      account: statement.bank_account,
      startDate: statement.start_date,
      endDate: statement.end_date,
      openingBalance: statement.opening_balance,
      movements: statement.movements,
      totalDebit: statement.total_debit,
      totalCredit: statement.total_credit,
      closingBalance: statement.closing_balance,
    });
  };

  const currencySymbol = statement?.bank_account?.currency_symbol || selectedBankAccount?.currency_symbol || "C$";

  // ==========================================
  // CHEQUE (idéntico al flujo/vista original de BankChecksList)
  // ==========================================
  const pickCheque = () => {
    if (!bankAccountId) {
      showAlert("Elija primero la cuenta bancaria");
      return;
    }
    setCheckForm({ ...emptyCheckForm, bank_account_id: bankAccountId, check_number: selectedBankAccount?.next_check_number || "" });
    setTypePickerOpen(false);
    setCheckDialogOpen(true);
  };

  const updateCheckLine = (index, field, value) => {
    setCheckForm((f) => {
      const lines = [...f.lines];
      lines[index] = { ...lines[index], [field]: value };
      return { ...f, lines };
    });
  };
  const addCheckLine = () => setCheckForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));
  const removeCheckLine = (index) => setCheckForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }));

  const checkNetAmount = useMemo(
    () => checkForm.lines.reduce((sum, l) => sum + (Number(l.debit) || 0) - (Number(l.credit) || 0), 0),
    [checkForm.lines],
  );
  const selectedCheckBankAccount = useMemo(
    () => bankAccounts.find((b) => b.id === checkForm.bank_account_id) || null,
    [bankAccounts, checkForm.bank_account_id],
  );

  const handleSaveCheck = async () => {
    if (!checkForm.bank_account_id || !checkForm.check_number || !checkForm.issue_date || !checkForm.beneficiary_name || !checkForm.concept) {
      showAlert("Complete cuenta bancaria, número, fecha, beneficiario y concepto");
      return;
    }
    if (checkForm.lines.some((l) => !l.account || (!Number(l.debit) && !Number(l.credit)))) {
      showAlert("Cada línea debe tener cuenta y un monto en débito o crédito");
      return;
    }
    if (checkNetAmount <= 0) {
      showAlert("El neto de las líneas (lo que sale del banco) debe ser mayor a 0");
      return;
    }

    try {
      setSaving(true);
      const res = await API.post(CHECKS_URL, {
        bank_account_id: checkForm.bank_account_id,
        check_number: checkForm.check_number,
        issue_date: checkForm.issue_date,
        beneficiary_name: checkForm.beneficiary_name,
        vendor_id: checkForm.vendor?.id || null,
        concept: checkForm.concept,
        lines: checkForm.lines.map((l) => ({
          account_id: l.account.id,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || undefined,
        })),
      });
      showAlert(`Cheque #${checkForm.check_number} emitido por ${selectedCheckBankAccount?.currency_symbol || "C$"} ${money(res.data.data.amount)} (comprobante ${res.data.data.entry_no})`, "success");
      setCheckDialogOpen(false);
      if (checkForm.bank_account_id === bankAccountId) fetchStatement();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al emitir el cheque");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DEPÓSITO / OTRO MOVIMIENTO
  // ==========================================
  const pickDeposito = () => {
    if (!bankAccountId) {
      showAlert("Elija primero la cuenta bancaria");
      return;
    }
    setMovementForm({ ...emptyMovementForm, bank_account_id: bankAccountId, movement_type: "INGRESO" });
    setCollectorCustody(null);
    setTypePickerOpen(false);
    setMovementDialogOpen(true);
  };
  const pickOtro = () => {
    if (!bankAccountId) {
      showAlert("Elija primero la cuenta bancaria");
      return;
    }
    setMovementForm({ ...emptyMovementForm, bank_account_id: bankAccountId, movement_type: "EGRESO" });
    setCollectorCustody(null);
    setTypePickerOpen(false);
    setMovementDialogOpen(true);
  };

  const isMovementIngreso = movementForm.movement_type === "INGRESO";

  const handleSelectCollector = async (collector) => {
    setMovementForm((f) => {
      if (!collector) return { ...f, collector: null };
      const custodyAccount = accounts.find((a) => a.muc_code === COLLECTOR_CUSTODY_MUC_CODE) || null;
      const onlyLineEmpty = f.lines.length === 1 && !f.lines[0].account && !f.lines[0].debit && !f.lines[0].credit;
      return {
        ...f,
        collector,
        lines: onlyLineEmpty && custodyAccount ? [{ ...f.lines[0], account: custodyAccount }] : f.lines,
      };
    });

    if (!collector) {
      setCollectorCustody(null);
      return;
    }
    try {
      const res = await API.get("/api/caja/collector-custody", { params: { collector_id: collector.id } });
      setCollectorCustody(res.data?.data?.available_custody ?? null);
    } catch {
      setCollectorCustody(null);
    }
  };

  const updateMovementLine = (index, field, value) => {
    setMovementForm((f) => {
      const lines = [...f.lines];
      lines[index] = { ...lines[index], [field]: value };
      return { ...f, lines };
    });
  };
  const addMovementLine = () => setMovementForm((f) => ({ ...f, lines: [...f.lines, emptyLine()] }));
  const removeMovementLine = (index) => setMovementForm((f) => ({ ...f, lines: f.lines.filter((_, i) => i !== index) }));

  const movementNetAmount = useMemo(
    () => movementForm.lines.reduce((sum, l) => sum + (isMovementIngreso ? (Number(l.credit) || 0) - (Number(l.debit) || 0) : (Number(l.debit) || 0) - (Number(l.credit) || 0)), 0),
    [movementForm.lines, isMovementIngreso],
  );

  const handleSaveMovement = async () => {
    if (!movementForm.bank_account_id || !movementForm.deposit_date || !movementForm.description) {
      showAlert("Complete cuenta bancaria, fecha y descripción");
      return;
    }
    if (movementForm.lines.some((l) => !l.account || (!Number(l.debit) && !Number(l.credit)))) {
      showAlert("Cada línea debe tener cuenta y un monto en débito o crédito");
      return;
    }
    if (movementNetAmount <= 0) {
      showAlert(`El neto de las líneas (lo que ${isMovementIngreso ? "entra al" : "sale del"} banco) debe ser mayor a 0`);
      return;
    }

    try {
      setSaving(true);
      const res = await API.post(DEPOSITS_URL, {
        bank_account_id: movementForm.bank_account_id,
        movement_type: movementForm.movement_type,
        deposit_date: movementForm.deposit_date,
        description: movementForm.description,
        collector_id: isMovementIngreso ? (movementForm.collector?.id || undefined) : undefined,
        lines: movementForm.lines.map((l) => ({
          account_id: l.account.id,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          description: l.description || undefined,
        })),
      });
      showAlert(`${isMovementIngreso ? "Depósito" : "Egreso bancario"} registrado por C$ ${money(res.data.data.amount)} (comprobante ${res.data.data.entry_no})`, "success");
      setMovementDialogOpen(false);
      if (movementForm.bank_account_id === bankAccountId) fetchStatement();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al registrar el movimiento");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DETALLE / ANULAR (dirigidos al endpoint correcto según source_type)
  // ==========================================
  const openDetail = async (row) => {
    if (row.source_type === "BANK_CHECK") {
      try {
        setDetailLoading(true);
        setCheckDetail({ check: null, lines: [] });
        const res = await API.get(`${CHECKS_URL}/${row.source_id}`);
        setCheckDetail({ check: res.data?.data || null, lines: res.data?.data?.lines || [] });
      } catch (error) {
        showAlert(error.response?.data?.message || "No se pudo cargar el detalle del cheque");
        setCheckDetail(null);
      } finally {
        setDetailLoading(false);
      }
    } else if (row.source_type === "BANK_DEPOSIT") {
      try {
        setDetailLoading(true);
        setDepositDetail({ deposit: null, lines: [] });
        const res = await API.get(`${DEPOSITS_URL}/${row.source_id}`);
        setDepositDetail({ deposit: res.data?.data || null, lines: res.data?.data?.lines || [] });
      } catch (error) {
        showAlert(error.response?.data?.message || "No se pudo cargar el detalle del movimiento");
        setDepositDetail(null);
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const confirmVoid = async () => {
    if (!voidTarget) return;
    const isCheque = voidTarget.source_type === "BANK_CHECK";
    const confirmed = window.confirm(`¿Confirma anular el comprobante ${voidTarget.entry_no}?\n\nEsta acción anula el comprobante contable asociado.`);
    if (!confirmed) return;

    try {
      setVoiding(true);
      const endpoint = isCheque ? `${CHECKS_URL}/${voidTarget.source_id}/void` : `${DEPOSITS_URL}/${voidTarget.source_id}/void`;
      await API.put(endpoint, { void_reason: voidReason || null });
      showAlert("Movimiento anulado", "success");
      setVoidTarget(null);
      setVoidReason("");
      fetchStatement();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al anular el movimiento");
    } finally {
      setVoiding(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <SwapHorizIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Movimientos Bancarios</Typography>
            <Typography variant="body2" color="text.secondary">
              Saldo, movimientos y registro de cheques/depósitos de una cuenta bancaria
            </Typography>
          </Box>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
          <TextField
            select size="small" label="Cuenta bancaria" value={bankAccountId}
            onChange={(e) => handleSelectAccount(e.target.value)}
            sx={{ width: 260 }}
          >
            {bankAccounts.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.account_alias}{b.status === "CERRADA" ? " (cerrada)" : ""}</MenuItem>
            ))}
          </TextField>

          <TextField
            size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }}
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setStatement(null); }}
            sx={{ width: 160 }}
          />

          <TextField
            size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }}
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setStatement(null); }}
            sx={{ width: 160 }}
          />

          <Button variant="outlined" onClick={fetchStatement} disabled={loading} sx={{ textTransform: "none" }}>
            {loading ? "Cargando..." : "Consultar"}
          </Button>

          <Box sx={{ flex: 1 }} />

          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTypePickerOpen(true)} sx={{ textTransform: "none" }}>
            Nuevo movimiento
          </Button>
          <Button variant="outlined" startIcon={<AccountBalanceIcon />} onClick={() => setBatchDisbursementOpen(true)} sx={{ textTransform: "none" }}>
            Desembolsar créditos
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchStatement} sx={{ textTransform: "none" }}>
            Actualizar
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />} disabled={!statement} onClick={handlePrint} sx={{ textTransform: "none" }}>
            Imprimir
          </Button>
        </Stack>

        {statement && (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2 }}>
            <Chip label={`Saldo inicial (${statement.start_date}): ${currencySymbol} ${money(statement.opening_balance)}`} />
            <Chip label={`Total débitos: ${currencySymbol} ${money(statement.total_debit)}`} color="success" variant="outlined" />
            <Chip label={`Total créditos: ${currencySymbol} ${money(statement.total_credit)}`} color="error" variant="outlined" />
            <Chip
              label={`Saldo actual (${statement.end_date}): ${currencySymbol} ${money(statement.closing_balance)}`}
              color={Number(statement.closing_balance) >= 0 ? "primary" : "error"}
            />
          </Stack>
        )}
      </Paper>

      {statement && (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB" }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            Movimientos — {statement.bank_account.bank_name} - {statement.bank_account.account_alias}
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Comprobante</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell align="right">Débito</TableCell>
                <TableCell align="right">Crédito</TableCell>
                <TableCell align="right">Saldo</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ "& td": { fontWeight: 700, bgcolor: "#F8FAFC" } }}>
                <TableCell>{statement.start_date}</TableCell>
                <TableCell />
                <TableCell />
                <TableCell>SALDO INICIAL</TableCell>
                <TableCell align="right" />
                <TableCell align="right" />
                <TableCell align="right">{money(statement.opening_balance)}</TableCell>
                <TableCell />
              </TableRow>
              {statement.movements.map((m, idx) => (
                <TableRow key={idx}>
                  <TableCell>{String(m.entry_date).slice(0, 10)}</TableCell>
                  <TableCell>{m.entry_no}</TableCell>
                  <TableCell>{SOURCE_LABELS[m.source_module] || m.source_module}</TableCell>
                  <TableCell>{m.description}</TableCell>
                  <TableCell align="right">{Number(m.debit) > 0 ? money(m.debit) : ""}</TableCell>
                  <TableCell align="right">{Number(m.credit) > 0 ? money(m.credit) : ""}</TableCell>
                  <TableCell align="right">{money(m.balance)}</TableCell>
                  <TableCell align="center">
                    {(m.source_type === "BANK_CHECK" || m.source_type === "BANK_DEPOSIT") && (
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" onClick={() => openDetail(m)}>
                            <ReceiptLongIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Anular">
                          <IconButton size="small" color="error" onClick={() => { setVoidTarget(m); setVoidReason(""); }}>
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {statement.movements.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center">Sin movimientos en el rango seleccionado</TableCell></TableRow>
              )}
              <TableRow sx={{ "& td": { fontWeight: 700, borderTop: "2px solid #333" } }}>
                <TableCell colSpan={4} align="right">Totales del período</TableCell>
                <TableCell align="right">{money(statement.total_debit)}</TableCell>
                <TableCell align="right">{money(statement.total_credit)}</TableCell>
                <TableCell align="right">{money(statement.closing_balance)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Selector de tipo al crear */}
      <Dialog open={typePickerOpen} onClose={() => setTypePickerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>¿Qué tipo de movimiento?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Button variant="outlined" size="large" startIcon={<ReceiptLongIcon />} sx={{ textTransform: "none", justifyContent: "flex-start", py: 1.5 }} onClick={pickCheque}>
              Cheque
            </Button>
            <Button variant="outlined" size="large" startIcon={<SavingsIcon />} sx={{ textTransform: "none", justifyContent: "flex-start", py: 1.5 }} onClick={pickDeposito}>
              Depósito
            </Button>
            <Button variant="outlined" size="large" startIcon={<SwapHorizIcon />} sx={{ textTransform: "none", justifyContent: "flex-start", py: 1.5 }} onClick={pickOtro}>
              Otro movimiento (entrada o salida)
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypePickerOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
        </DialogActions>
      </Dialog>

      <LoanBatchDisbursementDialog
        open={batchDisbursementOpen}
        onClose={() => setBatchDisbursementOpen(false)}
        onSuccess={() => {
          showAlert("Créditos desembolsados registrados correctamente.", "success");
          fetchStatement();
        }}
      />

      {/* ========== Diálogo CHEQUE — vista visual sin cambios ========== */}
      <Dialog open={checkDialogOpen} onClose={() => setCheckDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>Emitir cheque</DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: "#F1F5F9" }}>
          <Box sx={{
            position: "relative",
            bgcolor: "#fff",
            border: "1px solid #D8DEE9",
            borderRadius: 2,
            overflow: "hidden",
            p: 3,
            mb: 3,
          }}>
            <Box sx={{
              position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none",
              background: "repeating-linear-gradient(115deg, #0057B8 0px, #0057B8 2px, transparent 2px, transparent 14px)",
            }} />

            <Box sx={{ position: "relative" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
                  {selectedCheckBankAccount?.logo_url && (
                    <Box
                      component="img"
                      src={selectedCheckBankAccount.logo_url}
                      alt={selectedCheckBankAccount.account_alias}
                      sx={{ height: 40, maxWidth: 90, objectFit: "contain", flexShrink: 0, mt: 0.25 }}
                    />
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                      {tenant?.legal_name || tenant?.commercial_name || "CrediMaster"}
                    </Typography>
                    {tenant?.address && <Typography variant="caption" display="block" color="text.secondary">{tenant.address}</Typography>}
                    {tenant?.phone && <Typography variant="caption" display="block" color="text.secondary">Tel: {tenant.phone}</Typography>}
                    <TextField
                      select variant="standard" size="small" value={checkForm.bank_account_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const acc = bankAccounts.find((b) => b.id === id);
                        setCheckForm((f) => ({
                          ...f,
                          bank_account_id: id,
                          check_number: f.check_number || acc?.next_check_number || f.check_number,
                        }));
                      }}
                      sx={{ mt: 0.5, minWidth: 200 }}
                      SelectProps={{ displayEmpty: true }}
                    >
                      <MenuItem value="" disabled>Elija cuenta bancaria</MenuItem>
                      {bankAccounts.map((b) => <MenuItem key={b.id} value={b.id}>{b.account_alias}</MenuItem>)}
                    </TextField>
                  </Box>
                </Stack>

                <Box sx={{ textAlign: "center", flexShrink: 0 }}>
                  <TextField
                    variant="standard" size="small" type="date"
                    value={checkForm.issue_date}
                    onChange={(e) => setCheckForm((f) => ({ ...f, issue_date: e.target.value }))}
                    sx={{ width: 150 }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block">FECHA</Typography>
                </Box>

                <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                  <Typography variant="caption" color="text.secondary" display="block">N°</Typography>
                  <TextField
                    variant="standard" size="small"
                    value={checkForm.check_number}
                    onChange={(e) => setCheckForm((f) => ({ ...f, check_number: e.target.value }))}
                    inputProps={{ style: { textAlign: "right", fontWeight: 800, fontFamily: "monospace", fontSize: "1.1rem" } }}
                    sx={{ width: 130 }}
                  />
                </Box>
              </Stack>

              <Stack direction="row" alignItems="flex-end" spacing={2} sx={{ mb: 2 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">PÁGUESE A LA ORDEN DE</Typography>
                  <Autocomplete
                    size="small"
                    freeSolo
                    options={vendors}
                    getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
                    value={checkForm.vendor}
                    onChange={(_, value) => {
                      if (typeof value === "string") {
                        setCheckForm((f) => ({ ...f, vendor: null, beneficiary_name: value }));
                      } else {
                        setCheckForm((f) => ({ ...f, vendor: value, beneficiary_name: value?.name || f.beneficiary_name }));
                      }
                    }}
                    onInputChange={(_, value, reason) => {
                      if (reason === "input") setCheckForm((f) => ({ ...f, beneficiary_name: value }));
                    }}
                    inputValue={checkForm.beneficiary_name}
                    renderInput={(params) => <TextField {...params} variant="standard" placeholder="Nombre del beneficiario" />}
                  />
                </Box>
                <Box sx={{ width: 190, flexShrink: 0 }}>
                  <Typography variant="caption" color="text.secondary">{selectedCheckBankAccount?.currency_symbol || "C$"}</Typography>
                  <Box sx={{ border: "1px solid #333", borderRadius: 1, px: 1.5, py: 0.75, textAlign: "right" }}>
                    <Typography variant="body1" fontWeight={800} color={checkNetAmount > 0 ? "text.primary" : "error"}>{money(checkNetAmount)}</Typography>
                  </Box>
                </Box>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1} sx={{ borderBottom: "1px solid #333", pb: 0.5, mb: 2.5 }}>
                <Typography variant="body2" noWrap sx={{ flex: 1, textTransform: "uppercase", fontStyle: "italic", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {numberToWords(checkNetAmount)} {selectedCheckBankAccount?.currency_name || "CÓRDOBAS"}
                </Typography>
                <LockIcon fontSize="small" sx={{ color: "text.disabled", flexShrink: 0 }} />
              </Stack>

              <Box>
                <Typography variant="caption" color="text.secondary">CONCEPTO</Typography>
                <TextField
                  fullWidth variant="standard"
                  value={checkForm.concept}
                  onChange={(e) => setCheckForm((f) => ({ ...f, concept: e.target.value }))}
                  placeholder="Concepto del pago"
                />
              </Box>
            </Box>
          </Box>

          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Líneas (gasto, retención, etc. — el banco se acredita automático por el neto)
          </Typography>

          {checkForm.lines.map((line, index) => (
            <Box key={index} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 110px 110px 40px" }, gap: 1, mb: 1, alignItems: "center" }}>
              <Autocomplete
                size="small"
                options={accounts}
                value={line.account}
                getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                onChange={(_, value) => updateCheckLine(index, "account", value)}
                renderInput={(params) => <TextField {...params} label="Cuenta" />}
              />
              <TextField
                size="small" label="Detalle"
                value={line.description}
                onChange={(e) => updateCheckLine(index, "description", e.target.value)}
              />
              <TextField
                size="small" type="number" label="Débito"
                value={line.debit}
                onChange={(e) => updateCheckLine(index, "debit", e.target.value)}
              />
              <TextField
                size="small" type="number" label="Crédito"
                value={line.credit}
                onChange={(e) => updateCheckLine(index, "credit", e.target.value)}
              />
              <IconButton size="small" onClick={() => removeCheckLine(index)} disabled={checkForm.lines.length === 1}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}

          <Button size="small" onClick={addCheckLine} sx={{ textTransform: "none", mt: 0.5 }}>+ Agregar línea</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCheck} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Emitiendo..." : "Emitir cheque"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========== Diálogo DEPÓSITO / OTRO MOVIMIENTO ========== */}
      <Dialog open={movementDialogOpen} onClose={() => setMovementDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isMovementIngreso ? "Registrar depósito" : "Registrar egreso bancario"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <ToggleButtonGroup
                exclusive size="small" value={movementForm.movement_type}
                onChange={(_, value) => value && setMovementForm((f) => ({ ...f, movement_type: value, collector: value === "EGRESO" ? null : f.collector }))}
              >
                <ToggleButton value="INGRESO" color="success" sx={{ textTransform: "none", px: 3 }}>Depósito (entrada)</ToggleButton>
                <ToggleButton value="EGRESO" color="error" sx={{ textTransform: "none", px: 3 }}>Otro egreso (salida)</ToggleButton>
              </ToggleButtonGroup>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth size="small" label="Cuenta bancaria"
                value={movementForm.bank_account_id}
                onChange={(e) => setMovementForm((f) => ({ ...f, bank_account_id: e.target.value }))}
              >
                {bankAccounts.map((b) => <MenuItem key={b.id} value={b.id}>{b.account_alias}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" type="date" label="Fecha" InputLabelProps={{ shrink: true }}
                value={movementForm.deposit_date}
                onChange={(e) => setMovementForm((f) => ({ ...f, deposit_date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Descripción / origen"
                value={movementForm.description}
                onChange={(e) => setMovementForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={isMovementIngreso ? "Ej: Depósito de ventas del día" : "Ej: Comisión bancaria"}
              />
            </Grid>

            {isMovementIngreso && (
              <Grid item xs={12}>
                <Autocomplete
                  size="small"
                  options={collectors}
                  value={movementForm.collector}
                  getOptionLabel={(o) => `${o.name}${o.branch_name ? ` — ${o.branch_name}` : ""}`}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  onChange={(_, value) => handleSelectCollector(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Cobrador (opcional — si el efectivo viene de un cobrador)"
                      helperText={
                        movementForm.collector
                          ? collectorCustody !== null
                            ? `Custodia disponible: C$ ${money(collectorCustody)}`
                            : "Calculando custodia disponible..."
                          : "Deje vacío si el origen del depósito no es efectivo de un cobrador"
                      }
                    />
                  )}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                Líneas ({isMovementIngreso ? "origen del ingreso" : "gasto/destino del egreso"} — el banco se {isMovementIngreso ? "debita" : "acredita"} automático por el neto)
              </Typography>

              {movementForm.lines.map((line, index) => (
                <Box key={index} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 110px 110px 40px" }, gap: 1, mb: 1, alignItems: "center" }}>
                  <Autocomplete
                    size="small"
                    options={accounts}
                    value={line.account}
                    getOptionLabel={(o) => `${o.muc_code} - ${o.account_name}`}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    onChange={(_, value) => updateMovementLine(index, "account", value)}
                    renderInput={(params) => <TextField {...params} label="Cuenta" />}
                  />
                  <TextField
                    size="small" label="Detalle"
                    value={line.description}
                    onChange={(e) => updateMovementLine(index, "description", e.target.value)}
                  />
                  <TextField
                    size="small" type="number" label="Débito"
                    value={line.debit}
                    onChange={(e) => updateMovementLine(index, "debit", e.target.value)}
                  />
                  <TextField
                    size="small" type="number" label="Crédito"
                    value={line.credit}
                    onChange={(e) => updateMovementLine(index, "credit", e.target.value)}
                  />
                  <IconButton size="small" onClick={() => removeMovementLine(index)} disabled={movementForm.lines.length === 1}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}

              <Button size="small" onClick={addMovementLine} sx={{ textTransform: "none", mt: 0.5 }}>+ Agregar línea</Button>

              <Box sx={{ mt: 2 }}>
                <Chip
                  color={movementNetAmount > 0 ? (isMovementIngreso ? "success" : "error") : "default"}
                  label={`Monto del ${isMovementIngreso ? "depósito" : "egreso"} (neto): C$ ${money(movementNetAmount)}`}
                />
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovementDialogOpen(false)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveMovement} disabled={saving} sx={{ textTransform: "none" }}>
            {saving ? "Guardando..." : `Registrar ${isMovementIngreso ? "depósito" : "egreso"}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========== ANULAR ========== */}
      <Dialog open={Boolean(voidTarget)} onClose={() => setVoidTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Anular movimiento</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth size="small" label="Motivo de anulación (opcional)" multiline minRows={2} sx={{ mt: 1 }}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidTarget(null)} sx={{ textTransform: "none" }}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmVoid} disabled={voiding} sx={{ textTransform: "none" }}>
            {voiding ? "Anulando..." : "Anular"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========== DETALLE CHEQUE — vista visual sin cambios ========== */}
      <Dialog open={Boolean(checkDetail)} onClose={() => setCheckDetail(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {checkDetail?.check && (
          <DialogContent sx={{ p: 3, bgcolor: "#F1F5F9" }}>
            <Box sx={{
              position: "relative",
              bgcolor: "#fff",
              border: "1px solid #D8DEE9",
              borderRadius: 2,
              overflow: "hidden",
              p: 3,
              mb: 3,
              minWidth: 0,
            }}>
              <Box sx={{
                position: "absolute", inset: 0, opacity: 0.05, pointerEvents: "none",
                background: "repeating-linear-gradient(115deg, #0057B8 0px, #0057B8 2px, transparent 2px, transparent 14px)",
              }} />

              <Box sx={{ position: "relative" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0 }}>
                    {checkDetail.check.bank_logo_url && (
                      <Box
                        component="img"
                        src={checkDetail.check.bank_logo_url}
                        alt={checkDetail.check.bank_account_alias}
                        sx={{ height: 40, maxWidth: 90, objectFit: "contain", flexShrink: 0, mt: 0.25 }}
                      />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.2 }}>
                        {tenant?.legal_name || tenant?.commercial_name || "CrediMaster"}
                      </Typography>
                      {tenant?.address && <Typography variant="caption" display="block" color="text.secondary">{tenant.address}</Typography>}
                      {tenant?.phone && <Typography variant="caption" display="block" color="text.secondary">Tel: {tenant.phone}</Typography>}
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>{checkDetail.check.bank_account_alias}</Typography>
                    </Box>
                  </Stack>

                  <Box sx={{ textAlign: "center", flexShrink: 0 }}>
                    <Typography variant="body2" sx={{ borderBottom: "1px solid #333", pb: 0.5, px: 2, whiteSpace: "nowrap" }}>
                      {String(checkDetail.check.issue_date).slice(0, 10)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">FECHA</Typography>
                  </Box>

                  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                    <Chip size="small" label={CHECK_STATUS_CHIP[checkDetail.check.status]?.label || checkDetail.check.status} color={CHECK_STATUS_CHIP[checkDetail.check.status]?.color || "default"} sx={{ mb: 1 }} />
                    <Typography variant="h5" fontWeight={800} sx={{ fontFamily: "monospace", letterSpacing: 1, whiteSpace: "nowrap" }}>
                      N° {checkDetail.check.check_number}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" alignItems="flex-end" spacing={2} sx={{ mb: 2 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">PÁGUESE A LA ORDEN DE</Typography>
                    <Typography variant="body1" fontWeight={700} noWrap sx={{ borderBottom: "1px solid #333", pb: 0.5 }}>
                      {checkDetail.check.beneficiary_name}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 190, flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary">{checkDetail.check.currency_symbol || "C$"}</Typography>
                    <Box sx={{ border: "1px solid #333", borderRadius: 1, px: 1.5, py: 0.75, textAlign: "right" }}>
                      <Typography variant="body1" fontWeight={800}>{money(checkDetail.check.amount)}</Typography>
                    </Box>
                  </Box>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={1} sx={{ borderBottom: "1px solid #333", pb: 0.5, mb: 2.5 }}>
                  <Typography variant="body2" noWrap sx={{ flex: 1, textTransform: "uppercase", fontStyle: "italic", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {numberToWords(checkDetail.check.amount)} {checkDetail.check.currency_name || "CÓRDOBAS"}
                  </Typography>
                  <LockIcon fontSize="small" sx={{ color: "text.disabled", flexShrink: 0 }} />
                </Stack>

                <Stack direction="row" spacing={4} alignItems="flex-end" sx={{ mb: 2.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">CONCEPTO</Typography>
                    <Typography variant="body2" noWrap sx={{ borderBottom: "1px solid #333", pb: 0.5 }}>
                      {checkDetail.check.concept}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontFamily: "monospace", letterSpacing: 3, color: "text.disabled", flexShrink: 0, whiteSpace: "nowrap" }}>
                    ⑆{String(checkDetail.check.bank_account_id).padStart(10, "0")}⑆ {String(checkDetail.check.check_number).padStart(6, "0")}⑈
                  </Typography>
                </Stack>
              </Box>
            </Box>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Partidas contables — {checkDetail.check.entry_no}</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cuenta</TableCell>
                  <TableCell>Detalle</TableCell>
                  <TableCell align="right">Débito</TableCell>
                  <TableCell align="right">Crédito</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {checkDetail.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.muc_code} - {l.account_name}</TableCell>
                    <TableCell>{l.description}</TableCell>
                    <TableCell align="right">{Number(l.debit) > 0 ? money(l.debit) : ""}</TableCell>
                    <TableCell align="right">{Number(l.credit) > 0 ? money(l.credit) : ""}</TableCell>
                  </TableRow>
                ))}
                {!detailLoading && checkDetail.lines.length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center">Sin líneas</TableCell></TableRow>
                )}
                <TableRow sx={{ "& td": { borderBottom: "none" } }}>
                  <TableCell colSpan={2}><Typography variant="body2" color="text.secondary">Banco — {checkDetail.check.bank_account_alias} (crédito automático)</Typography></TableCell>
                  <TableCell />
                  <TableCell align="right">{money(checkDetail.check.amount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {checkDetail.check.status === "ANULADO" && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Cheque anulado{checkDetail.check.void_reason ? `: ${checkDetail.check.void_reason}` : ""}
              </Alert>
            )}
            {checkDetail.check.status === "COBRADO" && checkDetail.check.cleared_date && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Cobrado el {String(checkDetail.check.cleared_date).slice(0, 10)}
              </Alert>
            )}
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setCheckDetail(null)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ========== DETALLE DEPÓSITO / OTRO ========== */}
      <Dialog open={Boolean(depositDetail)} onClose={() => setDepositDetail(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
        {depositDetail?.deposit && (
          <>
            <Box sx={{ bgcolor: depositDetail.deposit.movement_type === "EGRESO" ? "#C62828" : "#0057B8", color: "#fff", p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <SavingsIcon sx={{ fontSize: 32, opacity: 0.9 }} />
                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.85, lineHeight: 1 }}>
                      Comprobante de {depositDetail.deposit.movement_type === "EGRESO" ? "Egreso Bancario" : "Depósito"}
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>#{depositDetail.deposit.id}</Typography>
                  </Box>
                </Stack>
                <Chip
                  label={DEPOSIT_STATUS_CHIP[depositDetail.deposit.status]?.label || depositDetail.deposit.status}
                  sx={{ bgcolor: "rgba(255,255,255,.22)", color: "#fff", fontWeight: 700 }}
                />
              </Stack>
            </Box>

            <DialogContent sx={{ p: 3 }}>
              <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Fecha</Typography>
                  <Typography variant="body1" fontWeight={700}>{String(depositDetail.deposit.deposit_date).slice(0, 10)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Cuenta bancaria</Typography>
                  <Typography variant="body1" fontWeight={700}>{depositDetail.deposit.bank_account_alias}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Descripción / origen</Typography>
                  <Typography variant="body2">{depositDetail.deposit.description}</Typography>
                </Grid>
                {depositDetail.deposit.collector_name && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Cobrador</Typography>
                    <Typography variant="body2">{depositDetail.deposit.collector_name}</Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Comprobante contable</Typography>
                  <Typography variant="body2">{depositDetail.deposit.entry_no}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Partidas contables</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cuenta</TableCell>
                    <TableCell>Detalle</TableCell>
                    <TableCell align="right">Débito</TableCell>
                    <TableCell align="right">Crédito</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {depositDetail.deposit.movement_type !== "EGRESO" && (
                    <TableRow sx={{ "& td": { borderBottom: "none" } }}>
                      <TableCell colSpan={2}><Typography variant="body2" color="text.secondary">Banco — {depositDetail.deposit.bank_account_alias} (débito automático)</Typography></TableCell>
                      <TableCell align="right">{money(depositDetail.deposit.amount)}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                  {depositDetail.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.muc_code} - {l.account_name}</TableCell>
                      <TableCell>{l.description}</TableCell>
                      <TableCell align="right">{Number(l.debit) > 0 ? money(l.debit) : ""}</TableCell>
                      <TableCell align="right">{Number(l.credit) > 0 ? money(l.credit) : ""}</TableCell>
                    </TableRow>
                  ))}
                  {depositDetail.deposit.movement_type === "EGRESO" && (
                    <TableRow sx={{ "& td": { borderBottom: "none" } }}>
                      <TableCell colSpan={2}><Typography variant="body2" color="text.secondary">Banco — {depositDetail.deposit.bank_account_alias} (crédito automático)</Typography></TableCell>
                      <TableCell />
                      <TableCell align="right">{money(depositDetail.deposit.amount)}</TableCell>
                    </TableRow>
                  )}
                  {!detailLoading && depositDetail.lines.length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center">Sin líneas</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2, pt: 2, borderTop: "2px solid #0057B8" }}>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" color="text.secondary">Monto del movimiento</Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ color: "#0057B8" }}>C$ {money(depositDetail.deposit.amount)}</Typography>
                </Box>
              </Box>

              {depositDetail.deposit.status === "ANULADO" && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Movimiento anulado{depositDetail.deposit.void_reason ? `: ${depositDetail.deposit.void_reason}` : ""}
                </Alert>
              )}
              {depositDetail.deposit.status === "ACREDITADO" && depositDetail.deposit.cleared_date && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Acreditado el {String(depositDetail.deposit.cleared_date).slice(0, 10)}
                </Alert>
              )}
            </DialogContent>
          </>
        )}
        <DialogActions>
          <Button onClick={() => setDepositDetail(null)} sx={{ textTransform: "none" }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
