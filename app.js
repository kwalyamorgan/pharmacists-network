const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const sourceSelect = document.getElementById("sourceSelect");
const regionSelect = document.getElementById("regionSelect");
const dateFromInput = document.getElementById("dateFromInput");
const dateToInput = document.getElementById("dateToInput");
const newsFeed = document.getElementById("newsFeed");
const statusText = document.getElementById("statusText");
const updatedText = document.getElementById("updatedText");
const cardTemplate = document.getElementById("cardTemplate");
const storyCount = document.getElementById("storyCount");
const kenyanCount = document.getElementById("kenyanCount");
const globalCount = document.getElementById("globalCount");
const toolbar = document.querySelector(".toolbar");
const scrollProgress = document.getElementById("scrollProgress");
const backToTopBtn = document.getElementById("backToTopBtn");
const studentsToggleBtn = document.getElementById("studentsToggleBtn");
const studentsPanel = document.getElementById("studentsPanel");
const pharmacistsToggleBtn = document.getElementById("pharmacistsToggleBtn");
const pharmacistsPanel = document.getElementById("pharmacistsPanel");

let debounceTimer;
let revealObserver;
let scrollTicking = false;
let newsRequestController = null;
let currentCategory = "all";
const preloadStartedAt = Date.now();
const isCompactViewport = window.matchMedia("(max-width: 720px)").matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const saveDataEnabled = Boolean(navigator.connection && navigator.connection.saveData);
const shouldFastLoadUi = isCompactViewport || prefersReducedMotion || saveDataEnabled;
const API_BASE = (() => {
  const injected = String(window.__API_BASE__ || document.documentElement?.dataset?.apiBase || "").trim();
  if (injected) {
    return injected;
  }
  const hostname = String(window.location.hostname || "").toLowerCase();
  const useRailwayApi =
    hostname.endsWith("github.io") ||
    hostname === "kenyanpharmacistsnetwork.co.ke" ||
    hostname === "www.kenyanpharmacistsnetwork.co.ke";

  return useRailwayApi
    ? "https://pharmacy-website-env.up.railway.app"
    : "";
})();

function apiUrl(path) {
  const base = API_BASE.replace(/\/+$/, "");
  const normalizedPath = String(path || "");
  return `${base}${normalizedPath}`;
}


function openStudentsPanel() {
  if (!studentsToggleBtn || !studentsPanel) {
    return;
  }
  studentsPanel.hidden = false;
  studentsToggleBtn.setAttribute("aria-expanded", "true");
}

function closeStudentsPanel() {
  if (!studentsToggleBtn || !studentsPanel) {
    return;
  }
  studentsPanel.hidden = true;
  studentsToggleBtn.setAttribute("aria-expanded", "false");
}

function openPharmacistsPanel() {
  if (!pharmacistsToggleBtn || !pharmacistsPanel) {
    return;
  }
  pharmacistsPanel.hidden = false;
  pharmacistsToggleBtn.setAttribute("aria-expanded", "true");
}

function closePharmacistsPanel() {
  if (!pharmacistsToggleBtn || !pharmacistsPanel) {
    return;
  }
  pharmacistsPanel.hidden = true;
  pharmacistsToggleBtn.setAttribute("aria-expanded", "false");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }
  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function setStatus(text) {
  statusText.textContent = text;
}

function clearFeed() {
  newsFeed.innerHTML = "";
}

function toClassToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function updateMetrics(items) {
  const total = items.length;
  const kenyan = items.filter((item) => item.region === "kenyan").length;
  const global = items.filter((item) => item.region === "global").length;

  storyCount.textContent = String(total);
  kenyanCount.textContent = String(kenyan);
  globalCount.textContent = String(global);
}

