import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../../api";

// Datos del crédito para el modal de detalle: montos editables, tabla de
// amortización, cumplimiento normativo y el snackbar compartido por todas las
// secciones. Réplica exacta de la lógica que vivía dentro de
// components/Loan/LoanDetailsModal.jsx.
export default function useLoanDetailsData({ open, loan, clientId }) {
  const loanData = loan?.data || loan;
  const loanId = loanData?.id || loanData?.loan_id || loanData?.credit_id;

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

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

  const [compliance, setCompliance] = useState(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

  const [guaranteesTotal, setGuaranteesTotal] = useState(0);

  const notify = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const loadCompliance = useCallback(async () => {
    if (!loanId) {
      setCompliance(null);
      setLoadingCompliance(false);
      return;
    }

    setLoadingCompliance(true);

    try {
      const res = await API.get(
        `/api/loans/compliance/customer/${clientId}/${loanId}`,
      );

      setCompliance(res.data || null);
    } catch (err) {
      console.error("Error cargando cumplimiento:", err);
      setCompliance(null);
    } finally {
      setLoadingCompliance(false);
    }
  }, [clientId, loanId]);

  const fetchAmortizationTable = useCallback(async () => {
    if (!loanId) return;

    try {
      const res = await API.get(`/api/loans/amortization/${loanId}`);
      const raw = res.data || [];

      const data = raw.map((row) => ({
        paymentNumber: Number(row.payment_number),
        paymentDate: row.payment_date,
        principal: Number(row.payment_principal),
        interest: Number(row.payment_interest),
        insuranceByPayment: Number(row.payment_insurance),
        feeByPayment: Number(row.payment_fee),
        otherChargesByPayment: Number(row.payment_other_charges),
        paidPrincipal: Number(row.paid_principal || 0),
        paidInterest: Number(row.paid_interest || 0),
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
      notify(error.message || "Error cargando amortización", "error");
    }
  }, [loanId, notify]);

  useEffect(() => {
    if (!open) return;

    const currentLoan = loan?.data || loan;
    const currentLoanId =
      currentLoan?.id || currentLoan?.loan_id || currentLoan?.credit_id;

    if (!currentLoanId) {
      setCompliance(null);
      setLoadingCompliance(false);
      return;
    }

    fetchAmortizationTable();
    loadCompliance();

    setEditableAmount(
      Number(currentLoan.approved_amount || currentLoan.amount) || 0,
    );
    setEditableTerm(Number(currentLoan.approved_term || currentLoan.term) || 0);
    setEditableRate(
      Number(currentLoan.approved_rate || currentLoan.interest_rate) || 0,
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loan?.data?.id, loan?.id]);

  const isFormConsistentlyValid =
    editableAmount > 0 &&
    (guaranteesTotal <= 0 || editableAmount <= guaranteesTotal) &&
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

  const financialEvaluation = compliance?.financial_evaluation || null;

  return {
    loanData,
    loanId,

    snackbar,
    notify,
    closeSnackbar,

    amortizationTable,
    totalPaymentAmount,
    totalPrincipal,
    totalInterest,
    totalFee,
    totalInsurance,
    totalOtherCharges,
    fetchAmortizationTable,

    editableAmount,
    editableTerm,
    editableRate,

    compliance,
    loadingCompliance,
    loadCompliance,
    isComplianceValid,
    complianceMissingItems,
    financialEvaluation,

    guaranteesTotal,
    setGuaranteesTotal,

    isFormConsistentlyValid,
  };
}
