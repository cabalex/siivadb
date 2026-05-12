<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { fly } from "svelte/transition";
  import PlaylistAddModal from "../../RipBrowser/PlaylistAddModal/PlaylistAddModal.svelte";
  import { getFeedInfo } from "../ForYou";
  import Modal from "../../assets/Modal.svelte";

  export let current;
  export let browser;
  export let shortsSettings: {
    autoplay: boolean;
    balance: "balanced" | "random" | "top";
  };

  let playlistModalOpen = false;

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

  function setBalance(e) {
    const value = e.target.value;
    if (value === "0") {
      shortsSettings.balance = "random";
    } else if (value === "1") {
      shortsSettings.balance = "balanced";
    } else if (value === "2") {
      shortsSettings.balance = "top";
    }
  }

  /* Touch handling */
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
  }
  function touchMove(e) {
    if (isDragging && e.touches.length === 1) {
      touchCurrentY = e.touches[0].clientY;
    }
  }
  function touchEnd() {
    if (isDragging) {
      const deltaY = touchCurrentY - touchStartY;
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

<Modal on:close={() => dispatch("close")}>
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
  <div class="algorithm-balance">
    <label for="balance">Adjust algorithm balance</label>
    <div class="balance-slider">
      <span>Random</span>
      <input
        type="range"
        min="0"
        max="2"
        step="1"
        value={shortsSettings.balance === "random"
          ? 0
          : shortsSettings.balance === "balanced"
            ? 1
            : 2}
        list="balance-steplist"
        on:input={setBalance}
        on:keydown={(e) => e.stopPropagation()}
        on:touchstart={(e) => e.stopPropagation()}
        on:touchmove={(e) => e.stopPropagation()}
      />
      <datalist id="balance-steplist">
        <option>0</option>
        <option>1</option>
        <option>2</option>
      </datalist>
      <span>Determined</span>
    </div>
    <div class="balance-description">
      {#if shortsSettings.balance === "balanced"}
        Balanced (recommended)
      {:else if shortsSettings.balance === "random"}
        Fully random
      {:else if shortsSettings.balance === "top"}
        Only rips the algorithm thinks you'll like
      {/if}
    </div>
  </div>
  <button class="menu-item danger" on:click={resetWatchHistory}>
    Reset watch history
  </button>
  {#if !current.fetchMore}
    <button
      class="menu-item"
      on:click={() => {
        dispatch("shuffleCurrent");
        dispatch("close");
      }}
    >
      Shuffle playlist
    </button>
  {/if}
  <button class="menu-item" on:click={() => dispatch("viewRipInContext")}>
    View rip in context
  </button>
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
      shortsSettings.autoplay = !shortsSettings.autoplay;
      dispatch("close");
    }}
  >
    Autoplay next rip
    {#if shortsSettings.autoplay}
      (on)
    {:else}
      (off)
    {/if}
  </button>
  <button class="menu-item" on:click={() => dispatch("close")}> Close </button>
</Modal>

{#if playlistModalOpen}
  {@const rip = { ...current.lookahead[current.position], reason: undefined }}
  <PlaylistAddModal
    video={rip}
    on:close={() => {
      playlistModalOpen = false;
    }}
  />
{/if}

<style>
  p {
    padding: 5px 15px;
    font-size: 0.8em;
    margin: 0;
    color: #aaa;
    font-style: italic;
    background-color: rgba(0, 0, 0, 0.2);
  }
  .algorithm-balance {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 5px 15px;
    background-color: rgba(0, 0, 0, 0.3);
  }
  .algorithm-balance label {
    font-size: 0.8em;
    color: #aaa;
  }
  .algorithm-balance .balance-slider {
    display: flex;
    align-items: center;
    font-size: 0.8em;
    gap: 10px;
    width: 100%;
  }
  .algorithm-balance input[type="range"] {
    width: 100%;
  }
  p:first-child {
    padding-top: 15px;
  }
  p:last-of-type {
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
</style>