// Quick filter helpers (mobile-first)
function formatInputDateLocal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function applyDatePreset(preset) {
  const now = new Date();
  let from = "";
  let to = "";

  if (preset === "today") {
    from = to = formatInputDateLocal(now);
  } else if (preset === "this-week") {
    const day = now.getDay();
    const mondayOffset = (day + 6) % 7; // Monday as first day
    const start = new Date(now);
    start.setDate(now.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    from = formatInputDateLocal(start);
    to = formatInputDateLocal(end);
  } else if (preset === "this-month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    from = formatInputDateLocal(start);
    to = formatInputDateLocal(end);
  } else if (preset === "this-year") {
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31);
    from = formatInputDateLocal(start);
    to = formatInputDateLocal(end);
  } else if (preset === "last-year") {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31);
    from = formatInputDateLocal(start);
    to = formatInputDateLocal(end);
  } else if (preset === "all-time") {
    from = "";
    to = "";
  }

  if (dateFromInput) dateFromInput.value = from;
  if (dateToInput) dateToInput.value = to;
  loadNews();
}

function setActiveButton(groupSelector, activeBtn) {
  try {
    document.querySelectorAll(groupSelector).forEach((b) => b.classList.remove("is-active"));
    activeBtn && activeBtn.classList.add("is-active");
  } catch (e) {}
}

function renderEmpty(message, className = "empty") {
  clearFeed();
  const block = document.createElement("div");
  block.className = className;
  block.textContent = message;
  newsFeed.appendChild(block);
}

function renderNews(items) {
  clearFeed();
  updateMetrics(items);

  if (!items.length) {
    renderEmpty("No stories matched this filter. Try a broader search.");
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item, index) => {
    const clone = cardTemplate.content.cloneNode(true);

    const card = clone.querySelector(".news-card");
    card.style.transitionDelay = `${Math.min(index * 35, 500)}ms`;
    card.classList.add(`region-${toClassToken(item.region)}`);
    card.classList.add(`category-${toClassToken(item.category)}`);

    clone.querySelector(".category").textContent = item.category;
    clone.querySelector(".published").textContent = formatDate(item.published);
    clone.querySelector(".title").textContent = item.title;
    clone.querySelector(".overview").textContent = item.overview;
    clone.querySelector(".source").textContent = item.source;
    clone.querySelector(".region").textContent = item.region;

    const viewsEl = clone.querySelector(".views-count");
    if (viewsEl) {
      viewsEl.textContent = String(item.views || 0);
    }

    const link = clone.querySelector(".read-link");
    link.href = item.link;
    // Increment view count when user opens the story (best-effort, fire-and-forget).
    link.addEventListener("click", (ev) => {
      try {
        // Fire-and-forget; don't block navigation.
        fetch(apiUrl("/api/news/view"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ link: item.link })
        })
          .then((r) => r.json())
          .then((d) => {
            if (d && typeof d.views !== "undefined" && viewsEl) {
              viewsEl.textContent = String(d.views);
            }
          })
          .catch(() => {});
      } catch (e) {}
    });

    fragment.appendChild(clone);
  });

  newsFeed.appendChild(fragment);
  observeElements(newsFeed.querySelectorAll(".news-card"));
}

function setupRevealObserver() {
  if (shouldFastLoadUi) {
    document.body.classList.add("compact-ui");
    document.querySelectorAll(".reveal-block, .news-card").forEach((element) => {
      element.classList.add("in-view");
    });
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.15
    }
  );

  observeElements(document.querySelectorAll(".reveal-block"));
}

function observeElements(elements) {
  if (!revealObserver) {
    return;
  }

  elements.forEach((element) => {
    if (!element.classList.contains("in-view")) {
      revealObserver.observe(element);
    }
  });
}

function updateScrollUi() {
  scrollTicking = false;
  const doc = document.documentElement;
  const maxScrollable = Math.max(doc.scrollHeight - window.innerHeight, 1);
  const currentY = window.scrollY;
  const progress = Math.max(0, Math.min((currentY / maxScrollable) * 100, 100));
  scrollProgress.style.width = `${progress}%`;

  if (currentY > 500) {
    backToTopBtn.classList.add("is-visible");
  } else {
    backToTopBtn.classList.remove("is-visible");
  }
}

