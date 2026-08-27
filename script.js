/* =====================================================================
   CONFIGURAÇÃO — edite só esta parte para personalizar o jogo
   ===================================================================== */

// 5 perguntas. `correct` é o índice (começando em 0) da opção certa.
// Sugestão: troque estas por perguntas reais sobre vocês dois
// (primeiro encontro, música de vocês, apelido, comida favorita dela,
// um lugar que vocês querem visitar, uma piada interna, etc.)
const QUESTIONS = [
  {
    question: "Qual foi o primeiro lugar onde a gente se encontrou pessoalmente?",
    options: ["Praça central", "Praia", "Um café", "Festa de um amigo"],
    correct: 1
  },
  {
    question: "Qual é a nossa música?",
    options: ["Ainda não temos uma", "Aquela que toca no carro", "A que tocou no nosso primeiro encontro", "Qualquer uma do meu playlist"],
    correct: 2
  },
  {
    question: "Se a gente pudesse viajar para qualquer lugar amanhã, para onde eu diria que quero te levar primeiro?",
    options: ["Praia", "Montanha", "Outro país", "Nenhum lugar, só ficar com você já basta"],
    correct: 0
  },
  {
    question: "Qual é o apelido que eu mais uso com você?",
    options: ["Amor", "Duda", "Meu bem", "Rainha"],
    correct: 0
  },
  {
    question: "O que eu digo que mais admiro em você?",
    options: ["Sua força", "Seu sorriso", "Seu jeito de cuidar de todo mundo", "Tudo isso junto"],
    correct: 3
  }
];

// 3 labirintos. Legenda:
//   # = parede    . = caminho livre   @ = ponto de partida
//   G = objetivo (bandeira)           X = correnteza (perde 1 vida e reinicia o labirinto)
const MAZES = [
  [
    "#########",
    "#@..#...#",
    "#.#.#.#.#",
    "#.#...#.#",
    "#.#####.#",
    "#.......#",
    "#.#####.#",
    "#...#..G#",
    "#########"
  ],
  [
    "#########",
    "#@..#...#",
    "#.#.#.X.#",
    "#.#.....#",
    "#.###.#.#",
    "#.#X#.#.#",
    "#.#.#.#.#",
    "#...#..G#",
    "#########"
  ],
  [
    "###########",
    "#@....#...#",
    "#.###.#.#.#",
    "#...#.#.#.#",
    "#X#.#...#.#",
    "#.#.#####.#",
    "#.#...X...#",
    "#.#.#####.#",
    "#.......#G#",
    "###########"
  ]
];

// Ordem das etapas do jogo (5 perguntas + 3 labirintos, intercalados)
const STAGE_SEQUENCE = [
  { type: "question", index: 0 },
  { type: "question", index: 1 },
  { type: "maze", index: 0 },
  { type: "question", index: 2 },
  { type: "maze", index: 1 },
  { type: "question", index: 3 },
  { type: "question", index: 4 },
  { type: "maze", index: 2 }
];

const MAX_LIVES = 3;

/* =====================================================================
   ESTADO DO JOGO
   ===================================================================== */
let lives = MAX_LIVES;
let stagePtr = 0;
let mazeState = null; // {grid, rows, cols, player:{r,c}, start:{r,c}}

/* =====================================================================
   ELEMENTOS
   ===================================================================== */
const screens = {
  intro: document.getElementById("screen-intro"),
  question: document.getElementById("screen-question"),
  maze: document.getElementById("screen-maze"),
  lifelost: document.getElementById("screen-lifelost"),
  gameover: document.getElementById("screen-gameover"),
  prize: document.getElementById("screen-prize")
};
const hud = document.getElementById("hud");
const livesEl = document.getElementById("lives");
const stageLabelEl = document.getElementById("stageLabel");
const sunEl = document.getElementById("sun");
const starsEl = document.getElementById("stars");
const arcPath = document.getElementById("arcPath");

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

/* =====================================================================
   HUD: vidas, etapa, sol no horizonte
   ===================================================================== */
function renderLives() {
  livesEl.innerHTML = "";
  for (let i = 0; i < MAX_LIVES; i++) {
    const span = document.createElement("span");
    span.className = "heart" + (i < lives ? "" : " lost");
    span.textContent = "♥";
    livesEl.appendChild(span);
  }
}

function renderStageProgress() {
  const total = STAGE_SEQUENCE.length;
  stageLabelEl.textContent = `Etapa ${Math.min(stagePtr + 1, total)} de ${total}`;
  moveSun(stagePtr / total);
}

