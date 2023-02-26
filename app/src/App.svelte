<script lang="ts">
    import Player from "./Player/Player.svelte";
    import BrowserObject from "./RipBrowser/RipBrowser";
    import RipBrowser from "./RipBrowser/RipBrowser.svelte"
    import { options } from "./stores";

    let browser = new BrowserObject(false);
    let loaded = false;

    browser.load().then(() => {
        loaded = true;
    })

    function toggleSetting(setting: string) {
        options.update(o => {
            localStorage.setItem("siivadb-" + setting, o[setting].toString());
            return o;
        })
    }
</script>

<header>
    <a class="logo" href="https://cabalex.github.io">cabalex.github.io</a>
    <h1>SiIvaDB</h1>
    {#if loaded}
    <div class="updated">Updated {new Date(browser.createdAt).toLocaleString()}</div>
    {/if}
    <div style="flex-grow: 1" />
    <div>
        <label for="show-jokes">Show jokes</label>
        <input type="checkbox" bind:checked={$options.showJokes} id="show-jokes" on:change={() => toggleSetting("showJokes")} />
        <label for="show-comments">Show comments</label>
        <input type="checkbox" bind:checked={$options.showComments} id="show-comments" on:change={() => toggleSetting("showComments")} />
    </div>
</header>
<main>
    {#if loaded}
    <RipBrowser browser={browser} />
    {:else}
    <h2>Loading...</h2>
    {/if}
</main>
<Player />

<style>
    header {
        height: 30px;
        background-color: #222;

        display: flex;
        align-items: center;
        padding: 10px;
        padding-left: 0;
        gap: 10px;
    }
    header .logo {
        font-weight: bold;
        background-color: #4d7bcb;
        color: white;
        height: 100%;
        padding: 10px;
        text-decoration: none;
        line-height: 30px;
        transition: background-color 0.1s ease-in-out;
    }
    header .logo:hover {
        background-color: #82AAFF;
    }
    header h1 {
        margin: 0;
        font-size: 2em;
        line-height: 30px;
    }
    main {
        height: calc(100% - 50px);
        overflow: hidden;
    }
</style>