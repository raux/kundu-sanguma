const SUITS = {
  fibre: {
    label: "Fibre", icon: "◌",
    items: ["Thread", "Cord", "Woven Strip", "Carry Loop", "Small Basket", "Cloth Roll", "Market Wrap", "Satchel", "Dyed Fibre", "Woven Mat", "Weave Frame", "Trade Cloth", "Master Bundle"]
  },
  wood: {
    label: "Wood", icon: "◆",
    items: ["Wood Shaving", "Peg", "Handle", "Carving Blank", "Small Bowl", "Mallet", "Tool Rack", "Paddle", "Work Bench", "Storage Chest", "Market Sign", "Craft Stall", "Workshop Kit"]
  },
  clay: {
    label: "Clay", icon: "●",
    items: ["Clay Pinch", "Mould", "Cup", "Small Pot", "Lid", "Water Jar", "Serving Bowl", "Storage Pot", "Kiln Brick", "Painted Vessel", "Trade Jar", "Potter's Set", "Grand Vessel"]
  },
  market: {
    label: "Market", icon: "✦",
    items: ["Seed Packet", "Fruit Bundle", "Cocoa Pod", "Coffee Sack", "Garden Basket", "Price Tag", "Balance Scale", "Trade Token", "Market Table", "Ledger", "Stall Awning", "Route Permit", "Grand Exchange"]
  }
};

const OPPONENTS = [
  ["Whispering Mist", "Keep the market lights bright with well-made bundles."],
  ["The Spoilage", "Fresh stock loses value unless your supply chains are strong."],
  ["Ash Storm", "Only careful trade routes can cross the darkened road."],
  ["The Broken Route", "The journey twists; make every item count."],
  ["The Long Night", "The final shadow asks for your finest market day."]
];

const state = {
  round: 1,
  deck: [],
  discard: [],
  hand: [],
  selected: new Set(),
  marketScore: 0,
  handsLeft: 4,
  discardsLeft: 3,
  roundOver: false,
  animating: false,
  bestScore: Number(localStorage.getItem("kundu-sanguma-best")) || 0
};

const $ = (id) => document.getElementById(id);
const handElement = $("hand");
const playButton = $("play-button");
const discardButton = $("discard-button");
const nextRoundButton = $("next-round");
const effectsLayer = $("effects-layer");

