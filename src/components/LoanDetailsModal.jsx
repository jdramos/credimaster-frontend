import React, { useEffect, useMemo, useState, useContext } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  Button,
  Typography,
  Grid,
  CircularProgress,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Alert,
  Tooltip,
  IconButton,
  TextField,
  Divider,
  Chip,
  Stack,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import dayjs from "dayjs";
import API from "../api";
import { UserContext } from "../contexts/UserContext";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CancelIcon from "@mui/icons-material/Cancel";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import EventIcon from "@mui/icons-material/Event";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import PersonIcon from "@mui/icons-material/Person";
import GavelIcon from "@mui/icons-material/Gavel";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import DescriptionIcon from "@mui/icons-material/Description";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import SavingsIcon from "@mui/icons-material/Savings";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ScoreIcon from "@mui/icons-material/Score";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CommentIcon from "@mui/icons-material/Comment";
import LoanAmortization from "./LoanAmortization";
import { NumericFormat } from "react-number-format";
import GuarenteesGet from "./GuarenteesGet";
import today from "../functions/today";
import LoanInfo from "./LoanInfo";
import LoanDocuments from "./Loan/LoanDocuments";
import CustomerFinancialEvaluationTab from "./Customer/CustomerFinancialEvaluationTab";
import LoanModificationSection from "./Loan/LoanModificationSection";

const urlGuarantee = process.env.REACT_APP_API_BASE_URL + "/api/guarantees";

const HeaderBar = styled("div")(({ theme }) => ({
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}));

const HeaderLeft = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

const Muted = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  letterSpacing: 0.2,
  marginBottom: theme.spacing(1),
}));

const formatMoney = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const Pill = ({ status }) => {
  const s = String(status || "").toUpperCase();

  if (s === "APPROVED") {
    return (
      <Chip
        icon={<CheckCircleIcon fontSize="small" />}
        label="Aprobado"
        color="success"
        size="small"
        variant="filled"
      />
    );
  }

  if (s === "REJECTED") {
    return (
      <Chip
        icon={<CancelIcon fontSize="small" />}
        label="Rechazado"
        color="error"
        size="small"
        variant="filled"
      />
    );
  }

  return (
    <Chip
      icon={<HourglassEmptyIcon fontSize="small" />}
      label="Pendiente"
      color="warning"
      size="small"
      variant="filled"
    />
  );
};

const ComplianceChip = ({ ok, label, icon }) => (
  <Chip
    icon={ok ? <CheckCircleIcon /> : icon || <CancelIcon />}
    label={label}
    color={ok ? "success" : "error"}
    variant={ok ? "filled" : "outlined"}
    sx={{
      width: "100%",
      justifyContent: "flex-start",
      "& .MuiChip-label": {
        width: "100%",
        textAlign: "left",
      },
    }}
  />
);

