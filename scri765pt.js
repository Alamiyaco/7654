const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const windowFilter = document.getElementById("windowFilter");
const statsSection = document.getElementById("statsSection");
const viewRoot = document.getElementById("viewRoot");
const tabsRoot = document.getElementById("tabs");
const pageSubtitle = document.getElementById("pageSubtitle");
const todayDateText = document.getElementById("todayDateText");
const categoryFilterWrap = document.getElementById("categoryFilterWrap");
const windowFilterWrap = document.getElementById("windowFilterWrap");
const evaluationCardTemplate = document.getElementById("evaluationCardTemplate");
const eventCardTemplate = document.getElementById("eventCardTemplate");

const today = new Date();
today.setHours(0, 0, 0, 0);

const appState = {
  activeTabKey: (window.APP_CONFIG?.tabs?.[0]?.key) || "evaluations",
  dataByTab: {},
  sourceByTab: {}
};

function normalizeText(value) {
  return (value || "").toString().trim().toLowerCase();
}

function hasValue(value) {
  return normalizeText(value) !== "";
}

function slugifyArabic(value) {
  return encodeURIComponent((value || "").toString().trim());
}

function formatArabicDate(dateString) {
  const date = parseDateValue(dateString);
  if (!date) return "-";
  return new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function daysDiff(from, to) {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

function getUpcomingLabel(diff) {
  if (diff === 0) return "اليوم";
  if (diff === 1) return "غداً";
  if (diff === 2) return "بعد يومين";
  return `بعد ${diff} أيام`;
}

function getLateLabel(diff) {
  const lateDays = Math.abs(diff);
  if (lateDays === 1) return "متأخر يوم واحد";
  if (lateDays === 2) return "متأخر يومين";
  return `متأخر ${lateDays} أيام`;
}

function parseDateValue(value) {
  if (!value && value !== 0) return null;
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(excelEpoch.getTime() + value * 86400000);
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const parsed = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  const slashMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]) - 1;
    const year = Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3]);
    const parsed = new Date(year, month, day);
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  return null;
}

function toIsoDate(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map(cell => cell.trim());
}

function csvToRows(csvText) {
  return csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(row => row.trim() !== "")
    .map(parseCsvLine);
}

function normalizeHeader(header) {
  return normalizeText(header)
    .replace(/[\s_\-]+/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه");
}

function getRowValue(rowObject, aliases) {
  const entries = Object.entries(rowObject);
  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);
    const found = entries.find(([key]) => normalizeHeader(key) === normalizedAlias);
    if (found && hasValue(found[1])) return found[1];
  }
  return "";
}

function rowsToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header || `column_${index}`] = row[index] ?? "";
    });
    return obj;
  }).filter(obj => Object.values(obj).some(hasValue));
}

function mapEvaluations(rows) {
  const objects = rowsToObjects(rows);
  return objects.map(row => ({
    name: getRowValue(row, ["الاسم", "اسم الموظف", "الموظف", "name", "employee"]),
    department: getRowValue(row, ["القسم", "department", "dept"] ) || "بدون قسم",
    hireDate: toIsoDate(getRowValue(row, ["تاريخ التعيين", "تاريخ المباشرة", "hiredate"])),
    evaluations: [
      {
        type: "التقييم الأول",
        key: "first",
        date: toIsoDate(getRowValue(row, ["تاريخ التقييم الاول", "التقييم الاول", "firstdate", "evaluation1date"])),
        result: getRowValue(row, ["نتيجة التقييم الاول", "نتيجة الاول", "firstresult", "evaluation1result"])
      },
      {
        type: "التقييم الثاني",
        key: "second",
        date: toIsoDate(getRowValue(row, ["تاريخ التقييم الثاني", "التقييم الثاني", "seconddate", "evaluation2date"])),
        result: getRowValue(row, ["نتيجة التقييم الثاني", "نتيجة الثاني", "secondresult", "evaluation2result"])
      },
      {
        type: "التقييم الثالث",
        key: "third",
        date: toIsoDate(getRowValue(row, ["تاريخ التقييم الثالث", "التقييم الثالث", "thirddate", "evaluation3date"])),
        result: getRowValue(row, ["نتيجة التقييم الثالث", "نتيجة الثالث", "thirdresult", "evaluation3result"])
      }
    ].filter(item => item.date),
    finalStatus: getRowValue(row, ["الحاله", "الحالة", "finalstatus", "status"])
  })).filter(item => hasValue(item.name));
}

