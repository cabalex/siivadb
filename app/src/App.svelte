<script lang="ts">
  import Player from "./Player/Player.svelte";
  import RipBrowser from "./RipBrowser/RipBrowser.svelte";
  import Magnify from "svelte-material-icons/Magnify.svelte";
  import ThumbUp from "svelte-material-icons/ThumbUp.svelte";
  import ThumbUpOutline from "svelte-material-icons/ThumbUpOutline.svelte";
  import TowerFilled from "./assets/TowerFilled.svelte";
  import TowerOutline from "./assets/TowerOutline.svelte";
  import Shorts from "./Shorts/Shorts.svelte";
  import { browser, currentRip, likes, options, playlists } from "./stores";

  let loaded = false;
  let loadProgress = 0;
  let selectedPlaylist = window.location.hash.includes("shorts")
    ? "shorts"
    : null;
  let updateScroll;
  let stack = [];

  $browser
    .load((progress) => {
      loadProgress = progress;
    })
    .then(() => {
      loaded = true;
    });

  $: {
    if (selectedPlaylist === "shorts") {
      if ($currentRip) currentRip.set(null);
      window.location.hash = "/shorts";
    } else {
      window.location.hash = "";
    }
  }

  function toggleSetting(setting: string) {
    options.update((o) => {
      localStorage.setItem("siivadb-" + setting, o[setting].toString());
      return o;
    });
  }
</script>

