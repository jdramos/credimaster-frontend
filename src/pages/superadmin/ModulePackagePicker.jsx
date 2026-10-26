import React from "react";
import {
  Alert,
  Box,
  Checkbox,
  FormControlLabel,
  FormGroup,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { applyPackage, effectiveModules, extraModules, labelOf, lockReason, toggleModule } from "./modulePackages";

// Paquete comercial + módulos sueltos de una empresa. Al elegir el paquete
// se marcan sus módulos; luego se pueden sumar otros. Las dependencias se
// marcan solas y no se puede quitar un módulo que otro necesita ni, en una
// empresa normada, uno obligatorio por la norma.
//
// `accountingCutover` (solo al editar): la empresa no tenía contabilidad y
// ahora sí; se pide la fecha desde la que se contabiliza.
export default function ModulePackagePicker({
  catalog,
  modulePackage,
  enabledModules,
  conamiRegulated,
  onChange,
  accountingCutover = null,
}) {
  const rules = { conamiRegulated: !!conamiRegulated };
  const packages = catalog?.packages || [];
  const currentPackage = packages.find((p) => p.key === modulePackage);
  const selected = effectiveModules(enabledModules, catalog);
  const extras = extraModules(modulePackage, enabledModules, catalog);

  const handlePackageChange = (e) => {
    const key = e.target.value;
    onChange({ module_package: key, enabled_modules: applyPackage(key, catalog, rules) });
  };

  const handleToggle = (key) => {
    onChange({ module_package: modulePackage, enabled_modules: toggleModule(key, enabledModules, catalog, rules) });
  };

  return (
    <Box>
      <TextField
        select
        label="Paquete"
        size="small"
        value={modulePackage || ""}
        onChange={handlePackageChange}
        sx={{ minWidth: 280, mb: 1 }}
        inputProps={{ "data-testid": "module-package-select" }}
        helperText={currentPackage?.description}
      >
        {packages.map((p) => (
          <MenuItem key={p.key} value={p.key}>
            {p.label}
          </MenuItem>
        ))}
      </TextField>

      {extras.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Módulos sueltos agregados al paquete: {extras.map((k) => labelOf(catalog, k)).join(", ")}
        </Typography>
      )}
      {conamiRegulated && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Empresa normada por la CONAMI: contabilidad, cumplimiento LA/FT, ICC, ISC, Sin Riesgo, clasificación NGRC y riesgo tecnológico son obligatorios.
        </Typography>
      )}

      <FormGroup row>
        {(catalog?.modules || []).map((mod) => {
          const checked = selected.includes(mod.key);
          const reason = checked ? lockReason(mod.key, enabledModules, catalog, rules) : null;
          const control = (
            <FormControlLabel
              key={mod.key}
              control={
                <Checkbox
                  size="small"
                  checked={checked}
                  disabled={!!reason}
                  onChange={() => handleToggle(mod.key)}
                  inputProps={{ "aria-label": mod.label }}
                />
              }
              label={mod.label}
            />
          );
          return reason ? (
            <Tooltip key={mod.key} title={reason}>
              <span>{control}</span>
            </Tooltip>
          ) : (
            control
          );
        })}
      </FormGroup>

      {accountingCutover && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            La empresa empieza a llevar contabilidad. Desde la fecha de corte se contabilizan desembolsos, pagos, devengo y
            provisión; lo anterior no se contabiliza. Antes de operar, cargue los saldos iniciales en Migrar datos → Saldos de
            apertura.
          </Typography>
          <TextField
            type="date"
            size="small"
            label="Fecha de corte contable"
            value={accountingCutover.value || ""}
            onChange={(e) => accountingCutover.onChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ "data-testid": "accounting-since" }}
          />
        </Alert>
      )}
    </Box>
  );
}
