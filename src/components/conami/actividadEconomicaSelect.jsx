import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Autocomplete,
  TextField,
  CircularProgress,
  FormControl,
} from "@mui/material";
import API from "../../api";

const PAGE_SIZE = 50;

export default function EconomicActivitySelect({
  value,
  onChange,
  label = "Actividad Económica",
  disabled = false,
  required = false,
  size = "small",
}) {
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const normalizeRows = (rows = []) =>
    rows.map((r) => ({
      id: r.id,
      conami_code: String(r.conami_code),
      description: r.description,
    }));

  const fetchActivities = useCallback(
    async ({ pageToLoad = 1, append = false, searchText = "" } = {}) => {
      try {
        append ? setLoadingMore(true) : setLoading(true);

        const res = await API.get("/api/conami/actividad_economica", {
          params: {
            search: searchText,
            page: pageToLoad,
            pageSize: PAGE_SIZE,
            sortBy: "conami_code",
            sortDir: "asc",
          },
        });

        const rows = res.data?.rows ?? [];
        const total = res.data?.total ?? 0;
        const normalized = normalizeRows(rows);

        setOptions((prev) => {
          const next = append ? [...prev, ...normalized] : normalized;
          return Array.from(
            new Map(next.map((item) => [item.id, item])).values(),
          );
        });

        setTotalRows(Number(total) || 0);
        setPage(pageToLoad);
      } catch (e) {
        console.error("Error cargando actividades:", e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchActivities({
      pageToLoad: 1,
      append: false,
      searchText: search,
    });
  }, [fetchActivities, search]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(inputValue.trim());
    }, 400);

    return () => clearTimeout(t);
  }, [inputValue]);

  const selected = useMemo(
    () => options.find((o) => String(o.id) === String(value)) || null,
    [options, value],
  );

  const hasMore = options.length < totalRows;

  const handleListboxScroll = (event) => {
    const listboxNode = event.currentTarget;

    const nearBottom =
      listboxNode.scrollTop + listboxNode.clientHeight >=
      listboxNode.scrollHeight - 20;

    if (!nearBottom || loading || loadingMore || !hasMore) return;

    fetchActivities({
      pageToLoad: page + 1,
      append: true,
      searchText: search,
    });
  };

  return (
    <FormControl fullWidth size={size}>
      <Autocomplete
        value={selected}
        inputValue={inputValue}
        onInputChange={(_, newInputValue, reason) => {
          if (reason === "reset") return;
          setInputValue(newInputValue);
        }}
        loading={loading}
        disabled={disabled}
        size={size}
        options={options}
        filterOptions={(x) => x}
        isOptionEqualToValue={(opt, val) => String(opt.id) === String(val.id)}
        getOptionLabel={(opt) =>
          opt ? `${opt.conami_code} - ${opt.description}` : ""
        }
        onChange={(_, newVal) => {
          onChange?.(newVal ? newVal.id : null);
          setInputValue(
            newVal ? `${newVal.conami_code} - ${newVal.description}` : "",
          );
        }}
        clearOnBlur={false}
        ListboxProps={{
          onScroll: handleListboxScroll,
          style: { maxHeight: 320 },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading || loadingMore ? (
                    <CircularProgress size={18} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </FormControl>
  );
}
