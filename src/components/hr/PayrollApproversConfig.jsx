import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Alert,
  Snackbar,
  Button,
  IconButton,
  Tooltip,
  Autocomplete,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import API from "../../api";

const API_URL = "/api/hr/payroll-approvers";

export default function PayrollApproversConfig() {
  const [approvers, setApprovers] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, severity: "success", message: "" });

  const showAlert = (message, severity = "success") => setAlert({ open: true, severity, message });

  const fetchApprovers = async () => {
    try {
      setLoading(true);
      const res = await API.get(API_URL);
      setApprovers(res.data?.data || []);
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al cargar los aprobadores de planilla", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovers();
    API.get("/api/users").then((res) => setUsers(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!selectedUser) return;
    try {
      await API.post(API_URL, { user_id: selectedUser.id });
      showAlert("Aprobador agregado correctamente");
      setSelectedUser(null);
      fetchApprovers();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al agregar el aprobador", "error");
    }
  };

  const handleRemove = async (approver) => {
    if (!window.confirm(`¿Quitar a ${approver.full_name} como aprobador de planilla?`)) return;
    try {
      await API.delete(`${API_URL}/${approver.id}`);
      showAlert("Aprobador quitado correctamente");
      fetchApprovers();
    } catch (error) {
      showAlert(error.response?.data?.message || "Error al quitar el aprobador", "error");
    }
  };

  const activeApprovers = approvers.filter((a) => a.is_active);
  const availableUsers = users.filter((u) => !activeApprovers.some((a) => a.user_id === u.id));

  return (
    <Box sx={{ p: 2 }}>
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E5E7EB", background: "#fff" }}>
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <VerifiedUserIcon sx={{ color: "#0057B8" }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>Aprobadores de Planilla</Typography>
            <Typography variant="body2" color="text.secondary">
              Usuarios habilitados para autorizar corridas de nómina. Mientras no haya aprobadores configurados,
              las planillas se contabilizan de inmediato al generarse.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, mb: 3, alignItems: "center" }}>
          <Autocomplete
            size="small"
            sx={{ minWidth: 320 }}
            options={availableUsers}
            value={selectedUser}
            getOptionLabel={(o) => o.full_name || ""}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            onChange={(_, value) => setSelectedUser(value)}
            renderInput={(params) => <TextField {...params} label="Agregar aprobador" />}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={!selectedUser}
            sx={{ textTransform: "none" }}
            onClick={handleAdd}
          >
            Agregar
          </Button>
        </Box>

        {!loading && activeApprovers.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            No hay aprobadores configurados — las corridas de planilla se contabilizan directamente, sin flujo de aprobación.
          </Alert>
        )}

        <List sx={{ border: "1px solid #E5E7EB", borderRadius: 2 }}>
          {activeApprovers.map((a) => (
            <ListItem key={a.id} divider>
              <ListItemText
                primary={a.full_name}
                secondary={a.role_name ? `${a.user_name} · ${a.role_name}` : a.user_name}
              />
              <ListItemSecondaryAction>
                <Chip size="small" color="success" label="Activo" sx={{ mr: 1 }} />
                <Tooltip title="Quitar aprobador">
                  <IconButton size="small" color="error" onClick={() => handleRemove(a)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Snackbar open={alert.open} autoHideDuration={5000} onClose={() => setAlert((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert severity={alert.severity} onClose={() => setAlert((p) => ({ ...p, open: false }))}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
}
