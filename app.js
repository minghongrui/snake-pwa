const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const speedLabelEl = document.getElementById("speedLabel");
const restartButton = document.getElementById("restartButton");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const controlButtons = document.querySelectorAll("[data-direction]");

const GRID_SIZE = 21;
const CELL_COUNT = 20;
const START_TICK_MS = 145;
const MIN_TICK_MS = 72;
const BEST_SCORE_KEY = "ios-snake-best-score";

const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let snake;
let food;
let direction;
let nextDirection;
let score;
let bestScore;
let tickMs;
let lastStep;
let running;
let gameOver;
let animationId;
let touchStartX;
let touchStartY;

function readBestScore() {
  const stored = Number(localStorage.getItem(BEST_SCORE_KEY));
  return Number.isFinite(stored) ? stored : 0;
}

function saveBestScore(value) {
  localStorage.setItem(BEST_SCORE_KEY, String(value));
}

function resetGame() {
  snake = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ];
  direction = { ...DIRECTIONS.right };
  nextDirection = { ...DIRECTIONS.right };
  score = 0;
  tickMs = START_TICK_MS;
  lastStep = 0;
  running = false;
  gameOver = false;
  bestScore = readBestScore();
  food = createFood();
  updateHud();
  showOverlay("准备开始", "按方向键、WASD、滑动屏幕或点击方向按钮开始。");
  draw();
}

function startGame() {
  if (gameOver) {
    resetGame();
  }

  if (!running) {
    running = true;
    hideOverlay();
    lastStep = performance.now();
  }
}

function createFood() {
  const available = [];

  for (let y = 0; y < CELL_COUNT; y += 1) {
    for (let x = 0; x < CELL_COUNT; x += 1) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) {
        available.push({ x, y });
      }
    }
  }

  return available[Math.floor(Math.random() * available.length)] || { x: 0, y: 0 };
}

function setDirection(name) {
  const requested = DIRECTIONS[name];
  if (!requested) return;

  const isReverse = requested.x + direction.x === 0 && requested.y + direction.y === 0;
  if (isReverse) return;

  nextDirection = { ...requested };
  startGame();
  flashButton(name);
}

function flashButton(name) {
  const button = document.querySelector(`[data-direction="${name}"]`);
  if (!button) return;

  button.classList.add("is-pressed");
  window.setTimeout(() => button.classList.remove("is-pressed"), 120);
}

function step() {
  direction = { ...nextDirection };
  const head = snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y,
  };

  const hitWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= CELL_COUNT ||
    nextHead.y >= CELL_COUNT;
  const hitSelf = snake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);

  if (hitWall || hitSelf) {
    endGame();
    return;
  }

  snake.unshift(nextHead);

  if (nextHead.x === food.x && nextHead.y === food.y) {
    score += 10;
    bestScore = Math.max(bestScore, score);
    saveBestScore(bestScore);
    tickMs = Math.max(MIN_TICK_MS, START_TICK_MS - Math.floor(score / 40) * 8);
    food = createFood();
  } else {
    snake.pop();
  }

  updateHud();
}

function endGame() {
  running = false;
  gameOver = true;
  showOverlay("游戏结束", "点击重新开始，或再次按任意方向键开一局。");
}

function updateHud() {
  scoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;
  speedLabelEl.textContent = `${Math.max(1, Math.round((START_TICK_MS / tickMs) * 10) / 10)}x`;
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.add("is-visible");
}

function hideOverlay() {
  overlay.classList.remove("is-visible");
}

function drawRoundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

function draw() {
  const size = canvas.width;
  const cell = size / CELL_COUNT;

  ctx.clearRect(0, 0, size, size);

  const boardGradient = ctx.createLinearGradient(0, 0, size, size);
  boardGradient.addColorStop(0, "#15283d");
  boardGradient.addColorStop(1, "#1a3c54");
  ctx.fillStyle = boardGradient;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.045)";
  ctx.lineWidth = 1;
  for (let index = 1; index < CELL_COUNT; index += 1) {
    const pos = index * cell;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }

  drawFood(cell);
  drawSnake(cell);
}

function drawSnake(cell) {
  snake.forEach((segment, index) => {
    const inset = index === 0 ? 3 : 4.5;
    const x = segment.x * cell + inset;
    const y = segment.y * cell + inset;
    const blockSize = cell - inset * 2;
    const gradient = ctx.createLinearGradient(x, y, x + blockSize, y + blockSize);

    if (index === 0) {
      gradient.addColorStop(0, "#7df4af");
      gradient.addColorStop(1, "#20c773");
    } else {
      gradient.addColorStop(0, "#52dfa0");
      gradient.addColorStop(1, "#19a867");
    }

    ctx.fillStyle = gradient;
    drawRoundedRect(x, y, blockSize, blockSize, 8);

    if (index === 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      drawRoundedRect(x + blockSize * 0.58, y + blockSize * 0.2, 3.6, 3.6, 2);
      drawRoundedRect(x + blockSize * 0.58, y + blockSize * 0.58, 3.6, 3.6, 2);
    }
  });
}

function drawFood(cell) {
  const centerX = food.x * cell + cell / 2;
  const centerY = food.y * cell + cell / 2;
  const radius = cell * 0.34;
  const glow = ctx.createRadialGradient(centerX, centerY, 1, centerX, centerY, radius * 2.4);
  glow.addColorStop(0, "rgba(255, 179, 64, 0.95)");
  glow.addColorStop(1, "rgba(255, 179, 64, 0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 2.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffb340";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.beginPath();
  ctx.arc(centerX - radius * 0.3, centerY - radius * 0.32, radius * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function gameLoop(time) {
  if (running && time - lastStep >= tickMs) {
    step();
    lastStep = time;
  }

  draw();
  animationId = requestAnimationFrame(gameLoop);
}

function handleKeydown(event) {
  const keyMap = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right",
  };

  const directionName = keyMap[event.key];
  if (!directionName) return;

  event.preventDefault();
  setDirection(directionName);
}

function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchEnd(event) {
  if (touchStartX === undefined || touchStartY === undefined) return;

  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  touchStartX = undefined;
  touchStartY = undefined;

  if (Math.max(absX, absY) < 28) return;

  if (absX > absY) {
    setDirection(deltaX > 0 ? "right" : "left");
  } else {
    setDirection(deltaY > 0 ? "down" : "up");
  }
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("service-worker.js").then((registration) => {
    registration.update();
  }).catch(() => {
    // Local file previews, LAN HTTP, and locked-down browsers can reject service workers.
  });
}

window.addEventListener("keydown", handleKeydown);
window.addEventListener("touchstart", handleTouchStart, { passive: true });
window.addEventListener("touchend", handleTouchEnd, { passive: true });

restartButton.addEventListener("click", () => {
  resetGame();
  startGame();
});

controlButtons.forEach((button) => {
  button.addEventListener("click", () => setDirection(button.dataset.direction));
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && running) {
    running = false;
    showOverlay("已暂停", "回到页面后按任意方向继续。");
  }
});

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + width, y, x + width, y + height, r);
    this.arcTo(x + width, y + height, x, y + height, r);
    this.arcTo(x, y + height, x, y, r);
    this.arcTo(x, y, x + width, y, r);
  };
}

resetGame();
animationId = requestAnimationFrame(gameLoop);
registerServiceWorker();
