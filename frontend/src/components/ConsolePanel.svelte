<script lang="ts">
  import type { ConsoleEntry } from "../types.ts";

  let { entries }: { entries: ConsoleEntry[] } = $props();
</script>

<div class="console-panel">
  <div class="console-header">
    <span>Output</span>
    <span>{entries.length} entries</span>
  </div>
  <div class="console-body">
    {#if entries.length === 0}
      <span class="console-empty">Run a sketch to see stdout, runtime errors, and lifecycle logs here.</span>
    {/if}
    {#each entries as entry (entry.id)}
      {#if entry.kind === "error"}
        <div class="console-entry-error">
          <div class="console-error-summary">{entry.stamp} — {entry.summary}</div>
          {#if entry.trace}
            <div class="console-trace">
              {#each entry.trace.split("\n") as line}
                <span class="console-trace-line">{line}</span>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <div>{entry.stamp} {entry.summary}</div>
      {/if}
    {/each}
  </div>
</div>
