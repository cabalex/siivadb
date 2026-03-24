<script lang="ts">
  import YouTube from "svelte-youtube";
  import RipBrowser from "../RipBrowser/RipBrowser";
  import { createEventDispatcher, onMount } from "svelte";
  import Joke from "../assets/Joke.svelte";
  import { likes, options } from "../stores";
  import ThumbUp from "svelte-material-icons/ThumbUp.svelte";
  import ThumbUpOutline from "svelte-material-icons/ThumbUpOutline.svelte";
  import YouTubeIcon from "./lib/YouTubeIcon.svelte";
  import Share from "svelte-material-icons/Share.svelte";
  import Notebook from "svelte-material-icons/Notebook.svelte";

  export let rip: RipBrowser["rips"][0];
  export let position = 0;
  export let offset = 0;
  export let swiping = false;

  let oldPosition = position;
  let oldOffset = offset;

  let player = null;
  let error: null | number = null;
  let scrollDirection: "up" | "down" | null = null;

  const dispatch = createEventDispatcher();

  function updatePlayerState() {
    if (Math.abs(offset - oldOffset) < 1) return;
    if (Math.abs(offset) < 1) {
      player.seekTo(0);
      player.playVideo();
      player.unMute();
    } else {
      player.mute();
    }
    scrollDirection = position > oldPosition ? "down" : "up";
    oldPosition = position;
    oldOffset = offset;

    setTimeout(() => {
      scrollDirection = null;
    }, 500);
  }

  let progress = 0;
  function updateProgress() {
    requestAnimationFrame(updateProgress);
    if (!player || offset !== 0) return;
    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    progress = duration > 0 ? currentTime / duration : 0;
  }

  onMount(() => {
    const callback = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(callback);
  });

  $: {
    if (player && offset !== oldOffset) {
      updatePlayerState();
    }
  }

  /* Short actions */
  function like() {
    likes.update((l) => {
      if (l.includes(rip.ytid)) {
        return l.filter((id) => id !== rip.ytid);
      } else {
        return [...l, rip.ytid];
      }
    });
  }

  function watchOnYouTube() {
    window.open(`https://www.youtube.com/watch?v=${rip.ytid}`, "_blank");
  }

  function wiki() {
    window.open(
      `https://siivagunner.wiki/wiki/${encodeURIComponent(rip.name + " - " + rip.series)}`,
      "_blank",
    );
  }

  function share() {
    const url = `https://www.youtube.com/watch?v=${rip.ytid}`;
    if (navigator.share) {
      navigator
        .share({
          title: rip.name,
          url,
        })
        .catch((err) => console.error("Error sharing", err));
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  }
</script>

<div
  class="shorts-video-container"
  class:swiping
  class:hidden={scrollDirection === "down" ? offset >= 1 : offset <= -1}
  style="z-index: {Math.abs(offset) < 1 ? 1 : -1}; top: {offset *
    100}%; background-image: url(https://i.ytimg.com/vi/{rip.ytid}/hqdefault.jpg)"
  on:wheel={(e) => {
    if (scrollDirection) return;
    if (e.deltaY < 0) {
      dispatch("prev");
    } else if (e.deltaY > 0) {
      dispatch("next");
    }
  }}
  on:click={() => {
    if (scrollDirection) return;
    if (offset === 0 && player) {
      if (player.getPlayerState() === 1) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    }
  }}
>
  <YouTube
    options={{
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        loop: 1,
      },
    }}
    videoId={rip.ytid}
    on:error={(e) => {
      console.log("Player errored with code", e.detail.data);
      error = e.detail.data;
    }}
    on:play={() => {
      if (Math.abs(offset) >= 1) player.mute();
    }}
    on:end={() => {
      if (Math.abs(offset) < 1) player.seekTo(0);
    }}
    on:ready={(e) => {
      player = e.detail.target;
      error = null;
      player.setLoop(true);
      if (Math.abs(offset) >= 1) player.mute();
    }}
  />
  {#if error}
    <div class="error">⚠ Couldn't load that video (error {error}). Sorry!</div>
  {/if}
  <div class="short-actions" on:click={(e) => e.stopPropagation()}>
    <button id="{rip.ytid}-like" on:click={like}>
      {#if $likes.includes(rip.ytid)}
        <ThumbUp />
      {:else}
        <ThumbUpOutline />
      {/if}
    </button>
    <label for="{rip.ytid}-like">
      {$likes.includes(rip.ytid) ? "Liked" : "Like"}
    </label>

    <button id="{rip.ytid}-yt" on:click={watchOnYouTube}>
      <YouTubeIcon />
    </button>
    <label for="{rip.ytid}-yt"> Watch </label>

    <button id="{rip.ytid}-wiki" on:click={wiki}>
      <Notebook />
    </button>
    <label for="{rip.ytid}-wiki"> Wiki </label>

    <button id="{rip.ytid}-share" on:click={share}>
      <Share />
    </button>
    <label for="{rip.ytid}-share"> Share </label>
  </div>
  <header>
    {#if rip.series}
      <h3>
        <img
          src="https://i.ytimg.com/vi/{rip.ytid}/default.jpg"
          alt="{rip.series} thumbnail"
        />
        {rip.series}
      </h3>
    {/if}
    <h2>{rip.name}</h2>
    {#if $options.showJokes}
      {#key rip.ytid}
        <div
          class="description-container"
          on:touchstart={(e) => {
            const target = e.currentTarget;
            if (
              target.clientHeight !== target.scrollHeight &&
              target.clientHeight + target.scrollTop !== target.scrollHeight
            ) {
              e.stopPropagation();
            }
          }}
          on:touchmove={(e) => {
            const target = e.currentTarget;
            if (
              target.clientHeight !== target.scrollHeight &&
              target.clientHeight + target.scrollTop !== target.scrollHeight
            ) {
              e.stopPropagation();
            }
          }}
          on:wheel={(e) => e.stopPropagation()}
          on:click={(e) => e.stopPropagation()}
        >
          <Joke {player} {rip} />
        </div>
      {/key}
    {/if}
  </header>
  <div class="progress-bar">
    <div
      class="progress"
      style="width: {Math.abs(offset) < 1 ? progress * 100 : 0}%"
    ></div>
  </div>
</div>

<style>
  .shorts-video-container {
    position: absolute;
    transition: top 0.2s cubic-bezier(0.075, 0.82, 0.165, 1);
    background-color: #000;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
  }
  .shorts-video-container.swiping {
    transition: none;
  }
  /* Hide the loop over so it's not visible */
  .shorts-video-container.hidden {
    opacity: 0;
  }
  header {
    text-align: left;
    position: absolute;
    height: fit-content;
    bottom: 0;
    padding-right: 4rem;
    padding-bottom: 10px;
    width: calc(100% - 4rem);
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
    color: white;
  }
  header h3 {
    margin: 0;
    font-weight: normal;
    font-size: unset;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 10px;
    line-height: 1.25;
  }
  header h3 img {
    width: 1.8rem;
    border-radius: 100px;
    height: 1.8rem;
    object-fit: cover;
  }
  header h2 {
    margin: 0;
    padding: 0 10px;
    line-height: 1.25;
  }
  .description-container {
    max-height: 15vh;
    margin: 5px 0 0 0;
    font-size: 0.9em;
    color: #ccc;
    overflow: auto;
  }
  .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 16px;
  }
  .progress {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    background: linear-gradient(to right, #319cb5 0%, #2fa09b 100%);
  }
  :global(.shorts-video-container iframe) {
    pointer-events: none;
  }
  :global(
      .shorts-video-container,
      .shorts-video-container > div:has(iframe),
      .shorts-video-container iframe
    ) {
    height: 100%;
    max-width: 100%;
    aspect-ratio: 9 / 16;
  }
  .short-actions {
    position: absolute;
    right: 0;
    bottom: 16px;
    display: flex;
    flex-direction: column;
    width: 3rem;
    margin: 0 0.5rem;
    z-index: 1;
    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.6));
  }
  .short-actions button {
    width: 3rem;
    height: 3rem;
    border: 1px solid transparent;
    border-radius: 1.5rem;
    background-color: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    cursor: pointer;
    outline: none;
    transition:
      background-color 0.2s ease-in-out,
      border-color 0.2s ease-in-out;
  }
  .short-actions button:hover {
    background-color: rgba(50, 50, 50, 0.8);
  }
  .short-actions button:focus-visible {
    border-color: #2fa09b;
  }
  .short-actions label {
    color: white;
    font-size: 0.8em;
    line-height: 1;
    text-align: center;
    margin-bottom: 0.5rem;
  }
  @media screen and (max-width: 700px) {
    :global(
        .shorts-video-container,
        .shorts-video-container > div:has(iframe),
        .shorts-video-container iframe
      ) {
      aspect-ratio: unset;
      width: 100%;
    }
  }
</style>
