import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";
import { useAuth } from "../contexts/AuthContext";
import { verifyLoginCode, startLoginEnrollment, confirmLoginEnrollment } from "../api/mfa";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));
jest.mock("../contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../components/BrandMark", () => () => null);
jest.mock("../api/mfa", () => ({
  verifyLoginCode: jest.fn(),
  startLoginEnrollment: jest.fn(),
  confirmLoginEnrollment: jest.fn(),
  apiErrorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

const CODES = ["AAAAA-BBBBB", "CCCCC-DDDDD", "EEEEE-FFFFF", "GGGGG-HHHHH", "JJJJJ-KKKKK", "MMMMM-NNNNN", "PPPPP-QQQQQ", "RRRRR-SSSSS", "TTTTT-UUUUU", "VVVVV-WWWWW"];

const renderLogin = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LoginPage />
    </MemoryRouter>,
  );

const submitPassword = () => {
  fireEvent.change(screen.getByLabelText(/Usuario/), { target: { value: " gerente " } });
  fireEvent.change(screen.getByLabelText(/Contraseña/, { selector: "input" }), { target: { value: "secreta" } });
  fireEvent.click(screen.getByRole("button", { name: "Acceder" }));
};

describe("LoginPage con verificación en dos pasos", () => {
  let login;
  let completeMfaLogin;

  beforeEach(() => {
    mockNavigate.mockReset();
    [verifyLoginCode, startLoginEnrollment, confirmLoginEnrollment].forEach((fn) => fn.mockReset());
    login = jest.fn();
    completeMfaLogin = jest.fn(() => ({ ok: true, type: "TENANT" }));
    useAuth.mockReturnValue({ login, completeMfaLogin });
  });

  test("sin 2FA el login sigue igual: entra directo", async () => {
    login.mockResolvedValue({ ok: true, type: "TENANT" });
    renderLogin();
    submitPassword();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(login).toHaveBeenCalledWith("gerente", "secreta");
    expect(screen.queryByText("Verificación en dos pasos")).toBeNull();
  });

  test("con 2FA pide el código y recién entonces abre la sesión", async () => {
    login.mockResolvedValue({
      mfa: { mode: "verify", mfa_token: "pend-1", full_name: "Gerente General", remember_device_days: 30, username: "gerente" },
    });
    verifyLoginCode.mockResolvedValue({ token: "jwt", user_id: 10 });
    renderLogin();
    submitPassword();

    expect(await screen.findByText("Verificación en dos pasos")).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(completeMfaLogin).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Código de verificación", { selector: "input" }), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verificar" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"));
    expect(verifyLoginCode).toHaveBeenCalledWith({ mfa_token: "pend-1", code: "123456", remember_device: false });
    expect(completeMfaLogin).toHaveBeenCalledWith({ token: "jwt", user_id: 10 }, "gerente");
  });

  test("superadmin con 2FA va a /superadmin", async () => {
    login.mockResolvedValue({ mfa: { mode: "verify", mfa_token: "pend-sa", full_name: "Dueño", remember_device_days: 30, username: "owner" } });
    verifyLoginCode.mockResolvedValue({ type: "SUPERADMIN", token: "jwt" });
    completeMfaLogin.mockReturnValue({ ok: true, type: "SUPERADMIN" });
    renderLogin();
    submitPassword();
    fireEvent.change(await screen.findByLabelText("Código de verificación", { selector: "input" }), { target: { value: "111111" } });
    fireEvent.click(screen.getByRole("button", { name: "Verificar" }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/superadmin"));
  });

  test("volver al inicio de sesión desde el paso del código", async () => {
    login.mockResolvedValue({ mfa: { mode: "verify", mfa_token: "pend-1", username: "gerente" } });
    renderLogin();
    submitPassword();
    fireEvent.click(await screen.findByText("Volver al inicio de sesión"));
    expect(await screen.findByRole("button", { name: "Acceder" })).toBeTruthy();
  });

  test("rol obligatorio sin 2FA: configura con QR, muestra los códigos y luego entra", async () => {
    login.mockResolvedValue({ mfa: { mode: "enroll", mfa_token: "pend-enroll", full_name: "Gerente", remember_device_days: 30, username: "gerente" } });
    startLoginEnrollment.mockResolvedValue({ qr_data_url: "data:image/png;base64,AAA", secret: "ABCD EFGH IJKL MNOP", account_name: "gerente@DEMO" });
    confirmLoginEnrollment.mockResolvedValue({ token: "jwt", user_id: 10, recovery_codes: CODES });
    renderLogin();
    submitPassword();

    expect(await screen.findByAltText("Código QR para la app autenticadora")).toBeTruthy();
    expect(startLoginEnrollment).toHaveBeenCalledWith("pend-enroll");
    expect(screen.getByTestId("mfa-secret").textContent).toBe("ABCD EFGH IJKL MNOP");

    fireEvent.change(screen.getByLabelText("Código de verificación", { selector: "input" }), { target: { value: "246810" } });
    fireEvent.click(screen.getByRole("button", { name: "Activar" }));

    expect(await screen.findByTestId("recovery-codes")).toBeTruthy();
    expect(confirmLoginEnrollment).toHaveBeenCalledWith({ mfa_token: "pend-enroll", code: "246810", remember_device: false });
    CODES.forEach((c) => expect(screen.getByText(c)).toBeTruthy());
    expect(completeMfaLogin).not.toHaveBeenCalled();

    const enter = screen.getByRole("button", { name: "Entrar a CrediMaster" });
    expect(enter.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("Ya guardé mis códigos de recuperación"));
    fireEvent.click(enter);

    expect(completeMfaLogin).toHaveBeenCalledWith({ token: "jwt", user_id: 10, recovery_codes: CODES }, "gerente");
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
