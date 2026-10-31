import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DataBackupsPage, { formatSize } from "./DataBackupsPage";
import API from "../../api";

jest.mock("../../api", () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock("../common/ReportExportButtons", () => () => null);

const READY = {
  id: 2, status: "LISTO", requested_by_name: "Super Administrador", requested_at: "2026-10-31 10:14:53",
  size_bytes: 17747034, tables_count: 269, rows_count: 358085, sql_sha256: "1a34", expires_at: "2026-11-07 10:16:11",
  download_count: 0,
};
const FAILED = { id: 1, status: "FALLIDO", requested_by_name: "Super Administrador", requested_at: "2026-10-31 10:03:58", error_message: "No se pudo completar el respaldo: Connection lost", download_count: 0 };

const listResponse = (rows, extra = {}) => ({ data: { success: true, migrated: true, retention_days: 7, all_branches: true, data: rows, ...extra } });

describe("Respaldo de datos", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra el historial y descarga con el enlace temporal", async () => {
    API.get.mockResolvedValue(listResponse([READY, FAILED]));
    API.post.mockResolvedValue({ data: { success: true, data: { url: "https://s3.example/respaldo.zip?firma", file_name: "Respaldo_DEMO.zip" } } });
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<DataBackupsPage />);
    expect(await screen.findByText("Listo")).toBeTruthy();
    expect(screen.getByText("Falló")).toBeTruthy();
    expect(screen.getByText("16.9 MB")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Descargar" }));
    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/data-backups/2/download"));
    await waitFor(() => expect(click).toHaveBeenCalled());
    click.mockRestore();
  });

  it("inicia la generación y bloquea el botón mientras se genera", async () => {
    API.get.mockResolvedValueOnce(listResponse([])).mockResolvedValue(listResponse([{ id: 3, status: "GENERANDO", requested_at: "2026-10-31 11:00:00", download_count: 0 }]));
    API.post.mockResolvedValue({ data: { success: true, data: { id: 3 } } });

    render(<DataBackupsPage />);
    expect(await screen.findByText("Todavía no se ha generado ningún respaldo.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Generar respaldo" }));

    await waitFor(() => expect(API.post).toHaveBeenCalledWith("/api/data-backups"));
    expect(await screen.findByText("Generando…", { selector: ".MuiChip-label" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Generando/ }).disabled).toBe(true);
    expect(screen.getByText(/Se está generando el respaldo/)).toBeTruthy();
  });

  it("sin acceso a todas las sucursales no permite generar", async () => {
    API.get.mockResolvedValue(listResponse([], { all_branches: false }));
    render(<DataBackupsPage />);
    expect(await screen.findByText(/solo lo puede generar un usuario con acceso a todas/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Generar respaldo" }).disabled).toBe(true);
  });

  it("formatea el tamaño", () => {
    expect(formatSize(null)).toBe("—");
    expect(formatSize(2048)).toBe("2 KB");
    expect(formatSize(17747034)).toBe("16.9 MB");
  });
});
