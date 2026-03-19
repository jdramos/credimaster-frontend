import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  MenuItem,
  Select,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  alpha,
  FormControl,
  InputLabel,
  TextField,
  InputAdornment,
  Chip,
  Divider,
  Alert,
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import SecurityIcon from "@mui/icons-material/Security";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import KeyIcon from "@mui/icons-material/Key";
import SearchIcon from "@mui/icons-material/Search";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import FolderSpecialIcon from "@mui/icons-material/FolderSpecial";
import axios from "axios";

const AlertMessage = React.forwardRef(function AlertMessage(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const API_URL = process.env.REACT_APP_API_BASE_URL;
const TOKEN = process.env.REACT_APP_API_TOKEN;

const BAC = {

  primary: "#0057B8",
  primaryDark: "#003E8A",
  soft: "#EAF2FF",
  border: "#E6EAF2",
  text: "#0B1F3B",
  muted: "#5B6B7F",
  bg: "#F6F8FC",
  white: "#FFFFFF",

  secondary: "#1F2937",
  secondaryLight: "#374151",

  accent: "#B71C1C",
  accentSoft: "#FEE2E2",

  success: "#2E7D32",
  successSoft: "#E8F5E9",

  warning: "#ED6C02",
  warningSoft: "#FFF3E0",

  info: "#0288D1",
  infoSoft: "#E1F5FE",

  purple: "#7B1FA2",
  purpleSoft: "#F3E5F5",

  grey50: "#FCFCFD",
  grey100: "#F8F9FB",
  grey200: "#EEF1F5",
  grey300: "#E5E7EB",
  grey400: "#D1D5DB",
  grey500: "#6B7280",
  grey700: "#374151",

  text: "#111827",
  textSoft: "#6B7280",
  white: "#FFFFFF",
};

const getModuleFromTag = (tag = "") => {
  if (!tag) return "general";
  return tag.split(".")[0] || "general";
};

const getModuleStyle = (module) => {
  const styles = {
    clientes: {
      color: BAC.primary,
      backgroundColor: BAC.primaryLight,
      border: `1px solid ${alpha(BAC.primary, 0.18)}`,
    },
    creditos: {
      color: BAC.secondary,
      backgroundColor: alpha(BAC.secondary, 0.08),
      border: `1px solid ${alpha(BAC.secondary, 0.16)}`,
    },
    pagos: {
      color: BAC.info,
      backgroundColor: BAC.infoSoft,
      border: `1px solid ${alpha(BAC.info, 0.18)}`,
    },
    cobros: {
      color: BAC.warning,
      backgroundColor: BAC.warningSoft,
      border: `1px solid ${alpha(BAC.warning, 0.18)}`,
    },
    balances: {
      color: BAC.purple,
      backgroundColor: BAC.purpleSoft,
      border: `1px solid ${alpha(BAC.purple, 0.18)}`,
    },
    reportes: {
      color: BAC.secondaryLight,
      backgroundColor: alpha(BAC.secondaryLight, 0.08),
      border: `1px solid ${alpha(BAC.secondaryLight, 0.16)}`,
    },
    usuarios: {
      color: BAC.primaryDark,
      backgroundColor: alpha(BAC.primary, 0.08),
      border: `1px solid ${alpha(BAC.primaryDark, 0.16)}`,
    },
    roles: {
      color: BAC.warning,
      backgroundColor: BAC.warningSoft,
      border: `1px solid ${alpha(BAC.warning, 0.18)}`,
    },
    sucursales: {
      color: BAC.success,
      backgroundColor: BAC.successSoft,
      border: `1px solid ${alpha(BAC.success, 0.18)}`,
    },
    auditoria: {
      color: BAC.secondary,
      backgroundColor: alpha(BAC.secondary, 0.08),
      border: `1px solid ${alpha(BAC.secondary, 0.16)}`,
    },
    configuracion: {
      color: BAC.grey700,
      backgroundColor: BAC.grey100,
      border: `1px solid ${BAC.grey300}`,
    },
    garantias: {
      color: BAC.success,
      backgroundColor: BAC.successSoft,
      border: `1px solid ${alpha(BAC.success, 0.18)}`,
    },
    especial: {
      color: BAC.accent,
      backgroundColor: BAC.accentSoft,
      border: `1px solid ${alpha(BAC.accent, 0.18)}`,
    },
    dashboard: {
      color: BAC.info,
      backgroundColor: BAC.infoSoft,
      border: `1px solid ${alpha(BAC.info, 0.18)}`,
    },
    mora: {
      color: BAC.warning,
      backgroundColor: BAC.warningSoft,
      border: `1px solid ${alpha(BAC.warning, 0.18)}`,
    },
    politicas_credito: {
      color: BAC.purple,
      backgroundColor: BAC.purpleSoft,
      border: `1px solid ${alpha(BAC.purple, 0.18)}`,
    },
    tipos_riesgo: {
      color: BAC.accent,
      backgroundColor: BAC.accentSoft,
      border: `1px solid ${alpha(BAC.accent, 0.18)}`,
    },
    tipos_negocio: {
      color: BAC.success,
      backgroundColor: BAC.successSoft,
      border: `1px solid ${alpha(BAC.success, 0.18)}`,
    },
  };

  return (
    styles[module] || {
      color: BAC.grey700,
      backgroundColor: BAC.grey100,
      border: `1px solid ${BAC.grey300}`,
    }
  );
};

const RolePermissionManager = () => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [assigned, setAssigned] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [successOpen, setSuccessOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const headers = { Authorization: TOKEN };

  const fetchInitialData = async () => {
    setInitialLoading(true);
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/roles`, { headers }),
        axios.get(`${API_URL}/api/permissions`, { headers }),
      ]);

      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      setPermissions(Array.isArray(permissionsRes.data) ? permissionsRes.data : []);
    } catch (err) {
      console.error("Error cargando datos iniciales:", err);
      setRoles([]);
      setPermissions([]);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedRole) {
      setAssigned([]);
      return;
    }

    const fetchAssignedPermissions = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${API_URL}/api/roles/${selectedRole}/permissions`,
          { headers }
        );
        const assignedPerms = Array.isArray(res.data) ? res.data : [];
        setAssigned(assignedPerms.map((p) => p.id));
      } catch (err) {
        console.error("Error al cargar permisos del rol:", err);
        setAssigned([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedPermissions();
  }, [selectedRole]);

  const selectedRoleName = useMemo(() => {
    const role = roles.find((r) => String(r.id) === String(selectedRole));
    return role?.role_name || "";
  }, [roles, selectedRole]);

  const filteredPermissions = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return permissions;

    return permissions.filter((perm) => {
      const name = (perm.permission_name || "").toLowerCase();
      const tag = (perm.permission_tag || "").toLowerCase();
      return name.includes(term) || tag.includes(term);
    });
  }, [permissions, searchText]);

  const groupedPermissions = useMemo(() => {
    return filteredPermissions.reduce((acc, perm) => {
      const module = getModuleFromTag(perm.permission_tag);
      if (!acc[module]) acc[module] = [];
      acc[module].push(perm);
      return acc;
    }, {});
  }, [filteredPermissions]);

  const moduleNames = useMemo(() => {
    return Object.keys(groupedPermissions).sort((a, b) => a.localeCompare(b, "es"));
  }, [groupedPermissions]);

  const totalAssignedVisible = useMemo(() => {
    return filteredPermissions.filter((p) => assigned.includes(p.id)).length;
  }, [filteredPermissions, assigned]);

  const handleToggle = (permId) => {
    setAssigned((prev) =>
      prev.includes(permId)
        ? prev.filter((id) => id !== permId)
        : [...prev, permId]
    );
  };

  const handleToggleModule = (module) => {
    const modulePermissions = groupedPermissions[module] || [];
    const moduleIds = modulePermissions.map((p) => p.id);
    const allSelected = moduleIds.every((id) => assigned.includes(id));

    if (allSelected) {
      setAssigned((prev) => prev.filter((id) => !moduleIds.includes(id)));
    } else {
      setAssigned((prev) => [...new Set([...prev, ...moduleIds])]);
    }
  };

  const handleSave = async () => {
    setConfirmOpen(false);

    try {
      await axios.put(
        `${API_URL}/api/roles/${selectedRole}/permissions`,
        { permissionIds: assigned },
        { headers }
      );
      setSuccessOpen(true);
    } catch (error) {
      console.error("Error al actualizar permisos:", error);
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: BAC.grey100, minHeight: "100%" }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${BAC.primary} 0%, ${BAC.primaryDark} 100%)`,
          color: BAC.white,
          boxShadow: "0 10px 30px rgba(211, 47, 47, 0.18)",
          border: `1px solid ${alpha(BAC.primaryDark, 0.15)}`,
        }}
      >
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Asignación de Permisos por Rol
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.92, mt: 0.5 }}>
              Administra los permisos funcionales de cada rol en CrediMaster.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchInitialData}
            sx={{
              backgroundColor: alpha(BAC.white, 0.14),
              color: BAC.white,
              fontWeight: 700,
              borderRadius: 2,
              px: 2.5,
              py: 1,
              boxShadow: "none",
              border: "1px solid rgba(255,255,255,0.18)",
              "&:hover": {
                backgroundColor: alpha(BAC.white, 0.22),
                boxShadow: "none",
              },
            }}
          >
            Actualizar
          </Button>
        </Stack>
      </Paper>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 3,
            border: `1px solid ${BAC.grey200}`,
            backgroundColor: BAC.white,
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ManageAccountsIcon sx={{ color: BAC.primary }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Rol seleccionado
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {selectedRoleName || "Ninguno"}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 3,
            border: `1px solid ${BAC.grey200}`,
            backgroundColor: BAC.white,
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <KeyIcon sx={{ color: BAC.info }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Permisos asignados
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {assigned.length}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 3,
            border: `1px solid ${BAC.grey200}`,
            backgroundColor: BAC.white,
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SecurityIcon sx={{ color: BAC.secondary }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Permisos visibles
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {filteredPermissions.length}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 2,
            borderRadius: 3,
            border: `1px solid ${BAC.grey200}`,
            backgroundColor: BAC.white,
            boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <FolderSpecialIcon sx={{ color: BAC.warning }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Asignados visibles
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {totalAssignedVisible}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 2,
          borderRadius: 3,
          border: `1px solid ${BAC.grey200}`,
          backgroundColor: BAC.white,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <FormControl
            fullWidth
            size="small"
            sx={{
              minWidth: { xs: "100%", md: 280 },
              "& .MuiOutlinedInput-root": { borderRadius: 2 },
            }}
          >
            <InputLabel>Seleccione un rol</InputLabel>
            <Select
              value={selectedRole}
              label="Seleccione un rol"
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.role_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Buscar permiso"
            placeholder="Busca por nombre o etiqueta"
            variant="outlined"
            size="small"
            fullWidth
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: BAC.white,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: BAC.grey500 }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Paper>

      {initialLoading ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: 3,
            border: `1px solid ${BAC.grey200}`,
            backgroundColor: BAC.white,
            textAlign: "center",
          }}
        >
          <CircularProgress sx={{ color: BAC.primary, mb: 2 }} />
          <Typography color="text.secondary">Cargando información...</Typography>
        </Paper>
      ) : !selectedRole ? (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 3,
            border: `1px solid ${BAC.grey200}`,
            backgroundColor: BAC.white,
          }}
        >
          <Alert
            severity="info"
            sx={{
              borderRadius: 2,
              backgroundColor: BAC.infoSoft,
              color: BAC.info,
              border: `1px solid ${alpha(BAC.info, 0.18)}`,
            }}
          >
            Selecciona un rol para administrar sus permisos.
          </Alert>
        </Paper>
      ) : loading ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            borderRadius: 3,
            border: `1px solid ${BAC.grey200}`,
            backgroundColor: BAC.white,
            textAlign: "center",
          }}
        >
          <CircularProgress sx={{ color: BAC.primary, mb: 2 }} />
          <Typography color="text.secondary">
            Cargando permisos del rol seleccionado...
          </Typography>
        </Paper>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: `1px solid ${BAC.grey200}`,
            backgroundColor: BAC.white,
          }}
        >
          <Box sx={{ p: 2.5 }}>
            <Typography variant="h6" fontWeight={700} sx={{ color: BAC.secondary }}>
              Permisos disponibles
            </Typography>
            <Typography variant="body2" sx={{ color: BAC.textSoft, mt: 0.5 }}>
              Activa o desactiva los permisos que tendrá el rol seleccionado.
            </Typography>
          </Box>

          <Divider sx={{ borderColor: BAC.grey200 }} />

          <Box sx={{ p: 2.5 }}>
            {moduleNames.length === 0 ? (
              <Alert
                severity="info"
                sx={{
                  borderRadius: 2,
                  backgroundColor: BAC.infoSoft,
                  color: BAC.info,
                  border: `1px solid ${alpha(BAC.info, 0.18)}`,
                }}
              >
                No hay permisos para mostrar con el filtro aplicado.
              </Alert>
            ) : (
              <Stack spacing={2}>
                {moduleNames.map((module) => {
                  const modulePermissions = groupedPermissions[module] || [];
                  const moduleIds = modulePermissions.map((p) => p.id);
                  const selectedCount = moduleIds.filter((id) =>
                    assigned.includes(id)
                  ).length;
                  const allSelected =
                    moduleIds.length > 0 && selectedCount === moduleIds.length;

                  return (
                    <Paper
                      key={module}
                      elevation={0}
                      sx={{
                        borderRadius: 3,
                        border: `1px solid ${BAC.grey200}`,
                        overflow: "hidden",
                        backgroundColor: BAC.white,
                      }}
                    >
                      <Box
                        sx={{
                          p: 2,
                          backgroundColor: alpha(BAC.grey200, 0.35),
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 1.5,
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            label={module}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              textTransform: "capitalize",
                              borderRadius: "10px",
                              ...getModuleStyle(module),
                            }}
                          />
                          <Chip
                            label={`${selectedCount}/${moduleIds.length}`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              color: BAC.secondary,
                              backgroundColor: BAC.grey100,
                              border: `1px solid ${BAC.grey300}`,
                            }}
                          />
                        </Stack>

                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleToggleModule(module)}
                          sx={{
                            borderRadius: 2,
                            fontWeight: 700,
                            borderColor: BAC.grey300,
                            color: BAC.secondary,
                            backgroundColor: BAC.white,
                          }}
                        >
                          {allSelected ? "Quitar módulo" : "Seleccionar módulo"}
                        </Button>
                      </Box>

                      <Box sx={{ p: 2 }}>
                        <Stack spacing={1}>
                          {modulePermissions.map((perm) => (
                            <Box
                              key={perm.id}
                              sx={{
                                px: 1.5,
                                py: 1,
                                borderRadius: 2,
                                border: `1px solid ${BAC.grey200}`,
                                backgroundColor: assigned.includes(perm.id)
                                  ? alpha(BAC.primary, 0.05)
                                  : BAC.white,
                              }}
                            >
                              <FormControlLabel
                                control={
                                  <Checkbox
                                    checked={assigned.includes(perm.id)}
                                    onChange={() => handleToggle(perm.id)}
                                    sx={{
                                      color: BAC.grey400,
                                      "&.Mui-checked": {
                                        color: BAC.primary,
                                      },
                                    }}
                                  />
                                }
                                label={
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      fontWeight={600}
                                      sx={{ color: BAC.text }}
                                    >
                                      {perm.permission_name}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: BAC.textSoft,
                                        fontFamily: "monospace",
                                      }}
                                    >
                                      {perm.permission_tag}
                                    </Typography>
                                  </Box>
                                }
                                sx={{
                                  width: "100%",
                                  margin: 0,
                                  alignItems: "flex-start",
                                }}
                              />
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Paper>
      )}

      <Box mt={3}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={() => setConfirmOpen(true)}
          disabled={!selectedRole}
          sx={{
            backgroundColor: BAC.primary,
            color: BAC.white,
            fontWeight: 700,
            borderRadius: 2,
            px: 3,
            py: 1.2,
            boxShadow: "none",
            "&:hover": {
              backgroundColor: BAC.primaryDark,
              boxShadow: "none",
            },
            "&.Mui-disabled": {
              backgroundColor: BAC.grey300,
              color: BAC.grey500,
            },
          }}
        >
          Guardar Cambios
        </Button>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: { xs: "90%", sm: 460 },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: BAC.secondary }}>
          Confirmar cambios
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: BAC.textSoft }}>
            ¿Está seguro de que desea guardar los cambios en los permisos del rol seleccionado?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{
              color: BAC.primary,
              fontWeight: 700,
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{
              backgroundColor: BAC.primary,
              color: BAC.white,
              fontWeight: 700,
              borderRadius: 2,
              boxShadow: "none",
              "&:hover": {
                backgroundColor: BAC.primaryDark,
                boxShadow: "none",
              },
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={successOpen}
        autoHideDuration={3000}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <AlertMessage
          onClose={() => setSuccessOpen(false)}
          severity="success"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          Permisos actualizados correctamente.
        </AlertMessage>
      </Snackbar>
    </Box>
  );
};

export default RolePermissionManager;