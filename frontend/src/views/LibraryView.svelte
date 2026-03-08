<script lang="ts">
  import type { SavedSketch } from "../types.ts";

  let {
    savedSketches,
    currentSketchId,
    currentSketchName,
    onsaveas,
    onupdatesaved,
    onopen,
    onrename,
    ondelete
  }: {
    savedSketches: SavedSketch[];
    currentSketchId: string | null;
    currentSketchName: string;
    onsaveas: () => void;
    onupdatesaved: () => void;
    onopen: (id: string) => void;
    onrename: (id: string) => void;
    ondelete: (id: string) => void;
  } = $props();

  const sorted = $derived([...savedSketches].sort((a, b) => b.updatedAt - a.updatedAt));
</script>

<div class="library-view">
  <section class="library-hero">
    <div>
      <p class="eyebrow">Sketch Library</p>
      <h2>Current: {currentSketchName}</h2>
      <p class="library-hero-summary">
        Save named versions of sketches, reopen older work, and keep drafts from getting lost between app restarts.
      </p>
    </div>
    <div class="library-hero-actions">
      <button onclick={onsaveas}>Save Sketch As…</button>
      <button class="ghost" onclick={onupdatesaved}>Update Saved Sketch</button>
    </div>
  </section>

  <section class="library-shelf">
    <div class="library-shelf-header">
      <p class="eyebrow">Saved Sketches</p>
      <strong>{savedSketches.length} saved</strong>
    </div>

    {#if savedSketches.length === 0}
      <p class="saved-sketches-empty">
        No saved sketches yet. Save the draft you are working on to start a reusable library.
      </p>
    {:else}
      <div class="saved-sketches-list">
        {#each sorted as sketch (sketch.id)}
          <div class="saved-sketch-item {sketch.id === currentSketchId ? 'active' : ''}">
            <button class="saved-sketch-meta" onclick={() => onopen(sketch.id)}>
              <strong>{sketch.name}</strong>
              <span>Updated {new Date(sketch.updatedAt).toLocaleString()}</span>
            </button>
            <div class="saved-sketch-actions">
              <button class="ghost" onclick={() => onopen(sketch.id)}>Open</button>
              <button class="ghost" onclick={() => onrename(sketch.id)}>Rename</button>
              <button class="ghost" onclick={() => ondelete(sketch.id)}>Delete</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
