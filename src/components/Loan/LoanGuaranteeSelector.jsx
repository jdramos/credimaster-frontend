import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import BAC from "../../styles/bac";

const money = (v) =>
  Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Selector de garantías por crédito: a diferencia de GuarenteesGet (que solo
// muestra el total de garantías del cliente, sin poder elegir cuáles),
// este componente permite marcar todas o algunas garantías disponibles del
// cliente y calcula si la suma de lo seleccionado cubre el % mínimo exigido
// por la política de crédito (min_collateral_coverage) sobre el monto del
// crédito. Las garantías ya comprometidas con otro crédito activo se listan
// pero no se pueden seleccionar.
const LoanGuaranteeSelector = ({
  guarantees = [],
  selectedIds = [],
  onToggle,
  onSelectAll,
  onClear,
  loanAmount = 0,
  selectedValue = 0,
  minCoveragePct = null,
}) => {
  const requiredValue =
    minCoveragePct != null
      ? (Number(loanAmount || 0) * Number(minCoveragePct)) / 100
      : null;
  const coveragePct =
    Number(loanAmount) > 0 ? (Number(selectedValue) / Number(loanAmount)) * 100 : 0;
  const meetsCoverage = requiredValue == null || Number(selectedValue) >= requiredValue;

  if (guarantees.length === 0) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Este cliente no tiene garantías registradas.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={onSelectAll} sx={{ fontWeight: 700, borderRadius: 2 }}>
            Seleccionar todas
          </Button>
          <Button size="small" variant="text" onClick={onClear} sx={{ fontWeight: 700, borderRadius: 2 }}>
            Limpiar
          </Button>
        </Stack>

        <Chip
          label={`Seleccionado: C$ ${money(selectedValue)}`}
          sx={{ bgcolor: BAC.soft, color: BAC.primary, fontWeight: 800 }}
        />
      </Stack>

      <Stack spacing={1}>
        {guarantees.map((g) => {
          const checked = selectedIds.includes(g.id);
          const disabled = !!g.is_committed;

          return (
            <Box
              key={g.id}
              sx={{
                border: `1px solid ${BAC.border}`,
                borderRadius: 2,
                p: 1,
                bgcolor: disabled ? "#F5F5F5" : BAC.white,
                opacity: disabled ? 0.7 : 1,
              }}
            >
              <FormControlLabel
                sx={{ m: 0, width: "100%", alignItems: "flex-start" }}
                control={
                  <Checkbox
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(g.id)}
                    sx={{ pt: 0.5 }}
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: BAC.text }}>
                      {[g.article, g.brand].filter(Boolean).join(" - ") || "Garantía sin descripción"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {g.series ? `Serie: ${g.series} — ` : ""}Valor: C$ {money(g.value)}
                    </Typography>
                    {disabled && (
                      <Typography variant="caption" sx={{ color: "#B42318", fontWeight: 700 }}>
                        Comprometida con crédito #{g.committed_credit_code || g.committed_loan_id}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </Box>
          );
        })}
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      {requiredValue != null ? (
        <Alert severity={meetsCoverage ? "success" : "warning"} sx={{ borderRadius: 2 }}>
          Cobertura: {coveragePct.toFixed(1)}% del monto del crédito (mínimo requerido: {minCoveragePct}%
          {" = "}C$ {money(requiredValue)}).
        </Alert>
      ) : (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No hay una política de cobertura mínima de garantías configurada.
        </Alert>
      )}
    </Box>
  );
};

export default LoanGuaranteeSelector;
