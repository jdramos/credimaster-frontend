import React from "react";
import { render, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { UserContext } from "./UserContext";
import API from "../api";
import { toast } from "react-toastify";

jest.mock("../api", () => ({ post: jest.fn() }));
jest.mock("react-toastify", () => ({ ToastContainer: () => null, toast: { error: jest.fn(), success: jest.fn() } }));

const userCtx = {
  setPermissions: jest.fn(),
  setRole: jest.fn(),
  setUserBranches: jest.fn(),
  setUser: jest.fn(),
  setFullName: jest.fn(),
  setDepartmentId: jest.fn(),
};

let auth;
const Grab = () => {
  auth = useAuth();
  return null;
};

const renderAuth = () =>
  render(
    <UserContext.Provider value={userCtx}>
      <AuthProvider>
        <Grab />
      </AuthProvider>
    </UserContext.Provider>,
  );

describe("AuthContext: login en dos pasos", () => {
  beforeEach(() => {
    localStorage.clear();
    API.post.mockReset();
    toast.error.mockReset();
  });

  test("401 MFA_REQUIRED no es un error: devuelve el paso pendiente sin guardar sesión", async () => {
    API.post.mockRejectedValue({
      response: { status: 401, data: { code: "MFA_REQUIRED", mfa_token: "pend", full_name: "Ana", remember_device_days: 30, message: "Ingrese el código" } },
    });
    renderAuth();
    let result;
    await act(async () => {
      result = await auth.login("ana", "x");
    });
    expect(result).toEqual({ mfa: { mode: "verify", mfa_token: "pend", full_name: "Ana", remember_device_days: 30, username: "ana" } });
    expect(toast.error).not.toHaveBeenCalled();
    expect(localStorage.getItem("token")).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
  });

  test("401 MFA_ENROLL_REQUIRED devuelve el modo de configuración", async () => {
    API.post.mockRejectedValue({ response: { status: 401, data: { code: "MFA_ENROLL_REQUIRED", mfa_token: "pend-e" } } });
    renderAuth();
    let result;
    await act(async () => {
      result = await auth.login("ana", "x");
    });
    expect(result.mfa.mode).toBe("enroll");
  });

  test("contraseña incorrecta sigue mostrando el error de siempre", async () => {
    API.post.mockRejectedValue({ response: { status: 401, data: { message: "Contraseña incorrecta" } } });
    renderAuth();
    let result;
    await act(async () => {
      result = await auth.login("ana", "x");
    });
    expect(result).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Contraseña incorrecta");
  });

  test("envía el token de equipo de confianza guardado y completeMfaLogin guarda el nuevo", async () => {
    localStorage.setItem("cm_trusted_device:ana", "device-old");
    API.post.mockRejectedValue({ response: { status: 401, data: { code: "MFA_REQUIRED", mfa_token: "pend" } } });
    renderAuth();
    await act(async () => {
      await auth.login("Ana", "x");
    });
    expect(API.post).toHaveBeenCalledWith("/api/login", { username: "Ana", password: "x", trusted_device_token: "device-old" });

    await act(async () => {
      auth.completeMfaLogin({ token: "jwt-1", user_id: 7, user_name: "ana", full_name: "Ana", permissions: [], trusted_device_token: "device-new" }, "Ana");
    });
    expect(localStorage.getItem("token")).toBe("jwt-1");
    expect(localStorage.getItem("cm_trusted_device:ana")).toBe("device-new");
    expect(auth.isAuthenticated).toBe(true);
    expect(userCtx.setUser).toHaveBeenCalledWith(7);
  });

  test("login sin 2FA guarda la sesión como antes y no manda token de equipo si no hay", async () => {
    API.post.mockResolvedValue({ data: { token: "jwt-2", user_id: 3, permissions: ["clientes.ver"], tenant: { tenant_code: "DEMO" } } });
    renderAuth();
    let result;
    await act(async () => {
      result = await auth.login("pedro", "x");
    });
    expect(API.post).toHaveBeenCalledWith("/api/login", { username: "pedro", password: "x" });
    expect(result).toEqual({ ok: true, type: "TENANT" });
    expect(JSON.parse(localStorage.getItem("session")).permissions).toEqual(["clientes.ver"]);
  });
});