function mapEvents(rows) {
  const objects = rowsToObjects(rows);
  return objects.map(row => ({
    title: getRowValue(row, ["العنوان", "المناسبة", "اسم المناسبة", "title", "event"]),
    person: getRowValue(row, ["الاسم", "اسم الموظف", "person", "employee"]),
    department: getRowValue(row, ["القسم", "department"]),
    category: getRowValue(row, ["التصنيف", "النوع", "category", "type"]),
    date: toIsoDate(getRowValue(row, ["التاريخ", "date", "eventdate"])),
    note: getRowValue(row, ["ملاحظة", "التفاصيل", "الوصف", "note", "details", "description"]),
    owner: getRowValue(row, ["المسؤول", "الجهة", "owner"])
  })).map(item => ({
    ...item,
    title: item.title || item.person || item.category || "مناسبة"
  })).filter(item => item.date || hasValue(item.title));
}

function getSheetCsvUrl(sheetName) {
  const { spreadsheetId, allOriginsPrefix } = window.APP_CONFIG || {};
  const target = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&sheet=${slugifyArabic(sheetName)}`;
  return `${allOriginsPrefix}${encodeURIComponent(target)}`;
}

async function fetchTabData(tab) {
  const url = getSheetCsvUrl(tab.sheetName);
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    const rows = csvToRows(text);
    if (rows.length < 2) throw new Error("No rows");
    const data = tab.type === "evaluations" ? mapEvaluations(rows) : mapEvents(rows);
    if (!data.length) throw new Error("No mapped rows");
    appState.dataByTab[tab.key] = data;
    appState.sourceByTab[tab.key] = "sheet";
    return;
  } catch (error) {
    if (tab.type === "evaluations") {
      appState.dataByTab[tab.key] = window.APP_FALLBACK_DATA?.evaluations || [];
    } else {
      appState.dataByTab[tab.key] = window.APP_FALLBACK_DATA?.events?.[tab.sheetName] || [];
    }
    appState.sourceByTab[tab.key] = "fallback";
    console.warn(`تعذر تحميل صفحة الشيت: ${tab.sheetName}`, error);
  }
}

function getActiveTab() {
  return (window.APP_CONFIG?.tabs || []).find(tab => tab.key === appState.activeTabKey) || window.APP_CONFIG.tabs[0];
}

function buildTabs() {
  tabsRoot.innerHTML = "";
  (window.APP_CONFIG?.tabs || []).forEach(tab => {
    const btn = document.createElement("button");
    btn.className = `tab-btn ${tab.key === appState.activeTabKey ? "active" : ""}`;
    btn.textContent = tab.label;
    btn.type = "button";
    btn.addEventListener("click", () => {
      appState.activeTabKey = tab.key;
      buildTabs();
      prepareFilters();
      render();
    });
    tabsRoot.appendChild(btn);
  });
}

function flattenEvaluations(source) {
  const items = [];
  source.forEach(employee => {
    (employee.evaluations || []).forEach(evaluation => {
      if (!evaluation.date) return;
      const date = parseDateValue(evaluation.date);
      if (!date) return;
      items.push({
        name: employee.name,
        department: employee.department || "بدون قسم",
        type: evaluation.type,
        key: evaluation.key,
        result: evaluation.result,
        completed: hasValue(evaluation.result),
        date: toIsoDate(evaluation.date),
        diffDays: daysDiff(today, date)
      });
    });
  });
  return items.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function filterTextPass(item, extraFields = []) {
  const q = normalizeText(searchInput.value);
  if (!q) return true;
  return [
    item.name,
    item.department,
    item.title,
    item.person,
    item.category,
    item.note,
    item.owner,
    ...extraFields
  ].some(value => normalizeText(value).includes(q));
}

function prepareFilters() {
  const activeTab = getActiveTab();
  const data = appState.dataByTab[activeTab.key] || [];

  pageSubtitle.textContent = activeTab.type === "evaluations"
    ? "تعرض التقييمات المتأخرة، المستحقة اليوم، والقادمة. أي حقل نتيجة يحتوي قيمة يُعتبر التقييم منجزاً."
    : `تعرض بيانات صفحة ${activeTab.label} من الشيت بشكل مرتب وقابل للبحث.`;

  categoryFilter.innerHTML = '<option value="">الكل</option>';

  if (activeTab.type === "evaluations") {
    categoryFilterWrap.style.display = "flex";
    windowFilterWrap.style.display = "flex";
    const departments = [...new Set(data.map(item => item.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
    departments.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      categoryFilter.appendChild(option);
    });
  } else {
    categoryFilterWrap.style.display = "flex";
    windowFilterWrap.style.display = "flex";
    const categories = [...new Set(data.map(item => item.category || item.department || item.owner).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
    categories.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      categoryFilter.appendChild(option);
    });
  }
}

function createStatCard(label, value, className = "") {
  return `<article class="stat-card ${className}"><span>${label}</span><strong>${value}</strong></article>`;
}

function createEvaluationCard(item, mode = "upcoming") {
  const node = evaluationCardTemplate.content.cloneNode(true);
  const card = node.querySelector(".employee-card");
  node.querySelector(".employee-name").textContent = item.name;
  node.querySelector(".employee-meta").textContent = `${item.department} • ${item.type}`;

  const badge = node.querySelector(".eval-type");
  badge.textContent = item.type;
  badge.classList.add(item.key || "first");

  node.querySelector(".date-pill").textContent = formatArabicDate(item.date);

  const daysEl = node.querySelector(".days-left");
  if (mode === "late") {
    card.classList.add("is-late");
    daysEl.textContent = getLateLabel(item.diffDays);
    daysEl.classList.add("is-late");
  } else if (mode === "today") {
    daysEl.textContent = "مستحق اليوم";
  } else {
    daysEl.textContent = getUpcomingLabel(item.diffDays);
  }

  return node;
}

function createEventCard(item, badgeText) {
  const node = eventCardTemplate.content.cloneNode(true);
  const card = node.querySelector(".event-card");
  const diff = item.date ? daysDiff(today, parseDateValue(item.date)) : null;

  node.querySelector(".event-title").textContent = item.title || "مناسبة";
  node.querySelector(".event-meta").textContent = [item.person, item.department].filter(Boolean).join(" • ") || (item.owner || "-");
  node.querySelector(".event-badge").textContent = item.category || badgeText || "مناسبة";
  node.querySelector(".event-body").textContent = item.note || "لا توجد تفاصيل إضافية.";
  node.querySelector(".date-pill").textContent = item.date ? formatArabicDate(item.date) : "بدون تاريخ";

  const daysEl = node.querySelector(".days-left");
  if (diff === null) {
    daysEl.textContent = "-";
  } else if (diff < 0) {
    card.classList.add("is-late");
    daysEl.textContent = getLateLabel(diff);
    daysEl.classList.add("is-late");
  } else {
    daysEl.textContent = getUpcomingLabel(diff);
  }

  return node;
}

function renderEmpty(target, text) {
  target.innerHTML = `<div class="empty-state">${text}</div>`;
}

function renderEvaluations() {
  const source = appState.dataByTab[getActiveTab().key] || [];
  const flattened = flattenEvaluations(source);
  const selectedCategory = categoryFilter.value;
  const maxDays = Number(windowFilter.value);

  const lateItems = [];
  const todayItems = [];
  const upcomingItems = [];
  const employeeNames = new Set();

  flattened.forEach(item => {
    const matchesText = filterTextPass(item);
    const matchesCategory = !selectedCategory || item.department === selectedCategory;
    if (!(matchesText && matchesCategory)) return;

    employeeNames.add(item.name);
    if (item.completed) return;

    if (item.diffDays < 0) lateItems.push(item);
    else if (item.diffDays === 0) todayItems.push(item);
    else if (item.diffDays <= maxDays) upcomingItems.push(item);
  });

  lateItems.sort((a, b) => a.diffDays - b.diffDays);
  upcomingItems.sort((a, b) => a.diffDays - b.diffDays);

  statsSection.innerHTML = [
    createStatCard("التقييمات المتأخرة", lateItems.length, "stat-danger"),
    createStatCard("تقييمات اليوم", todayItems.length),
    createStatCard("التقييمات القادمة", upcomingItems.length),
    createStatCard("إجمالي الموظفين", employeeNames.size || source.length)
  ].join("");

  viewRoot.innerHTML = `
    <main class="grid-layout three-columns">
      <section class="panel late-panel">
        <div class="panel-head"><div><h2>التقييمات المتأخرة</h2><p>أي تقييم مضى وقته ونتيجته ما زالت فارغة</p></div></div>
        <div id="lateList" class="cards-list"></div>
      </section>
      <section class="panel urgent-panel">
        <div class="panel-head"><div><h2>المفروض يتقيمون اليوم</h2><p>التقييمات المستحقة اليوم وغير المنجزة</p></div></div>
        <div id="todayList" class="cards-list"></div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2>التقييمات القادمة</h2><p>مرتبة من الأقرب إلى الأبعد</p></div></div>
        <div id="upcomingList" class="cards-list"></div>
        <div class="source-note">المصدر الحالي: ${appState.sourceByTab[getActiveTab().key] === "sheet" ? "Google Sheet" : "بيانات احتياطية محلية"}</div>
      </section>
    </main>`;

  const lateList = document.getElementById("lateList");
  const todayList = document.getElementById("todayList");
  const upcomingList = document.getElementById("upcomingList");

  if (lateItems.length) lateItems.forEach(item => lateList.appendChild(createEvaluationCard(item, "late")));
  else renderEmpty(lateList, "ممتاز، لا توجد تقييمات متأخرة حالياً.");

  if (todayItems.length) todayItems.forEach(item => todayList.appendChild(createEvaluationCard(item, "today")));
  else renderEmpty(todayList, "لا توجد تقييمات مستحقة اليوم حسب الفلاتر الحالية.");

  if (upcomingItems.length) upcomingItems.forEach(item => upcomingList.appendChild(createEvaluationCard(item, "upcoming")));
  else renderEmpty(upcomingList, "لا توجد تقييمات قادمة ضمن الفترة المختارة.");
}

function renderEvents() {
  const activeTab = getActiveTab();
  const source = appState.dataByTab[activeTab.key] || [];
  const selectedCategory = categoryFilter.value;
  const maxDays = Number(windowFilter.value);

  const filtered = source.filter(item => {
    const matchesText = filterTextPass(item);
    const matchesCategory = !selectedCategory || [item.category, item.department, item.owner].includes(selectedCategory);
    const diff = item.date ? daysDiff(today, parseDateValue(item.date)) : 0;
    const matchesWindow = maxDays === 9999 || diff <= maxDays;
    return matchesText && matchesCategory && matchesWindow;
  }).sort((a, b) => {
    const da = parseDateValue(a.date)?.getTime() || 0;
    const db = parseDateValue(b.date)?.getTime() || 0;
    return da - db;
  });

  const upcomingCount = filtered.filter(item => item.date && daysDiff(today, parseDateValue(item.date)) >= 0).length;
  const lateCount = filtered.filter(item => item.date && daysDiff(today, parseDateValue(item.date)) < 0).length;
  const uniqueCategories = new Set(filtered.map(item => item.category).filter(Boolean));

  statsSection.innerHTML = [
    createStatCard("عدد المناسبات", filtered.length),
    createStatCard("القادمة", upcomingCount),
    createStatCard("المنتهية", lateCount, lateCount ? "stat-danger" : ""),
    createStatCard("عدد التصنيفات", uniqueCategories.size || 1)
  ].join("");

  viewRoot.innerHTML = `
    <main class="grid-layout two-columns">
      <section class="panel">
        <div class="panel-head"><div><h2>${activeTab.label}</h2><p>عرض مرتب وقابل للبحث حسب بيانات الشيت</p></div></div>
        <div id="eventsList" class="cards-list"></div>
        <div class="source-note">المصدر الحالي: ${appState.sourceByTab[activeTab.key] === "sheet" ? "Google Sheet" : "بيانات احتياطية محلية"}</div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2>ملخص سريع</h2><p>نظرة عامة على الصفحة الحالية</p></div></div>
        <div class="cards-list">
          <div class="empty-state">يمكنك استخدام البحث والفلاتر بالأعلى لعرض المناسبات حسب التاريخ أو التصنيف أو الاسم.</div>
          <div class="empty-state">في حال لم يتم تحميل الشيت، سيعرض الموقع بيانات احتياطية مؤقتة بدل أن يتعطل.</div>
        </div>
      </section>
    </main>`;

  const eventsList = document.getElementById("eventsList");
  if (filtered.length) filtered.forEach(item => eventsList.appendChild(createEventCard(item, activeTab.badge)));
  else renderEmpty(eventsList, "لا توجد عناصر مطابقة ضمن الفلاتر الحالية.");
}

function render() {
  const activeTab = getActiveTab();
  if (activeTab.type === "evaluations") renderEvaluations();
  else renderEvents();
}

async function init() {
  todayDateText.textContent = new Intl.DateTimeFormat("ar-IQ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(today);

  for (const tab of window.APP_CONFIG.tabs) {
    await fetchTabData(tab);
  }

  buildTabs();
  prepareFilters();
  render();

  [searchInput, categoryFilter, windowFilter].forEach(el => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });
}

init();
