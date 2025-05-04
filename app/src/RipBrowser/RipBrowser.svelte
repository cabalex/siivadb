<script lang="ts">
  import Close from "svelte-material-icons/Close.svelte";
  import ArrowLeft from "svelte-material-icons/ArrowLeft.svelte";
  import VirtualList from "svelte-tiny-virtual-list";

  import { currentResults, currentRip, playlists } from "../stores";
  import SiivaBanner from "../assets/SiivaBanner.png";
  import Rip from "./Rip.svelte";
  import PlaylistAddModal from "./PlaylistAddModal/PlaylistAddModal.svelte";
  import Delete from "svelte-material-icons/Delete.svelte";
  import Share from "svelte-material-icons/ShareVariant.svelte";
  import MusicNote from "svelte-material-icons/MusicNote.svelte";
  import RipBrowser from "./RipBrowser";
  import { onMount } from "svelte";

  export let browser: RipBrowser;
  export let playlist = null;
  export const updateScroll = (rip: Rip) => {
    let index = $currentResults.findIndex((r) => r.ytid === rip.ytid);
    if (index === -1) return;
    scrollToIndex = null;
    setTimeout(() => {
      scrollToIndex = index;
    }, 0);
  };

  let searchValue = "";
  let searchType: "all" | "jokes" | "titles" = "all";

  let start;
  let end;
  let addModalVideo = null;

  let playlistCopied = false;
  let scrollToIndex = 0;

  onMount(() => {
    if (window.location.search.includes("pl=")) {
      let list = window.location.search.split("pl=")[1].split("&")[0];
      let decoded = atob(list).split(",");
      let name = decodeURIComponent(decoded[0]);
      let createdAt = parseInt(decoded[1]);
      let videos = decoded.slice(2);
      playlist = {
        name,
        createdAt,
        videos,
      };
      playlists.update((playlists) => {
        let found = playlists.find(
          (p) => p.name === name && p.createdAt === createdAt
        );
        if (found) {
          return playlists;
        } else {
          return [...playlists, playlist];
        }
      });
    }
    if (window.location.search.includes("v=")) {
      let list = window.location.search.split("v=")[1].split("&")[0];
      $currentRip = browser.rips.find((r) => r.ytid === list) || null;
      let ripIndex = $currentResults.findIndex(
        (r) => r.ytid === $currentRip.ytid
      );
      if (ripIndex !== -1) {
        scrollToIndex = ripIndex;
      }
    }
  });

  function copyPlaylistLink() {
    const ripComma = playlist.videos.join(",");
    const name = playlist.name.replace(/,/g, "%2C");
    const b64 = btoa(
      name + "," + playlist.createdAt.toString() + "," + ripComma
    );
    const link = location.origin + location.pathname + "?pl=" + b64;
    navigator.clipboard.writeText(link);
    playlistCopied = true;
    setTimeout(() => (playlistCopied = false), 1000);
  }

  function deletePlaylist() {
    if (confirm("Are you sure you want to delete this playlist?")) {
      playlists.update((playlists) => {
        return playlists.filter(
          (p) => p.name !== playlist.name && p.createdAt !== playlist.createdAt
        );
      });
      playlist = null;
    }
  }

  $: {
    if (searchValue && searchValue.length >= 3) {
      $currentResults = browser.search(
        searchValue,
        searchType,
        "newest",
        playlist
      );
      //} else if (window.location.search.includes("list=")) {
      //  let list = window.location.search.split("list=")[1].split("&")[0];
      //  browser.fetchPlaylist(list).then((r) => ($currentResults = r));
    } else if (playlist) {
      $currentResults = browser.playlist(playlist);
    } else {
      $currentResults = browser.rips;
    }
  }
</script>

