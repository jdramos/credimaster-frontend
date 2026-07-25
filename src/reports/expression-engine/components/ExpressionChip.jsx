import FieldChip from "./chips/FieldChip";
import ConstantChip from "./chips/ConstantChip";
import FunctionChip from "./chips/FunctionChip";

const ExpressionChip = (props) => {
  switch (props.node.type) {
    case "field":
      return <FieldChip {...props} />;

    case "constant":
      return <ConstantChip {...props} />;

    case "function":
      return <FunctionChip {...props} />;

    default:
      return null;
  }
};

export default ExpressionChip;
