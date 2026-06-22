import { useState } from "react";
import type { SquadBuilderProps } from "../../types/squadBuilderTypes";
import { SquadBuilderDrawerShell } from "./SquadBuilderDrawerShell";
import { SquadBuilderContent } from "./SquadBuilderContent";

export function SquadBuilder(props: SquadBuilderProps) {
  const [isSquadDrawerOpen, setIsSquadDrawerOpen] = useState(false);

  return (
    <SquadBuilderDrawerShell
      isOpen={isSquadDrawerOpen}
      onToggle={() => setIsSquadDrawerOpen((current) => !current)}
      onClose={() => setIsSquadDrawerOpen(false)}
    >
      {isSquadDrawerOpen ? <SquadBuilderContent {...props} /> : null}
    </SquadBuilderDrawerShell>
  );
}