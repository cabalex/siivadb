import RipBrowser from "../RipBrowser/RipBrowser";
import { likes } from "../stores";
import { get } from "svelte/store";

const termsRegex = new RegExp(/[^=]"(.+?)"|''(.+?)''|\[\[(.+?)\]\]/gm);

class ForYouAggregator {
  termMap: Map<string, string[]> = new Map();
  weights: Map<string, number> = new Map();
  browser: RipBrowser;
  liked: Map<string, number> = new Map();
  seen: Set<string> = new Set();

  likeWeight = 50;
  ignoreWeightMin = -5;
  ignoreTimeMin = 1000;
  ignoreWeightMax = 3;
  ignoreTimeMax = 20000;
  debug = false;

  constructor(browser: RipBrowser) {
    this.browser = browser;

    // Calculate term map
    for (const rip of browser.rips) {
      const terms = this._getTerms(rip);
      for (const term of terms) {
        if (!this.termMap.has(term)) {
          this.termMap.set(term, []);
        }
        this.termMap.get(term)?.push(rip.ytid);
      }
    }

    if (localStorage.getItem("siivadb-seen")) {
      this.seen = new Set(JSON.parse(localStorage.getItem("siivadb-seen")));
    }

    this.computeWeights();
  }

  _getTerms(rip: RipBrowser["rips"][0] | undefined) {
    if (!rip) return [];
    const terms = [rip.name];
    if (rip.series) terms.push(rip.series);
    let matches = rip.description.matchAll(termsRegex);
    for (const match of matches) {
      if (match[1]) terms.push(match[1]);
      else if (match[2]) terms.push(match[2]);
      else if (match[3]) terms.push(match[3]);
    }
    return [...new Set(terms)];
  }

  topTerms() {
    const sorted = Array.from(this.liked.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 10).map(([term, weight]) => ({ term, weight }));
  }

  addSeen(ytid: string) {
    this.seen.add(ytid);
    localStorage.setItem("siivadb-seen", JSON.stringify(Array.from(this.seen)));
  }

  computeWeights() {
    this.weights.clear();
    this.liked.clear();
    for (const like of get(likes)) {
      // Don't want to use addSeen here, as this may cause a lot of writes to localStorage
      this.seen.add(like);
      const terms = this._getTerms(this.browser.get(like));
      const termWeight = this.likeWeight / terms.length;
      for (const term of terms) {
        this.liked.set(term, (this.liked.get(term) || 0) + termWeight);
      }
    }
    localStorage.setItem("siivadb-seen", JSON.stringify(Array.from(this.seen)));

    for (const [term, likedCount] of this.liked.entries()) {
      const rips = this.termMap.get(term);
      if (!rips) continue;
      for (const ytid of rips) {
        if (this.seen.has(ytid)) continue;
        this.weights.set(
          ytid,
          (this.weights.get(ytid) || 1) + likedCount * this.likeWeight,
        );
      }
    }
    for (const rip of this.browser.rips) {
      if (this.seen.has(rip.ytid)) continue;
      if (!this.weights.has(rip.ytid)) {
        this.weights.set(rip.ytid, 1);
      }
    }
  }

  computeWeight(ytid: string) {
    const rip = this.browser.get(ytid);
    if (!rip) return 1;
    let weights = [];
    const terms = this._getTerms(rip);
    for (const term of terms) {
      const weight = this.liked.get(term);
      if (weight !== undefined) {
        weights.push(weight);
      }
    }
    if (weights.length === 0) return 1;
    // Return average
    return weights.reduce((a, b) => a + b, 0) / weights.length;
  }

