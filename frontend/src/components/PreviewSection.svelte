<script lang="ts">
  import type { ViewName, SavedSketch, RuntimeStatus, UpdateState, CatalogData } from "../types.ts";
  import PreviewView from "../views/PreviewView.svelte";
  import LibraryView from "../views/LibraryView.svelte";
  import HelpView from "../views/HelpView.svelte";
  import RuntimeView from "../views/RuntimeView.svelte";

  let {
    setupApplied,
    showFpsOverlay = $bindable(false),
    fpsDisplay,
    previewNotice,
    savedSketches,
    currentSketchId,
    currentSketchName,
    catalog,
    runtimeStatus,
    updateState,
    sourceLabel,
    canvasHost = $bindable<HTMLDivElement | null>(null),
    onsaveas,
    onupdatesaved,
    onopensketch,
    onrenamesketch,
    ondeletesketch,
    onautodetect,
    onchoosebinary,
    onclearbinary,
    oncheckupdates,
    oninstall,
    onopenexternal
  }: {
    setupApplied: boolean;
    showFpsOverlay: boolean;
    fpsDisplay: string;
    previewNotice: { tone: "info" | "error"; title: string; detail: string } | null;
    savedSketches: SavedSketch[];
    currentSketchId: string | null;
    currentSketchName: string;
    catalog: CatalogData;
    runtimeStatus: RuntimeStatus | null;
    updateState: UpdateState;
    sourceLabel: (source: string | null | undefined) => string;
    canvasHost?: HTMLDivElement | null;
    onsaveas: () => void;
    onupdatesaved: () => void;
    onopensketch: (id: string) => void;
    onrenamesketch: (id: string) => void;
    ondeletesketch: (id: string) => void;
    onautodetect: () => void;
    onchoosebinary: () => void;
    onclearbinary: () => void;
    oncheckupdates: () => void;
    oninstall: () => void;
    onopenexternal: (url: string) => void;
  } = $props();

  let activeView: ViewName = $state("preview");
</script>

<section class="preview-pane">
  <div class="preview-tabs">
    {#each [
      { id: "preview", label: "Preview" },
      { id: "library", label: "Library" },
      { id: "help", label: "Help" },
      { id: "runtime", label: "Runtime" }
    ] as item}
      <button
        class="preview-tab-btn {activeView === item.id ? 'active' : ''}"
        onclick={() => (activeView = item.id as ViewName)}
      >{item.label}</button>
    {/each}
    {#if activeView === "preview"}
      <label class="preview-toggle">
        <input type="checkbox" bind:checked={showFpsOverlay} />
        <span>FPS</span>
      </label>
    {/if}
  </div>

  <!-- Always mounted so canvasHost div is never removed from DOM -->
  <PreviewView
    {setupApplied}
    {showFpsOverlay}
    {fpsDisplay}
    {previewNotice}
    hidden={activeView !== "preview"}
    bind:canvasHost
  />

  {#if activeView === "library"}
    <LibraryView
      {savedSketches}
      {currentSketchId}
      {currentSketchName}
      onsaveas={onsaveas}
      onupdatesaved={onupdatesaved}
      onopen={onopensketch}
      onrename={onrenamesketch}
      ondelete={ondeletesketch}
    />
  {:else if activeView === "help"}
    <HelpView {catalog} />
  {:else if activeView === "runtime"}
    <RuntimeView
      {runtimeStatus}
      {updateState}
      {sourceLabel}
      onautodetect={onautodetect}
      onchoosebinary={onchoosebinary}
      onclearbinary={onclearbinary}
      oncheckupdates={oncheckupdates}
      oninstall={oninstall}
      onopenexternal={onopenexternal}
    />
  {/if}

</section>
