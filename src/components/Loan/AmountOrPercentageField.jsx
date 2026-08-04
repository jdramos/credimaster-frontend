import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { NumericFormat } from "react-number-format";
import BAC from "../../styles/bac";

// Campo compartido por LoanAddGpt.jsx y LoanAddWizard.jsx para comisión,
// cargos administrativos y deducción: cada uno puede capturarse como un
// monto fijo en córdobas o como un porcentaje del monto del crédito (con
// el porcentaje por defecto configurable en políticas de crédito vía
// useLoanForm/handleChargeModeChange). El toggle C$/% vive DENTRO del campo
// (como adornment, en vez de en una fila aparte) para que la altura y la
// alineación con los campos vecinos sea idéntica a la de un TextField normal.
const toggleSx = {
  height: 24,
  mr: 0.5,
  "& .MuiToggleButton-root": {
    px: 0.7,
    py: 0,
    fontSize: 10,
    fontWeight: 800,
    lineHeight: 1,
    color: BAC.primary,
  },
};

const ModeToggle = ({ mode, onChange }) => (
  <ToggleButtonGroup
    size="small"
    exclusive
    value={mode}
    onChange={(e, value) => value && onChange(value)}
    onMouseDown={(e) => e.preventDefault()}
    sx={toggleSx}
  >
    <ToggleButton value="amount">C$</ToggleButton>
    <ToggleButton value="percentage">%</ToggleButton>
  </ToggleButtonGroup>
);

const AmountOrPercentageField = ({
  label,
  field,
  loan,
  errors = {},
  handleInputChange,
  handleChargeModeChange,
  sx,
}) => {
  const mode = loan[`${field}_mode`] || "amount";
  const percentageValue = loan[`${field}_percentage`];
  const error = errors[field];

  const onModeChange = (value) => handleChargeModeChange(field, value);

  const equivalentAmount =
    (Number(loan.amount || 0) * Number(percentageValue || 0)) / 100;

  if (mode === "percentage") {
    return (
      <NumericFormat
        customInput={TextField}
        label={label}
        variant="outlined"
        name={`${field}_percentage`}
        value={percentageValue}
        onValueChange={({ value }) =>
          handleInputChange({ target: { name: `${field}_percentage`, value } })
        }
        thousandSeparator
        decimalSeparator="."
        decimalScale={2}
        fixedDecimalScale
        error={!!error}
        helperText={
          error ||
          `Equivale a C$ ${equivalentAmount.toLocaleString("es-NI", {
            minimumFractionDigits: 2,
          })}`
        }
        size="small"
        fullWidth
        sx={sx}
        InputProps={{
          startAdornment: <ModeToggle mode={mode} onChange={onModeChange} />,
          endAdornment: (
            <InputAdornment position="end" sx={{ color: BAC.primary, fontWeight: 900 }}>
              %
            </InputAdornment>
          ),
        }}
      />
    );
  }

  return (
    <NumericFormat
      customInput={TextField}
      label={label}
      variant="outlined"
      name={field}
      value={loan[field]}
      onValueChange={({ value }) => handleInputChange({ target: { name: field, value } })}
      thousandSeparator
      decimalSeparator="."
      decimalScale={2}
      fixedDecimalScale
      error={!!error}
      helperText={error}
      size="small"
      fullWidth
      sx={sx}
      InputProps={{
        startAdornment: <ModeToggle mode={mode} onChange={onModeChange} />,
      }}
    />
  );
};

export default AmountOrPercentageField;
