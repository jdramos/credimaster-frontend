import React from "react";
import {
  Typography,
  Grid,
  Divider,
  Chip,
  Stack,
  Avatar,
} from "@mui/material";
import dayjs from "dayjs";
import PersonIcon from "@mui/icons-material/Person";
import LoanInfo from "../../LoanInfo";
import { Muted, CompactCard, formatMoney } from "./primitives";

const LoanClientInfoSection = ({
  loan,
  loanData,
  currentIdentification,
  editableAmount,
  editableTerm,
  editableRate,
}) => {
  const source = String(loanData?.source || "").toUpperCase();

  return (
    <Grid item xs={14}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Avatar sx={{ width: 24, height: 24, bgcolor: "primary.light" }}>
          <PersonIcon sx={{ fontSize: 16 }} />
        </Avatar>

        <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
          Información del cliente
        </Typography>
      </Stack>
      <CompactCard>
        <Grid container spacing={0.5} alignItems="center">
          <Grid item xs={14} md={2}>
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
              {loanData.customer_name}
            </Typography>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              {currentIdentification}
            </Muted>
          </Grid>

          <Grid item xs={6} md={1.5}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Monto
            </Muted>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
              C$ {formatMoney(editableAmount)}
            </Typography>
          </Grid>

          <Grid item xs={4} md={1}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Plazo
            </Muted>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
              {editableTerm} meses
            </Typography>
          </Grid>

          <Grid item xs={4} md={1}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Tasa
            </Muted>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
              {Number(editableRate || 0).toFixed(2)}%
            </Typography>
          </Grid>

          <Grid item xs={4} md={1}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Cuota
            </Muted>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
              C$ {formatMoney(loanData.installment || 0)}
            </Typography>
          </Grid>

          <Grid item xs={6} md={2}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Próxima cuota
            </Muted>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
              {loanData.next_payment_date
                ? dayjs(loanData.next_payment_date).format("DD/MM/YY")
                : "N/A"}
            </Typography>
            {loanData.next_payment_date && (
              <Muted variant="caption" sx={{ fontSize: 11 }}>
                C$ {formatMoney(loanData.next_installment_amount || 0)}
              </Muted>
            )}
          </Grid>

          <Grid item xs={4} md={2}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Vence
            </Muted>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
              {loanData.cancellation_date
                ? dayjs(loan.cancellation_date).format("DD/MM/YY")
                : "N/A"}
            </Typography>
          </Grid>

          <Grid item xs={4} md={3.3}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Sucursal / Promotor
            </Muted>
            <Typography sx={{ fontWeight: 700, fontSize: 12 }}>
              {loanData.branch_name ?? "No asignada"}
            </Typography>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              {loanData.promoter_name ?? "No asignado"}
            </Muted>
          </Grid>

          <Grid item xs={6} md={1.5}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Comisión
            </Muted>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
              C$ {formatMoney(loanData.fee || 0)}
            </Typography>
          </Grid>

          <Grid item xs={6} md={1.5}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Seguro
            </Muted>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
              C$ {formatMoney(loanData.insurance || 0)}
            </Typography>
          </Grid>

          <Grid item xs={6} md={1.5}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Otros cargos
            </Muted>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
              C$ {formatMoney(loanData.other_charges || 0)}
            </Typography>
          </Grid>

          <Grid item xs={6} md={1.5}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Deducción
            </Muted>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
              C$ {formatMoney(loanData.deduction || 0)}
            </Typography>
          </Grid>

          <Grid item xs={6} md={1.5}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Código
            </Muted>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>
              {loanData.credit_code || "—"}
            </Typography>
          </Grid>

          <Grid item xs={6} md={2}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Vendedor
            </Muted>
            <Typography sx={{ fontWeight: 700, fontSize: 12 }}>
              {loanData.vendor_name || "No asignado"}
            </Typography>
          </Grid>

          <Grid item xs={12} md={2.5}>
            <Muted variant="caption" sx={{ fontSize: 11 }}>
              Creado por
            </Muted>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography sx={{ fontWeight: 700, fontSize: 12 }}>
                {loanData.created_by_name || "—"}
              </Typography>

              {source ? (
                <Chip
                  label={source}
                  size="small"
                  variant="outlined"
                  color={source === "MOBILE" ? "info" : "default"}
                  sx={{
                    height: 18,
                    "& .MuiChip-label": {
                      fontSize: 10,
                      px: 0.75,
                      fontWeight: 800,
                    },
                  }}
                />
              ) : null}
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 1.25 }} />

        <LoanInfo clientId={loanData.customer_id} loanId={loanData.id} />
      </CompactCard>
    </Grid>
  );
};

export default LoanClientInfoSection;
