import React, { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import API from "../../api";

// Fiadores del crédito (Art. 48 CD-CONAMI-070-01OCT07-2025 — deben
// tamizarse contra listas de riesgo igual que el cliente). El fiador es un
// tipo de cliente (customer_type FIADOR/AMBOS), se selecciona de la lista de
// candidatos en vez de escribirse a mano. A diferencia de GuranteeTable.jsx
// (que edita un arreglo local y se guarda junto con el resto del
// formulario), aquí cada alta/baja persiste de inmediato: el tamizaje ocurre
// en el backend al crear la fila, no tiene sentido diferirlo a un guardado
// en lote.
const LoanGuarantorsSection = ({ loanId, readOnly = false }) => {
  const [guarantors, setGuarantors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [relationship, setRelationship] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!loanId) return;
    try {
      setLoading(true);
      setError("");
      const { data } = await API.get(`/api/loans/${loanId}/guarantors`);
      setGuarantors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "No se pudieron cargar los fiadores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    API.get("/api/loans/guarantor-candidates")
      .then(({ data }) => setCandidates(Array.isArray(data) ? data : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loanId]);

  const handleAdd = async () => {
    if (!selectedCustomer) {
      setError("Seleccione un cliente marcado como Fiador/Ambos.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await API.post(`/api/loans/${loanId}/guarantors`, {
        customer_id: selectedCustomer.id,
        relationship: relationship.trim() || null,
      });
      setSelectedCustomer(null);
      setRelationship("");
      await load();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "No se pudo agregar el fiador.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setError("");
      await API.delete(`/api/loans/guarantors/${id}`);
      await load();
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "No se pudo eliminar el fiador.");
    }
  };

  if (!loanId) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Guarde el crédito para poder agregar fiadores.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Stack alignItems="center" py={2}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      {guarantors.length === 0 && (
        <Alert severity="info" sx={{ mb: 1 }}>
          Este crédito no tiene fiadores registrados.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "grey.100" }}>
              <TableCell sx={{ fontWeight: 800 }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Identificación</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Teléfono</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Relación</TableCell>
              {!readOnly && <TableCell align="center" sx={{ fontWeight: 800 }}>Acciones</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {guarantors.map((g) => (
              <TableRow key={g.id} hover>
                <TableCell>{g.full_name}</TableCell>
                <TableCell>{g.identification || "-"}</TableCell>
                <TableCell>{g.phone || "-"}</TableCell>
                <TableCell>{g.relationship || "-"}</TableCell>
                {!readOnly && (
                  <TableCell align="center">
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={() => handleDelete(g.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {!readOnly && (
        <Grid container spacing={1.5} sx={{ mt: 1 }} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Autocomplete
              options={candidates}
              value={selectedCustomer}
              getOptionLabel={(o) => `${o.customer_name || ""}${o.identification ? " - " + o.identification : ""}`}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              onChange={(_, value) => setSelectedCustomer(value)}
              renderInput={(params) => <TextField {...params} label="Cliente (Fiador/Ambos)" size="small" />}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Relación con el titular"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              size="small"
              fullWidth
              placeholder="Ej: Hermano, socio de negocio..."
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              disabled={saving}
              fullWidth
            >
              Agregar
            </Button>
          </Grid>
        </Grid>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Cada fiador se tamiza automáticamente contra las listas de riesgo al agregarlo (Art. 33.4/48 CD-CONAMI-070-01OCT07-2025).
      </Typography>
    </Box>
  );
};

export default LoanGuarantorsSection;
