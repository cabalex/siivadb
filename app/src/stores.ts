import { writable } from "svelte/store";

export const currentRip = writable(null);
export const currentResults = writable([]);
export const player = writable(null);
export const options = writable({
    showJokes: localStorage.getItem("siivadb-showJokes") === "false" ? false : true,
    showComments: localStorage.getItem("siivadb-showComments") === "true" ? true : false
})