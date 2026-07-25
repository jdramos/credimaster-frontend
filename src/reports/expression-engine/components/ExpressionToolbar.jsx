import { useState } from "react";
import {
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import CalculateIcon from "@mui/icons-material/Calculate";
import NumbersIcon from "@mui/icons-material/Numbers";
import TextFieldsIcon from "@mui/icons-material/TextFields";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import FunctionsIcon from "@mui/icons-material/Functions";

import { useExpression } from "../context/ExpressionContext";
import { EXPRESSION_NODE_TYPES } from "../constants/Types";
import { createExpressionNode } from "../model/Node";

const ExpressionToolbar = ({ fields = [], functions = [] }) => {
  const { nodes, insertNode } = useExpression();
  const [anchorEl, setAnchorEl] = useState(null);

  const appendNode = (type, value = "") => {
    insertNode(
      nodes.length,
      createExpressionNode({
        type,
        value,
        nextOperator: null,
      }),
    );

    setAnchorEl(null);
  };

  return (
    <>
      <Button
        size="small"
        variant="contained"
        startIcon={<AddIcon />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        Agregar elemento
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() =>
            appendNode(EXPRESSION_NODE_TYPES.FIELD, fields[0]?.name || "")
          }
        >
          <ListItemIcon>
            <CalculateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Campo</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => appendNode(EXPRESSION_NODE_TYPES.CONSTANT, 0)}>
          <ListItemIcon>
            <NumbersIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Número</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() => appendNode(EXPRESSION_NODE_TYPES.CONSTANT, "")}
        >
          <ListItemIcon>
            <TextFieldsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Texto</ListItemText>
        </MenuItem>

        <MenuItem
          onClick={() =>
            appendNode(
              EXPRESSION_NODE_TYPES.CONSTANT,
              new Date().toISOString().slice(0, 10),
            )
          }
        >
          <ListItemIcon>
            <CalendarMonthIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Fecha</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem
          disabled={functions.length === 0}
          onClick={() =>
            appendNode(EXPRESSION_NODE_TYPES.FUNCTION, functions[0]?.id || "")
          }
        >
          <ListItemIcon>
            <FunctionsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Función</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ExpressionToolbar;
