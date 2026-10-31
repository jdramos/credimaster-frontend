import fs from "fs";
import path from "path";
import { SCREEN_PERMISSIONS, OPEN_SCREENS, canOpenScreen } from "./menuScreenPermissions";

// Rutas declaradas en menuItems de AppLayoutMenu.jsx.
const menuPaths = () => {
  const src = fs.readFileSync(path.join(__dirname, "AppLayoutMenu.jsx"), "utf8");
  const block = src.slice(src.indexOf("const menuItems = {"), src.indexOf("function MenuIcon"));
  return [...new Set([...block.matchAll(/\bto:\s*"(\/[^"]*)"/g)].map((m) => m[1]))];
};

describe("permisos de las pantallas del menú", () => {
  test("toda opción del menú declara el permiso que exige su pantalla (o es de autoservicio)", () => {
    const paths = menuPaths();
    expect(paths.length).toBeGreaterThan(100);
    const missing = paths.filter((p) => !SCREEN_PERMISSIONS[p] && !OPEN_SCREENS.has(p));
    expect(missing).toEqual([]);
  });

  test("oculta la bandeja de aprobación a quien no tiene aprobaciones.ver", () => {
    expect(canOpenScreen("/bandeja-de-aprobacion", (t) => ["menu.creditos", "creditos.ver"].includes(t))).toBe(false);
    expect(canOpenScreen("/bandeja-de-aprobacion", (t) => t === "aprobaciones.ver")).toBe(true);
  });

  test("un arreglo es 'cualquiera de'", () => {
    expect(canOpenScreen("/sucursales", (t) => t === "configuracion.ver")).toBe(true);
    expect(canOpenScreen("/sucursales", () => false)).toBe(false);
  });

  test("autoservicio y rutas fuera del menú no se filtran", () => {
    expect(canOpenScreen("/rrhh/mis-vacaciones", () => false)).toBe(true);
    expect(canOpenScreen("/clientes/123/detalle", () => false)).toBe(true);
  });
});
