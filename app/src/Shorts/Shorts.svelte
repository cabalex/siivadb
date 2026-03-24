<script lang="ts">
  import RipBrowser from "../RipBrowser/RipBrowser";
  import { likes } from "../stores";
  import ShortPlayer from "./ShortPlayer.svelte";
  import ChevronUp from "svelte-material-icons/ChevronUp.svelte";
  import ChevronDown from "svelte-material-icons/ChevronDown.svelte";

  export let browser: RipBrowser;

  let lookahead: RipBrowser["rips"] = [
    getNextShort(),
    getNextShort(),
    getNextShort(),
  ];
  let position = 0;

  function getNextShort() {
    const index = (Math.random() * browser.rips.length) | 0;
    const next = browser.rips[index];
    return next;
  }

  function next() {
    lookahead = [...lookahead, getNextShort()];
    position += 1;
  }

  function prev() {
    if (position > 0) position -= 1;
  }

  function getRipIndex(offset: number, videoNum: number) {
    if (offset === 0) return videoNum;
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
    if (position === 0 && e.touches[0].clientY > touchStartY) return;
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
      <ShortPlayer
        rip={lookahead[getRipIndex(position, i)]}
        {position}
        swiping={touchStartY !== null}
        offset={getRipIndex(position, i) - position + touchDelta}
        on:prev={() => prev()}
        on:next={() => next()}
      />
    {/each}
  </div>
  <div class="desktop-actions">
    <button class="short-btn" on:click={() => prev()} disabled={position === 0}>
      <ChevronUp />
    </button>
    <button class="short-btn" on:click={() => next()}>
      <ChevronDown />
    </button>
  </div>
</main>

<style>
  main {
    width: 100%;
    max-width: 800px;
    height: calc(100% - 52px);
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
  @media screen and (max-width: 700px) {
    .desktop-actions {
      display: none;
    }
  }
</style>
