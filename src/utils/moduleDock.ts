export type AppModuleId =
  | "compare"
  | "squad"
  | "core"
  | "camps";
export const MODULE_DOCK_OPEN_EVENT = "fm-player-sorter-open-module";
export const MODULE_DOCK_CLOSE_EVENT = "fm-player-sorter-close-module";

const APP_MODULE_IDS: AppModuleId[] = [
  "compare",
  "squad",
  "core",
  "camps",
];
type ModuleDockOpenDetail = {
  module: AppModuleId;
};

type ModuleDockCloseDetail = {
  module?: AppModuleId;
};

export function isAppModuleId(value: unknown): value is AppModuleId {
  return APP_MODULE_IDS.includes(value as AppModuleId);
}

export function getModuleFromEvent(event: Event): AppModuleId | null {
  const module = (event as CustomEvent<ModuleDockOpenDetail>).detail?.module;

  return isAppModuleId(module) ? module : null;
}

export function getCloseModuleFromEvent(event: Event): AppModuleId | null {
  const module = (event as CustomEvent<ModuleDockCloseDetail>).detail?.module;

  return isAppModuleId(module) ? module : null;
}

export function openAppModule(module: AppModuleId) {
  window.dispatchEvent(
    new CustomEvent<ModuleDockOpenDetail>(MODULE_DOCK_OPEN_EVENT, {
      detail: {
        module,
      },
    })
  );
}

export function closeAppModule(module?: AppModuleId) {
  window.dispatchEvent(
    new CustomEvent<ModuleDockCloseDetail>(MODULE_DOCK_CLOSE_EVENT, {
      detail: {
        module,
      },
    })
  );
}
