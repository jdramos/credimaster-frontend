import React, { useContext, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  Snackbar,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import AssessmentIcon from "@mui/icons-material/Assessment";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

import * as FaIcons from "react-icons/fa";
import { UserContext } from "../contexts/UserContext";
import { useAuth } from "../contexts/AuthContext";
import API from "../api";

// Secciones del menú respaldadas por un módulo opcional habilitable por
// tenant desde superadmin (ver api/superadmin/moduleRegistry.js — la
// "key" de cada módulo ahí DEBE coincidir con el valor aquí). Una sección
// sin entrada en este mapa (main, management, accounting, etc.) es parte
// del producto base y nunca se oculta.
const SECTION_MODULE_KEY = {
  banks: "banks",
  caja: "caja",
  rrhh: "hr",
  obligations: "obligations",
};

const emptyPasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

const DRAWER_OPEN = 260;
const DRAWER_CLOSED = 72;

const sectionLabels = {
  favorites: "Favoritos",
  main: "Catálogos",
  management: "Operaciones",
  users: "Usuarios y permisos",
  queries: "Consultas",
  conami_tables: "Tablas CONAMI",
  accounting: "CONTABILIDAD",
  banks: "BANCOS",
  caja: "CAJA",
  rrhh: "RECURSOS HUMANOS",
  obligations: "OBLIGACIONES FINANCIERAS",
  reports: "Reportes",
  compliance: "CUMPLIMIENTO LA/FT/FP",
};

const menuItems = {
  main: [
    { label: "Clientes", iconName: "FaPeopleArrows", to: "/clientes" },
    { label: "Sucursales", iconName: "FaRegBuilding", to: "/sucursales" },
    { label: "Riesgos", iconName: "FaPeopleCarry", to: "/riesgos" },
    { label: "Departamentos", iconName: "FaBuilding", to: "/departamentos" },
    { label: "Colectores", iconName: "FaRegMoneyBillAlt", to: "/colectores" },
    { label: "Promotores", iconName: "FaPersonBooth", to: "/promotores" },
  ],
  management: [
    { label: "Créditos", iconName: "FaMoneyBillWaveAlt", to: "/creditos" },
    {
      label: "Bandeja aprobación",
      iconName: "FaInbox",
      to: "/bandeja-de-aprobacion",
    },
    { label: "Pagos", iconName: "FaCashRegister", to: "/pagos" },
    { label: "Crear saldos", iconName: "FaCalculator", to: "/crear-saldos" },
    { label: "Cierre del día", iconName: "FaLock", to: "/cierre-del-dia" },
    {
      label: "Políticas crédito",
      iconName: "FaFileSignature",
      to: "/creditos/politicas",
    },
    {
      label: "Documentos crédito",
      iconName: "FaFileAlt",
      to: "/creditos/archivos",
    },
    { label: "Reclamos", iconName: "FaExclamationCircle", to: "/reclamos" },
    { label: "Adjudicaciones de Bienes", iconName: "FaGavel", to: "/adjudicaciones" },
  ],
  users: [
    { label: "Calendarios laborales", iconName: "FaCalendarAlt", to: "/configuracion/calendarios" },
    { label: "Usuarios", iconName: "FaUser", to: "/usuarios" },
    { label: "Roles", iconName: "FaUserShield", to: "/roles" },
    { label: "Permisos", iconName: "FaKey", to: "/permisos" },
    { label: "Aprobadores", iconName: "FaUserCheck", to: "/aprobadores" },
  ],
  queries: [
    { label: "Dashboard de Saldos", iconName: "FaChartPie", to: "/dashboard/saldos", permission: "menu.dashboard" },
    { label: "Saldos", iconName: "FaChartBar", to: "/saldos" },
    { label: "Provisiones", iconName: "FaChartLine", to: "/provisiones" },
    { label: "Sin riesgo", iconName: "FaShieldAlt", to: "/sinriesgos" },
    { label: "Cartera saneada", iconName: "FaFileInvoiceDollar", to: "/cartera-saneada" },
    { label: "Reporte de Garantías", iconName: "FaLock", to: "/garantias/reporte" },
  ],
  compliance: [
    { label: "Matriz de Riesgo LA/FT/FP", iconName: "FaBalanceScale", to: "/cumplimiento/matriz-riesgo" },
    { label: "Recordatorio PIC", iconName: "FaClipboardList", to: "/cumplimiento/pic" },
    { label: "Listas de Riesgo", iconName: "FaListUl", to: "/cumplimiento/listas" },
    { label: "Alertas de Operaciones Inusuales", iconName: "FaExclamationTriangle", to: "/cumplimiento/alertas" },
    { label: "Casos ROS", iconName: "FaGavel", to: "/cumplimiento/ros" },
    { label: "Informe Mensual PLA/FT/FP", iconName: "FaChartBar", to: "/cumplimiento/informe-mensual" },
    { label: "Oficial de Cumplimiento", iconName: "FaUserShield", to: "/cumplimiento/oficial-cumplimiento" },
  ],
  conami_tables: [
    {
      label: "Tablas CONAMI",
      iconName: "FaMoneyCheckAlt",
      to: "/conami/tablas",
    },
  ],
  accounting: [
    {
      label: "Catálogo de cuentas",
      iconName: "FaUniversity",
      to: "/contabilidad/cuentas",
    },
    {
      label: "Libro Diario",
      iconName: "FaBook",
      to: "/contabilidad/libro-diario",
    },
    {
      label: "Mayor General",
      iconName: "FaBalanceScale",
      to: "/contabilidad/mayor",
    },
    {
      label: "Balance comprobación",
      iconName: "FaClipboardCheck",
      to: "/contabilidad/balance-comprobacion",
    },
    {
      label: "Estado resultados",
      iconName: "FaChartPie",
      to: "/contabilidad/estado-resultados",
    },
    {
      label: "Balance general",
      iconName: "FaLandmark",
      to: "/contabilidad/balance-general",
    },
    {
      label: "Cambios patrimonio",
      iconName: "FaChartLine",
      to: "/contabilidad/cambios-patrimonio",
    },
    {
      label: "Flujo de efectivo",
      iconName: "FaWater",
      to: "/contabilidad/flujo-efectivo",
    },
    {
      label: "Notas a los EEFF",
      iconName: "FaStickyNote",
      to: "/contabilidad/notas-eeff",
    },
    {
      label: "Cierre de ejercicio",
      iconName: "FaCalendarCheck",
      to: "/contabilidad/cierre-ejercicio",
    },
    {
      label: "Activo Fijo",
      iconName: "FaWarehouse",
      to: "/contabilidad/activo-fijo",
    },
    {
      label: "Depreciación de Activos",
      iconName: "FaChartArea",
      to: "/contabilidad/activo-fijo/depreciacion",
    },
    {
      label: "Contabilizar",
      iconName: "FaMagic",
      to: "/contabilidad/contabilizar",
    },
    {
      label: "Cuentas por operación",
      iconName: "FaSitemap",
      to: "/contabilidad/mapeos",
    },
    {
      label: "Partidas pendientes",
      iconName: "FaHourglassHalf",
      to: "/contabilidad/partidas-pendientes",
    },
  ],

  banks: [
    { label: "Cuentas Bancarias", iconName: "FaUniversity", to: "/bancos/cuentas" },
    { label: "Movimientos", iconName: "FaExchangeAlt", to: "/bancos/movimientos" },
    { label: "Conciliación Bancaria", iconName: "FaBalanceScaleRight", to: "/bancos/conciliacion" },
  ],

  caja: [
    { label: "Cajas", iconName: "FaCashRegister", to: "/caja/cajas" },
    { label: "Movimientos", iconName: "FaExchangeAlt", to: "/caja/movimientos" },
    { label: "Arqueo de Cobradores", iconName: "FaClipboardCheck", to: "/caja/arqueos" },
  ],

  obligations: [
    { label: "Financiadores", iconName: "FaLandmark", to: "/obligaciones/financiadores" },
    { label: "Líneas de Crédito", iconName: "FaLink", to: "/obligaciones/lineas-credito" },
    { label: "Obligaciones", iconName: "FaFileInvoiceDollar", to: "/obligaciones" },
  ],

  rrhh: [
    { label: "Empleados", iconName: "FaUserTie", to: "/rrhh/empleados" },
    { label: "Planillas", iconName: "FaMoneyCheckAlt", to: "/rrhh/planillas" },
    { label: "Préstamos de Empleados", iconName: "FaHandHoldingUsd", to: "/rrhh/prestamos" },
    { label: "Configuración de RRHH", iconName: "FaCogs", to: "/rrhh/configuracion" },
    { label: "Incidencias", iconName: "FaCalendarTimes", to: "/rrhh/incidencias" },
    { label: "Liquidaciones", iconName: "FaUserSlash", to: "/rrhh/liquidaciones" },
    { label: "Reportes RRHH", iconName: "FaChartBar", to: "/rrhh/reportes" },
    { label: "Mis Vacaciones", iconName: "FaUmbrellaBeach", to: "/rrhh/mis-vacaciones" },
    { label: "Aprobar Vacaciones", iconName: "FaClipboardCheck", to: "/rrhh/aprobar-vacaciones" },
  ],

  reports: [
    {
      label: "Auditoría",
      iconName: "FaHistory",
      to: "/auditoria",
    },
    {
      label: "ICC - CONAMI",
      iconName: "FaFileInvoiceDollar",
      to: "/reports/conami/icc",
    },
    {
      label: "ICC - CONAMI (generador)",
      iconName: "FaFileInvoice",
      to: "/conami/icc",
    },
    {
      label: "ISC - CONAMI (generador)",
      iconName: "FaFileInvoice",
      to: "/conami/isc",
    },
    {
      label: "CrediMaster Studio",
      to: "/reports/studio",
      iconName: "",
    },
  ],
};

function MenuIcon({ iconName, size = 17 }) {
  const Icon = FaIcons[iconName] || FaIcons.FaCircle;
  return <Icon size={size} />;
}

export default function AppLayoutMenu({
  children,
  appName = "CrediMaster",
  tenantName = "",
  themeMode = "light",
  setThemeMode = () => {},
  onLogout,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const { tenant } = useAuth();

  // enabled_modules null/undefined = todos habilitados (tenant sin
  // restricción explícita, o token viejo emitido antes de esta función).
  const enabledModules = tenant?.enabled_modules ?? null;
  const isSectionEnabled = (section) => {
    const moduleKey = SECTION_MODULE_KEY[section];
    if (!moduleKey) return true;
    if (enabledModules === null) return true;
    return Array.isArray(enabledModules) && enabledModules.includes(moduleKey);
  };

  const userCtx = useContext(UserContext) || {};

  const {
    favorites = [],
    addFavorite,
    removeFavorite,
    user,
    fullName,
    role,
    permissions = [],
    userBranches = [],
    logout,
  } = userCtx;

  const userName = fullName || "Usuario";
  const userRole =
    typeof role === "object"
      ? role?.name || role?.label || role?.description || "Sin rol"
      : role || "Sin rol";

  const initials = String(userName || "U")
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const [drawerOpen, setDrawerOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    favorites: true,
    main: true,
    management: true,
    users: false,
    queries: false,
    conami_tables: false,
    accounting: false,
    banks: false,
    caja: false,
    rrhh: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleOpenPasswordDialog = () => {
    setPasswordForm(emptyPasswordForm);
    setPasswordError("");
    setShowPasswords(false);
    setPasswordDialogOpen(true);
    setUserMenuAnchor(null);
  };

  const handleClosePasswordDialog = () => {
    if (savingPassword) return;
    setPasswordDialogOpen(false);
  };

  const handlePasswordFieldChange = (field) => (e) => {
    setPasswordForm((f) => ({ ...f, [field]: e.target.value }));
    setPasswordError("");
  };

  const handleSubmitPasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword) {
      setPasswordError("Ingrese su contraseña actual.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("La confirmación no coincide con la nueva contraseña.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("La nueva contraseña debe ser diferente a la actual.");
      return;
    }

    try {
      setSavingPassword(true);
      setPasswordError("");

      await API.put(`/api/users/${user}/reset-password`, {
        currentPassword,
        newPassword,
      });

      setPasswordDialogOpen(false);
      setPasswordSuccess(true);
    } catch (err) {
      setPasswordError(
        err.response?.data?.message ||
          err.response?.data?.errors ||
          "No se pudo actualizar la contraseña.",
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const isCompact = !isMobile && !drawerOpen;

  const favoritesSection = useMemo(() => {
    if (!favorites?.length) return [];

    return favorites.map((f) => ({
      label: f.label,
      to: f.route,
      iconName: f.icon || "FaStar",
    }));
  }, [favorites]);

  // Solo items que declaran "permission" quedan sujetos a este filtro — el
  // resto del menú sigue visible para cualquier usuario autenticado, igual
  // que antes. role === 1 (Gerente General) ve todo, sin excepción.
  const hasItemAccess = (item) =>
    !item.permission || role === 1 || permissions.includes(item.permission);

  const fullMenu = useMemo(() => {
    const base = {
      ...(favoritesSection.length > 0 ? { favorites: favoritesSection } : {}),
      ...menuItems,
    };

    const result = {};
    Object.entries(base).forEach(([section, items]) => {
      if (!isSectionEnabled(section)) return;
      const visibleItems = items.filter(hasItemAccess);
      if (visibleItems.length) result[section] = visibleItems;
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoritesSection, enabledModules, permissions, role]);

  const filteredMenu = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return fullMenu;

    const result = {};

    Object.entries(fullMenu).forEach(([section, items]) => {
      const matched = items.filter((item) =>
        item.label.toLowerCase().includes(term),
      );

      if (matched.length) result[section] = matched;
    });

    return result;
  }, [fullMenu, searchTerm]);

  const toggleSection = (section) => {
    if (isCompact) return;

    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleLogout = async () => {
    setUserMenuAnchor(null);

    if (onLogout) {
      await onLogout();
      return;
    }

    if (logout) {
      logout();
      return;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("session");
    localStorage.removeItem("fullName");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#0B1F3A",
        color: "#fff",
      }}
    >
      <Box
        sx={{
          height: 64,
          px: drawerOpen || isMobile ? 2 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: drawerOpen || isMobile ? "space-between" : "center",
        }}
      >
        <Stack
          direction="row"
          spacing={1.2}
          alignItems="center"
          sx={{ minWidth: 0 }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: "#fff",
              color: "#0F4C81",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FaIcons.FaUniversity size={16} />
          </Box>

          {(drawerOpen || isMobile) && (
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={900} fontSize={16} noWrap>
                {appName}
              </Typography>
              <Typography fontSize={11} color="rgba(255,255,255,.7)" noWrap>
                {tenantName ? `Licencia para: ${tenantName}` : "Gestión crediticia"}
              </Typography>
            </Box>
          )}
        </Stack>

        {!isMobile && drawerOpen && (
          <IconButton
            size="small"
            onClick={() => setDrawerOpen(false)}
            sx={{ color: "#fff" }}
          >
            <ChevronLeftRoundedIcon />
          </IconButton>
        )}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,.10)" }} />

      {!isCompact && (
        <Box sx={{ p: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar opción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                height: 38,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,.10)",
                color: "#fff",
                fontSize: 13,
                "& fieldset": {
                  borderColor: "rgba(255,255,255,.14)",
                },
                "&:hover fieldset": {
                  borderColor: "rgba(255,255,255,.25)",
                },
              },
              input: {
                color: "#fff",
                "&::placeholder": {
                  color: "rgba(255,255,255,.65)",
                  opacity: 1,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon
                    sx={{ color: "rgba(255,255,255,.75)", fontSize: 18 }}
                  />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", px: 1, py: 1 }}>
        {!isMobile && isCompact && (
          <Tooltip title="Expandir menú" placement="right">
            <ListItemButton
              onClick={() => setDrawerOpen(true)}
              sx={{
                mb: 1,
                borderRadius: 2,
                justifyContent: "center",
                color: "#fff",
              }}
            >
              <MenuRoundedIcon />
            </ListItemButton>
          </Tooltip>
        )}

        {Object.entries(filteredMenu).map(([section, items]) => {
          const opened = searchTerm ? true : openSections[section];

          return (
            <Box key={section} sx={{ mb: 0.5 }}>
              {!isCompact && (
                <ListItemButton
                  onClick={() => toggleSection(section)}
                  sx={{
                    borderRadius: 2,
                    color: "rgba(255,255,255,.82)",
                    minHeight: 36,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 34,
                      color:
                        section === "favorites"
                          ? "#FACC15"
                          : "rgba(255,255,255,.8)",
                    }}
                  >
                    {section === "favorites" ? (
                      <StarRoundedIcon fontSize="small" />
                    ) : (
                      <FaIcons.FaFolderOpen size={14} />
                    )}
                  </ListItemIcon>

                  <ListItemText
                    primary={sectionLabels[section] || section}
                    primaryTypographyProps={{
                      fontSize: 12,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: 0.3,
                    }}
                  />

                  {opened ? (
                    <ExpandLessRoundedIcon />
                  ) : (
                    <ExpandMoreRoundedIcon />
                  )}
                </ListItemButton>
              )}

              <Collapse
                in={isCompact || opened}
                timeout="auto"
                unmountOnExit={false}
              >
                <List dense disablePadding>
                  {items.map((item) => {
                    const isActive =
                      location.pathname === item.to ||
                      location.pathname.startsWith(`${item.to}/`);

                    return (
                      <Tooltip
                        key={item.to}
                        title={isCompact ? item.label : ""}
                        placement="right"
                      >
                        <ListItemButton
                          component={NavLink}
                          to={item.to}
                          onClick={() => {
                            if (isMobile) setMobileOpen(false);
                          }}
                          sx={{
                            my: 0.25,
                            mx: 0.25,
                            minHeight: 40,
                            borderRadius: 2,
                            color: isActive ? "#fff" : "rgba(255,255,255,.76)",
                            bgcolor: isActive
                              ? "rgba(30,115,190,.95)"
                              : "transparent",
                            justifyContent: isCompact ? "center" : "flex-start",
                            "&:hover": {
                              bgcolor: isActive
                                ? "rgba(30,115,190,1)"
                                : "rgba(255,255,255,.08)",
                            },
                          }}
                        >
                          <ListItemIcon
                            sx={{
                              minWidth: isCompact ? 0 : 36,
                              color: "inherit",
                              justifyContent: "center",
                            }}
                          >
                            <MenuIcon iconName={item.iconName} />
                          </ListItemIcon>

                          {!isCompact && (
                            <ListItemText
                              primary={item.label}
                              primaryTypographyProps={{
                                fontSize: 13,
                                fontWeight: isActive ? 900 : 700,
                              }}
                            />
                          )}
                        </ListItemButton>
                      </Tooltip>
                    );
                  })}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,.10)" }} />

      <Box sx={{ p: 1 }}>
        <ListItemButton
          onClick={(e) => setUserMenuAnchor(e.currentTarget)}
          sx={{
            borderRadius: 2,
            color: "#fff",
            justifyContent: isCompact ? "center" : "flex-start",
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              fontSize: 11,
              fontWeight: 900,
              bgcolor: "#fff",
              color: "#0F4C81",
              mr: isCompact ? 0 : 1,
            }}
          >
            {initials}
          </Avatar>

          {!isCompact && (
            <Box sx={{ minWidth: 0 }}>
              <Typography fontSize={12.5} fontWeight={900} noWrap>
                {userName}
              </Typography>
              <Typography fontSize={11} color="rgba(255,255,255,.65)" noWrap>
                {userRole}
              </Typography>
            </Box>
          )}
        </ListItemButton>
      </Box>
    </Box>
  );

  const drawerWidth = isMobile
    ? DRAWER_OPEN
    : drawerOpen
      ? DRAWER_OPEN
      : DRAWER_CLOSED;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F6F8FB" }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: "#fff",
          color: "#0F172A",
          borderBottom: "1px solid rgba(15,23,42,.08)",
          transition: "all .2s ease",
        }}
      >
        <Toolbar sx={{ minHeight: "58px !important", gap: 1.5 }}>
          {isMobile && (
            <IconButton onClick={() => setMobileOpen(true)}>
              <MenuRoundedIcon />
            </IconButton>
          )}

          <Box sx={{ flex: 1 }}>
            <Typography fontWeight={900} fontSize={17}>
              Panel principal
            </Typography>
            <Typography fontSize={12} color="text.secondary">
              Administración de créditos y operaciones
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Buscar..."
            sx={{
              display: { xs: "none", sm: "block" },
              width: 260,
              "& .MuiOutlinedInput-root": {
                height: 38,
                borderRadius: 2.5,
                bgcolor: "#F8FAFC",
                fontSize: 13,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />

          <Tooltip title="Usuario">
            <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: 12,
                  fontWeight: 900,
                  bgcolor: "#0F4C81",
                }}
              >
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
          transition: "width .2s ease",
        }}
      >
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: drawerWidth,
              border: "none",
              transition: "width .2s ease",
              overflowX: "hidden",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flex: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          pt: "58px",
          transition: "all .2s ease",
        }}
      >
        <Box sx={{ p: { xs: 1.5, md: 2 } }}>{children}</Box>
      </Box>

      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 260,
            borderRadius: 2.5,
            boxShadow: "0 12px 28px rgba(15,23,42,.14)",
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                width: 42,
                height: 42,
                fontSize: 13,
                fontWeight: 900,
                bgcolor: "#0F4C81",
              }}
            >
              {initials}
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={900} fontSize={13.5} noWrap>
                {userName}
              </Typography>
              <Typography color="text.secondary" fontSize={12} noWrap>
                {userRole}
              </Typography>
              <Typography color="text.secondary" fontSize={11.5}>
                ID usuario: {user || "-"}
              </Typography>
              <Typography color="text.secondary" fontSize={11.5}>
                Sucursales: {userBranches?.length || 0}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Divider />

        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <AccountCircleRoundedIcon sx={{ mr: 1.2, fontSize: 18 }} />
          Mi perfil
        </MenuItem>

        <MenuItem onClick={handleOpenPasswordDialog}>
          <LockOutlinedIcon sx={{ mr: 1.2, fontSize: 18 }} />
          Cambiar contraseña
        </MenuItem>

        <MenuItem
          onClick={() => {
            setUserMenuAnchor(null);
            setThemeMode(themeMode === "light" ? "dark" : "light");
          }}
        >
          <DarkModeRoundedIcon sx={{ mr: 1.2, fontSize: 18 }} />
          {themeMode === "dark" ? "Modo claro" : "Modo oscuro"}
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={handleLogout}
          sx={{
            color: "#B91C1C",
            fontWeight: 800,
          }}
        >
          <LogoutRoundedIcon sx={{ mr: 1.2, fontSize: 18 }} />
          Cerrar sesión
        </MenuItem>
      </Menu>

      <Dialog open={passwordDialogOpen} onClose={handleClosePasswordDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar contraseña</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Contraseña actual"
              type={showPasswords ? "text" : "password"}
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange("currentPassword")}
              autoFocus
            />
            <TextField
              fullWidth
              size="small"
              label="Nueva contraseña"
              type={showPasswords ? "text" : "password"}
              value={passwordForm.newPassword}
              onChange={handlePasswordFieldChange("newPassword")}
              helperText="Mínimo 8 caracteres"
            />
            <TextField
              fullWidth
              size="small"
              label="Confirmar nueva contraseña"
              type={showPasswords ? "text" : "password"}
              value={passwordForm.confirmPassword}
              onChange={handlePasswordFieldChange("confirmPassword")}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowPasswords((v) => !v)}
                      edge="end"
                    >
                      {showPasswords ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {passwordError && <Alert severity="error">{passwordError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePasswordDialog} disabled={savingPassword} sx={{ textTransform: "none" }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitPasswordChange}
            disabled={savingPassword}
            sx={{ textTransform: "none" }}
          >
            {savingPassword ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={passwordSuccess}
        autoHideDuration={4000}
        onClose={() => setPasswordSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity="success" onClose={() => setPasswordSuccess(false)}>
          Contraseña actualizada correctamente.
        </Alert>
      </Snackbar>
    </Box>
  );
}
