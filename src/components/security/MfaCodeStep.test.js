import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MfaCodeStep from "./MfaCodeStep";
import { verifyLoginCode } from "../../api/mfa";

jest.mock("../../api/mfa", () => ({
  verifyLoginCode: jest.fn(),
  apiErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

const setup = (props = {}) => {
  const onVerified = jest.fn();
  const onCancel = jest.fn();
  render(
    <MfaCodeStep mfaToken="pending-123" fullName="Ana Gerente" rememberDays={30} onVerified={onVerified} onCancel={onCancel} {...props} />,
  );
  return { onVerified, onCancel };
};

const codeInput = () => screen.getByLabelText("Código de verificación", { selector: "input" });
const verifyButton = () => screen.getByRole("button", { name: "Verificar" });

describe("MfaCodeStep (segundo paso del login)", () => {
  beforeEach(() => verifyLoginCode.mockReset());

  test("solo acepta 6 dígitos y envía el token pendiente con el código", async () => {
    verifyLoginCode.mockResolvedValue({ token: "jwt", user_id: 10 });
    const { onVerified } = setup();

    expect(screen.getByText(/Ana Gerente, ingrese/)).toBeTruthy();
    expect(verifyButton().disabled).toBe(true);

    fireEvent.change(codeInput(), { target: { value: "12a 34" } });
    expect(codeInput().value).toBe("1234");
    expect(verifyButton().disabled).toBe(true);

    fireEvent.change(codeInput(), { target: { value: "1234567" } });
    expect(codeInput().value).toBe("123456");
    fireEvent.click(verifyButton());

    await waitFor(() => expect(onVerified).toHaveBeenCalledWith({ token: "jwt", user_id: 10 }));
    expect(verifyLoginCode).toHaveBeenCalledWith({ mfa_token: "pending-123", code: "123456", remember_device: false });
  });

  test("'Recordar este equipo' viaja como remember_device", async () => {
    verifyLoginCode.mockResolvedValue({ token: "jwt" });
    setup();
    fireEvent.click(screen.getByLabelText("Recordar este equipo por 30 días"));
    fireEvent.change(codeInput(), { target: { value: "654321" } });
    fireEvent.click(verifyButton());
    await waitFor(() => expect(verifyLoginCode).toHaveBeenCalledWith({ mfa_token: "pending-123", code: "654321", remember_device: true }));
  });

  test("sin días de recordar no ofrece la casilla", () => {
    setup({ rememberDays: 0 });
    expect(screen.queryByText(/Recordar este equipo/)).toBeNull();
  });

  test("código incorrecto: muestra el mensaje del servidor y limpia el campo", async () => {
    verifyLoginCode.mockRejectedValue({ response: { status: 401, data: { code: "MFA_INVALID_CODE", message: "Código incorrecto. Le quedan 4 intentos." } } });
    const { onVerified } = setup();
    fireEvent.change(codeInput(), { target: { value: "000000" } });
    fireEvent.click(verifyButton());
    expect(await screen.findByText("Código incorrecto. Le quedan 4 intentos.")).toBeTruthy();
    expect(codeInput().value).toBe("");
    expect(onVerified).not.toHaveBeenCalled();
  });

  test("bloqueo (429): informa cuánto esperar", async () => {
    verifyLoginCode.mockRejectedValue({ response: { status: 429, data: { code: "MFA_LOCKED", message: "Demasiados códigos incorrectos. Intente de nuevo en 15 minutos." } } });
    setup();
    fireEvent.change(codeInput(), { target: { value: "000000" } });
    fireEvent.click(verifyButton());
    expect(await screen.findByText(/Intente de nuevo en 15 minutos/)).toBeTruthy();
  });

  test("código de recuperación: cambia el campo y lo envía tal cual", async () => {
    verifyLoginCode.mockResolvedValue({ token: "jwt", mfa_method: "RECOVERY" });
    const { onVerified } = setup();
    fireEvent.click(screen.getByText(/Use un código de recuperación/));

    const input = screen.getByLabelText("Código de recuperación", { selector: "input" });
    fireEvent.change(input, { target: { value: "abcde-fghjk" } });
    expect(input.value).toBe("ABCDE-FGHJK");
    fireEvent.click(verifyButton());

    await waitFor(() => expect(onVerified).toHaveBeenCalled());
    expect(verifyLoginCode).toHaveBeenCalledWith({ mfa_token: "pending-123", code: "ABCDE-FGHJK", remember_device: false });
  });

  test("verificación vencida: oculta el campo y permite volver al login", async () => {
    verifyLoginCode.mockRejectedValue({ response: { status: 401, data: { code: "MFA_TOKEN_EXPIRED", message: "La verificación expiró. Inicie sesión nuevamente." } } });
    const { onCancel } = setup();
    fireEvent.change(codeInput(), { target: { value: "123456" } });
    fireEvent.click(verifyButton());
    expect(await screen.findByText("La verificación expiró. Inicie sesión nuevamente.")).toBeTruthy();
    expect(screen.queryByLabelText("Código de verificación", { selector: "input" })).toBeNull();
    fireEvent.click(screen.getByText("Volver al inicio de sesión"));
    expect(onCancel).toHaveBeenCalled();
  });
});
