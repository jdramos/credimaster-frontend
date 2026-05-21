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
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";

import * as FaIcons from "react-icons/fa";
import { UserContext } from "../contexts/UserContext";

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
  ],
  users: [
    { label: "Usuarios", iconName: "FaUser", to: "/usuarios" },
    { label: "Roles", iconName: "FaUserShield", to: "/roles" },
    { label: "Permisos", iconName: "FaKey", to: "/permisos" },
    { label: "Aprobadores", iconName: "FaUserCheck", to: "/aprobadores" },
  ],
  queries: [
    { label: "Saldos", iconName: "FaChartBar", to: "/saldos" },
    { label: "Provisiones", iconName: "FaChartLine", to: "/provisiones" },
    { label: "Sin riesgo", iconName: "FaShieldAlt", to: "/sinriesgos" },
  ],
  conami_tables: [
    {
      label: "Actividad económica",
      iconName: "FaIndustry",
      to: "/conami/actividad-economica",
    },
    { label: "Géneros", iconName: "FaUsers", to: "/generos" },
    {
      label: "Estado civil",
      iconName: "FaAddressCard",
      to: "/conami/estado-civil",
    },
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
      label: "Contabilizar",
      iconName: "FaMagic",
      to: "/contabilidad/contabilizar",
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
  themeMode = "light",
  setThemeMode = () => {},
  onLogout,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();

  const userCtx = useContext(UserContext) || {};

  const {
    favorites = [],
    addFavorite,
    removeFavorite,
    user,
    fullName,
    role,
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
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const isCompact = !isMobile && !drawerOpen;

  const favoritesSection = useMemo(() => {
    if (!favorites?.length) return [];

    return favorites.map((f) => ({
      label: f.label,
      to: f.route,
      iconName: f.icon || "FaStar",
    }));
  }, [favorites]);

  const fullMenu = useMemo(
    () => ({
      ...(favoritesSection.length > 0 ? { favorites: favoritesSection } : {}),
      ...menuItems,
    }),
    [favoritesSection],
  );

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
                Gestión crediticia
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
    </Box>
  );
}
