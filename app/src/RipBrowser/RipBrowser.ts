import { ZSTDDecoder } from "zstddec";
import type { Playlist } from "../stores";

interface Rip {
  name: string;
  series: string;
  rawname: string;
  ytid: string;
  description: string;
  duration: number;
  postTime: number;
}

function dateOffset(time: number) {
  return time + new Date("2016-01-01T00:00:00Z").getTime();
}

// https://stackoverflow.com/questions/47285198/fetch-api-download-progress-indicator/72903731#72903731
async function* streamToAsyncIterable(stream) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export default class RipBrowser {
  rips: Rip[] = [];
  ripMap: Map<string, Rip> = new Map();
  textDecoder = new TextDecoder("utf-8");
  playlists: { [key: string]: string[] } = {};
  createdAt: number;

  constructor(fetch = true) {
    if (fetch) this.load();
  }

  private readStringUint8(view: DataView, offset: number) {
    let length = view.getUint8(offset);
    return this.textDecoder.decode(
      view.buffer.slice(offset + 1, offset + 1 + length),
    );
  }

  private readStringUint16(view: DataView, offset: number) {
    let length = view.getUint16(offset, true);
    return this.textDecoder.decode(
      view.buffer.slice(offset + 2, offset + 2 + length),
    );
  }

  private toString(arrayBuffer: ArrayBuffer) {
    return this.textDecoder.decode(arrayBuffer);
  }

  get(ytid: string) {
    return this.ripMap.get(ytid);
  }

  async fetchPlaylist(playlistId: string) {
    if (this.playlists[playlistId]) {
      return this.playlists[playlistId]
        .map((ytid: string) => ripMap.get(ytid))
        .filter((rip: Rip) => rip !== undefined);
    }

    let resp = await fetch(
      `https://yt.lemnoslife.com/noKey/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}`,
    );

    let json = await resp.json();

    this.playlists[playlistId] = json.items.map(
      (item: any) => item.snippet.resourceId.videoId,
    );

    while (json.nextPageToken) {
      let resp = await fetch(
        `https://yt.lemnoslife.com/noKey/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${json.nextPageToken}`,
      );

      json = await resp.json();

      this.playlists[playlistId] = this.playlists[playlistId].concat(
        json.items.map((item: any) => item.snippet.resourceId.videoId),
      );
    }

    let ripMap = new Map<string, Rip>();
    for (let i = 0; i < this.rips.length; i++) {
      if (this.playlists[playlistId].includes(this.rips[i].ytid)) {
        ripMap.set(this.rips[i].ytid, this.rips[i]);
      }
    }

    return this.playlists[playlistId]
      .map((ytid: string) => ripMap.get(ytid))
      .filter((rip: Rip) => rip !== undefined);
  }

  playlist(playlist: Playlist) {
    const results: Rip[] = [];
    for (let ytid of playlist.videos) {
      const rip = this.get(ytid);
      if (rip) {
        results.push(rip);
      }
    }
    return results;
  }

  search(
    query: string,
    searchType: "all" | "jokes" | "titles",
    sort: "newest" | "oldest" | "alphabetical" = "newest",
    playlist: Playlist | null = null,
  ) {
    let results: Rip[] = [];
    let ctx = this.rips;
    if (playlist) {
      ctx = this.playlist(playlist);
      console.log(ctx);
    }

    if (query.length === 11) {
      // check for youtube id
      for (let rip of ctx) {
        if (rip.ytid === query) {
          return [rip];
        }
      }
    } else if (query.startsWith("https://")) {
      // check for youtube url
      let url = new URL(query);
      if (
        url.hostname === "www.youtube.com" ||
        url.hostname === "youtube.com"
      ) {
        let id = url.searchParams.get("v");
        if (id) {
          for (let rip of ctx) {
            if (rip.ytid === id) {
              return [rip];
            }
          }
        }
      } else if (url.hostname === "youtu.be") {
        let id = url.pathname.slice(1);
        if (id) {
          for (let rip of ctx) {
            if (rip.ytid === id) {
              return [rip];
            }
          }
        }
      }
    }

    if (searchType === "jokes") {
      for (let rip of ctx) {
        if (rip.description.toLowerCase().includes(query.toLowerCase())) {
          results.push(rip);
        }
      }
    } else if (searchType === "titles") {
      for (let rip of ctx) {
        if (rip.rawname.toLowerCase().includes(query.toLowerCase())) {
          results.push(rip);
        }
      }
    } else {
      for (let rip of ctx) {
        if (
          rip.rawname.toLowerCase().includes(query.toLowerCase()) ||
          rip.description.toLowerCase().includes(query.toLowerCase())
        ) {
          results.push(rip);
        }
      }
    }

    // sort by series
    switch (sort) {
      case "newest":
        results = results.sort((a, b) => b.postTime - a.postTime);
      case "oldest":
        results = results.sort((a, b) => a.postTime - b.postTime);
      case "alphabetical":
        results = results.sort((a, b) => a.rawname.localeCompare(b.rawname));
    }

    // remove duplicates
    results = results.filter((rip, index, self) => {
      return index === self.findIndex((r) => r.ytid === rip.ytid);
    });

    return results.sort((a, b) => (a.series || "").localeCompare(b.series));
  }

  async fetchWithProgress(
    progress: (progress: number) => void,
    loadWithCache = true,
  ) {
    const res = await fetch("./db/db.siivadb.zst", {
      method: "GET",
      cache: loadWithCache ? "default" : "no-cache",
    });
    let responseSize = 0; // `responseSize` is response-size! Not necessarily download-size ('content-length')! See the above link.
    const chunks = [];

    for await (const chunk of streamToAsyncIterable(res.body)) {
      responseSize += chunk.length;
      progress(
        responseSize / (parseInt(res.headers.get("Content-Length")) || 1),
      );
      chunks.push(chunk);
    }

    const bytes = new Uint8Array(responseSize);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset); // `chunk` is a `Uint8Array`
      offset += chunk.length;
    }
    return bytes.buffer;
  }

  async load(
    progress: (progress: number) => void = () => {},
    loadWithCache = true,
  ) {
    let arrayBuffer = await this.fetchWithProgress(progress, loadWithCache);

    let decoder = new ZSTDDecoder();
    await decoder.init();
    arrayBuffer = decoder.decode(new Uint8Array(arrayBuffer)).buffer;

    let view = new DataView(arrayBuffer);

    if (view.getUint32(0, true) !== 1447643475) {
      throw new Error("Invalid database file (missing SIIV header)");
    }
    let ripCount = view.getUint32(8, true);
    this.createdAt = dateOffset(view.getUint32(12, true) * 1000);
    if (
      (new Date().getTime() - this.createdAt) / 1000 / 60 / 60 >= 24 &&
      loadWithCache
    ) {
      // if the database is older than 24 hours, try to fetch new database without cache
      return await this.load(progress, false);
    }

    let uploadDateTableOffset = view.getUint32(16, true);
    let durationTableOffset = view.getUint32(20, true);
    let nameTableOffset = view.getUint32(24, true);
    let descriptionTableOffset = view.getUint32(28, true);

    let pos = 32;
    for (let i = 0; i < ripCount; i++) {
      let ytid = this.toString(arrayBuffer.slice(pos, pos + 11));

      let nameOffset = view.getUint32(pos + 11, true);
      let rawname = this.readStringUint8(view, nameTableOffset + nameOffset);

      let descriptionOffset = view.getUint32(pos + 15, true);
      let description =
        this.readStringUint16(
          view,
          descriptionTableOffset + descriptionOffset,
        ) ||
        "We don't have this rip in our database... yet. Contribute to the Wiki to add it!";

      let duration = view.getUint16(durationTableOffset + i * 2, true);
      let postTime = dateOffset(
        view.getUint32(uploadDateTableOffset + i * 4, true) * 1000,
      );

      // These series have name and series swapped, for some reason.
      // not nice >:[ guess I'll just hardcode them for now
      // (detecting " Music - " has many false positives)
      const SWAPPED_SERIES = [
        "Bros. Music",
        "Outer Mario Bros. Music",
        "All Night Nippon Super Mario Bros. Music",
        "Mario Bros. Music",
        "Super Bros. Music",
        "Super Goomba Bros. Music",
        "Super Mario Bros. Remastered Music",
        "Super Mario Bros. Music",
        "Super Mario All-Stars Music",
        "Super Mario All Stars",
        "Mario's Tennis Music",
        "Kamikaze Vol. 3: Luigi Ghost House Story Music",
        "Donkey Kong Music",
        "Donkey Kong Jr. Music",
        "Donkey Kong Jr. Math Music",
        "Donkey Kong Land 2 Music",
        "Donkey Kong Classics Music",
        "Tennis Music",
        "Gyromite Music",
        "Excitebike Music",
        "Stack-Up Music",
        "Mach Rider Music",
        "Fix-It Felix Jr. Music",
        "Hogan's Alley Music",
        "Duck Hunt Music",
        "Joe's Duck Hunt Music",
        "Ice Climber Music",
        "Nintendo DSi Music",
        "Nintendo DSi Metronome Music",
        "Nintendo 3DS Music",
        "Nintendo 3DS eShop Music",
        "Face Raiders Music",
        "AR Games Music",
        "Nintendo Wii U Music",
        "Zelda: Skyward Sword Music",
        "Insaniquarium! Deluxe Music",
      ];

      let name, series;
      if (SWAPPED_SERIES.some((s) => rawname.startsWith(s + " - "))) {
        // swap name and series
        name = rawname.split(" - ");
        series = name.shift();
      } else {
        name = rawname.split(" - ");
        series = "";
        if (name.length > 1) {
          series = name.pop();
        }
      }

      if (
        rawname.startsWith("Super") &&
        rawname.includes("Stars") &&
        !rawname.includes(" - ")
      ) {
        // fix series for Super Mario All Stars, which has very inconsistent naming
        const regex =
          /^(Super(?: .{5}|Mariofell|)(?: .D|) All[- ]Stars(?: \+ Super Mario World|))(?: Music|) ([^-].+?)$/gm;
        const match = regex.exec(rawname);
        if (match) {
          series = match[1];
          name = [match[2]];
        }
      }

      this.rips.push({
        rawname,
        name: name.join(" - "),
        series,
        ytid,
        description,
        duration,
        postTime,
      });

      pos += 19;
    }

    // create rip map
    for (let rip of this.rips) {
      this.ripMap.set(rip.ytid, rip);
    }
  }
}
