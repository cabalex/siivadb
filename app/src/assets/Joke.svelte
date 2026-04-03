<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import "./Joke.css";
  import { currentRip, player as playerStore, options } from "../stores";

  export let rip;
  export let player = undefined;
  export let searchValue = "";
  export let searchType = "all";
  let elem;

  const dispatch = createEventDispatcher();

  function replaceWikitables(joke: string) {
    const matches = joke.matchAll(
      /{\|[ ]*class[ ]*=[ ]*"?[^"]*[(wikitable)|(article-table)][^"]*"?.+\|}\n*/gms,
    );
    for (const match of matches) {
      const table = match[0]
        .replace(/\n([\|!])/gm, "\nNEWLINE$1")
        .split("\nNEWLINE")
        .slice(1, -1);
      let html = "";
      for (let line of table) {
        line = line.replace(/&lt;br>/gm, "<br />");
        if (line.startsWith("|-")) {
          if (html !== "") {
            html += "</tr>";
          }
          html += "<tr>";
        } else if (line.startsWith("|") && !line.startsWith("|+")) {
          if (line.includes("span")) {
            line = line.replace(/\|\|/gm, "</td><td>");
            line = line.replace(
              /\|[^\|]*?(\w+)[ ]*=[ "]*(\d+)[ "]*[^\|]*\|/gm,
              '|<td $1="$2">',
            );
          } else {
            html += "<td>";
          }
          html += line.slice(1) + "</td>";
        } else if (line.startsWith("!")) {
          // !! can be used to define multiple headers in the same line
          html +=
            "<th>" +
            line.slice(1).trim().replace(/!!/gm, "</th><th>") +
            "</th>";
        }
      }
      joke = joke.replace(match[0], "<table>" + html + "</table>");
    }
    return joke;
  }

  function parse(joke: string) {
    joke = joke
      .replace(/<!--.+?-->/gm, "")
      .replace(/\<[/ ]*?nowiki[ /]*?>/gm, "")
      .replace(/\<br ?\/?>/gm, "\n")
      .replaceAll("<", "&lt;")
      .replaceAll(/\n?&lt;(\/?(?:blockquote|poem))>\n?/gm, "<$1>")
      .replace(/^\*(.+?)$/gm, "<li>$1</li>")
      // surround lis with ul
      .replace(/(<li>.+<\/li>)/gms, "<ul>$1</ul>");
    joke = replaceWikitables(joke);

    // remove nested quotes
    while (joke.match(/""([^"]+?)"([^"]+?)"/gm)) {
      joke = joke.replace(/""([^"]+?)"([^"]+?)"/gm, `"'$1'$2"`);
    }

    return joke
      .replace(/\n\n/gm, "\n")
      .trim()
      .replace(
        /"([^"]+?\|)?([^">]+?)"([^\>])/gm,
        '<span class="link">$2</span>$3',
      )
      .replace(
        /{{Incomplete list.*?}}/gim,
        "<span class='incomplete'>⚠️ Incomplete list</span>",
      )
      .replace(/''([^<]+?)''/gm, '<span class="link">$1</span>')
      .replace(/(\d:\d\d)/gm, '<span class="time">$1</span>');
  }

  let jokeHTML = parse(rip.description);

  $: if (rip.description) parse(rip.description);

  onMount(() => {
    const links = elem.querySelectorAll(".link");

    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.stopPropagation();
        dispatch("link", link.innerText);
        searchValue = link.innerText;
        searchType = "jokes";
      });
    });

    const times = elem.querySelectorAll(".time");

    times.forEach((link) => {
      link.addEventListener("click", (e) => {
        const pl = player ?? $playerStore;
        e.stopPropagation();
        if (player || ($currentRip && pl && $currentRip.ytid === rip.ytid)) {
          pl.seekTo(
            parseInt(link.innerText.split(":")[0]) * 60 +
              parseInt(link.innerText.split(":")[1]),
          );
        } else {
          currentRip.set(rip);

          function seek() {
            if (!$currentRip || $currentRip !== rip) {
              return;
            }
            if (!pl) {
              console.log("no player");
              setTimeout(seek, 100);
              return;
            }
            pl.seekTo(
              parseInt(link.innerText.split(":")[0]) * 60 +
                parseInt(link.innerText.split(":")[1]),
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
  class:nojoke={rip.description ===
    "We don't have this rip in our database... yet. Contribute to the Wiki to add it!" ||
    rip.description === "This rip doesn't have any jokes in it."}
  class:hidden={!$options.showJokes}
>
  <div class="joke-inner">
    <span>
      {@html jokeHTML}
    </span>
  </div>
</div>

<style>
  .joke {
    width: 100%;
    height: 100%;
    box-sizing: border-box;

    display: flex;
    flex-direction: column;
    padding: 0 10px;

    overflow-y: auto;
    flex-shrink: 1;

    background-color: transparent;
    transition: background-color 0.2s ease-in-out;
  }
  .joke.nojoke {
    opacity: 0.7;
    font-style: italic;
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
  :global(.joke .incomplete) {
    font-style: italic;
    display: inline-block;
    margin: 5px 0;
    padding: 5px 10px;
    font-size: 0.9em;
    background-color: rgba(100, 100, 100, 0.5);
    border-radius: 5px;
  }
  :global(.joke table) {
    border-collapse: collapse;
    margin: 10px 0;
  }
  :global(.joke table td, .joke table th) {
    border: 1px solid #555;
    padding: 5px;
  }
  :global(.joke table th) {
    background-color: rgba(100, 100, 100, 0.5);
  }
  :global(.joke ul) {
    white-space: normal;
    margin: 0;
    padding-inline-start: 1.5em;
  }
  :global(.joke blockquote) {
    border-left: 3px solid #555;
    margin: 0;
    margin-top: 10px;
    padding-left: 10px;
    color: #aaa;
  }
</style>
