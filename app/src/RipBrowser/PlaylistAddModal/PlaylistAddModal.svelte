<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Rip from "../Rip.svelte";
  import Plus from "svelte-material-icons/Plus.svelte";
  import MusicNote from "svelte-material-icons/MusicNote.svelte";
  import { type Playlist, playlists } from "../../stores";

  export let video: Rip;

  const dispatch = createEventDispatcher();

  function add(video: Rip, playlist: Playlist) {
    if (playlist.videos.find((v) => v === video.ytid)) {
      playlist.videos = playlist.videos.filter((v) => v !== video.ytid);
      $playlists = $playlists;
    } else {
      playlist.videos.push(video.ytid);
      $playlists = $playlists;
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

<div class="modal" on:click={() => dispatch("close")}>
  <div class="modal-inner" on:click={(e) => e.stopPropagation()}>
    <h2>Add video to playlist</h2>
    <div class="playlists">
      {#each $playlists as playlist}
        <button
          class="playlist"
          on:click={() => add(video, playlist)}
          class:active={playlist.videos.includes(video.ytid)}
        >
          <MusicNote />
          <h3>{playlist.name}</h3>
          <span>
            {playlist.videos.length} rip{playlist.videos.length === 1
              ? ""
              : "s"}
          </span>
        </button>
      {/each}
    </div>
    <button class="playlist" on:click={createNew}>
      <Plus />
      Create new playlist
    </button>
  </div>
</div>

<style>
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  .modal-inner {
    background-color: #333;
    padding: 20px;
    border-radius: 8px;
    min-width: min(calc(100% - 40px), 500px);
    max-width: 500px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  h2 {
    margin: 0;
    font-size: 1.5em;
    color: #fff;
  }
  .playlists {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 50vh;
    overflow-y: auto;
    margin-bottom: 10px;
  }
  .playlist {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
  }
  .playlist h3 {
    margin: 0;
    flex-grow: 1;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .playlist span {
    white-space: nowrap;
    color: #777;
  }
  .playlist.active {
    background-color: #444;
  }
</style>
