<script lang="ts">
  import { currentRip } from "../stores";
  import ImgCanvas from "../assets/ImgCanvas.svelte";
  import PlaylistPlus from "svelte-material-icons/PlaylistPlus.svelte";
  import ContentCopy from "svelte-material-icons/ContentCopy.svelte";
  import OpenInNew from "svelte-material-icons/OpenInNew.svelte";
  import DateView from "../assets/DateView.svelte";
  import Joke from "../assets/Joke.svelte";
  import { createEventDispatcher } from "svelte";

  export let rip;
  export let searchType;
  export let searchValue;

  const dispatch = createEventDispatcher();

  $: active = rip.ytid === $currentRip?.ytid;
  function toggleItem(rip: any) {
    currentRip.set(active ? null : rip);
  }

  function formatDuration(time: number) {
    let hours = Math.floor(time / 3600);
    let minutes = Math.floor((time - hours * 3600) / 60);
    let seconds = time - hours * 3600 - minutes * 60;

    let hoursString = hours > 0 ? hours + ":" : "";
    let minutesString = (minutes < 10 ? "0" + minutes : minutes) + ":";
    let secondsString = seconds < 10 ? "0" + seconds : seconds;

    return hoursString + minutesString + secondsString;
  }

  let copied;
  function copyLink(id: string) {
    navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${id}`);

    copied = id;
    setTimeout(() => {
      copied = null;
    }, 1000);
  }
</script>

<div class="rip" on:click={toggleItem.bind(null, rip)} class:active>
  {#if active}
    <ImgCanvas img={`https://img.youtube.com/vi/${rip.ytid}/sddefault.jpg`} />
  {/if}
  <div class="rip-inner">
    <div class="thumb">
      <img
        src={`https://img.youtube.com/vi/${rip.ytid}/sddefault.jpg`}
        alt={rip.name}
      />
      <span class="duration">{formatDuration(rip.duration)}</span>
    </div>
    <div class="title">
      <h2>{rip.name}</h2>
      <span
        class="series"
        on:click={(e) => {
          e.stopPropagation();
          searchType = "titles";
          searchValue = rip.series || "";
        }}
      >
        {rip.series || ""}
      </span>
      -
      <DateView date={rip.postTime} />
    </div>
    <Joke bind:searchValue bind:searchType {rip} />
    <div class="rip-actions" on:click={(e) => e.stopPropagation()}>
      <button on:click={() => dispatch("addToPlaylist", rip)}>
        <PlaylistPlus />
      </button>
      <button
        class:copied={copied === rip.ytid}
        on:click={copyLink.bind(null, rip.ytid)}
      >
        <ContentCopy />
      </button>
      <a
        target="_blank"
        rel="noopener noreferrer"
        href={`https://siivagunner.fandom.com/wiki/${encodeURIComponent(rip.rawname.replace("#", ""))}`}
        class="btn"
      >
        <OpenInNew />
      </a>
    </div>
  </div>
</div>

<style>
  .rip {
    position: relative;
    width: calc(100% - 20px);
    height: 110px;
    border-radius: 3px;
    background-color: #444;

    display: flex;
    align-items: center;
    justify-content: center;

    overflow: hidden;

    margin: 0 auto;
    margin-bottom: 10px;
    max-width: 1280px;
    transition: height 0.2s ease-in-out;
  }
  .rip.active {
    background-image: var(--thumb);
    background-size: cover;
    background-position: center;
    animation: active 5s infinite linear;
  }
  @keyframes active {
    0% {
      background-position-x: 0;
    }
    25% {
      background-position-x: 50px;
      background-position-y: 40%;
    }
    75% {
      background-position-x: -50px;
      background-position-y: 60%;
    }
    100% {
      background-position-x: 0;
    }
  }
  .rip-inner {
    background-color: rgba(0, 0, 0, 0.5);
    text-align: left;
    height: 100px;
    width: calc(100% - 10px);
    position: relative;
    border-radius: 3px;
    overflow: hidden;
    z-index: 2;

    display: flex;
    flex-direction: row;
    align-items: center;
    transition: height 0.2s ease-in-out;
  }
  .rip .title {
    margin: 1em;
    color: white;
    min-width: min(40%, 500px);
    max-width: 40%;
    height: calc(100% - 2em);
    flex-shrink: 2;
  }
  .rip .series {
    transition:
      background-color 0.1s ease-in-out,
      outline 0.1s ease-in-out;
    outline-color: #555;
    cursor: pointer;
    user-select: none;
  }
  .rip .series:hover {
    background-color: #555;
    border-radius: 2px;
    outline: 5px solid #555;
  }
  .rip h2 {
    margin: 0;
    line-height: 1.1em;

    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .rip-actions {
    display: flex;
    flex-direction: column;
    align-content: stretch;
  }
  .rip-actions button,
  .rip-actions a {
    border-radius: 0;
    outline: none;
    padding: 0.2em 0.5em;
    margin: 0;
    cursor: pointer;
    color: white;
    line-height: 0;
    transition: background-color 0.1s ease-in-out;
  }
  .rip-actions button:first-child {
    border-top-right-radius: 3px;
  }
  .rip-actions a {
    border-bottom-right-radius: 3px;
  }
  .copied {
    background-color: #47bd6c;
  }
  @supports (-webkit-line-clamp: 2) {
    .rip h2 {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: initial;
      display: -webkit-box;
      line-clamp: 2;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }
  .rip .thumb {
    height: 100%;
    aspect-ratio: 16 / 9;
    flex-shrink: 0;
    border-radius: 2px;
    overflow: hidden;
    cursor: pointer;
    position: relative;
    transition:
      width 0.2s ease-in-out,
      border-radius 0.2s ease-in-out;
  }
  .rip .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .rip .thumb .duration {
    position: absolute;
    bottom: 5px;
    right: 5px;
    background-color: rgba(0, 0, 0, 0.8);
    padding: 0 5px;
    border-radius: 3px;
    font-size: 0.8em;
    font-weight: bold;
  }
</style>
