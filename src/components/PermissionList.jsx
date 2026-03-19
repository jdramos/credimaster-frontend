import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  TextField,
  CircularProgress,
  Stack,
  Tooltip,
  Chip,
  InputAdornment,
  Alert,
  Divider,
  alpha,
  TableContainer,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  TableSortLabel,
  Snackbar,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/Security";
import KeyIcon from "@mui/icons-material/Key";
import CategoryIcon from "@mui/icons-material/Category";
import FilterListIcon from "@mui/icons-material/FilterList";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import axios from "axios";
import PermissionFormDialog from "./PermissionFormDialog";
import ConfirmDialog from "./ConfirmDialog";

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
  secondary: "#212121",
  success: "#2E7D32",
  warning: "#ED6C02",
  info: "#0288D1",
  danger: "#D32F2F",
  grey100: "#F8F9FB",
  grey200: "#EEF1F5",
  grey300: "#D7DCE3",
  grey500: "#6B7280",
};

const getModuleFromTag = (tag = "") => {
  if (!tag) return "general";
  return tag.split(".")[0] || "general";
};

const getActionFromTag = (tag = "") => {
  if (!tag) return "general";
  const parts = tag.split(".");
  return parts[parts.length - 1] || "general";
};

const getModuleColor = (module) => {
  const colors = {
    clientes: "primary",
    creditos: "success",
    pagos: "info",
    cobros: "warning",
    balances: "secondary",
    reportes: "info",
    usuarios: "primary",
    roles: "warning",
    sucursales: "success",
    auditoria: "secondary",
    configuracion: "default",
    garantias: "success",
    especial: "error",
    dashboard: "info",
    mora: "warning",
    politicas_credito: "secondary",
    tipos_riesgo: "error",
    tipos_negocio: "success",
  };

  return colors[module] || "default";
};

const normalizeString = (value) => (value || "").toString().trim().toLowerCase();

