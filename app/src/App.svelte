<script lang="ts">
  import Player from "./Player/Player.svelte";
  import RipBrowser from "./RipBrowser/RipBrowser.svelte";
  import Compass from "svelte-material-icons/Compass.svelte";
  import { browser, options, playlists } from "./stores";

  let loaded = false;
  let selectedPlaylist = null;

  $browser.load().then(() => {
    loaded = true;
  });

  function toggleSetting(setting: string) {
    options.update((o) => {
      localStorage.setItem("siivadb-" + setting, o[setting].toString());
      return o;
    });
  }
</script>

<header>
  <a class="logo" href="https://cabalex.github.io">cabalex.github.io</a>
  <h1>SiIvaDB</h1>
  {#if loaded}
    <div class="updated">
      Updated {new Date($browser.createdAt).toLocaleString()}
    </div>
  {/if}
  <div style="flex-grow: 1" />
  <div>
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
</header>
<main>
  {#if loaded}
    <div class="tabs">
      <button
        class="tab"
        class:active={selectedPlaylist === null}
        on:click={() => (selectedPlaylist = null)}
      >
        <Compass />
        Explore
      </button>
      {#each $playlists as playlist}
        <button
          class="tab"
          class:active={selectedPlaylist === playlist}
          on:click={() => (selectedPlaylist = playlist)}
        >
          {playlist.name}
        </button>
      {/each}
    </div>
    <RipBrowser browser={$browser} bind:playlist={selectedPlaylist} />
  {:else}
    <h2>Loading...</h2>
  {/if}
</main>
<Player />

<style>
  header {
    height: 30px;
    background-color: #222;

    display: flex;
    align-items: center;
    padding: 10px;
    padding-left: 0;
    gap: 10px;
  }
  header .logo {
    font-weight: bold;
    background-color: #4d7bcb;
    color: white;
    height: 100%;
    padding: 10px;
    text-decoration: none;
    line-height: 30px;
    transition: background-color 0.1s ease-in-out;
  }
  header .logo:hover {
    background-color: #82aaff;
  }
  header h1 {
    margin: 0;
    font-size: 2em;
    line-height: 30px;
  }
  main {
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    height: calc(100% - 50px);
    overflow: hidden;
  }
  .tabs {
    display: flex;
    flex-direction: row;
    gap: 10px;
    padding: 5px;
    padding-bottom: 0;
    width: 100%;
    background-color: #333;
    overflow-x: auto;
    border-bottom: 1px solid #444;
  }
  .tab {
    justify-content: flex-start;
    background-color: #444;
    color: white;
    padding: 10px;
    border-radius: 10px 10px 0 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .tab.active {
    background-color: #555;
  }
</style>