function moveSun(t) {
  t = Math.max(0, Math.min(1, t));
  starsEl.style.opacity = t;
  try {
    const len = arcPath.getTotalLength();
    const pt = arcPath.getPointAtLength(len * t);
    const ctm = arcPath.getScreenCTM();
    const screenPt = new DOMPoint(pt.x, pt.y).matrixTransform(ctm);
    sunEl.style.left = (screenPt.x - sunEl.offsetWidth / 2) + "px";
    sunEl.style.top = (screenPt.y - sunEl.offsetHeight / 2) + "px";
    sunEl.style.position = "fixed";
  } catch (e) { /* svg not ready yet, ignore */ }
}
window.addEventListener("resize", () => renderStageProgress());

/* =====================================================================
   FLUXO PRINCIPAL
   ===================================================================== */
function startGame() {
  lives = MAX_LIVES;
  stagePtr = 0;
  hud.hidden = false;
  renderLives();
  goToCurrentStage();
}

function goToCurrentStage() {
  renderStageProgress();
  if (stagePtr >= STAGE_SEQUENCE.length) {
    finishGame();
    return;
  }
  const stage = STAGE_SEQUENCE[stagePtr];
  if (stage.type === "question") {
    renderQuestion(QUESTIONS[stage.index]);
    showScreen("question");
  } else {
    renderMaze(MAZES[stage.index]);
    showScreen("maze");
  }
}

function nextStage() {
  stagePtr++;
  goToCurrentStage();
}

function loseLife(onZero, onSurvive) {
  lives--;
  renderLives();
  if (lives <= 0) {
    showScreen("gameover");
    if (onZero) onZero();
  } else {
    if (onSurvive) onSurvive();
  }
}

function restartWholeGame() {
  startGame();
}

/* =====================================================================
   PERGUNTAS
   ===================================================================== */
const qEyebrow = document.getElementById("qEyebrow");
const qText = document.getElementById("qText");
const qOptions = document.getElementById("qOptions");
const qFeedback = document.getElementById("qFeedback");

function renderQuestion(q) {
  const stageNum = STAGE_SEQUENCE.slice(0, stagePtr + 1).filter(s => s.type === "question").length;
  qEyebrow.textContent = `pergunta ${stageNum} de 5`;
  qText.textContent = q.question;
  qFeedback.textContent = "";
  qOptions.innerHTML = "";

  q.options.forEach((optText, i) => {
    const btn = document.createElement("button");
    btn.className = "opt-btn";
    btn.textContent = optText;
    btn.addEventListener("click", () => handleAnswer(i, q, btn));
    qOptions.appendChild(btn);
  });
}

function handleAnswer(i, q, btn) {
  const allBtns = Array.from(qOptions.children);
  allBtns.forEach(b => b.classList.add("disabled"));

  if (i === q.correct) {
    btn.classList.add("correct");
    qFeedback.textContent = "Isso mesmo! 💙";
    setTimeout(nextStage, 700);
  } else {
    btn.classList.add("wrong");
    allBtns[q.correct].classList.add("correct");
    qFeedback.textContent = "Quase! Vamos tentar de novo.";
    loseLife(
      null,
      () => {
        setTimeout(() => renderQuestion(q), 1100);
      }
    );
  }
}

/* =====================================================================
   LABIRINTOS
   ===================================================================== */
const mEyebrow = document.getElementById("mEyebrow");
const mazeGrid = document.getElementById("mazeGrid");
const lifeLostText = document.getElementById("lifeLostText");
let currentMazeRaw = null;

function renderMaze(rawGrid) {
  currentMazeRaw = rawGrid;
  const stageNum = STAGE_SEQUENCE.slice(0, stagePtr + 1).filter(s => s.type === "maze").length;
  mEyebrow.textContent = `labirinto ${stageNum} de 3`;

  const rows = rawGrid.length;
  const cols = rawGrid[0].length;
  let start = { r: 1, c: 1 };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rawGrid[r][c] === "@") start = { r, c };
    }
  }
  mazeState = { rows, cols, player: { ...start }, start };
  mazeGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  drawMaze();
}

function drawMaze() {
  mazeGrid.innerHTML = "";
  const { rows, cols, player } = mazeState;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = currentMazeRaw[r][c];
      const cell = document.createElement("div");
      cell.className = "cell";
      if (ch === "#") cell.classList.add("wall");
      else if (ch === "X") { cell.classList.add("trap"); cell.textContent = "〰"; }
      else if (ch === "G") { cell.classList.add("goal"); cell.textContent = "🏁"; }
      if (r === player.r && c === player.c) {
        cell.classList.add("player");
        cell.textContent = "⛵";
      }
      mazeGrid.appendChild(cell);
    }
  }
}

