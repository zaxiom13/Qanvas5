/// <reference types="svelte" />

declare global {
  type MonacoNamespace = typeof import("monaco-editor");
  type P5Ctor = new (sketch: (instance: any) => void, node?: HTMLElement | null) => any;

  type DesktopRuntimeStatus = {
    platform: string;
    configured: boolean;
    source: string | null;
    qBinary: string | null;
    resolvedPath: string | null;
    message: string;
  };

  type DesktopUpdateState = {
    status: string;
    version: string;
    availableVersion: string | null;
    message: string;
  };

  interface Window {
    monaco?: MonacoNamespace;
    p5?: P5Ctor;
    require?: {
      config: (options: { paths: Record<string, string> }) => void;
      (deps: string[], callback: () => void): void;
    };
    qanvas5Desktop?: {
      getRuntimeStatus?: () => Promise<DesktopRuntimeStatus>;
      autoConfigureRuntime?: () => Promise<DesktopRuntimeStatus>;
      chooseRuntimeBinary?: () => Promise<DesktopRuntimeStatus>;
      clearRuntimeBinary?: () => Promise<DesktopRuntimeStatus>;
      getUpdateState?: () => Promise<DesktopUpdateState>;
      checkForUpdates?: () => Promise<DesktopUpdateState>;
      installUpdateNow?: () => Promise<boolean>;
      onUpdateState?: (listener: (payload: DesktopUpdateState) => void) => () => void;
      openExternal?: (url: string) => Promise<boolean>;
    };
  }
}

export {};
