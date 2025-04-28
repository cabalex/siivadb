import { writable } from "svelte/store";
import RipBrowser from "./RipBrowser/RipBrowser";

export const currentRip = writable(null);
export const currentResults = writable([]);
export const player = writable(null);
export const browser = writable(new RipBrowser(false));
export const options = writable({
  showJokes:
    localStorage.getItem("siivadb-showJokes") === "false" ? false : true,
  showComments:
    localStorage.getItem("siivadb-showComments") === "true" ? true : false,
});

// subscribe triggers once on first run, so lock it until it's initialized
let popping = true;
currentRip.subscribe((rip) => {
  if (popping) return;
  console.log(history.state, history.state?.rip);
  if (rip) {
    history.pushState(
      {
        rip,
      },
      "",
      `?v=${rip.ytid}`
    );
  } else if (history.state && history.state.rip) {
    history.pushState({}, "", "./");
  }
});
popping = false;

window.onpopstate = (event) => {
  popping = true;
  if (event.state) {
    currentRip.set(event.state.rip);
  } else {
    currentRip.set(null);
  }
  popping = false;
};

export interface Playlist {
  name: string;
  createdAt: number;
  videos: string[];
}

export const playlists = writable<Playlist[]>(
  localStorage.getItem("siivadb-playlists")
    ? JSON.parse(localStorage.getItem("siivadb-playlists"))
    : []
);

playlists.subscribe((playlists) => {
  localStorage.setItem("siivadb-playlists", JSON.stringify(playlists));
});
