import React, { forwardRef, useImperativeHandle, useMemo } from "react";
import {
  Alert,
  Box,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const fields = [
  {
    key: "business_type_name",
    scoreKey: "business_type_name",
    label: "Actividad económica del cliente",
    weight: 50,
  },
  {
    key: "total_loans",
    scoreKey: "total_loans",
    label: "Tipo de cliente",
    weight: 10,
    formatValue: (customer) => {
      const totalLoans = Number(customer?.total_loans || 0);
      if (totalLoans <= 1) return "Cliente ocasional";
      if (totalLoans <= 3) return "Cliente recurrente";
      return "Cliente frecuente";
    },
  },
  {
    key: "productOrService",
    scoreKey: "productOrService",
    label: "Producto / Servicio",
    weight: 10,
  },
  {
    key: "creditLimit",
    scoreKey: "creditLimit",
    label: "Límite de crédito",
    weight: 10,
  },
  {
    key: "chanel",
    scoreKey: "chanel",
    label: "Canal de distribución",
    weight: 10,
  },
  {
    key: "province_name",
    scoreKey: "province_name",
    label: "Zona geográfica",
    weight: 10,
  },
];

const getScoreColor = (score) => {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "error";
};

const getRiskLabel = (score) => {
  if (score >= 80) return "Riesgo bajo";
  if (score >= 60) return "Riesgo medio";
  return "Riesgo alto";
};

const getRecommendation = (score) => {
  if (score >= 80) return "Perfil favorable";
  if (score >= 60) return "Requiere revisión";
  return "Perfil sensible";
};

const numberFormat = (value) => {
  const n = Number(value || 0);
  return n.toFixed(2);
};

const CustomerEvaluationTab = forwardRef(({ customer = {}, mode }, ref) => {
  const rows = useMemo(() => {
    return fields.map((field) => {
      const rawScore = Number(customer?.scores?.[field.scoreKey] || 0);
      const weightedScore = (rawScore * field.weight) / 100;

      return {
        ...field,
        value: field.formatValue
          ? field.formatValue(customer)
          : customer?.[field.key] || "—",
        rawScore,
        weightedScore,
      };
    });
  }, [customer]);

  const totalScore = useMemo(() => {
    return rows.reduce(
      (total, row) => total + Number(row.weightedScore || 0),
      0,
    );
  }, [rows]);

  const missingScores = useMemo(() => {
    return fields.filter((f) => {
      const value = customer?.scores?.[f.scoreKey];
      return (
        value === undefined ||
        value === null ||
        value === "" ||
        isNaN(Number(value))
      );
    });
  }, [customer]);

  useImperativeHandle(ref, () => ({
    validate: () => {
      if (missingScores.length > 0) {
        return {
          ok: false,
          errors: {
            evaluation_score:
              "No se pudo calcular completamente la evaluación.",
          },
        };
      }

      return { ok: true, errors: {} };
    },

    getTotalScore: () => totalScore,
  }));

  const scoreColor = getScoreColor(totalScore);
  const riskLabel = getRiskLabel(totalScore);
  const recommendation = getRecommendation(totalScore);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <AssessmentIcon color="primary" />
              <Typography variant="h6" fontWeight={900}>
                Evaluación y puntaje ponderado
              </Typography>
            </Stack>

            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Resultado calculado según actividad, historial, producto, canal y
              zona geográfica.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              icon={<TrendingUpIcon />}
              label={`Score ${numberFormat(totalScore)}`}
              color={scoreColor}
              sx={{ fontWeight: 800 }}
            />
            <Chip
              icon={
                scoreColor === "success" ? (
                  <CheckCircleIcon />
                ) : (
                  <WarningAmberIcon />
                )
              }
              label={riskLabel}
              color={scoreColor}
              variant="outlined"
              sx={{ fontWeight: 800 }}
            />
          </Stack>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                height: "100%",
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={700}
              >
                Puntaje total
              </Typography>

              <Typography
                variant="h3"
                fontWeight={900}
                color={`${scoreColor}.main`}
              >
                {numberFormat(totalScore)}
              </Typography>

              <LinearProgress
                variant="determinate"
                value={Math.min(totalScore, 100)}
                color={scoreColor}
                sx={{
                  mt: 1,
                  height: 9,
                  borderRadius: 99,
                }}
              />

              <Typography variant="caption" color="text.secondary">
                Escala de 0 a 100 puntos.
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                height: "100%",
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={700}
              >
                Clasificación
              </Typography>

              <Typography variant="h6" fontWeight={900} mt={1}>
                {riskLabel}
              </Typography>

              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {recommendation}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                height: "100%",
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={700}
              >
                Estado de cálculo
              </Typography>

              <Typography variant="h6" fontWeight={900} mt={1}>
                {missingScores.length === 0 ? "Completo" : "Incompleto"}
              </Typography>

              <Typography variant="body2" color="text.secondary" mt={0.5}>
                {missingScores.length === 0
                  ? "Todos los factores tienen puntaje."
                  : `${missingScores.length} factor(es) sin puntaje.`}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {missingScores.length > 0 && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Hay factores sin puntaje. Revise que el cliente tenga actividad
            económica, zona geográfica y datos de evaluación correctamente
            cargados.
          </Alert>
        )}

        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: "grey.50",
                  "& .MuiTableCell-root": {
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableCell>Factor evaluado</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell align="center">Puntaje</TableCell>
                <TableCell align="center">Peso</TableCell>
                <TableCell align="center">Ponderación</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={800}>
                      {row.label}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {row.value}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={numberFormat(row.rawScore)}
                      color={getScoreColor(row.rawScore)}
                      variant="outlined"
                      sx={{ fontWeight: 800, minWidth: 70 }}
                    />
                  </TableCell>

                  <TableCell align="center">{row.weight}%</TableCell>

                  <TableCell align="center">
                    <Typography variant="body2" fontWeight={900}>
                      {numberFormat(row.weightedScore)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}

              <TableRow
                sx={{
                  bgcolor: "grey.50",
                  "& .MuiTableCell-root": {
                    fontWeight: 900,
                  },
                }}
              >
                <TableCell colSpan={4} align="right">
                  Total ponderado
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="subtitle1"
                    fontWeight={900}
                    color={`${scoreColor}.main`}
                  >
                    {numberFormat(totalScore)}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </Paper>
  );
});

export default CustomerEvaluationTab;
