<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fade, fly } from "svelte/transition";

  /* Touch handling */
  let menuScrollContainer;
  let menuOffset = null;
  let touchStartY = 0;
  let touchCurrentY = 0;
  let isDragging = false;
  function touchStart(e) {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchCurrentY = touchStartY;
      isDragging = true;
    }
    e.stopPropagation();
    menuOffset = menuScrollContainer.scrollTop;
  }
  function touchMove(e) {
    if (isDragging && e.touches.length === 1) {
      touchCurrentY = e.touches[0].clientY;
      const deltaY = touchCurrentY - touchStartY;
      menuScrollContainer.scrollTop = menuOffset - deltaY;
    }
  }
  function touchEnd() {
    if (isDragging) {
      const deltaY = touchCurrentY - touchStartY - menuOffset;
      isDragging = false;
      if (deltaY > 50) {
        // Swipe down to close
        dispatch("close");
        return;
      }
      touchStartY = 0;
      touchCurrentY = 0;
    }
  }

  const dispatch = createEventDispatcher();
</script>

<div
  class="menu-backdrop"
  on:click={() => dispatch("close")}
  transition:fade={{ duration: 100 }}
>
  <div
    class="menu"
    class:dragging={isDragging}
    transition:fly={{ y: 50, duration: 200 }}
    style="bottom: {Math.min(0, -(touchCurrentY - touchStartY - menuOffset))}px"
    on:click={(e) => e.stopPropagation()}
    on:touchstart={touchStart}
    on:touchmove={touchMove}
    on:touchend={touchEnd}
  >
    <div class="menu-list" bind:this={menuScrollContainer}>
      <slot />
    </div>
  </div>
</div>

<style>
  .menu-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    overflow: hidden;
  }
  .menu {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-height: 100%;
    max-width: 600px;
    background-color: #222;
    z-index: 10;
    display: flex;
    flex-direction: column;
    text-align: left;
    box-shadow: 0 -10px 10px rgba(0, 0, 0, 0.5);
  }
  .menu-list {
    max-height: 100%;
    overflow: auto;
  }
  :global(.desktop-expanded .menu) {
    max-width: 600px;
    left: 50% !important;
    transform: translateX(-50%);
    border-radius: 8px 8px 0 0;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.8) !important;
  }
  .menu:not(.dragging) {
    transition: bottom 0.2s ease-out;
  }
  @media screen and (max-width: 1100px) {
    .menu {
      max-height: calc(100% - 16px);
      padding-top: 16px;
      border-radius: 8px 8px 0 0;
    }
    .menu:before {
      content: "";
      position: absolute;
      left: 50%;
      top: 6px;
      transform: translateX(-50%);
      background-color: #aaa;
      width: 25%;
      height: 4px;
      border-radius: 2px;
    }
  }
</style>
