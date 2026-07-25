import EmptyProperties from "./editors/EmptyProperties";
import FieldProperties from "./editors/FieldProperties";
import FilterProperties from "./editors/FilterProperties";
import GroupProperties from "./editors/GroupProperties";
import TotalProperties from "./editors/TotalProperties";
import LayoutProperties from "./editors/LayoutProperties";

const PropertyRegistry = {
  empty: EmptyProperties,

  field: FieldProperties,

  filter: FilterProperties,

  group: GroupProperties,

  total: TotalProperties,

  layout: LayoutProperties,
};

export default PropertyRegistry;
