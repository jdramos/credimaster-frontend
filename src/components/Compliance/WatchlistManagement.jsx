import React, { useEffect, useState } from "react";
import HelpButton from "../help/HelpButton";
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
import BrowseSanctionsListsPanel from "./BrowseSanctionsListsPanel";

const emptyForm = {
  list_name: "",
  entry_name: "",
  entry_type: "PERSONA",
  identification_number: "",
  source: "",
  notes: "",
};

const emptyShareholderForm = { full_name: "", identification: "", ownership_pct: "" };
const emptyBusinessAllyForm = { full_name: "", identification: "", contract_description: "", contract_start_date: "", phone: "" };

export default function WatchlistManagement() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanStatus, setScanStatus] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [shareholders, setShareholders] = useState([]);
  const [shareholderForm, setShareholderForm] = useState(emptyShareholderForm);

  const [businessAllies, setBusinessAllies] = useState([]);
  const [businessAllyForm, setBusinessAllyForm] = useState(emptyBusinessAllyForm);

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

  const loadScanStatus = async () => {
    try {
      const { data } = await API.get("/api/aml/watchlists/portfolio-scan-status");
      setScanStatus(data);
    } catch (err) {
      // no bloquea la pantalla si falla
    }
  };

  // Solo lectura -- la sincronización con OFAC/ONU es una acción a nivel
  // plataforma (superadmin, ver SanctionsFeedSyncPanel.jsx), no autoservicio
  // por tenant. Aquí solo se muestra cuándo corrió por última vez.
  const loadSyncStatus = async () => {
    try {
      const { data } = await API.get("/api/aml/watchlists/sync-status");
      setSyncStatus(data);
    } catch (err) {
      // no bloquea la pantalla si falla
    }
  };

  const loadShareholders = async () => {
    try {
      const { data } = await API.get("/api/aml/shareholders");
      setShareholders(Array.isArray(data) ? data.filter((s) => s.is_active) : []);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al cargar socios/accionistas", "error");
    }
  };

  const loadBusinessAllies = async () => {
    try {
      const { data } = await API.get("/api/aml/business-allies");
      setBusinessAllies(Array.isArray(data) ? data.filter((a) => a.is_active) : []);
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al cargar aliados de negocios", "error");
    }
  };

  useEffect(() => {
    loadEntries();
    loadScanStatus();
    loadSyncStatus();
    loadShareholders();
    loadBusinessAllies();
  }, []);

  const handleAddShareholder = async () => {
    if (!shareholderForm.full_name.trim()) {
      showAlert("El nombre es obligatorio", "error");
      return;
    }
    try {
      await API.post("/api/aml/shareholders", {
        ...shareholderForm,
        identification: shareholderForm.identification || null,
        ownership_pct: shareholderForm.ownership_pct || null,
      });
      setShareholderForm(emptyShareholderForm);
      await loadShareholders();
      showAlert("Socio/accionista agregado");
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al agregar el registro", "error");
    }
  };

  const handleRemoveShareholder = async (id) => {
    try {
      await API.delete(`/api/aml/shareholders/${id}`);
      await loadShareholders();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al desactivar el registro", "error");
    }
  };

  const handleAddBusinessAlly = async () => {
    if (!businessAllyForm.full_name.trim()) {
      showAlert("El nombre es obligatorio", "error");
      return;
    }
    try {
      await API.post("/api/aml/business-allies", {
        ...businessAllyForm,
        identification: businessAllyForm.identification || null,
        contract_description: businessAllyForm.contract_description || null,
        contract_start_date: businessAllyForm.contract_start_date || null,
        phone: businessAllyForm.phone || null,
      });
      setBusinessAllyForm(emptyBusinessAllyForm);
      await loadBusinessAllies();
      showAlert("Aliado de negocio agregado");
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al agregar el registro", "error");
    }
  };

  const handleRemoveBusinessAlly = async (id) => {
    try {
      await API.delete(`/api/aml/business-allies/${id}`);
      await loadBusinessAllies();
    } catch (err) {
      showAlert(err.response?.data?.message || "Error al desactivar el registro", "error");
    }
  };

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
      await loadScanStatus();
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mb: 1 }}>
          <Typography variant="h6" fontWeight={800}>
            Listas de Riesgo LA/FT/FP
          </Typography>
          <HelpButton screenKey="cumplimiento.listas" />
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Lista interna administrable (sin acceso a feeds en vivo de OFAC/ONU). Coincidencia simple
          por nombre — no es un motor de coincidencia difusa real.
        </Typography>

        <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
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
          {syncStatus && (
            <Chip
              size="small"
              variant="outlined"
              label={
                syncStatus.last_sync_at
                  ? `OFAC/ONU actualizado: ${new Date(syncStatus.last_sync_at).toLocaleDateString("es-NI")}`
                  : "OFAC/ONU: aún no sincronizado"
              }
            />
          )}
          {scanStatus && (
            <Chip
              size="small"
              color={scanStatus.overdue ? "error" : "success"}
              label={
                scanStatus.last_scan_at
                  ? `Último barrido: ${new Date(scanStatus.last_scan_at).toLocaleDateString("es-NI")}${scanStatus.overdue ? " — VENCIDO" : ""}`
                  : "Nunca se ha corrido el barrido semestral"
              }
            />
          )}
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
            {scanResult.totalScanned ?? scanResult.scanned} sujetos revisados, {scanResult.totalMatched ?? scanResult.matched} coincidencias
            nuevas registradas como PENDING para revisión.
            {scanResult.customers && (
              <>
                {" "}(clientes {scanResult.customers.scanned}, empleados {scanResult.employees?.scanned ?? 0}, fiadores{" "}
                {scanResult.guarantors?.scanned ?? 0}, fondeadores {scanResult.funders?.scanned ?? 0}, socios{" "}
                {scanResult.shareholders?.scanned ?? 0}, aliados de negocios {scanResult.businessAllies?.scanned ?? 0})
              </>
            )}
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

      <BrowseSanctionsListsPanel />

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} mb={0.5}>
          Socios y Accionistas
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Socios/accionistas de la institución (Art. 28/48 CD-CONAMI-070-01OCT07-2025) — se tamizan
          contra listas de riesgo igual que clientes/empleados/fiadores/fondeadores.
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
          <TextField
            label="Nombre completo"
            size="small"
            value={shareholderForm.full_name}
            onChange={(e) => setShareholderForm({ ...shareholderForm, full_name: e.target.value })}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="Identificación"
            size="small"
            value={shareholderForm.identification}
            onChange={(e) => setShareholderForm({ ...shareholderForm, identification: e.target.value })}
          />
          <TextField
            label="% participación"
            size="small"
            type="number"
            value={shareholderForm.ownership_pct}
            onChange={(e) => setShareholderForm({ ...shareholderForm, ownership_pct: e.target.value })}
            sx={{ minWidth: 140 }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddShareholder}>
            Agregar
          </Button>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Identificación</TableCell>
                <TableCell>% participación</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shareholders.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.full_name}</TableCell>
                  <TableCell>{s.identification || "-"}</TableCell>
                  <TableCell>{s.ownership_pct != null ? `${s.ownership_pct}%` : "-"}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => handleRemoveShareholder(s.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {shareholders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Sin socios/accionistas registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} mb={0.5}>
          Aliados de Negocios
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Agentes/colaboradores externos bajo contrato de agencia o colaboración (Art. 4 Ley N°. 1215) —
          se tamizan contra listas de riesgo igual que socios/accionistas.
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
          <TextField
            label="Nombre completo"
            size="small"
            value={businessAllyForm.full_name}
            onChange={(e) => setBusinessAllyForm({ ...businessAllyForm, full_name: e.target.value })}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="Identificación"
            size="small"
            value={businessAllyForm.identification}
            onChange={(e) => setBusinessAllyForm({ ...businessAllyForm, identification: e.target.value })}
          />
          <TextField
            label="Naturaleza del contrato"
            size="small"
            value={businessAllyForm.contract_description}
            onChange={(e) => setBusinessAllyForm({ ...businessAllyForm, contract_description: e.target.value })}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="Inicio del contrato"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={businessAllyForm.contract_start_date}
            onChange={(e) => setBusinessAllyForm({ ...businessAllyForm, contract_start_date: e.target.value })}
          />
          <TextField
            label="Teléfono"
            size="small"
            value={businessAllyForm.phone}
            onChange={(e) => setBusinessAllyForm({ ...businessAllyForm, phone: e.target.value })}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddBusinessAlly}>
            Agregar
          </Button>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Identificación</TableCell>
                <TableCell>Contrato</TableCell>
                <TableCell>Inicio</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {businessAllies.map((a) => (
                <TableRow key={a.id} hover>
                  <TableCell>{a.full_name}</TableCell>
                  <TableCell>{a.identification || "-"}</TableCell>
                  <TableCell>{a.contract_description || "-"}</TableCell>
                  <TableCell>{a.contract_start_date ? new Date(a.contract_start_date).toLocaleDateString("es-NI") : "-"}</TableCell>
                  <TableCell>{a.phone || "-"}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => handleRemoveBusinessAlly(a.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {businessAllies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Sin aliados de negocios registrados.
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
