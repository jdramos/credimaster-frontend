import API from "../api";

// Verificación en dos pasos (2FA). Las rutas /api/login/mfa/* son públicas y
// usan el token "mfa pendiente" del primer paso; el resto requiere sesión
// (tenant en /api/security/mfa, superadmin en /api/superadmin/security/mfa).

export const verifyLoginCode = async ({ mfa_token, code, remember_device }) => {
  const { data } = await API.post("/api/login/mfa/verify", { mfa_token, code, remember_device });
  return data;
};

export const startLoginEnrollment = async (mfa_token) => {
  const { data } = await API.post("/api/login/mfa/enroll/start", { mfa_token });
  return data;
};

export const confirmLoginEnrollment = async ({ mfa_token, code, remember_device }) => {
  const { data } = await API.post("/api/login/mfa/enroll/confirm", { mfa_token, code, remember_device });
  return data;
};

const base = (platform) => (platform ? "/api/superadmin/security/mfa" : "/api/security/mfa");

export const getMfaStatus = async (platform) => (await API.get(`${base(platform)}/status`)).data.data;
export const startEnrollment = async (platform) => (await API.post(`${base(platform)}/enroll/start`)).data.data;
export const confirmEnrollment = async (platform, code) => (await API.post(`${base(platform)}/enroll/confirm`, { code })).data.data;
export const regenerateRecoveryCodes = async (platform, code) => (await API.post(`${base(platform)}/recovery-codes`, { code })).data.data;
export const disableMfa = async (platform, { password, code }) => (await API.post(`${base(platform)}/disable`, { password, code })).data;
export const revokeTrustedDevice = async (platform, id) => (await API.delete(`${base(platform)}/devices/${id}`)).data;
export const revokeAllTrustedDevices = async (platform) => (await API.delete(`${base(platform)}/devices`)).data;

export const getMfaPolicy = async () => (await API.get("/api/security/mfa/policy")).data.data;
export const updateMfaPolicy = async (policy) => (await API.put("/api/security/mfa/policy", policy)).data;
export const getMfaUsers = async () => (await API.get("/api/security/mfa/users")).data.data;
export const resetUserMfa = async (userId, reason) => (await API.post(`/api/security/mfa/users/${userId}/reset`, { reason })).data;

// "Recordar este equipo": el token (firmado y revocable en el servidor) se
// guarda por usuario. Por sí solo no da acceso: igual se pide la contraseña.
const deviceKey = (username) => `cm_trusted_device:${String(username || "").trim().toLowerCase()}`;

export const getTrustedDeviceToken = (username) => {
  try {
    return localStorage.getItem(deviceKey(username)) || null;
  } catch {
    return null;
  }
};

export const saveTrustedDeviceToken = (username, token) => {
  try {
    if (token) localStorage.setItem(deviceKey(username), token);
  } catch {
    // almacenamiento no disponible: simplemente se pedirá el código otra vez
  }
};

export const apiErrorMessage = (err, fallback = "Ocurrió un error. Intente de nuevo.") =>
  err?.response?.data?.message || fallback;
