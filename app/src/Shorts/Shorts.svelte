<script lang="ts">
  import RipBrowser from "../RipBrowser/RipBrowser";
  import { likes } from "../stores";
  import ShortPlayer from "./ShortPlayer.svelte";
  import ChevronUp from "svelte-material-icons/ChevronUp.svelte";
  import ChevronDown from "svelte-material-icons/ChevronDown.svelte";
  import ArrowLeft from "svelte-material-icons/ArrowLeft.svelte";

  export let browser: RipBrowser;

  interface StackItem {
    lookahead: RipBrowser["rips"];
    position: number;
    fetchMore: boolean;
  }

  export let stack: StackItem[] = [
    {
      lookahead: [getNextShort(), getNextShort(), getNextShort()],
      position: 0,
      fetchMore: true,
    },
  ];
  $: {
    if (stack.length === 0) {
      stack = [
        {
          lookahead: [getNextShort(), getNextShort(), getNextShort()],
          position: 0,
          fetchMore: true,
        },
      ];
    }
  }

  $: current = stack[stack.length - 1];

  function getNextShort() {
    const index = (Math.random() * browser.rips.length) | 0;
    const next = browser.rips[index];
    return next;
  }

  function next() {
    if (current.fetchMore) {
      current.lookahead = [...current.lookahead, getNextShort()];
    }
    if (current.position < current.lookahead.length - 1) {
      current.position += 1;
    }
  }

  function prev() {
    if (current.position > 0) current.position -= 1;
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
    if (rips.length === 0) return;
    stack = [
      ...stack,
      {
        lookahead: rips,
        position: 0,
        fetchMore: false,
      },
    ];
  }

  function getRipIndex(offset: number, videoNum: number) {
    if (offset === 0) return videoNum;
    if (offset === current.lookahead.length - 1) {
      return current.lookahead.length - 3 + videoNum;
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

  // Visible: 0 1 2 3 4 5
  // 1st Vid: 0 0 3 3 3 6
  // 2nd Vid: 1 1 1 4 4 4
  // 3rd Vid: 2 2 2 2 5 5
</script>

<main>
  <div
    class="videos-list"
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
          on:prev={() => prev()}
          on:next={() => next()}
          on:fetchRips={(e) => fetchRips(e.detail, "series")}
          on:fetchJokes={(e) => fetchRips(e.detail, "jokes")}
        />
      {/if}
    {/each}
    {#if stack.length > 1}
      <button
        class="short-btn back-btn"
        on:click={() => {
          stack = stack.slice(0, -1);
        }}
      >
        <ArrowLeft />
      </button>
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

<style>
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
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .short-btn {
    width: 3rem;
    height: 3rem;
    border-radius: 1.5rem;
  }
  .back-btn {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 10;
  }
  @media screen and (max-width: 700px) {
    .desktop-actions {
      display: none;
    }
  }
  @media screen and (max-width: 1100px) {
    main {
      height: calc(100% - 60px);
    }
  }
</style>
