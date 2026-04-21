import type RipBrowser from "../../RipBrowser/RipBrowser";

const termsRegex = new RegExp(/[^=]"(.+?)"|''(.+?)''|\[\[(.+?)\]\]/gm);

type Balance = "balanced" | "random" | "top";

class RipList {
  ytids: string[] = [];
  map: Map<string, string[]> = new Map();
  termMap: Map<string, string[]> = new Map();

  _getTerms(rip: RipBrowser["rips"][0] | undefined) {
    if (!rip) return [];
    const terms = [
      rip.name.split(" (")[0] + (rip.series ? " - " + rip.series : ""),
    ];
    if (rip.series) terms.push(rip.series);
    let matches = rip.description.matchAll(termsRegex);
    for (const match of matches) {
      if (match[1]) terms.push(match[1]);
      else if (match[2]) terms.push(match[2]);
      else if (match[3]) terms.push(match[3]);
    }
    return [...new Set(terms)];
  }

  constructor(rips: RipBrowser["rips"]) {
    this.ytids = rips.map((rip) => rip.ytid);
    for (const rip of rips) {
      const terms = this._getTerms(rip);
      this.map.set(rip.ytid, terms);
      for (const term of terms) {
        if (!this.termMap.has(term)) {
          this.termMap.set(term, []);
        }
        this.termMap.get(term)?.push(rip.ytid);
      }
    }
  }

  get(ytid: string) {
    return this.map.get(ytid) || [];
  }

  getByTerm(term: string) {
    return this.termMap.get(term) || [];
  }
}

class ForYouAggregator {
  ripList: RipList;
  weights: Map<string, number> = new Map();
  liked: Map<string, number> = new Map();
  // Seen list that is saved to localStorage
  seen: Set<string> = new Set();
  // Temporary seen list for rips that have been fetched,
  // but not interacted with
  tempSeen: Set<string> = new Set();

  likeWeight = 50;
  ignoreWeightMin = -5;
  ignoreTimeMin = 1000;
  ignoreWeightMax = 3;
  ignoreTimeMax = 20000;
  debug = false;
  onSeen: (payload: string) => void = () => {};

  constructor(
    rips: RipBrowser["rips"],
    likes: string[],
    localStorage: string | null = null,
    onSeen: (payload: string) => void,
  ) {
    this.ripList = new RipList(rips);
    this.onSeen = onSeen;

    if (localStorage) {
      this.seen = new Set(JSON.parse(localStorage));
      this.tempSeen = new Set(this.seen);
    }

    this.computeWeights(likes);
  }

  topTerms() {
    const sorted = Array.from(this.liked.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 10).map(([term, weight]) => ({ term, weight }));
  }

  addSeen(ytid: string) {
    this.seen.add(ytid);
    this.tempSeen.add(ytid);
    this.weights.delete(ytid);
    this.onSeen(JSON.stringify(Array.from(this.seen)));
  }

  computeWeights(likes: string[]) {
    this.weights.clear();
    this.liked.clear();
    for (const like of likes) {
      // Don't want to use addSeen here, as this may cause a lot of writes to localStorage
      this.seen.add(like);
      this.tempSeen.add(like);
      const terms = this.ripList.get(like);
      const termWeight = this.likeWeight / terms.length;
      for (const term of terms) {
        this.liked.set(
          term,
          Math.min(100, (this.liked.get(term) || 0) + termWeight),
        );
      }
    }
    this.onSeen(JSON.stringify(Array.from(this.seen)));

    let needComputing = new Set<string>();
    for (const [term, likedCount] of this.liked.entries()) {
      const rips = this.ripList.getByTerm(term);
      if (!rips) continue;
      for (const ytid of rips) {
        if (this.seen.has(ytid)) continue;
        needComputing.add(ytid);
      }
    }
    for (const ytid of this.ripList.ytids) {
      if (this.seen.has(ytid)) continue;
      if (!needComputing.has(ytid)) {
        this.weights.set(ytid, 1);
      } else {
        this.weights.set(ytid, this.computeWeight(ytid));
      }
    }
  }

  computeWeight(ytid: string) {
    let weights = [];
    const terms = this.ripList.get(ytid);
    for (const term of terms) {
      const weight = this.liked.get(term);
      if (weight !== undefined) {
        // Prioritize weight a lot more, as regular values
        // tend to not make a difference at all given the thousands of rips in the pool
        weights.push(weight * 5);
      }
    }
    if (weights.length === 0) return 1;
    // Return average
    return weights.reduce((a, b) => a + b, 0) / weights.length;
  }

