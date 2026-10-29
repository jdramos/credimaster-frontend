import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";
import CustomFieldsManager, { validateDefinitionForm } from "./CustomFieldsManager";
import CustomFieldInputs from "./CustomFieldInputs";
import CustomFieldValuesSection from "./CustomFieldValuesSection";
import {
  buildDefinitionsReport,
  customFieldsPayload,
  formatCustomFieldValue,
  suggestKey,
  validateCustomFieldValues,
} from "./customFieldsShared";
import { getMenuSectionForTag } from "../RolePermissionManager";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));

const def = (overrides) => ({
  id: 1,
  entity: "CUSTOMER",
  field_key: "campo",
  label: "Campo",
  field_type: "TEXT",
  options: [],
  is_required: 0,
  section: "additional",
  sort_order: 10,
  is_active: 1,
  value_count: 0,
  ...overrides,
});

const renderManager = ({ role = 1, permissions = [] } = {}) =>
  render(
    <UserContext.Provider value={{ role, permissions }}>
      <CustomFieldsManager />
    </UserContext.Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Reglas de campos personalizados (frontend)", () => {
  it("valida obligatorios y tipos, y arma el payload con vacíos en null", () => {
    const fields = [
      def({ id: 1, field_key: "hijos", label: "Hijos", field_type: "NUMBER", is_required: 1 }),
      def({ id: 2, field_key: "nivel", label: "Nivel", field_type: "LIST", options: ["A", "B"] }),
      def({ id: 3, field_key: "vehiculo", label: "Vehículo", field_type: "BOOLEAN", is_required: 1 }),
    ];
    expect(validateCustomFieldValues(fields, { nivel: "Z", vehiculo: false })).toEqual({
      "custom_fields.hijos": "Campo requerido",
      "custom_fields.nivel": "Opción no válida",
    });
    expect(customFieldsPayload(fields, { hijos: "2", nivel: "", vehiculo: false })).toEqual({
      hijos: "2",
      nivel: null,
      vehiculo: false,
    });
  });

  it("formatea valores para el detalle y la impresión", () => {
    expect(formatCustomFieldValue(def({ field_type: "BOOLEAN" }), true)).toBe("Sí");
    expect(formatCustomFieldValue(def({ field_type: "BOOLEAN" }), false)).toBe("No");
    expect(formatCustomFieldValue(def({ field_type: "DATE" }), "2026-10-29")).toBe("29/10/2026");
    expect(formatCustomFieldValue(def(), null)).toBe("—");
    expect(suggestKey("Número de hijos")).toBe("numero_de_hijos");
  });

  it("la lista se imprime y exporta con la misma definición", () => {
    const report = buildDefinitionsReport("CUSTOMER", [
      def({ label: "Nivel", field_type: "LIST", options: ["A", "B"], section: "general", is_required: 1, value_count: 4 }),
    ]);
    expect(report.title).toBe("Campos personalizados — Cliente");
    expect(report.columns.map((c) => c.field)).toContain("value_count");
    expect(report.rows[0]).toMatchObject({
      type_label: "Lista de opciones",
      options_label: "A, B",
      section_label: "Datos generales",
      required_label: "Sí",
      status_label: "Activo",
      value_count: 4,
    });
  });

  it("valida el formulario de definición", () => {
    const errors = validateDefinitionForm({ id: null, label: "", field_key: "1x", field_type: "LIST", optionsText: " ", sort_order: "a" });
    expect(Object.keys(errors).sort()).toEqual(["field_key", "label", "options", "sort_order"]);
  });

  it("el permiso queda en la sección Configuración de Asignación de permisos", () => {
    expect(getMenuSectionForTag("configuracion.campos_personalizados.gestionar")).toBe("config");
  });
});

