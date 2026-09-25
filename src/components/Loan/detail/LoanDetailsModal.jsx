import React, { useContext, useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  Button,
  Grid,
  CircularProgress,
  Box,
  Snackbar,
  Alert,
  LinearProgress,
} from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { UserContext } from "../../../contexts/UserContext";
import { useAuth } from "../../../contexts/AuthContext";
import QuickPaymentModal from "../QuickPaymentModal";
import LoanModificationSection from "../LoanModificationSection";
import AssetAdjudicationModal from "../../AssetAdjudicationModal";
import ApprovalConfirmationDialog from "../ApprovalConfirmationDialog";

import { CompactCard } from "./primitives";
import LoanProcessStepper from "./LoanProcessStepper";
import LoanHeaderBar, { CancelledLoanBanner } from "./LoanHeaderBar";
import LoanSummaryBar from "./LoanSummaryBar";
import LoanOverdueAlertSection from "./LoanOverdueAlertSection";
import LoanClientInfoSection from "./LoanClientInfoSection";
import LoanFinancialEvaluationSection from "./LoanFinancialEvaluationSection";
import LoanGuaranteesSection from "./LoanGuaranteesSection";
import LoanAdjudicationSection from "./LoanAdjudicationSection";
import LoanComplianceSection from "./LoanComplianceSection";
import LoanApprovalsSection from "./LoanApprovalsSection";
import LoanAmortizationSection from "./LoanAmortizationSection";
import LoanPaymentHistorySection from "./LoanPaymentHistorySection";
import ChecklistDialog from "./ChecklistDialog";
import CancelLoanDialog from "./CancelLoanDialog";
import useLoanDetailsData from "./useLoanDetailsData";
import useLoanApprovalFlow from "./useLoanApprovalFlow";

