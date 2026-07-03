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

const languageSelect = document.querySelector("[data-language-select]");
const supportedLanguages = new Set(["zh-CN"]);
const savedLanguage = localStorage.getItem("surpasself-language") || "zh-CN";
const activeLanguage = supportedLanguages.has(savedLanguage) ? savedLanguage : "zh-CN";

document.documentElement.lang = activeLanguage;
if (languageSelect) {
  languageSelect.value = activeLanguage;
  languageSelect.addEventListener("change", () => {
    const nextLanguage = supportedLanguages.has(languageSelect.value) ? languageSelect.value : "zh-CN";
    localStorage.setItem("surpasself-language", nextLanguage);
    document.documentElement.lang = nextLanguage;
    languageSelect.value = nextLanguage;
  });
}

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
