import ViewRegistry from "../registry/ViewRegistry";
import { useStudio } from "../context/StudioContext";

const StudioNavigator = () => {
  const { currentSection } = useStudio();

  const view = ViewRegistry[currentSection];

  if (!view) {
    return <>Vista no encontrada</>;
  }

  const Component = view.component;

  return <Component />;
};

export default StudioNavigator;
