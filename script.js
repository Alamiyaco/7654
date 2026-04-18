const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const todayDateText = document.getElementById("todayDateText");
const tabsNav = document.getElementById("tabsNav");
const statsSection = document.getElementById("statsSection");
const pageContent = document.getElementById("pageContent");
const searchInput = document.getElementById("searchInput");
const dynamicFilter = document.getElementById("dynamicFilter");
const dynamicFilterBox = document.getElementById("dynamicFilterBox");
const windowFilter = document.getElementById("windowFilter");
const windowFilterBox = document.getElementById("windowFilterBox");
const evaluationCardTemplate = document.getElementById("evaluationCardTemplate");
const eventCardTemplate = document.getElementById("eventCardTemplate");

const today = new Date();
today.setHours(0, 0, 0, 0);

const pageState = {
  current: window.APP_CONFIG?.defaultPage || "evaluations",
  cache: {}
};

function normalizeText(value) {
  return (value || "").toString().trim().toLowerCase();
}

function hasValue(value) {
  return normalizeText(value) !== "";
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
  return result.map((cell) => cell.trim());
}

function parseCsv(csvText) {
  return csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((row) => row.trim() !== "")
    .map(parseCsvLine);
}

function parseDateValue(value) {
  if (value === null || value === undefined || value === "") return null;

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
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
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

function buildCsvUrl(sheetName) {
  const spreadsheetId = window.APP_CONFIG?.spreadsheetId;
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(base)}`;
}

function createStatCard(label, value, extraClass = "") {
  return `
    <article class="stat-card ${extraClass}">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function renderEmpty(target, text) {
  target.innerHTML = `<div class="empty-state">${text}</div>`;
}

function createPanel(title, subtitle, listId, classes = "") {
  return `
    <section class="panel ${classes}">
      <div class="panel-head">
        <div>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
      </div>
      <div id="${listId}" class="cards-list"></div>
    </section>
  `;
}

function getEvaluationBadgeClass(key) {
  if (key === "first") return "first";
  if (key === "second") return "second";
  return "third";
}

function createEvaluationCard(item, mode = "upcoming") {
  const node = evaluationCardTemplate.content.cloneNode(true);
  const card = node.querySelector(".employee-card");
  node.querySelector(".employee-name").textContent = item.name || "-";
  node.querySelector(".employee-meta").textContent = `${item.department || "بدون قسم"} • ${item.type}`;

  const badge = node.querySelector(".eval-type");
  badge.textContent = item.type;
  badge.classList.add(getEvaluationBadgeClass(item.key));

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

function createEventCard(item, badgeClass) {
  const node = eventCardTemplate.content.cloneNode(true);
  const card = node.querySelector(".event-card");

  node.querySelector(".event-title").textContent = item.title || item.name || "-";
  node.querySelector(".event-meta").textContent = [item.name, item.department, item.category, item.type].filter(Boolean).join(" • ") || "-";

  const badge = node.querySelector(".event-badge");
  badge.textContent = item.type || item.category || "مناسبة";
  badge.classList.add(badgeClass);

  node.querySelector(".event-note").textContent = item.note || "لا توجد ملاحظات إضافية";
  node.querySelector(".event-date").textContent = formatArabicDate(item.date);

  const diff = daysDiff(today, parseDateValue(item.date));
  const daysEl = node.querySelector(".event-days");
  if (diff < 0) {
    card.classList.add("is-late");
    daysEl.textContent = getLateLabel(diff);
    daysEl.classList.add("is-late");
  } else {
    daysEl.textContent = getUpcomingLabel(diff);
  }

  return node;
}

function fillDynamicFilter(options, defaultLabel) {
  const currentValue = dynamicFilter.value;
  dynamicFilter.innerHTML = `<option value="">${defaultLabel}</option>`;

  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    dynamicFilter.appendChild(option);
  });

  if ([...dynamicFilter.options].some((opt) => opt.value === currentValue)) {
    dynamicFilter.value = currentValue;
  }
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((h, i) => normalizeText(h) || `col_${i}`);
  return rows.slice(1).filter((row) => row.some((cell) => hasValue(cell))).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? "";
    });
    return obj;
  });
}

