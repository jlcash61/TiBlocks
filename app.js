import {
  SHAPES,
  emptyBoard,
  random,
  hand,
  canPlace,
  hasMoves,
  place,
} from "./engine.js";
const $ = (s) => document.querySelector(s),
  colors = [
    "#b8d97d",
    "#7fc7c1",
    "#e9b474",
    "#ac9cd8",
    "#dc9293",
    "#91bbdd",
    "#d5ce81",
  ];
const day = new Date().toLocaleDateString("en-CA"),
  daySeed = [...day].reduce(
    (a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) | 0,
    7,
  );
const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  write = (key, v) => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  };
let prefs = read("tiblocks:preferences", {
    sound: false,
    haptic: true,
    motion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  }),
  records = read("tiblocks:records", {}),
  mode = "classic",
  state,
  rng,
  selected = null,
  drag = null,
  busy = false,
  lastTime = performance.now(),
  generation = 0;
const cells = Array.from({ length: 100 }, (_, i) => {
  let b = document.createElement("button");
  b.className = "cell";
  b.role = "gridcell";
  b.setAttribute(
    "aria-label",
    `Row ${Math.floor(i / 10) + 1}, column ${(i % 10) + 1}, empty`,
  );
  b.tabIndex = i === 0 ? 0 : -1;
  b.dataset.r = Math.floor(i / 10);
  b.dataset.c = i % 10;
  $("#board").append(b);
  return b;
});
function fresh() {
  const seed =
    mode === "daily" ? daySeed : Math.floor(Math.random() * 2147483647);
  rng = random(seed);
  return {
    version: 1,
    date: day,
    seed,
    deals: 1,
    board: emptyBoard(),
    pieces: hand(rng),
    score: 0,
    lines: 0,
    moves: 0,
    combo: 0,
    maxCombo: 0,
    remaining: 120000,
    over: false,
  };
}
function valid(s) {
  return (
    s?.version === 1 &&
    Number.isInteger(s.seed) &&
    Number.isInteger(s.deals) &&
    s.deals > 0 &&
    s.deals < 100000 &&
    s.board?.length === 10 &&
    s.board.every(
      (r) =>
        r.length === 10 &&
        r.every((v) => Number.isInteger(v) && v >= 0 && v <= 19),
    ) &&
    s.pieces?.length === 3 &&
    s.pieces.every(
      (v) => v === null || (Number.isInteger(v) && v >= 0 && v < 19),
    ) &&
    ["score", "lines", "moves", "combo", "maxCombo", "remaining"].every(
      (k) => Number.isFinite(s[k]) && s[k] >= 0,
    )
  );
}
function save() {
  write("tiblocks:run:" + mode, state);
}
function start(next = mode, reset = false) {
  generation++;
  busy = false;
  drag = null;
  $("#ghost").hidden = true;
  mode = next;
  selected = null;
  const saved = reset ? null : read("tiblocks:run:" + mode, null);
  state =
    valid(saved) && (mode !== "daily" || saved.date === day) ? saved : fresh();
  rng = random(state.seed);
  for (let i = 0; i < state.deals; i++) hand(rng);
  document
    .querySelectorAll("[data-mode]")
    .forEach((b) => b.classList.toggle("active", b.dataset.mode === mode));
  $("#mode-label").textContent = {
    classic: "CLASSIC / ENDLESS POSSIBILITIES",
    daily: `DAILY CIRCUIT / ${day}`,
    rush: "RUSH / MAKE EVERY SECOND COUNT",
  }[mode];
  lastTime = performance.now();
  render();
  save();
}
function shapeNode(id) {
  const shape = SHAPES[id],
    el = document.createElement("div");
  el.className = "shape";
  el.style.gridTemplateColumns = `repeat(${shape[0].length},1fr)`;
  el.style.setProperty("--color", colors[id % colors.length]);
  for (const row of shape)
    for (const v of row) {
      let t = document.createElement("span");
      t.className = v ? "tile" : "hole";
      el.append(t);
    }
  return el;
}
function render() {
  cells.forEach((b, i) => {
    const v = state.board[Math.floor(i / 10)][i % 10];
    b.className = "cell" + (v ? " filled" : "");
    b.style.setProperty("--color", colors[(v - 1) % colors.length]);
    b.setAttribute(
      "aria-label",
      `Row ${Math.floor(i / 10) + 1}, column ${(i % 10) + 1}, ${v ? "occupied" : "empty"}`,
    );
  });
  $("#score").textContent = state.score.toLocaleString();
  $("#best").textContent = (records[mode] || 0).toLocaleString();
  $("#lines").textContent = String(state.lines).padStart(2, "0");
  $("#moves").textContent = String(state.moves).padStart(2, "0");
  $("#max-combo").textContent = "×" + state.maxCombo;
  $("#combo").textContent =
    state.combo > 1 ? `${state.combo} CLEAR STREAK` : "MAKE SOME SPACE";
  $("#progress").value = Math.min(5, state.lines);
  $("#goal-title").textContent =
    state.lines >= 5 ? "First light unlocked ✦" : "First light";
  $("#goal-text").textContent =
    state.lines >= 5
      ? "Five lines cleared. Keep the flow going."
      : `${state.lines} / 5 lines cleared this run.`;
  $("#tray").replaceChildren();
  state.pieces.forEach((id, slot) => {
    let b = document.createElement("button");
    b.className = "piece-slot" + (selected === slot ? " selected" : "");
    b.disabled = id === null || state.over;
    b.setAttribute(
      "aria-label",
      id === null ? "Shape used" : `Select shape ${slot + 1}`,
    );
    if (id !== null) {
      b.append(shapeNode(id));
      if (!hasMoves(state.board, [id])) b.classList.add("unavailable");
      b.onpointerdown = (e) => begin(e, slot);
      b.onclick = () => {
        if (!busy) {
          selected = slot;
          render();
        }
      };
      b.onkeydown = (e) => {
        if (e.key === "Escape") {
          selected = null;
          render();
        }
      };
    }
    $("#tray").append(b);
  });
  $("#end").hidden = !state.over;
  if (state.over)
    $("#end-score").textContent =
      `${state.score.toLocaleString()} points · ${state.lines} lines cleared`;
  clockLabel();
}
function clearPreview() {
  cells.forEach((b) => b.classList.remove("preview", "bad", "line-preview"));
}
function preview(r, c) {
  clearPreview();
  if (selected === null || state.over || busy) return;
  const id = state.pieces[selected];
  if (id === null) return;
  const ok = canPlace(state.board, id, r, c);
  SHAPES[id].forEach((row, y) =>
    row.forEach((v, x) => {
      if (v && r + y >= 0 && r + y < 10 && c + x >= 0 && c + x < 10) {
        const b = cells[(r + y) * 10 + c + x];
        b.classList.add(ok ? "preview" : "bad");
        b.style.setProperty("--color", colors[id % colors.length]);
      }
    }),
  );
  if (ok) {
    const result = place(state.board, id, r, c);
    result.cleared.forEach(([y, x]) =>
      cells[y * 10 + x].classList.add("line-preview"),
    );
  }
}
function audio(kind) {
  if (!prefs.sound) return;
  const a = new Audio(`assets/sounds/${kind}.mp3`);
  a.volume = 0.35;
  a.play().catch(() => {});
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").style.display = "block";
  setTimeout(() => ($("#toast").style.display = "none"), 2400);
}
async function commit(r, c) {
  if (selected === null || busy || state.over) return;
  const slot = selected,
    id = state.pieces[slot],
    result = place(state.board, id, r, c);
  if (!result) {
    audio("invalid");
    if (!prefs.motion)
      $("#tray").children[slot]?.animate(
        [
          { transform: "translateX(-5px)" },
          { transform: "translateX(5px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 180 },
      );
    return;
  }
  busy = true;
  const token = generation;
  clearPreview();
  SHAPES[id].forEach((row, y) =>
    row.forEach((v, x) => {
      if (v) {
        const b = cells[(r + y) * 10 + c + x];
        b.classList.add("filled", "pop");
        b.style.setProperty("--color", colors[id % colors.length]);
      }
    }),
  );
  state.board = result.board;
  state.pieces[slot] = null;
  state.moves++;
  state.lines += result.lines;
  state.combo = result.lines ? state.combo + 1 : 0;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  const points =
    result.blocks +
    result.lines * 10 * Math.max(1, result.lines) +
    result.lines * Math.max(0, state.combo - 1) * 5;
  state.score += points;
  selected = null;
  if (state.pieces.every((v) => v === null)) {
    state.pieces = hand(rng);
    state.deals++;
  }
  records[mode] = Math.max(records[mode] || 0, state.score);
  write("tiblocks:records", records);
  state.over = !hasMoves(state.board, state.pieces);
  save();
  audio(result.lines ? "complete" : "place");
  if (prefs.haptic) navigator.vibrate?.(result.lines ? [15, 30, 15] : 10);
  if (result.lines) {
    result.cleared.forEach(([y, x]) =>
      cells[y * 10 + x].classList.add("clear"),
    );
    $("#callout").textContent =
      result.lines > 1
        ? `${result.lines} LINES! +${points}`
        : `NICE. +${points}`;
    if (!prefs.motion)
      $("#callout").animate(
        [
          { opacity: 0, transform: "translateY(15px)" },
          { opacity: 1, offset: 0.2 },
          { opacity: 0, transform: "translateY(-25px)" },
        ],
        { duration: 800, fill: "forwards" },
      );
    await new Promise((r) => setTimeout(r, prefs.motion ? 0 : 370));
  } else await new Promise((r) => setTimeout(r, prefs.motion ? 0 : 100));
  if (token !== generation) return;
  $("#callout").textContent = "";
  busy = false;
  render();
  if (state.over) audio("gameover");
}
function begin(e, slot) {
  if (busy || state.over || e.button !== 0) return;
  selected = slot;
  drag = {
    slot,
    x: e.clientX,
    y: e.clientY,
    moved: false,
    r: 0,
    c: 0,
    pointerType: e.pointerType,
  };
  e.currentTarget.setPointerCapture(e.pointerId);
  [...$("#tray").children].forEach((b, i) =>
    b.classList.toggle("selected", i === slot),
  );
}
window.addEventListener(
  "pointermove",
  (e) => {
    if (!drag) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 7)
      drag.moved = true;
    if (!drag.moved) return;
    const rect = $("#board").getBoundingClientRect(),
      step = rect.width / 10,
      shape = SHAPES[state.pieces[drag.slot]],
      x = e.clientX - (shape[0].length * step) / 2,
      y =
        e.clientY -
        shape.length * step -
        (drag.pointerType === "touch" ? 28 : 8);
    drag.r = Math.round((y - rect.top) / step);
    drag.c = Math.round((x - rect.left) / step);
    const ghost = $("#ghost");
    ghost.hidden = false;
    ghost.replaceChildren(shapeNode(state.pieces[drag.slot]));
    ghost.querySelectorAll(".tile,.hole").forEach((t) => {
      t.style.width = step - 5 + "px";
      t.style.height = step - 5 + "px";
    });
    ghost.style.left = x + "px";
    ghost.style.top = y + "px";
    preview(drag.r, drag.c);
  },
  { passive: true },
);
window.addEventListener("pointerup", () => {
  if (!drag) return;
  const d = drag;
  drag = null;
  $("#ghost").hidden = true;
  if (d.moved) {
    commit(d.r, d.c);
    clearPreview();
  } else render();
});
window.addEventListener("pointercancel", () => {
  drag = null;
  $("#ghost").hidden = true;
  clearPreview();
});
$("#board").onpointermove = (e) => {
  const b = e.target.closest(".cell");
  if (b && !drag) preview(+b.dataset.r, +b.dataset.c);
};
$("#board").onpointerleave = () => {
  if (!drag) clearPreview();
};
$("#board").onclick = (e) => {
  const b = e.target.closest(".cell");
  if (b) commit(+b.dataset.r, +b.dataset.c);
};
$("#board").onkeydown = (e) => {
  const index = cells.indexOf(document.activeElement);
  const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -10, ArrowDown: 10 }[
    e.key
  ];
  if (delta) {
    e.preventDefault();
    const next = Math.max(0, Math.min(99, index + delta));
    cells[index].tabIndex = -1;
    cells[next].tabIndex = 0;
    cells[next].focus();
    preview(Math.floor(next / 10), next % 10);
  }
  if (e.key === "Escape") {
    selected = null;
    clearPreview();
    render();
  }
};
function restart() {
  if (
    state.moves &&
    !state.over &&
    !confirm("Start a new run? Your current run in this mode will be replaced.")
  )
    return;
  start(mode, true);
}
$("#restart").onclick = restart;
$("#again").onclick = () => start(mode, true);
document.querySelectorAll("[data-mode]").forEach(
  (b) =>
    (b.onclick = () => {
      if (busy) return;
      save();
      start(b.dataset.mode);
    }),
);
$("#settings").onclick = () => $("#dialog").showModal();
for (const key of ["sound", "haptic", "motion"]) {
  $("#" + key).checked = prefs[key];
  $("#" + key).onchange = (e) => {
    prefs[key] = e.target.checked;
    write("tiblocks:preferences", prefs);
    document.body.classList.toggle("reduced", prefs.motion);
  };
}
document.body.classList.toggle("reduced", prefs.motion);
function clockLabel() {
  if (!state) return;
  $("#timer").textContent =
    mode === "rush"
      ? `${Math.floor(Math.ceil(state.remaining / 1000) / 60)}:${String(Math.ceil(state.remaining / 1000) % 60).padStart(2, "0")} REMAINING`
      : mode === "daily"
        ? "TODAY’S CIRCUIT"
        : "TAKE YOUR TIME";
}
setInterval(() => {
  const now = performance.now(),
    elapsed = now - lastTime;
  lastTime = now;
  if (
    mode === "rush" &&
    !state.over &&
    !document.hidden &&
    !$("#dialog").open
  ) {
    state.remaining = Math.max(0, state.remaining - elapsed);
    clockLabel();
    if (!state.remaining) {
      state.over = true;
      save();
      render();
      audio("gameover");
    }
  }
}, 100);
document.addEventListener("visibilitychange", () => {
  lastTime = performance.now();
  save();
});
window.addEventListener("pagehide", save);
setInterval(save, 3000);
let installPrompt;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  $("#install").hidden = false;
});
$("#install").onclick = async () => {
  if (installPrompt) {
    await installPrompt.prompt();
    installPrompt = null;
    $("#install").hidden = true;
  }
};
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./service-worker.js")
    .then((reg) => {
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        worker?.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          )
            toast(
              "Update ready. Close all TiBlocks tabs to apply after your run.",
            );
        });
      });
    })
    .catch(() => {});
start();
