const state = {
  report: null,
  history: [],
  filter: "all",
  candidateFilter: "all",
  candidateSearch: "",
  candidates: [],
  auditScanned: 0,
  saved: new Set(JSON.parse(localStorage.getItem("surpasself-books-saved") || "[]")),
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function formatIssue(issue) {
  const [year, month] = String(issue).split("-");
  return `${year}.${month}`;
}

function formatDate(value) {
  if (!value) return "日期待核验";
  const parts = value.split("-");
  return parts.length >= 2 ? `${parts[0]} 年 ${Number(parts[1])} 月${parts[2] ? ` ${Number(parts[2])} 日` : ""}` : value;
}

function persistSaved() {
  localStorage.setItem("surpasself-books-saved", JSON.stringify([...state.saved]));
  $("[data-saved-count]").textContent = String(state.saved.size);
}

function reviewUrl(book) {
  const params = new URLSearchParams({ issue: state.report.issue, book: BookJournal.keyFor(book) });
  return `./review/?${params}`;
}

function renderBook(book, index) {
  const node = $("#book-card-template").content.firstElementChild.cloneNode(true);
  node.dataset.theme = book.theme || "other";
  $("[data-rank]", node).textContent = String(index + 1).padStart(2, "0");
  $("[data-cover-title]", node).textContent = book.title;
  const cover = $("[data-cover]", node);
  if (book.cover) {
    cover.src = book.cover;
    cover.alt = `${book.title} 封面`;
    cover.addEventListener("error", () => cover.classList.add("is-missing"));
  } else {
    cover.classList.add("is-missing");
  }
  $("[data-score]", node).textContent = String(book.score);
  $("[data-category]", node).textContent = book.category;
  $("[data-date]", node).textContent = formatDate(book.published);
  $("[data-title]", node).textContent = book.title;
  const subtitle = $("[data-subtitle]", node);
  subtitle.textContent = book.subtitle || "";
  subtitle.hidden = !book.subtitle;
  $("[data-byline]", node).textContent = `by ${(book.authors || []).join(" · ")}`;
  $("[data-thesis]", node).textContent = book.thesis;
  $("[data-fit]", node).textContent = book.fit;
  $("[data-evidence]", node).textContent = book.evidence;
  $("[data-caveat]", node).textContent = book.caveat;
  $("[data-meta]", node).textContent = [book.publisher, book.pages ? `${book.pages} 页` : "页数待核验", book.isbn ? `ISBN ${book.isbn}` : ""].filter(Boolean).join(" · ");

  const sources = $("[data-sources]", node);
  (book.sources || []).filter((source) => source.url).forEach((source) => {
    const link = document.createElement("a");
    link.className = "source-link";
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = `${source.label} ↗`;
    sources.append(link);
  });

  const save = $("[data-save]", node);
  const complete = $("[data-complete]", node);
  const review = $("[data-review]", node);
  review.href = reviewUrl(book);

  const refreshPersonalState = () => {
    const saved = state.saved.has(book.title);
    const record = BookJournal.getRecord(book, state.report.issue);
    const finished = record.status === "finished";
    save.classList.toggle("is-saved", saved);
    save.textContent = saved ? "✓ 已待读" : "＋ 待读";
    save.setAttribute("aria-pressed", String(saved));
    complete.classList.toggle("is-complete", finished);
    complete.textContent = finished ? "✓ 已完成" : "标记完成";
    complete.setAttribute("aria-pressed", String(finished));
    review.textContent = record.entries?.length || record.review ? "继续记录 →" : "写书评 →";
  };

  save.addEventListener("click", () => {
    if (state.saved.has(book.title)) state.saved.delete(book.title);
    else state.saved.add(book.title);
    persistSaved();
    refreshPersonalState();
  });
  complete.addEventListener("click", () => {
    const record = BookJournal.getRecord(book, state.report.issue);
    BookJournal.setStatus(book, state.report.issue, record.status === "finished" ? "unread" : "finished");
    refreshPersonalState();
  });
  refreshPersonalState();
  return node;
}

function applyFilter() {
  $$(".book-card", $("[data-books]")).forEach((card) => {
    card.hidden = state.filter !== "all" && card.dataset.theme !== state.filter;
  });
}

function renderWatchlist(books = []) {
  const section = $("[data-watch-section]");
  const root = $("[data-watchlist]");
  section.hidden = !books.length;
  if (!books.length) {
    root.replaceChildren();
    return;
  }
  root.replaceChildren(...books.map((book) => {
    const card = document.createElement("article");
    card.className = "watch-card";
    const header = document.createElement("header");
    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = book.title;
    const author = document.createElement("small");
    author.textContent = (book.authors || []).join(" · ");
    const score = document.createElement("span");
    score.textContent = String(book.score);
    titleWrap.append(title, author);
    header.append(titleWrap, score);
    const thesis = document.createElement("p");
    thesis.textContent = book.thesis;
    const caveat = document.createElement("p");
    caveat.className = "watch-caveat";
    caveat.textContent = `暂缓原因：${book.caveat}`;
    card.append(header, thesis, caveat);
    return card;
  }));
}

function renderRejected(summary) {
  const section = $("[data-rejected-section]");
  if (!summary) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  $("[data-rejected-count]").textContent = String(summary.count || 0);
  const body = $("[data-rejected-body]");
  const list = document.createElement("ul");
  (summary.reasons || []).forEach((reason) => {
    const item = document.createElement("li");
    item.textContent = reason;
    list.append(item);
  });
  const examples = document.createElement("div");
  (summary.examples || []).forEach((example) => {
    const item = document.createElement("article");
    item.className = "rejected-example";
    const title = document.createElement("strong");
    title.textContent = example.title;
    const reason = document.createElement("p");
    reason.textContent = example.reason;
    item.append(title, reason);
    examples.append(item);
  });
  const fullAudit = document.createElement("button");
  fullAudit.className = "open-audit-button";
  fullAudit.type = "button";
  fullAudit.textContent = "查看完整候选清单 →";
  fullAudit.addEventListener("click", openCandidateDialog);
  examples.append(fullAudit);
  body.replaceChildren(list, examples);
}

function editorialCandidate(book, status) {
  return {
    ...book,
    status,
    reason: status === "recommend" ? "经出版社资料、作者背景与独立材料复核后，进入正式推荐。" : book.caveat,
    source_url: book.sources?.[0]?.url || "",
    origin: "editorial",
  };
}

function mergeCandidates(report, audit) {
  const merged = new Map();
  (audit?.candidates || report.candidates || []).forEach((book) => {
    merged.set(BookJournal.keyFor(book), { ...book, origin: "automatic" });
  });
  (report.watchlist || []).forEach((book) => merged.set(BookJournal.keyFor(book), editorialCandidate(book, "watch")));
  (report.books || []).forEach((book) => merged.set(BookJournal.keyFor(book), editorialCandidate(book, "recommend")));
  return [...merged.values()];
}

function renderCandidateList() {
  const root = $("[data-candidate-list]");
  const term = state.candidateSearch.trim().toLowerCase();
  const visible = state.candidates.filter((book) => {
    const statusMatch = state.candidateFilter === "all" || book.status === state.candidateFilter;
    const text = [book.title, ...(book.authors || []), book.publisher, book.reason].join(" ").toLowerCase();
    return statusMatch && (!term || text.includes(term));
  });

  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "candidate-empty";
    empty.textContent = "没有符合当前筛选条件的候选。";
    root.replaceChildren(empty);
    return;
  }

  root.replaceChildren(...visible.map((book) => {
    const card = document.createElement("article");
    card.className = "candidate-card";
    card.dataset.status = book.status;
    const top = document.createElement("div");
    const status = document.createElement("span");
    status.className = "candidate-status";
    status.textContent = { recommend: "正式推荐", watch: "观察", reject: "未入选" }[book.status] || book.status;
    const score = document.createElement("strong");
    score.textContent = `${book.score ?? "—"}/100`;
    top.append(status, score);
    const title = document.createElement("h3");
    title.textContent = book.title;
    const meta = document.createElement("p");
    meta.className = "candidate-meta";
    meta.textContent = [(book.authors || []).join(" · "), book.publisher, formatDate(book.published)].filter(Boolean).join(" · ");
    const reason = document.createElement("p");
    reason.className = "candidate-reason";
    reason.textContent = book.reason || "当前没有足够材料支持进入正式推荐。";
    card.append(top, title, meta, reason);
    if (book.source_url) {
      const link = document.createElement("a");
      link.href = book.source_url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "查看书目信息 ↗";
      card.append(link);
    }
    return card;
  }));
}