function shuffled(cards) {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function buildDeck() {
  return shuffled(Object.entries(SUITS).flatMap(([suit, details]) =>
    details.items.map((name, index) => ({ id: `${suit}-${index + 1}`, suit, rank: index + 1, name }))
  ));
}

function draw(count) {
  for (let index = 0; index < count; index += 1) {
    if (state.deck.length === 0 && state.discard.length > 0) {
      state.deck = shuffled(state.discard.splice(0));
    }
    if (state.deck.length > 0) state.hand.push(state.deck.pop());
  }
  state.hand.sort((left, right) => left.suit.localeCompare(right.suit) || left.rank - right.rank);
}

function targetForRound() {
  return 900 + ((state.round - 1) * 620);
}

function getEvaluation(cards) {
  if (cards.length === 0) return null;

  const ranks = cards.map((card) => card.rank);
  const rankTotal = ranks.reduce((total, rank) => total + rank, 0);
  const rankCounts = [...new Map(ranks.map((rank) => [rank, ranks.filter((value) => value === rank).length])).values()]
    .sort((left, right) => right - left);
  const suitCount = new Set(cards.map((card) => card.suit)).size;
  const flush = cards.length === 5 && suitCount === 1;
  const uniqueRanks = [...new Set(ranks)].sort((left, right) => left - right);
  const straight = cards.length === 5 && uniqueRanks.length === 5 && uniqueRanks[4] - uniqueRanks[0] === 4;
  const marketDay = cards.length === 5 && suitCount === 4;

  let name = "Loose items";
  let bonus = 0;
  let multiplier = 1;

  if (straight && flush) {
    name = "Trade Route"; bonus = 560; multiplier = 3.6;
  } else if (rankCounts[0] === 4) {
    name = "Fourfold Order"; bonus = 440; multiplier = 3.1;
  } else if (rankCounts[0] === 3 && rankCounts[1] === 2) {
    name = "Full Workshop"; bonus = 350; multiplier = 2.7;
  } else if (flush) {
    name = "Craft Set"; bonus = 285; multiplier = 2.25;
  } else if (straight) {
    name = "Supply Chain"; bonus = 245; multiplier = 2.15;
  } else if (rankCounts[0] === 3) {
    name = "Three of a Kind"; bonus = 180; multiplier = 1.85;
  } else if (rankCounts[0] === 2 && rankCounts[1] === 2) {
    name = "Two Bundles"; bonus = 130; multiplier = 1.55;
  } else if (rankCounts[0] === 2) {
    name = "Paired Goods"; bonus = 90; multiplier = 1.3;
  } else if (marketDay) {
    name = "Market Day"; bonus = 205; multiplier = 1.9;
  }

  const score = Math.round((110 + (rankTotal * 11) + bonus) * multiplier);
  return { name, score };
}

function selectedCards() {
  return state.hand.filter((card) => state.selected.has(card.id));
}

function setMessage(message) {
  $("message").textContent = message;
}

function createScoreBurst(evaluation, victory) {
  const burst = document.createElement("div");
  const buttonBounds = playButton.getBoundingClientRect();
  burst.className = `score-burst${victory ? " victory" : ""}`;
  burst.style.left = `${buttonBounds.left + (buttonBounds.width / 2)}px`;
  burst.style.top = `${buttonBounds.top}px`;
  burst.innerHTML = `+${evaluation.score.toLocaleString()}<small>${evaluation.name}</small>`;
  effectsLayer.append(burst);
  window.setTimeout(() => burst.remove(), 1400);
}

function updateBestScore() {
  if (state.marketScore > state.bestScore) {
    state.bestScore = state.marketScore;
    localStorage.setItem("kundu-sanguma-best", String(state.bestScore));
  }
}

function render() {
  const selection = selectedCards();
  const evaluation = getEvaluation(selection);
  const opponent = OPPONENTS[(state.round - 1) % OPPONENTS.length];

  $("round-number").textContent = state.round;
  $("opponent-name").textContent = opponent[0];
  $("opponent-copy").textContent = opponent[1];
  $("target-score").textContent = targetForRound().toLocaleString();
  $("market-score").textContent = state.marketScore.toLocaleString();
  $("hands-left").textContent = state.handsLeft;
  $("discards-left").textContent = state.discardsLeft;
  $("best-score").textContent = state.bestScore.toLocaleString();
  $("selection-count").textContent = `${selection.length} / 5 selected`;
  $("combo-name").textContent = evaluation ? evaluation.name : "Select items to inspect a bundle";
  $("potential-score").textContent = evaluation ? `+${evaluation.score.toLocaleString()}` : "—";

  handElement.replaceChildren();
  state.hand.forEach((card) => {
    const details = SUITS[card.suit];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `card ${card.suit}${state.selected.has(card.id) ? " selected" : ""}`;
    button.setAttribute("aria-pressed", String(state.selected.has(card.id)));
    button.setAttribute("aria-label", `${details.label}: tier ${card.rank}, ${card.name}`);
    button.innerHTML = `<span class="card-tier">${card.rank}</span><span class="card-icon">${details.icon}</span><span class="item-art ${card.suit}" aria-hidden="true"></span><span class="card-name">${card.name}</span><span class="card-family">${details.label}</span>`;
    button.disabled = state.animating;
    button.addEventListener("click", () => toggleCard(card.id));
    handElement.append(button);
  });

  playButton.disabled = state.animating || state.roundOver || selection.length === 0 || state.handsLeft === 0;
  discardButton.disabled = state.animating || state.roundOver || selection.length === 0 || state.discardsLeft === 0;
  $("new-game").disabled = state.animating;
  nextRoundButton.classList.toggle("hidden", !state.roundOver || state.marketScore < targetForRound());
}

function toggleCard(cardId) {
  if (state.roundOver || state.animating) return;
  if (state.selected.has(cardId)) {
    state.selected.delete(cardId);
  } else if (state.selected.size < 5) {
    state.selected.add(cardId);
  } else {
    setMessage("A bundle can hold at most five items.");
  }
  render();
}

function removeSelectedAndRefill() {
  const count = state.selected.size;
  state.discard.push(...selectedCards());
  state.hand = state.hand.filter((card) => !state.selected.has(card.id));
  state.selected.clear();
  draw(count);
}

async function animateIntoBilum() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !Element.prototype.animate) return;
  const destination = $("bilum").getBoundingClientRect();
  const cards = [...handElement.querySelectorAll(".card.selected")];
  const animations = cards.map((card, index) => {
    const bounds = card.getBoundingClientRect();
    const clone = card.cloneNode(true);
    clone.classList.add("flying-card");
    Object.assign(clone.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
    effectsLayer.append(clone);
    const dx = destination.left + destination.width / 2 - (bounds.left + bounds.width / 2);
    const dy = destination.top + destination.height * 0.48 - (bounds.top + bounds.height / 2);
    const animation = clone.animate([
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.55}px, ${dy * 0.55 - 55}px) scale(.72) rotate(${index % 2 ? 9 : -9}deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0 }
    ], { duration: 700, delay: index * 100, easing: "ease-in-out", fill: "both" });
    return animation.finished.catch(() => {}).finally(() => clone.remove());
  });
  await Promise.all(animations);
}

