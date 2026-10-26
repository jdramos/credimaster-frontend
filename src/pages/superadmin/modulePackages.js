// Reglas de paquetes y dependencias de módulos para el panel de superadmin.
// El catálogo (módulos, paquetes, dependencias, obligatorios de una empresa
// normada) llega de GET /api/superadmin/modules, la misma fuente que valida
// el backend (api/superadmin/moduleRegistry.js); aquí solo se aplican para
// que la pantalla marque sola las dependencias e impida quitar una que otro
// módulo necesita. El backend vuelve a validar al guardar.

export const allKeys = (catalog) => (catalog?.modules || []).map((m) => m.key);

// null = todos los módulos (empresas anteriores a enabled_modules).
export const effectiveModules = (modules, catalog) => (modules === null || modules === undefined ? allKeys(catalog) : modules);

export const labelOf = (catalog, key) => (catalog?.modules || []).find((m) => m.key === key)?.label || key;

// Agrega las dependencias (transitivas) y, si la empresa está normada, los
// módulos obligatorios. Devuelve la lista en el orden del catálogo.
export const withDependencies = (modules, catalog, { conamiRegulated = false } = {}) => {
  const result = new Set(effectiveModules(modules, catalog));
  if (conamiRegulated) (catalog?.regulated_required || []).forEach((k) => result.add(k));
  const pending = [...result];
  while (pending.length) {
    const key = pending.pop();
    for (const dep of catalog?.dependencies?.[key] || []) {
      if (!result.has(dep)) {
        result.add(dep);
        pending.push(dep);
      }
    }
  }
  return allKeys(catalog).filter((k) => result.has(k));
};

// Con todos los módulos marcados se guarda null ("todos"), igual que las
// empresas que ya existían.
const compact = (modules, catalog) => (modules.length === allKeys(catalog).length ? null : modules);

export const applyPackage = (packageKey, catalog, { conamiRegulated = false } = {}) => {
  const pkg = (catalog?.packages || []).find((p) => p.key === packageKey);
  return compact(withDependencies(pkg ? pkg.modules : [], catalog, { conamiRegulated }), catalog);
};

// Por qué no se puede desmarcar un módulo (o null si se puede).
export const lockReason = (key, modules, catalog, { conamiRegulated = false } = {}) => {
  if (conamiRegulated && (catalog?.regulated_required || []).includes(key)) {
    return "Obligatorio para una empresa normada por la CONAMI";
  }
  const current = effectiveModules(modules, catalog);
  const dependents = current.filter((other) => (catalog?.dependencies?.[other] || []).includes(key));
  if (dependents.length) {
    return `Lo requiere: ${dependents.map((k) => labelOf(catalog, k)).join(", ")}`;
  }
  return null;
};

// Marca un módulo con sus dependencias, o lo desmarca si nada lo impide.
export const toggleModule = (key, modules, catalog, { conamiRegulated = false } = {}) => {
  const current = effectiveModules(modules, catalog);
  if (current.includes(key)) {
    if (lockReason(key, modules, catalog, { conamiRegulated })) return modules;
    return compact(current.filter((k) => k !== key), catalog);
  }
  return compact(withDependencies([...current, key], catalog, { conamiRegulated }), catalog);
};

// Módulos marcados que no trae el paquete (los "sueltos").
export const extraModules = (packageKey, modules, catalog) => {
  const pkg = (catalog?.packages || []).find((p) => p.key === packageKey);
  if (!pkg) return [];
  return effectiveModules(modules, catalog).filter((k) => !pkg.modules.includes(k));
};