function mapEvaluationRows(rows) {
  const objects = rowsToObjects(rows);
  return objects.map((row) => ({
    name: row["اسم الموظف"] || row["الاسم"] || row["name"] || "",
    department: row["القسم"] || row["department"] || "بدون قسم",
    hireDate: toIsoDate(row["تاريخ المباشرة"] || row["hire date"]),
    evaluations: [
      { type: "التقييم الأول", date: toIsoDate(row["التقييم الاول"] || row["التقييم الأول"] || row["first evaluation"]), result: row["النتيجة"] || row["النتيجة 1"] || row["result 1"] || "", key: "first" },
      { type: "التقييم الثاني", date: toIsoDate(row["التقييم الثاني"] || row["second evaluation"]), result: row["النتيجة 2"] || row["result 2"] || "", key: "second" },
      { type: "التقييم الثالث", date: toIsoDate(row["التقييم الثالث"] || row["third evaluation"]), result: row["النتيجة 3"] || row["result 3"] || "", key: "third" }
    ]
  })).filter((item) => hasValue(item.name));
}

function mapEventRows(rows, pageKey) {
  const objects = rowsToObjects(rows);
  return objects.map((row) => ({
    title: row["عنوان المناسبة"] || row["المناسبة"] || row["العنوان"] || row["title"] || row["نوع المناسبة"] || row["event"] || (pageKey === "birthdays" ? "عيد ميلاد" : "مناسبة"),
    name: row["اسم الموظف"] || row["الاسم"] || row["name"] || "",
    department: row["القسم"] || row["department"] || "",
    type: row["النوع"] || row["نوع المناسبة"] || row["type"] || (pageKey === "birthdays" ? "عيد ميلاد" : pageKey === "employeeEvents" ? "مناسبة موظف" : "مناسبة عامة"),
    category: row["التصنيف"] || row["الفئة"] || row["category"] || "",
    date: toIsoDate(row["التاريخ"] || row["تاريخ المناسبة"] || row["date"] || row["birthday"]),
    note: row["ملاحظة"] || row["الملاحظات"] || row["note"] || ""
  })).filter((item) => hasValue(item.title) || hasValue(item.name));
}

