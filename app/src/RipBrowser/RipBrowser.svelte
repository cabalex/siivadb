<script lang="ts">
  import Close from "svelte-material-icons/Close.svelte";
  import ArrowLeft from "svelte-material-icons/ArrowLeft.svelte";
  import Magnify from "svelte-material-icons/Magnify.svelte";
  import VirtualList from "svelte-tiny-virtual-list";

  import { currentResults, currentRip, likes, playlists } from "../stores";
  import SiivaBanner from "../assets/SiivaBanner.png";
  import Rip from "./Rip.svelte";
  import PlaylistAddModal from "./PlaylistAddModal/PlaylistAddModal.svelte";
  import Delete from "svelte-material-icons/Delete.svelte";
  import Share from "svelte-material-icons/ShareVariant.svelte";
  import MusicNote from "svelte-material-icons/MusicNote.svelte";
  import RipBrowser, { getSearchExplanation } from "./RipBrowser";
  import { createEventDispatcher, onMount } from "svelte";
  import TowerFilled from "../assets/TowerFilled.svelte";
  import { slide } from "svelte/transition";
  import DeviceImport from "./DeviceImport/DeviceImport.svelte";

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

  export let searchValue = "";
  export let searchSort:
    | "relevance"
    | "newest"
    | "oldest"
    | "alphabetical"
    | "length" = "relevance";
  let searchDraft = searchValue;

  let start;
  let end;
  let addModalVideo = null;

  let playlistCopied = false;
  let scrollToIndex = 0;

  const dispatch = createEventDispatcher();

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
      if (name === "Liked Rips" && createdAt === 0) {
        likes.update((likedRips) => {
          return [
            ...likedRips,
            ...videos.filter((ytid) => !likedRips.includes(ytid)),
          ];
        });
      } else {
        playlists.update((playlists) => {
          let found = playlists.find(
            (p) => p.name === name && p.createdAt === createdAt,
          );
          if (found) {
            return playlists;
          } else {
            return [...playlists, playlist];
          }
        });
      }
    }
    if (window.location.search.includes("v=")) {
      let list = window.location.search.split("v=")[1].split("&")[0];
      $currentRip = browser.get(list) || null;
      let ripIndex = $currentResults.findIndex(
        (r) => r.ytid === $currentRip.ytid,
      );
      if (ripIndex !== -1) {
        scrollToIndex = ripIndex;
      }
    }

    // Resize list elements if screen size changes
    const onResize = () => {
      listHeight =
        window.innerHeight - 44 - (window.innerWidth < 1100 ? 60 : 0);
      itemSize = window.innerWidth < 900 ? 220 : 120;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  });

  function searchAllRips() {
    let currentValue = searchValue;
    let currentSort = searchSort;
    clearSearch();
    playlist = null;
    setTimeout(() => {
      searchValue = currentValue;
      searchSort = currentSort;
    }, 0);
  }

  function copyPlaylistLink() {
    const ripComma = playlist.videos.join(",");
    const name = playlist.name.replace(/,/g, "%2C");
    const b64 = btoa(
      name +
        "," +
        (playlist.createdAt || Date.now()).toString() +
        "," +
        ripComma,
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
          (p) => p.name !== playlist.name && p.createdAt !== playlist.createdAt,
        );
      });
      playlist = null;
    }
  }

  function clearSearch() {
    searchDraft = "";
    searchValue = "";
    searchSort = "relevance";
  }

  $: {
    if (searchValue && searchValue.length >= 3 && searchSort) {
      $currentResults = browser.search(searchValue, searchSort, playlist);
      scrollToIndex = 1;
      setTimeout(() => (scrollToIndex = 0), 0);
    } else if (playlist) {
      $currentResults = browser.playlist(playlist);
    } else {
      $currentResults = browser.rips;
    }
  }

  $: {
    searchDraft = searchValue;
  }

  let listHeight =
    window.innerHeight - 44 - (window.innerWidth < 1100 ? 60 : 0);
  let itemSize = window.innerWidth < 900 ? 220 : 120;
  let searchFocused = false;
</script>

