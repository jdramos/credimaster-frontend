import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../../api";
import today from "../../../functions/today";
import { printCommitteeMinutesReport } from "../../../reports/committeeMinutesReport";

// Flujo de aprobaciones del crédito (cargar, aprobar, rechazar, acta de
// comité) y las banderas derivadas de estado. Réplica exacta de la lógica que
// vivía dentro de components/Loan/LoanDetailsModal.jsx.
export default function useLoanApprovalFlow({
  open,
  loan,
  userId,
  user,
  company,
  permissions = [],
  role,
  editableAmount,
  editableTerm,
  editableRate,
  onLoanUpdated,
  onClose,
  onApproveSuccess,
  notify,
}) {
  const loanData = loan?.data || loan;
  const loanId = loanData?.id || loanData?.loan_id || loanData?.credit_id;

  const [approvals, setApprovals] = useState([]);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [approveError, setApproveError] = useState("");

  const loadApprovals = useCallback(async () => {
    if (!loanId) {
      setApprovals([]);
      setLoadingApprovals(false);
      return;
    }

    setLoadingApprovals(true);

    try {
      const res = await API.get(`/api/approvals/${loanId}`);

      setApprovals(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error cargando aprobaciones:", err);
      setApprovals([]);
    } finally {
      setLoadingApprovals(false);
    }
  }, [loanId]);

  useEffect(() => {
    if (!open) return;

    const currentLoan = loan?.data || loan;
    const currentLoanId =
      currentLoan?.id || currentLoan?.loan_id || currentLoan?.credit_id;

    if (!currentLoanId) {
      setApprovals([]);
      setLoadingApprovals(false);
      return;
    }

    loadApprovals();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loan?.data?.id, loan?.id]);

  const refreshApprovalState = async () => {
    const resApprovals = await API.get(`/api/approvals/${loanId}`);
    const approvalsNow = resApprovals.data || [];

    setApprovals(approvalsNow);

    const pendingCount = approvalsNow.filter(
      (a) => String(a.status).toUpperCase() === "PENDING",
    ).length;

    const anyRejected = approvalsNow.some(
      (a) => String(a.status).toUpperCase() === "REJECTED",
    );

    const allApproved =
      approvalsNow.length > 0 &&
      approvalsNow.every((a) => String(a.status).toUpperCase() === "APPROVED");

    let approval_status = "PENDIENTE";

    if (anyRejected) approval_status = "RECHAZADO";
    else if (allApproved) approval_status = "APROBADO";

    onLoanUpdated?.({
      id: loanId,
      approval_status,
      pending_approvals: pendingCount,
    });

    return approvalsNow;
  };

  const handleApprove = async (approvalId, comment = "") => {
    if (!approvalId) return;

    setActionLoading(true);
    setApproveError("");

    try {
      await API.put(`/api/approvals/${approvalId}`, {
        status: "APPROVED",
        amount: editableAmount,
        term: editableTerm,
        interest_rate: editableRate,
        date: today,
        comment,
      });

      await refreshApprovalState();

      onApproveSuccess?.();

      onClose?.(); // cierra el modal grande también
    } catch (error) {
      console.error(error);

      const message =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error al aprobar.";

      setApproveError(message);
      notify?.(message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (approvalId, approvalComment) => {
    setActionLoading(true);

    try {
      await API.put(`/api/approvals/${approvalId}`, {
        status: "REJECTED",
        comment: approvalComment,
      });

      const approvalsNow = await refreshApprovalState();

      const pendingCount = approvalsNow.filter(
        (a) => String(a.status).toUpperCase() === "PENDING",
      ).length;

      onLoanUpdated?.({
        id: loanId,
        approval_status: "RECHAZADO",
        pending_approvals: pendingCount,
      });

      notify?.("Rechazo registrado.", "info");
    } catch (error) {
      console.error(error);

      notify?.(error.response?.data?.error || "Error al rechazar.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintCommitteeMinutes = async () => {
    if (!loanId) return;

    try {
      const res = await API.get(`/api/approvals/committee-minutes/${loanId}`);
      const data = res.data?.data;

      if (!data) {
        throw new Error("No se pudo obtener la información del acta.");
      }

      printCommitteeMinutesReport({
        company,
        user: { id: userId, full_name: user?.full_name || "" },
        loan: data.loan,
        members: data.members,
      });
    } catch (error) {
      console.error(error);

      notify?.(
        error.response?.data?.message ||
          error.message ||
          "Error al generar el acta de comité de crédito.",
        "error",
      );
    }
  };

  const hasUserApproved = approvals.some(
    (a) =>
      Number(a.approver_id) === Number(userId) &&
      String(a.status).toUpperCase() === "APPROVED",
  );

  // Con aprobador único (requires_committee=0) el crédito puede resolverse
  // con UNA sola decisión de cualquier aprobador, no necesariamente el que
  // está viendo el modal ni todos los de la sucursal — por eso el estado
  // real del préstamo (loans_data.status) es la fuente de verdad, no solo
  // el arreglo local de approvals.
  const isReadOnly =
    ["APPROVED", "REJECTED"].includes(String(loanData?.status).toUpperCase()) ||
    (approvals.length > 0 &&
      (approvals.every((a) => String(a.status).toUpperCase() === "APPROVED") ||
        hasUserApproved));

  const canEditFinancialEvaluation = useMemo(() => {
    return approvals.some(
      (a) =>
        Number(a.approver_id) === Number(userId) &&
        String(a.status).toUpperCase() === "PENDING",
    );
  }, [approvals, userId]);

  const pendingCountUI = approvals.filter(
    (a) => String(a.status).toUpperCase() === "PENDING",
  ).length;

  const anyRejectedUI = approvals.some(
    (a) => String(a.status).toUpperCase() === "REJECTED",
  );

  const allApprovedUI =
    approvals.length > 0 &&
    approvals.every((a) => String(a.status).toUpperCase() === "APPROVED");

  // Anular solicitud: solo DRAFT/PENDING sin ninguna aprobación otorgada. El
  // backend revalida la regla; aquí se controla la visibilidad del botón.
  const anyApprovedUI = approvals.some(
    (a) => String(a.status).toUpperCase() === "APPROVED",
  );

  const canCancelLoan =
    (role === 1 || permissions.includes("creditos.editar")) &&
    ["DRAFT", "PENDING"].includes(String(loanData?.status).toUpperCase()) &&
    !anyApprovedUI;

  const globalStatusUI = anyRejectedUI
    ? "RECHAZADO"
    : allApprovedUI
      ? "APROBADO"
      : "PENDIENTE";

  const canAddPayment = globalStatusUI === "APROBADO";

  return {
    approvals,
    loadingApprovals,
    loadApprovals,

    actionLoading,
    approveError,
    setApproveError,

    handleApprove,
    handleReject,
    handlePrintCommitteeMinutes,

    hasUserApproved,
    isReadOnly,
    canEditFinancialEvaluation,
    pendingCountUI,
    anyRejectedUI,
    allApprovedUI,
    anyApprovedUI,
    canCancelLoan,
    globalStatusUI,
    canAddPayment,
  };
}
