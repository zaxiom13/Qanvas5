<script lang="ts">
  let {
    setupApplied,
    showFpsOverlay,
    fpsDisplay,
    previewNotice,
    hidden = false,
    canvasHost = $bindable<HTMLDivElement | null>(null)
  }: {
    setupApplied: boolean;
    showFpsOverlay: boolean;
    fpsDisplay: string;
    previewNotice: { tone: "info" | "error"; title: string; detail: string } | null;
    hidden?: boolean;
    canvasHost?: HTMLDivElement | null;
  } = $props();
</script>

<!-- Always rendered (never conditionally removed) so p5's canvasHost stays alive.
     Visibility is toggled via display:none when another view tab is active. -->
<div class="preview-view" style={hidden ? "display:none" : ""}>
  <div class="preview-backdrop" aria-hidden="true"></div>

  {#if previewNotice}
    <div class="preview-notice preview-notice-{previewNotice.tone}">
      <p class="preview-eyebrow">{previewNotice.tone === "error" ? "Preview Error" : "Preview Status"}</p>
      <h3>{previewNotice.title}</h3>
      <p>{previewNotice.detail}</p>
    </div>
  {:else if !setupApplied}
    <div class="preview-empty-state">
      <p class="preview-eyebrow">Interactive Stage</p>
      <h3>Press Run to bring the sketch to life.</h3>
      <p>
        The preview mirrors canvas output, mouse input, and frame updates.
        Open Help for table syntax or Runtime if you need to inspect the backend connection.
      </p>
    </div>
  {/if}

  <div bind:this={canvasHost} class="canvas-host"></div>

  {#if showFpsOverlay}
    <div class="fps-overlay" aria-live="off">{fpsDisplay}</div>
  {/if}
</div>
