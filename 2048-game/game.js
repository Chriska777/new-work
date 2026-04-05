const GRID = 4;
const GAP = 12;

let board = [];
let score = 0;
let best = parseInt(localStorage.getItem('2048-best') || '0');
let won = false;

const tilesEl = document.getElementById('tiles');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayScore = document.getElementById('overlayScore');

// ── Grid helpers ──────────────────────────────────────────────

function emptyBoard() {
  return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}

function emptyCells(b) {
  const cells = [];
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (b[r][c] === 0) cells.push([r, c]);
  return cells;
}

function addRandom(b) {
  const cells = emptyCells(b);
  if (!cells.length) return;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  b[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function copyBoard(b) {
  return b.map(row => [...row]);
}

function boardsEqual(a, b) {
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (a[r][c] !== b[r][c]) return false;
  return true;
}

// ── Move logic ────────────────────────────────────────────────

// Slide a single row left; return {row, gained}
function slideLeft(row) {
  const nums = row.filter(v => v);
  const merged = [];
  let gained = 0;
  let i = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const val = nums[i] * 2;
      merged.push(val);
      gained += val;
      i += 2;
    } else {
      merged.push(nums[i]);
      i++;
    }
  }
  while (merged.length < GRID) merged.push(0);
  return { row: merged, gained };
}

function move(b, dir) {
  let gained = 0;
  let next = emptyBoard();

  if (dir === 'left') {
    for (let r = 0; r < GRID; r++) {
      const { row, gained: g } = slideLeft(b[r]);
      next[r] = row; gained += g;
    }
  } else if (dir === 'right') {
    for (let r = 0; r < GRID; r++) {
      const { row, gained: g } = slideLeft([...b[r]].reverse());
      next[r] = row.reverse(); gained += g;
    }
  } else if (dir === 'up') {
    for (let c = 0; c < GRID; c++) {
      const col = b.map(row => row[c]);
      const { row, gained: g } = slideLeft(col);
      row.forEach((v, r) => next[r][c] = v); gained += g;
    }
  } else if (dir === 'down') {
    for (let c = 0; c < GRID; c++) {
      const col = b.map(row => row[c]).reverse();
      const { row, gained: g } = slideLeft(col);
      row.reverse().forEach((v, r) => next[r][c] = v); gained += g;
    }
  }

  return { next, gained };
}

function canMove(b) {
  if (emptyCells(b).length) return true;
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++) {
      const v = b[r][c];
      if (c + 1 < GRID && b[r][c + 1] === v) return true;
      if (r + 1 < GRID && b[r + 1][c] === v) return true;
    }
  return false;
}

function has2048(b) {
  return b.some(row => row.some(v => v === 2048));
}

// ── Rendering ─────────────────────────────────────────────────

function tileClass(val) {
  if (val <= 2048) return `t${val}`;
  return 't-big';
}

function tilePos(index) {
  // index = r * 4 + c
  // cell size = (480 - 24 - 36) / 4 = 105, gap = 12
  const cellSize = (480 - GAP * 2 - GAP * (GRID - 1)) / GRID; // = 105
  return (index * (cellSize + GAP));
}

function render() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  tilesEl.innerHTML = '';

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      const val = board[r][c];
      if (!val) continue;

      const tile = document.createElement('div');
      tile.className = `tile ${tileClass(val)}`;
      tile.textContent = val;
      tile.style.left = tilePos(c) + 'px';
      tile.style.top = tilePos(r) + 'px';
      tilesEl.appendChild(tile);
    }
  }
}

function showOverlay(title) {
  overlayTitle.textContent = title;
  overlayScore.textContent = `得分：${score}`;
  overlay.classList.remove('hidden');
}

// ── Game flow ─────────────────────────────────────────────────

function init() {
  board = emptyBoard();
  score = 0;
  won = false;
  overlay.classList.add('hidden');
  addRandom(board);
  addRandom(board);
  render();
}

function applyMove(dir) {
  const { next, gained } = move(board, dir);
  if (boardsEqual(board, next)) return; // nothing moved

  board = next;
  score += gained;
  if (score > best) {
    best = score;
    localStorage.setItem('2048-best', best);
  }

  addRandom(board);
  render();

  if (!won && has2048(board)) {
    won = true;
    setTimeout(() => showOverlay('你赢了!'), 200);
    return;
  }

  if (!canMove(board)) {
    setTimeout(() => showOverlay('游戏结束'), 200);
  }
}

// ── Input ─────────────────────────────────────────────────────

const keyMap = {
  ArrowLeft: 'left', ArrowRight: 'right',
  ArrowUp: 'up',    ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down',
  A: 'left', D: 'right', W: 'up', S: 'down',
};

document.addEventListener('keydown', e => {
  const dir = keyMap[e.key];
  if (dir) { e.preventDefault(); applyMove(dir); }
});

// Touch / swipe
let touchStart = null;
document.addEventListener('touchstart', e => {
  touchStart = e.touches[0];
}, { passive: true });

document.addEventListener('touchend', e => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.clientX;
  const dy = e.changedTouches[0].clientY - touchStart.clientY;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (Math.max(adx, ady) < 20) return;
  if (adx > ady) applyMove(dx > 0 ? 'right' : 'left');
  else           applyMove(dy > 0 ? 'down'  : 'up');
  touchStart = null;
});

document.getElementById('newGame').addEventListener('click', init);
document.getElementById('overlayBtn').addEventListener('click', init);

// ── Start ─────────────────────────────────────────────────────
init();
