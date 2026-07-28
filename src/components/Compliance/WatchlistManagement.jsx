import React, { useEffect, useState } from "react";
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
  TextField,
  MenuItem,
  Button,
  Alert,
  Snackbar,
  Stack,
  IconButton,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import API from "../../api";

const emptyForm = {
  list_name: "",
  entry_name: "",
  entry_type: "PERSONA",
  identification_number: "",
  source: "",
  notes: "",
};

export default function WatchlistManagement() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const loadEntries = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/api/aml/watchlists");
      setEntries(Array.isArray(data) ? data.filter((e) => e.active) : []);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al cargar la lista", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleAdd = async () => {
    if (!form.list_name.trim() || !form.entry_name.trim()) {
      showAlert("Lista y nombre son obligatorios", "error");
      return;
    }
    try {
      await API.post("/api/aml/watchlists", {
        ...form,
        identification_number: form.identification_number || null,
        source: form.source || null,
        notes: form.notes || null,
      });
      setForm(emptyForm);
      await loadEntries();
      showAlert("Entrada agregada");
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al agregar la entrada", "error");
    }
  };

  const handleRemove = async (id) => {
    try {
      await API.delete(`/api/aml/watchlists/${id}`);
      await loadEntries();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al desactivar la entrada", "error");
    }
  };

  const handleScan = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      const { data } = await API.post("/api/aml/watchlists/scan-portfolio");
      setScanResult(data);
      showAlert(data.message || "Escaneo completado");
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al escanear la cartera", "error");
    } finally {
      setScanning(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      setSearching(true);
      const { data } = await API.get("/api/aml/watchlists/search", { params: { name: searchTerm } });
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error en la búsqueda", "error");
    } finally {
      setSearching(false);
    }
  };

  return (
    <Box p={2}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight={800} mb={1}>
          Listas de Riesgo LA/FT/FP
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Lista interna administrable (sin acceso a feeds en vivo de OFAC/ONU). Coincidencia simple
          por nombre — no es un motor de coincidencia difusa real.
        </Typography>

        <Stack direction="row" spacing={1} mb={2} alignItems="center">
          <TextField
            label="Buscar nombre"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <Button variant="outlined" startIcon={<SearchIcon />} onClick={handleSearch} disabled={searching}>
            Buscar
          </Button>
          <Box flexGrow={1} />
          <Button variant="contained" onClick={handleScan} disabled={scanning}>
            {scanning ? "Escaneando..." : "Escanear cartera completa"}
          </Button>
        </Stack>

        {searchResults != null && (
          <Alert severity={searchResults.length ? "warning" : "success"} sx={{ mb: 2 }}>
            {searchResults.length
              ? `${searchResults.length} coincidencia(s): ${searchResults.map((r) => r.entry_name).join(", ")}`
              : "Sin coincidencias en las listas."}
          </Alert>
        )}

        {scanResult && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {scanResult.scanned} clientes revisados, {scanResult.matched} coincidencias nuevas registradas
            como PENDING para revisión.
          </Alert>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} mb={1}>
          Agregar entrada
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <TextField
            label="Lista (ej. OFAC SDN, ONU)"
            size="small"
            value={form.list_name}
            onChange={(e) => setForm({ ...form, list_name: e.target.value })}
          />
          <TextField
            label="Nombre"
            size="small"
            value={form.entry_name}
            onChange={(e) => setForm({ ...form, entry_name: e.target.value })}
            sx={{ minWidth: 220 }}
          />
          <TextField
            select
            label="Tipo"
            size="small"
            value={form.entry_type}
            onChange={(e) => setForm({ ...form, entry_type: e.target.value })}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="PERSONA">Persona</MenuItem>
            <MenuItem value="ENTIDAD">Entidad</MenuItem>
          </TextField>
          <TextField
            label="N° identificación"
            size="small"
            value={form.identification_number}
            onChange={(e) => setForm({ ...form, identification_number: e.target.value })}
          />
          <TextField
            label="Fuente"
            size="small"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
            Agregar
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Lista</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Identificación</TableCell>
                <TableCell>Fuente</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>{e.list_name}</TableCell>
                  <TableCell>{e.entry_name}</TableCell>
                  <TableCell>
                    <Chip size="small" label={e.entry_type} />
                  </TableCell>
                  <TableCell>{e.identification_number || "-"}</TableCell>
                  <TableCell>{e.source || "-"}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => handleRemove(e.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Sin entradas registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={alert.open}
        autoHideDuration={4000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={alert.severity} sx={{ width: "100%" }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
