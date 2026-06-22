import { useEffect, useState } from "react";
import type { SquadBuilderProps } from "../../types/squadBuilderTypes";
import { SquadBuilderDrawerShell } from "./SquadBuilderDrawerShell";
import { SquadBuilderContent } from "./SquadBuilderContent";

const moduleDockEventName = "fm-player-sorter-open-module";
export function SquadBuilder(props: SquadBuilderProps) {
  const [isSquadDrawerOpen, setIsSquadDrawerOpen] = useState(false);
  useEffect(() => {
  function handleOpenModule(event: Event) {
    const module = (event as CustomEvent<{ module?: string }>).detail?.module;

    if (module === "squad") {
      setIsSquadDrawerOpen(true);
    }
  }

  window.addEventListener(moduleDockEventName, handleOpenModule);

  return () => {
    window.removeEventListener(moduleDockEventName, handleOpenModule);
  };
}, []);

  return (
<SquadBuilderDrawerShell
  isOpen={isSquadDrawerOpen}
  onToggle={() => setIsSquadDrawerOpen((current) => !current)}
  onClose={() => setIsSquadDrawerOpen(false)}
  showTab={false}
>
      {isSquadDrawerOpen ? <SquadBuilderContent {...props} /> : null}
    </SquadBuilderDrawerShell>
  );
}