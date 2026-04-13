import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import {
  getCreditFileTemplates,
  updateCreditFileTemplate,
} from "../../api/creditFileTemplates";

export default function CreditFileTemplateList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await getCreditFileTemplates();
      setRows(res.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const handleSave = async (row) => {
    try {
      setSavingId(row.id);
      await updateCreditFileTemplate(row.id, row);
      await loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <Box p={2}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Plantilla de expediente crediticio
      </Typography>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Orden</TableCell>
            <TableCell>Código</TableCell>
            <TableCell>Sección</TableCell>
            <TableCell>Título</TableCell>
            <TableCell>Obligatorio</TableCell>
            <TableCell>Activo</TableCell>
            <TableCell>Nuevo crédito</TableCell>
            <TableCell>Renovación</TableCell>
            <TableCell>Refinanciamiento</TableCell>
            <TableCell>Guardar</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell sx={{ width: 90 }}>
                <TextField
                  size="small"
                  type="number"
                  value={row.display_order}
                  onChange={(e) =>
                    handleChange(index, "display_order", e.target.value)
                  }
                />
              </TableCell>

              <TableCell>
                <Chip label={row.code} size="small" />
              </TableCell>

              <TableCell sx={{ width: 160 }}>
                <TextField
                  size="small"
                  value={row.section}
                  onChange={(e) =>
                    handleChange(index, "section", e.target.value)
                  }
                />
              </TableCell>

              <TableCell sx={{ minWidth: 220 }}>
                <TextField
                  size="small"
                  fullWidth
                  value={row.title}
                  onChange={(e) => handleChange(index, "title", e.target.value)}
                />
              </TableCell>

              <TableCell>
                <Switch
                  checked={!!row.is_mandatory}
                  onChange={(e) =>
                    handleChange(index, "is_mandatory", e.target.checked)
                  }
                />
              </TableCell>

              <TableCell>
                <Switch
                  checked={!!row.is_active}
                  onChange={(e) =>
                    handleChange(index, "is_active", e.target.checked)
                  }
                />
              </TableCell>

              <TableCell>
                <Switch
                  checked={!!row.applies_to_new_loans}
                  onChange={(e) =>
                    handleChange(
                      index,
                      "applies_to_new_loans",
                      e.target.checked,
                    )
                  }
                />
              </TableCell>

              <TableCell>
                <Switch
                  checked={!!row.applies_to_renewals}
                  onChange={(e) =>
                    handleChange(index, "applies_to_renewals", e.target.checked)
                  }
                />
              </TableCell>

              <TableCell>
                <Switch
                  checked={!!row.applies_to_refinancing}
                  onChange={(e) =>
                    handleChange(
                      index,
                      "applies_to_refinancing",
                      e.target.checked,
                    )
                  }
                />
              </TableCell>

              <TableCell>
                <IconButton
                  color="primary"
                  onClick={() => handleSave(row)}
                  disabled={savingId === row.id}
                >
                  <SaveIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
