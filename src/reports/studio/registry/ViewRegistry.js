import { StudioIcons } from "../icons/StudioIcons";
import DatasetDesignerWorkspace from "../views/Dataset/Designer/DatasetDesignerWorkspace";

const ViewRegistry = {
  general: {
    id: "general",
    title: "General",
    group: "Reporte",
    description: "Define la información básica del reporte.",
    icon: StudioIcons.report,
    component: DatasetDesignerWorkspace,
  },

  source: {
    id: "source",
    title: "Fuente de datos",
    group: "Dataset",
    description: "Selecciona la fuente principal de datos del reporte.",
    icon: StudioIcons.source,
    component: DatasetDesignerWorkspace,
  },

  fields: {
    id: "dataset-designer",
    title: "Diseñador",
    group: "Dataset",
    description: "Elige los campos visibles y su presentación.",
    icon: StudioIcons.fields,
    component: DatasetDesignerWorkspace,
  },

  filters: {
    id: "filters",
    title: "Filtros",
    group: "Dataset",
    description: "Define condiciones para limitar la información.",
    icon: StudioIcons.filters,
    component: DatasetDesignerWorkspace,
  },

  groups: {
    id: "groups",
    title: "Agrupaciones",
    group: "Dataset",
    description:
      "Agrupa la información por sucursal, gestor, cliente u otros campos.",
    icon: StudioIcons.groups,
    component: DatasetDesignerWorkspace,
  },

  sorts: {
    id: "sorts",
    title: "Ordenamiento",
    group: "Dataset",
    icon: StudioIcons.sorts,
    description: "Define el orden de presentación de los datos.",
    component: DatasetDesignerWorkspace,
  },

  totals: {
    id: "totals",
    title: "Totales",
    group: "Dataset",
    description: "Configura sumas y totales del reporte.",
    icon: StudioIcons.totals,
    component: DatasetDesignerWorkspace,
  },

  layout: {
    id: "layout",
    title: "Diseño",
    group: "Presentación",
    description:
      "Configura encabezado, pie, papel, orientación y estilo visual.",
    icon: StudioIcons.layout,
    component: DatasetDesignerWorkspace,
  },

  security: {
    id: "security",
    title: "Seguridad",
    group: "Seguridad",
    description: "Define quién puede ver o ejecutar este reporte.",
    icon: StudioIcons.security,
    component: DatasetDesignerWorkspace,
  },

  preview: {
    id: "preview",
    title: "Vista previa",
    group: "Vista previa",
    description: "Visualiza el resultado antes de guardar o exportar.",
    icon: StudioIcons.preview,
    component: DatasetDesignerWorkspace,
  },
};

export default ViewRegistry;
