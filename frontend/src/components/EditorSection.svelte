<script lang="ts">
  import type { Workspace, ConsoleEntry } from "../types.ts";
  import TabBar from "./TabBar.svelte";
  import ConsolePanel from "./ConsolePanel.svelte";

  let {
    workspace,
    consoleEntries,
    editorHost = $bindable<HTMLDivElement | null>(null),
    onswitchtab,
    onaddhelpertab,
    onremovetab
  }: {
    workspace: Workspace;
    consoleEntries: ConsoleEntry[];
    editorHost?: HTMLDivElement | null;
    onswitchtab: (tabId: string) => void;
    onaddhelpertab: () => void;
    onremovetab: (tabId: string) => void;
  } = $props();
</script>

<section class="editor-pane">
  <TabBar
    tabs={workspace.tabs}
    activeTabId={workspace.activeTabId}
    onswitchtab={onswitchtab}
    onaddhelpertab={onaddhelpertab}
    onremovetab={onremovetab}
  />

  <div bind:this={editorHost} class="editor-host"></div>

  <ConsolePanel entries={consoleEntries} />
</section>
