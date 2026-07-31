import React from "react";
import {
  Box,
  TextField,
  MenuItem,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const toStr = (value) =>
  value === null || value === undefined || value === "" ? "" : String(value);

const LoanExtraFields = ({
  formData,
  handleChange,
  catalogs = {},
  errors = {},
}) => {
  const {
    tiposCredito = [],
    lineas = [],
    modalidadesCredito = [],
    monedas = [],
    origenesRecursos = [],
    sindicados = [],
    tiposAgrupacionCredito = [],
    sectoresEconomicos = [],
    metodosAtencion = [],
    tiposZona = [],
    garantias = [],
  } = catalogs;

  const renderSelect = ({
    name,
    label,
    options,
    valueKey = "id",
    labelKey = "name",
  }) => (
    <TextField
      select
      fullWidth
      size="small"
      name={name}
      label={label}
      value={toStr(formData[name])}
      onChange={(e) =>
        handleChange({
          target: {
            name,
            value: toStr(e.target.value),
          },
        })
      }
      error={!!errors[name]}
      helperText={errors[name] || ""}
      InputLabelProps={{ shrink: true }}
    >
      <MenuItem value="">Seleccione</MenuItem>

      {options.map((item, index) => {
        const optionValue = toStr(
          item?.[valueKey] ?? item?.id ?? item?.value ?? "",
        );

        const optionLabel =
          item?.[labelKey] ??
          item?.name ??
          item?.label ??
          item?.description ??
          item?.descripcion ??
          item?.code ??
          "";

        return (
          <MenuItem key={optionValue || index} value={optionValue}>
            {optionLabel}
          </MenuItem>
        );
      })}
    </TextField>
  );

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        border: "1px solid #e0e0e0",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Datos complementarios del crédito
          </Typography>
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 1 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 1.5,
              width: "100%",
              maxWidth: "100%",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              {renderSelect({
                name: "id_tipo_credito",
                label: "Tipo crédito",
                options: tiposCredito,
              })}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {renderSelect({
                name: "id_linea",
                label: "Línea",
                options: lineas,
              })}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {renderSelect({
                name: "id_modalidad_credito",
                label: "Modalidad crédito",
                options: modalidadesCredito,
              })}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {renderSelect({
                name: "id_moneda",
                label: "Moneda",
                options: monedas,
              })}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {renderSelect({
                name: "id_origen_recursos",
                label: "Origen recursos",
                options: origenesRecursos,
              })}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {renderSelect({
                name: "id_sindicado",
                label: "Sindicado",
                options: sindicados,
              })}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {renderSelect({
                name: "id_tipo_agrupacion_credito",
                label: "Tipo agrupación crédito",
                options: tiposAgrupacionCredito,
              })}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {renderSelect({
                name: "id_sector_economico",
                label: "Sector económico",
                options: sectoresEconomicos,
              })}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {renderSelect({
                name: "id_met_atencion",
                label: "Método atención",
                options: metodosAtencion,
              })}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {renderSelect({
                name: "id_tipo_zona",
                label: "Tipo zona",
                options: tiposZona,
              })}
            </Box>

            <Box sx={{ minWidth: 0 }}>
              {renderSelect({
                name: "id_garantia",
                label: "Garantía",
                options: garantias,
              })}
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default LoanExtraFields;