<div class="content">
  <aside class="nav">
    <a class="logo" href="https://cabalex.github.io">cabalex.github.io</a>
    <h1>SiIvaDB</h1>
    {#if loaded}
      <div class="updated">
        Updated {new Date($browser.createdAt).toLocaleString()}
      </div>
    {/if}
    <button
      class="tab"
      class:active={selectedPlaylist === null}
      on:click={() => (selectedPlaylist = null)}
    >
      <Magnify />
      Search
    </button>
    <button
      class="tab siivashorts-tab"
      class:active={selectedPlaylist === "shorts"}
      on:click={() => (selectedPlaylist = "shorts")}
    >
      {#if selectedPlaylist === "shorts"}
        <TowerFilled />
      {:else}
        <TowerOutline />
      {/if}
      SiIvaShorts
    </button>
    <button
      class="tab"
      class:active={selectedPlaylist === "likes"}
      on:click={() => (selectedPlaylist = "likes")}
    >
      {#if selectedPlaylist === "likes"}
        <ThumbUp />
      {:else}
        <ThumbUpOutline />
      {/if}
      Likes
    </button>
    {#if $playlists?.length > 0}
      <h3>Playlists</h3>
    {/if}
    {#each $playlists as playlist}
      <button
        class="tab playlist"
        class:active={selectedPlaylist?.name === playlist.name &&
          selectedPlaylist?.createdAt === playlist.createdAt}
        on:click={() => (selectedPlaylist = playlist)}
      >
        {playlist.name}
      </button>
    {/each}
    <div style="height: 100%;"></div>
    <div class="settings">
      <label for="show-jokes">Show jokes</label>
      <input
        type="checkbox"
        bind:checked={$options.showJokes}
        id="show-jokes"
        on:change={() => toggleSetting("showJokes")}
      />
      <!--
        <label for="show-comments">Show comments</label>
        <input type="checkbox" bind:checked={$options.showComments} id="show-comments" on:change={() => toggleSetting("showComments")} />
        -->
    </div>
  </aside>
  <main>
    {#if loaded}
      {#if selectedPlaylist === "shorts"}
        <Shorts bind:stack browser={$browser} />
      {:else if selectedPlaylist === "likes"}
        <RipBrowser
          bind:updateScroll
          browser={$browser}
          on:shorts={(e) => {
            stack = [
              ...stack,
              {
                lookahead: e.detail,
                position: 0,
                fetchMore: false,
              },
            ];
            selectedPlaylist = "shorts";
          }}
          playlist={{
            name: "Liked Shorts",
            createdAt: 0,
            default: true,
            videos: $likes,
          }}
        />
      {:else}
        <RipBrowser
          bind:updateScroll
          browser={$browser}
          bind:playlist={selectedPlaylist}
          on:shorts={(e) => {
            stack = [
              ...stack,
              {
                lookahead: e.detail,
                position: 0,
                fetchMore: false,
              },
            ];
            selectedPlaylist = "shorts";
          }}
        />
      {/if}
    {:else}
      <div class="loading">
        {#if Math.round(loadProgress * 100) === 100}
          <h2>Decompressing...</h2>
        {:else}
          <h2>Loading ({Math.round(loadProgress * 100)}%)...</h2>
        {/if}
        <div class="progress-bar">
          <div class="progress" style="width: {loadProgress * 100}%"></div>
        </div>
      </div>
    {/if}
    <div class="nav"></div>
  </main>
  <aside />
</div>
<Player on:scroll={(e) => updateScroll(e.detail)} />

<style>
  .loading {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .progress-bar {
    width: 80%;
    height: 8px;
    background-color: #333;
    border-radius: 10px;
    overflow: hidden;
    margin: 0 auto;
    margin-top: 8px;
  }
  .progress {
    height: 100%;
    background: linear-gradient(
      to right,
      #319cb5 0%,
      #5fcec9 50%,
      #319cb5 100%
    );
    animation: backgroundMove 2s linear infinite;
    background-size: 200% 100%;
  }
  @keyframes backgroundMove {
    from {
      background-position: 0% 0;
    }
    to {
      background-position: -200% 0;
    }
  }
  .content {
    width: 100%;
    height: 100%;
    margin: 0 auto;
    overflow: hidden;
    display: flex;
    align-items: flex-start;
  }
  aside {
    margin: 0 auto;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    text-align: left;
    padding: 20px 10px;
    padding-top: 0;
  }
  aside.nav {
    width: 300px;
  }
  aside .logo {
    display: block;
    font-weight: bold;
    background-color: #4d7bcb;
    color: white;
    padding: 10px;
    border-radius: 0 0 10px 10px;
    text-align: center;
    text-decoration: none;
    line-height: 30px;
    transition: background-color 0.1s ease-in-out;
  }
  aside .logo:hover {
    background-color: #82aaff;
  }
  aside h1 {
    font-size: 2em;
    line-height: 30px;
  }
  aside h3 {
    margin-bottom: 0;
  }
  main {
    border: 1px solid #555;
    border-top: 0;
    border-bottom: 0;
    width: 100%;
    height: 100%;
    max-width: 1280px;
    overflow: hidden;
  }
  .tab {
    background-color: transparent;
    color: white;
    width: 100%;
    padding: 10px 20px;
    margin-top: 10px;
    border-radius: 100px;
    cursor: pointer;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background-color 0.2s ease-in-out;
    border: none;
  }
  .tab:hover {
    background-color: #333;
  }
  .tab.active {
    background-color: #555;
  }
  :global(.tab.active.siivashorts-tab svg) {
    transform: scale(1.25);
  }
  @media screen and (max-width: 1100px) {
    main {
      border: none;
    }
    aside:not(.nav) {
      display: none;
    }
    aside.nav {
      flex-direction: row;
      position: fixed;
      bottom: var(--safe-area-inset-bottom, 0);
      left: 0;
      z-index: 100;
      background-color: #111;
      width: 100%;
      padding: 0;
      height: 60px;
      border-top: 1px solid #555;
    }
    aside h1 {
      width: 100%;
      font-size: 1em;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }

    aside .logo,
    aside .updated,
    aside .tab.playlist,
    aside h3 {
      display: none;
    }
    aside .tab {
      flex-direction: column;
      justify-content: center;
      padding: 0;
      flex-shrink: 1;
      margin: 0;
      font-size: 0.7rem;
      gap: 3px;
      background-color: transparent !important;
      outline: none;
      -webkit-tap-highlight-color: transparent;
    }
    aside .tab.active {
      font-weight: bold;
    }
    :global(aside .tab svg) {
      width: 1.5rem;
      height: 1.5rem;
    }
    aside .settings {
      display: flex;
      flex-direction: column-reverse;
      align-items: center;
      justify-content: center;
      text-align: center;
      line-height: 1;
      font-size: 0.7rem;
      width: 100%;
    }
    :global(.tab.active svg) {
      transform: scale(1.25);
    }
    :global(aside .tab.siivashorts-tab svg) {
      transform: scale(1.25) translateY(-2px);
    }
    :global(aside .tab.siivashorts-tab.active svg) {
      transform: scale(1.5) translateY(-4px);
    }
  }
</style>
