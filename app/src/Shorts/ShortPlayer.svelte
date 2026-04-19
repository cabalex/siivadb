<script lang="ts">
  import YouTube from "svelte-youtube";
  import RipBrowser from "../RipBrowser/RipBrowser";
  import { createEventDispatcher, onMount } from "svelte";
  import Joke from "../assets/Joke.svelte";
  import { likes, options } from "../stores";
  import ThumbUpOutline from "svelte-material-icons/ThumbUpOutline.svelte";
  import YouTubeIcon from "./lib/YouTubeIcon.svelte";
  import Pause from "svelte-material-icons/Pause.svelte";
  import Share from "svelte-material-icons/Share.svelte";
  import Notebook from "svelte-material-icons/Notebook.svelte";
  import DotsVertical from "svelte-material-icons/DotsVertical.svelte";
  import DateView from "../assets/DateView.svelte";
  import getWikilink from "../assets/getWikilink";
  import { addLike, removeLike } from "./ForYou";
  import LikeIcon from "./lib/LikeIcon.svelte";

  export let rip: RipBrowser["rips"][0];
  export let position = 0;
  export let offset = 0;
  export let swiping = false;
  export let autoplay = false;
  export let externalPlayer = null;
  export let headerOffset = 10;

  $: {
    if (externalPlayer) {
      player = externalPlayer;
    }
  }

  let oldPosition = position;
  let oldOffset = offset;
  let oldRip = rip;

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
    descriptionExpanded = false;

    setTimeout(() => {
      scrollDirection = null;
    }, 500);
  }

  let progress = 0;
  let adPlaying = false;
  function updateProgress() {
    requestAnimationFrame(updateProgress);
    if (!player || offset !== 0 || !player.playerInfo?.progressState) return;

    const currentTime = player.getCurrentTime();
    const duration = player.getDuration();
    // When an ad is playing, the progressState properties will differ from
    // the actual video duration
    const progressDuration = player.playerInfo.progressState.duration;
    adPlaying = progressDuration !== duration;
    if (adPlaying) {
      progress = progressDuration > 0 ? currentTime / progressDuration : 0;
    } else {
      progress = duration > 0 ? currentTime / duration : 0;
    }
    paused = player.getPlayerState() === 2;
  }

  onMount(() => {
    const callback = requestAnimationFrame(updateProgress);
    setTimeout(() => {
      descriptionExpandable = isDescriptionExpandable();
    });
    return () => cancelAnimationFrame(callback);
  });

  $: {
    if (player && offset !== oldOffset) {
      updatePlayerState();
    }
  }

  /* Short actions */
  function like() {
    let addingLike = true;
    likes.update((l) => {
      if (l.includes(rip.ytid)) {
        addingLike = false;
        return l.filter((id) => id !== rip.ytid);
      } else {
        return [...l, rip.ytid];
      }
    });
    if (addingLike) {
      dispatch("like", rip.ytid);
      addLike(rip.ytid);
    } else {
      removeLike(rip.ytid);
    }
  }

  function watchOnYouTube() {
    if (player) player.pauseVideo();
    window.open(
      `https://www.youtube.com/watch?v=${rip.ytid}&t=${Math.floor(player.getCurrentTime())}`,
      "_blank",
    );
  }

  function wiki() {
    window.open(getWikilink(rip.rawname), "_blank");
  }

  function share() {
    const url = `https://www.youtube.com/watch?v=${rip.ytid}`;
    if (navigator.share) {
      navigator
        .share({
          title: rip.rawname,
          url,
        })
        .catch((err) => console.error("Error sharing", err));
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  }

  /* Seeking */
  let progressBarElem;
  let overrideProgress: null | number = null;
  function seekStart(e: MouseEvent | TouchEvent) {
    if (!player || player.getDuration() === 0) return;
    e.preventDefault();
    e.stopPropagation();
    overrideProgress = progress;
    document.addEventListener("mousemove", seekMove);
    document.addEventListener("touchmove", seekMove);
    document.addEventListener("mouseup", seekEnd);
    document.addEventListener("touchend", seekEnd);
    seekMove(e);
  }

  function seekMove(e: MouseEvent | TouchEvent) {
    if (overrideProgress === null) return;
    e.stopPropagation();
    let clientX;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    const rect = progressBarElem.getBoundingClientRect();
    overrideProgress = Math.min(
      Math.max(0, (clientX - rect.left) / rect.width),
      1,
    );
  }

  function seekEnd(e: MouseEvent | TouchEvent) {
    if (overrideProgress === null) return;
    player.seekTo(player.getDuration() * overrideProgress);
    setTimeout(() => (overrideProgress = null), 0);
    document.removeEventListener("mousemove", seekMove);
    document.removeEventListener("touchmove", seekMove);
    document.removeEventListener("mouseup", seekEnd);
    document.removeEventListener("touchend", seekEnd);
  }

  function formatTime(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
  }

  let paused = false;
  let descriptionExpanded = false;
  let expandedDescriptionHeight = 0;
  let descriptionExpandable = false;
  let descriptionElem;

  $: {
    if (rip !== oldRip) {
      error = null;
      descriptionExpanded = false;
      setTimeout(() => {
        descriptionExpandable = isDescriptionExpandable();
      }, 0);
    }
    oldRip = rip;
  }

  const isDescriptionExpandable = () => {
    if (!descriptionElem) return false;
    if (descriptionExpanded) return true;

    const jokeInner = descriptionElem.querySelector(".joke-inner");
    if (!jokeInner) return false;
    return (
      jokeInner.scrollHeight > jokeInner.clientHeight ||
      descriptionElem.scrollHeight > descriptionElem.clientHeight
    );
  };

  function toggleDescription(e: MouseEvent) {
    if (!$options.showJokes || !isDescriptionExpandable()) {
      descriptionExpanded = false;
      return;
    }
    e.stopPropagation();
    descriptionExpanded = !descriptionExpanded;
    if (!descriptionExpanded) {
      descriptionElem.scrollTop = 0;
    } else {
      expandedDescriptionHeight =
        descriptionElem.children[0]?.children[0]?.children[0]?.getBoundingClientRect()
          .height ?? 0;
    }
  }

  function getLikeAnimation() {
    const text = rip.rawname.toLowerCase() + rip.description.toLowerCase();
    const include = (strs: string[]) => strs.some((s) => text.includes(s));
    if (
      include([
        "porter robinson",
        "goodbye to a world",
        "shutdown",
        "reboot",
        "siiva a.i.",
      ])
    ) {
      return "./like-GTAW.json";
    }
    if (include(["deltarune", "undertale", "toby fox", "sans"])) {
      return "./like-undertale.json";
    }
    if (include(["grand dad", "flintstones", "granddad"])) {
      return "./like-granddad.json";
    }

    return "./like.json";
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (Math.abs(offset) >= 1 || swiping) return;
    if (e.key === "ArrowUp") {
      setTimeout(() => dispatch("prev"), 0);
    } else if (e.key === "ArrowDown") {
      setTimeout(() => dispatch("next"), 0);
    } else if (e.key === "ArrowLeft") {
      if (player) {
        player.seekTo(Math.max(0, player.getCurrentTime() - 5));
      }
    } else if (e.key === "ArrowRight") {
      if (player) {
        player.seekTo(
          Math.min(player.getDuration(), player.getCurrentTime() + 5),
        );
      }
    } else if (e.key === "Enter" || e.key === " " || e.key === "k") {
      if (player) {
        if (player.getPlayerState() === 1) {
          player.pauseVideo();
        } else {
          player.playVideo();
        }
      }
    } else if (e.key === "l") {
      like();
    } else if (e.key === "s") {
      share();
    } else if (e.key === "w") {
      watchOnYouTube();
    } else if (!isNaN(parseInt(e.key))) {
      const num = parseInt(e.key);
      if (num === 0) {
        player.seekTo(player.getDuration());
      } else {
        player.seekTo((player.getDuration() * num) / 10);
      }
    }
  }
</script>

<div
  class="shorts-video-container"
  class:swiping
  class:adPlaying
  inert={Math.abs(offset) >= 1}
  aria-hidden={Math.abs(offset) >= 1}
  class:external-player={externalPlayer}
  class:hidden={scrollDirection === "down" ? offset >= 1 : offset <= -1}
  style="z-index: {Math.abs(offset) < 1 ? 1 : -1}; top: {offset *
    100}%; {!externalPlayer
    ? `background-image: url(https://i.ytimg.com/vi/${rip.ytid}/hqdefault.jpg); `
    : ''} --description-height: {expandedDescriptionHeight}px"
  on:wheel={(e) => {
    if (scrollDirection) return;
    if (e.deltaY < 0) {
      dispatch("prev");
    } else if (e.deltaY > 0) {
      dispatch("next");
    }
  }}
  on:click={() => {
    if (scrollDirection || overrideProgress !== null) return;
    if (offset === 0 && player) {
      if (player.getPlayerState() === 1) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    }
  }}
