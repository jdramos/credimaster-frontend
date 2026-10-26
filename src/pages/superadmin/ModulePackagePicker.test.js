import React, { useState } from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import API from "../../api";
import ModulePackagePicker from "./ModulePackagePicker";
import TenantsPage from "./TenantsPage";
import { applyPackage, lockReason, toggleModule, withDependencies } from "./modulePackages";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("./SanctionsFeedSyncPanel", () => () => null);
jest.mock("./ConamiIndicatorsPanel", () => () => null);
jest.mock("../SecurityPage", () => ({ MfaPolicyPanel: () => null }));
jest.mock("../../api/mfa", () => ({ getTenantMfaPolicy: jest.fn(), updateTenantMfaPolicy: jest.fn() }));
jest.mock("@mui/x-data-grid", () => ({
  DataGrid: ({ rows, columns }) => (
    <table>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            {columns.map((c) => (
              <td key={c.field}>{c.renderCell ? c.renderCell({ value: r[c.field], row: r }) : String(r[c.field] ?? "")}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

// Mismo catálogo que entrega GET /api/superadmin/modules (moduleRegistry.js).
const KEYS = ["accounting", "banks", "caja", "hr", "obligations", "budget", "insurance", "compliance", "it", "icc", "isc", "sinriesgo", "it_risk", "risk_classification_ngrc"];
const LABELS = {
  accounting: "Contabilidad MUC", banks: "Bancos", caja: "Caja", hr: "Recursos Humanos", obligations: "Obligaciones Financieras",
  budget: "Presupuesto", insurance: "Seguros", compliance: "Cumplimiento LA/FT/FP", it: "Gestión de TI", icc: "Informe ICC",
  isc: "Informe ISC", sinriesgo: "Reporte Sin Riesgo", it_risk: "Riesgo Tecnológico", risk_classification_ngrc: "Clasificación NGRC",
};
const CATALOG = {
  modules: KEYS.map((key) => ({ key, label: LABELS[key] })),
  packages: [
    { key: "CARTERA_COBRANZA", label: "Cartera y Cobranza", description: "Núcleo", modules: [] },
    { key: "GESTION", label: "Gestión", description: "Con contabilidad", modules: ["accounting", "caja", "banks", "budget", "insurance"] },
    { key: "IMF_REGULADA", label: "IMF regulada", description: "Todo", modules: KEYS },
  ],
  dependencies: {
    caja: ["accounting"], banks: ["accounting"], obligations: ["accounting"], budget: ["accounting"], insurance: ["accounting"],
    it_risk: ["it"], icc: ["risk_classification_ngrc"], isc: ["risk_classification_ngrc"],
  },
  regulated_required: ["accounting", "icc", "isc", "sinriesgo", "risk_classification_ngrc", "compliance", "it_risk"],
};

describe("Reglas de paquetes (modulePackages)", () => {
  it("aplica el paquete con sus módulos; IMF regulada completa queda como null", () => {
    expect(applyPackage("CARTERA_COBRANZA", CATALOG)).toEqual([]);
    expect(applyPackage("GESTION", CATALOG)).toEqual(["accounting", "banks", "caja", "budget", "insurance"]);
    expect(applyPackage("IMF_REGULADA", CATALOG)).toBeNull();
  });

  it("marcar caja arrastra contabilidad; no se puede quitar contabilidad mientras caja la use", () => {
    const next = toggleModule("caja", [], CATALOG);
    expect(next).toEqual(["accounting", "caja"]);
    expect(lockReason("accounting", next, CATALOG)).toMatch(/Caja/);
    expect(toggleModule("accounting", next, CATALOG)).toBe(next);
    expect(toggleModule("caja", next, CATALOG)).toEqual(["accounting"]);
  });

  it("empresa normada: los regulatorios se agregan y no se pueden quitar", () => {
    const regulated = withDependencies([], CATALOG, { conamiRegulated: true });
    expect(regulated).toEqual(expect.arrayContaining(CATALOG.regulated_required.concat("it")));
    expect(lockReason("compliance", regulated, CATALOG, { conamiRegulated: true })).toMatch(/normada/);
  });
});

function Harness({ initialPackage = "CARTERA_COBRANZA", initialModules = [], regulated = false, onChange = () => {} }) {
  const [state, setState] = useState({ module_package: initialPackage, enabled_modules: initialModules });
  return (
    <ModulePackagePicker
      catalog={CATALOG}
      modulePackage={state.module_package}
      enabledModules={state.enabled_modules}
      conamiRegulated={regulated}
      onChange={(next) => {
        setState(next);
        onChange(next);
      }}
    />
  );
}

const box = (label) => screen.getByRole("checkbox", { name: label });

describe("Selector de paquete y módulos del superadmin", () => {
  it("elegir Gestión marca sus módulos", () => {
    const onChange = jest.fn();
    render(<Harness onChange={onChange} />);
    expect(box("Contabilidad MUC").checked).toBe(false);

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Paquete" }));
    fireEvent.click(screen.getByRole("option", { name: "Gestión" }));

    expect(onChange).toHaveBeenLastCalledWith({
      module_package: "GESTION",
      enabled_modules: ["accounting", "banks", "caja", "budget", "insurance"],
    });
    expect(box("Contabilidad MUC").checked).toBe(true);
    expect(box("Caja").checked).toBe(true);
    expect(box("Recursos Humanos").checked).toBe(false);
  });

  it("sumar un módulo suelto marca su dependencia y bloquea quitarla", () => {
    render(<Harness />);
    fireEvent.click(box("Presupuesto"));
    expect(box("Presupuesto").checked).toBe(true);
    expect(box("Contabilidad MUC").checked).toBe(true);
    expect(box("Contabilidad MUC").disabled).toBe(true);
    expect((screen.getByText(/Módulos sueltos agregados al paquete/)).textContent).toContain("Contabilidad MUC, Presupuesto");

    fireEvent.click(box("Presupuesto"));
    expect(box("Contabilidad MUC").disabled).toBe(false);
  });

  it("riesgo tecnológico arrastra Gestión de TI e ICC arrastra la clasificación NGRC", () => {
    render(<Harness />);
    fireEvent.click(box("Riesgo Tecnológico"));
    expect(box("Gestión de TI").checked).toBe(true);
    fireEvent.click(box("Informe ICC"));
    expect(box("Clasificación NGRC").checked).toBe(true);
    expect(box("Clasificación NGRC").disabled).toBe(true);
  });

  it("en una empresa normada los módulos regulatorios quedan marcados y bloqueados", () => {
    render(<Harness initialPackage="IMF_REGULADA" initialModules={null} regulated />);
    for (const label of ["Contabilidad MUC", "Cumplimiento LA/FT/FP", "Informe ICC", "Informe ISC", "Reporte Sin Riesgo", "Clasificación NGRC", "Riesgo Tecnológico"]) {
      expect((box(label)).checked).toBe(true);
      expect((box(label)).disabled).toBe(true);
    }
    expect(box("Recursos Humanos").disabled).toBe(false);
  });
});

describe("Pantalla de empresas del superadmin", () => {
  const tenants = [
    { id: 4, tenant_code: "TEST1", legal_name: "Prueba Uno", provisioning_status: "ACTIVE", status: "ACTIVE", module_package: "CARTERA_COBRANZA", enabled_modules: [], conami_regulated: 0, accounting_since: null },
  ];

  beforeEach(() => {
    API.get.mockReset();
    API.post.mockReset();
    API.put.mockReset();
    API.get.mockImplementation((url) => {
      if (url === "/api/superadmin/tenants") return Promise.resolve({ data: { data: tenants } });
      if (url === "/api/superadmin/modules") {
        return Promise.resolve({ data: { data: CATALOG.modules, packages: CATALOG.packages, dependencies: CATALOG.dependencies, regulated_required: CATALOG.regulated_required } });
      }
      return Promise.reject(new Error(`sin mock: ${url}`));
    });
  });

  const renderPage = () => render(<MemoryRouter><TenantsPage /></MemoryRouter>);

  it("crea la empresa con el paquete elegido y sus módulos", async () => {
    API.post.mockResolvedValue({ data: { tenant_id: 10 } });
    renderPage();
    await screen.findByText("Prueba Uno");
    expect(screen.getByText("Cartera y Cobranza")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Nueva Empresa" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(within(dialog).getByRole("checkbox", { name: "Caja" }).checked).toBe(true));

    // No normada, para poder bajar de paquete.
    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "¿Normada por la CONAMI?" }));
    fireEvent.click(screen.getByRole("option", { name: /No inscrita/ }));
    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "Paquete" }));
    fireEvent.click(screen.getByRole("option", { name: "Cartera y Cobranza" }));
    expect(within(dialog).getByRole("checkbox", { name: "Contabilidad MUC" }).checked).toBe(false);

    fireEvent.click(within(dialog).getByRole("button", { name: "Crear empresa" }));
    await waitFor(() => expect(API.post).toHaveBeenCalled());
    const [, payload] = API.post.mock.calls[0];
    expect(payload.module_package).toBe("CARTERA_COBRANZA");
    expect(payload.enabled_modules).toEqual([]);
    expect(payload.conami_regulated).toBe(false);
  });

  it("marcar la empresa como normada agrega solos los módulos regulatorios", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Nueva Empresa" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "¿Normada por la CONAMI?" }));
    fireEvent.click(screen.getByRole("option", { name: /No inscrita/ }));
    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "Paquete" }));
    fireEvent.click(screen.getByRole("option", { name: "Cartera y Cobranza" }));

    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "¿Normada por la CONAMI?" }));
    fireEvent.click(screen.getByRole("option", { name: /Sí, inscrita en la CONAMI/ }));
    expect(within(dialog).getByRole("checkbox", { name: "Cumplimiento LA/FT/FP" }).checked).toBe(true);
    expect(within(dialog).getByRole("checkbox", { name: "Cumplimiento LA/FT/FP" }).disabled).toBe(true);
    expect(within(dialog).getByRole("checkbox", { name: "Caja" }).checked).toBe(false);
  });

  it("subir de Cartera y Cobranza a Gestión pide la fecha de corte contable y la envía", async () => {
    API.put.mockResolvedValue({ data: { ok: true } });
    renderPage();
    await screen.findByText("Prueba Uno");
    fireEvent.click(screen.getByLabelText("Editar empresa"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).queryByTestId("accounting-since")).toBeNull();

    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: "Paquete" }));
    fireEvent.click(screen.getByRole("option", { name: "Gestión" }));
    const since = within(dialog).getByTestId("accounting-since");
    fireEvent.change(since, { target: { value: "2026-11-01" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(API.put).toHaveBeenCalled());
    const [url, payload] = API.put.mock.calls[0];
    expect(url).toBe("/api/superadmin/tenants/4");
    expect(payload.module_package).toBe("GESTION");
    expect(payload.enabled_modules).toEqual(["accounting", "banks", "caja", "budget", "insurance"]);
    expect(payload.accounting_since).toBe("2026-11-01");
  });
});
