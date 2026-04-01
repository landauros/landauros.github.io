(function () {
  const MACHINES = {
    unaryIncrement: {
      id: "unaryIncrement",
      name: "Unary Increment",
      summary: "Scan across a block of 1s, append one more 1, then halt.",
      description: "A tiny machine that turns 111 into 1111.",
      alphabet: ["1"],
      blank: "_",
      startState: "q0",
      acceptState: "HALT",
      rejectState: "REJECT",
      defaultInput: "1111",
      examples: ["1", "111", "11111"],
      transitions: {
        q0: {
          "1": { write: "1", move: "R", next: "q0" },
          _: { write: "1", move: "S", next: "HALT" },
        },
      },
    },
    binaryIncrement: {
      id: "binaryIncrement",
      name: "Binary Increment",
      summary: "Walk to the end, carry through trailing 1s, and add one in binary.",
      description: "For example, 1011 becomes 1100.",
      alphabet: ["0", "1"],
      blank: "_",
      startState: "scan",
      acceptState: "HALT",
      rejectState: "REJECT",
      defaultInput: "1011",
      examples: ["1", "111", "1011", "1000"],
      transitions: {
        scan: {
          "0": { write: "0", move: "R", next: "scan" },
          "1": { write: "1", move: "R", next: "scan" },
          _: { write: "_", move: "L", next: "carry" },
        },
        carry: {
          "1": { write: "0", move: "L", next: "carry" },
          "0": { write: "1", move: "S", next: "HALT" },
          _: { write: "1", move: "S", next: "HALT" },
        },
      },
    },
    busyBeaver: {
      id: "busyBeaver",
      name: "Busy Beaver (2-state)",
      summary: "Start on a blank tape and watch a famously tiny machine write four 1s.",
      description: "A classic example of small rules creating unexpectedly rich behavior.",
      alphabet: ["0", "1"],
      blank: "0",
      startState: "A",
      acceptState: "HALT",
      rejectState: "REJECT",
      defaultInput: "",
      examples: [""],
      transitions: {
        A: {
          "0": { write: "1", move: "R", next: "B" },
          "1": { write: "1", move: "L", next: "B" },
        },
        B: {
          "0": { write: "1", move: "L", next: "A" },
          "1": { write: "1", move: "R", next: "HALT" },
        },
      },
    },
  };

  const DEFAULT_WINDOW = 17;

  const dom = {
    machineSelect: document.getElementById("machine-select"),
    tapeInput: document.getElementById("tape-input"),
    speedRange: document.getElementById("speed-range"),
    loadButton: document.getElementById("load-button"),
    stepButton: document.getElementById("step-button"),
    runButton: document.getElementById("run-button"),
    pauseButton: document.getElementById("pause-button"),
    resetButton: document.getElementById("reset-button"),
    exampleButtons: document.getElementById("example-buttons"),
    programTitle: document.getElementById("program-title"),
    programSummary: document.getElementById("program-summary"),
    tapeTrack: document.getElementById("tape-track"),
    currentState: document.getElementById("current-state"),
    headPosition: document.getElementById("head-position"),
    stepCount: document.getElementById("step-count"),
    readSymbol: document.getElementById("read-symbol"),
    transitionLabel: document.getElementById("transition-label"),
    machineStatus: document.getElementById("machine-status"),
    transitionCard: document.getElementById("transition-card"),
    transitionTable: document.getElementById("transition-table"),
    executionLog: document.getElementById("execution-log"),
  };

  const state = {
    machineId: "unaryIncrement",
    tape: new Map(),
    initialTape: new Map(),
    head: 0,
    currentState: "q0",
    steps: 0,
    status: "Idle",
    lastTransition: null,
    runner: null,
  };

  function init() {
    populateMachineSelect();
    bindEvents();
    syncMachinePanel();
    loadTape();
  }

  function populateMachineSelect() {
    Object.values(MACHINES).forEach((machine) => {
      const option = document.createElement("option");
      option.value = machine.id;
      option.textContent = machine.name;
      dom.machineSelect.appendChild(option);
    });
    dom.machineSelect.value = state.machineId;
  }

  function bindEvents() {
    dom.machineSelect.addEventListener("change", () => {
      state.machineId = dom.machineSelect.value;
      stopRunner();
      syncMachinePanel();
      loadTape();
    });

    dom.speedRange.addEventListener("input", () => {
      if (state.runner) {
        stopRunner();
        startRunner();
      }
    });

    dom.loadButton.addEventListener("click", loadTape);
    dom.stepButton.addEventListener("click", stepMachine);
    dom.runButton.addEventListener("click", startRunner);
    dom.pauseButton.addEventListener("click", stopRunner);
    dom.resetButton.addEventListener("click", resetTape);
  }

  function currentMachine() {
    return MACHINES[state.machineId];
  }

  function syncMachinePanel() {
    const machine = currentMachine();
    dom.programTitle.textContent = machine.name;
    dom.programSummary.textContent = machine.summary;
    dom.tapeInput.value = machine.defaultInput;
    dom.tapeInput.placeholder = machine.description;
    renderExampleButtons();
    renderTransitionTable();
  }

  function renderExampleButtons() {
    const machine = currentMachine();
    dom.exampleButtons.innerHTML = "";
    machine.examples.forEach((example) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = example || "(blank tape)";
      button.addEventListener("click", () => {
        dom.tapeInput.value = example;
        loadTape();
      });
      dom.exampleButtons.appendChild(button);
    });
  }

  function loadTape() {
    stopRunner();
    const machine = currentMachine();
    const normalized = normalizeInput(dom.tapeInput.value, machine);
    dom.tapeInput.value = normalized;
    state.tape = tapeFromString(normalized, machine.blank);
    state.initialTape = cloneTape(state.tape);
    state.head = 0;
    state.currentState = machine.startState;
    state.steps = 0;
    state.status = "Ready";
    state.lastTransition = null;
    setLog([
      {
        cls: "is-info",
        text: `Loaded ${machine.name}. Tape="${normalized || machine.blank}"`,
      },
    ]);
    render();
  }

  function resetTape() {
    stopRunner();
    const machine = currentMachine();
    state.tape = cloneTape(state.initialTape);
    state.head = 0;
    state.currentState = machine.startState;
    state.steps = 0;
    state.status = "Reset";
    state.lastTransition = null;
    prependLog(`Reset to the initial tape for ${machine.name}.`, "is-info");
    render();
  }

  function normalizeInput(value, machine) {
    const allowed = new Set(machine.alphabet);
    return String(value)
      .trim()
      .split("")
      .filter((symbol) => allowed.has(symbol))
      .join("");
  }

  function tapeFromString(value, blank) {
    const tape = new Map();
    value.split("").forEach((symbol, index) => {
      if (symbol !== blank && symbol !== "") {
        tape.set(index, symbol);
      }
    });
    return tape;
  }

  function cloneTape(tape) {
    return new Map(tape);
  }

  function readSymbol() {
    return state.tape.get(state.head) ?? currentMachine().blank;
  }

  function writeSymbol(symbol) {
    const machine = currentMachine();
    if (symbol === machine.blank) {
      state.tape.delete(state.head);
    } else {
      state.tape.set(state.head, symbol);
    }
  }

  function moveHead(direction) {
    if (direction === "L") {
      state.head -= 1;
    } else if (direction === "R") {
      state.head += 1;
    }
  }

  function resolveTransition(machine, machineState, symbol) {
    const row = machine.transitions[machineState];
    if (!row) {
      return null;
    }
    return row[symbol] || row["*"] || null;
  }

  function stepMachine() {
    if (isHalted()) {
      prependLog("Machine is already halted. Reset or load a new tape to continue.", "is-info");
      render();
      return;
    }

    const machine = currentMachine();
    const read = readSymbol();
    const transition = resolveTransition(machine, state.currentState, read);

    if (!transition) {
      state.lastTransition = {
        from: state.currentState,
        read,
        write: read,
        move: "S",
        next: machine.rejectState,
      };
      state.currentState = machine.rejectState;
      state.status = "Rejected";
      prependLog(`No rule for (${state.lastTransition.from}, ${read}). Machine rejected.`, "is-reject");
      render();
      return;
    }

    const originState = state.currentState;
    writeSymbol(transition.write);
    moveHead(transition.move);
    state.currentState = transition.next;
    state.steps += 1;
    state.lastTransition = {
      from: originState,
      read,
      write: transition.write,
      move: transition.move,
      next: transition.next,
    };

    if (state.currentState === machine.acceptState) {
      state.status = "Accepted";
      prependLog(
        `Step ${state.steps}: (${originState}, ${read}) -> write ${transition.write}, move ${transition.move}, halt.`,
        "is-accept",
      );
    } else if (state.currentState === machine.rejectState) {
      state.status = "Rejected";
      prependLog(
        `Step ${state.steps}: (${originState}, ${read}) -> write ${transition.write}, move ${transition.move}, reject.`,
        "is-reject",
      );
    } else {
      state.status = "Running";
      prependLog(
        `Step ${state.steps}: (${originState}, ${read}) -> write ${transition.write}, move ${transition.move}, next ${transition.next}.`,
        "",
      );
    }

    render();
    if (isHalted()) {
      stopRunner();
    }
  }

  function startRunner() {
    if (state.runner || isHalted()) {
      return;
    }
    state.status = "Auto-running";
    render();

    const tick = () => {
      if (!state.runner || isHalted()) {
        stopRunner();
        return;
      }
      stepMachine();
      if (state.runner && !isHalted()) {
        state.runner = window.setTimeout(tick, Number(dom.speedRange.value));
      }
    };

    state.runner = window.setTimeout(tick, Number(dom.speedRange.value));
  }

  function stopRunner() {
    if (state.runner) {
      window.clearTimeout(state.runner);
      state.runner = null;
    }
    if (!isHalted() && state.status === "Auto-running") {
      state.status = "Paused";
    }
    renderActionState();
  }

  function isHalted() {
    const machine = currentMachine();
    return state.currentState === machine.acceptState || state.currentState === machine.rejectState;
  }

  function render() {
    renderTape();
    renderStats();
    renderTransitionTable();
    renderTransitionCard();
    renderActionState();
  }

  function renderTape() {
    const width = window.innerWidth <= 640 ? 7 : window.innerWidth <= 920 ? 9 : DEFAULT_WINDOW;
    const half = Math.floor(width / 2);
    const start = state.head - half;
    const end = state.head + half;

    dom.tapeTrack.innerHTML = "";
    for (let position = start; position <= end; position += 1) {
      const symbol = state.tape.get(position) ?? currentMachine().blank;
      const cell = document.createElement("div");
      cell.className = "tape-cell";
      if (position === state.head) {
        cell.classList.add("is-head");
      }
      cell.dataset.position = position;

      const content = document.createElement("div");
      content.className = "cell-symbol";
      if (symbol === currentMachine().blank) {
        content.classList.add("is-blank");
        content.textContent = "·";
      } else {
        content.textContent = symbol;
      }

      cell.appendChild(content);
      dom.tapeTrack.appendChild(cell);
    }
  }

  function renderStats() {
    dom.currentState.textContent = state.currentState;
    dom.headPosition.textContent = String(state.head);
    dom.stepCount.textContent = String(state.steps);
    dom.readSymbol.textContent = readSymbol();
    dom.machineStatus.textContent = state.status;
    dom.transitionLabel.textContent = state.lastTransition
      ? `${state.lastTransition.from} -> ${state.lastTransition.next} (${state.lastTransition.move})`
      : "Waiting for first step";
  }

  function renderTransitionCard() {
    if (!state.lastTransition) {
      dom.transitionCard.innerHTML =
        '<p class="transition-empty">Load a tape and step the machine to see the active rule.</p>';
      return;
    }

    dom.transitionCard.innerHTML = `
      <p class="transition-line"><strong>From</strong> ${escapeHtml(state.lastTransition.from)}</p>
      <p class="transition-line"><strong>Read</strong> ${escapeHtml(state.lastTransition.read)}</p>
      <p class="transition-line"><strong>Write</strong> ${escapeHtml(state.lastTransition.write)}</p>
      <p class="transition-line"><strong>Move</strong> ${escapeHtml(state.lastTransition.move)}</p>
      <p class="transition-line"><strong>Next</strong> ${escapeHtml(state.lastTransition.next)}</p>
    `;
  }

  function renderTransitionTable() {
    const machine = currentMachine();
    const rows = [];

    Object.entries(machine.transitions).forEach(([machineState, symbols]) => {
      Object.entries(symbols).forEach(([symbol, transition]) => {
        rows.push({
          machineState,
          symbol,
          transition,
        });
      });
    });

    dom.transitionTable.innerHTML = "";
    rows.forEach((row) => {
      const item = document.createElement("div");
      item.className = "transition-row";

      if (
        state.lastTransition &&
        state.lastTransition.from === row.machineState &&
        state.lastTransition.read === row.symbol &&
        state.lastTransition.next === row.transition.next
      ) {
        item.classList.add("is-active");
      }

      item.innerHTML = `
        <div class="transition-left">(${escapeHtml(row.machineState)}, ${escapeHtml(row.symbol)})</div>
        <div class="transition-right">${escapeHtml(row.transition.write)} / ${escapeHtml(row.transition.move)} / ${escapeHtml(row.transition.next)}</div>
      `;
      dom.transitionTable.appendChild(item);
    });
  }

  function renderActionState() {
    const halted = isHalted();
    dom.stepButton.disabled = halted;
    dom.runButton.disabled = halted || Boolean(state.runner);
    dom.pauseButton.disabled = !state.runner;
  }

  function setLog(entries) {
    dom.executionLog.innerHTML = "";
    entries.forEach((entry) => appendLogNode(entry.text, entry.cls));
  }

  function prependLog(text, cls) {
    appendLogNode(text, cls, true);
  }

  function appendLogNode(text, cls, prepend) {
    const item = document.createElement("p");
    item.className = `log-entry ${cls || ""}`.trim();
    item.innerHTML = `<strong>${new Date().toLocaleTimeString("en-GB", { hour12: false })}</strong> ${escapeHtml(text)}`;
    if (prepend) {
      dom.executionLog.prepend(item);
    } else {
      dom.executionLog.appendChild(item);
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      switch (character) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return character;
      }
    });
  }

  init();
})();
