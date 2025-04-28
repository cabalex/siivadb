<script lang="ts">
  import { onMount } from "svelte";
  import "./Joke.css";
  import { currentRip, player, options } from "../stores";

  export let rip;
  export let searchValue = "";
  export let searchType = "all";
  let elem;

  function parse(joke: string) {
    return joke
      .replace("<", "&lt;")
      .replace(/\n\n/gm, "\n")
      .replace(/\n+$/gm, "")
      .replace(/\"(.+?)\"/gm, '<span class="link">$1</span>')
      .replace(/(\d:\d\d)/gm, '<span class="time">$1</span>');
  }

  let jokeHTML = parse(rip.description);

  $: if (rip.description) parse(rip.description);

  onMount(() => {
    const links = elem.querySelectorAll(".link");

    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.stopPropagation();
        searchValue = link.innerText;
        searchType = "jokes";
      });
    });

    const times = elem.querySelectorAll(".time");

    times.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.stopPropagation();
        if ($currentRip && $player && $currentRip.ytid === rip.ytid) {
          $player.seekTo(
            parseInt(link.innerText.split(":")[0]) * 60 +
              parseInt(link.innerText.split(":")[1])
          );
        } else {
          currentRip.set(rip);

          function seek() {
            if (!$currentRip || $currentRip !== rip) {
              return;
            }
            if (!$player) {
              console.log("no player");
              setTimeout(seek, 100);
              return;
            }
            $player.seekTo(
              parseInt(link.innerText.split(":")[0]) * 60 +
                parseInt(link.innerText.split(":")[1])
            );
          }

          setTimeout(seek, 1000);
        }
      });
    });
  });
</script>

<div
  class="joke"
  bind:this={elem}
  class:active={rip === $currentRip}
  class:hidden={!$options.showJokes}
>
  <div class="joke-inner">
    {@html jokeHTML}
  </div>
</div>

<style>
  .joke {
    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: column;
    padding: 0 10px;

    overflow-y: auto;
    flex-shrink: 1;

    background-color: transparent;
    transition: background-color 0.2s ease-in-out;
  }
  .joke.hidden {
    filter: blur(10px);
  }
  .joke:hover {
    filter: unset;
  }
  .joke.active {
    background-color: rgba(22, 22, 22, 0.7);
  }
  .joke-inner {
    width: 100%;
    max-height: 100%;
    margin: auto;
    white-space: pre-wrap;
  }
</style>