async function fetchSheetRows(pageKey) {
  const cfg = window.APP_CONFIG.pages[pageKey];
  const response = await fetch(buildCsvUrl(cfg.sheetName), { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  return parseCsv(text);
}

async function loadPageData(pageKey) {
  if (pageState.cache[pageKey]) return pageState.cache[pageKey];

  try {
    const rows = await fetchSheetRows(pageKey);
    let mapped;
    if (pageKey === "evaluations") {
      mapped = mapEvaluationRows(rows);
    } else {
      mapped = mapEventRows(rows, pageKey);
    }

    if (mapped.length) {
      pageState.cache[pageKey] = mapped;
      return mapped;
    }
  } catch (error) {
    console.warn(`تعذر تحميل صفحة ${pageKey} من Google Sheet، سيتم استخدام البيانات البديلة.`, error);
  }

  pageState.cache[pageKey] = window.FALLBACK_DATA?.[pageKey] || [];
  return pageState.cache[pageKey];
}

function flattenEvaluations(employees) {
  const items = [];
  employees.forEach((employee) => {
    (employee.evaluations || []).forEach((evaluation) => {
      if (!evaluation.date) return;
      const evalDate = parseDateValue(evaluation.date);
      if (!evalDate) return;

      items.push({
        name: employee.name,
        department: employee.department || "بدون قسم",
        type: evaluation.type,
        key: evaluation.key,
        date: toIsoDate(evaluation.date),
        result: evaluation.result,
        completed: hasValue(evaluation.result),
        diffDays: daysDiff(today, evalDate)
      });
    });
  });
  return items.sort((a, b) => new Date(a.date) - new Date(b.date));
}

function renderEvaluationPage(employees) {
  const flattened = flattenEvaluations(employees);
  const q = normalizeText(searchInput.value);
  const selectedDepartment = dynamicFilter.value;
  const maxDays = Number(windowFilter.value);

  const lateItems = [];
  const todayItems = [];
  const upcomingItems = [];
  const matchingEmployees = new Set();

  flattened.forEach((item) => {
    const textMatch = !q || normalizeText(item.name).includes(q) || normalizeText(item.department).includes(q);
    const departmentMatch = !selectedDepartment || item.department === selectedDepartment;
    if (!(textMatch && departmentMatch)) return;

    matchingEmployees.add(item.name);
    if (item.completed) return;

    if (item.diffDays < 0) {
      lateItems.push(item);
    } else if (item.diffDays === 0) {
      todayItems.push(item);
    } else if (item.diffDays <= maxDays) {
      upcomingItems.push(item);
    }
  });

  fillDynamicFilter([...new Set(employees.map((e) => e.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar")), "كل الأقسام");
  dynamicFilterBox.classList.remove("hidden");
  windowFilterBox.classList.remove("hidden");

  statsSection.innerHTML = [
    createStatCard("التقييمات المتأخرة", lateItems.length, "stat-danger"),
    createStatCard("تقييمات اليوم", todayItems.length, "stat-warning"),
    createStatCard("التقييمات القادمة", upcomingItems.length),
    createStatCard("إجمالي الموظفين", matchingEmployees.size || employees.length)
  ].join("");

  pageContent.innerHTML = `
    <div class="panel-grid three-columns">
      ${createPanel("التقييمات المتأخرة", "أي تقييم مضى وقته ونتيجته ما زالت فارغة", "lateList", "late-panel")}
      ${createPanel("المفروض يتقيمون اليوم", "التقييمات المستحقة اليوم وغير المنجزة", "todayList", "urgent-panel")}
      ${createPanel("التقييمات القادمة", "مرتبة من الأقرب إلى الأبعد", "upcomingList")}
    </div>
  `;

  const lateList = document.getElementById("lateList");
  const todayList = document.getElementById("todayList");
  const upcomingList = document.getElementById("upcomingList");

  if (lateItems.length) lateItems.forEach((item) => lateList.appendChild(createEvaluationCard(item, "late")));
  else renderEmpty(lateList, "ممتاز، لا توجد تقييمات متأخرة حالياً.");

  if (todayItems.length) todayItems.forEach((item) => todayList.appendChild(createEvaluationCard(item, "today")));
  else renderEmpty(todayList, "لا توجد تقييمات مستحقة اليوم حسب الفلاتر الحالية.");

  if (upcomingItems.length) upcomingItems.forEach((item) => upcomingList.appendChild(createEvaluationCard(item, "upcoming")));
  else renderEmpty(upcomingList, "لا توجد تقييمات قادمة ضمن الفترة المختارة.");
}

function filterEvents(items, pageKey) {
  const q = normalizeText(searchInput.value);
  const selectedFilter = dynamicFilter.value;

  return items.filter((item) => {
    const haystack = [item.title, item.name, item.department, item.type, item.category, item.note].map(normalizeText).join(" ");
    const textMatch = !q || haystack.includes(q);

    if (!selectedFilter) return textMatch;

    if (pageKey === "generalEvents") return textMatch && (item.category === selectedFilter || item.type === selectedFilter);
    return textMatch && item.department === selectedFilter;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function splitEventBuckets(items) {
  const late = [];
  const todayItems = [];
  const upcoming = [];

  items.forEach((item) => {
    const date = parseDateValue(item.date);
    if (!date) return;
    const diff = daysDiff(today, date);
    if (diff < 0) late.push(item);
    else if (diff === 0) todayItems.push(item);
    else upcoming.push(item);
  });

  return { late, todayItems, upcoming };
}

function renderEventPage(items, pageKey) {
  const filtered = filterEvents(items, pageKey);
  const { late, todayItems, upcoming } = splitEventBuckets(filtered);

  if (pageKey === "generalEvents") {
    const filterOptions = [...new Set(items.flatMap((item) => [item.category, item.type]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
    fillDynamicFilter(filterOptions, "كل الفئات");
    dynamicFilterBox.classList.remove("hidden");
  } else {
    const filterOptions = [...new Set(items.map((item) => item.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar"));
    fillDynamicFilter(filterOptions, "كل الأقسام");
    dynamicFilterBox.classList.remove("hidden");
  }

  windowFilterBox.classList.add("hidden");

  const firstStatLabel = pageKey === "birthdays" ? "إجمالي أعياد الميلاد" : "إجمالي المناسبات";
  statsSection.innerHTML = [
    createStatCard(firstStatLabel, filtered.length),
    createStatCard("اليوم", todayItems.length, "stat-warning"),
    createStatCard("القادم", upcoming.length),
    createStatCard("المتأخر", late.length, "stat-danger")
  ].join("");

  pageContent.innerHTML = `
    <div class="panel-grid ${pageKey === "generalEvents" ? "two-columns" : "three-columns"}">
      ${createPanel("المتأخر", "كل ما مضى تاريخه", "lateEvents", "late-panel")}
      ${createPanel("اليوم", "المناسبات أو الأعياد المستحقة اليوم", "todayEvents", "urgent-panel")}
      ${createPanel("القادم", "مرتبة من الأقرب إلى الأبعد", "upcomingEvents")}
    </div>
  `;

  const lateList = document.getElementById("lateEvents");
  const todayList = document.getElementById("todayEvents");
  const upcomingList = document.getElementById("upcomingEvents");
  const badgeClass = pageKey === "birthdays" ? "birthday" : pageKey === "employeeEvents" ? "employee" : "general";

  if (late.length) late.forEach((item) => lateList.appendChild(createEventCard(item, badgeClass)));
  else renderEmpty(lateList, "لا توجد عناصر متأخرة حالياً.");

  if (todayItems.length) todayItems.forEach((item) => todayList.appendChild(createEventCard(item, badgeClass)));
  else renderEmpty(todayList, "لا توجد عناصر لهذا اليوم حالياً.");

  if (upcoming.length) upcoming.forEach((item) => upcomingList.appendChild(createEventCard(item, badgeClass)));
  else renderEmpty(upcomingList, "لا توجد عناصر قادمة حالياً.");
}

function renderTabs() {
  tabsNav.innerHTML = Object.entries(window.APP_CONFIG.pages).map(([key, cfg]) => `
    <button class="tab-btn ${pageState.current === key ? "active" : ""}" data-page="${key}">${cfg.tabLabel}</button>
  `).join("");

  tabsNav.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      pageState.current = button.dataset.page;
      dynamicFilter.value = "";
      searchInput.value = "";
      renderCurrentPage();
    });
  });
}

async function renderCurrentPage() {
  const cfg = window.APP_CONFIG.pages[pageState.current];
  pageTitle.textContent = cfg.title;
  pageSubtitle.textContent = cfg.subtitle;
  searchInput.placeholder = cfg.searchPlaceholder;
  renderTabs();
  pageContent.innerHTML = '<div class="loading-box">جاري تحميل البيانات...</div>';

  const data = await loadPageData(pageState.current);
  if (pageState.current === "evaluations") {
    renderEvaluationPage(data);
  } else {
    renderEventPage(data, pageState.current);
  }
}

function init() {
  todayDateText.textContent = new Intl.DateTimeFormat("ar-IQ", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(today);

  [searchInput, dynamicFilter, windowFilter].forEach((el) => {
    el.addEventListener("input", renderCurrentPage);
    el.addEventListener("change", renderCurrentPage);
  });

  renderCurrentPage();
}

init();
