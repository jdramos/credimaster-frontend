import { createContext, useContext, useMemo, useState } from "react";

const ExpressionContext = createContext(null);

export const ExpressionProvider = ({ value, onChange, children }) => {
  const expression = value || { nodes: [] };
  const nodes = expression.nodes || [];

  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const emit = (newNodes) => {
    onChange({
      ...expression,
      nodes: newNodes,
    });
  };

  const updateNode = (nodeId, changes) => {
    emit(
      nodes.map((node) =>
        node.id === nodeId ? { ...node, ...changes } : node,
      ),
    );
  };

  const removeNode = (nodeId) => {
    const newNodes = nodes
      .filter((node) => node.id !== nodeId)
      .map((node, index, arr) => ({
        ...node,
        nextOperator:
          index === arr.length - 1 ? null : node.nextOperator || "+",
      }));

    emit(newNodes);

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const insertNode = (index, node) => {
    const newNodes = [...nodes];

    newNodes.splice(index, 0, node);

    newNodes.forEach((item, i) => {
      if (i === newNodes.length - 1) {
        item.nextOperator = null;
      } else if (!item.nextOperator) {
        item.nextOperator = "+";
      }
    });

    emit(newNodes);
  };

  const moveNode = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;

    const newNodes = [...nodes];

    const [removed] = newNodes.splice(fromIndex, 1);

    newNodes.splice(toIndex, 0, removed);

    newNodes.forEach((item, i) => {
      if (i === newNodes.length - 1) {
        item.nextOperator = null;
      } else if (!item.nextOperator) {
        item.nextOperator = "+";
      }
    });

    emit(newNodes);
  };

  const valueContext = useMemo(
    () => ({
      nodes,

      selectedNodeId,
      setSelectedNodeId,

      insertNode,
      updateNode,
      removeNode,
      moveNode,
    }),
    [nodes, selectedNodeId],
  );

  return (
    <ExpressionContext.Provider value={valueContext}>
      {children}
    </ExpressionContext.Provider>
  );
};

export const useExpression = () => {
  const context = useContext(ExpressionContext);

  if (!context) {
    throw new Error(
      "useExpression debe utilizarse dentro de ExpressionProvider",
    );
  }

  return context;
};