describe("Pantalla de configuración", () => {
  it("lista los campos por entidad y no deja eliminar uno con datos", async () => {
    API.get.mockResolvedValue({
      data: {
        data: [
          def({ id: 1, label: "Nivel educativo", field_key: "nivel_educativo", value_count: 3 }),
          def({ id: 2, label: "Sin datos", field_key: "sin_datos", sort_order: 20 }),
          def({ id: 3, entity: "LOAN", label: "Destino detallado", field_key: "destino", section: "conditions" }),
        ],
      },
    });
    renderManager();
    expect(await screen.findByText("Nivel educativo")).toBeTruthy();
    expect(screen.queryByText("Destino detallado")).toBeNull();
    expect(screen.getByLabelText("Eliminar Nivel educativo").disabled).toBe(true);
    expect(screen.getByLabelText("Eliminar Sin datos").disabled).toBe(false);

    fireEvent.click(screen.getByRole("tab", { name: /Crédito/ }));
    expect(screen.getByText("Destino detallado")).toBeTruthy();
  });

  it("crea un campo de lista con la clave sugerida", async () => {
    API.get.mockResolvedValue({ data: { data: [] } });
    API.post.mockResolvedValue({ data: { data: { id: 9 } } });
    renderManager();
    await screen.findByText(/No hay campos personalizados de cliente/);

    fireEvent.click(screen.getByRole("button", { name: /Nuevo campo/ }));
    fireEvent.change(screen.getByTestId("cf-label"), { target: { value: "Nivel educativo" } });
    expect(screen.getByTestId("cf-key").value).toBe("nivel_educativo");

    const dialog = screen.getByRole("dialog");
    fireEvent.mouseDown(within(dialog).getByRole("combobox", { name: /Tipo/ }));
    fireEvent.click(await screen.findByRole("option", { name: "Lista de opciones" }));
    fireEvent.change(screen.getByTestId("cf-options"), { target: { value: "Primaria\nSecundaria\n" } });
    fireEvent.click(screen.getByTestId("cf-save"));

    await waitFor(() => expect(API.post).toHaveBeenCalled());
    expect(API.post.mock.calls[0][0]).toBe("/api/custom-fields/definitions");
    expect(API.post.mock.calls[0][1]).toMatchObject({
      entity: "CUSTOMER",
      label: "Nivel educativo",
      field_key: "nivel_educativo",
      field_type: "LIST",
      options: ["Primaria", "Secundaria"],
      section: "general",
      sort_order: 10,
      is_active: true,
    });
  });

  it("sin el permiso no muestra la configuración", () => {
    renderManager({ role: 5, permissions: ["clientes.ver"] });
    expect(screen.getByText(/No tiene permiso/)).toBeTruthy();
    expect(API.get).not.toHaveBeenCalled();
  });
});

describe("Campos en el formulario y el detalle", () => {
  const fields = [
    def({ id: 1, field_key: "hijos", label: "Hijos", field_type: "NUMBER", is_required: 1, section: "general" }),
    def({ id: 2, field_key: "nota", label: "Nota", section: "additional" }),
  ];

  it("muestra solo los de la sección, marca obligatorios y avisa el cambio", () => {
    const onChange = jest.fn();
    render(
      <CustomFieldInputs
        fields={fields}
        section="general"
        values={{}}
        errors={{ "custom_fields.hijos": "Campo requerido" }}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText("Hijos *")).toBeTruthy();
    expect(screen.queryByLabelText("Nota")).toBeNull();
    expect(screen.getByText("Campo requerido")).toBeTruthy();
    fireEvent.change(screen.getByTestId("custom_fields.hijos"), { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith("hijos", "3");
  });

  it("no pinta nada si la sección no tiene campos", () => {
    const { container } = render(<CustomFieldInputs fields={fields} section="economic" values={{}} onChange={() => {}} />);
    expect(container.innerHTML).toBe("");
  });

  it("el detalle del crédito muestra los valores guardados", async () => {
    API.get.mockResolvedValue({
      data: {
        data: {
          fields: [def({ id: 5, entity: "LOAN", field_key: "vehiculo", label: "Compra vehículo", field_type: "BOOLEAN", section: "conditions" })],
          values: { vehiculo: true },
        },
      },
    });
    render(<CustomFieldValuesSection entity="LOAN" recordId={42} />);
    expect(await screen.findByText("Compra vehículo")).toBeTruthy();
    expect(screen.getByText("Sí")).toBeTruthy();
    expect(API.get).toHaveBeenCalledWith("/api/custom-fields/form/LOAN", { params: { record_id: 42 } });
  });
});