<main>
  <div
    class="search"
    style={`display: ${window.location.search.includes("list=") ? "none" : "flex"}`}
  >
    <button class="clearSearch">
      <Magnify />
    </button>
    <input
      type="text"
      placeholder={playlist
        ? "Search this playlist..."
        : "Search thousands of high quality rips..."}
      bind:value={searchDraft}
      on:focus={() => (searchFocused = true)}
      on:blur={() => (searchFocused = false)}
      on:keydown={(e) => {
        if (e.key === "Enter") {
          searchValue = searchDraft ?? "";
          e.target.blur();
        }
      }}
      on:change={(e) => {
        searchValue = searchDraft ?? "";
      }}
    />
    <span
      >Showing {start + 1} to {end} of {$currentResults.length} rips {window.location.search.includes(
        "list=",
      )
        ? "(from YouTube playlist)"
        : ""}</span
    >
    {#if searchValue?.length >= 1}
      <select bind:value={searchSort}>
        <option value="relevance">Relevance</option>
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="length">Longest</option>
        <option value="alphabetical">Alphabetical</option>
      </select>
      <button class="clearSearch" on:click={clearSearch}>
        <Close />
      </button>
    {/if}
    {#if searchFocused}
      <div class="search-overlay" in:slide={{ duration: 200, axis: "y" }}>
        {#if searchDraft && searchDraft.length >= 3}
          {@const explanations = getSearchExplanation(searchDraft)}
          <p>Searching for rips...</p>
          {#each explanations as explanation, i}
            <p class="operator-help">
              {explanation[0]} <b>"{explanation[1]}"</b>
              {explanation[2]}
              {#if i < explanations.length - 1}
                {explanation[3]}
              {/if}
            </p>
          {/each}
          <p class="keybind-hint">
            Press <span class="keybind">ENTER</span> to search
          </p>
        {:else}
          <p>
            Try searching a joke, video title, or paste a YouTube video URL. You
            can also search using operators:
          </p>
          <p class="operator-help">
            <b>title:Circus</b> rips containing Circus in the title
          </p>
          <p class="operator-help">
            <b>joke:"Meet the Flintstones"</b> rips that have Meet the Flintstones
            in the joke
          </p>
          <p class="operator-help">
            <b>series:DELTARUNE</b> rips from the DELTARUNE game
          </p>
          <p class="operator-help">
            <b>before:2023-01-01</b> rips uploaded before January 1st, 2023
          </p>
          <p class="operator-help">
            Add "not-" before non-date operators to exclude results, e.g.
            <b>not-joke:"Snow Halation"</b> to find all rips that do NOT have Snow
            Halation in the joke
          </p>
        {/if}
      </div>
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
      {itemSize}
      width="100%"
      height={listHeight}
      scrollToAlignment="start"
      {scrollToIndex}
      on:itemsUpdated={(e) => {
        start = e.detail.start;
        end = e.detail.end;
      }}
    >
      <div slot="header">
        {#if playlist !== null && (!searchValue || searchValue.length < 3)}
          <DeviceImport {browser} />
        {/if}
        <div class="first">
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
            {#if !playlist?.default}
              <button class="danger" on:click={deletePlaylist}>
                <Delete />
              </button>
            {/if}
            {#if $currentResults.length > 0}
              <button
                title="Open search in SiIvaShorts"
                class="siivashorts-btn"
                on:click={() => dispatch("shorts", $currentResults)}
              >
                <TowerFilled />
                <img
                  src="https://i.ytimg.com/vi/{$currentResults[0]
                    .ytid}/default.jpg"
                  alt="SiIvaShorts"
                />
              </button>
            {/if}
          {:else if $currentResults !== browser.rips}
            <div class="search-header">
              <span>
                {$currentResults.length} results
              </span>
              {#if $currentResults.length > 0}
                <button
                  title="Open search in SiIvaShorts"
                  class="siivashorts-btn"
                  on:click={() => dispatch("shorts", $currentResults)}
                >
                  <TowerFilled />
                  <img
                    src="https://i.ytimg.com/vi/{$currentResults[0]
                      .ytid}/default.jpg"
                    alt="SiIvaShorts"
                  />
                </button>
              {/if}
            </div>
          {:else}
            <div class="search-header">
              <div class="text">
                <span>
                  Welcome to <b>SiIvaDB</b>, a daily updating database of
                  high-quality rips.
                </span>
                <span>
                  You can also browse these results in SiIvaShorts by clicking
                  the button on the right.
                </span>
              </div>
              {#if $currentResults.length > 0}
                <button
                  title="Open search in SiIvaShorts"
                  class="siivashorts-btn"
                  on:click={() => dispatch("shorts", $currentResults)}
                >
                  <TowerFilled />
                  <img
                    src="https://i.ytimg.com/vi/{$currentResults[0]
                      .ytid}/default.jpg"
                    alt="SiIvaShorts"
                  />
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
      <div slot="item" let:index let:style {style}>
        {#if $currentResults[index]}
          {#key $currentResults[index].ytid}
            <Rip
              rip={$currentResults[index]}
              bind:searchValue
              on:addToPlaylist={(e) => (addModalVideo = e.detail)}
            />
          {/key}
        {/if}
      </div>
      <div slot="footer" class="last">
        {#if playlist !== null && searchValue && searchValue.length >= 3}
          You're searching a playlist, and this is the end. <button
            class="link"
            on:click={searchAllRips}
          >
            Search all rips
          </button>
          <button class="link" on:click={clearSearch}> Clear search </button>
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
          on:click={searchAllRips}>Search all rips</button
        >
        <button class="link" on:click={clearSearch}> Clear search </button>
      {:else if playlist !== null}
        There's nothing in this playlist. <button
          class="link"
          on:click={() => (playlist = null)}>Explore all rips</button
        >
      {:else if searchValue && searchValue.length >= 3}
        You've reached the end of the search results. <button
          class="link"
          on:click={clearSearch}>Clear search</button
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

<svelte:body
  on:resize={() => {
    listHeight = window.innerHeight - 44 - (window.innerWidth < 1100 ? 60 : 0);
    itemSize = window.innerWidth < 900 ? 220 : 120;
  }}
/>

<style>
  main {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  .search {
    position: relative;
    width: 100%;
    box-sizing: border-box;
    height: 3em;
    padding: 10px;
    display: flex;
    flex-direction: row;
    gap: 10px;
    background-color: #555;
    border: 1px solid #777;
  }
  .search .clearSearch {
    background-color: transparent;
    border: none;
    outline: none;
    padding: 0;
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
  .search .search-overlay {
    position: absolute;
    text-align: left;
    top: calc(100% - 1px);
    left: -1px;
    box-sizing: border-box;
    width: calc(100% + 2px);
    background-color: #444;
    border: 1px solid #777;
    border-top-color: #444;
    padding: 10px;
    z-index: 100;
  }
  .search .search-overlay p {
    margin-top: 0;
    margin-bottom: 5px;
    font-size: 0.9em;
  }
  .search .search-overlay p:last-child {
    margin-bottom: 0;
  }
  .search .search-overlay .operator-help {
    text-indent: 1em;
    color: #ccc;
  }
  .search .search-overlay .keybind-hint {
    text-align: right;
    font-size: 0.8em;
    color: #ccc;
  }
  .search .search-overlay .keybind {
    background-color: #555;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 1rem;
    font-family: monospace;
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
    width: min(calc(100% - 240px), 1280px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    flex-grow: 1;
  }
  .first h2 {
    width: 100%;
    margin: 0;
    flex-shrink: 1;
    overflow-wrap: break-word;
    text-align: left;
  }
  .search-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: left;
    padding-bottom: 10px;
    border-bottom: 1px solid #555;
  }
  .search-header .text {
    display: flex;
    flex-direction: column;
    gap: 5px;
    max-width: unset;
    margin-right: 10px;
  }
  .siivashorts-btn {
    flex-shrink: 0;
    position: relative;
    border: none;
    outline: none;
    padding: 0.25rem;
    height: 96px;
    border-radius: 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #555;
    background: conic-gradient(from 0deg, #319cb5, #92acb1, #2fa09b, #319cb5);
  }
  .siivashorts-btn:hover {
    border-color: #aaa;
  }
  .siivashorts-btn img {
    width: 100%;
    height: 100%;
    aspect-ratio: 9 / 16;
    border-radius: 0.25rem;
    object-fit: cover;
  }
  :global(.siivashorts-btn svg) {
    position: absolute;
    width: 1.5em;
    height: 1.5em;
    z-index: 10;
    left: 50%;
    top: 50%;
    filter: drop-shadow(0 0 4px black);
    transform: translate(-50%, -50%);
  }
  .last {
    margin: 0 auto;
    position: relative;
    padding-top: 10px;
    height: calc(100% - 50px);
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
  }
  @media screen and (max-width: 1100px) {
    .last {
      height: calc(100% - 113px);
    }
  }
</style>
