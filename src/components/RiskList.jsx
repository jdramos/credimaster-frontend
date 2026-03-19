import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import AddCircle from "./AddCircle";
import EmptyNotice from "./EmptyNotice";
import Alert from "@mui/material/Alert";
import { Box, Chip, IconButton, Tooltip } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const url = process.env.REACT_APP_API_BASE_URL + "/api/risks";
const token = process.env.REACT_APP_API_TOKEN;
const headers = { Authorization: token };

export default function RiskList() {
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const columns = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 80 },
      { field: "risk_name", headerName: "Nombre", flex: 1, minWidth: 180 },
      { field: "from_range", headerName: "Desde", width: 110 },
      { field: "to_range", headerName: "Hasta", width: 110 },
      { field: "value", headerName: "Valor", width: 110 },
      {
  field: "color",
  headerName: "Color",
  width: 120,
  sortable: false,
  renderCell: (params) => {
    const color = params.value;

    if (!color) return null;

    return (
		  <Box
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",      // 👈 centra vertical
          justifyContent: "center",  // 👈 centra horizontal
        }}
      >
        
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          backgroundColor: color,
          border: "1px solid #ccc",
        }}
      />
	  </Box>
    );
  },
},
      {
        field: "edit",
        headerName: "Editar",
        width: 90,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Tooltip title="Editar">
            <IconButton
              component={Link}
              to={`/riesgos/editar/${params.row.id}`}
              state={{ risk: params.row }}
              size="small"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  const fetchRisks = async () => {
    try {
      setLoading(true);
      setError(null);

      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error(await resp.text());

      const data = await resp.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Ocurrió un error al cargar los datos. Intente más tarde.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisks();
  }, []);

  if (error) {
    return (
      <div className="alert alert-danger mt-5 shadow-lg p-3 mb-5 d-flex align-items-center" role="alert">
        <div>{error}</div>
      </div>
    );
  }

  if (!loading && rows.length === 0) {
    return <EmptyNotice route="/riesgos/agregar" />;
  }

  return (
    <Box sx={{ width: "100%", mt: 3 }}>
      <Alert variant="filled" icon={false} severity="info" sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Listado de riesgos</h2>
          <AddCircle goTo="/riesgos/agregar" />
        </Box>
      </Alert>

      <Box sx={{ height: 520, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          disableRowSelectionOnClick
          getRowId={(r) => r.id}
        />
      </Box>
    </Box>
  );
}
