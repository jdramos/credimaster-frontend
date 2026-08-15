import React, { useEffect, useMemo, useState } from "react";
import { MenuItem, TextField } from "@mui/material";
import { fetchWithCache } from "../../hooks/useCachedFetch";

// Selector de sucursal para los reportes contables. Modo "single" con opción
// "Todas las sucursales" (valor ""). Los endpoints contables ya filtran por
// branch_id; cuando el valor es "" se consulta consolidado (todas). Devuelve
// (id, name) para poder reflejar la sucursal en el reporte impreso.
//
// Se alimenta de /api/branches/accessible, que respeta el alcance de
// sucursales del usuario: si no tiene acceso total (all_access=false) solo
// verá sus sucursales y NO se ofrece "Todas" (evita que un usuario con
// acceso limitado consulte el consolidado de sucursales ajenas). En ese caso
// se autoselecciona la primera sucursal permitida.
export default function ReportBranchFilter({
  value = "",
  onChange,
  label = "Sucursal",
  size = "small",
  sx,
}) {
  const [branches, setBranches] = useState([]);
  const [allAccess, setAllAccess] = useState(true);

  useEffect(() => {
    fetchWithCache("/api/branches/accessible")
      .then((res) => {
        // El endpoint responde { data: [...], all_access }. Se toleran
        // también respuestas en array plano por compatibilidad.
        const list = Array.isArray(res) ? res : res?.data || [];
        const canSeeAll = Array.isArray(res) ? true : res?.all_access !== false;
        setBranches(list);
        setAllAccess(canSeeAll);

        // Usuario con acceso limitado: no hay opción "Todas", así que se
        // fuerza una sucursal concreta (la primera) si aún no hay selección.
        if (!canSeeAll && !value && list.length > 0) {
          onChange?.(list[0].id, list[0].name);
        }
      })
      .catch(() => {
        setBranches([]);
        setAllAccess(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(
    () =>
      allAccess
        ? [{ id: "", name: "Todas las sucursales" }, ...branches]
        : branches,
    [branches, allAccess],
  );

  const handleChange = (e) => {
    const id = e.target.value;
    const branch = branches.find((b) => String(b.id) === String(id));
    onChange?.(id, id === "" ? "Todas" : branch?.name || "");
  };

  return (
    <TextField
      select
      size={size}
      label={label}
      value={value}
      onChange={handleChange}
      sx={{ minWidth: 200, ...sx }}
    >
      {options.map((b) => (
        <MenuItem key={b.id === "" ? "__all__" : b.id} value={b.id}>
          {b.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
