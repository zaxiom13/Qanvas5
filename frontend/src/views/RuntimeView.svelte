<script lang="ts">
  import type { RuntimeStatus, UpdateState } from "../types.ts";

  let {
    runtimeStatus,
    updateState,
    sourceLabel,
    onautodetect,
    onchoosebinary,
    onclearbinary,
    oncheckupdates,
    oninstall,
    onopenexternal
  }: {
    runtimeStatus: RuntimeStatus | null;
    updateState: UpdateState;
    sourceLabel: (source: string | null | undefined) => string;
    onautodetect: () => void;
    onchoosebinary: () => void;
    onclearbinary: () => void;
    oncheckupdates: () => void;
    oninstall: () => void;
    onopenexternal: (url: string) => void;
  } = $props();
</script>

<div class="setup-view">
  <section class="setup-hero">
    <div>
      <p class="eyebrow">Runtime</p>
      <h2>Show the q connection this session is actually using.</h2>
      <p class="setup-summary">{runtimeStatus?.message || "Checking your local q runtime…"}</p>
    </div>
    <div class="setup-hero-actions">
      <button onclick={onautodetect}>Auto Detect q</button>
      <button class="ghost" onclick={onchoosebinary}>Choose q Executable</button>
      <button class="ghost" onclick={onclearbinary}>Reset Runtime</button>
    </div>
  </section>

  <div class="runtime-cards">
    <article class="runtime-card">
      <p class="eyebrow">Integration Status</p>
      <div class="runtime-badge {runtimeStatus?.configured ? 'runtime-badge-ready' : 'runtime-badge-pending'}">
        {runtimeStatus?.configured ? "Connected" : "Not connected"}
      </div>
      <dl class="runtime-facts">
        <div>
          <dt><span class="fact-label">Platform</span></dt>
          <dd><strong>{runtimeStatus?.platform || "desktop"}</strong></dd>
        </div>
        <div>
          <dt><span class="fact-label">Connected q</span></dt>
          <dd><strong>{runtimeStatus?.resolvedPath || runtimeStatus?.qBinary || "Not linked yet"}</strong></dd>
        </div>
        <div>
          <dt><span class="fact-label">Detection</span></dt>
          <dd><strong>{sourceLabel(runtimeStatus?.source)}</strong></dd>
        </div>
      </dl>
    </article>

    <article class="runtime-card">
      <p class="eyebrow">App Updates</p>
      <div class="runtime-badge runtime-badge-pending">{updateState.status}</div>
      <dl class="runtime-facts">
        <div>
          <dt><span class="fact-label">Current</span></dt>
          <dd><strong>{updateState.version}</strong></dd>
        </div>
        <div>
          <dt><span class="fact-label">Available</span></dt>
          <dd><strong>{updateState.availableVersion || "—"}</strong></dd>
        </div>
        <div>
          <dt><span class="fact-label">Status</span></dt>
          <dd><strong>{updateState.message}</strong></dd>
        </div>
      </dl>
      <div class="setup-links" style="margin-top: 1rem;">
        <button class="ghost" onclick={oncheckupdates}>Check for Updates</button>
        <button
          class="ghost"
          disabled={updateState.status !== "downloaded"}
          onclick={oninstall}
        >Install Downloaded Update</button>
      </div>
    </article>
  </div>

  <section class="setup-links">
    <button onclick={() => onopenexternal("https://code.kx.com/q/")}>q Docs</button>
    <button onclick={() => onopenexternal("https://kx.com/download/")}>KDB-X Download</button>
    <button onclick={() => onopenexternal("https://github.com/zaxiom13/Qanvas5")}>Project Repo</button>
  </section>
</div>
