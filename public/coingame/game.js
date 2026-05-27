kaplay({
  width: 1000,
  height: 1000,
  letterbox: true,
});

loadSprite("basket", "./basket.png");
loadSprite("coin", "./coin.png");
loadSound("coinSound", "./coin.mp3");

const BASKET_SPEED = 1500;
const GAME_TIME = 30;

setGravity(100);

// Henter brukernavn fra localStorage (satt av login-siden)
function getUsername() {
  return localStorage.getItem("username") || null;
}

// Lokal highscore-cache for å unngå for mange API-kall
let cachedHighScore = 0;

function getHighScore() {
  return cachedHighScore;
}

// Henter highscore fra server ved oppstart
async function fetchHighScore() {
  const username = getUsername();
  if (!username) return;
  try {
    const res = await fetch(`/get-score?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    if (data.success) cachedHighScore = data.highscore;
  } catch {}
}

// Lagrer highscore til server (kun hvis ny score er høyere)
async function saveHighScore(score) {
  if (score <= cachedHighScore) return;
  cachedHighScore = score;
  const username = getUsername();
  if (!username) return;
  try {
    await fetch("/save-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, score }),
    });
  } catch {}
}

// Last highscore fra server før spillet starter
fetchHighScore().then(() => go("start"));

scene("start", () => {
  add([rect(1000, 1000), color(0, 170, 255)]);

  add([
    text("MYNTSPILL", { size: 48 }),
    pos(center().x, 120),
    anchor("center"),
  ]);

  add([
    text("Trykk 1 for en spiller", { size: 28 }),
    pos(center().x, 250),
    anchor("center"),
  ]);

  add([
    text("Trykk 2 for to spillere", { size: 28 }),
    pos(center().x, 300),
    anchor("center"),
  ]);

  add([
    text("Spiller 1: PIL VENSTRE / PIL HØYRE", { size: 22 }),
    pos(center().x, 380),
    anchor("center"),
  ]);

  add([
    text("Spiller 2: A / S", { size: 22 }),
    pos(center().x, 430),
    anchor("center"),
  ]);

  add([
    text("High-score: " + getHighScore(), { size: 24 }),
    pos(center().x, 520),
    anchor("center"),
  ]);

  onKeyPress("1", () => go("game", { players: 1 }));
  onKeyPress("2", () => go("game", { players: 2 }));
});

scene("game", (settings) => {
  let score1 = 0;
  let score2 = 0;
  let timeLeft = GAME_TIME;
  let spawnInterval = 0.8;
  let currentGravity = 100;
  let spawnLoop = null;

  setGravity(currentGravity);

  add([rect(1000, 1000), color(0, 170, 255)]);

  add([
    rect(1000, 10),
    pos(0, 950),
    area(),
    body({ isStatic: true }),
    opacity(0),
    "floor",
  ]);

  const basket1 = add([
    sprite("basket"),
    scale(0.22),
    anchor("center"),
    pos(center().x - 150, 900),
    area(),
    body({ isStatic: true }),
    "basket1",
  ]);

  let basket2 = null;

  if (settings.players === 2) {
    basket2 = add([
      sprite("basket"),
      scale(0.22),
      anchor("center"),
      pos(center().x + 150, 900),
      area(),
      body({ isStatic: true }),
      "basket2",
    ]);
  }

  const scoreText1 = add([text("P1: 0", { size: 24 }), pos(20, 20)]);
  const scoreText2 = add([text("P2: 0", { size: 24 }), pos(20, 60)]);
  const highScoreText = add([text("High-score: " + getHighScore(), { size: 24 }), pos(20, 100)]);
  const timerText = add([text("Tid: " + timeLeft, { size: 24 }), pos(20, 140)]);

  onKeyDown((key) => {
    if (key === "left") basket1.move(-BASKET_SPEED, 0);
    if (key === "right") basket1.move(BASKET_SPEED, 0);

    if (basket2) {
      if (key === "a") basket2.move(-BASKET_SPEED, 0);
      if (key === "s") basket2.move(BASKET_SPEED, 0);
    }
  });

  basket1.onUpdate(() => {
    basket1.pos.x = clamp(basket1.pos.x, 50, width() - 50);
  });

  if (basket2) {
    basket2.onUpdate(() => {
      basket2.pos.x = clamp(basket2.pos.x, 50, width() - 50);
    });
  }

  function spawnCoin() {
    const coin = add([
      sprite("coin"),
      scale(0.1),
      anchor("center"),
      area(),
      body(),
      pos(randi(50, 950), -50),
      offscreen({ distance: 50, destroy: true }),
      "coin",
    ]);

    coin.onCollide("floor", () => {
      destroy(coin);
    });
  }

  function startSpawnLoop() {
    if (spawnLoop) cancel(spawnLoop);
    spawnLoop = loop(spawnInterval, () => {
      spawnCoin();
    });
  }

  startSpawnLoop();

  function updateHighScore(s1, s2) {
    const best = Math.max(s1, s2);
    if (best > getHighScore()) {
      saveHighScore(best);
      highScoreText.text = "High-score: " + getHighScore();
    }
  }

  function collectCoin(coin, isPlayer2) {
    if (!coin.exists()) return;
    destroy(coin);
    if (isPlayer2) {
      score2++;
      scoreText2.text = "P2: " + score2;
    } else {
      score1++;
      scoreText1.text = "P1: " + score1;
    }
    play("coinSound", { volume: 1 });
    updateHighScore(score1, score2);
  }

  basket1.onCollide("coin", (coin) => collectCoin(coin, false));

  if (basket2) {
    basket2.onCollide("coin", (coin) => collectCoin(coin, true));
  }

  loop(1, () => {
    timeLeft--;
    timerText.text = "Tid: " + timeLeft;

    if (timeLeft % 5 === 0 && timeLeft !== GAME_TIME) {
      currentGravity += 30;
      setGravity(currentGravity);
      spawnInterval = Math.max(0.2, spawnInterval - 0.1);
      startSpawnLoop();
    }

    if (timeLeft <= 0) {
      saveHighScore(Math.max(score1, score2));
      go("gameover", {
        players: settings.players,
        score1,
        score2,
        highscore: getHighScore(),
      });
    }
  });
});

scene("gameover", (data) => {
  add([rect(1000, 1000), color(20, 20, 20)]);

  add([
    text("GAME OVER", { size: 48 }),
    pos(center().x, 150),
    anchor("center"),
  ]);

  add([
    text("Spiller 1: " + data.score1, { size: 28 }),
    pos(center().x, 280),
    anchor("center"),
  ]);

  if (data.players === 2) {
    add([
      text("Spiller 2: " + data.score2, { size: 28 }),
      pos(center().x, 330),
      anchor("center"),
    ]);

    let winnerText = "Uavgjort!";
    if (data.score1 > data.score2) winnerText = "Spiller 1 vant!";
    if (data.score2 > data.score1) winnerText = "Spiller 2 vant!";

    add([
      text(winnerText, { size: 32 }),
      pos(center().x, 410),
      anchor("center"),
    ]);
  }

  add([
    text("High-score: " + data.highscore, { size: 28 }),
    pos(center().x, 500),
    anchor("center"),
  ]);

  add([
    text("Trykk SPACE for å gå til startskjermen", { size: 22 }),
    pos(center().x, 620),
    anchor("center"),
  ]);

  onKeyPress("space", () => go("start"));
});