import { useEffect, useRef, type ReactNode } from "react";
import { AppButton } from "../ui";
import { squadBuilderStyles as styles } from "./squadBuilderStyles";

type SquadBuilderDrawerShellProps = {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
};

export function SquadBuilderDrawerShell({
  isOpen,
  onToggle,
  onClose,
  children,
}: SquadBuilderDrawerShellProps) {
  const openButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      if (wasOpenRef.current) {
        openButtonRef.current?.focus();
      }

      return;
    }

    wasOpenRef.current = true;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    window.setTimeout(() => {
      drawerRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={openButtonRef}
        type="button"
        onClick={onToggle}
        style={styles.squadBuilderTab}
        aria-expanded={isOpen}
        aria-controls="squad-builder-drawer"
      >
        SKŁAD
      </button>

      {isOpen && (
        <>
          <div style={styles.squadBuilderBackdrop} onClick={onClose} />

          <aside
            ref={drawerRef}
            id="squad-builder-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="squad-builder-title"
            tabIndex={-1}
            style={styles.squadBuilderDrawer}
          >
            <div style={styles.squadBuilderDrawerHeader}>
              <div>
                <div
                  id="squad-builder-title"
                  style={styles.squadBuilderDrawerTitle}
                >
                  Asystent wyboru składu
                </div>

                <div style={styles.squadBuilderDrawerSubtitle}>
                  Boisko, aktywny slot, role, noga i TOP 3 kandydatów.
                </div>
              </div>

              <AppButton
                type="button"
                variant="neutral"
                size="icon"
                onClick={onClose}
                title="Zamknij"
                aria-label="Zamknij asystenta wyboru składu"
              >
                ✕
              </AppButton>
            </div>

            <div style={styles.squadBuilderDrawerBody}>
              <div style={styles.squadBuilderScaledContent}>{children}</div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}