function renderCandidateAudit(report, audit) {
  state.auditScanned = audit?.scanned ?? report.scanned ?? 0;
  state.candidates = mergeCandidates(report, audit);
  $("[data-scanned]").textContent = String(state.auditScanned);
  $("[data-audit-all]").textContent = String(state.candidates.length);
  const automaticCount = state.candidates.filter((book) => book.origin === "automatic").length;
  const editorialCount = state.candidates.length - automaticCount;
  $("[data-candidate-note]").textContent = `自动扫描 ${automaticCount} 本；另有 ${editorialCount} 本经编辑级资料复核。每一本都显示去留理由。`;
  const rejectedCount = state.candidates.filter((book) => book.status === "reject").length;
  if (rejectedCount) $("[data-rejected-count]").textContent = String(rejectedCount);
  renderCandidateList();
}

function renderReport(report) {
  state.report = report;
  $("[data-issue]").textContent = formatIssue(report.issue);
  $("[data-selected-count]").textContent = String(report.selected_count ?? report.books.length);
  $("[data-scanned]").textContent = String(report.scanned ?? "—");
  $("[data-headline]").textContent = report.headline;
  $("[data-editor-note]").textContent = report.editor_note;
  $("[data-books]").replaceChildren(...report.books.map(renderBook));
  renderWatchlist(report.watchlist);
  renderRejected(report.rejected_summary);
  applyFilter();
  persistSaved();
}

