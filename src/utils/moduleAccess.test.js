import { blockedModuleForPath, isRegulatedOnlyPath, isConamiRegulated } from "./moduleAccess";

describe("moduleAccess", () => {
  it("el cumplimiento NGRC exige el módulo de clasificación NGRC", () => {
    expect(blockedModuleForPath("/ngrc/cumplimiento", ["accounting"])).toBe("risk_classification_ngrc");
    expect(blockedModuleForPath("/ngrc/cumplimiento", ["risk_classification_ngrc"])).toBeNull();
    expect(blockedModuleForPath("/ngrc/cumplimiento", null)).toBeNull();
  });

  it("el cumplimiento NGRC es solo para empresas normadas", () => {
    expect(isRegulatedOnlyPath("/ngrc/cumplimiento")).toBe(true);
    expect(isRegulatedOnlyPath("/ngrcx")).toBe(false);
    expect(isConamiRegulated({ conami_regulated: false })).toBe(false);
    expect(isConamiRegulated({})).toBe(true);
  });
});
