<script lang="ts">
  import { LottiePlayer } from "@lottiefiles/svelte-lottie-player";
  import { onMount } from "svelte";

  export let src: string;

  let complete = false;
  $: {
    if (src) {
      complete = false;
    }
  }

  let player;
  onMount(() => {
    if (player) {
      player.getLottie()?.addEventListener("complete", () => {
        complete = true;
      });
    }
  });
</script>

<!-- Lottie doesn't show the last frame of the animation, so we need to do this instead -->
<LottiePlayer
  bind:this={player}
  {src}
  width="48"
  height="48"
  autoplay={true}
  style={complete ? "display: none" : ""}
  background="transparent"
  controls={false}
  controlsLayout={[]}
/>
<img
  src="./like.svg"
  alt="Liked"
  width="24"
  height="24"
  style={!complete ? "display: none" : ""}
/>
