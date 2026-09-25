import React from "react";
import {
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
  Alert,
  Tooltip,
  IconButton,
  Chip,
  Stack,
} from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import { Muted, CompactAccordion, Pill } from "./primitives";

dayjs.extend(utc);

const LoanApprovalsSection = ({
  approvals = [],
  loadingApprovals,
  loanData,
  isReadOnly,
  pendingCountUI,
  userId,
  isFormConsistentlyValid,
  isComplianceValid,
  actionLoading,
  onRequestApprove,
  onReject,
  onPrintCommitteeMinutes,
}) => (
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
          <Chip
            label={
              loanData?.requires_committee
                ? "Comité de Crédito"
                : "Aprobador único"
            }
            size="small"
            color={loanData?.requires_committee ? "secondary" : "default"}
            variant="outlined"
          />
        </>
      }
    >
      {Boolean(loanData?.requires_committee) && isReadOnly && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DescriptionIcon />}
            onClick={onPrintCommitteeMinutes}
          >
            Imprimir Acta de Comité
          </Button>
        </Box>
      )}
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
        <Alert severity="warning">No hay aprobaciones registradas.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell sx={{ fontWeight: 800 }}>Aprobador</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Fecha</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {approvals.map((a, idx) => {
                const canAct =
                  String(a.status).toUpperCase() === "PENDING" &&
                  Number(userId) === Number(a.approver_id);

                const approveTooltip = !isFormConsistentlyValid
                  ? "Corrige monto, plazo, tasa o valor de garantías"
                  : !isComplianceValid
                    ? "Faltan requisitos de cumplimiento CONAMI"
                    : "Aprobar solicitud";

                return (
                  <TableRow key={a.id || idx} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                        {a.full_name}
                      </Typography>
                      <Muted variant="caption">ID: {a.approver_id}</Muted>
                    </TableCell>

                    <TableCell>
                      <Pill status={a.status} />
                    </TableCell>

                    <TableCell>
                      {a.updated_at
                        ? dayjs
                            .utc(a.updated_at)
                            .local()
                            .format("DD/MM/YYYY HH:mm")
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
                                onClick={() => onRequestApprove(a.id)}
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

                          <Tooltip title="Rechazar solicitud" arrow>
                            <span>
                              <IconButton
                                color="error"
                                onClick={() => onReject(a.id)}
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
);

export default LoanApprovalsSection;
