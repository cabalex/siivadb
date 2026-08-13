<script lang="ts">
  import Transfer from "svelte-material-icons/CogTransfer.svelte";
  import Upload from "svelte-material-icons/Upload.svelte";
  import Download from "svelte-material-icons/Download.svelte";
  import RipBrowser from "../RipBrowser";
  import Modal from "../../assets/Modal.svelte";
  import { likes, playlists } from "../../stores";

  export let browser: RipBrowser;

  function createExport() {
    const seen = localStorage.getItem("siivadb-seen") ?? "[]";
    const shortsSettings =
      localStorage.getItem("siivadb-shortsSettings") ?? "{}";
    return {
      likes: $likes,
      playlists: $playlists,
      seen: JSON.parse(seen),
      seenDescriptionTooltip: localStorage.getItem(
        "siivadb-seenDescriptionTooltip",
      ),
      shortsSettings: JSON.parse(shortsSettings),
      shownlikenotification: localStorage.getItem(
        "siivadb-shownlikenotification",
      ),
    };
  }

  function createImport(data: string) {
    const parsed = JSON.parse(data);
    if (parsed.likes) {
      if (!(parsed.likes instanceof Array)) {
        throw new Error("Invalid likes data");
      }
      likes.set([...new Set([...$likes, ...parsed.likes])]);
    }
    if (parsed.playlists) {
      if (!(parsed.playlists instanceof Array)) {
        throw new Error("Invalid playlists data");
      }
      playlists.set([...$playlists, ...parsed.playlists]);
    }
    if (parsed.seen) {
      if (!(parsed.seen instanceof Array)) {
        throw new Error("Invalid seen data");
      }
      localStorage.setItem("siivadb-seen", JSON.stringify(parsed.seen));
    }

    if (parsed.shortsSettings) {
      if (typeof parsed.shortsSettings !== "object") {
        throw new Error("Invalid shortsSettings data");
      }
      localStorage.setItem(
        "siivadb-shortsSettings",
        JSON.stringify(parsed.shortsSettings),
      );
    }

    if (parsed.shownlikenotification) {
      if (typeof parsed.shownlikenotification !== "string") {
        throw new Error("Invalid shownlikenotification data");
      }
      localStorage.setItem(
        "siivadb-shownlikenotification",
        parsed.shownlikenotification,
      );
    }

    if (parsed.seenDescriptionTooltip) {
      if (typeof parsed.seenDescriptionTooltip !== "string") {
        throw new Error("Invalid seenDescriptionTooltip data");
      }
      localStorage.setItem(
        "siivadb-seenDescriptionTooltip",
        parsed.seenDescriptionTooltip,
      );
    }

    location.reload();
  }

  function exportData() {
    const data = createExport();
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `siivadb-export-${new Date().toISOString()}.json`;
    a.click();

    URL.revokeObjectURL(url);
    a.remove();
  }

  let loading = false;
  async function importData(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    loading = true;
    try {
      const file = input.files[0];
      const text = await file.text();
      createImport(text);
    } catch (e) {
      console.error("Error importing data:", e);
      alert("Error importing data. See console for details.");
    }
    loading = false;
  }

  let fileInput: HTMLInputElement;
</script>

<div class="device-import">
  <div style="flex-grow: 1">
    <Transfer />
    <span>
      Looking to transfer playlists and Shorts data to another device?
    </span>
  </div>
  <div class="btn-row">
    <button on:click={exportData} disabled={loading}>
      <Upload /> Export data
    </button>
    <button on:click={() => fileInput.click()} disabled={loading}>
      <Download /> Import data
    </button>
    <input
      type="file"
      accept=".json"
      on:change={importData}
      bind:this={fileInput}
      style="display: none"
    />
  </div>
</div>

<style>
  .device-import {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem;
    text-align: left;
    background-color: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid #444;
  }
  .btn-row {
    display: flex;
    gap: 0.5rem;
  }
  .device-import button {
    background-color: #333;
  }
  @media screen and (max-width: 600px) {
    .device-import {
      flex-direction: column;
      align-items: stretch;
    }
    .btn-row {
      justify-content: center;
    }
    .btn-row button {
      flex-grow: 1;
    }
  }
</style>
