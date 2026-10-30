import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { NumericFormat } from "react-number-format";
import BAC from "../../styles/bac";
import { ModeToggle } from "./AmountOrPercentageField";
import { interestTypeLabel } from "./useLoanForm";

// Tasa de interés del crédito. Para persona natural / prestamista con
// interés flat (canUseFixedInterest) se puede pactar en vez de la tasa un
// MONTO FIJO: el interés total del crédito en C$, repartido en partes
// iguales entre las cuotas. En ese modo loan.interest_rate muestra la tasa
// mensual equivalente (la deriva useLoanForm) y el backend la recalcula con
// precisión completa desde interest_fixed_amount.
const InterestRateField = ({ loan, errors = {}, handleInputChange, canUseFixedInterest, sx }) => {
  const typeText = interestTypeLabel(loan.interest_type_id).toLowerCase();
  const isFixed = canUseFixedInterest && loan.interest_input_mode === "FIXED_AMOUNT";

  const toggle = canUseFixedInterest ? (
    <ModeToggle
      mode={isFixed ? "amount" : "percentage"}
      onChange={(value) =>
        handleInputChange({ target: { name: "interest_input_mode", value: value === "amount" ? "FIXED_AMOUNT" : "RATE" } })
      }
    />
  ) : null;

  if (isFixed) {
    return (
      <NumericFormat
        customInput={TextField}
        label="Interés total del crédito"
        variant="outlined"
        name="interest_fixed_amount"
        value={loan.interest_fixed_amount}
        onValueChange={({ value }) => handleInputChange({ target: { name: "interest_fixed_amount", value } })}
        thousandSeparator
        decimalSeparator="."
        decimalScale={2}
        fixedDecimalScale
        error={!!errors.interest_fixed_amount || !!errors.interest_rate}
        helperText={
          errors.interest_fixed_amount ||
          errors.interest_rate ||
          `Equivale a ${Number(loan.interest_rate || 0).toFixed(2)}% mensual (${typeText})`
        }
        size="small"
        fullWidth
        sx={sx}
        InputProps={{ startAdornment: toggle }}
      />
    );
  }

  return (
    <NumericFormat
      customInput={TextField}
      label={`Tasa de interés mensual (${typeText})`}
      variant="outlined"
      name="interest_rate"
      value={loan.interest_rate}
      onValueChange={({ value }) => handleInputChange({ target: { name: "interest_rate", value } })}
      thousandSeparator
      decimalSeparator="."
      decimalScale={2}
      fixedDecimalScale
      error={!!errors.interest_rate}
      helperText={errors.interest_rate}
      size="small"
      fullWidth
      sx={sx}
      InputProps={{
        startAdornment: toggle,
        endAdornment: (
          <InputAdornment position="end" sx={{ color: `var(--cm-primary-text, ${BAC.primary})`, fontWeight: 900 }}>
            %
          </InputAdornment>
        ),
      }}
    />
  );
};

export default InterestRateField;