function requestScrollUiUpdate() {
  if (scrollTicking) {
    return;
  }

  scrollTicking = true;
  window.requestAnimationFrame(updateScrollUi);
}

function setupScrollEffects() {
  updateScrollUi();
  window.addEventListener("scroll", requestScrollUiUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUiUpdate, { passive: true });

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
// preloader removed — no preloader animation. Page loads immediately.

async function loadCategories() {
  try {
    const response = await fetch(apiUrl("/api/sources"));
    if (!response.ok) {
      throw new Error("Could not load source categories.");
    }

    const data = await response.json();
    const uniqueCategories = (() => {
      const map = new Map();
      for (const s of data.sources || []) {
        const key = String(s.category || "").trim().toLowerCase();
        if (key && !map.has(key)) map.set(key, String(s.category).trim());
      }
      return [...map.values()].sort();
    })();

    const uniqueSources = (() => {
      const map = new Map();
      for (const s of data.sources || []) {
        const key = String(s.name || "").trim().toLowerCase();
        if (key && !map.has(key)) map.set(key, String(s.name).trim());
      }
      return [...map.values()].sort();
    })();

    if (categorySelect) {
      uniqueCategories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.toLowerCase();
        option.textContent = category;
        categorySelect.appendChild(option);
      });
    }

    if (sourceSelect) {
      uniqueSources.forEach((source) => {
        const option = document.createElement("option");
        option.value = source.toLowerCase();
        option.textContent = source;
        sourceSelect.appendChild(option);
      });
    }
  } catch (error) {
    setStatus("Sources could not be loaded. Showing default filters.");
  }
}

async function loadNews() {
  try {
    if (newsRequestController) {
      newsRequestController.abort();
    }
    newsRequestController = new AbortController();

    setStatus("Loading live pharmacy updates...");

    const defaultLimit = isCompactViewport ? 80 : 160;

    const q = encodeURIComponent((searchInput && searchInput.value || "").trim());
    const activeCategoryBtn = document.querySelector('.category-btn.is-active');
    const category = encodeURIComponent((activeCategoryBtn && activeCategoryBtn.dataset.category) || (categorySelect && categorySelect.value) || currentCategory || "all");
    const source = encodeURIComponent((sourceSelect && sourceSelect.value) || "all");
    const activeRegionBtn = document.querySelector('.region-btn.is-active');
    const region = encodeURIComponent((activeRegionBtn && activeRegionBtn.dataset.region) || (regionSelect && regionSelect.value) || "all");
    const dateFrom = encodeURIComponent((dateFromInput && dateFromInput.value) || "");
    const dateTo = encodeURIComponent((dateToInput && dateToInput.value) || "");
    const response = await fetch(
      apiUrl(
        `/api/news?q=${q}&category=${category}&source=${source}&region=${region}&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=${defaultLimit}`
      ),
      {
        signal: newsRequestController.signal
      }
    );

    if (!response.ok) {
      throw new Error("Feed service is unavailable right now.");
    }

    const data = await response.json();
    renderNews(data.items || []);

    const count = data.items?.length || 0;
    setStatus(`${count} stories loaded.`);
    updatedText.textContent = `Last update: ${formatDate(data.updatedAt)}`;
    newsRequestController = null;
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
    renderEmpty(error.message, "error");
    setStatus("Could not load latest updates.");
    updatedText.textContent = "";
    newsRequestController = null;
  }
}

function debouncedLoadNews() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadNews, 350);
}

function validateDateRange() {
  if (!dateFromInput.value || !dateToInput.value) {
    return true;
  }

  if (dateFromInput.value <= dateToInput.value) {
    return true;
  }

  const temp = dateFromInput.value;
  dateFromInput.value = dateToInput.value;
  dateToInput.value = temp;
  return true;
}

