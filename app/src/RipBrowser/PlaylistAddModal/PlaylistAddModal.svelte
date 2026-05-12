<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Plus from "svelte-material-icons/Plus.svelte";
  import MusicNote from "svelte-material-icons/MusicNote.svelte";
  import Check from "svelte-material-icons/Check.svelte";
  import ThumbUp from "svelte-material-icons/ThumbUp.svelte";
  import Close from "svelte-material-icons/Close.svelte";
  import { type Playlist, playlists, likes } from "../../stores";
  import RipBrowser from "../RipBrowser";
  import Modal from "../../assets/Modal.svelte";

  export let video: RipBrowser["rips"][number];

  const dispatch = createEventDispatcher();

  function add(video: RipBrowser["rips"][number], playlist: Playlist) {
    if (playlist.videos.find((v) => v === video.ytid)) {
      playlist.videos = playlist.videos.filter((v) => v !== video.ytid);
      $playlists = $playlists;
    } else {
      playlist.videos.push(video.ytid);
      $playlists = $playlists;
      dispatch("close");
    }
  }

  function addLike(video: RipBrowser["rips"][number]) {
    if ($likes.find((v) => v === video.ytid)) {
      $likes = $likes.filter((v) => v !== video.ytid);
    } else {
      $likes = [...$likes, video.ytid];
      dispatch("close");
    }
  }

  async function createNew() {
    const name = await prompt("Enter a name for the new playlist:");
    if (!name) return;
    const newPlaylist = { name, videos: [], createdAt: Date.now() };
    playlists.update((playlists) => [...playlists, newPlaylist]);
    add(video, newPlaylist);
  }
</script>

<Modal on:close={() => dispatch("close")}>
  <header>
    <h2>Add video to playlist</h2>
    <button class="close-button" on:click={() => dispatch("close")}>
      <Close />
    </button>
  </header>
  <button
    class="menu-item playlist"
    on:click={() => addLike(video)}
    class:active={$likes.includes(video.ytid)}
  >
    <ThumbUp />
    <h3>Liked Rips</h3>
    <span>
      {$likes.length} rip{$likes.length === 1 ? "" : "s"}
    </span>
  </button>
  {#each $playlists as playlist}
    {@const isInPlaylist = playlist.videos.includes(video.ytid)}
    <button
      class="menu-item playlist"
      on:click={() => add(video, playlist)}
      class:active={isInPlaylist}
    >
      {#if isInPlaylist}
        <Check />
      {:else}
        <MusicNote />
      {/if}
      <h3>{playlist.name}</h3>
      <span>
        {playlist.videos.length} rip{playlist.videos.length === 1 ? "" : "s"}
      </span>
    </button>
  {/each}
  <button class="menu-item playlist add-playlist" on:click={createNew}>
    <Plus />
    Create new playlist
  </button>
</Modal>

<style>
  header {
    background-color: rgba(0, 0, 0, 0.2);
    color: #fff;
    display: flex;
    justify-content: space-between;
  }
  header h2 {
    padding: 15px;
    margin: 0;
    font-size: 1.5em;
  }
  .close-button {
    justify-content: flex-end;
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
  }
  .playlist h3 {
    margin: 0;
    margin-right: 10%;
    flex-grow: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .playlist span {
    white-space: nowrap;
    color: rgba(255, 255, 255, 0.6);
  }
  .playlist.active {
    background-color: #444;
  }
  .menu-item {
    justify-content: flex-start;
    text-align: left;
    width: 100%;
    padding: 15px;
    border: none;
    border-top: 1px solid #333;
    background: none;
    color: white;
    border-radius: 0;
    transition: background-color 0.2s ease-in-out;
  }
  .menu-item:focus-visible,
  .menu-item:hover {
    outline: none;
    background-color: rgba(255, 255, 255, 0.2);
  }
  .add-playlist {
    color: rgb(66, 207, 239);
  }
  .add-playlist:focus-visible,
  .add-playlist:hover {
    background-color: rgba(66, 207, 239, 0.2);
  }
</style>