  getOne(): RipBrowser["rips"][0] & { reason: string } {
    const chance = Math.random();
    let rip;
    let reason = "No reason";
    if (chance <= 0.4 && this.weights.size > 0) {
      // 40% of the time, weighted random choice
      const totalWeight = Array.from(this.weights.values()).reduce(
        (a, b) => a + Math.max(b, 1),
        0,
      );
      let randomWeight = Math.random() * totalWeight;
      for (const [ytid, weight] of this.weights.entries()) {
        if (randomWeight < Math.max(weight, 1)) {
          rip = this.browser.get(ytid);
          reason = `Picked through weighted randomness (weight: ${weight.toFixed(2)})`;
          break;
        }
        randomWeight -= Math.max(weight, 1);
      }
    } else if (chance <= 0.82 && this.weights.size > 0) {
      // 42% of the time, pick the highest weighted rip
      let maxWeight = -Infinity;
      for (const [ytid, weight] of this.weights.entries()) {
        if (weight > maxWeight) {
          maxWeight = weight;
        }
      }
      const choices = [...this.weights.entries()].filter(
        ([, weight]) => weight === maxWeight,
      );
      const [chosenYtid] = choices[Math.floor(Math.random() * choices.length)];
      rip = this.browser.get(chosenYtid);
      reason = `It had the highest weight (${maxWeight.toFixed(2)})`;
    } else {
      // 18% of the time, just pick a random rip
      const eligibleRips = this.browser.rips.filter(
        (r) => !this.seen.has(r.ytid),
      );
      const randomIndex = Math.floor(Math.random() * eligibleRips.length);
      rip = eligibleRips[randomIndex];
      reason = "No reason (random)";
    }

    // remove rip from pool
    if (rip) {
      this.weights.delete(rip.ytid);
      this.addSeen(rip.ytid);
    } else {
      // If no rip, or the random chance didn't hit, just return a random rip
      const randomIndex = Math.floor(Math.random() * this.browser.rips.length);
      rip = this.browser.rips[randomIndex];
      reason = "No reason (random fallback)";
    }
    console.log(`Selected rip ${rip.ytid} with reason: ${reason}`);
    return { ...rip, reason };
  }

  _updateWeightsForRip(ytid: string, weightChange: number) {
    const rip = this.browser.get(ytid);
    if (!rip) return;
    const terms = this._getTerms(rip);
    const termWeight = weightChange / terms.length;
    const affectedRips = new Set<string>();
    for (const term of terms) {
      this.liked.set(term, (this.liked.get(term) || 0) + termWeight);
      // Update weights for all rips with this term
      for (const mappedId of this.termMap.get(term) || []) {
        affectedRips.add(mappedId);
      }
    }

    for (const affectedId of affectedRips) {
      if (this.seen.has(affectedId)) continue;
      this.weights.set(affectedId, this.computeWeight(affectedId));
    }
  }

  addLike(ytid: string) {
    if (this.debug) console.log(`Adding like for ${ytid}: ${this.likeWeight}`);
    this._updateWeightsForRip(ytid, this.likeWeight);
    this.addSeen(ytid);
  }

  removeLike(ytid: string) {
    if (this.debug)
      console.log(`Removing like for ${ytid}: ${-this.likeWeight}`);
    this._updateWeightsForRip(ytid, -this.likeWeight);
    this.addSeen(ytid);
  }

  scrollPast(ytid: string, dwellTime = 5000) {
    // If scrolled past quickly, don't deweight the rip
    if (dwellTime < this.ignoreTimeMin) return;
    if (dwellTime > this.ignoreTimeMax) dwellTime = this.ignoreTimeMax;
    // 0.5s to 5s dwell time results in -5 to 3 weight
    const score =
      (this.ignoreWeightMax - this.ignoreWeightMin) *
        ((dwellTime - this.ignoreTimeMin) /
          (this.ignoreTimeMax - this.ignoreTimeMin)) +
      this.ignoreWeightMin;

    if (this.debug)
      console.log(
        `Applying score ${score} for scrolling past rip with dwell time ${dwellTime}ms`,
      );
    this._updateWeightsForRip(ytid, score);
  }
}

interface ForYouWindow extends Window {
  ForYou?: ForYouAggregator;
}

export default function getShort(browser: RipBrowser) {
  if ((window as ForYouWindow).ForYou) {
    return (window as ForYouWindow).ForYou.getOne();
  } else {
    const aggregator = new ForYouAggregator(browser);
    (window as ForYouWindow).ForYou = aggregator;
    return aggregator.getOne();
  }
}

export function addLike(id: string) {
  if ((window as ForYouWindow).ForYou) {
    (window as ForYouWindow).ForYou.addLike(id);
  }
}

export function removeLike(id: string) {
  if ((window as ForYouWindow).ForYou) {
    (window as ForYouWindow).ForYou.removeLike(id);
  }
}

export function scrollPast(id: string, dwellTime = 5000) {
  if ((window as ForYouWindow).ForYou) {
    (window as ForYouWindow).ForYou.scrollPast(id, dwellTime);
  }
}

export function getForYou(browser: RipBrowser) {
  if ((window as ForYouWindow).ForYou) {
    return (window as ForYouWindow).ForYou;
  } else {
    const aggregator = new ForYouAggregator(new RipBrowser(browser));
    (window as ForYouWindow).ForYou = aggregator;
    return aggregator;
  }
}
