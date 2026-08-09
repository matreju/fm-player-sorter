import { useEffect, useState, type CSSProperties } from "react";
import {
  closeAppModule,
  getCloseModuleFromEvent,
  getModuleFromEvent,
  MODULE_DOCK_CLOSE_EVENT,
  MODULE_DOCK_OPEN_EVENT,
  openAppModule,
  type AppModuleId,
} from "../../utils/moduleDock";

const navStyle: CSSProperties = {
  alignSelf: "stretch",
  display: "flex",
  alignItems: "stretch",
  minWidth: 0,
};

const buttonStyle: CSSProperties = {
  position: "relative",
  minWidth: 104,
  padding: "0 16px",
  border: 0,
  borderLeft: "1px solid transparent",
  borderRight: "1px solid transparent",
  background: "transparent",
  color: "#9094ac",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const activeButtonStyle: CSSProperties = {
  color: "#ef54db",
  background: "rgba(232, 73, 211, 0.055)",
  borderLeftColor: "#292c40",
  borderRightColor: "#292c40",
  boxShadow: "inset 0 -2px 0 #e849d3",
};

const moduleButtons: Array<{
  id: AppModuleId;
  label: string;
  title: string;
}> = [
  { id: "compare", label: "Porównanie", title: "Porównywarka zawodników" },
  { id: "squad", label: "Skład", title: "Asystent wyboru składu" },
  { id: "core", label: "Trzon", title: "Trzon reprezentacji" },
  { id: "camps", label: "Zgrupowania", title: "Zgrupowania i kampanie" },
];

export function AppSideDock() {
  const [activeModule, setActiveModule] = useState<AppModuleId | null>(null);

  useEffect(() => {
    function handleOpenModule(event: Event) {
      const module = getModuleFromEvent(event);
      if (module) setActiveModule(module);
    }

    function handleCloseModule(event: Event) {
      const module = getCloseModuleFromEvent(event);
      setActiveModule((current) =>
        !module || module === current ? null : current,
      );
    }

    window.addEventListener(MODULE_DOCK_OPEN_EVENT, handleOpenModule);
    window.addEventListener(MODULE_DOCK_CLOSE_EVENT, handleCloseModule);
    return () => {
      window.removeEventListener(MODULE_DOCK_OPEN_EVENT, handleOpenModule);
      window.removeEventListener(MODULE_DOCK_CLOSE_EVENT, handleCloseModule);
    };
  }, []);

  function handleModuleClick(module: AppModuleId) {
    if (activeModule === module) {
      closeAppModule(module);
      return;
    }
    openAppModule(module);
  }

  return (
    <nav style={navStyle} aria-label="Główna nawigacja">
      <button
        type="button"
        style={{
          ...buttonStyle,
          ...(activeModule === null ? activeButtonStyle : {}),
        }}
        onClick={() => {
          if (activeModule) closeAppModule(activeModule);
        }}
        aria-current={activeModule === null ? "page" : undefined}
      >
        Zawodnicy
      </button>

      {moduleButtons.map((button) => {
        const isActive = activeModule === button.id;
        return (
          <button
            key={button.id}
            type="button"
            style={{
              ...buttonStyle,
              ...(isActive ? activeButtonStyle : {}),
            }}
            title={button.title}
            aria-pressed={isActive}
            onClick={() => handleModuleClick(button.id)}
          >
            {button.label}
          </button>
        );
      })}
    </nav>
  );
}