>
  {#if !externalPlayer}
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
        if (e.detail.data === 2) {
          // YouTube usually shows this when it's loading,
          // so don't display it in the UI
          return;
        }
        error = e.detail.data;
      }}
      on:play={() => {
        error = null;
        if (Math.abs(offset) >= 1) player.mute();
      }}
      on:end={() => {
        if (Math.abs(offset) < 1) {
          if (autoplay) {
            dispatch("next");
          } else {
            player.seekTo(0);
          }
        }
      }}
      on:ready={(e) => {
        player = e.detail.target;
        error = null;
        player.setLoop(true);
        if (Math.abs(offset) >= 1) player.mute();
      }}
      on:stateChange={(e) => {
        paused = e.detail.data === 2;
      }}
    />
  {/if}
  <div class="header-toasts" style="top: {Math.max(10, headerOffset)}px">
    {#if error}
      <div class="error">
        ⚠ Couldn't load that video (error {error}). Sorry!
      </div>
    {/if}
    {#if adPlaying}
      <div class="error" style="text-align: left;">
        This ad is placed here by YouTube, and not by the SiIvaGunner team.
        Watch through it to uncover the rip inside!
      </div>
    {/if}
  </div>
  {#if adPlaying}
    <div class="ad-actions">
      <button class="prev-ad" on:click={() => dispatch("prev")}> Back </button>
      <button class="next-ad" on:click={() => dispatch("next")}>
        No thanks, skip rip
      </button>
    </div>
  {/if}

  {#if paused && !adPlaying}
    <div class="paused-overlay">
      <Pause />
    </div>
  {/if}

  <div class="short-actions" on:click={(e) => e.stopPropagation()}>
    <button
      id="{rip.ytid}-like"
      on:click={like}
      aria-hidden={Math.abs(offset) >= 1}
    >
      {#if $likes.includes(rip.ytid)}
        <div class="like-animation">
          <LikeIcon src={getLikeAnimation()} />
        </div>
      {:else}
        <ThumbUpOutline />
      {/if}
    </button>
    <label for="{rip.ytid}-like" aria-hidden={Math.abs(offset) >= 1}>
      {$likes.includes(rip.ytid) ? "Liked" : "Like"}
    </label>

    <button
      id="{rip.ytid}-yt"
      on:click={watchOnYouTube}
      aria-hidden={Math.abs(offset) >= 1}
    >
      <YouTubeIcon />
    </button>
    <label for="{rip.ytid}-yt"> Watch </label>

    <button
      id="{rip.ytid}-wiki"
      on:click={wiki}
      aria-hidden={Math.abs(offset) >= 1}
    >
      <Notebook />
    </button>
    <label for="{rip.ytid}-wiki"> Wiki </label>

    <button
      id="{rip.ytid}-share"
      on:click={share}
      aria-hidden={Math.abs(offset) >= 1}
    >
      <Share />
    </button>
    <label for="{rip.ytid}-share"> Share </label>
    <button
      on:click={() => dispatch("menu")}
      style={externalPlayer ? "opacity: 0; pointer-events: none" : ""}
      aria-hidden={Math.abs(offset) >= 1 || externalPlayer}
    >
      <DotsVertical />
    </button>
  </div>
  <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
  <header
    class:expanded={descriptionExpanded}
    class:expandable={descriptionExpandable}
    on:click={(e) => {
      toggleDescription(e);
    }}
    on:keydown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        toggleDescription(e);
      }
    }}
    role={Math.abs(offset) >= 1 ? "none" : "button"}
    tabindex={Math.abs(offset) >= 1 ? undefined : 0}
    aria-expanded={descriptionExpanded}
  >
    {#if rip.series}
      <button
        class="series"
        on:click={(e) => {
          e.stopPropagation();
          dispatch("fetchRips", rip.series);
        }}
      >
        <img
          src="https://i.ytimg.com/vi/{rip.ytid}/default.jpg"
          alt="{rip.series} thumbnail"
        />
        <div class="text">
          <span class="series-name">
            {rip.series}
          </span>
          <span>•</span>
          <DateView date={rip.postTime} />
        </div>
      </button>
    {:else}
      <h3 class="series"><DateView date={rip.postTime} /></h3>
    {/if}
    <h2>{rip.name}</h2>
    {#if $options.showJokes}
      {#key rip.ytid}
        <div
          class="description-container"
          bind:this={descriptionElem}
          on:touchstart={(e) => {
            const target = e.currentTarget;
            if (target.clientHeight !== target.scrollHeight) {
              e.stopPropagation();
            }
          }}
          on:touchmove={(e) => {
            const target = e.currentTarget;
            if (target.clientHeight !== target.scrollHeight) {
              e.stopPropagation();
            }
          }}
          on:wheel={(e) => e.stopPropagation()}
        >
          <Joke
            {player}
            {rip}
            on:link={(e) => dispatch("fetchJokes", e.detail)}
          />
        </div>
      {/key}
    {/if}
  </header>
  <div
    class="progress-bar"
    class:seeking={overrideProgress !== null}
    class:disabled={adPlaying || !player}
    bind:this={progressBarElem}
    on:mousedown={seekStart}
    on:touchstart={seekStart}
    on:mousemove={seekMove}
    on:touchmove={seekMove}
    on:mouseup={seekEnd}
    on:touchend={seekEnd}
    on:click={(e) => e.stopPropagation()}
  >
    <div
      class="progress"
      style="width: {Math.abs(offset) < 1
        ? (overrideProgress ?? progress) * 100
        : 0}%"
    ></div>
    {#if overrideProgress !== null}
      <div class="fromTime">
        {formatTime(player?.getDuration() * overrideProgress)}
      </div>
      <div class="toTime">
        {formatTime(player?.getDuration() ?? 0)}
      </div>
    {/if}
    {#if !adPlaying || overrideProgress !== null}
      <div
        class="handle"
        style="left: {Math.abs(offset) < 1
          ? (overrideProgress ?? progress) * 100
          : 0}%"
      />
    {/if}
  </div>
</div>

<svelte:document on:keydown={handleKeyDown} />

<style>
  .shorts-video-container {
    position: absolute;
    transition: top 0.2s cubic-bezier(0.075, 0.82, 0.165, 1);
    background-color: #000;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
  }
  .shorts-video-container.external-player {
    background-color: transparent !important;
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
    width: 100%;
    box-sizing: border-box;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(0, 0, 0, 0.8) 50%,
      #111 51%
    );
    background-size: 100% 200%;
    background-repeat: no-repeat;
    color: white;
    -webkit-tap-highlight-color: transparent;
    transition:
      opacity 0.2s ease-in-out,
      background-position 0.2s ease-in-out;
  }
  header:not(:has(.description-container)) {
    padding-bottom: 1rem;
  }
  header .series {
    background-color: transparent;
    border: none;
    padding: 0;
    margin: 0;
    text-align: left;
    font-weight: normal;
    font-size: unset;
    gap: 10px;
    padding: 0 10px;
    line-height: 1.25;
  }
  header .series:hover .series-name {
    text-decoration: underline;
  }
  header .series:not(:focus-visible) {
    outline: none;
  }
  :global(.shorts-video-container header .series .text span:not(.series-name)) {
    color: #aaa;
  }
  header .series img {
    width: 3rem;
    border-radius: 0.4rem;
    height: 1.5rem;
    object-fit: cover;
  }
  header h2 {
    margin: 0;
    padding: 0 10px;
    line-height: 1.25;
  }
  header .description-container {
    max-height: 15vh;
    margin: 5px 0 0 0;
    font-size: 0.9em;
    color: #ccc;
    overflow: auto;
    transition: background-color 0.2s ease-in-out;
    overflow: hidden;
    border-radius: 0 0.5rem 0 0;
  }
  header.expandable .description-container {
    pointer-events: none;
  }
  :global(header .description-container .joke) {
    padding-bottom: 1rem;
  }
  :global(header:not(.expanded) .description-container .joke-inner) {
    display: -webkit-box;
    line-clamp: 5;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
    color: #319cb5;
    font-weight: bolder;
  }
  :global(header:not(.expanded) .description-container .joke-inner > span) {
    color: #ccc;
    font-weight: normal;
  }
  header.expandable {
    cursor: pointer;
  }
  .shorts-video-container:has(header.expanded) .short-actions {
    opacity: 0 !important;
    pointer-events: none;
  }
  .shorts-video-container:has(header.expanded) {
    background-image: unset !important;
  }
  :global(.shorts-video-container > div:has(iframe)) {
    max-height: 100dvh;
  }
  :global(.shorts-video-container:has(header.expanded) > div:has(iframe)) {
    transition: max-height 0.2s ease-out;
    aspect-ratio: unset;
    max-height: max(
      30vh,
      calc(100dvh - 120px - var(--description-height, 0px))
    );
  }
  header.expanded {
    background-position-y: 100%;
    padding-top: 1rem;
    padding-right: 0;
    z-index: 11;
  }
  header.expanded .description-container {
    pointer-events: all;
    overflow: auto;
    max-height: calc(70vh - 120px);
    transition:
      max-height 0.2s ease-in-out,
      background-color 0.2s ease-in-out;
  }
  .progress-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 16px;
    z-index: 12;
    cursor: pointer;
  }
  .progress-bar.disabled {
    pointer-events: none;
  }
  .progress {
    position: absolute;
    left: 0;
    bottom: 0;
    height: 3px;
    background: linear-gradient(to right, #319cb5 0%, #2fa09b 100%);
    transition: height 0.1s ease-in-out;
  }
  .handle {
    position: absolute;
    top: 16px;
    left: 0;
    width: 0px;
    height: 0px;
    background-color: white;
    border-radius: 50%;
    transform: translateX(-50%);
    transition:
      width 0.1s ease-in-out,
      height 0.1s ease-in-out,
      top 0.1s ease-in-out;
  }
  .fromTime,
  .toTime {
    position: absolute;
    top: -1.5em;
    left: 0.5em;
    font-weight: bold;
    font-size: 1.5em;
  }
  .toTime {
    left: auto;
    right: 0.5em;
  }
  .progress-bar:hover .progress,
  .progress-bar.seeking .progress {
    bottom: 5px;
    height: 6px;
  }
  .progress-bar:hover .handle,
  .progress-bar.seeking .handle {
    width: 20px;
    height: 20px;
    top: -2px;
  }
  .shorts-video-container:has(.progress-bar.seeking) header,
  .shorts-video-container:has(.progress-bar.seeking) .short-actions {
    opacity: 0.2;
  }
  .header-toasts {
    position: absolute;
    left: 10px;
    top: 10px;
    width: calc(100% - 20px);
  }
  .error {
    box-sizing: border-box;
    width: 100%;
    padding: 5px;
    border-radius: 5px;
    z-index: 5;
    background-color: rgba(255, 0, 0, 0.8);
    color: white;
  }
  .ad-actions {
    font-size: 0.9em;
    position: absolute;
    border-radius: 1rem;
    bottom: 40px;
    left: 10px;
    display: flex;
    gap: 1px;
    padding: 1px;
    border-radius: 100px;
    overflow: hidden;
    background-color: rgba(50, 50, 50, 0.8);
  }
  .ad-actions button {
    padding: 10px 20px;
    background-color: rgba(0, 0, 0, 0.8);
  }
  .prev-ad {
    border-radius: 100px 0 0 100px;
    padding-right: 15px !important;
  }
  .next-ad {
    padding-left: 15px !important;
    border-radius: 0 100px 100px 0;
  }
  :global(.shorts-video-container:not(.adPlaying) iframe) {
    pointer-events: none;
  }
  .shorts-video-container.external-player.adPlaying {
    pointer-events: none;
  }
  .shorts-video-container.external-player.adPlaying * {
    pointer-events: all;
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
  .paused-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    color: white;
    background-color: rgba(0, 0, 0, 0.9);
    line-height: 0;
    padding: 0.25em;
    border-radius: 100rem;
    font-size: 3em;
    opacity: 0.8;
    animation: popIn 0.1s ease-out;
  }
  @keyframes popIn {
    0% {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 0;
    }
    70% {
      transform: translate(-50%, -50%) scale(1.2);
      opacity: 0.8;
    }
    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.8;
    }
  }
  .short-actions {
    position: absolute;
    right: 0;
    bottom: 16px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    width: 3rem;
    margin: 0 0.5rem;
    z-index: 1;
    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.6));
    transition: opacity 0.2s ease-in-out;
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
  .like-animation {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    position: relative;
  }
  :global(.like-animation > div) {
    position: absolute !important;
    bottom: 0;
    right: 0;
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
  /* Hide stuff when ads play */
  .adPlaying .progress {
    background: #ffc001;
  }
  .adPlaying .error {
    background-color: #ffc001;
    color: black;
  }
  .adPlaying .short-actions,
  .adPlaying header {
    display: none;
  }
</style>
