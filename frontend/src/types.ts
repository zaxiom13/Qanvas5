export type ViewName = "preview" | "library" | "help" | "runtime";

export type SketchTab = {
  id: string;
  name: string;
  kind: "main" | "helper";
  code: string;
};

export type Workspace = {
  activeTabId: string;
  tabs: SketchTab[];
};

export type SavedSketch = {
  id: string;
  name: string;
  workspace: Workspace;
  createdAt: number;
  updatedAt: number;
};

export type AppSnapshot = {
  workspace: Workspace;
  savedSketches: SavedSketch[];
  currentSketchId: string | null;
  showFpsOverlay: boolean;
};

export type CatalogData = {
  DEFAULT_SKETCH: string;
  EMPTY_SKETCH: string;
  HELPER_TEMPLATE: string;
  API_GLOSSARY: string[];
  PRIMITIVE_COLUMN_HELP: string[];
  INPUT_DOCUMENT_HELP: string[];
  SETUP_DRAW_GUIDE: string[];
  EXAMPLES: Array<{
    id: string;
    label: string;
    workspace: Workspace;
  }>;
};

export type ConsoleEntry = {
  id: string;
  kind: "info" | "error";
  summary: string;
  trace?: string;
  stamp: string;
};

export type RuntimeStatus = {
  platform: string;
  configured: boolean;
  source: string | null;
  qBinary: string | null;
  resolvedPath: string | null;
  message: string;
};

export type UpdateState = {
  status: string;
  version: string;
  availableVersion: string | null;
  message: string;
};
