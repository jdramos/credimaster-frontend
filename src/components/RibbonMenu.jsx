import React, { useState, useContext, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Box,
  Tabs,
  Tab,
  Typography,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  InputAdornment,
  Paper,
  Avatar,
  Divider,
  Tooltip,
  Stack,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import * as FaIcons from "react-icons/fa";
import { UserContext } from "../contexts/UserContext";

const sectionLabels = {
  home: "Inicio",
  favorites: "Favoritos",
  main: "Catálogos",
  management: "Operaciones",
  users: "Usuarios y permisos",
  queries: "Consultas",
  conami_tables: "Tablas CONAMI",
};

const menuItems = {
  main: [
    { label: "Clientes", iconName: "FaPeopleArrows", to: "/clientes", group: "Clientes" },
    { label: "Sucursales", iconName: "FaRegBuilding", to: "/sucursales", group: "Estructura" },
    { label: "Riesgos", iconName: "FaPeopleCarry", to: "/riesgos", group: "Riesgo" },
    { label: "Departamentos", iconName: "FaBuilding", to: "/departamentos", group: "Estructura" },
    { label: "Colectores", iconName: "FaRegMoneyBillAlt", to: "/colectores", group: "Personal" },
    { label: "Promotores", iconName: "FaPersonBooth", to: "/promotores", group: "Personal" },
  ],
  management: [
    { label: "Créditos", iconName: "FaMoneyBillWaveAlt", to: "/creditos", group: "Créditos" },
    { label: "Pagos", iconName: "FaCashRegister", to: "/pagos", group: "Cobranza" },
    { label: "Crear saldos", iconName: "FaCalculator", to: "/crear-saldos", group: "Procesos" },
    { label: "Políticas de crédito", iconName: "FaFileSignature", to: "/creditos/politicas", group: "Créditos" },
  ],
  users: [
    { label: "Usuarios", iconName: "FaUser", to: "/usuarios", group: "Seguridad" },
    { label: "Roles", iconName: "FaUserShield", to: "/roles", group: "Seguridad" },
    { label: "Permisos", iconName: "FaKey", to: "/permisos", group: "Seguridad" },
    { label: "Aprobadores", iconName: "FaUserCheck", to: "/aprobadores", group: "Aprobaciones" },
  ],
  queries: [
    { label: "Saldos", iconName: "FaChartBar", to: "/saldos", group: "Reportes" },
    { label: "Provisiones", iconName: "FaChartLine", to: "/provisiones", group: "Reportes" },
    { label: "Sin riesgo", iconName: "FaShieldAlt", to: "/sinriesgos", group: "Control" },
  ],
  conami_tables: [
    { label: "Actividad económica", iconName: "FaIndustry", to: "/conami/actividad-economica", group: "Catálogos CONAMI" },
    { label: "Géneros", iconName: "FaUsers", to: "/generos", group: "Catálogos CONAMI" },
    { label: "Estado civil", iconName: "FaAddressCard", to: "/conami/estado-civil", group: "Catálogos CONAMI" },
  ],
};

const ribbonPalette = {
  blue: "linear-gradient(135deg, #0F4C81 0%, #1E73BE 100%)",
  cyan: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
  green: "linear-gradient(135deg, #166534 0%, #22C55E 100%)",
  red: "linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)",
  violet: "linear-gradient(135deg, #5B21B6 0%, #8B5CF6 100%)",
};

function getRibbonColor(section) {
  switch (section) {
    case "favorites":
      return ribbonPalette.violet;
    case "management":
      return ribbonPalette.green;
    case "users":
      return ribbonPalette.red;
    case "queries":
      return ribbonPalette.cyan;
    case "conami_tables":
      return ribbonPalette.blue;
    default:
      return ribbonPalette.blue;
  }
}

function RibbonMenu({
  themeMode,
  setThemeMode,
  onLogout,
  appName = "CrediMaster",
}) {
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
} = userCtx;

const userId = user;
const userName = fullName || "Usuario";
const userRole =
  typeof role === "object"
    ? role?.name || role?.label || role?.description || "Sin rol"
    : role || "Sin rol";

const userEmail = "";

  const [activeTab, setActiveTab] = useState("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [itemMenuAnchor, setItemMenuAnchor] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const openItemMenu = Boolean(itemMenuAnchor);
  const openUserMenu = Boolean(userMenuAnchor);

  const favoritesSection = useMemo(() => {
    if (!favorites?.length) return [];
    return favorites.map((f) => ({
      ...f,
      to: f.route,
      iconName: f.icon || "FaStar",
      group: "Favoritos",
    }));
  }, [favorites]);

  const fullMenu = useMemo(
    () => ({
      home: [{ label: "Inicio", iconName: "FaHome", to: "/", group: "Principal" }],
      ...(favoritesSection.length > 0 ? { favorites: favoritesSection } : {}),
      ...menuItems,
    }),
    [favoritesSection]
  );

  const filteredMenu = useMemo(() => {
    const term = String(searchTerm || "").trim().toLowerCase();
    if (!term) return fullMenu;

    const result = {};
    Object.entries(fullMenu).forEach(([section, items]) => {
      const matched = (items || []).filter((item) =>
        String(item.label || "").toLowerCase().includes(term)
      );
      if (matched.length) result[section] = matched;
    });
    return result;
  }, [fullMenu, searchTerm]);

  const visibleTabs = Object.keys(filteredMenu);
  const currentTab = visibleTabs.includes(activeTab)
    ? activeTab
    : visibleTabs[0] || "home";

  const currentItems = filteredMenu[currentTab] || [];

  const groupedItems = useMemo(() => {
    const groups = {};
    currentItems.forEach((item) => {
      const groupName = item.group || "General";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(item);
    });
    return groups;
  }, [currentItems]);

  const isFavorite = (item) =>
    item?.to && favorites.some((fav) => fav.route === item.to);

  const handleItemMenuClick = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setItemMenuAnchor(e.currentTarget);
    setSelectedItem(item);
  };

  const closeItemMenu = () => {
    setItemMenuAnchor(null);
    setSelectedItem(null);
  };

  const handleToggleFavorite = async () => {
    if (!selectedItem?.to) return;

    if (isFavorite(selectedItem)) {
      await removeFavorite?.(selectedItem.to);
    } else {
      await addFavorite?.(selectedItem);
    }

    closeItemMenu();
  };

  const handleLogout = async () => {
    setUserMenuAnchor(null);

    if (onLogout) {
      await onLogout();
      return;
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("session");
    window.location.href = "/login";
  };

  const RibbonButton = ({ item, section }) => {
    const IconComp = FaIcons[item.iconName] || FaIcons.FaQuestionCircle;
    const isActive = location.pathname === item.to;

    return (
      <Paper
        elevation={0}
        sx={{
          width: 120,
          minWidth: 120,
          height: 96,
          p: 1,
          borderRadius: 3,
          border: isActive ? "1px solid #1E73BE" : "1px solid rgba(15, 23, 42, 0.08)",
          background: isActive
            ? "linear-gradient(180deg, rgba(30,115,190,0.12), rgba(30,115,190,0.04))"
            : "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
          position: "relative",
          transition: "all .2s ease",
          boxShadow: isActive ? "0 8px 22px rgba(30,115,190,.16)" : "0 4px 12px rgba(15,23,42,.05)",
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 10px 24px rgba(15,23,42,.10)",
          },
        }}
      >
        <Box
          component={NavLink}
          to={item.to}
          sx={{
            textDecoration: "none",
            color: "inherit",
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            px: 0.5,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              background: getRibbonColor(section),
              boxShadow: "0 8px 18px rgba(15,76,129,.25)",
              mb: 1,
            }}
          >
            <IconComp size={18} />
          </Box>

          <Typography
            sx={{
              fontSize: 12.2,
              fontWeight: 800,
              lineHeight: 1.15,
              textAlign: "center",
              color: "#1F2937",
            }}
          >
            {item.label}
          </Typography>
        </Box>

        {item.to !== "/" && (
          <IconButton
            size="small"
            onClick={(e) => handleItemMenuClick(e, item)}
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 24,
              height: 24,
              color: "#64748B",
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
      </Paper>
    );
  };

  const initials = String(userName || "U")
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: "linear-gradient(90deg, #0B1F3A 0%, #0F4C81 45%, #1E73BE 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Toolbar
          sx={{
            minHeight: "70px !important",
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                background: "linear-gradient(135deg, #ffffff 0%, #dbeafe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 18px rgba(0,0,0,.18)",
              }}
            >
              <FaIcons.FaUniversity size={18} color="#0F4C81" />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.1,
                  letterSpacing: 0.3,
                }}
              >
                {appName}
              </Typography>
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.78)",
                  fontSize: 12.5,
                  fontWeight: 600,
                }}
              >
                Plataforma de gestión crediticia
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: "wrap" }}>
            <TextField
              size="small"
              placeholder="Buscar opción del menú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{
                minWidth: 300,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 3,
                  backgroundColor: "rgba(255,255,255,0.96)",
                  fontSize: 14,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Tooltip title="Perfil de usuario">
              <Paper
                onClick={(e) => setUserMenuAnchor(e.currentTarget)}
                elevation={0}
                sx={{
                  px: 1.2,
                  py: 0.8,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  borderRadius: 3,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "#fff",
                  minWidth: 220,
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    fontSize: 13,
                    fontWeight: 900,
                    bgcolor: "#fff",
                    color: "#0F4C81",
                  }}
                >
                  {initials}
                </Avatar>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 900,
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {userName}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      color: "rgba(255,255,255,0.80)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {userRole}
                  </Typography>
                </Box>
              </Paper>
            </Tooltip>
          </Stack>
        </Toolbar>

        <Box
          sx={{
            px: 2,
            background: "rgba(255,255,255,0.06)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Tabs
            value={currentTab}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            textColor="inherit"
            TabIndicatorProps={{
              style: {
                height: 3,
                borderRadius: 999,
                backgroundColor: "#ffffff",
              },
            }}
            sx={{
              minHeight: 48,
              "& .MuiTab-root": {
                minHeight: 48,
                color: "rgba(255,255,255,0.80)",
                fontWeight: 800,
                textTransform: "none",
                fontSize: 13.5,
              },
              "& .Mui-selected": {
                color: "#fff !important",
              },
            }}
          >
            {visibleTabs.map((section) => (
              <Tab
                key={section}
                value={section}
                label={sectionLabels[section] || section}
                icon={
                  section === "home" ? (
                    <HomeRoundedIcon sx={{ fontSize: 16 }} />
                  ) : section === "favorites" ? (
                    <StarRoundedIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <FaIcons.FaBars size={13} />
                  )
                }
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>
      </AppBar>

      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: "linear-gradient(180deg, #F8FAFC 0%, #EEF4FB 100%)",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            alignItems: "stretch",
          }}
        >
          {Object.entries(groupedItems).map(([groupName, items]) => (
            <Paper
              key={groupName}
              elevation={0}
              sx={{
                p: 1.2,
                borderRadius: 3,
                border: "1px solid rgba(15,23,42,0.08)",
                background: "rgba(255,255,255,0.78)",
                minWidth: 180,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  flexWrap: "wrap",
                  alignItems: "stretch",
                  justifyContent: "flex-start",
                  minHeight: 96,
                }}
              >
                {items.map((item, idx) => (
                  <RibbonButton
                    key={`${groupName}-${idx}`}
                    item={item}
                    section={currentTab}
                  />
                ))}
              </Box>

              <Divider sx={{ mt: 1.2, mb: 0.8 }} />

              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 900,
                  textAlign: "center",
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                {groupName}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>

      <Menu
        anchorEl={itemMenuAnchor}
        open={openItemMenu}
        onClose={closeItemMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleToggleFavorite}>
          {selectedItem && isFavorite(selectedItem)
            ? "Quitar de favoritos"
            : "Agregar a favoritos"}
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={userMenuAnchor}
        open={openUserMenu}
        onClose={() => setUserMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 280,
            borderRadius: 3,
            boxShadow: "0 14px 30px rgba(15,23,42,.14)",
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                width: 44,
                height: 44,
                fontSize: 14,
                fontWeight: 900,
                bgcolor: "#0F4C81",
              }}
            >
              {initials}
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 14 }}>
                {userName}
              </Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 12.5 }}>
                {userRole}
              </Typography>
              {userEmail ? (
                <Typography sx={{ color: "text.secondary", fontSize: 12 }}>
                  {userEmail}
                </Typography>
              ) : null}
            </Box>
          </Stack>
        </Box>

        <Divider />

        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <AccountCircleRoundedIcon sx={{ mr: 1.2, fontSize: 19 }} />
          Mi perfil
        </MenuItem>

        <MenuItem
          onClick={() => {
            setUserMenuAnchor(null);
            setThemeMode(themeMode === "light" ? "dark" : "light");
          }}
        >
          <DarkModeRoundedIcon sx={{ mr: 1.2, fontSize: 19 }} />
          {themeMode === "dark" ? "Modo claro" : "Modo oscuro"}
        </MenuItem>

        <Box sx={{ px: 2, py: 1 }}>
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Switch
                checked={themeMode === "dark"}
                onChange={() =>
                  setThemeMode(themeMode === "light" ? "dark" : "light")
                }
              />
            }
            label="Cambiar tema"
          />
        </Box>

        <Divider />

        <MenuItem
          onClick={handleLogout}
          sx={{
            color: "#B91C1C",
            fontWeight: 800,
          }}
        >
          <LogoutRoundedIcon sx={{ mr: 1.2, fontSize: 19 }} />
          Cerrar sesión
        </MenuItem>
      </Menu>
    </>
  );
}

export default RibbonMenu;