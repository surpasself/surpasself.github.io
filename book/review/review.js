const $ = (selector, root = document) => root.querySelector(selector);

const state = {
  book: null,
  issue: "",
  record: null,
  shareEntry: null,
  saveTimer: null,
};

function flashSaved(message = "已在本机保存") {
  const target = $("[data-save-state]");
  target.textContent = message;
  target.classList.add("is-fresh");
  window.setTimeout(() => target.classList.remove("is-fresh"), 900);
}

function persist(patch = {}) {
  state.record = BookJournal.saveRecord({ ...state.record, ...patch });
  flashSaved();
}

function schedulePersist(patch) {
  window.clearTimeout(state.saveTimer);
  state.record = { ...state.record, ...patch };
  $("[data-save-state]").textContent = "正在保存…";
  state.saveTimer = window.setTimeout(() => persist(), 350);
}

function formatIssue(issue) {
  const [year, month] = String(issue).split("-");
  return `${year}.${month}`;
}

function renderRating() {
  const value = Number(state.record.rating || 0);
  $("[data-rating]").value = String(value);
  $("[data-rating-value]").textContent = value ? String(value) : "未评分";
}

function renderEntries() {
  const root = $("[data-entries]");
  const entries = state.record.entries || [];
  $("[data-entry-count]").textContent = String(entries.length);
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty-entries";
    empty.textContent = "还没有摘录。读到真正让你停下来的句子时，再把它留下。";
    root.replaceChildren(empty);
    return;
  }

  root.replaceChildren(...entries.map((entry) => {
    const node = $("#entry-template").content.firstElementChild.cloneNode(true);
    $("[data-entry-location]", node).textContent = entry.location || "未标注位置";
    const date = new Date(entry.created_at);
    $("[data-entry-date]", node).textContent = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("zh-CN");
    $("[data-entry-quote]", node).textContent = entry.quote;
    $("[data-entry-note]", node).textContent = entry.note || "还没有添加自己的想法。";
    $("[data-share-entry]", node).addEventListener("click", () => openShare(entry));
    $("[data-delete-entry]", node).addEventListener("click", () => {
      if (!window.confirm("删除这条摘录和感想？")) return;
      persist({ entries: state.record.entries.filter((item) => item.id !== entry.id) });
      renderEntries();
    });
    return node;
  }));
}

function renderRecord() {
  $("[data-issue]").textContent = formatIssue(state.issue);
  $("[data-title]").textContent = state.book.title;
  $("[data-authors]").textContent = (state.book.authors || []).join(" · ");
  $("[data-status]").value = state.record.status || "unread";
  $("[data-review]").value = state.record.review || "";
  renderRating();
  renderEntries();
}

async function findBook() {
  const params = new URLSearchParams(location.search);
  const issue = params.get("issue") || "";
  const key = params.get("book") || "";
  const historyResponse = await fetch("../data/archive/index.json", { cache: "no-cache" });
  if (!historyResponse.ok) throw new Error("历史索引读取失败");
  const history = await historyResponse.json();
  const entry = (history.issues || []).find((item) => item.issue === issue) || (history.issues || []).find((item) => item.current);
  if (!entry) throw new Error("找不到对应月报");
  const reportResponse = await fetch(`../${entry.url.replace(/^\.\//, "")}`, { cache: "no-cache" });
  if (!reportResponse.ok) throw new Error("月报读取失败");
  const report = await reportResponse.json();
  const book = (report.books || []).find((item) => BookJournal.keyFor(item) === key);
  if (!book) throw new Error("这本书不在对应月报中");
  return { book, issue: report.issue };
}

