import { createContext, useContext, useState } from "react";

const StudioContext = createContext();

export const StudioProvider = ({ children }) => {
  const [currentSection, setCurrentSection] = useState("fields");

  const [previewOpen, setPreviewOpen] = useState(false);

  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);

  const value = {
    currentSection,
    setCurrentSection,

    previewOpen,
    setPreviewOpen,

    propertiesOpen,
    setPropertiesOpen,

    selectedObject,
    setSelectedObject,
  };

  return (
    <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
  );
};

export const useStudio = () => {
  const context = useContext(StudioContext);

  if (!context) {
    throw new Error("useStudio debe usarse dentro de StudioProvider");
  }

  return context;
};
