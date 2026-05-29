import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
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
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import API from "../../api";

const CONAMI_TABLES = [
  { key: "conami_clasificacion_credito", label: "Clasificación crédito" },
  { key: "conami_estado_bien", label: "Estado bien" },
  { key: "conami_estado_linea", label: "Estado línea" },
  { key: "conami_forma_pago", label: "Forma pago" },
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
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [rowsByTable, setRowsByTable] = useState({});
  const [loadingTable, setLoadingTable] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentItem = useMemo(
    () => (selectedIndex !== null ? CONAMI_TABLES[selectedIndex] : null),
    [selectedIndex],
  );

  const currentTable = currentItem?.key || "";
  const rows = rowsByTable[currentTable] || [];

  const loadTable = async (tableName, force = false) => {
    if (!tableName) return;

    if (!force && rowsByTable[tableName]) return;

    setLoadingTable(tableName);
    setError("");
    setSuccess("");

    try {
      const { data } = await API.get(`/api/conami/${tableName}`);
      setRowsByTable((prev) => ({
        ...prev,
        [tableName]: Array.isArray(data) ? data : [],
      }));
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar el catálogo seleccionado.");
    } finally {
      setLoadingTable("");
    }
  };

  useEffect(() => {
    if (currentTable) {
      loadTable(currentTable);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTable]);

  const handleSelectTable = (index) => {
    setSelectedIndex(index);
  };

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
    if (!currentTable) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const selected = rows.find((r) => Number(r.is_default) === 1);

      await API.put("/api/conami/defaults", {
        defaults: [
          {
            table: currentTable,
            default_id: selected ? selected.id : null,
          },
        ],
      });

      setSuccess("Valor por defecto actualizado correctamente.");
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el valor por defecto.");
    } finally {
      setSaving(false);
    }
  };

  const isLoadingCurrent = loadingTable === currentTable;

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
              Selecciona un catálogo para cargar sus registros.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => loadTable(currentTable, true)}
              disabled={!currentTable || isLoadingCurrent || saving}
            >
              Recargar
            </Button>

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!currentTable || isLoadingCurrent || saving}
            >
              Guardar
            </Button>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "280px 1fr" },
            gap: 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              overflow: "hidden",
              height: {
                xs: "auto",
                md: "calc(100vh - 220px)",
              },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography sx={{ p: 1.5, fontWeight: 800 }}>Catálogos</Typography>
            <Divider />

            <List
              dense
              disablePadding
              sx={{
                overflowY: "auto",
                flex: 1,
              }}
            >
              {CONAMI_TABLES.map((item, index) => (
                <ListItemButton
                  key={item.key}
                  selected={selectedIndex === index}
                  onClick={() => handleSelectTable(index)}
                >
                  <ListItemText
                    primary={item.label}
                    secondary={rowsByTable[item.key] ? "Cargado" : "Sin cargar"}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>

          <Box>
            {!currentTable ? (
              <Alert severity="info">
                Selecciona un catálogo del listado izquierdo para ver sus
                registros.
              </Alert>
            ) : isLoadingCurrent ? (
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
                        <TableCell>
                          {row.name ||
                            row.description ||
                            row.descripcion ||
                            row.label}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              Number(row.active ?? row.is_active) === 1
                                ? "Sí"
                                : "No"
                            }
                            color={
                              Number(row.active ?? row.is_active) === 1
                                ? "success"
                                : "default"
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={Number(row.is_default) === 1}
                            onChange={() =>
                              handleToggleDefault(currentTable, row.id)
                            }
                            disabled={Number(row.active ?? row.is_active) !== 1}
                          />
                        </TableCell>
                      </TableRow>
                    ))}

                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No hay registros.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {saving && (
              <Box
                sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}
              >
                <CircularProgress size={18} />
                <Typography variant="body2">Guardando cambios...</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default ConamiDefaultsManager;
