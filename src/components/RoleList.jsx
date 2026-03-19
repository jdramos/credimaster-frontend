import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Paper,
  Stack,
  Chip,
  Alert,
  alpha,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SecurityIcon from "@mui/icons-material/Security";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BadgeIcon from "@mui/icons-material/Badge";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import KeyIcon from "@mui/icons-material/Key";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_BASE_URL;
const TOKEN = process.env.REACT_APP_API_TOKEN;

const BAC = {
  primary: "#D32F2F",
  primaryDark: "#9A2424",
  primaryLight: "#FDECEC",

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

const getPermissionsCount = (role) => {
  if (typeof role.permissions_count === "number") return role.permissions_count;
  if (typeof role.total_permissions === "number") return role.total_permissions;
  if (Array.isArray(role.permissions)) return role.permissions.length;
  return 0;
};

const getRoleStatus = (role) => {
  if (role.role_status === 1 || role.role_status === "1" || role.role_status === "ACTIVO") {
    return {
      label: "Activo",
      color: BAC.success,
      bg: BAC.successSoft,
      border: `1px solid ${alpha(BAC.success, 0.18)}`,
    };
  }

  if (role.role_status === 0 || role.role_status === "0" || role.role_status === "INACTIVO") {
    return {
      label: "Inactivo",
      color: BAC.grey700,
      bg: BAC.grey100,
      border: `1px solid ${BAC.grey300}`,
    };
  }

  return {
    label: "Configurado",
    color: BAC.info,
    bg: BAC.infoSoft,
    border: `1px solid ${alpha(BAC.info, 0.18)}`,
  };
};

const RoleList = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [orderBy, setOrderBy] = useState("role_name");
  const [order, setOrder] = useState("asc");

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/roles`, {
        headers: { Authorization: TOKEN },
      });
      setRoles(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error al obtener roles:", err);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return roles;

    return roles.filter((role) => {
      const name = (role.role_name || "").toLowerCase();
      const id = String(role.id || "");
      return name.includes(term) || id.includes(term);
    });
  }, [roles, searchText]);

  const sortedRoles = useMemo(() => {
    const data = [...filteredRoles];

    data.sort((a, b) => {
      let aValue;
      let bValue;

      switch (orderBy) {
        case "id":
          aValue = Number(a.id || 0);
          bValue = Number(b.id || 0);
          break;
        case "role_name":
          aValue = a.role_name || "";
          bValue = b.role_name || "";
          break;
        case "permissions_count":
          aValue = getPermissionsCount(a);
          bValue = getPermissionsCount(b);
          break;
        default:
          aValue = a.role_name || "";
          bValue = b.role_name || "";
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return order === "asc" ? aValue - bValue : bValue - aValue;
      }

      return order === "asc"
        ? String(aValue).localeCompare(String(bValue), "es")
        : String(bValue).localeCompare(String(aValue), "es");
    });

    return data;
  }, [filteredRoles, orderBy, order]);

  const paginatedRoles = useMemo(() => {
    const start = page * rowsPerPage;
    return sortedRoles.slice(start, start + rowsPerPage);
  }, [sortedRoles, page, rowsPerPage]);

  const rolesWithPermissions = useMemo(() => {
    return roles.filter((role) => getPermissionsCount(role) > 0).length;
  }, [roles]);

  const totalPermissionsAssigned = useMemo(() => {
    return roles.reduce((sum, role) => sum + getPermissionsCount(role), 0);
  }, [roles]);

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
              Gestión de Roles
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.92, mt: 0.5 }}>
              Consulta y administra los roles y su estructura de permisos.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={fetchRoles}
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

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
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
            <SecurityIcon sx={{ color: BAC.primary }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total roles
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {roles.length}
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
            <VerifiedUserIcon sx={{ color: BAC.secondary }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Roles con permisos
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {rolesWithPermissions}
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
                {totalPermissionsAssigned}
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
            <AdminPanelSettingsIcon sx={{ color: BAC.warning }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                Resultados visibles
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {filteredRoles.length}
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
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", md: "center" }}
        >
          <TextField
            label="Buscar rol"
            placeholder="Busca por nombre o ID"
            variant="outlined"
            size="small"
            fullWidth
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(0);
            }}
            sx={{
              maxWidth: { xs: "100%", md: 420 },
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

          <Chip
            label={`${filteredRoles.length} rol(es)`}
            sx={{
              fontWeight: 700,
              borderRadius: 2,
              color: BAC.primary,
              backgroundColor: BAC.primaryLight,
              border: `1px solid ${alpha(BAC.primary, 0.18)}`,
            }}
          />
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          border: `1px solid ${BAC.grey200}`,
          backgroundColor: BAC.white,
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
            <Typography color="text.secondary">Cargando roles...</Typography>
          </Box>
        ) : filteredRoles.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Alert
              severity="info"
              sx={{
                borderRadius: 2,
                backgroundColor: BAC.infoSoft,
                color: BAC.info,
                border: `1px solid ${alpha(BAC.info, 0.18)}`,
              }}
            >
              No hay roles registrados para mostrar.
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
                        color: BAC.white,
                        fontWeight: 700,
                        borderBottom: "none",
                        whiteSpace: "nowrap",
                        fontSize: "0.92rem",
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
                          "& .MuiTableSortLabel-icon": {
                            color: "#fff !important",
                          },
                        }}
                      >
                        ID
                      </TableSortLabel>
                    </TableCell>

                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "role_name"}
                        direction={orderBy === "role_name" ? order : "asc"}
                        onClick={() => handleSort("role_name")}
                        sx={{
                          color: "#fff !important",
                          "& .MuiTableSortLabel-icon": {
                            color: "#fff !important",
                          },
                        }}
                      >
                        Nombre del rol
                      </TableSortLabel>
                    </TableCell>

                    <TableCell width="180">
                      <TableSortLabel
                        active={orderBy === "permissions_count"}
                        direction={orderBy === "permissions_count" ? order : "asc"}
                        onClick={() => handleSort("permissions_count")}
                        sx={{
                          color: "#fff !important",
                          "& .MuiTableSortLabel-icon": {
                            color: "#fff !important",
                          },
                        }}
                      >
                        Permisos
                      </TableSortLabel>
                    </TableCell>

                    <TableCell width="160">Estado</TableCell>
                    <TableCell align="center" width="140">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {paginatedRoles.map((role, index) => {
                    const permissionsCount = getPermissionsCount(role);
                    const status = getRoleStatus(role);

                    return (
                      <TableRow
                        key={role.id}
                        hover
                        sx={{
                          backgroundColor:
                            index % 2 === 0 ? BAC.white : alpha(BAC.grey200, 0.45),
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
                            label={role.id}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              minWidth: 52,
                              color: BAC.secondary,
                              backgroundColor: BAC.grey100,
                              border: `1px solid ${BAC.grey300}`,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: "12px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: BAC.primaryLight,
                                border: `1px solid ${alpha(BAC.primary, 0.15)}`,
                              }}
                            >
                              <BadgeIcon sx={{ color: BAC.primary }} />
                            </Box>

                            <Box>
                              <Typography
                                variant="subtitle2"
                                fontWeight={700}
                                sx={{ color: BAC.text }}
                              >
                                {role.role_name}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={`${permissionsCount} permiso(s)`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              color: permissionsCount > 0 ? BAC.info : BAC.grey700,
                              backgroundColor:
                                permissionsCount > 0 ? BAC.infoSoft : BAC.grey100,
                              border:
                                permissionsCount > 0
                                  ? `1px solid ${alpha(BAC.info, 0.18)}`
                                  : `1px solid ${BAC.grey300}`,
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={status.label}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              color: status.color,
                              backgroundColor: status.bg,
                              border: status.border,
                            }}
                          />
                        </TableCell>

                        <TableCell align="center">
                          <Tooltip title="Editar rol">
                            <IconButton
                              sx={{
                                color: BAC.info,
                                border: `1px solid ${alpha(BAC.info, 0.25)}`,
                                backgroundColor: BAC.white,
                                "&:hover": {
                                  backgroundColor: alpha(BAC.info, 0.08),
                                },
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={sortedRoles.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[10, 25, 50]}
              labelRowsPerPage="Filas por página"
            />
          </>
        )}
      </Paper>
    </Box>
  );
};

export default RoleList;