import React from "react";
import { TextField, Box, Paper, Typography, Divider, InputAdornment } from "@mui/material";
import { NumericFormat } from "react-number-format";
import CustomerSelect from "../Customer/CustomerSelect";
import BranchSelect from "../BranchSelect";
import PromoterSelect from "../PromoterSelect";
import CollectorSelect from "../CollectorSelect";
import LoanGroupSelect from "../LoanGroupSelect";
import FrecuencySelect from "../FrecuencySelect";
import GuarenteesGet from "../GuarenteesGet";

const BAC = {
  primary: "#0057B8",
  primaryDark: "#003E8A",
  soft: "#EAF2FF",
  border: "#E6EAF2",
  text: "#0B1F3B",
  muted: "#5B6B7F",
  bg: "#F6F8FC",
  white: "#FFFFFF",
};

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

const LoanForm = ({ state, dispatch, errors, fetchGuarantees }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    dispatch({ type: "SET_FIELD", field: name, value });
  };

  return (
    <Box sx={{ background: BAC.bg, p: 2, borderRadius: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: `1px solid ${BAC.border}`,
          background: BAC.white,
          boxShadow: "0 8px 22px rgba(12, 36, 68, 0.08)",
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: BAC.text }}>Solicitud de crédito</Typography>
            <Typography variant="body2" sx={{ color: BAC.muted }}>
              Complete los datos principales del crédito y verifique garantías del cliente.
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2, borderColor: BAC.border }} />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
            gap: 2,
            alignItems: "start",
          }}
        >
          {/* Fecha */}
          <TextField
            label="Fecha de solicitud"
            type="date"
            name="requestDate"
            value={state.requestDate}
            onChange={handleInputChange}
            error={!!errors.requestDate}
            helperText={errors.requestDate}
            InputLabelProps={{ shrink: true }}
            size="small"
            fullWidth
            sx={fieldSx}
          />

          {/* Sucursal */}
          <Box sx={{ ...fieldSx }}>
            <BranchSelect value={state.branch_id} onChange={handleInputChange} name="branch_id" />
          </Box>

          {/* Cliente */}
          <Box sx={{ ...fieldSx }}>
            <CustomerSelect
              value={state.customer_identification}
              onChange={handleInputChange}
              onBlur={fetchGuarantees}
            />
          </Box>

          {/* Promotor */}
          <Box sx={{ ...fieldSx }}>
            <PromoterSelect value={state.promoter_id} onChange={handleInputChange} />
          </Box>

          {/* Cobrador / Vendedor */}
          <Box sx={{ ...fieldSx }}>
            <CollectorSelect value={state.vendor_id} onChange={handleInputChange} />
          </Box>

          {/* Monto */}
          <NumericFormat
            customInput={TextField}
            label="Monto"
            name="amount"
            value={state.amount}
            onValueChange={({ value }) =>
              dispatch({ type: "SET_FIELD", field: "amount", value })
            }
            thousandSeparator
            decimalScale={2}
            fixedDecimalScale
            error={!!errors.amount}
            helperText={errors.amount}
            size="small"
            fullWidth
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ color: BAC.primary, fontWeight: 900 }}>
                  C$
                </InputAdornment>
              ),
            }}
          />

          {/* Frecuencia */}
          <Box sx={{ ...fieldSx }}>
            <FrecuencySelect value={state.frequency_id} onChange={handleInputChange} />
          </Box>

          {/* Grupo */}
          <Box sx={{ ...fieldSx }}>
            <LoanGroupSelect value={state.loan_group_id} onChange={handleInputChange} />
          </Box>
        </Box>

        {/* Garantías */}
        <Box sx={{ mt: 2 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: `1px solid ${BAC.border}`,
              background: BAC.soft,
            }}
          >
            <Typography sx={{ fontWeight: 900, color: BAC.text, mb: 1 }}>
              Garantías del cliente
            </Typography>

            <GuarenteesGet apiUrl={`/api/guarantees/${state.customer_identification}`} />
          </Paper>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoanForm;