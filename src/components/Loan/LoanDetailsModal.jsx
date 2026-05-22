import React, { useEffect, useMemo, useState, useContext } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import dayjs from "dayjs";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LoanAmortization from "../LoanAmortization";
import PaymentForm from "../PaymentForm";
import PaymentsIcon from "@mui/icons-material/Payments";
import today from "../../functions/today";
import LoanInfo from "../LoanInfo";
import CustomerFinancialEvaluationTab from "../Customer/CustomerFinancialEvaluationTab";
import LoanModificationSection from "../Loan/LoanModificationSection";
import CustomerChecklist from "../Customer/CustomerCheckList";
import BAC from "../../styles/bac";
import GuaranteesTable from "../GuranteeTable";

const urlGuarantee = process.env.REACT_APP_API_BASE_URL + "/api/guarantees";

const HeaderBar = styled("div")(({ theme }) => ({
  background: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(1.25, 2),
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}));

const HeaderLeft = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1.25),
}));

const Muted = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 800,
  letterSpacing: 0.2,
  marginBottom: theme.spacing(1),
}));

const CompactCard = ({ children, sx = {} }) => (
  <Card
    elevation={0}
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 2,
      ...sx,
    }}
  >
    <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
      {children}
    </CardContent>
  </Card>
);

const CompactAccordion = ({
  title,
  chip,
  defaultExpanded = false,
  children,
}) => (
  <Accordion
    defaultExpanded={defaultExpanded}
    disableGutters
    elevation={0}
    sx={{
      border: "1px solid",
      borderColor: "divider",
      borderRadius: "10px !important",
      overflow: "hidden",
      mb: 1,
      "&::before": { display: "none" },
    }}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      sx={{
        minHeight: 44,
        px: 1.5,
        "& .MuiAccordionSummary-content": {
          my: 0.75,
          alignItems: "center",
        },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography sx={{ fontWeight: 900, fontSize: 14 }}>{title}</Typography>
        {chip}
      </Stack>
    </AccordionSummary>

    <AccordionDetails sx={{ p: 1.5, pt: 0 }}>{children}</AccordionDetails>
  </Accordion>
);

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
    size="small"
    sx={{
      width: "100%",
      justifyContent: "flex-start",
      "& .MuiChip-label": {
        width: "100%",
        textAlign: "left",
        fontSize: 12,
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

  const [localGuarantees, setLocalGuarantees] = useState([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState(null);

  const [amortizationTable, setAmortizationTable] = useState([]);
  const [totalPaymentAmount, setTotalPaymentAmount] = useState(0);
  const [totalPrincipal, setTotalPrincipal] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalFee, setTotalFee] = useState(0);
  const [totalInsurance, setTotalInsurance] = useState(0);
  const [totalOtherCharges, setTotalOtherCharges] = useState(0);

  const [editableAmount, setEditableAmount] = useState(0);
  const [editableTerm, setEditableTerm] = useState(0);
  const [editableRate, setEditableRate] = useState(0);

  const [amountError, setAmountError] = useState("");
  const [termError, setTermError] = useState("");
  const [rateError, setRateError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [compliance, setCompliance] = useState(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [guaranteesTotal, setGuaranteesTotal] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [financialEvaluationForm, setFinancialEvaluationForm] = useState({
    evaluation_date: dayjs().format("YYYY-MM-DD"),
    methodology: "INDIVIDUAL",

    business_income: "",
    salary_income: "",
    other_income: "",

    business_expenses: "",
    family_expenses: "",
    other_debts_installments: "",

    proposed_installment: "",

    years_in_business: "",
    monthly_sales: "",
    inventory_value: "",
    business_location: "",

    references_result: "FAVORABLE",
    bureau_result: "NO_APLICA",

    analyst_comment: "",
    committee_comment: "",
    change_reason: "",
    version_no: 1,
    is_current: 1,
  });

  const totalGuaranteeValue = useMemo(
    () => guarantees.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
    [guarantees],
  );

  useEffect(() => {
    setLocalGuarantees(guarantees || []);
  }, [guarantees]);

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

      setEditableAmount(Number(loan.amount || loan.approved_amount) || 0);
      setEditableTerm(Number(loan.term || loan.approved_term) || 0);
      setEditableRate(Number(loan.interest_rate || loan.approved_rate) || 0);

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

  const pendingCountUI = approvals.filter((a) => a.status === "PENDING").length;
  const anyRejectedUI = approvals.some((a) => a.status === "REJECTED");
  const allApprovedUI =
    approvals.length > 0 && approvals.every((a) => a.status === "APPROVED");

  const globalStatusUI = anyRejectedUI
    ? "RECHAZADO"
    : allApprovedUI
      ? "APROBADO"
      : "PENDIENTE";

  const canAddPayment = globalStatusUI === "APROBADO";

  const financialEvaluation = compliance?.financial_evaluation || null;

  const currentClientId = clientId || loan?.customer_id;
  const currentIdentification =
    clientIdentification ||
    loan?.customer_identification ||
    loan?.identification;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            borderRadius: 3,
            height: "92vh",
            overflow: "hidden",
          },
        }}
      >
        <HeaderBar>
          <HeaderLeft>
            <Avatar
              sx={{ bgcolor: "rgba(255,255,255,0.15)", width: 34, height: 34 }}
            >
              <AccountBalanceIcon fontSize="small" />
            </Avatar>

            <Box>
              <Typography
                variant="caption"
                sx={{ opacity: 0.9, lineHeight: 1 }}
              >
                Gestión de Crédito
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 900, lineHeight: 1.1 }}
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
                fontWeight: 800,
              }}
            />

            <IconButton onClick={onClose} sx={{ color: "white" }} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </HeaderBar>

        {actionLoading && <LinearProgress />}

        <DialogContent sx={{ bgcolor: (t) => t.palette.grey[50], p: 1.5 }}>
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
              <CompactCard sx={{ mb: 1.25 }}>
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
                      label={`Solicitud: ${
                        loan.date
                          ? dayjs(loan.date).format("DD/MM/YYYY")
                          : "N/A"
                      }`}
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
                        isComplianceValid ? "CONAMI OK" : "CONAMI pendiente"
                      }
                      color={isComplianceValid ? "success" : "warning"}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Muted variant="body2">
                      {loan.branch_name
                        ? `Sucursal: ${loan.branch_name}`
                        : "Sucursal no asignada"}
                    </Muted>

                    {canAddPayment && (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PaymentsIcon />}
                        onClick={() => setPaymentOpen(true)}
                        sx={{
                          borderRadius: 2,
                          fontWeight: 900,
                          textTransform: "none",
                        }}
                      >
                        Agregar pago
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CompactCard>

              <Grid container spacing={1.25}>
                <Grid item xs={12}>
                  <CompactCard>
                    <Grid container spacing={0.75} alignItems="center">
                      <Grid item xs={6} md={2.5}>
                        <Muted variant="caption" sx={{ fontSize: 11 }}>
                          Cliente
                        </Muted>
                        <Typography
                          sx={{
                            fontWeight: 800,
                            fontSize: 13,
                            lineHeight: 1.2,
                          }}
                        >
                          {loan.customer_name}
                        </Typography>
                        <Muted variant="caption" sx={{ fontSize: 11 }}>
                          {currentIdentification}
                        </Muted>
                      </Grid>

                      <Grid item xs={6} md={1.8}>
                        <Muted variant="caption" sx={{ fontSize: 11 }}>
                          Monto
                        </Muted>
                        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                          C$ {formatMoney(editableAmount)}
                        </Typography>
                      </Grid>

                      <Grid item xs={4} md={1.2}>
                        <Muted variant="caption" sx={{ fontSize: 11 }}>
                          Plazo
                        </Muted>
                        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                          {editableTerm}m
                        </Typography>
                      </Grid>

                      <Grid item xs={4} md={1.2}>
                        <Muted variant="caption" sx={{ fontSize: 11 }}>
                          Tasa
                        </Muted>
                        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                          {Number(editableRate || 0).toFixed(2)}%
                        </Typography>
                      </Grid>

                      <Grid item xs={4} md={2}>
                        <Muted variant="caption" sx={{ fontSize: 11 }}>
                          Vence
                        </Muted>
                        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                          {loan.due_date
                            ? dayjs(loan.due_date).format("DD/MM/YY")
                            : "N/A"}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={3.3}>
                        <Muted variant="caption" sx={{ fontSize: 11 }}>
                          Sucursal / Promotor
                        </Muted>
                        <Typography sx={{ fontWeight: 700, fontSize: 12 }}>
                          {loan.branch_name ?? "No asignada"}
                        </Typography>
                        <Muted variant="caption" sx={{ fontSize: 11 }}>
                          {loan.promoter_name ?? "No asignado"}
                        </Muted>
                      </Grid>
                    </Grid>

                    <Divider sx={{ my: 1.25 }} />

                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ mb: 1 }}
                        >
                          <Avatar
                            sx={{
                              width: 24,
                              height: 24,
                              bgcolor: "primary.light",
                            }}
                          >
                            <PersonIcon sx={{ fontSize: 16 }} />
                          </Avatar>

                          <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
                            Información del cliente
                          </Typography>
                        </Stack>

                        <Box sx={{ width: "100%" }}>
                          <LoanInfo clientId={currentClientId} />
                        </Box>
                      </Grid>
                    </Grid>
                  </CompactCard>
                </Grid>

                <Grid item xs={12}>
                  <CompactAccordion
                    title="Evaluación financiera"
                    defaultExpanded={false}
                    chip={
                      financialEvaluation ? (
                        <Chip
                          label={`Score: ${financialEvaluation.final_score ?? 0}`}
                          size="small"
                          variant="outlined"
                        />
                      ) : null
                    }
                  >
                    <CustomerFinancialEvaluationTab
                      form={financialEvaluationForm}
                      setForm={setFinancialEvaluationForm}
                      customerId={currentClientId}
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
                        setShowDocuments(true);
                      }}
                    />
                  </CompactAccordion>
                </Grid>

                <Grid item xs={12}>
                  <CompactAccordion
                    title="Garantías"
                    defaultExpanded={false}
                    chip={
                      <Chip
                        label={`Total: C$ ${formatMoney(guaranteesTotal)}`}
                        size="small"
                        color={guaranteesTotal > 0 ? "success" : "default"}
                        variant={guaranteesTotal > 0 ? "filled" : "outlined"}
                        sx={{ fontWeight: 900 }}
                      />
                    }
                  >
                    <GuaranteesTable
                      customerId={currentClientId}
                      readOnly={isReadOnly}
                      onTotalChange={setGuaranteesTotal}
                    />
                  </CompactAccordion>
                </Grid>

                <Grid item xs={12}>
                  <CompactAccordion
                    title="Cumplimiento Normativo (CONAMI)"
                    defaultExpanded={false}
                    chip={
                      isComplianceValid ? (
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
                      )
                    }
                  >
                    {loadingCompliance ? (
                      <Box display="flex" justifyContent="center" p={2}>
                        <CircularProgress size={26} />
                      </Box>
                    ) : !compliance ? (
                      <Alert severity="warning">
                        No se pudo verificar el cumplimiento normativo del
                        crédito.
                      </Alert>
                    ) : (
                      <>
                        <Grid container spacing={1}>
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
                              label={
                                compliance?.credit_file
                                  ? "Documentación completa"
                                  : "Expediente documental generado"
                              }
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
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mt: 1.5 }}
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
                                  : financialEvaluation.risk_level === "MEDIO"
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
                                financialEvaluation.references_result ?? "N/A"
                              }`}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                        )}

                        {!isComplianceValid &&
                          complianceMissingItems.length > 0 && (
                            <Alert severity="error" sx={{ mt: 1.5 }}>
                              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
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
                  </CompactAccordion>
                </Grid>

                <Grid item xs={12}>
                  <CompactAccordion
                    title="Aprobaciones"
                    defaultExpanded
                    chip={
                      <>
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
                      </>
                    }
                  >
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
                      <Alert severity="warning">
                        No hay aprobaciones registradas.
                      </Alert>
                    ) : (
                      <TableContainer component={Paper} variant="outlined">
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
                              <TableCell align="right" sx={{ fontWeight: 800 }}>
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
                                    <Typography
                                      sx={{ fontWeight: 700, fontSize: 13 }}
                                    >
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
                                              onClick={() => handleReject(a.id)}
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
                  </CompactAccordion>
                </Grid>

                <Grid item xs={12}>
                  <CompactAccordion
                    title="Tabla de amortización"
                    defaultExpanded={false}
                  >
                    <LoanAmortization
                      amortizationTable={amortizationTable}
                      totalPaymentAmount={totalPaymentAmount}
                      totalPrincipal={totalPrincipal}
                      totalInterest={totalInterest}
                      totalFee={totalFee}
                      totalInsurance={totalInsurance}
                      totalOtherCharges={totalOtherCharges}
                    />
                  </CompactAccordion>
                </Grid>

                <Grid item xs={12}>
                  <LoanModificationSection loan={loan} user={user} />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ bgcolor: "white", py: 1, px: 2 }}>
          <Button onClick={onClose} variant="outlined" size="small">
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

        <Dialog
          open={showDocuments}
          onClose={async () => {
            setShowDocuments(false);
            await loadCompliance();
          }}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle
            sx={{
              fontWeight: 800,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            Checklist documental del cliente
          </DialogTitle>

          <DialogContent sx={{ p: 2, backgroundColor: BAC.white }}>
            {showDocuments && currentClientId ? (
              <CustomerChecklist
                customerId={currentClientId}
                customerName={loan.customer_name}
                readOnly={false}
                title="Checklist documental del cliente"
                showCompletedSummary={true}
                autoHideCompleted={false}
              />
            ) : (
              <Alert severity="info">No hay documentos disponibles.</Alert>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 2, backgroundColor: BAC.white }}>
            <Button
              onClick={async () => {
                setShowDocuments(false);
                await loadCompliance();
              }}
              variant="contained"
              sx={{
                borderRadius: 2,
                fontWeight: 900,
                bgcolor: BAC.primary,
                "&:hover": { bgcolor: BAC.primaryDark },
              }}
            >
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>

      <PaymentForm
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        initialLoan={loan}
        readOnlyLoan={true}
        onSuccess={async () => {
          setPaymentOpen(false);

          await Promise.all([
            fetchAmortizationTable(),
            loadCompliance(),
            loadApprovals(),
          ]);

          setSnackbar({
            open: true,
            message: "Pago registrado correctamente.",
            severity: "success",
          });
        }}
      />
    </>
  );
};

export default LoanDetailsModal;
