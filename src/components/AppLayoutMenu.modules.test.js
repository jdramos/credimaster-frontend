import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppLayoutMenu from "./AppLayoutMenu";
import { UserContext } from "../contexts/UserContext";
import { useAuth } from "../contexts/AuthContext";
import { blockedModuleForPath } from "../utils/moduleAccess";

jest.mock("../api", () => ({ get: jest.fn(() => Promise.resolve({ data: {} })), put: jest.fn() }));
jest.mock("../contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("./GlobalSearch", () => () => null);
jest.mock("./KeyboardShortcuts", () => ({ __esModule: true, default: () => null, SHORTCUT_BY_PATH: {} }));
jest.mock("./BusinessDayAlert", () => () => null);
jest.mock("./itRisk/ItRiskDeadlineAlert", () => () => null);

const renderMenu = (enabledModules, path = "/") => {
  useAuth.mockReturnValue({ tenant: { enabled_modules: enabledModules, legal_name: "Prestamos SA" } });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <UserContext.Provider value={{ role: 1, permissions: [], favorites: [], user: 1, fullName: "Ana" }}>
        <AppLayoutMenu>
          <div data-testid="screen">pantalla</div>
        </AppLayoutMenu>
      </UserContext.Provider>
    </MemoryRouter>,
  );
};

describe("Menú según los módulos de la empresa", () => {
  it("Cartera y Cobranza: sin Contabilidad ni Cumplimiento, con Operaciones", () => {
    renderMenu([]);
    expect(screen.queryAllByText("CONTABILIDAD")).toHaveLength(0);
    expect(screen.queryAllByText("CUMPLIMIENTO LA/FT/FP")).toHaveLength(0);
    expect(screen.queryAllByText("CAJA")).toHaveLength(0);
    expect(screen.getAllByText("Operaciones").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pagos").length).toBeGreaterThan(0);
  });

  it("Gestión: con Contabilidad y Caja, sin Cumplimiento", () => {
    renderMenu(["accounting", "caja", "banks", "budget", "insurance"]);
    expect(screen.getAllByText("CONTABILIDAD").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CAJA").length).toBeGreaterThan(0);
    expect(screen.queryAllByText("CUMPLIMIENTO LA/FT/FP")).toHaveLength(0);
  });

  it("todos los módulos (null): se ven Contabilidad y Cumplimiento", () => {
    renderMenu(null);
    expect(screen.getAllByText("CONTABILIDAD").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CUMPLIMIENTO LA/FT/FP").length).toBeGreaterThan(0);
  });

  it("una pantalla de un módulo apagado muestra un aviso en vez de abrirse", () => {
    renderMenu([], "/contabilidad/libro-diario");
    expect(screen.getByTestId("module-disabled-notice").textContent).toContain("Contabilidad");
    expect(screen.queryByTestId("screen")).toBeNull();
  });

  it("una pantalla del núcleo se abre normalmente", () => {
    renderMenu([], "/pagos");
    expect(screen.getByTestId("screen")).toBeTruthy();
    expect(screen.queryByTestId("module-disabled-notice")).toBeNull();
  });
});

describe("Rutas por módulo", () => {
  it("bloquea por prefijo y exige todos los módulos de la ruta", () => {
    expect(blockedModuleForPath("/contabilidad/mayor", [])).toBe("accounting");
    expect(blockedModuleForPath("/cuentas-por-pagar", [])).toBe("accounting");
    expect(blockedModuleForPath("/cumplimiento/alertas", ["accounting"])).toBe("compliance");
    expect(blockedModuleForPath("/rrhh/conozca-su-empleado", ["hr"])).toBe("compliance");
    expect(blockedModuleForPath("/rrhh/empleados", ["hr"])).toBeNull();
    expect(blockedModuleForPath("/ti/riesgo/incidentes", ["it"])).toBe("it_risk");
    expect(blockedModuleForPath("/cajas-algo", [])).toBeNull();
    expect(blockedModuleForPath("/contabilidad/mayor", null)).toBeNull();
  });
});
