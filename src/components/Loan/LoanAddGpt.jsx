import { ToastContainer } from "react-toastify";
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
import GuarenteesGet from "../GuarenteesGet";
import dayjs from "dayjs";
import BranchSelect from "../BranchSelect";
import LoanAmortization from "../LoanAmortization";
import Visibility from "@mui/icons-material/Visibility";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import CustomerFinancialEvaluationTab from "../Customer/CustomerFinancialEvaluationTab";
import CustomerChecklist from "../Customer/CustomerCheckList";
import BAC from "../../styles/bac";
import LoanExtraFields from "./LoanExtraFields";
import useLoanForm from "./useLoanForm";
import AmountOrPercentageField from "./AmountOrPercentageField";

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
  const {
    canCreateLoan,
    canEditLoan,
    isEditMode,
    errors,
    loading,
    loan,
    catalogs,
    guaranteeValue,
    amortizationTable,
    installment,
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    setSnackbarOpen,
    evaluations,
    openDialog,
    setOpenDialog,
    cancelDialog,
    docSummary,
    showCustomerDocs,
    setShowCustomerDocs,
    activeLoansSummary,
    evaluationViewForm,
    setEvaluationViewForm,
    evaluationModalOpen,
    setEvaluationModalOpen,
    selectedEvaluation,
    evaluationCustomer,
    handleInputChange,
    handleChargeModeChange,
    handleSubmit,
    handleDialogConfirmation,
    handleCancel,
    urlGuarantee,
    totalPaymentAmount,
    totalPrincipal,
    totalInterest,
    totalFee,
    totalInsurance,
    totalOtherCharges,
  } = useLoanForm();

  return (
    <Box sx={{ background: BAC.bg, minHeight: "calc(100vh - 64px)", p: { xs: 1, sm: 2 } }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          p: { xs: 1.5, sm: 2 },
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
          gap={1.5}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, fontSize: { xs: 20, sm: 24 } }}>
              {isEditMode ? "Editar solicitud de crédito" : "Solicitud de préstamos."}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              {isEditMode
                ? "Este crédito aún no ha sido aprobado. Puede corregir los datos antes de que se resuelva la aprobación."
                : "Complete los datos y verifique amortización, evaluación y garantías."}
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
            mt: { xs: 1.5, sm: 2 },
            p: { xs: 1.5, sm: 2 },
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

          <Divider sx={{ my: 1.5, borderColor: BAC.border }} />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              alignItems: "start",
              gap: { xs: 1.5, sm: 2 },
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
                customer_name={loan.customer_name}
                customer_identification={loan.customer_identification}
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
              mt: { xs: 1.5, sm: 2 },
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "repeat(3, 1fr)",
                lg: "repeat(5, 1fr)",
              },
              gap: { xs: 1.5, sm: 2 },
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

            <AmountOrPercentageField
              label="Comisión por desembolso"
              field="fee"
              loan={loan}
              errors={errors}
              handleInputChange={handleInputChange}
              handleChargeModeChange={handleChargeModeChange}
              sx={fieldSx}
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

            <AmountOrPercentageField
              label="Cargos administrativos"
              field="other_charges"
              loan={loan}
              errors={errors}
              handleInputChange={handleInputChange}
              handleChargeModeChange={handleChargeModeChange}
              sx={fieldSx}
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

            <AmountOrPercentageField
              label="Deducción"
              field="deduction"
              loan={loan}
              errors={errors}
              handleInputChange={handleInputChange}
              handleChargeModeChange={handleChargeModeChange}
              sx={fieldSx}
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
          </Box>

          <LoanExtraFields
            formData={loan}
            handleChange={handleInputChange}
            catalogs={catalogs}
            errors={errors}
          />

          {!!activeLoansSummary?.count && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              <Typography sx={{ fontWeight: 800 }}>
                Este cliente tiene {activeLoansSummary.count} crédito
                {activeLoansSummary.count === 1 ? "" : "s"} activo
                {activeLoansSummary.count === 1 ? "" : "s"} con saldo
                pendiente de C${" "}
                {Number(activeLoansSummary.total_balance || 0).toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                )}
                . Considere esta deuda al evaluar su capacidad de pago.
              </Typography>

              <Stack spacing={0.5} sx={{ mt: 1 }}>
                {activeLoansSummary.loans.map((l) => (
                  <Typography key={l.id} variant="body2">
                    Crédito #{l.id} ({l.branch_name || "—"}) — desembolsado{" "}
                    {l.disbursement_date
                      ? dayjs(l.disbursement_date).format("DD/MM/YYYY")
                      : "—"}{" "}
                    — saldo C${" "}
                    {Number(l.current_balance || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                ))}
              </Stack>
            </Alert>
          )}

          <Box
            sx={{
              mt: { xs: 1.5, sm: 2 },
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: { xs: 1.5, sm: 2 },
              alignItems: "start",
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                border: `1px solid ${BAC.border}`,
                background: BAC.soft,
                height: "100%",
              }}
            >
              <Typography sx={{ fontWeight: 900, color: BAC.text, mb: 1 }}>
                Garantías del cliente
              </Typography>

              <GuarenteesGet
                apiUrl={`${urlGuarantee}/${loan.customer_id}`}
                totalGuaranteeValue={guaranteeValue}
              />
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                border: `1px solid ${BAC.border}`,
                background: BAC.soft,
                height: "100%",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={1}
                flexWrap="wrap"
                gap={1}
              >
                <Typography sx={{ fontWeight: 900, color: BAC.text }}>
                  Documentación del cliente
                </Typography>

                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setShowCustomerDocs(true)}
                  disabled={!loan.customer_id}
                  sx={{
                    fontWeight: 700,
                    borderRadius: 2,
                    borderColor: "rgba(0,87,184,0.35)",
                    color: BAC.primary,
                    "&:hover": { borderColor: BAC.primary, bgcolor: BAC.white },
                  }}
                >
                  Ver documentos
                </Button>
              </Stack>
              {errors.documents && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                  {errors.documents}
                </Alert>
              )}
              {docSummary ? (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`Requeridos: ${docSummary.total_required || 0}`}
                  />
                  <Chip
                    label={`Cargados: ${docSummary.uploaded || 0}`}
                    sx={{
                      bgcolor: "#FFF3E0",
                      color: "#ED6C02",
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    label={`Verificados: ${docSummary.verified || 0}`}
                    sx={{
                      bgcolor: "#E8F5E9",
                      color: "#2E7D32",
                      fontWeight: 700,
                    }}
                  />
                  <Chip
                    label={`Faltantes: ${docSummary.missing || 0}`}
                    sx={{
                      bgcolor:
                        Number(docSummary.missing || 0) > 0
                          ? "#FEE2E2"
                          : "#E8F5E9",
                      color:
                        Number(docSummary.missing || 0) > 0
                          ? "#B42318"
                          : "#2E7D32",
                      fontWeight: 700,
                    }}
                  />
                </Stack>
              ) : (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  No hay información documental disponible para este cliente.
                </Alert>
              )}
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

        <Box
          sx={{
            mt: 2,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1,
          }}
        >
          {(isEditMode ? canEditLoan : canCreateLoan) && (
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              sx={{
                borderRadius: 2,
                fontWeight: 900,
                px: 4,
                width: { xs: "100%", sm: "auto" },
                bgcolor: BAC.primary,
                "&:hover": { bgcolor: BAC.primaryDark },
              }}
            >
              {isEditMode ? "Guardar cambios" : "Guardar"}
            </Button>
          )}

          <Button
            onClick={handleCancel}
            variant="outlined"
            startIcon={<Cancel />}
            sx={{
              borderRadius: 2,
              fontWeight: 900,
              px: 4,
              width: { xs: "100%", sm: "auto" },
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
        onConfirm={handleDialogConfirmation}
        type={cancelDialog ? "warning" : "info"}
        title={cancelDialog ? "Cancelar registro" : "Confirmar guardado"}
        message={
          cancelDialog
            ? "¿Está seguro que desea cancelar? Se perderán los cambios realizados."
            : "¿Está seguro que desea guardar esta sucursal?"
        }
        confirmText={cancelDialog ? "Sí, cancelar" : "Sí, guardar"}
        cancelText="No"
        loading={loading}
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
              form={evaluationViewForm}
              setForm={setEvaluationViewForm}
              customerId={loan.customer_id}
              customerIdentification={loan.customer_identification}
              customerName={loan.customer_name}
              readOnly
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
