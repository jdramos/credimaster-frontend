import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import CustomerReferencesTab from "./CustomerReferencesTab";
import {
  requiredCustomerFields,
  requiredCustomerLabel,
} from "../../utils/customerRequiredFields";

const fields = ["customer_name", "public_name", "cellphone", "identification", "home_address"];

describe("Campos obligatorios del cliente según la regulación", () => {
  it("empresa normada: todos los campos siguen siendo obligatorios", () => {
    expect(requiredCustomerFields(fields, true)).toEqual(fields);
    expect(requiredCustomerLabel("Celular", "cellphone", true)).toBe("Celular *");
  });

  it("empresa no normada: solo quedan los que la base no deja vacíos", () => {
    expect(requiredCustomerFields(fields, false)).toEqual(["customer_name", "identification", "home_address"]);
    expect(requiredCustomerLabel("Celular", "cellphone", false)).toBe("Celular");
    expect(requiredCustomerLabel("Nombre y apellidos", "customer_name", false)).toBe("Nombre y apellidos *");
  });

  it("referencias: la empresa no normada solo exige el nombre de la referencia 1", () => {
    const ref = createRef();
    render(
      <CustomerReferencesTab
        ref={ref}
        customer={{ reference_name: "" }}
        setCustomer={() => {}}
        errors={{}}
        setErrors={() => {}}
        mode="create"
        conamiRegulated={false}
      />,
    );
    expect(screen.getAllByText("Referencia 1").length).toBeGreaterThan(0);
    expect(Object.keys(ref.current.validate().errors)).toEqual(["reference_name"]);
  });

  it("referencias: la empresa normada exige las dos referencias completas", () => {
    const ref = createRef();
    render(
      <CustomerReferencesTab
        ref={ref}
        customer={{ reference_name: "Luis" }}
        setCustomer={() => {}}
        errors={{}}
        setErrors={() => {}}
        mode="create"
      />,
    );
    const errs = Object.keys(ref.current.validate().errors);
    expect(errs).toContain("reference2_name");
    expect(errs).not.toContain("reference_name");
  });
});
