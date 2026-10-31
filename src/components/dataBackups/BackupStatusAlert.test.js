import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import BackupStatusAlert from "./BackupStatusAlert";
import { BACKUPS_CHANGED_EVENT, backupChipLabel, backupStatusText } from "./backupAlert";
import API from "../../api";

jest.mock("../../api", () => ({ get: jest.fn() }));

const status = (over) => ({ data: { success: true, migrated: true, data: { last_backup_at: "2026-10-27 09:00:00", days_since: 4, level: "ALTO", label: "Alto", ready_not_downloaded: 0, generating: false, ...over } } });

const renderAlert = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<BackupStatusAlert />} />
        <Route path="/configuracion/respaldo-datos" element={<div>pantalla de respaldo</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe("Alerta de respaldo", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ["AL_DIA", 0, "Respaldo al día", "rgb(46, 125, 50)"],
    ["ATENCION", 2, "Respaldo: hace 2 días", "rgb(249, 168, 37)"],
    ["ALTO", 4, "Respaldo: hace 4 días", "rgb(239, 108, 0)"],
    ["CRITICO", 9, "Respaldo: hace 9 días", "rgb(198, 40, 40)"],
  ])("nivel %s: color y texto según los días", async (level, days, label, color) => {
    API.get.mockResolvedValue(status({ level, days_since: days }));
    renderAlert();
    const chip = (await screen.findByText(label)).closest(".MuiChip-root");
    expect(window.getComputedStyle(chip).backgroundColor).toBe(color);
  });

  it("nunca descargado: crítico y lleva a la pantalla de respaldo", async () => {
    API.get.mockResolvedValue(status({ level: "CRITICO", days_since: null, last_backup_at: null }));
    renderAlert();
    fireEvent.click(await screen.findByText("Sin respaldo"));
    expect(await screen.findByText("pantalla de respaldo")).toBeTruthy();
  });

  it("empresa sin la actualización: no muestra nada", async () => {
    API.get.mockResolvedValue({ data: { success: true, migrated: false } });
    const { container } = renderAlert();
    await waitFor(() => expect(API.get).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("se actualiza al generar o descargar un respaldo", async () => {
    API.get.mockResolvedValueOnce(status({ level: "CRITICO", days_since: 8 })).mockResolvedValue(status({ level: "AL_DIA", days_since: 0 }));
    renderAlert();
    expect(await screen.findByText("Respaldo: hace 8 días")).toBeTruthy();
    act(() => window.dispatchEvent(new Event(BACKUPS_CHANGED_EVENT)));
    expect(await screen.findByText("Respaldo al día")).toBeTruthy();
  });

  it("textos", () => {
    expect(backupChipLabel({ level: "ATENCION", days_since: 1 })).toBe("Respaldo: hace 1 día");
    expect(backupStatusText({ days_since: 0, ready_not_downloaded: 0 })).toMatch(/es de hoy/);
    expect(backupStatusText({ days_since: 3, last_backup_at: "2026-10-28 08:00:00", ready_not_downloaded: 1 }))
      .toMatch(/hace 3 días \(2026-10-28\).*listo que todavía no se ha descargado.*diario/);
  });
});
