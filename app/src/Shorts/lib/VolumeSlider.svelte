<script lang="ts">
  import VolumeOff from "svelte-material-icons/VolumeOff.svelte";
  import VolumeLow from "svelte-material-icons/VolumeLow.svelte";
  import VolumeMedium from "svelte-material-icons/VolumeMedium.svelte";
  import VolumeHigh from "svelte-material-icons/VolumeHigh.svelte";
  import { createEventDispatcher } from "svelte";

  export let volume: number;

  const dispatch = createEventDispatcher();

  function setVolume(newVolume: number) {
    volume = newVolume;
    dispatch("change", { volume });
  }

  let expanded = false;
</script>

<div
  class="volume-slider"
  class:expanded
  on:focus={() => (expanded = true)}
  on:blur={() => (expanded = false)}
  on:mouseover={() => (expanded = true)}
  on:mouseleave={() => (expanded = false)}
  on:touchstart={(e) => e.stopPropagation()}
  on:touchmove={(e) => e.stopPropagation()}
>
  <input
    type="range"
    min="0"
    max="100"
    value={volume}
    on:input={(e) => {
      // @ts-ignore - Svelte's event typing is a bit off here
      setVolume(parseFloat(e.target?.value));
    }}
    on:keydown={(e) => e.stopPropagation()}
  />
  <button on:click={() => setVolume(volume === 0 ? 100 : 0)}>
    {#if volume === 0}
      <VolumeOff />
    {:else if volume <= 33}
      <VolumeLow />
    {:else if volume <= 66}
      <VolumeMedium />
    {:else}
      <VolumeHigh />
    {/if}
  </button>
</div>

<svelte:document on:touchstart={() => (expanded = false)} />

<style>
  .volume-slider {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    width: 48px;
    overflow: hidden;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: 24px;
    transition:
      width 0.2s ease,
      padding 0.2s ease;
  }
  .volume-slider.expanded {
    width: 160px;
    padding-left: 10px;
    background-color: rgba(50, 50, 50, 0.5);
  }

  input[type="range"] {
    width: 100px;
    height: 32px;
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    cursor: pointer;
  }
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    background-color: #fff;
    border-radius: 50%;
    cursor: pointer;
    margin-top: -6px; /* Center the thumb on the track */
  }
  input[type="range"]::-webkit-slider-runnable-track {
    width: 100%;
    height: 4px;
    background-color: #888;
    border-radius: 2px;
  }

  button {
    background-color: transparent;
    padding: 11px;
    border-radius: 50%;
  }
  @media (pointer: coarse) {
    button:hover {
      border-color: transparent;
    }
  }
</style>