  getOne(balance: Balance = "balanced"): { ytid: string; reason: string } {
    const chance = Math.random();
    let selectedYtid;
    let reason = "No reason";

    // Chance of weighted random and picking highest weight (% left over is random)
    // Default: 50% weighted random, 32% pick highest weight, 18% random
    let chances = [0.5, 0.82];
    if (balance === "random") {
      // 82% weighted random, 18% random
      chances = [0, 0];
    } else if (balance === "top") {
      // 100% pick highest weight
      chances = [-1, 1];
    }

    if (chance <= chances[0] && this.weights.size > 0) {
      // weighted random choice
      const totalWeight = Array.from(this.weights.values()).reduce(
        (a, b) => a + Math.max(b, 1),
        0,
      );
      let randomWeight = Math.random() * totalWeight;
      for (const [ytid, weight] of this.weights.entries()) {
        if (randomWeight < Math.max(weight, 1)) {
          selectedYtid = ytid;
          reason = `Picked through weighted randomness (weight: ${weight.toFixed(2)})`;
          break;
        }
        randomWeight -= Math.max(weight, 1);
      }
    } else if (chance <= chances[1] && this.weights.size > 0) {
      // pick the highest weighted rip
      let maxWeight = -Infinity;
      for (const [ytid, weight] of this.weights.entries()) {
        if (this.tempSeen.has(ytid) || this.seen.has(ytid)) continue;
        if (weight > maxWeight) {
          maxWeight = weight;
        }
      }
      const choices = [...this.weights.entries()].filter(
        ([, weight]) => weight === maxWeight,
      );
      const [chosenYtid] = choices[Math.floor(Math.random() * choices.length)];
      selectedYtid = chosenYtid;
      reason = `It had the highest weight (${maxWeight.toFixed(2)})`;
    } else {
      // just pick a random rip
      const eligibleRips = this.ripList.ytids.filter(
        (ytid) => !this.tempSeen.has(ytid) && !this.seen.has(ytid),
      );
      const randomIndex = Math.floor(Math.random() * eligibleRips.length);
      selectedYtid = eligibleRips[randomIndex];
      reason = "No reason (random)";
    }

    // Don't remove rip from pool permanently, since user may not see rips
    // that are fetched due to preloading; instead, scrollPast handles this
    if (selectedYtid) {
      this.weights.delete(selectedYtid);
      this.tempSeen.add(selectedYtid);
    } else {
      // If no rip, or the random chance didn't hit, just return a random rip
      const randomIndex = Math.floor(Math.random() * this.ripList.ytids.length);
      selectedYtid = this.ripList.ytids[randomIndex];
      reason = "No reason (random fallback)";
    }
    return { ytid: selectedYtid, reason };
  }

  _updateWeightsForRip(ytid: string, weightChange: number, ignoreTag?: string) {
    const terms = this.ripList.get(ytid);
    const termWeight = weightChange / terms.length;
    const affectedRips = new Set<string>();
    for (const term of terms) {
      if (term === ignoreTag) continue;
      this.liked.set(
        term,
        Math.min(100, (this.liked.get(term) || 0) + termWeight),
      );
      // Update weights for all rips with this term
      for (const mappedId of this.ripList.getByTerm(term)) {
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

  scrollPast(ytid: string, dwellTime = 5000, ignoreTag?: string) {
    // If scrolled past quickly, don't deweight the rip
    if (dwellTime < this.ignoreTimeMin || this.liked.has(ytid)) return;
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
    this._updateWeightsForRip(ytid, score, ignoreTag);
    this.addSeen(ytid);
  }
}

let aggregator: ForYouAggregator | null = null;

onmessage = (event) => {
  const { type, payload } = event.data;
  const rawType = type.split("-")[0];

  if (rawType === "init") {
    const { rips, likes, localStorage } = payload;
    aggregator = new ForYouAggregator(rips, likes, localStorage, (seenIds) => {
      postMessage({ type: "localStorage", payload: seenIds });
    });
    postMessage({ type, payload: null });
  } else if (rawType === "getOne") {
    if (aggregator) {
      console.log("Getting one with balance:", payload);
      const rip = aggregator.getOne(payload?.balance ?? "balanced");
      postMessage({ type, payload: rip });
    }
  } else if (rawType === "addSeen") {
    if (aggregator) {
      aggregator.addSeen(payload.ytid);
    }
  } else if (rawType === "addLike") {
    if (aggregator) {
      aggregator.addLike(payload.ytid);
    }
  } else if (rawType === "removeLike") {
    if (aggregator) {
      aggregator.removeLike(payload.ytid);
    }
  } else if (rawType === "scrollPast") {
    if (aggregator) {
      const { ytid, dwellTime } = payload;
      aggregator.scrollPast(ytid, dwellTime);
    }
  } else if (rawType === "getFeedInfo") {
    if (aggregator) {
      const info = {
        seen: aggregator.seen.size,
        topTerms: aggregator.topTerms(),
      };
      postMessage({ type, payload: info });
    }
  }
};
