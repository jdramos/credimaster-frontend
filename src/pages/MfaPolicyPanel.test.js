import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MfaPolicyPanel } from "./SecurityPage";

jest.mock("../components/security/MfaEnrollPanel", () => () => null);
jest.mock("../components/security/RecoveryCodesPanel", () => () => null);

const POLICY = {
  enabled: false,
  required_role_ids: null,
  suggested_role_ids: [1],
  remember_device_days: 30,
  roles: [
    { id: 1, role_name: "Administrador" },
    { id: 2, role_name: "Gerente General" },
  ],
  server_configured: true,
  license_columns_ready: true,
  tables_ready: true,
};

describe("Política 2FA de una empresa desde el superadmin", () => {
  test("carga la política de esa empresa y guarda con sus funciones", async () => {
    const loadPolicy = jest.fn().mockResolvedValue(POLICY);
    const savePolicy = jest.fn().mockResolvedValue({ success: true });
    render(<MfaPolicyPanel loadPolicy={loadPolicy} savePolicy={savePolicy} asSuperadmin />);

    fireEvent.click(await screen.findByLabelText("Habilitar verificación en dos pasos en la empresa"));
    fireEvent.click(screen.getByLabelText("Gerente General"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar política" }));

    expect(await screen.findByText("Política de verificación en dos pasos guardada.")).toBeTruthy();
    expect(savePolicy).toHaveBeenCalledWith({ enabled: true, required_role_ids: [1, 2], remember_device_days: 30 });
    // Texto pensado para el administrador de la empresa, no para el superadmin.
    expect(screen.queryByText(/Puede configurarla ahora en/)).toBeNull();
  });

  test("un error al guardar se muestra en pantalla", async () => {
    const loadPolicy = jest.fn().mockResolvedValue({ ...POLICY, enabled: true, required_role_ids: [1] });
    const savePolicy = jest.fn().mockRejectedValue({ response: { data: { message: "Roles inexistentes: 9" } } });
    render(<MfaPolicyPanel loadPolicy={loadPolicy} savePolicy={savePolicy} asSuperadmin />);

    fireEvent.click(await screen.findByRole("button", { name: "Guardar política" }));
    expect(await screen.findByText("Roles inexistentes: 9")).toBeTruthy();
  });
});
