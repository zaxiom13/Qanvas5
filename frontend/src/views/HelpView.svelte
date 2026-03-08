<script lang="ts">
  import type { CatalogData } from "../types.ts";

  let { catalog }: { catalog: CatalogData } = $props();
</script>

<div class="help-view">
  <section class="help-section">
    <h3>How `setup` and `draw` Work</h3>
    <ul>
      {#each catalog.SETUP_DRAW_GUIDE as item}
        <li>{item}</li>
      {/each}
    </ul>
  </section>

  <section class="help-section">
    <h3>API Glossary</h3>
    <ul>
      {#each catalog.API_GLOSSARY as item}
        <li>{item}</li>
      {/each}
    </ul>
  </section>

  <section class="help-section">
    <h3>Primitive Table Schema</h3>
    <ul>
      {#each catalog.PRIMITIVE_COLUMN_HELP as item}
        <li>{item}</li>
      {/each}
    </ul>
  </section>

  <section class="help-section">
    <h3>Input and Document Fields</h3>
    <ul>
      {#each catalog.INPUT_DOCUMENT_HELP as item}
        <li>{item}</li>
      {/each}
    </ul>
  </section>
</div>
