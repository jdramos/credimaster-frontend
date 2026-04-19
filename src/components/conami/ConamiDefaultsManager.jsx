import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Stack,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import API from "../../api";

const CONAMI_TABLES = [
  { key: "conami_clasificacion_credito", label: "Clasificación crédito" },
  { key: "conami_estado_bien", label: "Estado bien" },
  { key: "conami_estado_credito", label: "Estado crédito" },
  { key: "conami_estado_linea", label: "Estado línea" },
  { key: "conami_forma_pago", label: "Forma pago" },
  { key: "conami_garantia", label: "Garantía" },
  { key: "conami_met_atencion", label: "Método atención" },
  { key: "conami_modalidad_credito", label: "Modalidad crédito" },
  { key: "conami_monedas", label: "Monedas" },
  { key: "conami_origen_fondos", label: "Origen fondos" },
  { key: "conami_origen_recursos", label: "Origen recursos" },
  { key: "conami_periodo_cobros", label: "Período cobros" },
  { key: "conami_sector_economico", label: "Sector económico" },
  { key: "conami_situacion_credito", label: "Situación crédito" },
  { key: "conami_situacion_obligacion", label: "Situación obligación" },
  { key: "conami_tipo_cartera", label: "Tipo cartera" },
  { key: "conami_tipo_colocacion", label: "Tipo colocación" },
  { key: "conami_tipo_creditos", label: "Tipo créditos" },
  { key: "conami_tipo_documento", label: "Tipo documento" },
  { key: "conami_tipo_fondo_colocacion", label: "Tipo fondo colocación" },
  { key: "conami_tipo_fondos", label: "Tipo fondos" },
  { key: "conami_tipo_grupo", label: "Tipo grupo" },
  { key: "conami_tipo_lineas", label: "Tipo líneas" },
  { key: "conami_tipo_lugar", label: "Tipo lugar" },
  { key: "conami_tipo_persona_juridica", label: "Tipo persona jurídica" },
  { key: "conami_tipo_personas", label: "Tipo personas" },
  { key: "conami_tipo_trx_obligacion", label: "Tipo trx obligación" },
  { key: "conami_tipo_zona", label: "Tipo zona" },
];

const ConamiDefaultsManager = () => {
  const [tab, setTab] = useState(0);
  const [rowsByTable, setRowsByTable] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentTable = useMemo(() => CONAMI_TABLES[tab]?.key, [tab]);

  const loadTable = async (tableName) => {
    const { data } = await API.get(`/api/conami/${tableName}`);
    return Array.isArray(data) ? data : [];
  };

  const loadAll = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const result = {};

      for (const item of CONAMI_TABLES) {
        result[item.key] = await loadTable(item.key);
      }

      setRowsByTable(result);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los catálogos CONAMI.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleToggleDefault = (tableName, rowId) => {
    setRowsByTable((prev) => {
      const currentRows = prev[tableName] || [];

      return {
        ...prev,
        [tableName]: currentRows.map((row) => ({
          ...row,
          is_default: row.id === rowId ? 1 : 0,
        })),
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = CONAMI_TABLES.map((item) => {
        const rows = rowsByTable[item.key] || [];
        const selected = rows.find((r) => Number(r.is_default) === 1);

        return {
          table: item.key,
          default_id: selected ? selected.id : null,
        };
      });

      await API.put("/api/conami/defaults", { defaults: payload });

      setSuccess("Valores por defecto actualizados correctamente.");
    } catch (err) {
      console.error(err);
      setError("No se pudieron guardar los valores por defecto.");
    } finally {
      setSaving(false);
    }
  };

  const rows = rowsByTable[currentTable] || [];

  return (
    <Box sx={{ p: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: "1px solid #e0e0e0",
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Valores por defecto CONAMI
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Solo puedes definir qué registro será el valor por defecto en cada
              catálogo normativo.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadAll}
              disabled={loading || saving}
            >
              Recargar
            </Button>

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={loading || saving}
            >
              Guardar
            </Button>
          </Stack>
        </Stack>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        ) : null}

        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2 }}
        >
          {CONAMI_TABLES.map((item) => (
            <Tab key={item.key} label={item.label} />
          ))}
        </Tabs>

        {loading ? (
          <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ border: "1px solid #e0e0e0", borderRadius: 2 }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Activo</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    Por defecto
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={Number(row.active) === 1 ? "Sí" : "No"}
                        color={Number(row.active) === 1 ? "success" : "default"}
                        size="small"
                        variant={
                          Number(row.active) === 1 ? "filled" : "outlined"
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={Number(row.is_default) === 1}
                        onChange={() =>
                          handleToggleDefault(currentTable, row.id)
                        }
                        disabled={Number(row.active) !== 1}
                      />
                    </TableCell>
                  </TableRow>
                ))}

                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No hay registros.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {saving ? (
          <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Guardando cambios...</Typography>
          </Box>
        ) : null}
      </Paper>
    </Box>
  );
};

export default ConamiDefaultsManager;