const LoanDetailsModal = ({
  open,
  onClose,
  loan,
  guarantees = [],
  loading,
  clientId,
  clientIdentification,
  onLoanUpdated,
}) => {
  const { user } = useContext(UserContext);

  const [approvals, setApprovals] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState(null);

  const [amortizationTable, setAmortizationTable] = useState([]);
  const [totalPaymentAmount, setTotalPaymentAmount] = useState(0);
  const [totalPrincipal, setTotalPrincipal] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalFee, setTotalFee] = useState(0);
  const [totalInsurance, setTotalInsurance] = useState(0);
  const [totalOtherCharges, setTotalOtherCharges] = useState(0);
  const [showAmortization, setShowAmortization] = useState(false);

  const [editableAmount, setEditableAmount] = useState(0);
  const [editableTerm, setEditableTerm] = useState(0);
  const [editableRate, setEditableRate] = useState(0);
  const [amountError, setAmountError] = useState("");
  const [termError, setTermError] = useState("");
  const [rateError, setRateError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [compliance, setCompliance] = useState(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

  const totalGuaranteeValue = useMemo(
    () => guarantees.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
    [guarantees],
  );

  const loadApprovals = async () => {
    if (!loan?.id) return;

    setLoadingApprovals(true);
    try {
      const res = await API.get(`api/approvals/${loan.id}`);
      setApprovals(res.data || []);
    } catch (err) {
      console.error("Error cargando aprobaciones:", err);
      setApprovals([]);
    } finally {
      setLoadingApprovals(false);
    }
  };

  const loadCompliance = async () => {
    if (!loan?.id) return;

    setLoadingCompliance(true);
    try {
      const res = await API.get(`/api/loans/compliance/${loan.id}`);
      setCompliance(res.data || null);
    } catch (err) {
      console.error("Error cargando cumplimiento:", err);
      setCompliance(null);
    } finally {
      setLoadingCompliance(false);
    }
  };

  const fetchAmortizationTable = async () => {
    if (!loan?.id) return;

    try {
      const res = await API.get(`api/loans/amortization/${loan.id}`);
      const raw = res.data || [];

      const data = raw.map((row) => ({
        paymentNumber: Number(row.payment_number),
        paymentDate: row.payment_date,
        principal: Number(row.payment_principal),
        interest: Number(row.payment_interest),
        insuranceByPayment: Number(row.payment_insurance),
        feeByPayment: Number(row.payment_fee),
        otherChargesByPayment: Number(row.payment_other_charges),
        paymentAmount:
          Number(row.payment_principal ?? 0) +
          Number(row.payment_interest ?? 0) +
          Number(row.payment_fee ?? 0) +
          Number(row.payment_insurance ?? 0) +
          Number(row.payment_other_charges ?? 0),
        status: row.status,
        remainingBalance: Number(row.remaining_balance),
      }));

      setAmortizationTable(data);

      const totals = data.reduce(
        (acc, item) => {
          acc.totalPaymentAmount += item.paymentAmount || 0;
          acc.totalPrincipal += item.principal || 0;
          acc.totalInterest += item.interest || 0;
          acc.totalFee += item.feeByPayment || 0;
          acc.totalInsurance += item.insuranceByPayment || 0;
          acc.totalOtherCharges += item.otherChargesByPayment || 0;
          return acc;
        },
        {
          totalPaymentAmount: 0,
          totalPrincipal: 0,
          totalInterest: 0,
          totalFee: 0,
          totalInsurance: 0,
          totalOtherCharges: 0,
        },
      );

      setTotalPaymentAmount(totals.totalPaymentAmount);
      setTotalPrincipal(totals.totalPrincipal);
      setTotalInterest(totals.totalInterest);
      setTotalFee(totals.totalFee);
      setTotalInsurance(totals.totalInsurance);
      setTotalOtherCharges(totals.totalOtherCharges);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || "Error cargando amortización",
        severity: "error",
      });
    }
  };

  const hasUserApproved = approvals.some(
    (a) => Number(a.approver_id) === Number(user) && a.status === "APPROVED",
  );

  const isReadOnly =
    approvals.length > 0 &&
    (approvals.every((a) => a.status === "APPROVED") || hasUserApproved);

  const canEditFinancialEvaluation = useMemo(() => {
    return approvals.some(
      (a) => Number(a.approver_id) === Number(user) && a.status === "PENDING",
    );
  }, [approvals, user]);

  useEffect(() => {
    if (open && loan) {
      loadApprovals();
      fetchAmortizationTable();
      loadCompliance();

      setEditableAmount(Number(loan.amount) || 0);
      setEditableTerm(Number(loan.term) || 0);
      setEditableRate(Number(loan.interest_rate) || 0);

      setAmountError("");
      setTermError("");
      setRateError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loan?.id]);

  const isFormValid = () => {
    let valid = true;

    if (editableAmount <= 0) {
      setAmountError("Debe ser mayor a 0");
      valid = false;
    } else if (
      editableAmount > totalGuaranteeValue &&
      totalGuaranteeValue > 0
    ) {
      setAmountError("No debe exceder el valor total de garantías");
      valid = false;
    } else {
      setAmountError("");
    }

    if (editableTerm <= 0) {
      setTermError("Debe ser mayor a 0");
      valid = false;
    } else {
      setTermError("");
    }

    if (editableRate <= 0) {
      setRateError("Debe ser mayor a 0");
      valid = false;
    } else if (editableRate > 100) {
      setRateError("No debe ser mayor al 100%");
      valid = false;
    } else {
      setRateError("");
    }

    return valid;
  };

  const isFormConsistentlyValid =
    editableAmount > 0 &&
    (totalGuaranteeValue <= 0 || editableAmount <= totalGuaranteeValue) &&
    editableTerm > 0 &&
    editableRate > 0 &&
    editableRate <= 100;

  const isComplianceValid = useMemo(() => {
    if (!compliance) return false;

    return (
      Boolean(compliance.evaluation_completed) &&
      Boolean(compliance.central_risk_checked) &&
      Boolean(compliance.documents_complete) &&
      Boolean(compliance.guarantees_valid) &&
      Boolean(compliance.payment_capacity_valid) &&
      Boolean(compliance.loan_purpose_defined) &&
      Boolean(compliance.recommendation_valid) &&
      Boolean(compliance.references_valid) &&
      Boolean(compliance.bureau_acceptable) &&
      Boolean(compliance.score_valid)
    );
  }, [compliance]);

  const complianceMissingItems = useMemo(() => {
    if (!compliance?.summary?.missing_items) return [];
    return compliance.summary.missing_items;
  }, [compliance]);

  const refreshApprovalState = async () => {
    const resApprovals = await API.get(`/api/approvals/${loan.id}`);
    const approvalsNow = resApprovals.data || [];
    setApprovals(approvalsNow);

    const pendingCount = approvalsNow.filter(
      (a) => a.status === "PENDING",
    ).length;
    const anyRejected = approvalsNow.some((a) => a.status === "REJECTED");
    const allApproved =
      approvalsNow.length > 0 &&
      approvalsNow.every((a) => a.status === "APPROVED");

    let approval_status = "PENDIENTE";
    if (anyRejected) approval_status = "RECHAZADO";
    else if (allApproved) approval_status = "APROBADO";

    onLoanUpdated?.({
      id: loan.id,
      approval_status,
      pending_approvals: pendingCount,
    });

    return approvalsNow;
  };

  const handleApprove = async (approvalId) => {
    if (!isComplianceValid) {
      setSnackbar({
        open: true,
        message:
          "No se puede aprobar. El expediente no cumple con todos los requisitos CONAMI.",
        severity: "error",
      });
      return;
    }

    setActionLoading(true);
    try {
      await API.put(`/api/approvals/${approvalId}`, {
        status: "APPROVED",
        amount: editableAmount,
        term: editableTerm,
        interest_rate: editableRate,
        date: today(),
      });

      await refreshApprovalState();

      setSnackbar({
        open: true,
        message: "Aprobación registrada correctamente.",
        severity: "success",
      });

      onClose();
    } catch (error) {
      console.error(error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || "Error al aprobar.",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (approvalId) => {
    setActionLoading(true);
    try {
      await API.put(`/api/approvals/${approvalId}`, { status: "REJECTED" });

      const approvalsNow = await refreshApprovalState();
      const pendingCount = approvalsNow.filter(
        (a) => a.status === "PENDING",
      ).length;

      onLoanUpdated?.({
        id: loan.id,
        approval_status: "RECHAZADO",
        pending_approvals: pendingCount,
      });

      setSnackbar({
        open: true,
        message: "Rechazo registrado.",
        severity: "info",
      });
    } catch (error) {
      console.error(error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || "Error al rechazar.",
        severity: "error",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleAmortization = () => setShowAmortization((p) => !p);

  const pendingCountUI = approvals.filter((a) => a.status === "PENDING").length;
  const anyRejectedUI = approvals.some((a) => a.status === "REJECTED");
  const allApprovedUI =
    approvals.length > 0 && approvals.every((a) => a.status === "APPROVED");

  const globalStatusUI = anyRejectedUI
    ? "RECHAZADO"
    : allApprovedUI
      ? "APROBADO"
      : "PENDIENTE";

  const financialEvaluation = compliance?.financial_evaluation || null;

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <HeaderBar>
          <HeaderLeft>
            <Avatar sx={{ bgcolor: "rgba(255,255,255,0.15)" }}>
              <AccountBalanceIcon />
            </Avatar>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ opacity: 0.9, lineHeight: 1.1 }}
              >
                Gestión de Crédito
              </Typography>
              <Typography
                variant="h6"
                sx={{ fontWeight: 800, lineHeight: 1.1 }}
              >
                Detalle de Préstamo
              </Typography>
            </Box>
          </HeaderLeft>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`Crédito #${loan?.id ?? ""}`}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.18)",
                color: "white",
                fontWeight: 700,
              }}
            />
          </Stack>
        </HeaderBar>

        {actionLoading && <LinearProgress />}

        <DialogContent sx={{ bgcolor: (t) => t.palette.grey[50] }}>
          {loading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              height={160}
            >
              <CircularProgress />
            </Box>
          ) : !loan ? (
            <Alert severity="error">
              Error al cargar los detalles del préstamo.
            </Alert>
          ) : (
            <>
              <Card
                elevation={0}
                sx={{ mb: 2, border: "1px solid", borderColor: "divider" }}
              >
                <CardContent sx={{ py: 1.5 }}>
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    alignItems={{ md: "center" }}
                    justifyContent="space-between"
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                    >
                      <Chip
                        icon={<MonetizationOnIcon fontSize="small" />}
                        label={`Monto: C$ ${formatMoney(editableAmount)}`}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        icon={<EventIcon fontSize="small" />}
                        label={`Solicitud: ${dayjs(loan.date).format("DD/MM/YYYY")}`}
                        variant="outlined"
                        size="small"
                      />
                      <Chip
                        icon={<GavelIcon fontSize="small" />}
                        label={
                          globalStatusUI === "PENDIENTE" && pendingCountUI > 0
                            ? `Pendiente (${pendingCountUI})`
                            : globalStatusUI
                        }
                        color={
                          globalStatusUI === "APROBADO"
                            ? "success"
                            : globalStatusUI === "RECHAZADO"
                              ? "error"
                              : "warning"
                        }
                        size="small"
                      />
                      <Chip
                        icon={
                          isComplianceValid ? (
                            <VerifiedUserIcon fontSize="small" />
                          ) : (
                            <WarningAmberIcon fontSize="small" />
                          )
                        }
                        label={
                          isComplianceValid
                            ? "Cumplimiento CONAMI OK"
                            : "Cumplimiento CONAMI pendiente"
                        }
                        color={isComplianceValid ? "success" : "warning"}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>

                    <Muted variant="body2">
                      {loan.branch_name
                        ? `Sucursal: ${loan.branch_name}`
                        : "Sucursal no asignada"}
                    </Muted>
                  </Stack>
                </CardContent>
              </Card>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card
                    elevation={0}
                    sx={{ border: "1px solid", borderColor: "divider" }}
                  >
                    <CardContent>
                      <SectionTitle variant="subtitle1">Solicitud</SectionTitle>
                      <Grid container spacing={1.25}>
                        <Grid item xs={12} sm={6}>
                          <Muted variant="caption">Cliente</Muted>
                          <Typography sx={{ fontWeight: 700 }}>
                            {loan.customer_name}
                          </Typography>
                          <Muted variant="body2">
                            {loan.customer_identification}
                          </Muted>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Muted variant="caption">Sucursal / Promotor</Muted>
                          <Typography sx={{ fontWeight: 700 }}>
                            {loan.branch_id ?? "N/A"} -{" "}
                            {loan.branch_name ?? "No asignado"}
                          </Typography>
                          <Muted variant="body2">
                            {loan.promoter_id ?? "N/A"} -{" "}
                            {loan.promoter_name ?? "No asignado"}
                          </Muted>
                        </Grid>

                        <Grid item xs={12}>
                          <Divider sx={{ my: 1.5 }} />
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: "primary.light",
                              }}
                            >
                              <PersonIcon fontSize="small" />
                            </Avatar>
                            <Typography sx={{ fontWeight: 700 }}>
                              Información del cliente
                            </Typography>
                          </Stack>
                          <Box sx={{ mt: 1 }}>
                            <LoanInfo clientId={clientId} />
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card
                    elevation={0}
                    sx={{ border: "1px solid", borderColor: "divider" }}
                  >
                    <CardContent>
                      <SectionTitle variant="subtitle1">
                        Condiciones
                      </SectionTitle>

                      <Grid container spacing={1.25} alignItems="center">
                        <Grid item xs={12} sm={4}>
                          <Muted variant="caption">Monto solicitado (C$)</Muted>
                        </Grid>
                        <Grid item xs={12} sm={8}>
                          {isReadOnly ? (
                            <Typography sx={{ fontWeight: 800 }}>
                              C$ {formatMoney(editableAmount)}
                            </Typography>
                          ) : (
                            <NumericFormat
                              customInput={TextField}
                              value={editableAmount}
                              thousandSeparator=","
                              decimalScale={2}
                              fixedDecimalScale
                              allowNegative={false}
                              onValueChange={(values) =>
                                setEditableAmount(Number(values.value))
                              }
                              size="small"
                              fullWidth
                              error={!!amountError}
                              helperText={amountError}
                            />
                          )}
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <Muted variant="caption">Plazo (meses)</Muted>
                        </Grid>
                        <Grid item xs={12} sm={8}>
                          {isReadOnly ? (
                            <Typography sx={{ fontWeight: 700 }}>
                              {editableTerm}
                            </Typography>
                          ) : (
                            <NumericFormat
                              customInput={TextField}
                              value={editableTerm}
                              decimalScale={0}
                              allowNegative={false}
                              onValueChange={(values) =>
                                setEditableTerm(Number(values.value))
                              }
                              size="small"
                              fullWidth
                              error={!!termError}
                              helperText={termError}
                            />
                          )}
                        </Grid>

                        <Grid item xs={12} sm={4}>
                          <Muted variant="caption">Tasa (%)</Muted>
                        </Grid>
                        <Grid item xs={12} sm={8}>
                          {isReadOnly ? (
                            <Typography sx={{ fontWeight: 700 }}>
                              {Number(editableRate).toFixed(2)}%
                            </Typography>
                          ) : (
                            <NumericFormat
                              customInput={TextField}
                              value={editableRate}
                              decimalScale={2}
                              fixedDecimalScale
                              allowNegative={false}
                              onValueChange={(values) =>
                                setEditableRate(Number(values.value))
                              }
                              size="small"
                              fullWidth
                              error={!!rateError}
                              helperText={rateError}
                            />
                          )}
                        </Grid>

                        <Grid item xs={12}>
                          <Divider sx={{ my: 1.5 }} />
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            flexWrap="wrap"
                            gap={1}
                          >
                            <Muted variant="body2">
                              Frecuencia:{" "}
                              <b>{loan.frecuency_name ?? "No especificada"}</b>
                            </Muted>
                            <Muted variant="body2">
                              Vence:{" "}
                              <b>
                                {loan.due_date
                                  ? dayjs(loan.due_date).format("DD/MM/YYYY")
                                  : "N/A"}
                              </b>
                            </Muted>
                          </Stack>
                        </Grid>

                        <Grid item xs={12}>
                          <SectionTitle variant="subtitle1" sx={{ mt: 1 }}>
                            Garantías
                          </SectionTitle>
                          <Muted variant="body2" sx={{ mb: 1 }}>
                            Total garantías:{" "}
                            <b>C$ {formatMoney(totalGuaranteeValue)}</b>
                          </Muted>

                          <GuarenteesGet
                            apiUrl={`${urlGuarantee}/${clientIdentification}`}
                            TotalGuarenteeValue={totalGuaranteeValue}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <CustomerFinancialEvaluationTab
                    customerId={clientId}
                    loanId={loan?.id || null}
                    readOnly={!canEditFinancialEvaluation}
                    onSaved={async () => {
                      await Promise.all([
                        loadCompliance(),
                        loadApprovals(),
                        fetchAmortizationTable(),
                      ]);

                      setSnackbar({
                        open: true,
                        message:
                          "Evaluación financiera actualizada correctamente.",
                        severity: "success",
                      });
                    }}
                    onViewChecklist={() => {
                      setSnackbar({
                        open: true,
                        message: "Aquí puedes abrir el checklist documental.",
                        severity: "info",
                      });
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Card
                    elevation={0}
                    sx={{ border: "1px solid", borderColor: "divider" }}
                  >
                    <CardContent>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        gap={1}
                      >
                        <SectionTitle variant="subtitle1" sx={{ mb: 0 }}>
                          Cumplimiento Normativo (CONAMI)dd
                        </SectionTitle>

                        {isComplianceValid ? (
                          <Chip
                            label="Expediente completo"
                            color="success"
                            icon={<AssignmentTurnedInIcon />}
                            size="small"
                          />
                        ) : (
                          <Chip
                            label="Faltan requisitos"
                            color="error"
                            icon={<WarningAmberIcon />}
                            size="small"
                          />
                        )}
                      </Stack>

                      {loadingCompliance ? (
                        <Box display="flex" justifyContent="center" p={2}>
                          <CircularProgress size={26} />
                        </Box>
                      ) : !compliance ? (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          No se pudo verificar el cumplimiento normativo del
                          crédito.
                        </Alert>
                      ) : (
                        <>
                          <Grid container spacing={1.5} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={4}>
                              <ComplianceChip
                                ok={compliance.evaluation_completed}
                                label="Evaluación crediticia"
                                icon={<FactCheckIcon />}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <ComplianceChip
                                ok={compliance.central_risk_checked}
                                label="Consulta central riesgo"
                                icon={<TrackChangesIcon />}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <ComplianceChip
                                ok={compliance.documents_complete}
                                label="Documentación completa"
                                icon={<DescriptionIcon />}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <ComplianceChip
                                ok={compliance.guarantees_valid}
                                label="Garantías verificadas"
                                icon={<VerifiedUserIcon />}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <ComplianceChip
                                ok={compliance.payment_capacity_valid}
                                label="Capacidad de pago válida"
                                icon={<SavingsIcon />}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <ComplianceChip
                                ok={compliance.loan_purpose_defined}
                                label="Destino del crédito definido"
                                icon={<AssignmentTurnedInIcon />}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <ComplianceChip
                                ok={compliance.recommendation_valid}
                                label="Recomendación técnica válida"
                                icon={<AssessmentIcon />}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <ComplianceChip
                                ok={compliance.references_valid}
                                label="Referencias aceptables"
                                icon={<AccountTreeIcon />}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <ComplianceChip
                                ok={compliance.bureau_acceptable}
                                label="Buró aceptable"
                                icon={<TrackChangesIcon />}
                              />
                            </Grid>

                            <Grid item xs={12} md={4}>
                              <ComplianceChip
                                ok={compliance.score_valid}
                                label={`Score válido (mín. ${
                                  compliance.minimum_score_required ?? 0
                                })`}
                                icon={<ScoreIcon />}
                              />
                            </Grid>
                          </Grid>

                          {!!financialEvaluation && (
                            <Box sx={{ mt: 2 }}>
                              <Stack
                                direction="row"
                                spacing={1}
                                flexWrap="wrap"
                                useFlexGap
                              >
                                <Chip
                                  icon={<TrendingUpIcon />}
                                  label={`Score: ${financialEvaluation.final_score ?? 0}`}
                                  size="small"
                                  variant="outlined"
                                />
                                <Chip
                                  label={`Riesgo: ${financialEvaluation.risk_level ?? "N/A"}`}
                                  size="small"
                                  variant="outlined"
                                  color={
                                    financialEvaluation.risk_level === "BAJO"
                                      ? "success"
                                      : financialEvaluation.risk_level ===
                                          "MEDIO"
                                        ? "warning"
                                        : "error"
                                  }
                                />
                                <Chip
                                  label={`Buró: ${financialEvaluation.bureau_result ?? "N/A"}`}
                                  size="small"
                                  variant="outlined"
                                />
                                <Chip
                                  label={`Referencias: ${
                                    financialEvaluation.references_result ??
                                    "N/A"
                                  }`}
                                  size="small"
                                  variant="outlined"
                                />
                              </Stack>
                            </Box>
                          )}

                          {!isComplianceValid &&
                            complianceMissingItems.length > 0 && (
                              <Alert severity="error" sx={{ mt: 2 }}>
                                <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                                  No se puede aprobar este crédito todavía.
                                </Typography>
                                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                  {complianceMissingItems.map((item, index) => (
                                    <li key={index}>
                                      <Typography variant="body2">
                                        {item}
                                      </Typography>
                                    </li>
                                  ))}
                                </Box>
                              </Alert>
                            )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card
                    elevation={0}
                    sx={{ border: "1px solid", borderColor: "divider" }}
                  >
                    <CardContent>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        flexWrap="wrap"
                        gap={1}
                      >
                        <SectionTitle variant="subtitle1">
                          Aprobaciones
                        </SectionTitle>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={
                              pendingCountUI > 0
                                ? `Pendientes: ${pendingCountUI}`
                                : "Sin pendientes"
                            }
                            size="small"
                            color={pendingCountUI > 0 ? "warning" : "success"}
                            variant="outlined"
                          />
                          <Chip
                            label={`Total: ${approvals.length}`}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      </Stack>

                      {loadingApprovals ? (
                        <Box
                          display="flex"
                          justifyContent="center"
                          alignItems="center"
                          height={70}
                        >
                          <CircularProgress size={26} />
                        </Box>
                      ) : approvals.length === 0 ? (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          No hay aprobaciones registradas.
                        </Alert>
                      ) : (
                        <TableContainer
                          component={Paper}
                          variant="outlined"
                          sx={{ mt: 1 }}
                        >
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: "grey.100" }}>
                                <TableCell sx={{ fontWeight: 800 }}>
                                  Aprobador
                                </TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>
                                  Estado
                                </TableCell>
                                <TableCell sx={{ fontWeight: 800 }}>
                                  Fecha
                                </TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ fontWeight: 800 }}
                                >
                                  Acciones
                                </TableCell>
                              </TableRow>
                            </TableHead>

                            <TableBody>
                              {approvals.map((a, idx) => {
                                const canAct =
                                  a.status === "PENDING" &&
                                  Number(user) === Number(a.approver_id);

                                const approveTooltip = !isFormConsistentlyValid
                                  ? "Corrige monto, plazo o tasa"
                                  : !isComplianceValid
                                    ? "Faltan requisitos de cumplimiento CONAMI"
                                    : "Aprobar solicitud";

                                return (
                                  <TableRow key={idx} hover>
                                    <TableCell>
                                      <Typography sx={{ fontWeight: 700 }}>
                                        {a.full_name}
                                      </Typography>
                                      <Muted variant="caption">
                                        ID: {a.approver_id}
                                      </Muted>
                                    </TableCell>

                                    <TableCell>
                                      <Pill status={a.status} />
                                    </TableCell>

                                    <TableCell>
                                      {a.updated_at
                                        ? dayjs(a.updated_at).format(
                                            "DD/MM/YYYY HH:mm",
                                          )
                                        : "—"}
                                    </TableCell>

                                    <TableCell align="right">
                                      {canAct ? (
                                        <Stack
                                          direction="row"
                                          spacing={1}
                                          justifyContent="flex-end"
                                        >
                                          <Tooltip title={approveTooltip} arrow>
                                            <span>
                                              <IconButton
                                                onClick={() => {
                                                  setSelectedApprovalId(a.id);
                                                  setConfirmOpen(true);
                                                }}
                                                color="primary"
                                                disabled={
                                                  !isFormConsistentlyValid ||
                                                  !isComplianceValid ||
                                                  actionLoading
                                                }
                                                size="small"
                                              >
                                                <CheckIcon />
                                              </IconButton>
                                            </span>
                                          </Tooltip>

                                          <Tooltip
                                            title="Rechazar solicitud"
                                            arrow
                                          >
                                            <span>
                                              <IconButton
                                                color="error"
                                                onClick={() =>
                                                  handleReject(a.id)
                                                }
                                                disabled={actionLoading}
                                                size="small"
                                              >
                                                <CloseIcon />
                                              </IconButton>
                                            </span>
                                          </Tooltip>
                                        </Stack>
                                      ) : (
                                        <Muted variant="body2">—</Muted>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}

                      <Divider sx={{ my: 2 }} />

                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        flexWrap="wrap"
                        gap={1}
                      >
                        <SectionTitle variant="subtitle1" sx={{ mb: 0 }}>
                          Tabla de amortización
                        </SectionTitle>
                        <Button
                          variant="outlined"
                          onClick={toggleAmortization}
                          size="small"
                        >
                          {showAmortization ? "Ocultar" : "Mostrar"}
                        </Button>
                      </Stack>

                      {showAmortization && (
                        <Box sx={{ mt: 1 }}>
                          <LoanAmortization
                            amortizationTable={amortizationTable}
                            totalPaymentAmount={totalPaymentAmount}
                            totalPrincipal={totalPrincipal}
                            totalInterest={totalInterest}
                            totalFee={totalFee}
                            totalInsurance={totalInsurance}
                            totalOtherCharges={totalOtherCharges}
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ bgcolor: "white" }}>
          <Button onClick={onClose} variant="outlined">
            Cerrar
          </Button>
        </DialogActions>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        <Dialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogContent sx={{ pt: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
              Confirmar aprobación
            </Typography>

            {!isComplianceValid && (
              <Alert severity="error" sx={{ mb: 2 }}>
                No puedes aprobar este crédito porque faltan requisitos
                regulatorios.
              </Alert>
            )}

            <Typography sx={{ mb: 1.5 }}>
              Se registrará tu aprobación con los valores actuales:
            </Typography>

            <Box
              sx={{
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                bgcolor: "grey.50",
              }}
            >
              <Typography variant="body2">
                <b>Monto:</b> C$ {formatMoney(editableAmount)}
              </Typography>
              <Typography variant="body2">
                <b>Plazo:</b> {editableTerm} meses
              </Typography>
              <Typography variant="body2">
                <b>Tasa:</b> {Number(editableRate || 0).toFixed(2)}%
              </Typography>
            </Box>

            {!!financialEvaluation && (
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  bgcolor: "grey.50",
                }}
              >
                <Typography variant="body2">
                  <b>Score final:</b> {financialEvaluation.final_score}
                </Typography>
                <Typography variant="body2">
                  <b>Nivel de riesgo:</b> {financialEvaluation.risk_level}
                </Typography>
                <Typography variant="body2">
                  <b>Recomendación:</b> {financialEvaluation.recommendation}
                </Typography>
                <Typography variant="body2">
                  <b>Buró:</b> {financialEvaluation.bureau_result}
                </Typography>
              </Box>
            )}

            {!isComplianceValid && complianceMissingItems.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Pendientes de cumplimiento:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {complianceMissingItems.map((item, index) => (
                    <li key={index}>
                      <Typography variant="body2">{item}</Typography>
                    </li>
                  ))}
                </Box>
              </Box>
            )}

            {!!financialEvaluation?.analyst_comment && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  <CommentIcon
                    sx={{ fontSize: 16, mr: 0.5, verticalAlign: "middle" }}
                  />
                  Comentario del analista
                </Typography>
                <Typography variant="body2">
                  {financialEvaluation.analyst_comment}
                </Typography>
              </Box>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setConfirmOpen(false)} color="inherit">
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!isFormValid()) return;
                if (!isComplianceValid) return;

                setConfirmOpen(false);
                if (selectedApprovalId) {
                  await handleApprove(selectedApprovalId);
                }
              }}
              variant="contained"
              disabled={
                !isFormConsistentlyValid || !isComplianceValid || actionLoading
              }
            >
              Aprobar
            </Button>
          </DialogActions>
        </Dialog>
        <LoanModificationSection loan={loan} user={user} />
      </Dialog>
    </>
  );
};

export default LoanDetailsModal;
