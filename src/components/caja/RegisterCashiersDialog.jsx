import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from "@mui/material";
import API from "../../api";

// Asignación fija de cajeros a una caja: con cajeros marcados, solo ellos
// pueden abrir turno en esta caja; sin ninguno, la abre cualquier cajero de
// la sucursal. Backend: GET/PUT /api/caja/registers/:id/cashiers.
export default function RegisterCashiersDialog({ open, register, onClose, onSaved }) {
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !register) return;
    setError("");
    setLoading(true);
    API.get(`/api/caja/registers/${register.id}/cashiers`)
      .then((res) => {
        const data = res.data?.data || {};
        setCandidates(data.candidates || []);
        setSelected((data.assigned || []).map((a) => a.id));
      })
      .catch((err) => setError(err.response?.data?.message || "No se pudieron cargar los cajeros"))
      .finally(() => setLoading(false));
  }, [open, register]);

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await API.put(`/api/caja/registers/${register.id}/cashiers`, { user_ids: selected });
      onSaved?.(res.data?.data);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron guardar los cajeros");
    } finally {
      setSaving(false);
    }
  };

  if (!register) return null;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cajeros de {register.name}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Marque los cajeros que pueden abrir esta caja. Si no marca ninguno, la puede abrir cualquier cajero con acceso a la sucursal.
        </Typography>
        {!register.branch_id && <Alert severity="warning" sx={{ mb: 2 }}>Asigne primero una sucursal a la caja.</Alert>}
        {loading ? (
          <Box sx={{ textAlign: "center", py: 3 }}><CircularProgress size={28} /></Box>
        ) : candidates.length === 0 ? (
          <Alert severity="info">
            No hay usuarios activos con permiso para operar caja en esta sucursal. Revise los roles (permiso «caja.turnos.operar») y las sucursales de los usuarios.
          </Alert>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {candidates.map((u) => (
              <FormControlLabel
                key={u.id}
                control={<Checkbox checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />}
                label={`${u.name} (${u.user_name}) — ${u.role_name}`}
              />
            ))}
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? "Guardando..." : selected.length ? `Asignar ${selected.length} cajero(s)` : "Dejar libre"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
