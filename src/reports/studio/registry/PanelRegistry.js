// Dataset
import GeneralTab from "../../tabs/GeneralTab";
import FieldsTab from "../../tabs/FieldsTab";
import FiltersTab from "../../tabs/FiltersTab";
import GroupsTab from "../../tabs/GroupsTab";
import SortsTab from "../../tabs/SortsTab";
import TotalsTab from "../../tabs/TotalsTab";
import PreviewTab from "../../tabs/PreviewTab";

const PanelRegistry = {
  general: GeneralTab,

  source: () => <>Fuente de datos (Próximamente)</>,

  fields: FieldsTab,

  filters: FiltersTab,

  groups: GroupsTab,

  sorts: SortsTab,

  totals: TotalsTab,

  layout: () => <>Diseño (Próximamente)</>,

  security: () => <>Seguridad (Próximamente)</>,

  preview: PreviewTab,
};

export default PanelRegistry;
