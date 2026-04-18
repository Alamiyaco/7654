const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const todayDateText = document.getElementById("todayDateText");
const sourceModeText = document.getElementById("sourceModeText");
const sourceMetaText = document.getElementById("sourceMetaText");
const refreshButton = document.getElementById("refreshButton");
const tabsNav = document.getElementById("tabsNav");
const statsSection = document.getElementById("statsSection");
const pageContent = document.getElementById("pageContent");
const searchInput = document.getElementById("searchInput");
const dynamicFilter = document.getElementById("dynamicFilter");
const dynamicFilterBox = document.getElementById("dynamicFilterBox");
const dynamicFilterLabel = document.getElementById("dynamicFilterLabel");
const windowFilter = document.getElementById("windowFilter");
const windowFilterBox = document.getElementById("windowFilterBox");
const windowFilterLabel = document.getElementById("windowFilterLabel");
const contentHeading = document.getElementById("contentHeading");
const contentDescription = document.getElementById("contentDescription");
const pageLegend = document.getElementById("pageLegend");
const evaluationCardTemplate = document.getElementById("evaluationCardTemplate");
const eventCardTemplate = document.getElementById("eventCardTemplate");

const today = new Date();
today.setHours(0, 0, 0, 0);

const pageState = {
  current: getPageFromHash(),
  cache: {},
  requestId: 0,
  loading: false
};

function getPageFromHash() {
  const hash = window.location.hash.replace("#", "");
  return window.APP_CONFIG.pages[hash] ? hash : window.APP_CONFIG.defaultPage;
}

function normalizeText(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");
}

function hasValue(value) {
  return normalizeText(value) !== "";
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsv(csvText) {
  return (csvText || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .map(parseCsvLine);
}

function parseDateValue(value) {
  if (!value && value !== 0) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const clone = new Date(value);
    clone.setHours(0, 0, 0, 0);
    return clone;
  }

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(excelEpoch.getTime() + value * 86400000);
