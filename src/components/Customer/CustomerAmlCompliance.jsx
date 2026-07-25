import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Divider,
  CircularProgress,
} from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import API from "../../api";

const BAC = {
  primary: "#D32F2F",
  primaryDark: "#9A2424",
  accent: "#111827",
  success: "#2E7D32",
  warning: "#ED6C02",
  border: "#E5E7EB",
  bgSoft: "#F9FAFB",
};

const Section = ({ title, subtitle, children }) => (
  <Paper
    elevation={0}
    sx={{ p: 2, borderRadius: 2, border: `1px solid ${BAC.border}`, bgcolor: "#fff" }}
  >
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="subtitle2" fontWeight={900}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </Stack>
  </Paper>
);

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-NI");
}

function screeningResultChip(result) {
  const map = {
    CLEAR: { label: "Sin coincidencias", bg: "#E8F5E9", color: BAC.success },
    MATCH: { label: "Coincidencia encontrada", bg: "#FEE2E2", color: "#B42318" },
    PENDING: { label: "Pendiente", bg: "#FFF3E0", color: BAC.warning },
  };
  const s = map[result] || map.PENDING;
  return (
    <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 700 }} />
  );
}

/**
 * Panel de debida diligencia PLA-FT: declaracion PEP, origen de fondos
 * y tamizaje contra listas de sanciones. El tamizaje contra listas de
 * sanciones requiere un cliente ya guardado (customer.id). La declaración
 * PEP, en cambio, se exige al crear el cliente (no es un paso opuesto
 * diferido): en modo creación se guarda en el propio estado `customer` y
 * viaja con el resto del formulario; en modo edición se sigue registrando
 * de forma independiente y auditada vía "Guardar declaración PEP".
 */
