<script lang="ts">
    import Close from "svelte-material-icons/Close.svelte";
    import ArrowLeft from "svelte-material-icons/ArrowLeft.svelte";
    import VirtualList from "svelte-tiny-virtual-list";
    
    import { currentResults } from "../stores";
    import SiivaBanner from "../assets/SiivaBanner.png";
    import Rip from "./Rip.svelte";

    export let browser;

    let searchValue = "";
    let searchType = "all";

    let start;
    let end;

    let copied = null;

    $: {
        if (searchValue && searchValue.length >= 3) {
            $currentResults = browser.search(searchValue, searchType);
        } else if (window.location.search.includes("list=")) {
            let list = window.location.search.split("list=")[1].split("&")[0];
            browser.fetchPlaylist(list).then((r) => $currentResults = r);
        } else {
            $currentResults = browser.rips;
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
    <span>Showing {start + 1} to {end} of {$currentResults.length} rips {window.location.search.includes("list=") ? "(from YouTube playlist)" : ""}</span>
    {#if searchValue.length > 1}
    <button class="clearSearch" on:click={() => searchValue = ""}>
        <Close />
    </button>
    {/if}
</div>
<div class="search" style={`display: ${window.location.search.includes("list=") ? "flex" : "none"}`}>
    <a href="/siivadb" style="color: white">
        <ArrowLeft height="24px" width="24px" />
    </a>
    YouTube playlist with {$currentResults.length || "[loading...]"} videos.
</div>
{#if $currentResults.length > 0}
<VirtualList
    itemCount={$currentResults.length}
    itemSize={window.innerWidth < 900 ? 220 : 120}
    width="100%"
    height={window.innerHeight - 50}
    scrollToIndex={0}
    on:itemsUpdated={(e) => { start = e.detail.start; end = e.detail.end; }}
>
    <div
        slot="item"
        let:index
        let:style
        {style}
        
    >
        {#key $currentResults[index].ytid}
        <Rip rip={$currentResults[index]} bind:searchType bind:searchValue />
        {/key}
    </div>
    <div slot="footer" class="last">
        You've reached the end of the channel... or have you?
        <img src={SiivaBanner} />
    </div>
</VirtualList>
{:else}
<div class="last" style="height: calc(100vh - 50px); width: 100%">
    You've reached the end of the channel... or have you?
    <img src={SiivaBanner} />
</div>
{/if}
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
</style>