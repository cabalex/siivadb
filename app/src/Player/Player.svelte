<script lang="ts">
  import { slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import YouTube from "svelte-youtube";
  import PlaylistAdd from "svelte-material-icons/PlaylistPlus.svelte";
  import Notebook from "svelte-material-icons/Notebook.svelte";
  import OpenInNew from "svelte-material-icons/OpenInNew.svelte";
  import Close from "svelte-material-icons/Close.svelte";
  import { currentRip, player, options, currentResults } from "../stores";
  import PlayerComments from "./PlayerComments.svelte";
  import PlaylistAddModal from "../RipBrowser/PlaylistAddModal/PlaylistAddModal.svelte";
  import { createEventDispatcher } from "svelte";
  import getWikilink from "../assets/getWikilink";
  import ShortPlayer from "../Shorts/ShortPlayer.svelte";
  import YouTubeIcon from "../Shorts/lib/YouTubeIcon.svelte";
  import TowerOutline from "../assets/TowerOutline.svelte";
  import TowerFilled from "../assets/TowerFilled.svelte";

  let error = false;
  let commentsTimeout = null;
  let comments = null;

  const dispatch = createEventDispatcher();

  async function fetchComments() {
    if ($currentRip && $currentRip.duration > 30) {
      let resp = await fetch(
        `https://yt.lemnoslife.com/noKey/commentThreads?part=snippet,replies&videoId=${$currentRip.ytid}&order=relevance`,
      );
      let json = await resp.json();

      if (json.error) {
        console.warn("Couldn't fetch comments: ", json.error);
        return;
      }

      comments = json.items.map((item) => {
        return {
          text: item.snippet.topLevelComment.snippet.textOriginal,
          authorName: item.snippet.topLevelComment.snippet.authorDisplayName,
          authorPfp: item.snippet.topLevelComment.snippet.authorProfileImageUrl,
          likes: item.snippet.topLevelComment.snippet.likeCount,
          replies: item.snippet.totalReplyCount,
          publishedAt: new Date(
            item.snippet.topLevelComment.snippet.publishedAt,
          ),
        };
      });
    }
  }

  function setCommentsTimeout() {
    comments = null;
    if (commentsTimeout) clearTimeout(commentsTimeout);
    if ($options.showComments)
      commentsTimeout = setTimeout(fetchComments, 7500);
  }

  function nextRip() {
    let index = $currentResults.findIndex(
      (rip) => rip.ytid === $currentRip.ytid,
    );
    if (index === -1) return;
    if (index === $currentResults.length - 1) index = 0;
    else index++;
    currentRip.set($currentResults[index]);
  }

  export const skipToTime = (time: number) => {
    if ($player) {
      $player.seekTo(time);
    }
  };

  $: {
    if ($currentRip) {
      error = false;
    } else {
      expandedPercent = 0;
    }
    setCommentsTimeout();
  }

  let playlistAddModalVisible = false;
  let showShortsTooltip =
    localStorage.getItem("siivadb-shortsTooltipShown") !== "true";

  /* Swipe up to show expanded video */
  let startY = null;
  let startExpandedPercent = null;
  let expandedPercent = 0;
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      e.stopPropagation();
      const touch = e.touches[0];
      startY = touch.clientY;
      startExpandedPercent = expandedPercent;
      document.addEventListener("touchmove", onTouchMove);
      document.addEventListener("touchend", onTouchEnd);
    }
  }
  function onTouchMove(e) {
    if (startY === null || startExpandedPercent === null) return;
    if (e.touches.length === 1) {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      expandedPercent = Math.max(
        0,
        startExpandedPercent + (startY - touch.clientY) / window.innerHeight,
      );
    }
  }
  function onTouchEnd(e) {
    document.removeEventListener("touchmove", onTouchMove);
    document.removeEventListener("touchend", onTouchEnd);
    if (startY === null || startExpandedPercent === null) return;

    const SWIPE_THRESHOLD = 0.2;
    // Unfortunately, no way to disable controls after initalization,
    // so the shorts player will have controls in it
    if (
      expandedPercent > SWIPE_THRESHOLD &&
      startExpandedPercent < 1 - SWIPE_THRESHOLD
    ) {
      expandedPercent = 1;
    } else if (
      expandedPercent < 1 - SWIPE_THRESHOLD &&
      startExpandedPercent > SWIPE_THRESHOLD
    ) {
      expandedPercent = 0;
    } else if (
      expandedPercent >= 1 + SWIPE_THRESHOLD &&
      startExpandedPercent >= 1
    ) {
      expandedPercent = 2;
      dispatch("openInShorts", $currentRip);
    } else {
      expandedPercent = startExpandedPercent;
    }

    if (
      showShortsTooltip &&
      expandedPercent >= 1 &&
      window.innerWidth <= 1100
    ) {
      showShortsTooltip = false;
      localStorage.setItem("siivadb-shortsTooltipShown", "true");
    }

    startY = null;
    startExpandedPercent = null;
  }
