import React from "react";
import {
  Typography,
  Grid,
  CircularProgress,
  Box,
  Alert,
  Chip,
  Stack,
} from "@mui/material";
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
import RiskBureauQueryPanel from "../RiskBureauQueryPanel";
import DebtorMinInfoPanel from "../DebtorMinInfoPanel";
import { CompactAccordion, ComplianceChip } from "./primitives";

const LoanComplianceSection = ({
  compliance,
  loadingCompliance,
  isComplianceValid,
  complianceMissingItems = [],
  financialEvaluation,
  clientId,
  loanId,
}) => (
  <Grid item xs={12}>
    <CompactAccordion
      title="Cumplimiento Normativo (CONAMI)"
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
          No se pudo verificar el cumplimiento normativo del crédito.
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

          {!isComplianceValid && complianceMissingItems.length > 0 && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>
                No se puede aprobar este crédito todavía.
              </Typography>

              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {complianceMissingItems.map((item, index) => (
                  <li key={index}>
                    <Typography variant="body2">{item}</Typography>
                  </li>
                ))}
              </Box>
            </Alert>
          )}

          <RiskBureauQueryPanel
            customerId={clientId}
            loanId={loanId}
            readOnly={false}
          />

          <DebtorMinInfoPanel customerId={clientId} readOnly={false} />
        </>
      )}
    </CompactAccordion>
  </Grid>
);

export default LoanComplianceSection;
