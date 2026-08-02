const filterButtons = document.querySelectorAll("[data-filter]");
const projectCards = document.querySelectorAll("[data-tags]");

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    projectCards.forEach((card) => {
      const tags = card.dataset.tags.split(" ");
      const visible = filter === "all" || tags.includes(filter);
      card.hidden = !visible;
    });
  });
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = document.querySelector(button.dataset.copy);
    if (!target) return;
    await navigator.clipboard.writeText(target.textContent.trim());
    const original = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1400);
  });
});

const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelector("[data-nav-links]");
navToggle?.addEventListener("click", () => {
  const open = navLinks?.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(Boolean(open)));
});

const translations = {
  "zh-CN": {
    "nav.home": "Home",
    "nav.open": "打开 Voice",
    "nav.book": "Book",
    "language.label": "语言",
    "theme.toggle": "夜间",
    "hero.eyebrow": "Local-first voice workspace",
    "hero.lead": "从空白开始录音、转写、整理成 Markdown。内容优先留在本地，适合把临时想法变成可以继续推进的文档。",
    "hero.primary": "打开 Voice",
    "hero.secondary": "查看当前版本",
    "card.status": "可本地使用",
    "card.tag": "PWA",
    "card.copy": "先记录，再整理；没有默认成型文本，用户说什么就从什么开始。",
    "metric.record": "Record",
    "metric.edit": "Edit",
    "metric.save": "Save",
    "flow.eyebrow": "Current focus",
    "flow.title": "先把 Voice 做稳。",
    "flow.copy": "本页只介绍 Voice。个性化新书工具已放在独立的 Book 分区，避免两套功能和信息混在一起。",
    "step.oneTag": "Blank",
    "step.oneTitle": "空白开始",
    "step.oneCopy": "首次打开不再预置项目文档。用户可以直接录音，也可以在转写区手动输入。",
    "step.twoTag": "Markdown",
    "step.twoTitle": "按需整理",
    "step.twoCopy": "只有点击整理后，才把新增口述追加为 Markdown；手动改过的内容不会被自动删掉。",
    "step.threeTag": "Local",
    "step.threeTitle": "本地优先",
    "step.threeCopy": "浏览器本地保存是基础能力；跨设备和 MCP 后续作为增强能力继续迭代。",
    "footer.copy": "Voice product preview",
  },
  en: {
    "nav.home": "Home",
    "nav.open": "Open Voice",
    "nav.book": "Book",
    "language.label": "Language",
    "theme.toggle": "Dark",
    "hero.eyebrow": "Local-first voice workspace",
    "hero.lead": "Start from a blank page. Record, transcribe, and turn spoken ideas into Markdown while keeping the core workflow local-first.",
    "hero.primary": "Open Voice",
    "hero.secondary": "Current version",
    "card.status": "Local-ready",
    "card.tag": "PWA",
    "card.copy": "Capture first, organize later. No starter document is inserted before you speak.",
    "metric.record": "Record",
    "metric.edit": "Edit",
    "metric.save": "Save",
    "flow.eyebrow": "Current focus",
    "flow.title": "Make Voice solid first.",
    "flow.copy": "This page is only for Voice. Personalized book discovery lives in the separate Book section so the two products do not mix.",
    "step.oneTag": "Blank",
    "step.oneTitle": "Blank start",
    "step.oneCopy": "The app no longer loads a prewritten project document. Record or type first.",
    "step.twoTag": "Markdown",
    "step.twoTitle": "Organize on demand",
    "step.twoCopy": "Markdown is generated only when you ask for it. Manual edits are not removed automatically.",
    "step.threeTag": "Local",
    "step.threeTitle": "Local first",
    "step.threeCopy": "Browser storage is the foundation. Cross-device sync and MCP can grow as advanced capabilities.",
    "footer.copy": "Voice product preview",
  },
};

const supportedLanguages = new Set(Object.keys(translations));
const languageSelect = document.querySelector("[data-language-select]");
const themeToggle = document.querySelector("[data-theme-toggle]");

function setLanguage(language) {
  const activeLanguage = supportedLanguages.has(language) ? language : "zh-CN";
  document.documentElement.lang = activeLanguage;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const value = translations[activeLanguage][node.dataset.i18n];
    if (value) node.textContent = value;
  });
  if (languageSelect) languageSelect.value = activeLanguage;
  localStorage.setItem("surpasself-language", activeLanguage);
}

function setTheme(theme) {
  const activeTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = activeTheme;
  localStorage.setItem("surpasself-theme", activeTheme);
  if (themeToggle) {
    const language = localStorage.getItem("surpasself-language") || "zh-CN";
    themeToggle.textContent =
      activeTheme === "dark"
        ? language === "en"
          ? "Light"
          : "日间"
        : language === "en"
          ? "Dark"
          : "夜间";
  }
}

const savedLanguage = localStorage.getItem("surpasself-language") || "zh-CN";
const savedTheme = localStorage.getItem("surpasself-theme") || "light";
setLanguage(savedLanguage);
setTheme(savedTheme);

languageSelect?.addEventListener("change", () => {
  setLanguage(languageSelect.value);
  setTheme(document.documentElement.dataset.theme);
});

themeToggle?.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
