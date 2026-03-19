import React, { useState, useContext, useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  CssBaseline,
  TextField,
  IconButton,
  Divider,
  Box,
  Menu,
  MenuItem,
  Grow,
  FormControlLabel,
  Switch,
  Typography,
  InputAdornment,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import * as FaIcons from "react-icons/fa";
import { UserContext } from "../contexts/UserContext";
import { useTheme } from "@mui/material/styles";

const sectionLabels = {
  main: "Catálogos",
  management: "Operaciones",
  users: "Usuarios y permisos",
  queries: "Consultas",
  conami_tables: "Tablas CONAMI",
};

const menuItems = {
  main: [
    { label: "Clientes", iconName: "FaPeopleArrows", to: "/clientes" },
    { label: "Sucursales", iconName: "FaRegBuilding", to: "/sucursales" },
    { label: "Riesgos", iconName: "FaPeopleCarry", to: "/riesgos" },
    { label: "Departamentos", iconName: "FaPeopleCarry", to: "/departamentos" },
    { label: "Colectores", iconName: "FaRegMoneyBillAlt", to: "/colectores" },
    { label: "Promotores", iconName: "FaPersonBooth", to: "/promotores" },
  ],
  management: [
    { label: "Créditos", iconName: "FaMoneyBillWaveAlt", to: "/creditos" },
    { label: "Pagos", iconName: "FaMoneyBillWaveAlt", to: "/pagos" },
    { label: "Crear saldos", iconName: "FaMoneyBillWaveAlt", to: "/crear-saldos" },
    { label: "Políticas de crédito", iconName: "FaMoneyBillWaveAlt", to: "/creditos/politicas" },
  ],
  users: [
    { label: "Usuarios", iconName: "FaUser", to: "/usuarios" },
    { label: "Roles", iconName: "FaUser", to: "/roles" },
    { label: "Permisos", iconName: "FaUser", to: "/permisos" },
    { label: "Aprobadores", iconName: "FaUser", to: "/aprobadores" },
  ],
  queries: [
    { label: "Saldos", iconName: "FaChartBar", to: "/saldos" },
    { label: "Provisiones", iconName: "FaChartBar", to: "/provisiones" },
    { label: "Sin riesgo", iconName: "FaChartBar", to: "/sinriesgos" },
  ],
  conami_tables: [
    { label: "Actividad economica", iconName: "FaChartBar", to: "/conami/actividad-economica" },
    { label: "Géneros", iconName: "FaChartBar", to: "/generos" },
    { label: "Estado civil", iconName: "FaChartBar", to: "/conami/estado-civil" },
  ],
};

function Sidebar({ variant, open, onClose, drawerWidth, themeMode, setThemeMode }) {
  const [menuStates, setMenuStates] = useState({
    favorites: true,
    main: false,
    management: false,
    users: false,
    queries: false,
    conami_tables: false,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const theme = useTheme();
  const openMenu = Boolean(menuAnchorEl);

  const { favorites, addFavorite, removeFavorite } = useContext(UserContext);

  const matchesSearch = (text) =>
    String(text || "").toLowerCase().includes(String(searchTerm || "").toLowerCase());

  const hasVisibleItems = (section) =>
    (menuItems[section] || []).some((item) => matchesSearch(item.label));

  const isGroupOpen = (section) =>
    !searchTerm.trim() ? !!menuStates[section] : hasVisibleItems(section);

  const isFavorite = (item) => item?.to && favorites.some((fav) => fav.route === item.to);

  const toggleMenu = (menu) => {
    if (searchTerm.trim()) return;
    setMenuStates((prev) => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleMenuClick = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
    setSelectedItem(item);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedItem(null);
  };

  const handleToggleFavorite = async () => {
    if (selectedItem?.to) {
      isFavorite(selectedItem)
        ? await removeFavorite(selectedItem.to)
        : await addFavorite(selectedItem);
    }
    handleMenuClose();
  };

  const renderMenuItems = (section, items) =>
    (items || [])
      .filter((item) => matchesSearch(item.label))
      .map((item, index) => (
        <ListItem key={`${section}-${index}`} disablePadding sx={{ position: "relative" }}>
          <ListItemButton
            component={NavLink}
            to={item.to}
            className="bac-item"
          >
            <ListItemIcon className="bac-item-icon">
              {React.createElement(FaIcons[item.iconName] || FaIcons.FaQuestionCircle, {
                style: { fontSize: 18 },
              })}
            </ListItemIcon>

            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: 13.5 }}
              className="bac-item-text"
            />

            <Box sx={{ position: "absolute", right: 8, top: 6 }}>
              <IconButton
                size="small"
                onClick={(e) => handleMenuClick(e, item)}
                className="bac-item-more"
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          </ListItemButton>
        </ListItem>
      ));

  return (
    <>
      <CssBaseline />

      <Drawer
        className="bac-drawer"
        variant={variant}
        open={open}
        onClose={onClose}
        sx={{
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          },
        }}
      >
        {/* Scrollable content */}
        <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
          {/* Header/Search */}
          <Box className="bac-drawer-header">
            <Typography sx={{ fontWeight: 950, color: "var(--bac-text)", mb: 1 }}>
              Menú
            </Typography>

            <TextField
              className="bac-drawer-search"
              label="Buscar menú..."
              variant="outlined"
              size="small"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <List component="nav" sx={{ pb: 1 }}>
            {/* Inicio */}
            <ListItem disablePadding>
              <ListItemButton component={NavLink} to="/" className="bac-item">
                <ListItemIcon className="bac-item-icon">
                  <FaIcons.FaHome style={{ fontSize: 18 }} />
                </ListItemIcon>
                <ListItemText primary="Inicio" primaryTypographyProps={{ fontSize: 13.5 }} className="bac-item-text" />
              </ListItemButton>
            </ListItem>

            {/* Favoritos */}
            {favorites.length > 0 && (
              <>
                <ListItemButton onClick={() => toggleMenu("favorites")} className="bac-section-btn">
                  <ListItemIcon className="bac-item-icon">
                    <FaIcons.FaStar className="bac-star" style={{ fontSize: 18 }} />
                  </ListItemIcon>
                  <ListItemText primary="Favoritos" primaryTypographyProps={{ className: "bac-section-title" }} />
                  {!searchTerm && (menuStates.favorites ? <ExpandLess /> : <ExpandMore />)}
                </ListItemButton>

                <Collapse in={isGroupOpen("favorites")} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {renderMenuItems(
                      "favorites",
                      favorites.map((f) => ({ ...f, to: f.route, iconName: f.icon }))
                    )}
                  </List>
                </Collapse>

                <Divider className="bac-divider" sx={{ my: 1 }} />
              </>
            )}

            {/* Secciones */}
            {Object.entries(menuItems).map(([section, items]) =>
              hasVisibleItems(section) ? (
                <React.Fragment key={section}>
                  <ListItemButton onClick={() => toggleMenu(section)} className="bac-section-btn">
                    <ListItemIcon className="bac-item-icon">
                      <FaIcons.FaBars style={{ fontSize: 16 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={sectionLabels[section] || section}
                      primaryTypographyProps={{ className: "bac-section-title" }}
                    />
                    {!searchTerm && (isGroupOpen(section) ? <ExpandLess /> : <ExpandMore />)}
                  </ListItemButton>

                  <Collapse in={isGroupOpen(section)} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {renderMenuItems(section, items)}
                    </List>
                  </Collapse>

                  <Divider className="bac-divider" sx={{ my: 1 }} />
                </React.Fragment>
              ) : null
            )}
          </List>
        </Box>

        {/* Footer */}
        <Box className="bac-drawer-footer">
          <FormControlLabel
            control={
              <Switch
                checked={themeMode === "dark"}
                onChange={() => setThemeMode(themeMode === "light" ? "dark" : "light")}
              />
            }
            label="Modo oscuro"
            sx={{
              ".MuiFormControlLabel-label": {
                color: "var(--bac-text)",
                fontWeight: 800,
                fontSize: 13,
              },
            }}
          />
        </Box>

        {/* Context menu */}
        <Menu
          className="bac-context-menu"
          anchorEl={menuAnchorEl}
          open={openMenu}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          TransitionComponent={Grow}
        >
          <MenuItem onClick={handleToggleFavorite}>
            {selectedItem && isFavorite(selectedItem) ? "Quitar de favoritos" : "Agregar a favoritos"}
          </MenuItem>
        </Menu>
      </Drawer>
    </>
  );
}

export default Sidebar;