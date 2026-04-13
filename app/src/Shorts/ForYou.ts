import { get } from "svelte/store";
import RipBrowser from "../RipBrowser/RipBrowser";
import { likes } from "../stores";

class ForYouInterface {
  worker: Worker;
  browser: RipBrowser;
  _ready = false;
  ready = new Promise<void>((resolve) => resolve());

  constructor(browser: RipBrowser) {
    this.browser = browser;
    this.worker = new Worker(
      new URL("./lib/ForYou.worker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    this.worker.addEventListener("message", (event) => {
      if (event.data.type === "localStorage") {
        localStorage.setItem("siivadb-seen", event.data.payload);
      }
    });
  }

  awaitMessage(type: string, payload: unknown = null): Promise<any> {
    const rawType =
      type + "-" + (crypto?.randomUUID() ?? Date.now().toString());
    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        if (event.data.type === rawType) {
          this.worker.removeEventListener("message", handler);
          resolve(event.data.payload);
        }
      };
      this.worker.addEventListener("message", handler);
      this.worker.postMessage({
        type: rawType,
        payload,
      });
    });
  }

  async init() {
    if (this._ready) return;
    this.ready = this.awaitMessage("init", {
      rips: this.browser.rips,
      likes: get(likes),
      localStorage: localStorage.getItem("siivadb-seen"),
    });
    await this.ready;
    this._ready = true;
  }

  async getOne() {
    const rip = await this.awaitMessage("getOne");
    return {
      ytid: rip.ytid,
      ...this.browser.get(rip.ytid),
      reason: rip.reason,
    };
  }

  async addLike(ytid: string) {
    await this.awaitMessage("addLike", { ytid });
  }

  async removeLike(ytid: string) {
    await this.awaitMessage("removeLike", { ytid });
  }

  async scrollPast(ytid: string, dwellTime = 5000, ignoreTag?: string) {
    await this.awaitMessage("scrollPast", { ytid, dwellTime, ignoreTag });
  }

  async getFeedInfo() {
    return await this.awaitMessage("getFeedInfo");
  }
}

interface ForYouWindow extends Window {
  ForYou?: ForYouInterface;
}

export async function initializeForYou(browser: RipBrowser) {
  const aggregator = new ForYouInterface(browser);
  (window as ForYouWindow).ForYou = aggregator;
  await aggregator.init();
  return aggregator;
}

export default async function getShort(browser: RipBrowser) {
  if ((window as ForYouWindow).ForYou) {
    await (window as ForYouWindow).ForYou.ready;
    return await (window as ForYouWindow).ForYou.getOne();
  } else {
    const aggregator = await initializeForYou(browser);
    return await aggregator.getOne();
  }
}

export async function addLike(id: string) {
  if ((window as ForYouWindow).ForYou) {
    await (window as ForYouWindow).ForYou.ready;
    await (window as ForYouWindow).ForYou.addLike(id);
  }
}

export async function removeLike(id: string) {
  if ((window as ForYouWindow).ForYou) {
    await (window as ForYouWindow).ForYou.ready;
    await (window as ForYouWindow).ForYou.removeLike(id);
  }
}

export async function scrollPast(
  id: string,
  dwellTime = 5000,
  ignoreTag?: string,
) {
  if ((window as ForYouWindow).ForYou) {
    await (window as ForYouWindow).ForYou.ready;
    await (window as ForYouWindow).ForYou.scrollPast(id, dwellTime, ignoreTag);
  }
}

export async function getFeedInfo() {
  if ((window as ForYouWindow).ForYou) {
    await (window as ForYouWindow).ForYou.ready;
    return await (window as ForYouWindow).ForYou.getFeedInfo();
  }
}
