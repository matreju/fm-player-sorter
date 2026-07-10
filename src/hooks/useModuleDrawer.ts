import { useCallback, useEffect, useState } from "react";
import {
  closeAppModule,
  getCloseModuleFromEvent,
  getModuleFromEvent,
  MODULE_DOCK_CLOSE_EVENT,
  MODULE_DOCK_OPEN_EVENT,
  openAppModule,
  type AppModuleId,
} from "../utils/moduleDock";

export function useModuleDrawer(moduleId: AppModuleId) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    openAppModule(moduleId);
  }, [moduleId]);

  const close = useCallback(() => {
    setIsOpen(false);
    closeAppModule(moduleId);
  }, [moduleId]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
      return;
    }

    open();
  }, [isOpen, open, close]);

  useEffect(() => {
    function handleOpenModule(event: Event) {
      const requestedModule = getModuleFromEvent(event);

      if (!requestedModule) {
        return;
      }

      setIsOpen(requestedModule === moduleId);
    }

    function handleCloseModule(event: Event) {
      const requestedModule = getCloseModuleFromEvent(event);

      if (!requestedModule || requestedModule === moduleId) {
        setIsOpen(false);
      }
    }

    window.addEventListener(MODULE_DOCK_OPEN_EVENT, handleOpenModule);
    window.addEventListener(MODULE_DOCK_CLOSE_EVENT, handleCloseModule);

    return () => {
      window.removeEventListener(MODULE_DOCK_OPEN_EVENT, handleOpenModule);
      window.removeEventListener(MODULE_DOCK_CLOSE_EVENT, handleCloseModule);
    };
  }, [moduleId]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
}