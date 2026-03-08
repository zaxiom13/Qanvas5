<script lang="ts">
  import type { CatalogData } from "../types.ts";

  let {
    statusText,
    currentSketchName,
    showExampleTray = $bindable(false),
    catalog,
    onrun,
    onstop,
    onnewsketch,
    onclearconsole,
    onloadexample
  }: {
    statusText: string;
    currentSketchName: string;
    showExampleTray: boolean;
    catalog: CatalogData;
    onrun: () => void;
    onstop: () => void;
    onnewsketch: () => void;
    onclearconsole: () => void;
    onloadexample: (id: string) => void;
  } = $props();
</script>

<header class="topbar">
  <div class="brand-wrap">
    <div class="brand">Qanvas5 Studio</div>
    <div class="brand-meta">desktop sketching for q</div>
  </div>

  <div class="topbar-actions">
    <button onclick={onrun}>Run</button>
    <button class="ghost" onclick={onstop}>Stop</button>
    <button class="ghost" onclick={onnewsketch}>New Sketch</button>
    <button class="ghost" onclick={onclearconsole}>Reset Output</button>
    <div class="menu-wrap">
      <button
        class="ghost"
        onclick={() => (showExampleTray = !showExampleTray)}
        aria-expanded={showExampleTray}
      >Examples ▾</button>
      {#if showExampleTray}
        <div class="example-tray">
          {#each catalog.EXAMPLES as example}
            <button
              class="ghost"
              onclick={() => {
                onloadexample(example.id);
                showExampleTray = false;
              }}
            >{example.label}</button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="status-stack">
    <div class="status-text">{statusText}</div>
    <div class="status-sketch-name">{currentSketchName}</div>
  </div>
</header>
