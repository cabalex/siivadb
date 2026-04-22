<script lang="ts">
  import RipBrowser from "../RipBrowser/RipBrowser";
  import { likes } from "../stores";
  import ShortPlayer from "./ShortPlayer.svelte";
  import ChevronUp from "svelte-material-icons/ChevronUp.svelte";
  import ChevronDown from "svelte-material-icons/ChevronDown.svelte";
  import ArrowLeft from "svelte-material-icons/ArrowLeft.svelte";
  import ArrowExpand from "svelte-material-icons/ArrowExpand.svelte";
  import ArrowCollapse from "svelte-material-icons/ArrowCollapse.svelte";
  import nice from "../assets/nice.svg";
  import getShort, { addSeen, scrollPast } from "./ForYou";
  import { fly } from "svelte/transition";
  import { onMount } from "svelte";
  import ShortsMenu from "./lib/ShortsMenu.svelte";
  import VolumeSlider from "./lib/VolumeSlider.svelte";

  export let browser: RipBrowser;
  export let shortsSettings: {
    autoplay: boolean;
    balance: "balanced" | "random" | "top";
    volume: number;
  };

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
    return getShort(browser, shortsSettings.balance);
  }

  let desktopExpanded = false;
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
    const exactMatch = browser.rips.find((rip) => rip.rawname === name);
    if (exactMatch) {
      rips = [
        exactMatch,
        ...rips.filter((rip) => rip.ytid !== exactMatch.ytid),
      ];
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
  let touchFrame: { y: number; time: number } | null = null;
  let touchSpeed = 0;
  function touchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY;
    touchFrame = { y: touchStartY, time: Date.now() };
    (document.activeElement as HTMLElement)?.blur();
  }

  // Visible: 0 1 2 3 4 5
  // 1st Vid: 0 0 3 3 3 6
  // 2nd Vid: 1 1 1 4 4 4
  // 3rd Vid: 2 2 2 2 5 5

  function touchMove(e: TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (touchStartY === null || !touchFrame) return;
    if (current.position === 0 && e.touches[0].clientY > touchStartY) return;
    if (
      current.position === current.lookahead.length - 1 &&
      e.touches[0].clientY < touchStartY
    ) {
      touchSpeed = 0;
      return;
    }
    touchDelta =
      (e.touches[0].clientY - touchStartY) /
      (e.currentTarget as HTMLElement).clientHeight;

    const deltaY = e.touches[0].clientY - touchFrame.y;
    const deltaTime = Date.now() - touchFrame.time;
    touchSpeed = deltaY / deltaTime;
    touchFrame = { y: e.touches[0].clientY, time: Date.now() };
  }

  function touchEnd() {
    touchStartY = null;
    touchFrame = null;
    setTimeout(() => {
      if (touchSpeed > 0.4) {
        prev();
      } else if (touchSpeed < -0.4) {
        next();
      }
      touchDelta = 0;
      touchSpeed = 0;
    }, 0);
  }

  /* Menu options */
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
  function viewRipInContext() {
    const rip = current.lookahead[current.position];
    const index = browser.rips.findIndex((r) => r.ytid === rip.ytid);
    if (index !== -1) {
      stack = [
        ...stack,
        {
          lookahead: browser.rips,
          position: index,
          name: "Search Results",
          fetchMore: false,
        },
      ];
    }
    menuOpen = false;
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

  $: {
    if (current && current.lookahead[current.position]?.ytid) {
      addSeen(current.lookahead[current.position]?.ytid);
    }
  }
</script>

{#if current !== null}
  <main>
    <div
      class="videos-list"
      class:desktop-expanded={desktopExpanded}
      class:push={animation === "push"}
      class:pop={animation === "pop"}
      on:touchstart={touchStart}
      on:touchmove={touchMove}
      on:touchend={touchEnd}
    >
      {#each new Array(3) as _, i}
        {#if current.lookahead[getRipIndex(current.position, i)]}
          <ShortPlayer
            headerOffset={stack.length > 1 ? 68 : 10}
            rip={current.lookahead[getRipIndex(current.position, i)]}
            position={current.position}
            swiping={touchStartY !== null}
            offset={getRipIndex(current.position, i) -
              current.position +
              touchDelta}
            autoplay={shortsSettings.autoplay}
            volume={shortsSettings.volume}
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
            <!-- Only show text if added from a playlist -->
            {#if current.name && !current.lookahead[current.position]?.reason}
              <div>watching rips from</div>
              <b>{current.name}</b>
            {/if}
          </div>
          <VolumeSlider bind:volume={shortsSettings.volume} />
        </div>
      {:else}
        <div class="volume-position">
          <VolumeSlider bind:volume={shortsSettings.volume} />
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
        <ShortsMenu
          {current}
          {browser}
          bind:shortsSettings
          on:close={() => (menuOpen = false)}
          on:shuffleCurrent={shuffleCurrent}
          on:viewRipInContext={viewRipInContext}
        />
      {/if}
    </div>
    <div class="desktop-actions">
      <button
        class="short-btn"
        title="Previous video"
        on:click={() => prev()}
        disabled={current.position === 0}
      >
        <ChevronUp />
      </button>
      <button
        class="short-btn"
        title={desktopExpanded
          ? "Collapse to default size"
          : "Expand to full width"}
        on:click={() => (desktopExpanded = !desktopExpanded)}
      >
        {#if desktopExpanded}
          <ArrowCollapse />
        {:else}
          <ArrowExpand />
        {/if}
      </button>
      <button
        class="short-btn"
        title="Next video"
        on:click={() => next()}
        disabled={current.position === current.lookahead.length - 1}
      >
        <ChevronDown />
      </button>
    </div>
  </main>
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
    max-width: calc(100vh * (9 / 16) + 100px);
    height: 100%;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-around;
    transition: max-width 0.3s ease-in-out;
  }
  main:has(.desktop-expanded) {
    max-width: unset;
    justify-content: center;
  }
  :global(#app > .content:has(.desktop-expanded) > main) {
    max-width: unset;
  }
  :global(#app > .content:has(.desktop-expanded) aside:last-child) {
    display: none;
  }
  .desktop-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    min-width: 96px;
  }
  .videos-list {
    position: relative;
    aspect-ratio: 9 / 16;
    height: 100%;
    overflow: hidden;
  }
  .videos-list.desktop-expanded {
    width: 100%;
    aspect-ratio: unset;
  }
  :global(
      .desktop-expanded .shorts-video-container,
      .desktop-expanded .shorts-video-container > div:has(iframe),
      .desktop-expanded .shorts-video-container iframe
    ) {
    width: 100%;
    aspect-ratio: unset;
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
  .volume-position {
    position: absolute;
    box-sizing: border-box;
    top: 0;
    right: 0;
    z-index: 10;
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
  @media screen and (max-width: 700px) {
    main {
      max-width: unset;
    }
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
