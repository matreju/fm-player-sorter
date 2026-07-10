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

const dockStyle: CSSProperties = {
  position: "fixed",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  zIndex: 70,
  display: "flex",
  flexDirection: "column",
  gap: 7,
  padding: 7,
  border: "1px solid rgba(51, 65, 85, 0.86)",
  borderRadius: 16,
  background: "rgba(15, 23, 42, 0.88)",
  backdropFilter: "blur(8px)",
  boxShadow: "0 18px 46px rgba(0, 0, 0, 0.38)",
};

const dockLabelStyle: CSSProperties = {
  color: "#94a3b8",
  fontSize: 9,
  lineHeight: 1,
  fontWeight: 950,
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const buttonBaseStyle: CSSProperties = {
  width: 48,
  height: 42,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 12,
  border: "1px solid rgba(71, 85, 105, 0.95)",
  background: "rgba(15, 23, 42, 0.94)",
  color: "#dbeafe",
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: "0.03em",
  cursor: "pointer",
  boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset",
};

const buttonActiveStyle: CSSProperties = {
  transform: "translateX(-3px)",
  boxShadow:
    "0 0 0 1px rgba(125, 211, 252, 0.38) inset, 0 10px 28px rgba(56, 189, 248, 0.22)",
};

const moduleButtons: Array<{
  id: AppModuleId;
  label: string;
  title: string;
  accent: CSSProperties;
  activeAccent: CSSProperties;
}> = [
  {
  id: "changes",
  label: "ZMI",
  title: "Zmiany po imporcie",
  accent: {
    borderColor: "rgba(251, 191, 36, 0.55)",
    background:
      "linear-gradient(135deg, rgba(245,158,11,0.24), rgba(180,83,9,0.16))",
    color: "#fef3c7",
  },
  activeAccent: {
    borderColor: "rgba(251, 191, 36, 0.95)",
    background: "linear-gradient(135deg, #f59e0b, #b45309)",
    color: "#fffbeb",
  },
},
  {
    id: "compare",
    label: "VS",
    title: "Porównywarka zawodników",
    accent: {
      borderColor: "rgba(56, 189, 248, 0.55)",
      background:
        "linear-gradient(135deg, rgba(14,165,233,0.26), rgba(37,99,235,0.18))",
      color: "#e0f2fe",
    },
    activeAccent: {
      borderColor: "rgba(56, 189, 248, 0.95)",
      background: "linear-gradient(135deg, #0ea5e9, #2563eb)",
      color: "#eff6ff",
    },
  },
  {
    id: "squad",
    label: "XI",
    title: "Asystent wyboru składu",
    accent: {
      borderColor: "rgba(129, 140, 248, 0.55)",
      background:
        "linear-gradient(135deg, rgba(79,70,229,0.32), rgba(67,56,202,0.18))",
      color: "#eef2ff",
    },
    activeAccent: {
      borderColor: "rgba(165, 180, 252, 0.95)",
      background: "linear-gradient(135deg, #4f46e5, #4338ca)",
      color: "#eef2ff",
    },
  },
  {
    id: "core",
    label: "TRZ",
    title: "Trzon reprezentacji",
    accent: {
      borderColor: "rgba(34, 197, 94, 0.48)",
      background:
        "linear-gradient(135deg, rgba(22,163,74,0.25), rgba(21,128,61,0.16))",
      color: "#dcfce7",
    },
    activeAccent: {
      borderColor: "rgba(74, 222, 128, 0.9)",
      background: "linear-gradient(135deg, #16a34a, #15803d)",
      color: "#f0fdf4",
    },
  },
  {
    id: "camps",
    label: "ZGR",
    title: "Zgrupowania i kampanie",
    accent: {
      borderColor: "rgba(14, 165, 233, 0.55)",
      background:
        "linear-gradient(135deg, rgba(56,189,248,0.25), rgba(8,145,178,0.16))",
      color: "#ecfeff",
    },
    activeAccent: {
      borderColor: "rgba(103, 232, 249, 0.95)",
      background: "linear-gradient(135deg, #06b6d4, #0891b2)",
      color: "#ecfeff",
    },
  },
];

export function AppSideDock() {
  const [activeModule, setActiveModule] = useState<AppModuleId | null>(null);

  useEffect(() => {
    function handleOpenModule(event: Event) {
      const module = getModuleFromEvent(event);

      if (module) {
        setActiveModule(module);
      }
    }

    function handleCloseModule(event: Event) {
      const module = getCloseModuleFromEvent(event);

      setActiveModule((current) => {
        if (!module || module === current) {
          return null;
        }

        return current;
      });
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
    <nav style={dockStyle} aria-label="Szybka nawigacja modułów">
      <div style={dockLabelStyle}>Moduły</div>

      {moduleButtons.map((button) => {
        const isActive = activeModule === button.id;

        return (
          <button
            key={button.id}
            type="button"
            style={{
              ...buttonBaseStyle,
              ...button.accent,
              ...(isActive ? button.activeAccent : {}),
              ...(isActive ? buttonActiveStyle : {}),
            }}
            title={button.title}
            aria-label={button.title}
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