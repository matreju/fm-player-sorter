import type { CSSProperties } from "react";

type AppModuleId = "compare" | "squad" | "core" | "camps";

const moduleDockEventName = "fm-player-sorter-open-module";

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
  background: "rgba(15, 23, 42, 0.86)",
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

const moduleButtons: Array<{
  id: AppModuleId;
  label: string;
  title: string;
  accent: CSSProperties;
}> = [
  {
    id: "compare",
    label: "VS",
    title: "Porównywarka zawodników",
    accent: {
      borderColor: "rgba(56, 189, 248, 0.75)",
      background: "linear-gradient(135deg, rgba(14,165,233,0.34), rgba(37,99,235,0.24))",
      color: "#e0f2fe",
    },
  },
  {
    id: "squad",
    label: "XI",
    title: "Asystent wyboru składu",
    accent: {
      borderColor: "rgba(129, 140, 248, 0.75)",
      background: "linear-gradient(135deg, rgba(79,70,229,0.42), rgba(67,56,202,0.26))",
      color: "#eef2ff",
    },
  },
  {
    id: "core",
    label: "TRZ",
    title: "Trzon reprezentacji",
    accent: {
      borderColor: "rgba(34, 197, 94, 0.68)",
      background: "linear-gradient(135deg, rgba(22,163,74,0.34), rgba(21,128,61,0.22))",
      color: "#dcfce7",
    },
  },
  {
    id: "camps",
    label: "ZGR",
    title: "Zgrupowania i kampanie",
    accent: {
      borderColor: "rgba(14, 165, 233, 0.75)",
      background: "linear-gradient(135deg, rgba(56,189,248,0.34), rgba(8,145,178,0.24))",
      color: "#ecfeff",
    },
  },
];

function openModule(module: AppModuleId) {
  window.dispatchEvent(
    new CustomEvent(moduleDockEventName, {
      detail: {
        module,
      },
    })
  );
}

export function AppSideDock() {
  return (
    <nav style={dockStyle} aria-label="Szybka nawigacja modułów">
      <div style={dockLabelStyle}>Moduły</div>

      {moduleButtons.map((button) => (
        <button
          key={button.id}
          type="button"
          style={{
            ...buttonBaseStyle,
            ...button.accent,
          }}
          title={button.title}
          aria-label={button.title}
          onClick={() => openModule(button.id)}
        >
          {button.label}
        </button>
      ))}
    </nav>
  );
}