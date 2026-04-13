import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import Button from "@mui/material/Button";
import Save from "@mui/icons-material/Save";
import Cancel from "@mui/icons-material/Cancel";
import Stack from "@mui/material/Stack";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Snackbar from "@mui/material/Snackbar";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import "react-toastify/dist/ReactToastify.css";
import ConfirmDialog from "../ConfirmDialog";
import CustomerSelect from "../Customer/CustomerSelect";
import PromoterSelect from "../PromoterSelect";
import CollectorSelect from "../CollectorSelect";
import { NumericFormat } from "react-number-format";
import FrecuencySelect from "../FrecuencySelect";
import LoanGroupSelect from "../LoanGroupSelect";
import today from "../../functions/today";
import GuarenteesGet from "../GuarenteesGet";
import dayjs from "dayjs";
import BranchSelect from "../BranchSelect";
import LoanAmortization from "../LoanAmortization";
import API from "../../api";
import Visibility from "@mui/icons-material/Visibility";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Grid from "@mui/material/Grid";
import CustomerFinancialEvaluationTab from "../Customer/CustomerFinancialEvaluationTab";
import CustomerChecklist from "../Customer/CustomerCheckList";

const url = `${process.env.REACT_APP_API_BASE_URL}/api/loans`;
const urlGuarantee = `${process.env.REACT_APP_API_BASE_URL}/api/guarantees`;
const token = process.env.REACT_APP_API_TOKEN;

const BAC = {
  primary: "#0057B8",
  primaryDark: "#003E8A",
  soft: "#EAF2FF",
  border: "#E6EAF2",
  text: "#0B1F3B",
  muted: "#5B6B7F",
  bg: "#F6F8FC",
  white: "#FFFFFF",
};

const fieldSx = {
  "& .MuiInputLabel-root": { fontWeight: 700 },
  "& .MuiOutlinedInput-root": {
    borderRadius: 12,
    backgroundColor: BAC.white,
    "& fieldset": { borderColor: BAC.border },
    "&:hover fieldset": { borderColor: "rgba(0,87,184,0.45)" },
    "&.Mui-focused fieldset": { borderColor: BAC.primary, borderWidth: 2 },
  },
  "& .MuiFormHelperText-root": { marginLeft: 0 },
};