dayjs.extend(utc);

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
  const { user, permissions = [], role } = useContext(UserContext);
  const { tenant } = useAuth();

  const company = {
    commercial_name: tenant?.commercial_name || tenant?.name || "",
    legal_name: tenant?.legal_name || tenant?.company_name || "",
    tax_id: tenant?.tax_id || tenant?.ruc || "",
    address: tenant?.address || "",
    phone: tenant?.phone || "",
    logo_url: tenant?.logo_url || "",
  };

  const userId = user?.id || user?.user_id || user;

  // Estado realmente compartido entre secciones hermanas.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [openAdjudication, setOpenAdjudication] = useState(false);

  const {
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
  } = useLoanDetailsData({ open, loan, clientId });

  const {
    approvals,
    loadingApprovals,
    loadApprovals,
    actionLoading,
    approveError,
    setApproveError,
    handleApprove,
    handleReject,
    handlePrintCommitteeMinutes,
    isReadOnly,
    canEditFinancialEvaluation,
    pendingCountUI,
    canCancelLoan,
    globalStatusUI,
    canAddPayment,
  } = useLoanApprovalFlow({
    open,
    loan,
    userId,
    user,
    company,
    permissions,
    role,
    editableAmount,
    editableTerm,
    editableRate,
    onLoanUpdated,
    onClose,
    onApproveSuccess: () => {
      setConfirmOpen(false);
      setSelectedApprovalId(null);
    },
    notify,
  });

  const currentClientId = clientId || loan?.customer_id;

  const currentIdentification =
    clientIdentification ||
    loan?.customer_identification ||
    loan?.identification;

  const handleCloseChecklist = async () => {
    setShowDocuments(false);
    await loadCompliance();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 3,
            height: "92vh",
            overflow: "hidden",
          },
        }}
      >
        <LoanHeaderBar loan={loan} onClose={onClose} />

        {actionLoading && <LinearProgress />}

        <DialogContent sx={{ bgcolor: (t) => t.palette.grey[50], p: 1.5 }}>
          <CancelledLoanBanner loanData={loanData} />

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
              <LoanSummaryBar
                loan={loan}
                loanData={loanData}
                loanId={loanId}
                globalStatusUI={globalStatusUI}
                pendingCountUI={pendingCountUI}
                isComplianceValid={isComplianceValid}
                canAddPayment={canAddPayment}
                onAddPayment={() => setPaymentOpen(true)}
                company={company}
                user={user}
                userId={userId}
                clientId={clientId}
                clientIdentification={clientIdentification}
                guarantees={guarantees}
                financialEvaluation={financialEvaluation}
                notify={notify}
              />

              <LoanOverdueAlertSection loanData={loanData} amortizationTable={amortizationTable} />

              <CompactCard sx={{ mb: 1.25 }}>
                <LoanProcessStepper loan={loanData} />
              </CompactCard>

              <Grid container spacing={0.5}>
                <LoanClientInfoSection
                  loan={loan}
                  loanData={loanData}
                  currentIdentification={currentIdentification}
                  editableAmount={editableAmount}
                  editableTerm={editableTerm}
                  editableRate={editableRate}
                />

                <LoanFinancialEvaluationSection
                  financialEvaluation={financialEvaluation}
                  currentClientId={currentClientId}
                  evaluationLoanId={loan?.id || null}
                  canEditFinancialEvaluation={canEditFinancialEvaluation}
                  onSaved={async () => {
                    await Promise.all([
                      loadCompliance(),
                      loadApprovals(),
                      fetchAmortizationTable(),
                    ]);

                    notify(
                      "Evaluación financiera actualizada correctamente.",
                      "success",
                    );
                  }}
                  onViewChecklist={() => setShowDocuments(true)}
                />

                <LoanGuaranteesSection
                  currentClientId={currentClientId}
                  isReadOnly={isReadOnly}
                  guaranteesTotal={guaranteesTotal}
                  onTotalChange={setGuaranteesTotal}
                />

                <LoanAdjudicationSection
                  loanId={loanId}
                  loanData={loanData}
                  onOpenAdjudication={() => setOpenAdjudication(true)}
                />

                <LoanComplianceSection
                  compliance={compliance}
                  loadingCompliance={loadingCompliance}
                  isComplianceValid={isComplianceValid}
                  complianceMissingItems={complianceMissingItems}
                  financialEvaluation={financialEvaluation}
                  clientId={clientId}
                  loanId={loanId}
                />

                <LoanApprovalsSection
                  approvals={approvals}
                  loadingApprovals={loadingApprovals}
                  loanData={loanData}
                  isReadOnly={isReadOnly}
                  pendingCountUI={pendingCountUI}
                  userId={userId}
                  isFormConsistentlyValid={isFormConsistentlyValid}
                  isComplianceValid={isComplianceValid}
                  actionLoading={actionLoading}
                  onRequestApprove={(approvalId) => {
                    setSelectedApprovalId(approvalId);
                    setApproveError("");
                    setConfirmOpen(true);
                  }}
                  onReject={(approvalId) => handleReject(approvalId)}
                  onPrintCommitteeMinutes={handlePrintCommitteeMinutes}
                />

                <LoanAmortizationSection
                  amortizationTable={amortizationTable}
                  totalPaymentAmount={totalPaymentAmount}
                  totalPrincipal={totalPrincipal}
                  totalInterest={totalInterest}
                  totalFee={totalFee}
                  totalInsurance={totalInsurance}
                  totalOtherCharges={totalOtherCharges}
                />

                <LoanPaymentHistorySection loanId={loanId} />

                <Grid item xs={12}>
                  <LoanModificationSection loan={loan} user={user} />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ bgcolor: "white", py: 1, px: 2 }}>
          <CancelLoanDialog
            canCancelLoan={canCancelLoan}
            loanId={loanId}
            loanData={loanData}
            onLoanUpdated={onLoanUpdated}
            onClose={onClose}
            notify={notify}
          />

          <Button onClick={onClose} variant="outlined" size="small">
            Cerrar
          </Button>
        </DialogActions>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={closeSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={closeSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        <ApprovalConfirmationDialog
          open={confirmOpen}
          onClose={() => {
            setApproveError("");
            setConfirmOpen(false);
          }}
          approvalId={selectedApprovalId}
          onApprove={handleApprove}
          onReject={(approvalComment) =>
            handleReject(selectedApprovalId, approvalComment)
          }
          loading={actionLoading}
          error={approveError}
          loan={loan?.data || loan}
          compliance={compliance}
          financialEvaluation={financialEvaluation}
          guaranteesTotal={guaranteesTotal}
          editableAmount={editableAmount}
          editableTerm={editableTerm}
          editableRate={editableRate}
          isComplianceValid={isComplianceValid}
          isFormConsistentlyValid={isFormConsistentlyValid}
          complianceMissingItems={complianceMissingItems}
        />

        <AssetAdjudicationModal
          open={openAdjudication}
          onClose={() => setOpenAdjudication(false)}
          loan={loanData}
          onSuccess={() => {
            setOpenAdjudication(false);
            notify("Adjudicación registrada correctamente.", "success");
          }}
        />

        <ChecklistDialog
          open={showDocuments}
          onClose={handleCloseChecklist}
          customerId={currentClientId}
          customerName={loan?.customer_name}
        />
      </Dialog>

      <QuickPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        loan={loan}
        onSuccess={async () => {
          setPaymentOpen(false);

          await Promise.all([
            fetchAmortizationTable(),
            loadCompliance(),
            loadApprovals(),
          ]);

          notify("Pago registrado correctamente.", "success");
        }}
      />
    </>
  );
};

export default LoanDetailsModal;
