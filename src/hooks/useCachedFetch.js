import { useCallback, useEffect, useState } from "react";
import API from "../api";

// Cache en memoria (vive mientras dure la pestaña) para catálogos/listas de
// referencia que se piden por GET desde muchas pantallas distintas
// (sucursales, provincias, monedas, tipos de crédito, etc.) y que cambian
// muy rara vez frente a la frecuencia con la que el usuario navega entre
// pantallas. Sin esto, cada montaje de un <XSelect> o de useLoanForm volvía
// a pedir la misma tabla al backend.
//
// No usa localStorage/sessionStorage a propósito: un logout completo hace
// window.location.replace (recarga total), que ya limpia este Map por sí
// solo -- no hace falta invalidación manual en logout/cambio de tenant.
const cacheStore = new Map(); // url -> { data, timestamp }
const inFlightStore = new Map(); // url -> Promise<data>

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos

async function fetchWithCache(url, { ttlMs = DEFAULT_TTL_MS, force = false } = {}) {
  const now = Date.now();
  const cached = cacheStore.get(url);

  if (!force && cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }

  if (!force && inFlightStore.has(url)) {
    return inFlightStore.get(url);
  }

  const promise = API.get(url)
    .then((res) => {
      cacheStore.set(url, { data: res.data, timestamp: Date.now() });
      inFlightStore.delete(url);
      return res.data;
    })
    .catch((err) => {
      inFlightStore.delete(url);
      throw err;
    });

  inFlightStore.set(url, promise);
  return promise;
}

// Se llama después de crear/editar/eliminar un registro de catálogo, para
// que la próxima lectura (en esta pantalla u otra) traiga el dato fresco en
// vez de servir la copia en caché hasta que expire el TTL.
function invalidateCache(url) {
  if (url) {
    cacheStore.delete(url);
    inFlightStore.delete(url);
  } else {
    cacheStore.clear();
    inFlightStore.clear();
  }
}

// Hook de conveniencia para componentes que hoy hacen
// `useEffect(() => { API.get(url).then(res => setX(res.data)) }, [])`.
// `url` puede ser null/"" para desactivar el fetch (p.ej. mientras no se
// conoce un id del que depende la URL).
function useCachedFetch(url, { ttlMs, enabled = true } = {}) {
  const [data, setData] = useState(() =>
    url ? cacheStore.get(url)?.data ?? null : null,
  );
  const [loading, setLoading] = useState(!!url && enabled && !cacheStore.get(url));
  const [error, setError] = useState(null);

  const reload = useCallback(
    (force = false) => {
      if (!url || !enabled) return;

      setLoading(true);
      setError(null);

      fetchWithCache(url, { ttlMs, force })
        .then((d) => setData(d))
        .catch((err) => setError(err))
        .finally(() => setLoading(false));
    },
    [url, ttlMs, enabled],
  );

  useEffect(() => {
    reload(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled]);

  return { data, loading, error, reload };
}

export default useCachedFetch;
export { fetchWithCache, invalidateCache };