const LoanAdd = () => {
  const navigate = useNavigate();

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [loan, setLoan] = useState({
    customer_id: "",
    customer_identification: "",
    customer_name: "",
    requestDate: today(),
    branch_id: "",
    vendor_id: "",
    promoter_id: "",
    amount: "1.00",
    fee: "0.00",
    deduction: "0.00",
    insurance: "0.00",
    other_charges: "0.00",
    term: 1,
    due_date: today(),
    loan_group_id: "",
    interest_type_id: 1,
    interest_type_name: "compound",
    interest_rate: "1.00",
    defaulted_rate: "0.00",
    frequency_id: "",
    frequency_name: "",
    current_balance: 0,
    status: "",
    guaranteeValue: 0,
    credit_evaluation_id: "",
    created_by:
      currentUser?.user_name || currentUser?.username || currentUser?.id || "",
  });

  const [guaranteeValue, setGuaranteeValue] = useState(0);
  const [guarantees, setGuarantees] = useState([]);
  const [amortizationTable, setAmortizationTable] = useState([]);
  const [installment, setInstallment] = useState(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [policies, setPolicies] = useState({});
  const [evaluations, setEvaluations] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [docSummary, setDocSummary] = useState(null);
  const [showCustomerDocs, setShowCustomerDocs] = useState(false);

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);

  const selectedEvaluation = useMemo(() => {
    return (
      evaluations.find(
        (ev) => String(ev.id) === String(loan.credit_evaluation_id),
      ) || null
    );
  }, [evaluations, loan.credit_evaluation_id]);

  const evaluationCustomer = useMemo(() => {
    if (!selectedEvaluation) return null;

    return {
      business_type_name: selectedEvaluation.business_type_name || "—",
      total_loans: selectedEvaluation.total_loans || 0,
      productOrService: selectedEvaluation.productOrService || "—",
      creditLimit: selectedEvaluation.creditLimit || "—",
      chanel: selectedEvaluation.chanel || "—",
      province_name: selectedEvaluation.province_name || "—",
      scores: selectedEvaluation.scores || {},
    };
  }, [selectedEvaluation]);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await API.get("/api/credit-policies");
        const policyMap = {};
        res.data.forEach((policy) => {
          policyMap[policy.policy_key] = policy;
        });
        setPolicies(policyMap);
      } catch {
        toast.error("Error al obtener políticas de crédito");
      }
    };

    fetchPolicies();
  }, []);

  useEffect(() => {
    const fetchCustomerChecklist = async () => {
      if (!loan.customer_id) {
        setDocSummary(null);
        return;
      }

      try {
        const { data } = await API.get(
          `/api/customer-files/${loan.customer_id}/checklist-summary`,
        );

        setDocSummary(data);
      } catch (error) {
        console.error("Error obteniendo checklist:", error);
        setDocSummary(null);
      }
    };

    fetchCustomerChecklist();
  }, [loan.customer_id]);

  useEffect(() => {
    const fetchGuaranteesByCustomer = async () => {
      if (!loan.customer_id) {
        setGuaranteeValue(0);
        setGuarantees([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`${urlGuarantee}/${loan.customer_id}`, {
          method: "GET",
          headers: { Authorization: token },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Error al obtener garantías");
        }

        const totalValue = data.reduce(
          (sum, item) => sum + Number(item.value || 0),
          0,
        );
        setGuaranteeValue(totalValue);
        setGuarantees(data);
      } catch (error) {
        toast.error(error.message || "Error al obtener garantías");
      } finally {
        setLoading(false);
      }
    };

    fetchGuaranteesByCustomer();
  }, [loan.customer_id]);

  useEffect(() => {
    const fetchCustomerEvaluations = async () => {
      if (!loan.customer_id) {
        setEvaluations([]);
        setLoan((prev) => ({ ...prev, credit_evaluation_id: "" }));
        return;
      }

      try {
        const res = await API.get(
          `api/customer-credit-evaluations/${loan.customer_id}/current`,
        );

        const row = res.data;

        if (row) {
          setEvaluations([row]);
          setLoan((prev) => ({
            ...prev,
            credit_evaluation_id: row.id,
          }));
        } else {
          setEvaluations([]);
          setLoan((prev) => ({ ...prev, credit_evaluation_id: "" }));
        }
      } catch (error) {
        console.error("Error obteniendo evaluación vigente:", error);
        setEvaluations([]);
        setLoan((prev) => ({ ...prev, credit_evaluation_id: "" }));
      }
    };

    fetchCustomerEvaluations();
  }, [loan.customer_id]);

  useEffect(() => {
    const fetchAmortizationTable = async () => {
      if (
        !loan.amount ||
        !loan.interest_rate ||
        !loan.term ||
        !loan.frequency_id ||
        loan.fee === "" ||
        loan.insurance === "" ||
        !loan.requestDate ||
        !loan.due_date ||
        loan.other_charges === ""
      ) {
        setAmortizationTable([]);
        setInstallment(null);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`${url}/amortization`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            amount: Number(loan.amount || 0),
            interest_rate: Number(loan.interest_rate || 0),
            term: Number(loan.term || 0),
            requestDate: dayjs(loan.requestDate).format("YYYY-MM-DD"),
            due_date: dayjs(loan.due_date).format("YYYY-MM-DD"),
            fee: Number(loan.fee || 0),
            insurance: Number(loan.insurance || 0),
            other_charges: Number(loan.other_charges || 0),
            interest_type_name: loan.interest_type_name || "compound",
            frequency_id: loan.frequency_id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Error al obtener la tabla de amortización",
          );
        }

        setAmortizationTable(Array.isArray(data) ? data : []);

        const firstInstallment =
          data.find((row) => Number(row.paymentNumber) === 1) || null;
        setInstallment(firstInstallment);

        const lastPayment = data[data.length - 1];
        const lastPaymentDate = lastPayment?.paymentDate;

        setLoan((prevLoan) => ({
          ...prevLoan,
          due_date:
            prevLoan.frequency_id === "V"
              ? prevLoan.due_date
              : lastPaymentDate
                ? dayjs(lastPaymentDate).format("YYYY-MM-DD")
                : prevLoan.due_date,
        }));
      } catch (error) {
        toast.error(
          error.message ||
            "Error de conexión al obtener la tabla de amortización",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAmortizationTable();
  }, [
    loan.amount,
    loan.interest_rate,
    loan.term,
    loan.requestDate,
    loan.frequency_id,
    loan.fee,
    loan.insurance,
    loan.due_date,
    loan.other_charges,
    loan.interest_type_name,
  ]);

  const getPolicy = (key) => policies[key]?.policy_value;

  const validateForm = (data) => {
    const nextErrors = {};

    if (!data.customer_id) {
      nextErrors.customer_id = "El cliente es requerido";
    }

    if (!data.requestDate) {
      nextErrors.requestDate = "La fecha de solicitud es requerida";
    }

    if (!data.branch_id) {
      nextErrors.branch_id = "La sucursal es requerida";
    }

    if (!data.amount || Number(data.amount) <= 0) {
      nextErrors.amount = "El monto es requerido";
    }

    if (!data.term || Number(data.term) <= 0) {
      nextErrors.term = "El plazo es requerido";
    }

    if (!data.due_date) {
      nextErrors.due_date = "La fecha de vencimiento es requerida";
    }

    if (!data.interest_rate || Number(data.interest_rate) <= 0) {
      nextErrors.interest_rate = "La tasa de interés es requerida";
    }

    if (!data.frequency_id) {
      nextErrors.frequency_id = "La frecuencia es requerida";
    }

    if (!data.credit_evaluation_id) {
      nextErrors.credit_evaluation_id =
        "Debe seleccionar una evaluación financiera";
    }

    if (
      getPolicy("max_amount") &&
      Number(data.amount) > Number(getPolicy("max_amount"))
    ) {
      nextErrors.amount = `El monto excede el máximo permitido: C$${getPolicy("max_amount")}`;
    }

    if (
      getPolicy("max_interest_rate") &&
      Number(data.interest_rate) * 12 > Number(getPolicy("max_interest_rate"))
    ) {
      nextErrors.interest_rate = `La tasa anual excede lo permitido: ${getPolicy("max_interest_rate")}%`;
    }

    if (
      getPolicy("max_defaulted_rate") &&
      Number(data.defaulted_rate) > Number(getPolicy("max_defaulted_rate"))
    ) {
      nextErrors.defaulted_rate = `La tasa de mora excede el máximo permitido: ${getPolicy("max_defaulted_rate")}%`;
    }

    if (
      getPolicy("max_term_months") &&
      Number(data.term) > Number(getPolicy("max_term_months"))
    ) {
      nextErrors.term = `El plazo excede el máximo permitido: ${getPolicy("max_term_months")} meses`;
    }

    if (
      getPolicy("min_term_months") &&
      Number(data.term) < Number(getPolicy("min_term_months"))
    ) {
      nextErrors.term = `El plazo es menor al mínimo permitido: ${getPolicy("min_term_months")} meses`;
    }

    if (
      getPolicy("min_amount") &&
      Number(data.amount) < Number(getPolicy("min_amount"))
    ) {
      nextErrors.amount = `El monto es menor al mínimo permitido: C$${getPolicy("min_amount")}`;
    }

    if (
      getPolicy("min_interest_rate") &&
      Number(data.interest_rate) < Number(getPolicy("min_interest_rate"))
    ) {
      nextErrors.interest_rate = `La tasa de interés es menor al mínimo permitido: ${getPolicy("min_interest_rate")}%`;
    }

    if (
      getPolicy("max_late_interest_rate") &&
      Number(data.defaulted_rate) > Number(data.interest_rate) / 4
    ) {
      nextErrors.defaulted_rate = "La tasa de mora excede el máximo permitido";
    }

    if (getPolicy("min_guarantee_coverage") && Number(guaranteeValue) > 0) {
      const cobertura = (Number(data.amount) / Number(guaranteeValue)) * 100;
      if (cobertura > Number(getPolicy("min_guarantee_coverage"))) {
        nextErrors.amount = `Monto excede cobertura de garantías: ${getPolicy(
          "min_guarantee_coverage",
        )}%`;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleInputChange = (e, selectedOption = null) => {
    const { name, value } = e.target;

    const nextLoan = {
      ...loan,
      [name]: value,
      frequency_name: selectedOption
        ? selectedOption.name
        : loan.frequency_name,
      customer_identification: e.target.customer_identification,
      customer_name: e.target.customer_name,
    };

    setLoan(nextLoan);
  };

  const buildPayload = () => {
    return {
      customer_id: Number(loan.customer_id),
      customer_identification: loan.customer_identification || "",
      requestDate: dayjs(loan.requestDate).format("YYYY-MM-DD"),
      branch_id: Number(loan.branch_id),
      vendor_id: loan.vendor_id ? Number(loan.vendor_id) : null,
      promoter_id: loan.promoter_id ? Number(loan.promoter_id) : null,
      amount: Number(loan.amount || 0),
      fee: Number(loan.fee || 0),
      deduction: Number(loan.deduction || 0),
      insurance: Number(loan.insurance || 0),
      other_charges: Number(loan.other_charges || 0),
      term: Number(loan.term || 0),
      due_date: dayjs(loan.due_date).format("YYYY-MM-DD"),
      loan_group_id: loan.loan_group_id || null,
      interest_type_id: Number(loan.interest_type_id || 1),
      interest_type_name: loan.interest_type_name || "compound",
      interest_rate: Number(loan.interest_rate || 0),
      defaulted_rate: Number(loan.defaulted_rate || 0),
      frequency_id: loan.frequency_id,
      credit_evaluation_id: loan.credit_evaluation_id
        ? Number(loan.credit_evaluation_id)
        : null,
      created_by: loan.created_by || null,
    };
  };

  const addLoan = async () => {
    setLoading(true);

    try {
      const payload = buildPayload();

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Authorization: token,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        showSnackbar(
          responseData?.error || "Error al guardar la solicitud.",
          "error",
        );
        return;
      }

      showSnackbar("Solicitud guardada exitosamente.", "success");

      setTimeout(() => {
        setOpenDialog(false);
        navigate("/creditos");
      }, 1200);
    } catch (error) {
      showSnackbar(`Error de red: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm(loan)) {
      setCancelDialog(false);
      setOpenDialog(true);
    } else {
      toast.error("No es posible guardar, primero corrija errores.");
    }
  };

  const handleDialogConfirmation = async () => {
    if (cancelDialog) {
      setCancelDialog(false);
      setOpenDialog(false);
      navigate("/creditos");
      return;
    }

    await addLoan();
  };

  const handleCancel = () => {
    setCancelDialog(true);
    setOpenDialog(true);
  };

  const totalPaymentAmount = amortizationTable.reduce(
    (acc, row) => acc + Number(row.paymentAmount ?? 0),
    0,
  );
  const totalPrincipal = amortizationTable.reduce(
    (acc, row) => acc + Number(row.principal ?? 0),
    0,
  );
  const totalInterest = amortizationTable.reduce(
    (acc, row) => acc + Number(row.interest ?? 0),
    0,
  );
  const totalFee = amortizationTable.reduce(
    (acc, row) => acc + Number(row.feeByPayment ?? 0),
    0,
  );
  const totalInsurance = amortizationTable.reduce(
    (acc, row) => acc + Number(row.insuranceByPayment ?? 0),
    0,
  );
  const totalOtherCharges = amortizationTable.reduce(
    (acc, row) => acc + Number(row.otherChargesByPayment ?? 0),
    0,
  );

  return (
    <Box sx={{ background: BAC.bg, minHeight: "calc(100vh - 64px)", p: 1 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          p: 2,
          color: BAC.white,
          background: `linear-gradient(135deg, ${BAC.primary} 0%, ${BAC.primaryDark} 100%)`,
          boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
          overflowX: "visible",
          boxSizing: "border-box",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Solicitud de préstamos.
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Complete los datos y verifique amortización, evaluación y
              garantías.
            </Typography>
          </Box>

          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
            <Chip
              label={`Garantías: C$ ${Number(
                guaranteeValue || 0,
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}`}
              sx={{
                bgcolor: "rgba(255,255,255,0.16)",
                color: BAC.white,
                fontWeight: 800,
              }}
            />
            <Chip
              label={`Cuota: C$ ${Number(
                installment?.paymentAmount || 0,
              ).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}`}
              sx={{
                bgcolor: "rgba(255,255,255,0.16)",
                color: BAC.white,
                fontWeight: 800,
              }}
            />
          </Box>
        </Box>
      </Paper>

      <form onSubmit={handleSubmit}>
        <Paper
          elevation={0}
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 3,
            border: `1px solid ${BAC.border}`,
            background: BAC.white,
            boxShadow: "0 8px 22px rgba(12, 36, 68, 0.08)",
          }}
        >
          <Typography sx={{ fontWeight: 900, color: BAC.text }}>
            Datos principales
          </Typography>
          <Typography variant="body2" sx={{ color: BAC.muted, mb: 1 }}>
            Los campos se validan contra políticas de crédito y el backend
            valida evaluación y expediente.
          </Typography>

          <Divider sx={{ my: 2, borderColor: BAC.border }} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "repeat(4, 1fr)",
              },
              alignItems: "start",
              gap: 2,
              width: "100%",
              maxWidth: "100%",
            }}
          >
            <Box sx={fieldSx}>
              <TextField
                label="Fecha de solicitud"
                variant="outlined"
                type="date"
                size="small"
                id="requestDate"
                name="requestDate"
                onChange={handleInputChange}
                value={loan.requestDate}
                error={!!errors.requestDate}
                helperText={errors.requestDate}
                InputLabelProps={{ shrink: true }}
                fullWidth
                disabled
              />
            </Box>

            <Box sx={fieldSx}>
              <BranchSelect
                onChange={handleInputChange}
                size="small"
                value={loan.branch_id}
                name="branch_id"
                multiple={false}
                label="Sucursal"
              />
              {!!errors.branch_id && (
                <Typography variant="caption" color="error">
                  {errors.branch_id}
                </Typography>
              )}
            </Box>

            <Box sx={fieldSx}>
              <CustomerSelect
                id="customer_code"
                name="customer_id"
                value={loan.customer_id}
                onChange={handleInputChange}
                size="small"
                label="Nombre del cliente"
              />
              {!!errors.customer_id && (
                <Typography variant="caption" color="error">
                  {errors.customer_id}
                </Typography>
              )}
            </Box>

            <Box sx={fieldSx}>
              <PromoterSelect
                name="promoter_id"
                onChange={handleInputChange}
                value={loan.promoter_id}
                branch_id={loan.branch_id}
                size="small"
                label="Nombre del promotor"
              />
            </Box>

            <Box sx={fieldSx}>
              <CollectorSelect
                name="vendor_id"
                onChange={handleInputChange}
                label="Nombre del gestor"
                value={loan.vendor_id}
                branch_id={loan.branch_id}
              />
            </Box>
            <Box
              sx={{
                ...fieldSx,
                display: "flex",
                alignItems: "flex-start",
                gap: 1,
              }}
            >
              <TextField
                select
                fullWidth
                size="small"
                name="credit_evaluation_id"
                label="Evaluación financiera"
                value={loan.credit_evaluation_id}
                onChange={handleInputChange}
                error={!!errors.credit_evaluation_id}
                helperText={
                  errors.credit_evaluation_id ||
                  (loan.customer_id && evaluations.length === 0
                    ? "No se encontraron evaluaciones para este cliente"
                    : "")
                }
              >
                <MenuItem value="">Seleccione una evaluación</MenuItem>
                {evaluations.map((ev) => (
                  <MenuItem key={ev.id} value={ev.id}>
                    #{ev.id} - {dayjs(ev.evaluation_date).format("DD/MM/YYYY")}
                  </MenuItem>
                ))}
              </TextField>

              <Tooltip title="Ver evaluación">
                <span>
                  <IconButton
                    onClick={() => setEvaluationModalOpen(true)}
                    disabled={!selectedEvaluation}
                    sx={{
                      mt: "2px",
                      border: `1px solid ${BAC.border}`,
                      borderRadius: 2,
                      color: BAC.primary,
                      backgroundColor: BAC.white,
                      "&:hover": { backgroundColor: BAC.soft },
                    }}
                  >
                    <Visibility />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>

          <Box
            sx={{
              mt: 2,
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "repeat(4, 1fr)",
              },
              gap: 2,
              width: "100%",
              maxWidth: "100%",
            }}
          >
            <NumericFormat
              customInput={TextField}
              label="Monto solicitado"
              variant="outlined"
              name="amount"
              value={loan.amount}
              onValueChange={({ value }) =>
                handleInputChange({ target: { name: "amount", value } })
              }
              thousandSeparator
              decimalSeparator="."
              decimalScale={2}
              fixedDecimalScale
              error={!!errors.amount}
              helperText={errors.amount}
              size="small"
              fullWidth
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment
                    position="start"
                    sx={{ color: BAC.primary, fontWeight: 900 }}
                  >
                    C$
                  </InputAdornment>
                ),
              }}
            />

            <NumericFormat
              customInput={TextField}
              label="Comisión por desembolso"
              variant="outlined"
              name="fee"
              value={loan.fee}
              onValueChange={({ value }) =>
                handleInputChange({ target: { name: "fee", value } })
              }
              thousandSeparator
              decimalSeparator="."
              decimalScale={2}
              fixedDecimalScale
              error={!!errors.fee}
              helperText={errors.fee}
              size="small"
              fullWidth
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment
                    position="start"
                    sx={{ color: BAC.primary, fontWeight: 900 }}
                  >
                    C$
                  </InputAdornment>
                ),
              }}
            />

            <NumericFormat
              customInput={TextField}
              label="Cargos por seguros"
              variant="outlined"
              name="insurance"
              value={loan.insurance}
              onValueChange={({ value }) =>
                handleInputChange({ target: { name: "insurance", value } })
              }
              thousandSeparator
              decimalSeparator="."
              decimalScale={2}
              fixedDecimalScale
              error={!!errors.insurance}
              helperText={errors.insurance}
              size="small"
              fullWidth
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment
                    position="start"
                    sx={{ color: BAC.primary, fontWeight: 900 }}
                  >
                    C$
                  </InputAdornment>
                ),
              }}
            />

            <NumericFormat
              customInput={TextField}
              label="Cargos administrativos"
              variant="outlined"
              name="other_charges"
              value={loan.other_charges}
              onValueChange={({ value }) =>
                handleInputChange({ target: { name: "other_charges", value } })
              }
              thousandSeparator
              decimalSeparator="."
              decimalScale={2}
              fixedDecimalScale
              error={!!errors.other_charges}
              helperText={errors.other_charges}
              size="small"
              fullWidth
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment
                    position="start"
                    sx={{ color: BAC.primary, fontWeight: 900 }}
                  >
                    C$
                  </InputAdornment>
                ),
              }}
            />

            <NumericFormat
              customInput={TextField}
              label={`Cuota ${loan.frequency_name || ""}`.trim()}
              variant="outlined"
              name="installment"
              disabled
              value={installment?.paymentAmount || 0}
              thousandSeparator
              decimalSeparator="."
              decimalScale={2}
              fixedDecimalScale
              size="small"
              fullWidth
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment
                    position="start"
                    sx={{ color: BAC.primary, fontWeight: 900 }}
                  >
                    C$
                  </InputAdornment>
                ),
              }}
            />

            <NumericFormat
              customInput={TextField}
              label="Deducción"
              variant="outlined"
              name="deduction"
              value={loan.deduction}
              onValueChange={({ value }) =>
                handleInputChange({ target: { name: "deduction", value } })
              }
              thousandSeparator
              decimalSeparator="."
              decimalScale={2}
              fixedDecimalScale
              error={!!errors.deduction}
              helperText={errors.deduction}
              size="small"
              fullWidth
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment
                    position="start"
                    sx={{ color: BAC.primary, fontWeight: 900 }}
                  >
                    C$
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              id="term"
              label="Plazo en meses"
              variant="outlined"
              type="number"
              size="small"
              name="term"
              onChange={handleInputChange}
              value={loan.term}
              error={!!errors.term}
              helperText={errors.term}
              fullWidth
              sx={fieldSx}
            />

            <TextField
              id="due_date"
              label="Fecha de vencimiento"
              variant="outlined"
              type="date"
              name="due_date"
              disabled={loan.frequency_id !== "V"}
              onChange={handleInputChange}
              value={loan.due_date}
              error={!!errors.due_date}
              helperText={errors.due_date}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
              sx={fieldSx}
            />

            <NumericFormat
              customInput={TextField}
              label="Tasa de interés mensual"
              variant="outlined"
              name="interest_rate"
              value={loan.interest_rate}
              onValueChange={({ value }) =>
                handleInputChange({ target: { name: "interest_rate", value } })
              }
              thousandSeparator
              decimalSeparator="."
              decimalScale={2}
              fixedDecimalScale
              error={!!errors.interest_rate}
              helperText={errors.interest_rate}
              size="small"
              fullWidth
              sx={fieldSx}
              InputProps={{
                endAdornment: (
                  <InputAdornment
                    position="end"
                    sx={{ color: BAC.primary, fontWeight: 900 }}
                  >
                    %
                  </InputAdornment>
                ),
              }}
            />

            <NumericFormat
              customInput={TextField}
              label="Tasa de interés mora"
              variant="outlined"
              name="defaulted_rate"
              value={loan.defaulted_rate}
              onValueChange={({ value }) =>
                handleInputChange({ target: { name: "defaulted_rate", value } })
              }
              thousandSeparator
              decimalSeparator="."
              decimalScale={2}
              fixedDecimalScale
              error={!!errors.defaulted_rate}
              helperText={errors.defaulted_rate}
              size="small"
              fullWidth
              sx={fieldSx}
              InputProps={{
                endAdornment: (
                  <InputAdornment
                    position="end"
                    sx={{ color: BAC.primary, fontWeight: 900 }}
                  >
                    %
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={fieldSx}>
              <FrecuencySelect
                label="Frecuencia de pago"
                name="frequency_id"
                value={loan.frequency_id}
                onChange={handleInputChange}
              />
              {!!errors.frequency_id && (
                <Typography variant="caption" color="error">
                  {errors.frequency_id}
                </Typography>
              )}
            </Box>

            <Box sx={fieldSx}>
              <LoanGroupSelect
                label="Grupo de crédito"
                value={loan.loan_group_id}
                name="loan_group_id"
                onChange={handleInputChange}
              />
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${BAC.border}`,
                background: BAC.soft,
              }}
            >
              <Typography sx={{ fontWeight: 900, color: BAC.text, mb: 1 }}>
                Garantías del cliente
              </Typography>

              <GuarenteesGet
                apiUrl={`${urlGuarantee}/${loan.customer_id}`}
                TotalGuarenteeValue={guaranteeValue}
              />
              <Box sx={{ mt: 2 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: `1px solid ${BAC.border}`,
                    background: BAC.soft,
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                  >
                    <Typography sx={{ fontWeight: 900, color: BAC.text }}>
                      Documentación del cliente
                    </Typography>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowCustomerDocs(true)}
                      disabled={!loan.customer_id}
                      sx={{ fontWeight: 700, borderRadius: 2 }}
                    >
                      Ver documentos
                    </Button>
                  </Stack>

                  {docSummary ? (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <Chip
                        label={`Requeridos: ${docSummary.total_required}`}
                      />
                      <Chip
                        label={`Cargados: ${docSummary.uploaded}`}
                        sx={{
                          bgcolor: "#FFF3E0",
                          color: BAC.warning,
                          fontWeight: 700,
                        }}
                      />
                      <Chip
                        label={`Verificados: ${docSummary.verified}`}
                        sx={{
                          bgcolor: "#E8F5E9",
                          color: BAC.success,
                          fontWeight: 700,
                        }}
                      />
                      <Chip
                        label={`Faltantes: ${docSummary.missing}`}
                        sx={{
                          bgcolor:
                            Number(docSummary.missing) > 0
                              ? "#FEE2E2"
                              : "#E8F5E9",
                          color:
                            Number(docSummary.missing) > 0
                              ? "#B42318"
                              : BAC.success,
                          fontWeight: 700,
                        }}
                      />
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No hay información documental.
                    </Typography>
                  )}
                </Paper>
              </Box>
            </Paper>
          </Box>

          <Box sx={{ mt: 2 }}>
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
        </Paper>

        <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<Save />}
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              px: 4,
              bgcolor: BAC.primary,
              "&:hover": { bgcolor: BAC.primaryDark },
            }}
          >
            Guardar
          </Button>

          <Button
            onClick={handleCancel}
            variant="outlined"
            startIcon={<Cancel />}
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              px: 4,
              borderColor: "rgba(0,87,184,0.35)",
              color: BAC.primary,
              "&:hover": { borderColor: BAC.primary, bgcolor: BAC.soft },
            }}
          >
            Cancelar
          </Button>
        </Box>
      </form>

      <ToastContainer />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbarSeverity}
          variant="filled"
          onClose={() => setSnackbarOpen(false)}
          sx={{ width: "100%", borderRadius: 2, fontWeight: 800 }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        confirm={handleDialogConfirmation}
        cancel={() => setOpenDialog(false)}
        cancelOperation={cancelDialog}
      />
      <Dialog
        open={evaluationModalOpen}
        onClose={() => setEvaluationModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            color: BAC.white,
            background: `linear-gradient(135deg, ${BAC.primary} 0%, ${BAC.primaryDark} 100%)`,
          }}
        >
          Detalle de evaluación financiera
        </DialogTitle>

        {evaluationCustomer ? (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: `1px solid ${BAC.border}`,
              backgroundColor: BAC.white,
            }}
          >
            <CustomerFinancialEvaluationTab
              customerId={loan.customer_id}
              customerIdentification={loan.customer_identification}
              customerName={loan.customer_name}
            />
          </Paper>
        ) : (
          <Alert severity="info">No hay evaluación seleccionada.</Alert>
        )}

        <DialogActions sx={{ p: 2, backgroundColor: BAC.white }}>
          <Button
            onClick={() => setEvaluationModalOpen(false)}
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

      <Backdrop
        open={loading}
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      <Dialog
        open={showCustomerDocs}
        onClose={() => setShowCustomerDocs(false)}
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

        <DialogContent sx={{ p: 2 }}>
          {loan.customer_id ? (
            <CustomerChecklist
              customerId={loan.customer_id}
              customerName={loan.customer_name}
              readOnly={false}
            />
          ) : (
            <Alert severity="info">
              Selecciona un cliente para ver los documentos.
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setShowCustomerDocs(false)}
            variant="contained"
            sx={{
              fontWeight: 800,
              borderRadius: 2,
              bgcolor: BAC.primary,
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoanAdd;
