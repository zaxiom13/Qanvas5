<script lang="ts">
  import type { SketchTab } from "../types.ts";

  let {
    tabs,
    activeTabId,
    onswitchtab,
    onaddhelpertab,
    onremovetab
  }: {
    tabs: SketchTab[];
    activeTabId: string;
    onswitchtab: (tabId: string) => void;
    onaddhelpertab: () => void;
    onremovetab: (tabId: string) => void;
  } = $props();
</script>

<div class="tab-bar">
  <div class="tab-list">
    {#each tabs as tab}
      <div
        class="tab-chip {tab.id === activeTabId ? 'active' : ''}"
        role="tab"
        aria-selected={tab.id === activeTabId}
      >
        <button class="tab-chip-label" onclick={() => onswitchtab(tab.id)}>{tab.name}</button>
        {#if tab.kind === "helper"}
          <button
            class="tab-chip-close"
            onclick={() => onremovetab(tab.id)}
            aria-label="Close {tab.name}"
          >×</button>
        {/if}
      </div>
    {/each}
  </div>
  <button class="ghost add-tab-btn" onclick={onaddhelpertab} title="Add helper tab">+ Tab</button>
</div>
