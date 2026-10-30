import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import useLoanForm from "./useLoanForm";
import API from "../../api";
import { UserContext } from "../../contexts/UserContext";

jest.mock("../../api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn() } }));
jest.mock("../../hooks/useCachedFetch", () => ({ fetchWithCache: jest.fn(() => Promise.resolve([])) }));
jest.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ tenant: { enabled_modules: null, conami_regulated: true } }) }));
jest.mock("../customFields/useCustomFields", () => () => ({ fields: [], values: {}, setValue: () => {}, save: () => Promise.resolve() }));
jest.mock("../../hooks/useUnsavedChangesWarning", () => () => ({ allowNavigation: () => {} }));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn(), warning: jest.fn() } }));

const wrapper = ({ children }) => (
  <MemoryRouter>
    <UserContext.Provider value={{ user: 1, role: 1, permissions: [], userBranches: [1] }}>{children}</UserContext.Provider>
  </MemoryRouter>
);

const checklistCalls = () => API.get.mock.calls.filter(([url]) => /checklist-summary/.test(url));

describe("Paso 2 del crédito: resumen de documentos del cliente", () => {
  test("se actualiza al cerrar 'Ver documentos' (los documentos se suben ahí)", async () => {
    let uploaded = 0;
    API.get.mockImplementation((url) => {
      if (/checklist-summary/.test(url)) {
        return Promise.resolve({ data: { total_required: 5, uploaded, verified: 0, missing: 5 - uploaded } });
      }
      return Promise.resolve({ data: [] });
    });

    const { result } = renderHook(() => useLoanForm(), { wrapper });

    act(() => {
      result.current.handleInputChange({ target: { name: "customer_id", value: 7 } });
    });
    await waitFor(() => expect(result.current.docSummary?.missing).toBe(5));
    expect(result.current.validateForm({ customer_id: 7 }).documents).toBeTruthy();

    // El usuario abre "Ver documentos", sube los 5 y cierra.
    act(() => result.current.setShowCustomerDocs(true));
    uploaded = 5;
    const before = checklistCalls().length;
    act(() => result.current.setShowCustomerDocs(false));

    await waitFor(() => expect(result.current.docSummary?.missing).toBe(0));
    expect(checklistCalls().length).toBe(before + 1);
    expect(result.current.validateForm({ customer_id: 7 }).documents).toBeUndefined();
  });
});
