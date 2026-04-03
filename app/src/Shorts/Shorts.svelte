<script lang="ts">
  import RipBrowser from "../RipBrowser/RipBrowser";
  import { likes } from "../stores";
  import ShortPlayer from "./ShortPlayer.svelte";
  import ChevronUp from "svelte-material-icons/ChevronUp.svelte";
  import ChevronDown from "svelte-material-icons/ChevronDown.svelte";
  import ArrowLeft from "svelte-material-icons/ArrowLeft.svelte";
  import nice from "../assets/nice.svg";
  import getShort, { getFeedInfo, scrollPast } from "./ForYou";
  import { fly } from "svelte/transition";
  import PlaylistAddModal from "../RipBrowser/PlaylistAddModal/PlaylistAddModal.svelte";
  import { onMount } from "svelte";

  export let browser: RipBrowser;

  interface StackItem {
    lookahead: Array<RipBrowser["rips"][number] & { reason?: string }>;
    position: number;
    name?: string;
    fetchMore: boolean;
  }

  export let stack: StackItem[] = [];
  onMount(() => {
    if (stack.length === 0) {
      Promise.all([getNextShort(), getNextShort(), getNextShort()]).then(
        ([a, b, c]) => {
          stack = [
            {
              lookahead: [a, b, c],
              position: 0,
              fetchMore: true,
            },
            ...stack,
          ];
        },
      );
    }
  });

  $: current = stack[stack.length - 1] ?? null;

  function getNextShort() {
    return getShort(browser);
  }

  let menuOpen = false;
  let lastScroll = Date.now();
  function next() {
    if (current.fetchMore && current.position >= current.lookahead.length - 2) {
      getNextShort().then((short) => {
        current.lookahead = [...current.lookahead, short];
      });
    }
    if (current.position < current.lookahead.length - 1) {
      if (!$likes.includes(current.lookahead[current.position].ytid)) {
        scrollPast(
          current.lookahead[current.position].ytid,
          Date.now() - lastScroll,
          current.name,
        );
      }
      current.position += 1;
      lastScroll = Date.now();
    }
    // reset scroll position when changed
    [...document.getElementsByClassName("description-container")].forEach(
      (elem) => {
        (elem as HTMLElement).scrollTop = 0;
      },
    );
  }

  function prev() {
    if (current.position > 0) {
      current.position -= 1;
      lastScroll = Date.now();
      // reset scroll position when changed
      [...document.getElementsByClassName("description-container")].forEach(
        (elem) => {
          (elem as HTMLElement).scrollTop = 0;
        },
      );
    }
  }

  let showLikeNotification = false;
  function like() {
    if (!localStorage.getItem("siivadb-shownlikenotification")) {
      localStorage.setItem("siivadb-shownlikenotification", "true");
      showLikeNotification = true;
      setTimeout(() => {
        showLikeNotification = false;
      }, 7500);
    }
  }

  function fetchRips(name: string, type: "series" | "jokes") {
    let rips = [];
    if (type === "series") {
      rips = browser.rips
        .filter((rip) => rip.series === name)
        .toSorted((a, b) => a.name.localeCompare(b.name));
    } else {
      const query = name.toLowerCase();
      rips = browser.rips.filter((rip) =>
        rip.description.toLowerCase().includes(query),
      );
    }
    const exactMatch = rips.find((rip) => rip.name === name);
    if (exactMatch) {
      rips.unshift(exactMatch);
    }
    if (rips.length === 0) return;
    stack = [
      ...stack,
      {
        lookahead: rips,
        name,
        position: 0,
        fetchMore: false,
      },
    ];
  }

  function getRipIndex(offset: number, videoNum: number) {
    if (offset === 0) return videoNum;
    if (offset === current.lookahead.length - 1) {
      const offsets = [
        Math.floor((offset + 1) / 3) * 3,
        Math.floor(offset / 3) * 3 + 1,
        Math.floor((offset - 1) / 3) * 3 + 2,
      ];
      const index = offsets.findIndex((o) => o >= current.lookahead.length);
      if (index !== -1) {
        offsets[index] -= 3;
      }
      return offsets[videoNum];
    }
    if (videoNum === 0) {
      return Math.floor((offset + 1) / 3) * 3;
    } else if (videoNum === 1) {
      return Math.floor(offset / 3) * 3 + 1;
    } else {
      return Math.floor((offset - 1) / 3) * 3 + 2;
    }
  }

  let touchStartY = null;
  let touchDelta = 0;
  function touchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
    e.stopPropagation();
  }

  // Visible: 0 1 2 3 4 5
  // 1st Vid: 0 0 3 3 3 6
  // 2nd Vid: 1 1 1 4 4 4
  // 3rd Vid: 2 2 2 2 5 5

  function touchMove(e: TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (touchStartY === null) return;
    if (current.position === 0 && e.touches[0].clientY > touchStartY) return;
    if (
      current.position === current.lookahead.length - 1 &&
      e.touches[0].clientY < touchStartY
    )
      return;
    touchDelta =
      (e.touches[0].clientY - touchStartY) /
      (e.currentTarget as HTMLElement).clientHeight;
  }

  function touchEnd() {
    touchStartY = null;
    setTimeout(() => {
      if (touchDelta > 0.1) {
        prev();
      } else if (touchDelta < -0.1) {
        next();
      }
      touchDelta = 0;
    }, 0);
  }

  /* Menu options */
  let playlistModalOpen = false;
  let autoplay = false;
  function shuffleCurrent() {
    const position = current.position;
    current.lookahead = [
      ...current.lookahead.slice(0, position + 1),
      ...current.lookahead
        .slice(current.position + 1)
        .map((a) => ({ a, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ a }) => a),
    ];
    menuOpen = false;
    next();
  }
  function resetWatchHistory() {
    if (
      confirm(
        "Are you sure you want to reset your watch history? You'll start seeing repeats in your feed. This cannot be undone.\n\n(This doesn't delete your likes or playlists.)",
      )
    ) {
      localStorage.removeItem("siivadb-seen");
      location.reload();
    }
  }

  /* Stack manipulation events */
  let animation = null;
  function onStackPop() {
    animation = "pop";
    setTimeout(() => {
      animation = null;
    }, 300);
  }

  function onStackPush() {
    animation = "push";
    setTimeout(() => {
      animation = null;
    }, 300);
  }
  let oldStack = stack;
  $: {
    if (oldStack.length >= 1) {
      if (stack.length < oldStack.length) {
        onStackPop();
      } else if (stack.length > oldStack.length) {
        onStackPush();
      }
    }
    oldStack = stack;
  }