const CustomerAmlCompliance = forwardRef(function CustomerAmlCompliance(
  { customer, setCustomer, mode },
  ref,
) {
  const disabled = mode === "show";
  const isCreate = mode !== "edit" && mode !== "show";
  const customerId = customer?.id;

  const [isPep, setIsPep] = useState(
    customer?.is_pep === 1 || customer?.is_pep === true
      ? "yes"
      : customer?.is_pep === 0 || customer?.is_pep === false
        ? "no"
        : "",
  );
  const [pepDetails, setPepDetails] = useState(customer?.pep_details || "");
  const [savingPep, setSavingPep] = useState(false);
  const [pepError, setPepError] = useState("");
  const [pepSuccess, setPepSuccess] = useState("");

  useImperativeHandle(ref, () => ({
    validate: () => {
      if (!isCreate) return { ok: true, errors: {} };

      if (isPep === "") {
        return {
          ok: false,
          errors: { is_pep: "Debe indicar si el cliente es una Persona Expuesta Políticamente." },
        };
      }

      if (isPep === "yes" && !pepDetails.trim()) {
        return {
          ok: false,
          errors: { pep_details: "Describa el cargo o la relación con el cargo público." },
        };
      }

      return { ok: true, errors: {} };
    },
  }));

  const handleIsPepChange = (value) => {
    setIsPep(value);
    setPepError("");

    if (isCreate) {
      setCustomer((prev) => ({
        ...prev,
        is_pep: value === "yes" ? 1 : value === "no" ? 0 : null,
        pep_details: value === "yes" ? prev.pep_details : null,
      }));
    }
  };

  const handlePepDetailsChange = (value) => {
    setPepDetails(value);

    if (isCreate) {
      setCustomer((prev) => ({ ...prev, pep_details: value }));
    }
  };

  const [screenings, setScreenings] = useState([]);
  const [loadingScreenings, setLoadingScreenings] = useState(false);
  const [listName, setListName] = useState("OFAC SDN");
  const [result, setResult] = useState("CLEAR");
  const [notes, setNotes] = useState("");
  const [savingScreening, setSavingScreening] = useState(false);
  const [screeningError, setScreeningError] = useState("");
  const [screeningSuccess, setScreeningSuccess] = useState("");

  const loadScreenings = useCallback(async () => {
    if (!customerId) return;
    setLoadingScreenings(true);
    try {
      const { data } = await API.get(
        `/api/aml/sanctions-screenings/customer/${customerId}`,
      );
      setScreenings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingScreenings(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadScreenings();
  }, [loadScreenings]);

  const handleFundsSourceChange = (e) => {
    setCustomer((prev) => ({ ...prev, funds_source: e.target.value }));
  };

  const handleSavePep = async () => {
    if (!customerId) return;
    if (isPep === "") {
      setPepError("Debe indicar si el cliente es una Persona Expuesta Políticamente.");
      return;
    }
    if (isPep === "yes" && !pepDetails.trim()) {
      setPepError("Describa el cargo o la relación con el cargo público.");
      return;
    }

    try {
      setSavingPep(true);
      setPepError("");
      setPepSuccess("");

      await API.put(`/api/aml/customers/${customerId}/pep-declaration`, {
        is_pep: isPep === "yes",
        pep_details: isPep === "yes" ? pepDetails.trim() : null,
      });

      setPepSuccess("Declaración PEP registrada correctamente.");
      setCustomer((prev) => ({
        ...prev,
        is_pep: isPep === "yes" ? 1 : 0,
        pep_details: isPep === "yes" ? pepDetails.trim() : null,
        pep_declared_at: new Date().toISOString(),
      }));
    } catch (err) {
      console.error(err);
      setPepError(
        err?.response?.data?.message || "No se pudo registrar la declaración PEP.",
      );
    } finally {
      setSavingPep(false);
    }
  };

  const handleAddScreening = async () => {
    if (!customerId) return;
    if (!listName.trim()) {
      setScreeningError("Indique la lista consultada (ej. OFAC SDN, ONU).");
      return;
    }

    try {
      setSavingScreening(true);
      setScreeningError("");
      setScreeningSuccess("");

      await API.post("/api/aml/sanctions-screenings", {
        customer_id: customerId,
        list_name: listName.trim(),
        result,
        notes: notes.trim() || null,
      });

      setScreeningSuccess("Tamizaje registrado correctamente.");
      setNotes("");
      await loadScreenings();
    } catch (err) {
      console.error(err);
      setScreeningError(
        err?.response?.data?.message || "No se pudo registrar el tamizaje.",
      );
    } finally {
      setSavingScreening(false);
    }
  };

  return (
    <Stack spacing={2}>
      {isCreate && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          La declaración PEP se guarda junto con el resto del cliente. El
          tamizaje contra listas de sanciones estará disponible después de
          guardar.
        </Alert>
      )}

      <Section
        title="Origen de fondos"
        subtitle="Declaración del cliente sobre la procedencia del dinero que utiliza en sus operaciones."
      >
        <TextField
          name="funds_source"
          label="Origen de fondos"
          placeholder="Ej: Ingresos del negocio propio, salario, remesas familiares..."
          value={customer?.funds_source || ""}
          onChange={handleFundsSourceChange}
          disabled={disabled}
          fullWidth
          size="small"
        />
      </Section>

      <Section
        title="Persona Expuesta Políticamente (PEP)"
        subtitle="Autodeclaración requerida por la normativa de prevención de lavado de activos."
      >
        <Stack spacing={1.5}>
          {(customer?.pep_declared_at) && (
            <Typography variant="caption" color="text.secondary">
              Última declaración: {formatDateTime(customer.pep_declared_at)}
              {customer.pep_declared_by ? ` — por ${customer.pep_declared_by}` : ""}
            </Typography>
          )}

          <FormControl disabled={disabled}>
            <FormLabel sx={{ fontWeight: 700, fontSize: 14 }}>
              ¿El cliente, o algún familiar cercano, desempeña o ha desempeñado un
              cargo público de alto nivel?
            </FormLabel>
            <RadioGroup
              row
              value={isPep}
              onChange={(e) => handleIsPepChange(e.target.value)}
            >
              <FormControlLabel value="no" control={<Radio />} label="No" />
              <FormControlLabel value="yes" control={<Radio />} label="Sí" />
            </RadioGroup>
          </FormControl>

          {isPep === "yes" && (
            <TextField
              label="Cargo público o relación con el cargo *"
              value={pepDetails}
              onChange={(e) => handlePepDetailsChange(e.target.value)}
              disabled={disabled}
              fullWidth
              multiline
              minRows={2}
              size="small"
            />
          )}

          {pepError && <Alert severity="error">{pepError}</Alert>}
          {pepSuccess && <Alert severity="success">{pepSuccess}</Alert>}

          {!disabled && !isCreate && (
            <Box>
              <Button
                variant="contained"
                onClick={handleSavePep}
                disabled={savingPep}
                startIcon={savingPep ? <CircularProgress size={16} color="inherit" /> : <GavelIcon />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  bgcolor: BAC.primary,
                  "&:hover": { bgcolor: BAC.primaryDark },
                }}
              >
                Guardar declaración PEP
              </Button>
            </Box>
          )}
        </Stack>
      </Section>

      {customerId && (
      <Section
        title="Tamizaje contra listas de sanciones"
        subtitle="Registro manual de la consulta contra listas OFAC/ONU u otras. No hay integración automática a una API de terceros."
      >
        <Stack spacing={1.5}>
          {!disabled && (
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "flex-end" }}>
              <TextField
                label="Lista consultada"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                size="small"
                sx={{ minWidth: 200 }}
              />
              <TextField
                select
                label="Resultado"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                size="small"
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="CLEAR">Sin coincidencias</MenuItem>
                <MenuItem value="MATCH">Coincidencia encontrada</MenuItem>
                <MenuItem value="PENDING">Pendiente</MenuItem>
              </TextField>
              <TextField
                label="Notas"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                size="small"
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleAddScreening}
                disabled={savingScreening}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  whiteSpace: "nowrap",
                  bgcolor: BAC.primary,
                  "&:hover": { bgcolor: BAC.primaryDark },
                }}
              >
                {savingScreening ? "Guardando..." : "Registrar tamizaje"}
              </Button>
            </Stack>
          )}

          {screeningError && <Alert severity="error">{screeningError}</Alert>}
          {screeningSuccess && <Alert severity="success">{screeningSuccess}</Alert>}

          <Divider />

          <TableContainer sx={{ border: `1px solid ${BAC.border}`, borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#F9FAFB" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Lista</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Resultado</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Notas</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Registrado por</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>Fecha</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {!loadingScreenings && screenings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Sin tamizajes registrados.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {screenings.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.list_name}</TableCell>
                    <TableCell>{screeningResultChip(s.result)}</TableCell>
                    <TableCell>{s.notes || "-"}</TableCell>
                    <TableCell>{s.screened_by || "-"}</TableCell>
                    <TableCell>{formatDateTime(s.screened_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Section>
      )}
    </Stack>
  );
});

export default CustomerAmlCompliance;
