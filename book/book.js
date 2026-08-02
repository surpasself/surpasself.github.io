const state = {
  report: null,
  filter: "all",
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
  $("[data-byline]", node).textContent = `by ${book.authors.join(" · ")}`;
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
  const updateSave = () => {
    const saved = state.saved.has(book.title);
    save.classList.toggle("is-saved", saved);
    save.textContent = saved ? "✓ 已待读" : "＋ 待读";
    save.setAttribute("aria-pressed", String(saved));
  };
  save.addEventListener("click", () => {
    if (state.saved.has(book.title)) state.saved.delete(book.title);
    else state.saved.add(book.title);
    updateSave();
    persistSaved();
  });
  updateSave();
  return node;
}

function applyFilter() {
  $$(".book-card", $("[data-books]")).forEach((card) => {
    card.hidden = state.filter !== "all" && card.dataset.theme !== state.filter;
  });
}

function renderWatchlist(books) {
  const section = $("[data-watch-section]");
  const root = $("[data-watchlist]");
  if (!books?.length) return;
  section.hidden = false;
  root.replaceChildren(...books.map((book) => {
    const card = document.createElement("article");
    card.className = "watch-card";
    const header = document.createElement("header");
    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = book.title;
    const author = document.createElement("small");
    author.textContent = book.authors.join(" · ");
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
  if (!summary) return;
  $("[data-rejected-section]").hidden = false;
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
  body.replaceChildren(list, examples);
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

async function loadReport() {
  try {
    const response = await fetch("./data/current.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    renderReport(await response.json());
  } catch (error) {
    $("[data-books]").innerHTML = `<div class="loading-card">本期数据暂时未能读取。请稍后刷新，或从首页重新进入。</div>`;
    console.error(error);
  }
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

loadReport();