const PermissionList = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openDialog, setOpenDialog] = useState(false);
  const [editPermission, setEditPermission] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [permissionToDelete, setPermissionToDelete] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [orderBy, setOrderBy] = useState("id");
  const [order, setOrder] = useState("asc");

  const [snackbar, setSnackbar] = useState({
    open: false,
    type: "success",
    message: "",
  });

  const showSnackbar = (message, type = "success") => {
    setSnackbar({ open: true, message, type });
  };

  const closeSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/permissions`, {
        headers: { Authorization: TOKEN },
      });

      const data = Array.isArray(res.data) ? res.data : [];
      setPermissions(data);
    } catch (err) {
      console.error("Error al cargar permisos:", err);
      setPermissions([]);
      showSnackbar("Error al cargar los permisos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const moduleOptions = useMemo(() => {
    const modules = [...new Set(permissions.map((p) => getModuleFromTag(p.permission_tag)))];
    return modules.sort((a, b) => a.localeCompare(b, "es"));
  }, [permissions]);

  const actionOptions = useMemo(() => {
    const actions = [...new Set(permissions.map((p) => getActionFromTag(p.permission_tag)))];
    return actions.sort((a, b) => a.localeCompare(b, "es"));
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    const text = normalizeString(searchText);

    return permissions.filter((p) => {
      const name = normalizeString(p.permission_name);
      const tag = normalizeString(p.permission_tag);
      const module = normalizeString(getModuleFromTag(p.permission_tag));
      const action = normalizeString(getActionFromTag(p.permission_tag));

      const matchText = !text || name.includes(text) || tag.includes(text);
      const matchModule = !moduleFilter || module === normalizeString(moduleFilter);
      const matchAction = !actionFilter || action === normalizeString(actionFilter);

      return matchText && matchModule && matchAction;
    });
  }, [permissions, searchText, moduleFilter, actionFilter]);

  const sortedPermissions = useMemo(() => {
    const data = [...filteredPermissions];

    data.sort((a, b) => {
      let aValue = "";
      let bValue = "";

      switch (orderBy) {
        case "id":
          aValue = Number(a.id || 0);
          bValue = Number(b.id || 0);
          break;
        case "permission_name":
          aValue = a.permission_name || "";
          bValue = b.permission_name || "";
          break;
        case "permission_tag":
          aValue = a.permission_tag || "";
          bValue = b.permission_tag || "";
          break;
        case "module":
          aValue = getModuleFromTag(a.permission_tag);
          bValue = getModuleFromTag(b.permission_tag);
          break;
        case "action":
          aValue = getActionFromTag(a.permission_tag);
          bValue = getActionFromTag(b.permission_tag);
          break;
        default:
          aValue = a.id || 0;
          bValue = b.id || 0;
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return order === "asc" ? aValue - bValue : bValue - aValue;
      }

      return order === "asc"
        ? String(aValue).localeCompare(String(bValue), "es")
        : String(bValue).localeCompare(String(aValue), "es");
    });

    return data;
  }, [filteredPermissions, orderBy, order]);

  const paginatedPermissions = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedPermissions.slice(start, start + rowsPerPage);
  }, [sortedPermissions, page, rowsPerPage]);

  const totalModules = useMemo(() => {
    const modules = new Set(permissions.map((p) => getModuleFromTag(p.permission_tag)));
    return modules.size;
  }, [permissions]);

  const totalActions = useMemo(() => {
    const actions = new Set(permissions.map((p) => getActionFromTag(p.permission_tag)));
    return actions.size;
  }, [permissions]);

  const handleSort = (field) => {
    const isAsc = orderBy === field && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(field);
  };

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const resetFilters = () => {
    setSearchText("");
    setModuleFilter("");
    setActionFilter("");
    setPage(0);
  };

  const handleDelete = async () => {
    if (!permissionToDelete?.id) return;

    try {
      await axios.delete(`${API_URL}/api/permissions/${permissionToDelete.id}`, {
        headers: { Authorization: TOKEN },
      });

      await fetchPermissions();
      showSnackbar("Permiso eliminado correctamente", "success");
    } catch (err) {
      console.error("Error al eliminar el permiso:", err);
      showSnackbar("Error al eliminar el permiso", "error");
    } finally {
      setConfirmOpen(false);
      setPermissionToDelete(null);
    }
  };

  const copyPermissionTag = async (tag) => {
    try {
      await navigator.clipboard.writeText(tag);
      showSnackbar(`Etiqueta copiada: ${tag}`, "success");
    } catch (err) {
      console.error("Error al copiar:", err);
      showSnackbar("No se pudo copiar la etiqueta", "error");
    }
  };

  const exportPermissions = () => {
    try {
      const dataToExport = sortedPermissions.map((p) => ({
        id: p.id,
        tag: p.permission_tag,
        name: p.permission_name,
      }));

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: "application/json",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "credimaster-permissions.json";
      link.click();

      showSnackbar("Permisos exportados correctamente", "success");
    } catch (err) {
      console.error("Error al exportar permisos:", err);
      showSnackbar("Error al exportar permisos", "error");
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
          color: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
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
              Gestión de Permisos
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.92, mt: 0.5 }}>
              Administra los permisos funcionales y operativos de CrediMaster.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={exportPermissions}
              sx={{
                backgroundColor: alpha("#fff", 0.14),
                color: "#fff",
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
                py: 1,
                boxShadow: "none",
                border: "1px solid rgba(255,255,255,0.18)",
                "&:hover": {
                  backgroundColor: alpha("#fff", 0.22),
                  boxShadow: "none",
                },
              }}
            >
              Exportar
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditPermission(null);
                setOpenDialog(true);
              }}
              sx={{
                backgroundColor: "#fff",
                color: BAC.primary,
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
                py: 1,
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#fff",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                },
              }}
            >
              Agregar Permiso
            </Button>
          </Stack>
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
            backgroundColor: "#fff",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SecurityIcon sx={{ color: BAC.primary }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total permisos
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {permissions.length}
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
            backgroundColor: "#fff",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CategoryIcon sx={{ color: BAC.info }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Módulos
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {totalModules}
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
            backgroundColor: "#fff",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Inventory2OutlinedIcon sx={{ color: BAC.success }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Resultados filtrados
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
            backgroundColor: "#fff",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <KeyIcon sx={{ color: BAC.warning }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Acciones detectadas
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {totalActions}
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
          backgroundColor: "#fff",
        }}
      >
        <Stack spacing={2}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ color: BAC.secondary }}
          >
            <FilterListIcon fontSize="small" />
            <Typography variant="subtitle1" fontWeight={700}>
              Filtros y búsqueda
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Buscar permiso"
              placeholder="Busca por nombre o etiqueta"
              variant="outlined"
              size="small"
              fullWidth
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(0);
              }}
              sx={{
                flex: 1.6,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor: "#fff",
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

            <FormControl
              size="small"
              sx={{
                minWidth: { xs: "100%", md: 220 },
                "& .MuiOutlinedInput-root": { borderRadius: 2 },
              }}
            >
              <InputLabel>Módulo</InputLabel>
              <Select
                value={moduleFilter}
                label="Módulo"
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                {moduleOptions.map((module) => (
                  <MenuItem key={module} value={module}>
                    {module}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl
              size="small"
              sx={{
                minWidth: { xs: "100%", md: 220 },
                "& .MuiOutlinedInput-root": { borderRadius: 2 },
              }}
            >
              <InputLabel>Acción</InputLabel>
              <Select
                value={actionFilter}
                label="Acción"
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">Todas</MenuItem>
                {actionOptions.map((action) => (
                  <MenuItem key={action} value={action}>
                    {action}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={resetFilters}
              sx={{
                minWidth: { xs: "100%", md: 160 },
                borderRadius: 2,
                fontWeight: 700,
                borderColor: BAC.grey300,
                color: BAC.secondary,
              }}
            >
              Limpiar
            </Button>
          </Stack>

          <Stack direction="row" justifyContent="flex-end">
            <Chip
              label={`${filteredPermissions.length} resultado(s)`}
              sx={{
                fontWeight: 700,
                borderRadius: 2,
                backgroundColor: alpha(BAC.primary, 0.08),
                color: BAC.primary,
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${BAC.grey200}`,
          backgroundColor: "#fff",
        }}
      >
        {loading ? (
          <Box
            sx={{
              py: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <CircularProgress sx={{ color: BAC.primary }} />
            <Typography color="text.secondary">Cargando permisos...</Typography>
          </Box>
        ) : filteredPermissions.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Alert
              severity="info"
              sx={{
                borderRadius: 2,
                "& .MuiAlert-icon": {
                  color: BAC.info,
                },
              }}
            >
              No hay permisos registrados con los filtros seleccionados.
            </Alert>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow
                    sx={{
                      backgroundColor: BAC.secondary,
                      "& .MuiTableCell-root": {
                        color: "#fff",
                        fontWeight: 700,
                        borderBottom: "none",
                        whiteSpace: "nowrap",
                      },
                    }}
                  >
                    <TableCell width="90">
                      <TableSortLabel
                        active={orderBy === "id"}
                        direction={orderBy === "id" ? order : "asc"}
                        onClick={() => handleSort("id")}
                        sx={{
                          color: "#fff !important",
                          "& .MuiTableSortLabel-icon": { color: "#fff !important" },
                        }}
                      >
                        ID
                      </TableSortLabel>
                    </TableCell>

                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "permission_name"}
                        direction={orderBy === "permission_name" ? order : "asc"}
                        onClick={() => handleSort("permission_name")}
                        sx={{
                          color: "#fff !important",
                          "& .MuiTableSortLabel-icon": { color: "#fff !important" },
                        }}
                      >
                        Nombre del permiso
                      </TableSortLabel>
                    </TableCell>

                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "permission_tag"}
                        direction={orderBy === "permission_tag" ? order : "asc"}
                        onClick={() => handleSort("permission_tag")}
                        sx={{
                          color: "#fff !important",
                          "& .MuiTableSortLabel-icon": { color: "#fff !important" },
                        }}
                      >
                        Etiqueta
                      </TableSortLabel>
                    </TableCell>

                    <TableCell width="150">
                      <TableSortLabel
                        active={orderBy === "module"}
                        direction={orderBy === "module" ? order : "asc"}
                        onClick={() => handleSort("module")}
                        sx={{
                          color: "#fff !important",
                          "& .MuiTableSortLabel-icon": { color: "#fff !important" },
                        }}
                      >
                        Módulo
                      </TableSortLabel>
                    </TableCell>

                    <TableCell width="150">
                      <TableSortLabel
                        active={orderBy === "action"}
                        direction={orderBy === "action" ? order : "asc"}
                        onClick={() => handleSort("action")}
                        sx={{
                          color: "#fff !important",
                          "& .MuiTableSortLabel-icon": { color: "#fff !important" },
                        }}
                      >
                        Acción
                      </TableSortLabel>
                    </TableCell>

                    <TableCell align="center" width="190">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedPermissions.map((perm, index) => {
                    const module = getModuleFromTag(perm.permission_tag);
                    const action = getActionFromTag(perm.permission_tag);

                    return (
                      <TableRow
                        key={perm.id}
                        hover
                        sx={{
                          backgroundColor:
                            index % 2 === 0 ? "#fff" : alpha(BAC.grey200, 0.35),
                          transition: "all 0.2s ease",
                          "&:hover": {
                            backgroundColor: alpha(BAC.primary, 0.05),
                          },
                          "& .MuiTableCell-root": {
                            borderBottom: `1px solid ${BAC.grey200}`,
                            verticalAlign: "middle",
                          },
                        }}
                      >
                        <TableCell>
                          <Chip
                            label={perm.id}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              minWidth: 52,
                              backgroundColor: alpha(BAC.secondary, 0.08),
                              color: BAC.secondary,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography fontWeight={600}>
                            {perm.permission_name}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: "monospace",
                                backgroundColor: alpha(BAC.info, 0.06),
                                color: BAC.secondary,
                                px: 1.25,
                                py: 0.75,
                                borderRadius: 2,
                                display: "inline-block",
                                wordBreak: "break-word",
                              }}
                            >
                              {perm.permission_tag}
                            </Typography>

                            <Tooltip title="Copiar etiqueta">
                              <IconButton
                                size="small"
                                onClick={() => copyPermissionTag(perm.permission_tag)}
                                sx={{
                                  color: BAC.grey500,
                                  "&:hover": {
                                    backgroundColor: alpha(BAC.info, 0.08),
                                    color: BAC.info,
                                  },
                                }}
                              >
                                <ContentCopyIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={module}
                            color={getModuleColor(module)}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600, textTransform: "capitalize" }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={action}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              textTransform: "capitalize",
                              backgroundColor: alpha(BAC.warning, 0.08),
                              color: BAC.warning,
                              border: `1px solid ${alpha(BAC.warning, 0.2)}`,
                            }}
                          />
                        </TableCell>

                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="Editar permiso">
                              <IconButton
                                onClick={() => {
                                  setEditPermission(perm);
                                  setOpenDialog(true);
                                }}
                                sx={{
                                  color: BAC.info,
                                  border: `1px solid ${alpha(BAC.info, 0.3)}`,
                                  "&:hover": {
                                    backgroundColor: alpha(BAC.info, 0.08),
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Eliminar permiso">
                              <IconButton
                                onClick={() => {
                                  setPermissionToDelete(perm);
                                  setConfirmOpen(true);
                                }}
                                sx={{
                                  color: BAC.danger,
                                  border: `1px solid ${alpha(BAC.danger, 0.3)}`,
                                  "&:hover": {
                                    backgroundColor: alpha(BAC.danger, 0.08),
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={sortedPermissions.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Filas por página"
            />
          </>
        )}
      </Paper>

      <Divider sx={{ my: 3, borderColor: BAC.grey200 }} />

      <PermissionFormDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSuccess={(message) => {
          setOpenDialog(false);
          fetchPermissions();
          showSnackbar(message || "Operación realizada correctamente", "success");
        }}
        permissionToEdit={editPermission}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        confirm={handleDelete}
        cancel={() => setConfirmOpen(false)}
        cancelOperation={true}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.type}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PermissionList;