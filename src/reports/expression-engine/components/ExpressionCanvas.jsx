import { Box, Stack } from "@mui/material";

import { useExpression } from "../context/ExpressionContext";

import ExpressionChip from "./ExpressionChip";
import OperatorChip from "./OperatorChip";
import InsertNodeButton from "./InsertNodeButton";

const createDefaultNode = (fields = []) => ({
  id: `node_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  type: "field",
  value: fields[0]?.name || "",
  nextOperator: null,
});

const ExpressionCanvas = ({ fields = [], operators = [], functions = [] }) => {
  const { nodes, updateNode, removeNode, insertNode } = useExpression();

  const handleInsert = (index) => {
    insertNode(index, createDefaultNode(fields));
  };

  return (
    <Box
      sx={{
        minHeight: 120,
        p: 2,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        bgcolor: "background.default",
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        alignItems="center"
      >
        <InsertNodeButton onClick={() => handleInsert(0)} />

        {nodes.map((node, index) => (
          <Box
            key={node.id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <ExpressionChip
              node={node}
              fields={fields}
              functions={functions}
              onChange={(changes) => updateNode(node.id, changes)}
              onRemove={() => removeNode(node.id)}
            />

            {index < nodes.length - 1 && (
              <>
                <OperatorChip
                  value={node.nextOperator}
                  operators={operators}
                  onChange={(operator) =>
                    updateNode(node.id, {
                      nextOperator: operator,
                    })
                  }
                />

                <InsertNodeButton onClick={() => handleInsert(index + 1)} />
              </>
            )}
          </Box>
        ))}

        {nodes.length > 0 && (
          <InsertNodeButton onClick={() => handleInsert(nodes.length)} />
        )}
      </Stack>
    </Box>
  );
};

export default ExpressionCanvas;