<main>
  <div
    class="search"
    style={`display: ${window.location.search.includes("list=") ? "none" : "flex"}`}
  >
    <select bind:value={searchType}>
      <option value="all">All</option>
      <option value="titles">Titles</option>
      <option value="jokes">Jokes</option>
    </select>
    <input
      type="text"
      placeholder={playlist
        ? "Search this playlist..."
        : "Search thousands of high quality rips..."}
      bind:value={searchValue}
    />
    <span
      >Showing {start + 1} to {end} of {$currentResults.length} rips {window.location.search.includes(
        "list="
      )
        ? "(from YouTube playlist)"
        : ""}</span
    >
    {#if searchValue.length > 1}
      <button class="clearSearch" on:click={() => (searchValue = "")}>
        <Close />
      </button>
    {/if}
  </div>
  <div
    class="search"
    style={`display: ${window.location.search.includes("list=") ? "flex" : "none"}`}
  >
    <a href="/siivadb" style="color: white">
      <ArrowLeft height="24px" width="24px" />
    </a>
    YouTube playlist with {$currentResults.length || "[loading...]"} videos.
  </div>
  {#if $currentResults.length > 0}
    <VirtualList
      itemCount={$currentResults.length}
      itemSize={window.innerWidth < 900 ? 220 : 120}
      width="100%"
      height={window.innerHeight - 146}
      scrollToAlignment="start"
      {scrollToIndex}
      on:itemsUpdated={(e) => {
        start = e.detail.start;
        end = e.detail.end;
      }}
    >
      <div slot="header" class="first">
        {#if playlist !== null && (!searchValue || searchValue.length < 3)}
          <MusicNote />
          <div class="text">
            <h2>{playlist.name}</h2>
            <span style="color: #aaa">
              {playlist.videos.length} rip{playlist.videos.length === 1
                ? ""
                : "s"}
            </span>
          </div>
          <button class:copied={playlistCopied} on:click={copyPlaylistLink}>
            <Share />
          </button>
          <button class="danger" on:click={deletePlaylist}>
            <Delete />
          </button>
        {/if}
      </div>
      <div slot="item" let:index let:style {style}>
        {#key $currentResults[index].ytid}
          <Rip
            rip={$currentResults[index]}
            bind:searchType
            bind:searchValue
            on:addToPlaylist={(e) => (addModalVideo = e.detail)}
          />
        {/key}
      </div>
      <div slot="footer" class="last">
        {#if playlist !== null && searchValue && searchValue.length >= 3}
          You're searching a playlist, and this is the end. <button
            class="link"
            on:click={() => (playlist = null)}>Search all rips</button
          >
        {:else if playlist !== null}
          You've reached the end of the playlist. <button
            class="link"
            on:click={() => (playlist = null)}>Explore all rips</button
          >
        {:else if searchValue && searchValue.length >= 3}
          You've reached the end of the search results. <button
            class="link"
            on:click={() => (searchValue = "")}>Back to explore</button
          >
        {:else}
          You've reached the end of the channel... or have you?
        {/if}
        <img src={SiivaBanner} alt="The end is never" />
      </div>
    </VirtualList>
  {:else}
    <div class="last" style="width: 100%">
      {#if playlist !== null && searchValue && searchValue.length >= 3}
        You're searching a playlist, and there's no results. <button
          class="link"
          on:click={() => (playlist = null)}>Search all rips</button
        >
      {:else if playlist !== null}
        There's nothing in this playlist. <button
          class="link"
          on:click={() => (playlist = null)}>Explore all rips</button
        >
      {:else if searchValue && searchValue.length >= 3}
        You've reached the end of the search results. <button
          class="link"
          on:click={() => (searchValue = "")}>Clear search</button
        >
      {:else}
        You've reached the end of the channel... or have you?
      {/if}
      <img src={SiivaBanner} alt="The end is never" />
    </div>
  {/if}
</main>

{#if addModalVideo}
  <PlaylistAddModal
    video={addModalVideo}
    on:close={() => (addModalVideo = null)}
  />
{/if}

<style>
  main {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .search {
    width: calc(100% - 20px);
    height: 1.5em;
    padding: 10px;
    border-radius: 3px;
    display: flex;
    flex-direction: row;
    gap: 10px;
    background-color: #555;
  }
  .search .clearSearch {
    background-color: transparent;
    border: none;
    outline: none;
    padding: 0;
    padding-left: 10px;
  }
  .search select {
    font-size: 1em;
    height: 100%;
    outline: none;
    border: none;
    border-radius: 2px;
  }
  .search input {
    border: 0;
    flex-shrink: 1;
    width: 100%;
    background-color: transparent;
    outline: none;
    font-size: 1em;
  }
  .search span {
    flex-grow: 1;
    text-align: right;
    white-space: nowrap;
  }
  .first {
    width: calc(100% - 20px);
    max-width: calc(1280px - 20px);
    margin: 10px;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
  .first .text {
    max-width: min(calc(100% - 150px), 1280px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    flex-grow: 1;
  }
  .first h2 {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .last {
    margin: 0 auto;
    position: relative;
    padding-top: 10px;
    padding-bottom: calc(100vh - 225px);
  }
  .copied {
    background-color: #47bd6c;
  }
  .last img {
    width: 100%;
    min-height: 200px;
    object-fit: cover;
    padding-top: 20vh;
    position: absolute;
    bottom: 0;
    left: 0;
    z-index: -1;
    border-radius: 10px;
  }
</style>