</script>

{#if current !== null}
  <main>
    <div
      class="videos-list"
      class:push={animation === "push"}
      class:pop={animation === "pop"}
      on:touchstart={touchStart}
      on:touchmove={touchMove}
      on:touchend={touchEnd}
    >
      {#each new Array(3) as _, i}
        {#if current.lookahead[getRipIndex(current.position, i)]}
          <ShortPlayer
            rip={current.lookahead[getRipIndex(current.position, i)]}
            position={current.position}
            swiping={touchStartY !== null}
            offset={getRipIndex(current.position, i) -
              current.position +
              touchDelta}
            {autoplay}
            on:prev={() => prev()}
            on:next={() => next()}
            on:like={() => like()}
            on:fetchRips={(e) => fetchRips(e.detail, "series")}
            on:fetchJokes={(e) => fetchRips(e.detail, "jokes")}
            on:menu={() => (menuOpen = true)}
          />
        {/if}
      {/each}
      {#if stack.length > 1}
        <div class="playlist-name">
          <button
            class="short-btn back-btn"
            on:click={() => {
              stack = stack.slice(0, -1);
            }}
          >
            <ArrowLeft />
          </button>
          <div class="text">
            {#if current.name}
              <div>watching rips from</div>
              <b>{current.name}</b>
            {/if}
          </div>
        </div>
      {/if}
      {#if showLikeNotification}
        <div
          class="like-notification"
          transition:fly={{ y: -100, duration: 300 }}
        >
          <img src={nice} alt="nice >:]" />
          <div class="text">
            <h3>nice &gt;:]</h3>
            <p>
              Your likes affect what you're recommended next. Keep liking rips
              to improve your feed!
            </p>
          </div>
        </div>
      {/if}
      {#if menuOpen}
        <div class="menu" transition:fly={{ y: 50, duration: 200 }}>
          {#await getFeedInfo() then feedInfo}
            <p>
              <b>Why this rip?</b>
              {current.lookahead[current.position]?.reason ??
                "It's next in the playlist"}
            </p>
            <p>
              Watched {feedInfo.seen}/{browser.rips.length} rips ({(
                ((feedInfo.seen || 0) / browser.rips.length) *
                100
              ).toFixed(2)}%)
            </p>
            <p>
              Interests:{" "}
              {feedInfo.topTerms
                .map((t) => `${t.term} (${Math.round(t.weight)})`)
                .join(", ") || "None"}
            </p>
          {/await}
          <button class="menu-item danger" on:click={resetWatchHistory}>
            Reset watch history
          </button>
          {#if !current.fetchMore}
            <button
              class="menu-item"
              on:click={() => {
                shuffleCurrent();
                menuOpen = false;
              }}
            >
              Shuffle playlist
            </button>
          {/if}
          <button
            class="menu-item"
            on:click={() => {
              playlistModalOpen = true;
            }}
          >
            Add rip to playlist
          </button>
          <button
            class="menu-item"
            on:click={() => {
              autoplay = !autoplay;
              menuOpen = false;
            }}
          >
            Autoplay next rip
            {#if autoplay}
              (on)
            {:else}
              (off)
            {/if}
          </button>
          <button class="menu-item" on:click={() => (menuOpen = false)}>
            Close
          </button>
        </div>
      {/if}
    </div>
    <div class="desktop-actions">
      <button
        class="short-btn"
        on:click={() => prev()}
        disabled={current.position === 0}
      >
        <ChevronUp />
      </button>
      <button
        class="short-btn"
        on:click={() => next()}
        disabled={current.position === current.lookahead.length - 1}
      >
        <ChevronDown />
      </button>
    </div>
  </main>

  {#if playlistModalOpen}
    {@const rip = { ...current.lookahead[current.position], reason: undefined }}
    <PlaylistAddModal
      video={rip}
      on:close={() => (playlistModalOpen = false)}
    />
  {/if}
{:else}
  <div class="loading">
    <h2>Setting up your feed...</h2>
    <div class="progress-bar">
      <div class="progress" style="width: 100%"></div>
    </div>
  </div>
{/if}

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
  main {
    width: 100%;
    max-width: 800px;
    height: 100%;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
  }
  .desktop-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .videos-list {
    position: relative;
    aspect-ratio: 9 / 16;
    height: 100%;
    overflow: hidden;
  }
  .videos-list.push,
  .videos-list.pop {
    background-color: #000;
  }
  :global(.videos-list.push > .shorts-video-container) {
    animation: push 0.1s ease-in-out;
    animation-delay: 0.2s;
    animation-fill-mode: backwards;
  }
  :global(.videos-list.pop > .shorts-video-container) {
    animation: pop 0.1s ease-in-out;
    animation-delay: 0.2s;
    animation-fill-mode: backwards;
  }
  @keyframes push {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  @keyframes pop {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateY(0);
    }
  }
  .short-btn {
    width: 3rem;
    height: 3rem;
    border-radius: 1.5rem;
  }
  .playlist-name {
    position: absolute;
    width: 100%;
    box-sizing: border-box;
    top: 0;
    left: 0;
    padding: 10px;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 10px;
    background: linear-gradient(to bottom, #000 0%, transparent 100%);
  }
  .playlist-name .text {
    width: 100%;
    padding-right: 58px;
    flex-shrink: 1;
    min-width: 0;
  }
  .playlist-name .text div {
    font-size: 0.8em;
  }
  .playlist-name .text b {
    font-size: 1.2em;
    display: block;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .like-notification {
    position: absolute;
    width: calc(100% - 40px);
    left: 10px;
    top: 10px;
    padding: 10px;
    z-index: 11;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
    text-align: left;
    background-color: rgba(100, 100, 100, 0.7);
    border-radius: 10px;
  }
  .like-notification h3,
  .like-notification p {
    margin: 0;
  }
  .menu {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: #222;
    z-index: 10;
    display: flex;
    flex-direction: column;
    text-align: left;
    box-shadow: 0 -10px 10px rgba(0, 0, 0, 0.5);
  }
  .menu p {
    padding: 5px 15px;
    font-size: 0.8em;
    margin: 0;
    color: #aaa;
    font-style: italic;
    background-color: rgba(0, 0, 0, 0.2);
  }
  .menu > p:first-child {
    padding-top: 15px;
  }
  .menu > p:last-of-type {
    padding-bottom: 15px;
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
  .menu-item.danger {
    color: #ff5555;
  }
  .menu-item:focus-visible,
  .menu-item:hover {
    outline: none;
    background-color: rgba(255, 255, 255, 0.2);
  }
  @media screen and (max-width: 700px) {
    .desktop-actions {
      display: none;
    }
    .videos-list {
      width: 100%;
    }
  }
  @media screen and (max-width: 1100px) {
    main {
      height: calc(100% - 60px);
    }
  }
</style>
