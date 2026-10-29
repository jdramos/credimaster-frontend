import { useCallback, useEffect, useState } from "react";
import API from "../../api";

// Campos personalizados ACTIVOS de una entidad (CUSTOMER / LOAN) y, si se
// indica recordId, los valores guardados de ese registro. Si la empresa no
// tiene campos (o la consulta falla) el formulario sigue igual que antes.
export default function useCustomFields(entity, recordId = null) {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.resolve()
      .then(() => API.get(`/api/custom-fields/form/${entity}`, { params: recordId ? { record_id: recordId } : undefined }))
      .then((res) => {
        if (cancelled) return;
        const data = res?.data?.data || {};
        setFields(Array.isArray(data.fields) ? data.fields : []);
        setValues(data.values && typeof data.values === "object" ? data.values : {});
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Campos personalizados:", err?.response?.data?.message || err.message);
        setFields([]);
        setValues({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entity, recordId]);

  const setValue = useCallback((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { fields, values, setValue, setValues, loading };
}