function resetFilters() {
  if (categorySelect) categorySelect.value = "all";
  if (sourceSelect) sourceSelect.value = "all";
  if (regionSelect) regionSelect.value = "all";
  if (dateFromInput) dateFromInput.value = "";
  if (dateToInput) dateToInput.value = "";
  setActiveButton('.region-btn', document.querySelector('.region-btn[data-region="all"]'));
  setActiveButton('.date-btn', document.querySelector('.date-btn[data-preset="all-time"]'));
  setActiveButton('.category-btn', document.querySelector('.category-btn[data-category="all"]'));
  currentCategory = "all";
}

searchInput.addEventListener("input", debouncedLoadNews);

if (kenyanCount) {
  kenyanCount.style.cursor = "pointer";
  kenyanCount.addEventListener("click", () => {
    const btn = document.querySelector('.region-btn[data-region="kenyan"]');
    if (btn) setActiveButton('.region-btn', btn);
    if (regionSelect) regionSelect.value = "kenyan";
    loadNews();
  });
}

if (globalCount) {
  globalCount.style.cursor = "pointer";
  globalCount.addEventListener("click", () => {
    const btn = document.querySelector('.region-btn[data-region="global"]');
    if (btn) setActiveButton('.region-btn', btn);
    if (regionSelect) regionSelect.value = "global";
    loadNews();
  });
}

// Wire up quick filter buttons (region + date presets)
document.addEventListener("click", (ev) => {
  const btn = ev.target.closest && ev.target.closest(".region-btn, .date-btn, .category-btn");
  if (!btn) return;
  if (btn.classList.contains("region-btn")) {
    const region = String(btn.dataset.region || "all").trim();
    if (regionSelect) regionSelect.value = region;
    setActiveButton(".region-btn", btn);
    loadNews();
    return;
  }
  if (btn.classList.contains("category-btn")) {
    const cat = String(btn.dataset.category || "all").trim();
    currentCategory = cat;
    if (categorySelect) categorySelect.value = cat;
    setActiveButton(".category-btn", btn);
    loadNews();
    return;
  }
  if (btn.classList.contains("date-btn")) {
    const preset = String(btn.dataset.preset || "");
    setActiveButton(".date-btn", btn);
    applyDatePreset(preset);
    return;
  }
});

// Filter menu removed — apply/reset handlers removed.

if (studentsToggleBtn && studentsPanel) {
  studentsToggleBtn.addEventListener("click", () => {
    if (studentsPanel.hidden) {
      closePharmacistsPanel();
      openStudentsPanel();
    } else {
      closeStudentsPanel();
    }
  });
}

if (pharmacistsToggleBtn && pharmacistsPanel) {
  pharmacistsToggleBtn.addEventListener("click", () => {
    if (pharmacistsPanel.hidden) {
      closeStudentsPanel();
      openPharmacistsPanel();
    } else {
      closePharmacistsPanel();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (studentsPanel && !studentsPanel.hidden) {
      closeStudentsPanel();
    }

    if (pharmacistsPanel && !pharmacistsPanel.hidden) {
      closePharmacistsPanel();
    }
  }
});

(async function init() {
  setupRevealObserver();
  setupScrollEffects();

  // Default quick-filter active buttons
  try {
    setActiveButton('.region-btn', document.querySelector('.region-btn[data-region="all"]'));
    setActiveButton('.date-btn', document.querySelector('.date-btn[data-preset="all-time"]'));
    setActiveButton('.category-btn', document.querySelector('.category-btn[data-category="all"]'));
  } catch (e) {}

  // Start fetching non-critical data but don't block initial paint.
  loadCategories().catch(() => {});
  loadNews().catch(() => {});

  // Preloader removed — no action needed to hide it.

  // Keep the feed fresh during active use.
  setInterval(loadNews, 10 * 60 * 1000);
})();
