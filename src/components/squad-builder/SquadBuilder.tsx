import { useEffect, useState } from "react";
import type { SquadBuilderProps } from "../../types/squadBuilderTypes";
import { useModuleDrawer } from "../../hooks/useModuleDrawer";
import { SquadBuilderDrawerShell } from "./SquadBuilderDrawerShell";
import { SquadBuilderContent } from "./SquadBuilderContent";

export function SquadBuilder(props: SquadBuilderProps) {
  const { isOpen, toggle, close } = useModuleDrawer("squad");
  const [shouldMountContent, setShouldMountContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldMountContent(true);
      return;
    }

    if (shouldMountContent) {
      return;
    }

    if (props.rows.length === 0) {
      return;
    }

    const preloadTimer = window.setTimeout(() => {
      setShouldMountContent(true);
    }, 900);

    return () => {
      window.clearTimeout(preloadTimer);
    };
  }, [isOpen, props.rows.length, shouldMountContent]);

  return (
    <SquadBuilderDrawerShell
      isOpen={isOpen}
      onToggle={toggle}
      onClose={close}
      showTab={false}
    >
      {shouldMountContent ? <SquadBuilderContent {...props} /> : null}
    </SquadBuilderDrawerShell>
  );
}