<script lang="ts">
  import { onMount } from "svelte";
  let elem;

  export let img: string;

  onMount(() => {
    const ctx = elem.getContext("2d");
    ctx.filter = "blur(5px)";

    const image = new Image();
    image.src = img;
    image.onload = () => {
      let left = 0;
      let top = 0;
      let delta = 0;

      function draw() {
        ctx.drawImage(
          image,
          left,
          top - elem.height / 2,
          elem.width * 2,
          elem.height * 2
        );

        delta += 0.01;
        left = Math.sin(delta) * (elem.width / 8);
        top = Math.sin(delta) * (elem.height / 8);

        requestAnimationFrame(draw);
      }

      draw();
    };
  });
</script>

<canvas bind:this={elem} width={100} height={50} />

<style>
  canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style>
