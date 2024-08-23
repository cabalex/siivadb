import { ZSTDDecoder } from 'zstddec';

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
    return time + 1451635200_000;
    return time + (new Date(2016, 0, 1).getTime())
}

export default class RipBrowser {
    rips: Rip[] = [];
    textDecoder = new TextDecoder("utf-8");
    playlists: { [key: string]: string[] } = {};
    createdAt: number;
    
    constructor(fetch=true) {
        if (fetch) this.load()
    }

    private readStringUint8(view: DataView, offset: number) {
        let length = view.getUint8(offset);
        return this.textDecoder.decode(view.buffer.slice(offset + 1, offset + 1 + length));
    }

    private readStringUint16(view: DataView, offset: number) {
        let length = view.getUint16(offset, true);
        return this.textDecoder.decode(view.buffer.slice(offset + 2, offset + 2 + length));
    }

    private toString(arrayBuffer: ArrayBuffer) {
        return this.textDecoder.decode(arrayBuffer);
    }

    async fetchPlaylist(playlistId: string) {
        if (this.playlists[playlistId]) {
            return this.playlists[playlistId].map((ytid: string) => ripMap.get(ytid)).filter((rip: Rip) => rip !== undefined);
        }

        let resp = await fetch(`https://yt.lemnoslife.com/playlistItems?part=snippet&playlistId=${playlistId}`)

        let json = await resp.json();

        let ytids = json.items.map((item: any) => item.snippet.resourceId.videoId);

        while (json.nextPageToken) {
            let resp = await fetch(`https://yt.lemnoslife.com/playlistItems?part=snippet&playlistId=${playlistId}&pageToken=${json.nextPageToken}`)

            json = await resp.json();

            ytids = ytids.concat(json.items.map((item: any) => item.snippet.resourceId.videoId));
        }

        this.playlists[playlistId] = ytids;

        let ripMap = new Map<string, Rip>();
        for (let i = 0; i < this.rips.length; i++) {
            if (ytids.includes(this.rips[i].ytid)) {
                ripMap.set(this.rips[i].ytid, this.rips[i]);
            }
        }

        return ytids.map((ytid: string) => ripMap.get(ytid)).filter((rip: Rip) => rip !== undefined);
    }

    search(query: string, searchType: "all"|"jokes"|"titles", sort:"newest"|"oldest"|"alphabetical" = "newest") {
        let results: Rip[] = [];
        
        if (query.length === 11) {
            // check for youtube id
            for (let rip of this.rips) {
                if (rip.ytid === query) {
                    return [rip];
                }
            }
        } else if (query.startsWith("https://")) {
            // check for youtube url
            let url = new URL(query);
            if (url.hostname === "www.youtube.com" || url.hostname === "youtube.com") {
                let id = url.searchParams.get("v");
                if (id) {
                    for (let rip of this.rips) {
                        if (rip.ytid === id) {
                            return [rip];
                        }
                    }
                }
            } else if (url.hostname === "youtu.be") {
                let id = url.pathname.slice(1);
                if (id) {
                    for (let rip of this.rips) {
                        if (rip.ytid === id) {
                            return [rip];
                        }
                    }
                }
            }
        }
        
        
        if (searchType === "jokes") {
            for (let rip of this.rips) {
                if (rip.description.toLowerCase().includes(query.toLowerCase())) {
                    results.push(rip);
                }
            }
        } else if (searchType === "titles") {
            for (let rip of this.rips) {
                if (rip.rawname.toLowerCase().includes(query.toLowerCase())) {
                    results.push(rip);
                }
            }
        } else {
            for (let rip of this.rips) {
                if (rip.rawname.toLowerCase().includes(query.toLowerCase()) || rip.description.toLowerCase().includes(query.toLowerCase())) {
                    results.push(rip);
                }
            }
        }

        // sort by series
        switch(sort) {
            case "newest":
                results = results.sort((a, b) => b.postTime - a.postTime);
            case "oldest":
                results = results.sort((a, b) => a.postTime - b.postTime);
            case "alphabetical":
                results = results.sort((a, b) => a.rawname.localeCompare(b.rawname));
        }

        return results.sort((a, b) => (a.series || "").localeCompare(b.series));
    }

    async load() {
        let response = await fetch('./db/db.siivadb.zst', { method: 'GET' })
        let arrayBuffer = await response.arrayBuffer();

        let decoder = new ZSTDDecoder();
        await decoder.init();
        arrayBuffer = decoder.decode(new Uint8Array(arrayBuffer)).buffer;

        let view = new DataView(arrayBuffer);

        if (view.getUint32(0, true) !== 1447643475) {
            throw new Error("Invalid database file (missing SIIV header)");
        }
        let ripCount = view.getUint32(8, true);
        this.createdAt = dateOffset(view.getUint32(12, true) * 1000)
        
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
            let description = this.readStringUint16(view, descriptionTableOffset + descriptionOffset);
            
            let duration = view.getUint16(durationTableOffset + i * 2, true);
            let postTime = dateOffset(view.getUint32(uploadDateTableOffset + i * 4, true) * 1000);
            
            let name = rawname.split(" - ");
            let series = name.pop();
            
            this.rips.push({
                rawname,
                name: name.join(" - "),
                series,
                ytid,
                description,
                duration,
                postTime
            });

            pos += 19;
        }
    }
}
