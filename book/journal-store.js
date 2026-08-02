(function initializeBookJournal(global) {
  const STORAGE_KEY = "surpasself-book-journal-v1";
  const SCHEMA_VERSION = 1;

  function emptyStore() {
    return { schema_version: SCHEMA_VERSION, records: {} };
  }

  function readStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object" || typeof parsed.records !== "object") return emptyStore();
      return { schema_version: SCHEMA_VERSION, records: parsed.records };
    } catch {
      return emptyStore();
    }
  }

  function writeStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema_version: SCHEMA_VERSION, records: store.records || {} }));
  }

  function normalizeTitle(title) {
    return String(title || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9\u3400-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96);
  }

  function keyFor(book) {
    return String(book?.isbn || "").replace(/[^0-9Xx]/g, "") || normalizeTitle(book?.title) || "untitled";
  }

  function baseRecord(book, issue) {
    return {
      key: keyFor(book),
      issue: issue || "",
      title: book?.title || "未命名书目",
      authors: Array.isArray(book?.authors) ? book.authors : [],
      isbn: book?.isbn || "",
      status: "unread",
      rating: 0,
      review: "",
      entries: [],
      updated_at: new Date().toISOString(),
    };
  }

  function getRecord(book, issue) {
    const store = readStore();
    return store.records[keyFor(book)] || baseRecord(book, issue);
  }

  function saveRecord(record) {
    const store = readStore();
    const normalized = {
      ...baseRecord(record, record.issue),
      ...record,
      key: record.key || keyFor(record),
      entries: Array.isArray(record.entries) ? record.entries : [],
      updated_at: new Date().toISOString(),
    };
    store.records[normalized.key] = normalized;
    writeStore(store);
    return normalized;
  }

  function setStatus(book, issue, status) {
    return saveRecord({ ...getRecord(book, issue), status });
  }

  function records() {
    return Object.values(readStore().records);
  }

  function exportPayload() {
    return JSON.stringify({ ...readStore(), exported_at: new Date().toISOString() }, null, 2);
  }

  function importPayload(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || typeof parsed.records !== "object" || Array.isArray(parsed.records)) {
      throw new Error("这不是有效的 Surpasself Books 读书记录文件。");
    }
    const current = readStore();
    current.records = { ...current.records, ...parsed.records };
    writeStore(current);
    return Object.keys(parsed.records).length;
  }

  global.BookJournal = {
    STORAGE_KEY,
    keyFor,
    getRecord,
    saveRecord,
    setStatus,
    records,
    exportPayload,
    importPayload,
  };
})(window);