function renderHistory(selectedIssue) {
  const select = $("[data-issue-select]");
  select.replaceChildren(...state.history.map((entry) => {
    const option = document.createElement("option");
    option.value = entry.issue;
    option.textContent = `${formatIssue(entry.issue)} · ${entry.selected_count} 本${entry.current ? "（本期）" : ""}`;
    option.selected = entry.issue === selectedIssue;
    return option;
  }));
  select.disabled = state.history.length < 2;
}

async function loadIssue(entry) {
  const response = await fetch(entry.url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const report = await response.json();
  renderReport(report);
  renderHistory(report.issue);
  let audit = null;
  if (entry.candidate_url) {
    try {
      const auditResponse = await fetch(entry.candidate_url, { cache: "no-cache" });
      if (auditResponse.ok) audit = await auditResponse.json();
    } catch (error) {
      console.warn("Candidate audit unavailable", error);
    }
  }
  renderCandidateAudit(report, audit);
}

async function loadInitialReport() {
  try {
    const historyResponse = await fetch("./data/archive/index.json", { cache: "no-cache" });
    if (historyResponse.ok) state.history = (await historyResponse.json()).issues || [];
    if (!state.history.length) {
      state.history = [{ issue: "current", url: "./data/current.json", candidate_url: "./data/candidate-audit.json", current: true }];
    }
    const requested = new URLSearchParams(location.search).get("issue");
    const entry = state.history.find((item) => item.issue === requested) || state.history.find((item) => item.current) || state.history[0];
    await loadIssue(entry);
  } catch (error) {
    $("[data-books]").innerHTML = "<div class=\"loading-card\">本期数据暂时未能读取。请稍后刷新，或从首页重新进入。</div>";
    console.error(error);
  }
}

function openCandidateDialog() {
  const dialog = $("[data-candidate-dialog]");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

$$('[data-filter]').forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    $$('[data-filter]').forEach((item) => item.classList.toggle("is-active", item === button));
    applyFilter();
  });
});

$("[data-copy-list]").addEventListener("click", async (event) => {
  const titles = [...state.saved];
  const text = titles.length ? titles.map((title, index) => `${index + 1}. ${title}`).join("\n") : "本月还没有加入待读的书。";
  try {
    await navigator.clipboard.writeText(text);
    const original = event.currentTarget.firstChild.textContent;
    event.currentTarget.firstChild.textContent = "已复制 ";
    window.setTimeout(() => { event.currentTarget.firstChild.textContent = original; }, 1400);
  } catch {
    window.prompt("复制待读清单", text);
  }
});

$("[data-rejected-toggle]").addEventListener("click", (event) => {
  const body = $("[data-rejected-body]");
  const open = body.hidden;
  body.hidden = !open;
  event.currentTarget.setAttribute("aria-expanded", String(open));
});

$("[data-candidates-open]").addEventListener("click", openCandidateDialog);
$("[data-candidates-close]").addEventListener("click", () => $("[data-candidate-dialog]").close());
$("[data-candidate-search]").addEventListener("input", (event) => {
  state.candidateSearch = event.currentTarget.value;
  renderCandidateList();
});
$$('[data-candidate-filter]').forEach((button) => {
  button.addEventListener("click", () => {
    state.candidateFilter = button.dataset.candidateFilter;
    $$('[data-candidate-filter]').forEach((item) => item.classList.toggle("is-active", item === button));
    renderCandidateList();
  });
});
$("[data-candidate-dialog]").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});

$("[data-issue-select]").addEventListener("change", async (event) => {
  const entry = state.history.find((item) => item.issue === event.currentTarget.value);
  if (!entry) return;
  try {
    await loadIssue(entry);
    history.replaceState(null, "", `?issue=${encodeURIComponent(entry.issue)}#monthly-picks`);
  } catch (error) {
    console.error(error);
  }
});

const navToggle = $("[data-nav-toggle]");
const navLinks = $("[data-nav-links]");
navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(open));
});

const themeToggle = $("[data-theme-toggle]");
function setTheme(theme) {
  const active = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = active;
  localStorage.setItem("surpasself-theme", active);
  themeToggle.textContent = active === "dark" ? "日间" : "夜间";
}
setTheme(localStorage.getItem("surpasself-theme") || "light");
themeToggle.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));

window.addEventListener("pageshow", () => {
  if (state.report) {
    renderReport(state.report);
    if (state.auditScanned) $("[data-scanned]").textContent = String(state.auditScanned);
  }
});

loadInitialReport();
