import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import Button from "@mui/material/Button";
import Save from "@mui/icons-material/Save";
import Cancel from "@mui/icons-material/Cancel";
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
import "react-toastify/dist/ReactToastify.css";
import ConfirmDialog from "./ConfirmDialog";
import CustomerSelect from "./Customer/CustomerSelect";
import PromoterSelect from "./PromoterSelect";
import CollectorSelect from "./CollectorSelect";
import { NumericFormat } from "react-number-format";
import FrecuencySelect from "./FrecuencySelect";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import LoanGroupSelect from "./LoanGroupSelect";
import { styled } from "@mui/material/styles";
import today from "../functions/today";
import GuarenteesGet from "./GuarenteesGet";
import dayjs from "dayjs";
import BranchSelect from "./BranchSelect";
import LoanAmortization from "./LoanAmortization";
import API from "../api";

const url = process.env.REACT_APP_API_BASE_URL + "/api/loans";
const urlGuarantee = process.env.REACT_APP_API_BASE_URL + "/api/guarantees";
const urlApprovers = process.env.REACT_APP_API_BASE_URL + "/api/approvers";
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

const LoanAdd = (props) => {
  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [loan, setLoan] = useState({
    customer_identification: "",
    requestDate: today(),
    branch_id: 0,
    vendor_id: "",
    promoter_id: "",
    amount: 1,
    fee: 0.0,
    deduction: 0.0,
    insurance: 0.0,
    other_charges: 0.0,
    term: 1,
    due_date: today(),
    loan_group_id: "",
    interest_type_id: 1,
    interest_type_name: "compound",
    interest_rate: 1,
    defaulted_rate: 0,
    frequency_id: "",
    frequency_name: "",
    current_balance: 0,
    status: "",
    guaranteeValue: 0.0,
    approvers: [],
  });

  const [guaranteeValue, setGuaranteeValue] = useState(0.0);
  const [guarantees, setGuarantees] = useState([]);
  const [amortizationTable, setAmortizationTable] = useState([]);
  const [installment, setInstallment] = useState(0);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [policies, setPolicies] = useState({});

  const showSnackbar = (message, severity = "success") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // (Tu StyledTableCell, lo dejo igual)
  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
      backgroundColor: theme.palette.info.main,
      color: theme.palette.common.white,
    },
    [`&.${tableCellClasses.body}`]: {
      fontSize: 14,
    },
  }));

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await API.get("api/credit-policies");
        const policyMap = {};
        res.data.forEach((policy) => {
          policyMap[policy.policy_key] = policy;
        });
        setPolicies(policyMap);
      } catch (err) {
        toast.error("Error al obtener políticas de crédito");
      }
    };
    fetchPolicies();
  }, []);

  useEffect(() => {
    const fetchAmortizationTable = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${url}/amortization`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            amount: loan.amount,
            interest_rate: loan.interest_rate,
            term: loan.term,
            requestDate: dayjs(loan.requestDate).format("YYYY-MM-DD"),
            due_date: dayjs(loan.due_date).format("YYYY-MM-DD"),
            fee: loan.fee,
            insurance: loan.insurance,
            other_charges: loan.other_charges,
            interest_type_name: "compound",
            frequency_id: loan.frequency_id,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          setAmortizationTable(data);
          const firstInstallment = data.find((row) => row.paymentNumber === 1);
          setInstallment(firstInstallment);

          const lastPayment = data.slice(-1)[0];
          const lastPaymentDate = lastPayment ? lastPayment.paymentDate : null;

          setLoan((prevLoan) => ({
            ...prevLoan,
            due_date:
              loan.frequency_id === "V"
                ? loan.due_date
                : dayjs(lastPaymentDate).format("YYYY-MM-DD"),
          }));
        } else {
          toast.error("Error al obtener la tabla de amortización");
        }
      } catch (error) {
        toast.error("Error de conexión al obtener la tabla de amortización");
      } finally {
        setLoading(false);
      }
    };

    if (
      loan.amount &&
      loan.interest_rate &&
      loan.term &&
      loan.frequency_id &&
      loan.fee >= 0 &&
      loan.insurance >= 0 &&
      loan.due_date &&
      loan.other_charges >= 0
    ) {
      fetchAmortizationTable();
    }
  }, [
    loan.amount,
    loan.interest_rate,
    loan.term,
    loan.requestDate,
    loan.interest_type_id,
    loan.frequency_id,
    loan.fee,
    loan.insurance,
    loan.due_date,
    loan.other_charges,
  ]);

  function validateForm(data) {
    let errors = {};
    let valid = true;

    if (!data.customer_identification) {
      errors.customer_identification = "La identificacion del cliente es requerida";
      valid = false;
    }

    if (!data.requestDate) {
      errors.requestDate = "La fecha de solicitud es requerida";
      valid = false;
    }

    if (!data.amount) {
      errors.amount = "El monto es requerido";
      valid = false;
    }

    if (!data.term) {
      errors.term = "El plazo es requerido";
      valid = false;
    }

    if (!data.due_date) {
      errors.due_date = "La fecha de vencimiento es requerida";
      valid = false;
    }

    if (!data.interest_rate) {
      errors.interest_rate = "La tasa de interés es requerida";
      valid = false;
    }

    const get = (key) => policies[key]?.policy_value;

    if (get("max_amount") && parseFloat(data.amount) > parseFloat(get("max_amount"))) {
      errors.amount = `El monto excede el máximo permitido: C$${get("max_amount")}`;
      valid = false;
    }

    if (get("max_interest_rate") && parseFloat(data.interest_rate) * 12 > parseFloat(get("max_interest_rate"))) {
      errors.interest_rate = `La tasa anual excede lo permitido: ${get("max_interest_rate")}%`;
      valid = false;
    }

    if (get("max_defaulted_rate") && parseFloat(data.defaulted_rate) > parseFloat(get("max_defaulted_rate"))) {
      errors.defaulted_rate = `La tasa de mora excede el máximo permitido: ${get("max_defaulted_rate")}%`;
      valid = false;
    }

    if (get("max_term_months") && parseInt(data.term) > parseInt(get("max_term_months"))) {
      errors.term = `El plazo excede el máximo permitido: ${get("max_term_months")} meses`;
      valid = false;
    }

    if (get("min_term_months") && parseInt(data.term) < parseInt(get("min_term_months"))) {
      errors.term = `El plazo es menor al mínimo permitido: ${get("min_term_months")} meses`;
      valid = false;
    }

    if (get("min_amount") && parseFloat(data.amount) < parseFloat(get("min_amount"))) {
      errors.amount = `El monto es menor al mínimo permitido: C$${get("min_amount")}`;
      valid = false;
    }

    if (get("min_interest_rate") && parseFloat(data.interest_rate) < parseFloat(get("min_interest_rate"))) {
      errors.interest_rate = `La tasa de interés es menor al mínimo permitido: ${get("min_interest_rate")}%`;
      valid = false;
    }

    if (get("max_late_interest_rate") && parseFloat(data.defaulted_rate) > loan.interest_rate / 4) {
      errors.defaulted_rate = `La tasa de mora excede el máximo permitido`;
      valid = false;
    }

    if (get("min_guarantee_coverage")) {
      const cobertura = (data.amount / guaranteeValue) * 100;
      if (cobertura > parseFloat(get("min_guarantee_coverage"))) {
        errors.amount = `Monto excede cobertura de garantías: ${get("min_guarantee_coverage")}%`;
        valid = false;
      }
    }

    setErrors(errors);
    return valid;
  }

  const [openDialog, setOpenDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);

  const addLoan = async () => {
    setLoading(true);

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: token,
      },
      body: JSON.stringify(loan),
    };

    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json();

      if (!response.ok) {
        if (responseData.error) showSnackbar(responseData.error, "error");
        else showSnackbar("Error desconocido al guardar.", "error");
      } else {
        showSnackbar("Registro guardado exitosamente.", "success");

        setTimeout(() => {
          setOpenDialog(false);
          navigate("/creditos");
        }, 1500);
      }
    } catch (error) {
      showSnackbar("Error de red: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loan.approvers.length === 0) {
      toast.error("No hay aprobadores disponibles para la sucursal seleccionada.");
      return;
    }

    if (validateForm(loan)) {
      setOpenDialog(true);
      setCancelDialog(false);
    } else {
      toast.error("No es posible guardar, primero corrija errores!");
    }
  };

  async function handleDialogConfirmation() {
    if (cancelDialog) {
      setCancelDialog(false);
      setOpenDialog(false);
      navigate("/creditos");
    } else {
      await addLoan();
    }
  }

  function handleCancel() {
    if (loan) {
      setCancelDialog(true);
      setOpenDialog(true);
    } else {
      setCancelDialog(false);
      setOpenDialog(false);
      navigate("/creditos");
    }
  }

  function handleInputChange(e, selectedOption) {
    const { name, value } = e.target;

    setLoan({
      ...loan,
      [name]: value,
      frequency_name: selectedOption ? selectedOption.name : loan.frequency_name,
    });

    const newErrors = validateForm({ ...loan, [name]: value });
    setErrors({ ...newErrors });
  }

  const fetchGuaranteesByCustomer = async () => {
    if (!loan.customer_identification) return;
    setLoading(true);
    try {
      const response = await fetch(`${urlGuarantee}/${loan.customer_identification}`, {
        method: "GET",
        headers: { Authorization: token },
      });
      const data = await response.json();
      if (response.ok) {
        const totalValue = data.reduce((sum, item) => sum + item.value, 0);
        setGuaranteeValue(totalValue);
        setGuarantees(data);
      } else {
        toast.error("Error al obtener las garantías del cliente");
      }
    } catch (error) {
      toast.error("Error al obtener las garantías: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApproversByBranch = async (branchId) => {
    if (!branchId) return;
    setLoading(true);
    try {
      const response = await fetch(`${urlApprovers}/${branchId}`, {
        method: "GET",
        headers: { Authorization: token },
      });
      const data = await response.json();
      if (response.ok) {
        if (data.length === 0) {
          toast.error("No hay aprobadores disponibles para la sucursal seleccionada.");
        } else {
          setLoan((prevLoan) => ({
            ...prevLoan,
            approvers: data.map((approver) => ({ id: approver.id })),
          }));
        }
      } else {
        toast.error("Error al obtener los aprobadores de la sucursal seleccionada.");
      }
    } catch (error) {
      toast.error("Error al obtener los aprobadores: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPaymentAmount = amortizationTable.reduce((acc, row) => acc + Number(row.paymentAmount ?? 0), 0);
  const totalPrincipal = amortizationTable.reduce((acc, row) => acc + Number(row.principal ?? 0), 0);
  const totalInterest = amortizationTable.reduce((acc, row) => acc + Number(row.interest ?? 0), 0);
  const totalFee = amortizationTable.reduce((acc, row) => acc + Number(row.feeByPayment ?? 0), 0);
  const totalInsurance = amortizationTable.reduce((acc, row) => acc + Number(row.insuranceByPayment ?? 0), 0);
  const totalOtherCharges = amortizationTable.reduce((acc, row) => acc + Number(row.otherChargesByPayment ?? 0), 0);

  return (
    <Box sx={{ background: BAC.bg, minHeight: "calc(100vh - 64px)", p: 1 }}>
      {/* Header BAC */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          p: 2,
          color: BAC.white,
          background: `linear-gradient(135deg, ${BAC.primary} 0%, ${BAC.primaryDark} 100%)`,
          boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
		      overflowX: "visible",      // ✅ evita salida horizontal
			    boxSizing: "border-box",  // ✅
			    width: "100%",            // ✅
			    maxWidth: "100%", 
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Solicitud de préstamo
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Complete los datos y verifique amortización y garantías.
            </Typography>
          </Box>

          <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
            <Chip
              label={`Garantías: C$ ${Number(guaranteeValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              sx={{ bgcolor: "rgba(255,255,255,0.16)", color: BAC.white, fontWeight: 800 }}
            />
            <Chip
              label={`Cuota: C$ ${Number(installment?.paymentAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              sx={{ bgcolor: "rgba(255,255,255,0.16)", color: BAC.white, fontWeight: 800 }}
            />
          </Box>
        </Box>
      </Paper>

      <form onSubmit={handleSubmit}>
        {/* Card principal */}
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
            Los campos se validan contra políticas de crédito.
          </Typography>

          <Divider sx={{ my: 2, borderColor: BAC.border }} />

          {/* Grid de campos (BAC) */}
         {/* Grid de campos (BAC) */}
<Box
  sx={{
    display: "grid",
    gridTemplateColumns: { shrink: true, xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
    alignItems: "start",
    gap: 2,
    width: "100%",
    maxWidth: "100%",
  }}
>

  <Box sx={{ ...fieldSx}}>
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
    InputLabelProps={{ max: new Date().toISOString().split("T")[0] }}
    disabled={true}
  />
</Box>
    <Box sx={{ ...fieldSx}}>
    <BranchSelect
      onChange={(e) => {
        handleInputChange(e);
        fetchApproversByBranch(e.target.value);
      }}
      size="small"
      value={loan.branch_id}
      name="branch_id"
      multiple={false}
      label="Sucursal"
    />
  </Box>

  <Box sx={{ ...fieldSx}}>
    <CustomerSelect
      id="customer_code"
      name="customer_identification"
      value={loan.customer_identification}
      onChange={handleInputChange}
      size="small"
      label="Nombre del cliente"
      onBlur={fetchGuaranteesByCustomer}
    />
  </Box>

  <Box sx={{ ...fieldSx }}>
    <PromoterSelect 
      name="promoter_id"
      onChange={handleInputChange}
      value={loan.promoter_id}
      branch_id={loan.branch_id}
      size="small"
      label="Nombre del promotor"
    />
  </Box>

  <Box sx={{ ...fieldSx}}>
    <CollectorSelect
      name="vendor_id"
      onChange={handleInputChange}
      label="Nombre del gestor"
      value={loan.vendor_id}
      branch_id={loan.branch_id}
    />
  </Box>
  </Box>
<Box
  sx={{
    display: "grid",
    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
    gap: 2,
    alignItems: "space-between",
    width: "100%",
    maxWidth: "100%",
  }}
>


  <NumericFormat
    id="amount"
    customInput={TextField}
    label="Monto solicitado"
    variant="outlined"
    type="text"
    name="amount"
    value={loan.amount}
    onBlur={({ value }) => handleInputChange({ target: { name: "amount", value } })}
    thousandSeparator
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
    error={!!errors.amount}
    helperText={errors.amount}
    size="small"
    fullWidth
    sx={{ ...fieldSx, minWidth: 0, maxWidth: "100%" }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start" sx={{ color: BAC.primary, fontWeight: 900 }}>
          C$
        </InputAdornment>
      ),
    }}
  />

  <NumericFormat
    id="fee"
    customInput={TextField}
    label="Comisión por desembolso"
    variant="outlined"
    type="text"
    name="fee"
    value={loan.fee}
    onValueChange={({ value }) => handleInputChange({ target: { name: "fee", value } })}
    thousandSeparator
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
    error={!!errors.fee}
    helperText={errors.fee}
    size="small"
    fullWidth
    sx={{ ...fieldSx, minWidth: 0, maxWidth: "100%" }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start" sx={{ color: BAC.primary, fontWeight: 900 }}>
          C$
        </InputAdornment>
      ),
    }}
  />

  <NumericFormat
    id="insurance"
    customInput={TextField}
    label="Cargos por seguros"
    variant="outlined"
    type="text"
    name="insurance"
    value={loan.insurance}
    onValueChange={({ value }) => handleInputChange({ target: { name: "insurance", value } })}
    thousandSeparator
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
    error={!!errors.insurance}
    helperText={errors.insurance}
    size="small"
    fullWidth
    sx={{ ...fieldSx, minWidth: 0 }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start" sx={{ color: BAC.primary, fontWeight: 900 }}>
          C$
        </InputAdornment>
      ),
    }}
  />

  <NumericFormat
    id="other_charges"
    customInput={TextField}
    label="Cargos administrativos"
    variant="outlined"
    type="text"
    name="other_charges"
    value={loan.other_charges}
    onValueChange={({ value }) => handleInputChange({ target: { name: "other_charges", value } })}
    thousandSeparator
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
    error={!!errors.other_charges}
    helperText={errors.other_charges}
    size="small"
    fullWidth
    sx={{ ...fieldSx, minWidth: 0 }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start" sx={{ color: BAC.primary, fontWeight: 900 }}>
          C$
        </InputAdornment>
      ),
    }}
  />

  <NumericFormat
    id="installment"
    customInput={TextField}
    label={`Cuota ${loan.frequency_name || ""}`.trim()}
    variant="outlined"
    type="text"
    name="installment"
    disabled
    value={installment?.paymentAmount}
    thousandSeparator
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
    size="small"
    fullWidth
    sx={{ ...fieldSx, minWidth: 0 }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start" sx={{ color: BAC.primary, fontWeight: 900 }}>
          C$
        </InputAdornment>
      ),
    }}
  />

  <NumericFormat
    id="deduction"
    customInput={TextField}
    label="Deducción"
    variant="outlined"
    name="deduction"
    value={loan.deduction}
    onValueChange={({ value }) => handleInputChange({ target: { name: "deduction", value } })}
    thousandSeparator
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
    error={!!errors.deduction}
    helperText={errors.deduction}
    size="small"
    fullWidth
    sx={{ ...fieldSx, minWidth: 0 }}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start" sx={{ color: BAC.primary, fontWeight: 900 }}>
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
    sx={{ ...fieldSx, minWidth: 0 }}
  />

  <TextField
    id="due_date"
    label="Fecha de Vencimiento"
    variant="outlined"
    type="date"
    name="due_date"
    disabled={loan.frequency_id === "V" ? false : true}
    onChange={handleInputChange}
    value={loan.due_date}
    error={!!errors.due_date}
    helperText={errors.due_date}
    InputLabelProps={{ shrink: true, max: new Date().toISOString().split("T")[0] }}
    size="small"
    fullWidth
    sx={{ ...fieldSx, minWidth: 0 }}
  />

  <NumericFormat
    id="interest_rate"
    customInput={TextField}
    label="Tasa de Interés mensual"
    variant="outlined"
    name="interest_rate"
    value={loan.interest_rate}
    onValueChange={({ value }) => handleInputChange({ target: { name: "interest_rate", value } })}
    thousandSeparator
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
    error={!!errors.interest_rate}
    helperText={errors.interest_rate}
    size="small"
    fullWidth
    sx={{ ...fieldSx, minWidth: 0 }}
    InputProps={{
      endAdornment: (
        <InputAdornment position="end" sx={{ color: BAC.primary, fontWeight: 900 }}>
          %
        </InputAdornment>
      ),
    }}
  />

  <NumericFormat
    id="defaulted_rate"
    customInput={TextField}
    label="Tasa de Interés mora"
    variant="outlined"
    name="defaulted_rate"
    value={loan.defaulted_rate}
    onValueChange={({ value }) => handleInputChange({ target: { name: "defaulted_rate", value } })}
    thousandSeparator
    decimalSeparator="."
    decimalScale={2}
    fixedDecimalScale
    error={!!errors.defaulted_rate}
    helperText={errors.defaulted_rate}
    size="small"
    fullWidth
    sx={{ ...fieldSx, minWidth: 0 }}
    InputProps={{
      endAdornment: (
        <InputAdornment position="end" sx={{ color: BAC.primary, fontWeight: 900 }}>
          %
        </InputAdornment>
      ),
    }}
  />

  <Box sx={{ ...fieldSx }}>
    <FrecuencySelect
      label="Frecuencia de pago"
      name="frequency_id"
      value={loan.frequency_id}
      onChange={handleInputChange}
    />
  </Box>

  <Box sx={{ ...fieldSx }}>
    <LoanGroupSelect
      label="Grupo de crédito"
      value={loan.loan_group_id}
      name="loan_group_id"
      onChange={handleInputChange}
    />
  </Box>
</Box>

          {/* Garantías */}
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
                apiUrl={`${urlGuarantee}/${loan.customer_identification}`}
                TotalGuarenteeValue={guaranteeValue}
              />
            </Paper>
          </Box>

          {/* Amortización */}
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

        {/* Botonera BAC */}
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

      <Backdrop open={loading} sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default LoanAdd;