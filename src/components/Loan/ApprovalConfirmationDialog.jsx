// ApprovalConfirmationDialog.jsx
import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CommentIcon from "@mui/icons-material/Comment";

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("es-NI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ApprovalConfirmationDialog({
  open,
  onClose,
  onApprove,
  onReject,
  loading = false,

  loan,
  financialEvaluation,
  guaranteesTotal = 0,

  editableAmount = 0,
  editableTerm = 0,
  editableRate = 0,

  isComplianceValid = false,
  isFormConsistentlyValid = false,
  complianceMissingItems = [],
}) {
  const [approvalComment, setApprovalComment] = useState("");

  const score = Number(financialEvaluation?.final_score || 0);

  const coverage = useMemo(() => {
    const amount = Number(editableAmount || 0);
    const guarantees = Number(guaranteesTotal || 0);
    if (amount <= 0) return 0;
    return (guarantees / amount) * 100;
  }, [editableAmount, guaranteesTotal]);

  const isReadyToApprove = isComplianceValid && isFormConsistentlyValid;

  const handleApproveClick = async () => {
    if (!isReadyToApprove || loading) return;

    await onApprove?.(approvalComment);

    setApprovalComment("");
  };

  const handleRejectClick = async () => {
    if (loading) return;
    await onReject?.(approvalComment);
    setApprovalComment("");
  };

  const handleClose = () => {
    if (loading) return;
    setApprovalComment("");
    onClose?.();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Confirmar aprobación de crédito
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Revisa la información del cliente antes de tomar una decisión.
            </Typography>
          </Box>

          <Chip
            color={isReadyToApprove ? "success" : "error"}
            label={
              isReadyToApprove
                ? "APTO PARA APROBACIÓN"
                : "NO APTO PARA APROBACIÓN"
            }
            sx={{ fontWeight: 800 }}
          />
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {!isComplianceValid && (
          <Alert severity="error" sx={{ mb: 2 }}>
            No puedes aprobar este crédito porque faltan requisitos
            regulatorios.
          </Alert>
        )}

        {!isFormConsistentlyValid && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Revisa monto, plazo, tasa o valor de garantías antes de aprobar.
          </Alert>
        )}

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
            Información del cliente
          </Typography>

          <Grid container spacing={1.3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Cliente:</b> {loan?.customer_name || "N/D"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Identificación:</b>{" "}
                {loan?.customer_identification || loan?.identification || "N/D"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Sucursal:</b> {loan?.branch_name || "N/D"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Promotor:</b> {loan?.promoter_name || "N/D"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Actividad/negocio:</b>{" "}
                {financialEvaluation?.business_location ||
                  loan?.business_name ||
                  "N/D"}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Años en negocio:</b>{" "}
                {financialEvaluation?.years_in_business || 0}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
            Condiciones del crédito
          </Typography>

          <Grid container spacing={1.3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Monto a aprobar:</b> C$ {formatMoney(editableAmount)}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Plazo:</b> {editableTerm} meses
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Tasa:</b> {Number(editableRate || 0).toFixed(2)}%
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Garantías:</b> C$ {formatMoney(guaranteesTotal)}
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Cobertura garantía:</b> {coverage.toFixed(2)}%
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                <b>Destino:</b> {loan?.loan_purpose || "N/D"}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {!!financialEvaluation && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography sx={{ fontWeight: 900, mb: 1.5 }}>
              Evaluación crediticia
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip
                color={
                  score >= 80 ? "success" : score >= 60 ? "warning" : "error"
                }
                label={`Score: ${score}`}
              />

              <Chip
                color="info"
                label={`Riesgo: ${financialEvaluation?.risk_level || "N/D"}`}
              />

              <Chip
                color={
                  financialEvaluation?.recommendation === "APROBAR"
                    ? "success"
                    : "warning"
                }
                label={`Recomendación: ${
                  financialEvaluation?.recommendation || "N/D"
                }`}
              />

              <Chip
                color={
                  financialEvaluation?.bureau_result === "LIMPIO"
                    ? "success"
                    : "warning"
                }
                label={`Buró: ${financialEvaluation?.bureau_result || "N/D"}`}
              />
            </Stack>

            <Grid container spacing={1.3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  <b>Ingresos:</b> C${" "}
                  {formatMoney(financialEvaluation?.total_income)}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  <b>Gastos:</b> C${" "}
                  {formatMoney(financialEvaluation?.total_expenses)}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  <b>Flujo disponible:</b> C${" "}
                  {formatMoney(financialEvaluation?.available_cash_flow)}
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="body2">
                  <b>Cuota propuesta:</b> C${" "}
                  {formatMoney(financialEvaluation?.proposed_installment)}
                </Typography>
              </Grid>
            </Grid>

            {!!financialEvaluation?.analyst_comment && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CommentIcon sx={{ fontSize: 18 }} />
                  <strong>Comentario del analista</strong>
                </Stack>

                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {financialEvaluation.analyst_comment}
                </Typography>
              </Alert>
            )}
          </Paper>
        )}

        {!isComplianceValid && complianceMissingItems.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>
              Pendientes de cumplimiento
            </Typography>

            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {complianceMissingItems.map((item, index) => (
                <li key={index}>
                  <Typography variant="body2">{item}</Typography>
                </li>
              ))}
            </Box>
          </Paper>
        )}

        <Divider sx={{ my: 2 }} />

        <TextField
          fullWidth
          multiline
          minRows={3}
          label="Comentario del aprobador"
          placeholder="Escribe una observación opcional para esta decisión..."
          value={approvalComment}
          onChange={(e) => setApprovalComment(e.target.value)}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>
          Cancelar
        </Button>

        {onReject && (
          <Button
            onClick={handleRejectClick}
            color="error"
            variant="outlined"
            disabled={loading}
          >
            Rechazar
          </Button>
        )}

        <Button
          onClick={handleApproveClick}
          variant="contained"
          disabled={!isReadyToApprove || loading}
        >
          Aprobar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
