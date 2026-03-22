(function () {
  const dom = {
    shell: document.querySelector(".demo-shell"),
    eraBadge: document.getElementById("era-badge"),
    headerTitle: document.getElementById("header-title"),
    headerSubtitle: document.getElementById("header-subtitle"),
    output: document.getElementById("terminal-output"),
    prompt: document.getElementById("prompt"),
    input: document.getElementById("command-input"),
    cursor: document.getElementById("cursor"),
    statusPrimary: document.getElementById("status-primary"),
    statusSecondary: document.getElementById("status-secondary"),
    transitionOverlay: document.getElementById("transition-overlay"),
    transitionCopy: document.getElementById("transition-copy"),
    quickActions: document.getElementById("quick-actions"),
    briefTitle: document.getElementById("brief-title"),
    briefCopy: document.getElementById("brief-copy"),
    conceptList: document.getElementById("concept-list"),
  };

  const GUIDE_STEPS = [
    {
      match: /^ls(?:\s+\/home)?$/i,
      title: "看到共享主机上的其他人",
      copy: "先看一眼 /home。你会看到同一台主机上有多个研究者，这就是分时系统的基本前提。",
    },
    {
      match: /^cat\s+\/home\/prof_chen\/research\.txt$/i,
      title: "共享，不代表没有边界",
      copy: "试着读 prof_chen 的私有研究笔记。Permission denied 会把“共享”与“隔离”同时讲清楚。",
    },
    {
      match: /^cat\s+\/home\/prof_chen\/shared_data\.csv$/i,
      title: "同一套系统，也允许受控协作",
      copy: "再读一次公开共享的数据。相同的主机、不同的权限，这就是多用户系统真正成熟的地方。",
    },
    {
      match: /^cat\s+hello\.f$/i,
      title: "程序还只是文本文件",
      copy: "hello.f 是你的 FORTRAN 程序。1965 年的“程序”写在文件里，就像今天的 prompt 写在请求里。",
    },
    {
      match: /^run\s+hello\.f$/i,
      title: "感受时间片调度",
      copy: "运行它，观察状态栏里 CPU 时间片如何重新分配。分时系统最珍贵的，不是计算，而是调度。",
    },
    {
      match: /^future$/i,
      title: "跳向 2026 年",
      copy: "当你执行 future，界面会把同一套共享计算范式翻译成 GPU 集群与 LLM API 的语言。",
    },
  ];

  const QUICK_ACTIONS = {
    "1965": [
      "help",
      "ls /home",
      "cat /home/prof_chen/research.txt",
      "cat /home/prof_chen/shared_data.csv",
      "cat hello.f",
      "run hello.f",
      "who",
      "ps",
      "future",
    ],
    "2026": ['send "什么是注意力机制"', "queue", "quota", "compare", "back"],
  };

  const CONCEPTS = {
    "1965": [
      "一台昂贵的大型主机，需要服务多个终端，因此必须把 CPU 时间切成可分配的时间片。",
      "权限系统不是附属功能，而是多用户共享同一套计算资源时的生存条件。",
      "你看到的 prompt、目录、进程列表，本质上都在帮你与远端主机协商稀缺资源。",
    ],
    "2026": [
      "浏览器和 API 客户端扮演了 1965 年哑终端的角色，只是线路从电话线变成了网络。",
      "推理调度、GPU 队列、rate limit 与 token 计费，都是分时系统语言的现代翻译。",
      "FORTRAN 文件被 prompt 取代，但“把任务送到远端共享算力，再等待结果返回”的范式没有变。",
    ],
  };

  const PROMPTS = {
    "1965": "landau@MULTICS:~$",
    "2026": "you@cloud-gpu-cluster:~$",
  };

  const state = {
    era: "1965",
    currentUser: "landau",
    cwd: "/home/landau",
    fs: clone(createInitialFileSystem()),
    busy: true,
    queue: Promise.resolve(),
    history: [],
    historyIndex: -1,
    guideIndex: 0,
    modern: {
      quotaUsed: 1850,
      quotaLimit: 32000,
      requests: 12,
      lastPrompt: "",
      lastInputTokens: 0,
      lastOutputTokens: 0,
      queuePosition: 3,
      queueTotal: 128,
      gpuUtilization: 94,
      avgWait: "0.8s",
    },
    scheduler: {
      tick: 47,
      systemHour: 14,
      systemMinute: 32,
      userCpuSeconds: 322,
      users: [
        { name: "landau", tty: "tty01", login: "14:20", idle: "0m", cpu: 2.1, mem: 1.5, time: "00:05:22", process: "-sh", pid: 1042 },
        { name: "prof_chen", tty: "tty02", login: "09:15", idle: "2m", cpu: 34.2, mem: 12.0, time: "02:15:07", process: "matrix_calc", pid: 1023 },
        { name: "zhang_wei", tty: "tty03", login: "13:45", idle: "5m", cpu: 0, mem: 1.2, time: "00:00:00", process: "-sh (idle)", pid: 1038 },
      ],
    },
  };

  function init() {
    bindEvents();
    updateEraPresentation();
    updateStatusBar();
    updateBriefing();
    renderQuickActions();
    runScheduler();
    bootSequence();
  }

  function bindEvents() {
    dom.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const raw = dom.input.value;
        dom.input.value = "";
        submitCommand(raw);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!state.history.length) return;
        state.historyIndex = Math.min(state.historyIndex + 1, state.history.length - 1);
        dom.input.value = state.history[state.history.length - 1 - state.historyIndex] || "";
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!state.history.length) return;
        state.historyIndex = Math.max(state.historyIndex - 1, -1);
        dom.input.value = state.historyIndex === -1 ? "" : state.history[state.history.length - 1 - state.historyIndex] || "";
      }
    });

    document.addEventListener("pointerdown", () => {
      if (!state.busy) dom.input.focus();
    });
  }

  function runScheduler() {
    window.setInterval(() => {
      state.scheduler.tick += 1;
      state.scheduler.systemMinute += 1;
      if (state.scheduler.systemMinute >= 60) {
        state.scheduler.systemMinute = 0;
        state.scheduler.systemHour = (state.scheduler.systemHour + 1) % 24;
      }
      const prof = state.scheduler.users[1];
      const zhang = state.scheduler.users[2];
      const landau = state.scheduler.users[0];
      prof.cpu = round(31 + Math.random() * 10, 1);
      zhang.cpu = Math.random() > 0.68 ? round(Math.random() * 5, 1) : 0;
      landau.cpu = Math.max(0.7, round(1.3 + Math.random() * 2.3, 1));
      prof.idle = `${Math.floor(Math.random() * 3)}m`;
      zhang.idle = zhang.cpu > 0 ? "0m" : `${3 + Math.floor(Math.random() * 5)}m`;
      updateStatusBar();
    }, 1400);
  }

  async function bootSequence() {
    await printLines(
      [
        { text: "MULTICS SYSTEM - MIT COMPUTATION CENTER", cls: "line--accent" },
        { text: "CONNECTING TO MAINFRAME VIA TERMINAL TTY-01...", cls: "line--muted" },
        { text: "LOGIN: landau", cls: "line--system" },
        { text: "PASSWORD: ****", cls: "line--system" },
        { text: "WELCOME, LANDAU. LAST LOGIN: MON MAR 15 09:22:17 1965", cls: "line--success" },
        { text: "TYPE 'help' FOR AVAILABLE COMMANDS, OR FOLLOW THE MISSION BRIEF ON THE RIGHT.", cls: "line--muted" },
        { text: "", instant: true },
      ],
      { speed: [10, 20] },
    );
    setBusy(false);
  }

  function submitCommand(raw) {
    if (state.busy) return;
    const command = raw.trim();
    if (!command) return;
    state.history.push(command);
    state.historyIndex = -1;
    setBusy(true);
    state.queue = state.queue.then(async () => {
      await appendLine(`${PROMPTS[state.era]} ${command}`, { cls: "line--command", instant: true });
      if (state.era === "1965") {
        await execute1965(command);
      } else {
        await execute2026(command);
      }
      maybeAdvanceGuide(command);
      updateBriefing();
      renderQuickActions();
      updateStatusBar();
      setBusy(false);
    });
  }

  async function execute1965(raw) {
    const echoMatch = raw.match(/^echo\s+(.+?)\s*>\s*(.+)$/i);
    if (echoMatch) {
      await createOrWriteFile(echoMatch[2].trim(), stripQuotes(echoMatch[1].trim()));
      return;
    }
    const tokens = tokenize(raw);
    const command = (tokens[0] || "").toLowerCase();
    switch (command) {
      case "help":
        await printLines([
          { text: "AVAILABLE COMMANDS", cls: "line--accent" },
          { text: "  help          show this list" },
          { text: "  whoami        display current user" },
          { text: "  who           show logged-in users" },
          { text: "  ls [-l] [p]   list files" },
          { text: "  cd <path>     change directory" },
          { text: "  pwd           print working directory" },
          { text: "  cat <file>    print file contents" },
          { text: "  mkdir <name>  create a directory" },
          { text: "  touch <name>  create an empty file" },
          { text: "  rm <name>     remove a file or empty dir" },
          { text: "  chmod <n> <f> change permissions (demo)" },
          { text: "  ps / top      inspect current workload" },
          { text: "  run <file>    run a FORTRAN job" },
          { text: "  time          show system time and CPU usage" },
          { text: "  future        jump to the 2026 LLM terminal" },
          { text: "  clear         clear the terminal" },
        ], { speed: [3, 8] });
        return;
      case "clear":
        clearOutput();
        return;
      case "whoami":
        await appendLine(state.currentUser);
        return;
      case "pwd":
        await appendLine(state.cwd);
        return;
      case "who":
        await printLines([
          { text: "USER         TTY      LOGIN@   IDLE", cls: "line--accent" },
          ...state.scheduler.users.map((user) => ({
            text: `${pad(user.name, 12)} ${pad(user.tty, 8)} ${pad(user.login, 8)} ${pad(user.idle, 6)}${user.process === "matrix_calc" ? " (running: matrix_calc)" : ""}`,
          })),
        ], { speed: [2, 6] });
        return;
      case "ps":
        await printLines([
          { text: "PID   USER        CPU%   MEM%   TIME     COMMAND", cls: "line--accent" },
          { text: "1001  root         0.1    2.0   04:21:33 /sbin/init" },
          { text: "1002  root         0.0    0.5   04:21:33 [scheduler]" },
          ...state.scheduler.users.map((user) => ({
            text: `${pad(String(user.pid), 5)} ${pad(user.name, 11)} ${pad(user.cpu.toFixed(1), 6)} ${pad(user.mem.toFixed(1), 6)} ${pad(user.time, 8)} ${user.process}`,
          })),
        ], { speed: [2, 5] });
        return;
      case "top":
        await printLines([
          { text: "CPU TIMESLICE MONITOR", cls: "line--accent" },
          { text: `Total CPU load: ${formatCpuBar(totalCpuUsage())} ${Math.round(totalCpuUsage())}%`, cls: "line--muted" },
          ...state.scheduler.users.map((user) => ({
            text: `${pad(user.name, 12)} ${formatCpuBar(Math.min(user.cpu * 2.2, 100))} ${pad(`${user.cpu.toFixed(1)}%`, 6)} ${user.process}`,
          })),
          { text: "[scheduler] Preemptive timeslicing active", cls: "line--system" },
        ], { speed: [2, 5] });
        return;
      case "time":
        await printLines([
          { text: `SYSTEM TIME: 1965-03-15 ${formatClock(state.scheduler.systemHour, state.scheduler.systemMinute)}`, cls: "line--system" },
          { text: `CPU TIME USED BY LANDAU: ${formatDuration(state.scheduler.userCpuSeconds)}` },
          { text: `CURRENT LOAD: ${Math.round(totalCpuUsage())}% across ${state.scheduler.users.length} users` },
        ], { speed: [3, 6] });
        return;
      case "future":
        await transitionToFuture();
        return;
      case "tutorial":
        await appendLine("Try these in order: ls /home -> cat /home/prof_chen/research.txt -> cat /home/prof_chen/shared_data.csv -> cat hello.f -> run hello.f -> future", { cls: "line--muted" });
        return;
      case "su":
        await appendLine("Access denied. This terminal is attached to account landau only.", { cls: "line--error" });
        return;
      case "ls":
        await handleLs(tokens.slice(1));
        return;
      case "cd":
        await handleCd(tokens[1]);
        return;
      case "cat":
        await handleCat(tokens[1]);
        return;
      case "mkdir":
        await handleMkdir(tokens[1]);
        return;
      case "touch":
        await handleTouch(tokens[1]);
        return;
      case "rm":
        await handleRm(tokens[1]);
        return;
      case "chmod":
        await handleChmod(tokens[1], tokens[2]);
        return;
      case "run":
        await handleRun(tokens[1]);
        return;
      default:
        await appendLine(`Unknown command: ${command}`, { cls: "line--error" });
    }
  }

  async function execute2026(raw) {
    const tokens = tokenize(raw);
    const command = (tokens[0] || "").toLowerCase();
    switch (command) {
      case "help":
        await printLines([
          { text: "AVAILABLE COMMANDS", cls: "line--accent" },
          { text: "  send <prompt>  dispatch an API request to the cluster" },
          { text: "  queue          inspect the current inference queue" },
          { text: "  quota          inspect token usage and budget" },
          { text: "  compare        show the 1965 vs 2026 mapping" },
          { text: "  back           return to the 1965 terminal" },
          { text: "  clear          clear the terminal" },
        ], { speed: [2, 6] });
        return;
      case "clear":
        clearOutput();
        return;
      case "queue":
        await printLines([
          { text: "REQUEST QUEUE (gpu-cluster-07)", cls: "line--accent" },
          { text: "POS   USER         TOKENS   STATUS" },
          { text: "001   user_8821    256      Processing (A100 #3)" },
          { text: "002   user_3340    1024     Processing (A100 #7)" },
          { text: `003   you          ${pad(String(Math.max(8, state.modern.lastInputTokens || 8)), 8)}  WAITING`, cls: "line--system" },
          { text: "004   user_9912    512      Queued" },
          { text: "005   user_1187    128      Queued" },
          { text: `Total active users: 847 | Avg wait: ${state.modern.avgWait} | GPU util: ${state.modern.gpuUtilization}%`, cls: "line--muted" },
        ], { speed: [2, 5] });
        return;
      case "quota":
        await printLines([
          { text: "TOKEN QUOTA", cls: "line--accent" },
          { text: `Used this month: ${state.modern.quotaUsed.toLocaleString()} / ${state.modern.quotaLimit.toLocaleString()} tokens` },
          { text: `Remaining budget: ${(state.modern.quotaLimit - state.modern.quotaUsed).toLocaleString()} tokens` },
          { text: `Recent request: input ${state.modern.lastInputTokens || 0}, output ${state.modern.lastOutputTokens || 0}`, cls: "line--muted" },
        ], { speed: [2, 5] });
        return;
      case "compare":
        await printLines([
          { text: "1965                         2026", cls: "line--accent" },
          { text: "----------------------------------------------------" },
          { text: "大型主机 (IBM 7094)     ->   GPU 集群 (H100 / A100)" },
          { text: "哑终端 (Teletype)       ->   浏览器 / API 客户端" },
          { text: "分时调度器              ->   推理调度 + 负载均衡" },
          { text: "FORTRAN 程序            ->   Prompt" },
          { text: "按 CPU 时间计费         ->   按 Token 计费" },
          { text: "文件权限隔离            ->   API Key + 对话隔离" },
          { text: '"Permission denied"     ->   "Rate limit exceeded"' },
        ], { speed: [2, 5] });
        return;
      case "back":
        await transitionBack();
        return;
      case "send":
        await handleSend(raw);
        return;
      default:
        await appendLine(`Unknown command: ${command}`, { cls: "line--error" });
    }
  }

  async function handleLs(args) {
    const longFormat = args.includes("-l");
    const pathArg = args.find((arg) => arg !== "-l") || ".";
    const resolved = resolvePath(pathArg, state.cwd);
    const node = getNode(resolved);
    if (!node) {
      await appendLine(`ls: cannot access '${pathArg}': No such file or directory`, { cls: "line--error" });
      return;
    }
    if (node.type !== "dir") {
      await appendLine(node.name || leafName(resolved));
      return;
    }
    if (!canListDirectory(resolved)) {
      await appendLine(`ls: cannot open directory '${pathArg}': Permission denied`, { cls: "line--error" });
      return;
    }
    const names = Object.keys(node.children).sort();
    if (!names.length) {
      await appendLine("(empty)", { cls: "line--dim" });
      return;
    }
    if (!longFormat) {
      await appendLine(names.join("   "));
      return;
    }
    await printLines(names.map((name) => {
      const child = node.children[name];
      return {
        text: `${child.permissions}  ${pad(child.owner, 10)} ${pad(String(child.size || countDirectorySize(child)), 5)} ${name}`,
      };
    }), { speed: [2, 4] });
  }

  async function handleCd(target) {
    const pathArg = target || `/home/${state.currentUser}`;
    const resolved = resolvePath(pathArg, state.cwd);
    const node = getNode(resolved);
    if (!node || node.type !== "dir") {
      await appendLine(`cd: ${pathArg}: No such directory`, { cls: "line--error" });
      return;
    }
    if (!canEnterDirectory(resolved)) {
      await appendLine(`cd: ${pathArg}: Permission denied`, { cls: "line--error" });
      return;
    }
    state.cwd = resolved;
  }

  async function handleCat(target) {
    if (!target) {
      await appendLine("cat: missing operand", { cls: "line--error" });
      return;
    }
    const resolved = resolvePath(target, state.cwd);
    const node = getNode(resolved);
    if (!node || node.type !== "file") {
      await appendLine(`cat: ${target}: No such file`, { cls: "line--error" });
      return;
    }
    if (!canReadFile(node)) {
      await appendLine("Permission denied", { cls: "line--error" });
      return;
    }
    await printLines(node.content.split("\n").map((line) => ({ text: line })), { speed: [2, 6] });
  }

  async function handleMkdir(name) {
    if (!name) {
      await appendLine("mkdir: missing operand", { cls: "line--error" });
      return;
    }
    const resolved = resolvePath(name, state.cwd);
    const parent = getNode(parentPath(resolved));
    const base = leafName(resolved);
    if (!parent || parent.type !== "dir") {
      await appendLine("mkdir: invalid target", { cls: "line--error" });
      return;
    }
    if (!canWritePath(resolved)) {
      await appendLine("mkdir: Permission denied", { cls: "line--error" });
      return;
    }
    if (parent.children[base]) {
      await appendLine("mkdir: File exists", { cls: "line--error" });
      return;
    }
    parent.children[base] = { type: "dir", name: base, owner: state.currentUser, permissions: "rwx------", children: {} };
    await appendLine(`created directory ${base}`, { cls: "line--success" });
  }

  async function handleTouch(name) {
    if (!name) {
      await appendLine("touch: missing operand", { cls: "line--error" });
      return;
    }
    const resolved = resolvePath(name, state.cwd);
    if (!canWritePath(resolved)) {
      await appendLine("touch: Permission denied", { cls: "line--error" });
      return;
    }
    const parent = getNode(parentPath(resolved));
    const base = leafName(resolved);
    if (!parent || parent.type !== "dir") {
      await appendLine("touch: invalid target", { cls: "line--error" });
      return;
    }
    if (!parent.children[base]) {
      parent.children[base] = { type: "file", name: base, owner: state.currentUser, permissions: "rw-r--r--", content: "", size: 0 };
    }
    await appendLine(`touched ${base}`, { cls: "line--success" });
  }

  async function handleRm(name) {
    if (!name) {
      await appendLine("rm: missing operand", { cls: "line--error" });
      return;
    }
    const resolved = resolvePath(name, state.cwd);
    if (!canWritePath(resolved)) {
      await appendLine("rm: Permission denied", { cls: "line--error" });
      return;
    }
    const parent = getNode(parentPath(resolved));
    const base = leafName(resolved);
    const node = parent && parent.children ? parent.children[base] : null;
    if (!node) {
      await appendLine(`rm: ${name}: No such file or directory`, { cls: "line--error" });
      return;
    }
    if (node.type === "dir" && Object.keys(node.children).length) {
      await appendLine("rm: directory not empty", { cls: "line--error" });
      return;
    }
    delete parent.children[base];
    await appendLine(`removed ${base}`, { cls: "line--success" });
  }

  async function handleChmod(mode, file) {
    if (!mode || !file) {
      await appendLine("chmod: usage chmod <mode> <file>", { cls: "line--error" });
      return;
    }
    if (!/^[0-7]{3}$/.test(mode)) {
      await appendLine("chmod: only simple 3-digit modes are supported", { cls: "line--error" });
      return;
    }
    const resolved = resolvePath(file, state.cwd);
    const node = getNode(resolved);
    if (!node) {
      await appendLine("chmod: file not found", { cls: "line--error" });
      return;
    }
    if (!canWritePath(resolved)) {
      await appendLine("chmod: Permission denied", { cls: "line--error" });
      return;
    }
    node.permissions = octalToPermissions(mode);
    await appendLine(`${leafName(resolved)} permissions -> ${node.permissions}`, { cls: "line--success" });
  }

  async function handleRun(target) {
    if (!target) {
      await appendLine("run: usage run <file>", { cls: "line--error" });
      return;
    }
    const resolved = resolvePath(target, state.cwd);
    const node = getNode(resolved);
    if (!node || node.type !== "file") {
      await appendLine(`run: ${target}: file not found`, { cls: "line--error" });
      return;
    }
    await printLines([
      { text: `[SCHEDULER] Allocating timeslice #${state.scheduler.tick} to user: landau (PID: 1042)`, cls: "line--system" },
      { text: "[SCHEDULER] Waiting for CPU... prof_chen currently holds priority slot.", cls: "line--muted" },
    ], { speed: [3, 8] });
    await wait(550);
    await appendLine("[SCHEDULER] Preempting landau, switching to prof_chen (priority: HIGH)", { cls: "line--system" });
    await wait(620);
    await appendLine("[FORTRAN] Compiling hello.f ...", { cls: "line--accent" });
    await wait(500);
    await appendLine("[FORTRAN] Linking objects ...", { cls: "line--muted" });
    await wait(420);
    await appendLine("[JOB 1042] START", { cls: "line--success" });
    await wait(520);
    await appendLine(node.content.includes("HELLO WORLD") ? "HELLO WORLD" : "PROGRAM COMPLETED", { cls: "line--success" });
    await appendLine("[JOB 1042] CPU TIME CONSUMED: 00:00:03", { cls: "line--muted" });
    state.scheduler.userCpuSeconds += 3;
    state.scheduler.users[0].cpu = round(state.scheduler.users[0].cpu + 4.5, 1);
    state.scheduler.users[0].time = formatDuration(state.scheduler.userCpuSeconds);
  }

  async function handleSend(raw) {
    const prompt = stripQuotes(raw.slice(4).trim());
    if (!prompt) {
      await appendLine("send: usage send <prompt>", { cls: "line--error" });
      return;
    }
    const inputTokens = Math.max(8, prompt.split(/\s+/).filter(Boolean).length * 3);
    const outputTokens = estimateResponseTokens(prompt);
    const response = buildSyntheticResponse(prompt);
    state.modern.lastPrompt = prompt;
    state.modern.lastInputTokens = inputTokens;
    state.modern.lastOutputTokens = outputTokens;
    state.modern.requests += 1;
    state.modern.quotaUsed += inputTokens + outputTokens;
    await printLines([
      { text: "[API] Sending request to gpu-cluster-07...", cls: "line--accent" },
      { text: `[SCHEDULER] Request queued. Position: ${state.modern.queuePosition}/${state.modern.queueTotal}`, cls: "line--muted" },
      { text: "[SCHEDULER] Waiting for GPU timeslice...", cls: "line--muted" },
      { text: "[SCHEDULER] Allocated: 1x A100 (shared, 14% memory)", cls: "line--system" },
      { text: `[INFERENCE] Processing tokens: ${formatCpuBar(67)} 67%`, cls: "line--muted" },
      { text: `[INFERENCE] Generated ${outputTokens} tokens in 1.2s`, cls: "line--muted" },
      { text: `[COST] Input: ${inputTokens} tokens x $0.003/1K = $${((inputTokens / 1000) * 0.003).toFixed(6)}` },
      { text: `[COST] Output: ${outputTokens} tokens x $0.015/1K = $${((outputTokens / 1000) * 0.015).toFixed(6)}` },
      { text: "", instant: true },
      { text: "Response:", cls: "line--accent" },
    ], { speed: [2, 5] });
    await printLines(response.split("\n").map((line) => ({ text: `> ${line}`, cls: "line--response" })), { speed: [4, 10] });
  }

  async function createOrWriteFile(target, text) {
    if (!target) {
      await appendLine("echo: missing target file", { cls: "line--error" });
      return;
    }
    const resolved = resolvePath(target, state.cwd);
    if (!canWritePath(resolved)) {
      await appendLine("echo: Permission denied", { cls: "line--error" });
      return;
    }
    const parent = getNode(parentPath(resolved));
    const base = leafName(resolved);
    if (!parent || parent.type !== "dir") {
      await appendLine("echo: invalid target", { cls: "line--error" });
      return;
    }
    parent.children[base] = { type: "file", name: base, owner: state.currentUser, permissions: "rw-r--r--", content: text, size: text.length };
    await appendLine(`wrote ${text.length} bytes to ${base}`, { cls: "line--success" });
  }

  async function transitionToFuture() {
    dom.transitionOverlay.classList.add("is-active", "is-glitch");
    dom.transitionCopy.textContent = "SIGNAL DESTABILIZING";
    await wait(1100);
    dom.transitionCopy.textContent = "SYSTEM DATE: 1965-03-15";
    await wait(900);
    dom.transitionCopy.textContent = "SYSTEM DATE: 1978-11-05";
    await wait(420);
    dom.transitionCopy.textContent = "SYSTEM DATE: 1995-08-09";
    await wait(420);
    dom.transitionCopy.textContent = "SYSTEM DATE: 2017-06-12";
    await wait(420);
    dom.transitionCopy.textContent = "SYSTEM DATE: 2026-03-22";
    dom.transitionOverlay.classList.remove("is-glitch");
    await wait(1100);
    state.era = "2026";
    updateEraPresentation();
    clearOutput();
    await wait(280);
    dom.transitionOverlay.classList.remove("is-active");
    dom.transitionCopy.textContent = "";
    await printLines([
      { text: "You just experienced the workflow of a 1965 MULTICS timesharing system.", cls: "line--accent" },
      { text: "Now it is 2026. The hardware changed. The interface language changed." },
      { text: "The shared-compute pattern did not.", cls: "line--muted" },
      { text: "", instant: true },
      { text: "大型主机  ->  GPU 集群" },
      { text: "哑终端    ->  浏览器 / API 客户端" },
      { text: "FORTRAN   ->  Prompt" },
      { text: "CPU 时间  ->  Token 计费" },
      { text: "", instant: true },
      { text: "Type 'send \"什么是注意力机制\"', 'queue', 'quota', or 'compare' to keep exploring.", cls: "line--system" },
    ], { speed: [5, 10] });
  }

  async function transitionBack() {
    dom.transitionOverlay.classList.add("is-active");
    dom.transitionCopy.textContent = "ROLLING TERMINAL BACK TO 1965";
    await wait(1000);
    state.era = "1965";
    updateEraPresentation();
    clearOutput();
    await wait(250);
    dom.transitionOverlay.classList.remove("is-active");
    dom.transitionCopy.textContent = "";
    await printLines([
      { text: "TTY-01 reconnected. The green phosphor returns.", cls: "line--accent" },
      { text: "You are back on MULTICS. Try 'help' or continue the guided path.", cls: "line--muted" },
    ], { speed: [5, 10] });
  }

  function updateEraPresentation() {
    dom.shell.dataset.era = state.era;
    dom.eraBadge.textContent = state.era === "1965" ? "ERA / 1965" : "ERA / 2026";
    dom.headerTitle.textContent = state.era === "1965" ? "MULTICS TIMESHARING TERMINAL" : "LLM INFERENCE CLUSTER TERMINAL";
    dom.headerSubtitle.textContent = state.era === "1965" ? "TTY-01 / CONNECTED" : "gpu-cluster-07 / SHARED";
    dom.prompt.textContent = `${PROMPTS[state.era]} `;
    updateBriefing();
    renderQuickActions();
    updateStatusBar();
  }

  function updateStatusBar() {
    if (state.era === "1965") {
      dom.statusPrimary.innerHTML =
        `<span>MULTICS v3.0</span><span>Users: ${state.scheduler.users.length}</span><span>CPU: ${formatCpuBar(totalCpuUsage())} ${Math.round(totalCpuUsage())}%</span><span>Time: ${formatClock(state.scheduler.systemHour, state.scheduler.systemMinute)}</span>`;
      dom.statusSecondary.innerHTML =
        `<span>Timeslice: ${state.scheduler.users.map((user) => `[${user.name}: ${formatMiniBar(user.cpu * 2.2)}]`).join(" ")}</span>`;
      return;
    }
    dom.statusPrimary.innerHTML =
      `<span>gpu-cluster-07</span><span>Active users: 847</span><span>GPU util: ${state.modern.gpuUtilization}%</span><span>Avg wait: ${state.modern.avgWait}</span>`;
    dom.statusSecondary.innerHTML =
      `<span>Quota: ${state.modern.quotaUsed.toLocaleString()} / ${state.modern.quotaLimit.toLocaleString()} tokens</span><span>Requests sent: ${state.modern.requests}</span>`;
  }

  function renderQuickActions() {
    dom.quickActions.innerHTML = "";
    QUICK_ACTIONS[state.era].forEach((command) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = command;
      button.addEventListener("click", () => {
        if (state.busy) return;
        dom.input.value = "";
        submitCommand(command);
      });
      dom.quickActions.appendChild(button);
    });
  }

  function updateBriefing() {
    if (state.era === "2026") {
      dom.briefTitle.textContent = "同一范式，换了一套词汇";
      dom.briefCopy.textContent = "现在请把自己想成一个 API 客户端。你依然在本地没有足够算力，依然需要排队、调度、计费，只是服务对象从大型主机变成了 GPU 集群。";
    } else {
      const current = GUIDE_STEPS[Math.min(state.guideIndex, GUIDE_STEPS.length - 1)];
      dom.briefTitle.textContent = current.title;
      dom.briefCopy.textContent = current.copy;
    }
    dom.conceptList.innerHTML = "";
    CONCEPTS[state.era].forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      dom.conceptList.appendChild(li);
    });
  }

  function maybeAdvanceGuide(raw) {
    if (state.era !== "1965") return;
    const current = GUIDE_STEPS[state.guideIndex];
    if (current && current.match.test(raw.trim())) state.guideIndex += 1;
  }

  function setBusy(value) {
    state.busy = value;
    dom.input.disabled = value;
    dom.cursor.classList.toggle("is-hidden", value);
    if (!value) dom.input.focus();
  }

  function clearOutput() {
    dom.output.innerHTML = "";
  }

  async function printLines(lines, options = {}) {
    const speed = options.speed || [6, 12];
    for (const line of lines) {
      await appendLine(line.text || "", { cls: line.cls, instant: line.instant || false, speed });
    }
  }

  async function appendLine(text, options = {}) {
    const line = document.createElement("div");
    line.className = `line ${options.cls || ""}`.trim();
    dom.output.appendChild(line);
    scrollOutput();
    if (options.instant) {
      line.textContent = text;
      scrollOutput();
      return;
    }
    const speed = options.speed || [6, 12];
    for (const char of text) {
      line.textContent += char;
      scrollOutput();
      await wait(randomBetween(speed[0], speed[1]));
    }
  }

  function scrollOutput() {
    dom.output.scrollTop = dom.output.scrollHeight;
  }

  function createInitialFileSystem() {
    return {
      type: "dir",
      name: "/",
      owner: "root",
      permissions: "rwxr-xr-x",
      children: {
        home: {
          type: "dir",
          name: "home",
          owner: "root",
          permissions: "rwxr-xr-x",
          children: {
            landau: {
              type: "dir",
              name: "landau",
              owner: "landau",
              permissions: "rwx------",
              children: {
                "hello.f": { type: "file", name: "hello.f", owner: "landau", permissions: "rw-r--r--", content: "      PROGRAM HELLO\n      PRINT *, 'HELLO WORLD'\n      END", size: 64 },
                "data.txt": { type: "file", name: "data.txt", owner: "landau", permissions: "rw-------", content: "Experiment results: 3.14159, 2.71828, 1.41421", size: 47 },
                notes: { type: "dir", name: "notes", owner: "landau", permissions: "rwx------", children: {} },
              },
            },
            prof_chen: {
              type: "dir",
              name: "prof_chen",
              owner: "prof_chen",
              permissions: "rwx------",
              children: {
                "research.txt": { type: "file", name: "research.txt", owner: "prof_chen", permissions: "rw-------", content: "Project Athena draft.\nScheduling notes.\nModeling batch job priority.", size: 2048 },
                "shared_data.csv": { type: "file", name: "shared_data.csv", owner: "prof_chen", permissions: "rw-r--r--", content: "timestamp,value\n1965-03-15,42.7\n1965-03-16,43.1", size: 128 },
              },
            },
            zhang_wei: { type: "dir", name: "zhang_wei", owner: "zhang_wei", permissions: "rwx------", children: {} },
          },
        },
        bin: { type: "dir", name: "bin", owner: "root", permissions: "rwxr-xr-x", children: {} },
        tmp: { type: "dir", name: "tmp", owner: "root", permissions: "rwxrwxrwx", children: {} },
      },
    };
  }

  function getNode(path) {
    if (path === "/") return state.fs;
    const parts = path.split("/").filter(Boolean);
    let current = state.fs;
    for (const part of parts) {
      current = current.children && current.children[part];
      if (!current) return null;
    }
    return current;
  }

  function canReadFile(node) {
    return node.owner === state.currentUser || node.permissions[6] === "r";
  }

  function canListDirectory(path) {
    return path === "/" || path === "/home" || path === "/tmp" || path === "/bin" || path.startsWith(`/home/${state.currentUser}`);
  }

  function canEnterDirectory(path) {
    return canListDirectory(path);
  }

  function canWritePath(path) {
    return path === `/home/${state.currentUser}` || path.startsWith(`/home/${state.currentUser}/`) || path.startsWith("/tmp/");
  }

  function resolvePath(target, cwd) {
    if (!target || target === ".") return cwd;
    const base = target.startsWith("/") ? target : `${cwd}/${target}`;
    const parts = base.split("/").filter(Boolean);
    const normalized = [];
    for (const part of parts) {
      if (part === ".") continue;
      if (part === "..") normalized.pop();
      else normalized.push(part);
    }
    return `/${normalized.join("/")}` || "/";
  }

  function leafName(path) {
    const parts = path.split("/").filter(Boolean);
    return parts[parts.length - 1] || "/";
  }

  function parentPath(path) {
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    return `/${parts.join("/")}` || "/";
  }

  function totalCpuUsage() {
    return Math.min(99, state.scheduler.users.reduce((sum, user) => sum + user.cpu, 0) + 11);
  }

  function formatClock(hour, minute) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function formatDuration(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [hrs, mins, secs].map((value) => String(value).padStart(2, "0")).join(":");
  }

  function formatCpuBar(value) {
    const clamped = Math.max(0, Math.min(100, value));
    const filled = Math.round(clamped / 12.5);
    return `${"█".repeat(filled)}${"░".repeat(Math.max(0, 8 - filled))}`;
  }

  function formatMiniBar(value) {
    const clamped = Math.max(0, Math.min(100, value));
    const filled = Math.max(1, Math.round(clamped / 25));
    return `${"█".repeat(filled)}${"░".repeat(Math.max(0, 4 - filled))}`;
  }

  function estimateResponseTokens(prompt) {
    return Math.min(224, 96 + prompt.length * 2);
  }

  function buildSyntheticResponse(prompt) {
    if (/注意力|attention/i.test(prompt)) {
      return [
        "注意力机制是 Transformer 的核心操作。",
        "它让模型在处理当前 token 时，不必只看局部上下文，而是可以给整段输入里的不同位置分配权重。",
        "换句话说，模型会先问：这一步最值得参考谁？再按权重把信息汇总回来。",
        "这和 1965 年分时系统里“把稀缺资源分配给最需要的任务”有一点结构上的相似。",
      ].join("\n");
    }
    if (/prompt/i.test(prompt)) {
      return [
        "在这套类比里，prompt 就像提交给远端主机的作业说明。",
        "它不是机器码，但它依然决定了远端系统如何分配算力、执行推理并返回结果。",
      ].join("\n");
    }
    return [
      "请求已由共享集群处理完毕。",
      "关键点不是你用了哪一个 UI，而是你依然在通过网络调用一套远端、昂贵、被多人共享的计算资源。",
      "这正是分时系统在 2026 年的回声。",
    ].join("\n");
  }

  function tokenize(raw) {
    const tokens = [];
    const regex = /\"([^\"]*)\"|'([^']*)'|(\S+)/g;
    let match;
    while ((match = regex.exec(raw))) tokens.push(match[1] || match[2] || match[3]);
    return tokens;
  }

  function stripQuotes(value) {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  }

  function octalToPermissions(mode) {
    const map = {
      0: "---",
      1: "--x",
      2: "-w-",
      3: "-wx",
      4: "r--",
      5: "r-x",
      6: "rw-",
      7: "rwx",
    };
    return mode.split("").map((digit) => map[digit]).join("");
  }

  function countDirectorySize(node) {
    if (node.type === "file") return node.size || node.content.length;
    return Object.values(node.children || {}).reduce((sum, child) => sum + countDirectorySize(child), 0);
  }

  function pad(value, width) {
    return String(value).padEnd(width, " ");
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function round(value, digits) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  init();
})();