</script>

<svelte:head>
  <script src="https://www.youtube.com/iframe_api"></script>
</svelte:head>

{#if comments}
  <PlayerComments {comments} />
{/if}

{#if $currentRip}
  <div
    class="player"
    class:no-animate={startExpandedPercent !== null}
    class:over-expanded={expandedPercent > 1}
    style="--expanded: {expandedPercent};"
    transition:slide={{ duration: 200, easing: cubicOut }}
    on:touchstart={onTouchStart}
    on:touchmove={onTouchMove}
    on:touchend={onTouchEnd}
  >
    <button class="close" on:click={() => currentRip.set(null)}>
      <Close />
    </button>
    <a
      on:click={(e) => {
        console.log("captured click event");
        e.preventDefault();
        dispatch("scroll", $currentRip);
      }}
      href={`https://www.youtube.com/watch?v=${$currentRip.ytid}`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <h2>
        {$currentRip.rawname}
      </h2>
    </a>
    <div class="player-actions">
      <button
        class="btn"
        title="Add to playlist"
        on:click={() => (playlistAddModalVisible = true)}
      >
        <PlaylistAdd />
      </button>
      <a
        class="btn"
        rel="noopener noreferrer"
        target="_blank"
        title="View on the wiki"
        href={getWikilink($currentRip.rawname)}
      >
        <Notebook />
      </a>
      <a
        class="btn"
        rel="noopener noreferrer"
        target="_blank"
        title="Watch on YouTube"
        href={"https://www.youtube.com/watch?v=" + $currentRip.ytid}
      >
        <YouTubeIcon />
      </a>
      <button
        class="btn shorts-btn"
        title="Continue browsing in SiIvaShorts"
        on:click={() => {
          dispatch("openInShorts", $currentRip);
          expandedPercent = 2;
        }}
      >
        <TowerFilled />
      </button>
    </div>
    <div class="filler-video" />
    <div
      class="video"
      on:touchstart={(e) => {
        e.stopPropagation();
        onTouchStart(e);
      }}
    >
      {#if error}
        <div class="error">An error occurred while loading the video.</div>
      {/if}
      <YouTube
        options={{
          playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            playsinline: 1,
          },
        }}
        videoId={$currentRip.ytid}
        on:error={(e) => (error = true)}
        on:ready={(e) => player.set(e.detail.target)}
        on:end={(e) => nextRip()}
      />
    </div>
    <div class="shorts-player">
      <ShortPlayer
        rip={$currentRip}
        autoplay={true}
        swiping={expandedPercent < 1}
        externalPlayer={$player}
        on:fetchJokes={(e) => {
          dispatch("search", { value: e.detail, type: "jokes" });
          expandedPercent = 0;
        }}
        on:fetchRips={(e) => {
          dispatch("search", { value: e.detail, type: "titles" });
          expandedPercent = 0;
        }}
        on:next={() => {
          expandedPercent = 2;
          dispatch("openInShorts", $currentRip);
        }}
      />
      <div class="more-shorts">Swipe up to see more</div>
    </div>
    {#if showShortsTooltip}
      <div class="shorts-tooltip">Swipe up to view in Shorts mode</div>
    {/if}
  </div>
  {#if playlistAddModalVisible}
    <PlaylistAddModal
      video={$currentRip}
      on:close={() => (playlistAddModalVisible = false)}
    />
  {/if}
{/if}

<style>
  .player {
    --tenpx: calc(10px * (1 - min(1, var(--expanded))));
    position: fixed;
    left: var(--tenpx);
    z-index: 100;
    height: 75px;
    background-color: #333;
    border-radius: var(--tenpx) var(--tenpx) 0 0;
    box-sizing: border-box;
    width: calc(100% - calc(1 - min(1, var(--expanded))) * 20px);
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);

    display: flex;
    flex-direction: row;
    align-items: center;
    bottom: max(0px, calc(100% * var(--expanded)));
  }
  .shorts-player {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    height: calc(100vh - var(--safe-area-inset-bottom, 0px));
  }
  :global(.player .shorts-player .shorts-video-container) {
    opacity: min(1, var(--expanded));
    width: 100%;
  }
  .shorts-player:after {
    content: "";
    position: absolute;
    background-color: #000;
    top: 0;
    left: 0;
    width: 100%;
    height: 200%;
    pointer-events: none;
  }
  .shorts-player .more-shorts {
    position: absolute;
    top: calc(100% + 30px);
    z-index: 1;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 1.2em;
    pointer-events: none;
    opacity: min(1, calc(2 - var(--expanded)));
  }
  .shorts-tooltip {
    position: absolute;
    bottom: calc(100% + 15px);
    left: 50%;
    z-index: 2;
    transform: translate(-50%, 0);
    background-color: rgb(49, 156, 181);
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
    color: white;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 0.9em;
    white-space: nowrap;
    opacity: min(1, calc(2 - var(--expanded)));

    /* Don't show on desktop screens */
    display: none;
  }
  .shorts-tooltip:after {
    content: "";
    z-index: 100;
    position: absolute;
    bottom: -10px;
    width: 20px;
    height: 10px;
    background-color: rgb(49, 156, 181);
    left: 50%;
    transform: translate(-50%, 0);
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }
  .player:not(.no-animate) {
    transition: bottom 0.2s cubic-bezier(0.55, 0, 0.1, 1);
  }
  .filler-video {
    --collapsed-width: 40vw;
    --collapsed-max-width: 500px;
    --expanded-width: 0px;
    --expanded-max-width: 0px;
    width: calc(
      var(--collapsed-width) + (var(--expanded-width) - var(--collapsed-width)) *
        var(--expanded)
    );
    max-width: calc(
      var(--collapsed-max-width) +
        (var(--expanded-max-width) - var(--collapsed-max-width)) *
        var(--expanded)
    );
  }
  .player .video {
    --collapsed-height: calc(min(500px, 40vw) * (9 / 16));
    --collapsed-bottom: 0px;
    --collapsed-right: 20px;
    --collapsed-width: 40vw;
    --collapsed-max-width: 500px;
    --expanded-height: calc(100vh - 75px);
    --expanded-bottom: calc(-100vh + 75px);
    --expanded-right: 0px;
    --expanded-width: 100vw;
    --expanded-max-width: 100vw;
    position: absolute;
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
    right: calc(
      var(--collapsed-right) + (var(--expanded-right) - var(--collapsed-right)) *
        min(1, var(--expanded))
    );
    bottom: calc(
      (
        var(--collapsed-bottom) +
          (var(--expanded-bottom) - var(--collapsed-bottom)) *
          min(1, var(--expanded)) +
          (
            max(0, var(--expanded) - 1) *
              (100% - var(--safe-area-inset-bottom, 0px))
          )
      )
    );
    height: calc(
      var(--collapsed-height) +
        (var(--expanded-height) - var(--collapsed-height)) *
        min(1, var(--expanded))
    );
    width: calc(
      var(--collapsed-width) + (var(--expanded-width) - var(--collapsed-width)) *
        min(1, var(--expanded))
    );
    max-width: calc(
      var(--collapsed-max-width) +
        (var(--expanded-max-width) - var(--collapsed-max-width)) *
        min(1, var(--expanded))
    );

    border-radius: 10px 10px 0 0;
    z-index: 1;
    overflow: hidden;
  }
  .player:not(.no-animate) .video {
    transition:
      width 0.2s cubic-bezier(0.55, 0, 0.1, 1),
      height 0.2s cubic-bezier(0.55, 0, 0.1, 1),
      bottom 0.2s cubic-bezier(0.55, 0, 0.1, 1),
      right 0.2s cubic-bezier(0.55, 0, 0.1, 1);
  }
  :global(iframe, .video > *) {
    width: 100%;
    height: 100%;
  }
  .player-actions {
    padding: 10px;
    display: flex;
    height: 100%;
    gap: 1px;
    align-items: center;
    justify-content: center;
  }
  .player-actions .btn {
    border-radius: 0px;
    padding: 0 10px;
    height: 100%;
    box-sizing: border-box;
  }
  .player-actions .shorts-btn:hover {
    border-color: rgb(49, 156, 181);
  }
  .player > a {
    flex-grow: 1;
  }
  .player h2 {
    margin: 0;
    padding: 10px;
    font-size: 1.2em;
    line-height: 1.2;
    width: calc(100% - 20px);
    color: white;
    text-align: left;
  }
  .close {
    background-color: #42485b;
    height: 100%;
    border-radius: 10px 0 0 0;
    outline: none;
  }
  .error {
    position: absolute;
    top: 0px;
    left: 0px;
    height: 30px;
    padding: 5px;
    border-radius: 5px;
    z-index: 5;
    background-color: #333;
  }
  .player a.btn {
    color: white;
  }
  .filler-video {
    padding: 0 5px;
    flex-shrink: 0;
  }

  @media screen and (max-width: 900px) {
    .player > a {
      font-size: 0.8em;
    }
    .player-actions {
      padding: 0;
      border-radius: 0 10px 0 0;
      overflow: hidden;
      flex-shrink: 0;
    }
    .player-actions .btn:hover {
      background-color: #42485b;
    }
    .filler-video {
      display: none;
    }
    .close {
      padding: 5px;
    }
    .video {
      --collapsed-bottom: 75px !important;
      --collapsed-right: 5px !important;
      border-radius: 5px 5px 0 0;
    }
  }
  @media screen and (max-width: 1100px) {
    .player {
      bottom: calc(60px + max(0px, calc(calc(100% - 60px) * var(--expanded))));
    }
    .shorts-player {
      height: calc(100vh - 60px - var(--safe-area-inset-bottom, 0px));
    }
    .shorts-tooltip {
      display: block;
    }
    .btn.shorts-btn {
      display: none;
    }
  }
</style>
