import React from "react";
import {
  Grid,
  TextField,
  MenuItem,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const LoanExtraFields = ({
  formData,
  handleChange,
  catalogs = {},
  errors = {},
}) => {
  const {
    clasificacionesCredito = [],
    tiposCredito = [],
    destinosCredito = [],
    garantias = [],
    lineas = [],
    modalidadesCredito = [],
    monedas = [],
    municipios = [],
    oficinas = [],
    origenesRecursos = [],
    periodosCobroInteres = [],
    periodosCobroPrincipal = [],
    sindicados = [],
    situacionesCredito = [],
    tiposAgrupacionCredito = [],
    sectoresEconomicos = [],
    metodosAtencion = [],
    tiposZona = [],
    estadosCredito = [],
    analistas = [],
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
      value={formData[name] ?? ""}
      onChange={handleChange}
      error={!!errors[name]}
      helperText={errors[name] || ""}
      InputLabelProps={{ shrink: true }}
    >
      <MenuItem value="">Seleccione</MenuItem>
      {options.map((item, index) => {
        const optionValue = item?.[valueKey] ?? item?.id ?? item?.value ?? "";
        const optionLabel =
          item?.[labelKey] ??
          item?.name ??
          item?.label ??
          item?.description ??
          item?.descripcion ??
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
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_clasificacion_credito",
                label: "Clasificación crédito",
                options: clasificacionesCredito,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_tipo_credito",
                label: "Tipo crédito",
                options: tiposCredito,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_destino_credito",
                label: "Destino crédito",
                options: destinosCredito,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_garantia",
                label: "Garantía",
                options: garantias,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_linea",
                label: "Línea",
                options: lineas,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_modalidad_credito",
                label: "Modalidad crédito",
                options: modalidadesCredito,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_moneda",
                label: "Moneda",
                options: monedas,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_municipio",
                label: "Municipio",
                options: municipios,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_oficina",
                label: "Oficina",
                options: oficinas,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_origen_recursos",
                label: "Origen recursos",
                options: origenesRecursos,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_periodo_cobro_interes",
                label: "Período cobro interés",
                options: periodosCobroInteres,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_periodo_cobro_principal",
                label: "Período cobro principal",
                options: periodosCobroPrincipal,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_sindicado",
                label: "Sindicado",
                options: sindicados,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_situacion_credito",
                label: "Situación crédito",
                options: situacionesCredito,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_tipo_agrupacion_credito",
                label: "Tipo agrupación crédito",
                options: tiposAgrupacionCredito,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_sector_economico",
                label: "Sector económico",
                options: sectoresEconomicos,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_met_atencion",
                label: "Método atención",
                options: metodosAtencion,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_tipo_zona",
                label: "Tipo zona",
                options: tiposZona,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_estado_credito",
                label: "Estado crédito",
                options: estadosCredito,
              })}
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              {renderSelect({
                name: "id_analista",
                label: "Analista",
                options: analistas,
              })}
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default LoanExtraFields;
