import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { AppButton } from "../ui";

type AppModuleDrawerProps = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  width?: string;
  labelledById?: string;
  onClose: () => void;
  children: ReactNode;
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 120,
  display: "flex",
  justifyContent: "flex-end",
  background: "rgba(2, 6, 23, 0.58)",
  backdropFilter: "blur(3px)",
};

const drawerStyle: CSSProperties = {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  borderLeft: "1px solid #334155",
  background: "#0f141d",
  boxShadow: "-26px 0 70px rgba(0, 0, 0, 0.5)",
};

const drawerHeaderStyle: CSSProperties = {
  flex: "0 0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 14px",
  borderBottom: "1px solid #26334a",
  background: "linear-gradient(135deg, #111827, #0f172a)",
};

const drawerTitleBlockStyle: CSSProperties = {
  minWidth: 0,
};

const drawerTitleStyle: CSSProperties = {
  margin: 0,
  color: "#f8fafc",
  fontSize: 18,
  lineHeight: 1.1,
  fontWeight: 950,
};

const drawerSubtitleStyle: CSSProperties = {
  marginTop: 4,
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 750,
};

const drawerActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexShrink: 0,
};

const drawerBodyStyle: CSSProperties = {
  flex: "1 1 auto",
  minHeight: 0,
  overflow: "auto",
  padding: 12,
};

export function AppModuleDrawer({
  isOpen,
  title,
  subtitle,
  width = "min(1540px, calc(100vw - 42px))",
  labelledById = "app-module-drawer-title",
  onClose,
  children,
}: AppModuleDrawerProps) {
  const drawerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    window.setTimeout(() => {
      drawerRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={overlayStyle}
      role="presentation"
      onMouseDown={onClose}
    >
      <aside
        ref={drawerRef}
        style={{
          ...drawerStyle,
          width,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header style={drawerHeaderStyle}>
          <div style={drawerTitleBlockStyle}>
            <h2 id={labelledById} style={drawerTitleStyle}>
              {title}
            </h2>

            {subtitle && <div style={drawerSubtitleStyle}>{subtitle}</div>}
          </div>

          <div style={drawerActionsStyle}>
            <AppButton
              type="button"
              variant="neutral"
              size="compact"
              onClick={onClose}
            >
              Zamknij
            </AppButton>
          </div>
        </header>

        <main style={drawerBodyStyle}>{children}</main>
      </aside>
    </div>
  );
}