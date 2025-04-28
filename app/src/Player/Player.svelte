<script lang="ts">
  import { slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import YouTube from "svelte-youtube";
  import Text from "svelte-material-icons/Text.svelte";
  import PlaylistAdd from "svelte-material-icons/PlaylistPlus.svelte";
  import OpenInNew from "svelte-material-icons/OpenInNew.svelte";
  import Close from "svelte-material-icons/Close.svelte";
  import { currentRip, player, options, currentResults } from "../stores";
  import PlayerComments from "./PlayerComments.svelte";
  import PlaylistAddModal from "../RipBrowser/PlaylistAddModal/PlaylistAddModal.svelte";

  let error = false;
  let commentsTimeout = null;
  let comments = null;

  async function fetchComments() {
    if ($currentRip && $currentRip.duration > 30) {
      let resp = await fetch(
        `https://yt.lemnoslife.com/noKey/commentThreads?part=snippet,replies&videoId=${$currentRip.ytid}&order=relevance`
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
            item.snippet.topLevelComment.snippet.publishedAt
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
      (rip) => rip.ytid === $currentRip.ytid
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
    if ($currentRip) error = false;
    setCommentsTimeout();
  }

  let playlistAddModalVisible = false;
</script>

<svelte:head>
  <script src="https://www.youtube.com/iframe_api"></script>
</svelte:head>

{#if comments}
  <PlayerComments {comments} />
{/if}

{#if $currentRip}
  <div class="player" transition:slide={{ duration: 200, easing: cubicOut }}>
    <button class="close" on:click={() => currentRip.set(null)}>
      <Close />
    </button>
    <a
      href={`https://www.youtube.com/watch?v=${$currentRip.ytid}`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <h2>
        {$currentRip.rawname}
      </h2>
    </a>
    <div class="player-actions">
      <button on:click={() => (playlistAddModalVisible = true)}>
        <PlaylistAdd />
      </button>
      <a
        class="btn"
        rel="noopener noreferrer"
        target="_blank"
        href={`https://siivagunner.fandom.com/wiki/${encodeURIComponent($currentRip.rawname.replace("#", ""))}`}
      >
        <Text />
        <OpenInNew />
      </a>
    </div>
    <div class="filler-video" />
    <div class="video">
      {#if !error}
        <YouTube
          options={{
            width: window.innerWidth < 900 ? "150" : "500",
            height: window.innerWidth < 900 ? "90" : "280",
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
      {:else}
        <div class="error">
          ⚠ Couldn't load that video. Visiting youtube.com.
        </div>
        <div style="height: 280px; overflow: hidden; background-color: black">
          <iframe
            width={window.innerWidth < 900 ? "150" : "500"}
            height={window.innerWidth < 900 ? "150" : "340"}
            style="transform: translateY(-60px)"
            src={`https://www.youtube.com/watch?v=${$currentRip.ytid}&mode=fullscreen`}
            frameborder="0"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          />
        </div>
      {/if}
    </div>
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
    position: fixed;
    bottom: 0;
    left: 10px;
    z-index: 100;
    height: 75px;
    background-color: #333;
    border-radius: 10px 10px 0 0;
    width: calc(100% - 40px);
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);

    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .player .video {
    position: absolute;
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
    right: 20px;
    bottom: 0;
    width: 500px;
    height: 280px;

    border-radius: 10px 10px 0 0;
    overflow: hidden;
  }
  .player-actions {
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
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
    top: 10px;
    left: 10px;
    padding: 5px;
    border-radius: 5px;
    z-index: 5;
    background-color: #333;
  }
  .player a.btn {
    color: white;
  }
  .filler-video {
    width: 500px;
    flex-shrink: 0;
  }

  @media screen and (max-width: 900px) {
    .player {
      left: 20px;
    }
    .player-actions {
      display: none;
    }
    .filler-video {
      display: none;
    }
    .video {
      width: 150px !important;
      height: 90px !important;
      bottom: 100px !important;
      right: 5px !important;
      border-radius: 5px !important;
    }
  }
</style>