function moveMazePlayer(dir) {
  if (!mazeState) return;
  const { r, c } = mazeState.player;
  let nr = r, nc = c;
  if (dir === "up") nr--;
  if (dir === "down") nr++;
  if (dir === "left") nc--;
  if (dir === "right") nc++;

  if (nr < 0 || nc < 0 || nr >= mazeState.rows || nc >= mazeState.cols) return;
  const target = currentMazeRaw[nr][nc];
  if (target === "#") return;

  mazeState.player = { r: nr, c: nc };

  if (target === "X") {
    drawMaze();
    lifeLostText.textContent = "Você caiu na correnteza. O labirinto reinicia — mas você já sabe o caminho.";
    setTimeout(() => {
      loseLife(
        () => { /* gameover screen já mostrada por loseLife */ },
        () => showScreen("lifelost")
      );
    }, 150);
    return;
  }

  drawMaze();

  if (target === "G") {
    setTimeout(nextStage, 400);
  }
}

document.getElementById("btnContinueAfterLoss").addEventListener("click", () => {
  mazeState.player = { ...mazeState.start };
  drawMaze();
  showScreen("maze");
});

document.getElementById("dpad").addEventListener("click", (e) => {
  const btn = e.target.closest(".dbtn");
  if (!btn) return;
  moveMazePlayer(btn.dataset.dir);
});

document.addEventListener("keydown", (e) => {
  if (!screens.maze.classList.contains("active")) return;
  const map = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
  if (map[e.key]) {
    e.preventDefault();
    moveMazePlayer(map[e.key]);
  }
});

/* swipe support for mobile */
let touchStart = null;
document.getElementById("mazeGrid").addEventListener("touchstart", (e) => {
  const t = e.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });
document.getElementById("mazeGrid").addEventListener("touchend", (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { touchStart = null; return; }
  if (Math.abs(dx) > Math.abs(dy)) {
    moveMazePlayer(dx > 0 ? "right" : "left");
  } else {
    moveMazePlayer(dy > 0 ? "down" : "up");
  }
  touchStart = null;
}, { passive: true });

/* =====================================================================
   FINAL / PRÊMIO
   ===================================================================== */
function finishGame() {
  hud.hidden = true;
  showScreen("prize");
  moveSun(1);
  launchConfetti();
}

/* =====================================================================
   BOTÕES GERAIS
   ===================================================================== */
document.getElementById("btnStart").addEventListener("click", startGame);
document.getElementById("btnRestart").addEventListener("click", restartWholeGame);

/* =====================================================================
   CONFETE DOURADO/AZUL
   ===================================================================== */
const confettiCanvas = document.getElementById("confetti");
const ctx = confettiCanvas.getContext("2d");
let confettiParticles = [];
let confettiRunning = false;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeConfetti);
resizeConfetti();

function launchConfetti() {
  const colors = ["#f2c14e", "#fbe4a8", "#4d7cf0", "#eaf1ff", "#c8971f"];
  confettiParticles = Array.from({ length: 120 }, () => ({
    x: Math.random() * confettiCanvas.width,
    y: -20 - Math.random() * confettiCanvas.height * 0.5,
    r: 3 + Math.random() * 4,
    speed: 1.5 + Math.random() * 2.5,
    drift: (Math.random() - 0.5) * 1.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI
  }));
  confettiCanvas.style.display = "block";
  confettiRunning = true;
  let elapsed = 0;
  function tick() {
    if (!confettiRunning) return;
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles.forEach(p => {
      p.y += p.speed;
      p.x += p.drift;
      p.rot += 0.02;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();
    });
    confettiParticles = confettiParticles.filter(p => p.y < confettiCanvas.height + 20);
    elapsed += 16;
    if (elapsed < 6000 && confettiParticles.length > 0) {
      requestAnimationFrame(tick);
    } else {
      confettiRunning = false;
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      confettiCanvas.style.display = "none";
    }
  }
  requestAnimationFrame(tick);
}

/* posiciona o sol assim que a página carrega */
window.addEventListener("load", () => moveSun(0));

/* =====================================================================
   PWA: service worker + botão "instalar no celular"
   ===================================================================== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* ambiente sem suporte (ex: abrindo o arquivo direto com file://) — ignora */
    });
  });
}

let deferredInstallPrompt = null;
const btnInstall = document.getElementById("btnInstall");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  btnInstall.hidden = false;
});

btnInstall.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  btnInstall.hidden = true;
});

window.addEventListener("appinstalled", () => {
  btnInstall.hidden = true;
});
