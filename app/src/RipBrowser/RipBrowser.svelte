<script lang="ts">
    import Close from "svelte-material-icons/Close.svelte";
    import PlaylistPlus from "svelte-material-icons/PlaylistPlus.svelte";
    import ContentCopy from "svelte-material-icons/ContentCopy.svelte";
    import OpenInNew from "svelte-material-icons/OpenInNew.svelte";
    import VirtualList from "./VirtualList.svelte";
    import DateView from "../assets/DateView.svelte";
    import Joke from "../assets/Joke.svelte";
    import { currentRip } from "../stores";
    import ImgCanvas from "../assets/ImgCanvas.svelte";
    import SiivaBanner from "../assets/SiivaBanner.png";

    export let browser;

    let searchValue = "";
    let searchType = "all";
    let results;

    let start;
    let end;

    let copied = null;

    function toggleItem(rip: any) {
        currentRip.set($currentRip === rip ? null : rip);
    }

    function formatDuration(time: number) {
        let hours = Math.floor(time / 3600);
        let minutes = Math.floor((time - (hours * 3600)) / 60);
        let seconds = time - (hours * 3600) - (minutes * 60);

        let hoursString = hours > 0 ? hours + ":" : "";
        let minutesString = (minutes < 10 ? "0" + minutes : minutes) + ":";
        let secondsString = seconds < 10 ? "0" + seconds : seconds;

        return hoursString + minutesString + secondsString;
    }

    function copyLink(id: string) {
        navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${id}`);

        copied = id;
        setTimeout(() => {
            copied = null;
        }, 1000);

    }

    $: {
        if (searchValue && searchValue.length >= 3) {
            results = browser.search(searchValue, searchType);
        } else if (window.location.search.includes("list=")) {
            let list = window.location.search.split("list=")[1].split("&")[0];
            browser.fetchPlaylist(list).then((r) => results = r);
        } else {
            results = null;
        }
    }

</script>

<main>
<div class="search" style={`display: ${window.location.search.includes("list=") ? "none" : "flex"}`}>
    <select bind:value={searchType}>
        <option value="all">All</option>
        <option value="titles">Titles</option>
        <option value="jokes">Jokes</option>
    </select>
    <input
        type="text"
        placeholder="Search thousands of high quality rips..."
        bind:value={searchValue}
    />
    <span>Showing {start + 1} to {end} of {(results || browser.rips).length} rips {window.location.search.includes("list=") ? "(from YouTube playlist)" : ""}</span>
    {#if searchValue.length > 1}
    <button class="clearSearch" on:click={() => searchValue = ""}>
        <Close />
    </button>
    {/if}
</div>
<div class="search" style={`display: ${window.location.search.includes("list=") ? "flex" : "none"}`}>
    You're currently viewing a YouTube playlist with {results?.length || "[loading...]"} videos. <a href="/siivadb">Click here</a> to go back.
</div>
<VirtualList items={results || browser.rips} height={"calc(100vh - 50px)"} let:item bind:start={start} bind:end={end}>
    {#key item.ytid}
    <div
        on:click={toggleItem.bind(null, item)}
        class="rip"
        class:active={item === $currentRip}
    >
        {#if item === $currentRip}
        <ImgCanvas img={`https://img.youtube.com/vi/${item.ytid}/sddefault.jpg`} />
        {/if}
        <div class="rip-inner">
            <div class="thumb">
                <img src={`https://img.youtube.com/vi/${item.ytid}/maxresdefault.jpg`} />
                <span class="duration">{formatDuration(item.duration)}</span>
            </div>
            <div class="title">
                <h2>{item.name}</h2>
                <span
                    class="series"
                    on:click={(e) => {e.stopPropagation(); searchType = "titles"; searchValue = item.series || ""}}
                >
                    {item.series || ""}
                </span> - 
                <DateView date={item.postTime} />
            </div>
            <Joke bind:searchValue={searchValue} bind:searchType={searchType} rip={item} />
            <div class="rip-actions" on:click={(e) => e.stopPropagation()}>
                <button disabled style="color: #777">
                    <PlaylistPlus />
                </button>
                <button class:copied={copied === item.ytid} on:click={copyLink.bind(null, item.ytid)}>
                    <ContentCopy />
                </button>
                <a target="_blank" rel="noopener noreferrer" href={`https://siivagunner.fandom.com/wiki/${encodeURIComponent(item.rawname.replace("#", ""))}`} class="btn">
                    <OpenInNew />
                </a>
            </div>
        </div>
    </div>
    {#if item === (results ? results[results.length - 1] : browser.rips[browser.rips.length - 1])}
    <div class="last">
        You've reached the end of the channel... or have you?
        <img src={SiivaBanner} />
    </div>
    {/if}
    {/key}
</VirtualList>
</main>

<style>
    main {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .search {
        width: calc(100% - 40px);
        max-width: 1280px;
        height: 1.5em;
        padding: 10px;
        border-radius: 3px;
        display: flex;
        flex-direction: row;
        gap: 10px;
        background-color: #555;
        margin: 0 auto;
        transform: translateX(-10px);
    }
    .search .clearSearch {
        background-color: transparent;
        border: none;
        outline: none;
        padding: 0;
        padding-left: 10px;
    }
    .search select {
        font-size: 1em;
        height: 100%;
        outline: none;
        border: none;
        border-radius: 2px;
    }
    .search input {
        border: 0;
        flex-shrink: 1;
        width: 100%;
        background-color: transparent;
        outline: none;
        font-size: 1em;
    }
    .search span {
        flex-grow: 1;
        text-align: right;
        white-space: nowrap;
    }
    .rip {
        position: relative;
        width: calc(100% - 20px);
        height: 110px;
        border-radius: 3px;
        background-color: #444;

        display: flex;
        align-items: center;
        justify-content: center;

        overflow: hidden;

        margin: 0 auto;
        margin-bottom: 10px;
        max-width: 1280px;
        transition: height 0.2s ease-in-out;
    }
    .last {
        margin: 0 auto;
        position: relative;
        padding-top: 10px;
        padding-bottom: 50vh;
    }
    .last img {
        width: 100%;
        min-height: 200px;
        object-fit: cover;
        padding-top: 20vh;
        position: absolute;
        bottom: 0;
        left: 0;
        z-index: -1;
    }
    .rip.active {
        background-image: var(--thumb);
        background-size: cover;
        background-position: center;
        animation: active 5s infinite linear;
    }
    @keyframes active {
        0% {
            background-position-x: 0;
        }
        25% {
            background-position-x: 50px;
            background-position-y: 40%;
        }
        75% {
            background-position-x: -50px;
            background-position-y: 60%;
        }
        100% {
            background-position-x: 0;
        }
    }
    .rip.active .blur {
        position: absolute;
        width: 100%;
        height: 100%;
        backdrop-filter: blur(100px);
        transform: translateZ(0);
        backface-visibility: hidden;
        perspective: 1000;
    }
    .rip-inner {
        background-color: rgba(0, 0, 0, 0.5);
        text-align: left;
        height: 100px;
        width: calc(100% - 10px);
        position: relative;
        border-radius: 3px;
        overflow: hidden;
        z-index: 2;

        display: flex;
        flex-direction: row;
        align-items: center;
        transition: height 0.2s ease-in-out;
    }
    .rip .title {
        margin: 1em;
        color: white;
        min-width: min(50%, 500px);
        max-width: 50%;
        height: calc(100% - 2em);
        flex-shrink: 2;
    }
    .rip .series {
        transition: background-color 0.1s ease-in-out, outline 0.1s ease-in-out;
        outline-color: #555;
        cursor: pointer;
        user-select: none;
    }
    .rip .series:hover {
        background-color: #555;
        border-radius: 2px;
        outline: 5px solid #555;
    }
    .rip h2 {
        margin: 0;
        line-height: 1.1em;

        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
    }
    .rip-actions {
        display: flex;
        flex-direction: column;
        align-content: stretch;
    }
    .rip-actions button, .rip-actions a {
        border-radius: 0;
        outline: none;
        padding: 0.2em 0.5em;
        margin: 0;
        cursor: pointer;
        color: white;
        line-height: 0;
        transition: background-color 0.1s ease-in-out;
    }
    .rip-actions button:first-child {
        border-top-right-radius: 3px;
    }
    .rip-actions a {
        border-bottom-right-radius: 3px;
    }
    .copied {
        background-color: #47bd6c;
    }
    @supports (-webkit-line-clamp: 2) {
        .rip h2 {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: initial;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }
    }
    .rip .thumb {
        width: 160px;
        height: 100%;
        flex-shrink: 0;
        border-radius: 2px;
        overflow: hidden;
        cursor: pointer;
        position: relative;
        transition: width 0.2s ease-in-out, border-radius 0.2s ease-in-out;
    }
    .rip .thumb img, .rip .thumb iframe {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .rip .thumb .duration {
        position: absolute;
        bottom: 5px;
        right: 5px;
        background-color: rgba(0, 0, 0, 0.8);
        padding: 0 5px;
        border-radius: 3px;
        font-size: 0.8em;
        font-weight: bold;
    }
</style>