async function playBundle() {
  const evaluation = getEvaluation(selectedCards());
  if (!evaluation || state.handsLeft === 0 || state.roundOver || state.animating) return;

  state.animating = true;
  render();
  setMessage("Packing your bundle into the bilum…");
  try {
    await animateIntoBilum();
  } finally {
    state.animating = false;
  }

  state.marketScore += evaluation.score;
  state.handsLeft -= 1;
  updateBestScore();
  const victory = state.marketScore >= targetForRound();
  createScoreBurst(evaluation, victory);
  removeSelectedAndRefill();

  if (victory) {
    state.roundOver = true;
    document.body.classList.add("round-won");
    setMessage(`${evaluation.name} earns ${evaluation.score.toLocaleString()}. The ${OPPONENTS[(state.round - 1) % OPPONENTS.length][0]} fades—your market is safe.`);
  } else if (state.handsLeft === 0) {
    state.roundOver = true;
    setMessage(`${evaluation.name} earns ${evaluation.score.toLocaleString()}, but the target holds. Begin a new journey to try again.`);
  } else {
    setMessage(`${evaluation.name} earns ${evaluation.score.toLocaleString()} points. Keep trading.`);
  }
  render();
}

function discardSelected() {
  if (state.selected.size === 0 || state.discardsLeft === 0 || state.roundOver || state.animating) return;
  const count = state.selected.size;
  state.discardsLeft -= 1;
  removeSelectedAndRefill();
  setMessage(`Discarded ${count} item${count === 1 ? "" : "s"}. Find a stronger bundle.`);
  render();
}

function startRound() {
  state.deck = buildDeck();
  state.discard = [];
  state.hand = [];
  state.selected.clear();
  state.marketScore = 0;
  state.handsLeft = 4;
  state.discardsLeft = 3;
  state.roundOver = false;
  document.body.classList.remove("round-won");
  draw(8);
  setMessage("Select one to five items. Five-item bundles score best.");
  render();
}

function startNewGame() {
  state.round = 1;
  startRound();
}

$("new-game").addEventListener("click", startNewGame);
playButton.addEventListener("click", playBundle);
discardButton.addEventListener("click", discardSelected);
nextRoundButton.addEventListener("click", () => {
  state.round += 1;
  startRound();
});

startNewGame();