function wrapText(context, text, maxWidth) {
  const lines = [];
  for (const paragraph of String(text).split(/\n+/)) {
    let line = "";
    for (const char of paragraph) {
      const test = line + char;
      if (context.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function drawShareCard(entry) {
  const canvas = $("[data-share-canvas]");
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#f8f4e8");
  gradient.addColorStop(1, "#e8eddf");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#275fd3";
  context.fillRect(86, 92, 74, 10);
  context.font = "700 24px -apple-system, BlinkMacSystemFont, sans-serif";
  context.letterSpacing = "3px";
  context.fillText("SURPASSELF BOOKS", 86, 154);

  let fontSize = 58;
  let lines = [];
  do {
    context.font = `${fontSize}px Georgia, 'Songti SC', serif`;
    lines = wrapText(context, `“${entry.quote}”`, 890);
    if (lines.length * fontSize * 1.55 <= 720) break;
    fontSize -= 3;
  } while (fontSize > 34);

  context.fillStyle = "#171813";
  context.textBaseline = "top";
  lines.slice(0, 14).forEach((line, index) => context.fillText(line, 86, 270 + index * fontSize * 1.55));

  context.strokeStyle = "#b7b9ae";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(86, 1110);
  context.lineTo(994, 1110);
  context.stroke();

  context.fillStyle = "#254f40";
  context.font = "700 30px -apple-system, BlinkMacSystemFont, sans-serif";
  context.fillText(state.book.title, 86, 1160);
  context.fillStyle = "#696b62";
  context.font = "24px -apple-system, BlinkMacSystemFont, sans-serif";
  const source = [(state.book.authors || []).join(" · "), entry.location].filter(Boolean).join(" · ");
  context.fillText(source, 86, 1212);
  context.textAlign = "right";
  context.fillText("surpasself.github.io/book/", 994, 1270);
  context.textAlign = "left";
}

function openShare(entry) {
  state.shareEntry = entry;
  drawShareCard(entry);
  const dialog = $("[data-share-dialog]");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function canvasBlob() {
  return new Promise((resolve) => $("[data-share-canvas]").toBlob(resolve, "image/png", 1));
}

async function downloadShare() {
  const blob = await canvasBlob();
  if (!blob) return;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${BookJournal.keyFor(state.book)}-quote.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function nativeShare() {
  const blob = await canvasBlob();
  if (!blob) return;
  const file = new File([blob], `${BookJournal.keyFor(state.book)}-quote.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: state.book.title, text: state.shareEntry?.quote || "" });
  } else {
    await downloadShare();
  }
}

$("[data-status]").addEventListener("change", (event) => persist({ status: event.currentTarget.value }));
$("[data-rating]").addEventListener("input", (event) => {
  const rating = Number(event.currentTarget.value);
  state.record.rating = rating;
  renderRating();
  schedulePersist({ rating });
});
$("[data-review]").addEventListener("input", (event) => schedulePersist({ review: event.currentTarget.value }));

$("[data-entry-form]").addEventListener("submit", (event) => {
  event.preventDefault();
  const quote = $("[data-quote]").value.trim();
  if (!quote) return;
  const entry = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    quote,
    note: $("[data-note]").value.trim(),
    location: $("[data-location]").value.trim(),
    created_at: new Date().toISOString(),
  };
  persist({ entries: [entry, ...(state.record.entries || [])] });
  event.currentTarget.reset();
  renderEntries();
});

$("[data-export]").addEventListener("click", () => {
  const blob = new Blob([BookJournal.exportPayload()], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `surpasself-book-journal-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

$("[data-import]").addEventListener("change", async (event) => {
  const file = event.currentTarget.files?.[0];
  if (!file) return;
  try {
    const count = BookJournal.importPayload(await file.text());
    state.record = BookJournal.getRecord(state.book, state.issue);
    renderRecord();
    flashSaved(`已恢复 ${count} 本书的记录`);
  } catch (error) {
    window.alert(error.message || "恢复失败，请检查 JSON 文件。" );
  }
  event.currentTarget.value = "";
});

$("[data-share-close]").addEventListener("click", () => $("[data-share-dialog]").close());
$("[data-download]").addEventListener("click", downloadShare);
$("[data-native-share]").addEventListener("click", () => nativeShare().catch(console.error));

const themeToggle = $("[data-theme-toggle]");
function setTheme(theme) {
  const active = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = active;
  localStorage.setItem("surpasself-theme", active);
  themeToggle.textContent = active === "dark" ? "日间" : "夜间";
}
setTheme(localStorage.getItem("surpasself-theme") || "light");
themeToggle.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));

findBook()
  .then(({ book, issue }) => {
    state.book = book;
    state.issue = issue;
    state.record = BookJournal.getRecord(book, issue);
    renderRecord();
  })
  .catch((error) => {
    $("[data-title]").textContent = "这条书评链接暂时无法读取";
    $("[data-authors]").textContent = error.message;
    console.error(error);
  });
