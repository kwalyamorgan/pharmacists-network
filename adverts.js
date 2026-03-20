const advertiseBtn = document.getElementById("advertiseBtn");
const featuredViewerBtn = document.getElementById("featuredViewerBtn");
const adDialog = document.getElementById("adDialog");
const closeDialogBtn = document.getElementById("closeDialogBtn");

const mediaViewerDialog = document.getElementById("mediaViewerDialog");
const closeMediaViewerBtn = document.getElementById("closeMediaViewerBtn");
const mediaViewerImg = document.getElementById("mediaViewerImg");

const featuredViewerDialog = document.getElementById("featuredViewerDialog");
const closeFeaturedViewerBtn = document.getElementById("closeFeaturedViewerBtn");
const featuredPopupCount = document.getElementById("featuredPopupCount");
const featuredPopupMedia = document.getElementById("featuredPopupMedia");
const featuredPopupFrame = document.getElementById("featuredPopupFrame");
const featuredPopupBadge = document.getElementById("featuredPopupBadge");
const featuredPopupCopy = document.getElementById("featuredPopupCopy");
const featuredPopupLink = document.getElementById("featuredPopupLink");
const featuredPopupMeta = document.getElementById("featuredPopupMeta");

const adForm = document.getElementById("adForm");
const phoneInput = document.getElementById("phoneInput");
const emailInput = document.getElementById("emailInput");
const contentInput = document.getElementById("contentInput");
const linkInput = document.getElementById("linkInput");
const mediaTypeSelect = document.getElementById("mediaTypeSelect");
const mediaInput = document.getElementById("mediaInput");
const mediaHint = document.getElementById("mediaHint");
const planSelect = document.getElementById("planSelect");
const featuredCheckbox = document.getElementById("featuredCheckbox");
const planHint = document.getElementById("planHint");

const adStatus = document.getElementById("adStatus");
const paymentSummary = document.getElementById("paymentSummary");
const payBtn = document.getElementById("payBtn");

const adsFeed = document.getElementById("adsFeed");
const feedStatus = document.getElementById("feedStatus");
const adCardTemplate = document.getElementById("adCardTemplate");

const adminPanel = document.getElementById("adminPanel");
const adminTokenInput = document.getElementById("adminTokenInput");
const adminEnableBtn = document.getElementById("adminEnableBtn");
const createBtn = document.getElementById("createBtn");

const createdPreview = document.getElementById("createdPreview");
const createdPreviewMedia = document.getElementById("createdPreviewMedia");
const createdPreviewCopy = document.getElementById("createdPreviewCopy");
const createdPreviewLink = document.getElementById("createdPreviewLink");

let offers = null;
let currentAdId = null;
let paystackPublicKey = "";
let adminToken = "";
let adminUiVisible = false;
let adminEnabled = false;

let featuredSlides = [];
let featuredSlideIndex = 0;
let featuredTimer = null;
let featuredIsTransitioning = false;
let featuredPopupAutoOpened = false;
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

function getAdminHeaders() {
  const token = String(adminToken || "").trim();
  return token ? { "x-admin-token": token } : {};
}

function setAdminToken(token) {
  adminToken = String(token || "").trim();
  if (adminToken) {
    localStorage.setItem("adminToken", adminToken);
  } else {
    localStorage.removeItem("adminToken");
  }
  if (adminTokenInput) {
    adminTokenInput.value = adminToken;
  }
}

function setAdminUiVisible(nextVisible) {
  adminUiVisible = Boolean(nextVisible);
  if (adminPanel) {
    adminPanel.hidden = !adminUiVisible;
  }

  document.body.classList.toggle("admin-ui-visible", adminUiVisible);

  if (!adminUiVisible) {
    setAdminEnabled(false);
  }
}

function setAdminEnabled(nextEnabled) {
  adminEnabled = Boolean(nextEnabled);
  document.body.classList.toggle("admin-enabled", adminEnabled);
}

async function validateAdminTokenOrThrow() {
  const token = String(adminToken || "").trim();
  if (!token) {
    throw new Error("Enter admin token.");
  }

  const res = await fetch(apiUrl("/api/adverts/admin/ads?limit=1"), {
    headers: {
      ...getAdminHeaders()
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Invalid admin token.");
  }
}

function setDialogStatus(text) {
  adStatus.textContent = text;
}

function setFeedStatus(text) {
  feedStatus.textContent = text;
}

function money(amount) {
  const value = Number(amount) || 0;
  return `KES ${value}`;
}

function openExternalAdvertLink(url) {
  const safeUrl = String(url || "").trim();
  if (!safeUrl) {
    return;
  }
  window.open(safeUrl, "_blank", "noopener,noreferrer");
}

function bindClickableDescription(el, url) {
  if (!el) {
    return;
  }

  const safeUrl = String(url || "").trim();
  const isActive = Boolean(safeUrl);

  el.classList.toggle("adverts-copy--clickable", isActive);
  el.onclick = null;
  el.onkeydown = null;

  if (!isActive) {
    el.removeAttribute("role");
    el.removeAttribute("tabindex");
    el.removeAttribute("aria-label");
    return;
  }

  el.setAttribute("role", "link");
  el.setAttribute("tabindex", "0");
  el.setAttribute("aria-label", "Open advert link");

  el.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openExternalAdvertLink(safeUrl);
  };

  el.onkeydown = (event) => {
    const key = String(event.key || "");
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      event.stopPropagation();
      openExternalAdvertLink(safeUrl);
    }
  };
}

function stopFeaturedTimer() {
  if (featuredTimer) {
    clearInterval(featuredTimer);
    featuredTimer = null;
  }
}

function getFeaturedTransitionFrame() {
  return featuredPopupFrame || null;
}

function closeFeaturedViewer() {
  if (featuredViewerDialog?.open) {
    featuredViewerDialog.close();
  }
}

function maybeAutoOpenFeaturedViewer() {
  if (featuredPopupAutoOpened) {
    return;
  }
  if (!featuredViewerDialog) {
    return;
  }
  if (!featuredSlides.length) {
    return;
  }

  featuredPopupAutoOpened = true;
  try {
    featuredViewerDialog.showModal();
  } catch {
    try {
      featuredViewerDialog.show();
    } catch {
      // Ignore (browser may block non-user initiated dialogs).
    }
  }
}

function renderFeaturedSlide() {
  if (!featuredSlides.length) {
    stopFeaturedTimer();

    if (featuredPopupCount) {
      featuredPopupCount.textContent = "";
    }
    if (featuredPopupMedia) {
      featuredPopupMedia.innerHTML = "";
    }

    if (featuredPopupBadge) {
      featuredPopupBadge.textContent = "";
      featuredPopupBadge.hidden = true;
    }
    if (featuredPopupCopy) {
      featuredPopupCopy.textContent = "";
    }
    if (featuredPopupLink) {
      featuredPopupLink.hidden = true;
      featuredPopupLink.removeAttribute("href");
      featuredPopupLink.textContent = "";
    }
    if (featuredPopupMeta) {
      featuredPopupMeta.textContent = "";
    }

    closeFeaturedViewer();
    return;
  }

  const item = featuredSlides[Math.max(0, Math.min(featuredSlideIndex, featuredSlides.length - 1))];

  if (featuredPopupCount) {
    featuredPopupCount.textContent = featuredSlides.length > 1 ? `${featuredSlideIndex + 1} / ${featuredSlides.length}` : "";
  }

  if (featuredPopupMedia) {
    featuredPopupMedia.innerHTML = "";
    const record = Array.isArray(item.media) && item.media.length ? item.media[0] : null;

    if (record?.type === "video") {
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = !shouldFastLoadUi;
      video.muted = true;
      video.loop = !shouldFastLoadUi;
      video.src = record.url;
      video.preload = shouldFastLoadUi ? "none" : "metadata";
      video.playsInline = true;
      featuredPopupMedia.appendChild(video);

      if (!shouldFastLoadUi) {
        // Best-effort: some browsers require an explicit play() even with autoplay.
        video.addEventListener(
          "loadedmetadata",
          () => {
            try {
              video.play()?.catch(() => {});
            } catch {
              // Ignore.
            }
          },
          { once: true }
        );
      }
    } else if (record?.type === "image") {
      const img = document.createElement("img");
      img.src = record.url;
      img.alt = "Featured advert";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("click", () => openMediaViewerImage(record.url));
      featuredPopupMedia.appendChild(img);
    } else {
      const placeholder = document.createElement("p");
      placeholder.className = "adverts-hint";
      placeholder.textContent = "No media";
      featuredPopupMedia.appendChild(placeholder);
    }
  }

  if (featuredPopupBadge) {
    const badgeBits = [];
    if (item.isVerified) badgeBits.push("Verified");
    if (adminEnabled && item.status) badgeBits.push(String(item.status));
    featuredPopupBadge.textContent = badgeBits.join(" • ");
    featuredPopupBadge.hidden = badgeBits.length === 0;
  }

  if (featuredPopupCopy) {
    featuredPopupCopy.textContent = String(item.content || "");
    featuredPopupCopy.classList.remove("adverts-copy--clickable");
    featuredPopupCopy.onclick = null;
    featuredPopupCopy.onkeydown = null;
    featuredPopupCopy.removeAttribute("role");
    featuredPopupCopy.removeAttribute("tabindex");
    featuredPopupCopy.removeAttribute("aria-label");
  }

  if (featuredPopupLink) {
    const url = String(item.linkUrl || "").trim();
    if (url) {
      featuredPopupLink.hidden = false;
      featuredPopupLink.href = url;
      featuredPopupLink.textContent = "Visit link";
      featuredPopupLink.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        openExternalAdvertLink(url);
      };
    } else {
      featuredPopupLink.hidden = true;
      featuredPopupLink.removeAttribute("href");
      featuredPopupLink.textContent = "";
      featuredPopupLink.onclick = null;
    }
  }

  if (featuredPopupMeta) {
    const until = item.activeUntil ? new Date(item.activeUntil).toLocaleString() : "";
    featuredPopupMeta.textContent = until ? `Active until: ${until}` : "";
  }
}

function transitionFeaturedToIndex(nextIndex) {
  if (!featuredSlides.length) {
    return;
  }

  const clamped = Math.max(0, Math.min(nextIndex, featuredSlides.length - 1));
  if (clamped === featuredSlideIndex) {
    return;
  }

  const frame = getFeaturedTransitionFrame();
  if (!frame) {
    featuredSlideIndex = clamped;
    renderFeaturedSlide();
    return;
  }

  if (featuredIsTransitioning) {
    return;
  }

  featuredIsTransitioning = true;
  frame.classList.add("is-fading");
  window.setTimeout(() => {
    featuredSlideIndex = clamped;
    renderFeaturedSlide();
    // Next frame to ensure the class removal triggers the fade-in transition.
    window.requestAnimationFrame(() => {
      frame.classList.remove("is-fading");
      window.setTimeout(() => {
        featuredIsTransitioning = false;
      }, 260);
    });
  }, 220);
}

function setFeaturedSlidesFromItems(items) {
  const nextSlides = (Array.isArray(items) ? items : []).filter((row) => Boolean(row?.isFeatured));
  featuredSlides = nextSlides;
  featuredSlideIndex = 0;

  if (featuredViewerBtn) {
    featuredViewerBtn.disabled = featuredSlides.length === 0;
    featuredViewerBtn.hidden = featuredSlides.length === 0;
  }

  renderFeaturedSlide();
  maybeAutoOpenFeaturedViewer();
  stopFeaturedTimer();

  if (featuredSlides.length > 1 && !shouldFastLoadUi) {
    featuredTimer = setInterval(() => {
      const nextIndex = (featuredSlideIndex + 1) % featuredSlides.length;
      transitionFeaturedToIndex(nextIndex);
    }, 6500);
  }
}

function safeMediaType() {
  return String(mediaTypeSelect.value || "image").toLowerCase();
}

function getPlanDef(mediaType, plan) {
  return offers?.plans?.[mediaType]?.[plan] || null;
}

function calcTotalsClient() {
  const mediaType = safeMediaType();
  const plan = String(planSelect.value || "weekly").toLowerCase();
  const def = getPlanDef(mediaType, plan);
  if (!def) {
    return null;
  }

  const base = Number(def.price) || 0;
  const addOn = featuredCheckbox.checked ? Number(offers?.addons?.featured?.price) || 0 : 0;

  return {
    baseAmount: base,
    extraFeaturedAmount: addOn,
    totalAmount: base + addOn,
    includedFeaturedDays: Number(def.includesFeaturedDays) || 0
  };
}

function refreshHints() {
  if (!offers) {
    planHint.textContent = "";
    mediaHint.textContent = "";
    return;
  }

  const mediaType = safeMediaType();

  if (mediaType === "video") {
    // For now, keep video adverts as weekly-only until monthly pricing is defined.
    planSelect.value = "weekly";
    planSelect.querySelector("option[value='monthly']")?.setAttribute("disabled", "disabled");
    mediaInput.accept = "video/*";
  } else {
    planSelect.querySelector("option[value='monthly']")?.removeAttribute("disabled");
    mediaInput.accept = "image/*";
  }

  const plan = String(planSelect.value || "weekly").toLowerCase();
  const def = getPlanDef(mediaType, plan);

  if (def) {
    const base = money(def.price);
    const dur = `${def.durationDays} days`;
    const includedFeatured = def.includesFeaturedDays ? ` + ${def.includesFeaturedDays} featured days` : "";
    planHint.textContent = `${base} • ${dur}${includedFeatured}`;
  } else {
    planHint.textContent = "";
  }

  mediaHint.textContent =
    mediaType === "video"
      ? "Weekly video adverts: KES 1000 • Max duration: 60 seconds"
      : "Weekly image adverts: KES 300 • Images are auto-sized for consistency";

  const totals = calcTotalsClient();
  if (totals) {
    const extra = totals.extraFeaturedAmount ? ` + Featured ${money(totals.extraFeaturedAmount)}` : "";
    paymentSummary.textContent = `Estimated total: ${money(totals.totalAmount)}${extra}.`;
  } else {
    paymentSummary.textContent = "";
  }
}

async function loadOffers() {
  const res = await fetch(apiUrl("/api/adverts/plans"));
  if (!res.ok) {
    throw new Error("Could not load plans.");
  }
  const data = await res.json();
  offers = data.offers;
  refreshHints();
}

async function loadPaystackConfig() {
  const res = await fetch(apiUrl("/api/adverts/paystack/config"));
  if (!res.ok) {
    throw new Error("Could not load payment config.");
  }
  const data = await res.json();
  paystackPublicKey = String(data.publicKey || "").trim();
}

function setFormEnabled(enabled) {
  const next = Boolean(enabled);
  if (phoneInput) phoneInput.disabled = !next;
  if (emailInput) emailInput.disabled = !next;
  if (contentInput) contentInput.disabled = !next;
  if (linkInput) linkInput.disabled = !next;
  if (mediaTypeSelect) mediaTypeSelect.disabled = !next;
  if (mediaInput) mediaInput.disabled = !next;
  if (planSelect) planSelect.disabled = !next;
  if (featuredCheckbox) featuredCheckbox.disabled = !next;
}

function renderCreatedPreview(ad) {
  if (!createdPreview || !ad) {
    return;
  }

  if (createdPreviewCopy) {
    createdPreviewCopy.textContent = String(ad.content || "").trim();
  }

  const link = String(ad.linkUrl || "").trim();
  if (createdPreviewLink) {
    if (link) {
      createdPreviewLink.hidden = false;
      createdPreviewLink.href = link;
      createdPreviewLink.textContent = "Open link";
    } else {
      createdPreviewLink.hidden = true;
      createdPreviewLink.removeAttribute("href");
      createdPreviewLink.textContent = "";
    }
  }

  if (createdPreviewMedia) {
    createdPreviewMedia.innerHTML = "";
    const mediaType = String(ad.mediaType || "image").toLowerCase();
    const first = Array.isArray(ad.media) ? ad.media[0] : null;
    const src = String(first?.url || first?.src || "").trim();

    if (src && mediaType === "video") {
      const el = document.createElement("video");
      el.src = src;
      el.controls = true;
      el.playsInline = true;
      createdPreviewMedia.appendChild(el);
    } else if (src) {
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Advert image";
      img.loading = "lazy";
      img.decoding = "async";
      createdPreviewMedia.appendChild(img);
    } else {
      const empty = document.createElement("p");
      empty.className = "adverts-hint";
      empty.textContent = "No media";
      createdPreviewMedia.appendChild(empty);
    }
  }

  createdPreview.hidden = false;
}

function resetDialogState() {
  currentAdId = null;
  payBtn.hidden = true;
  if (createBtn) createBtn.disabled = false;
  paymentSummary.textContent = "";
  setDialogStatus("");

  if (createdPreview) createdPreview.hidden = true;
  if (createdPreviewMedia) createdPreviewMedia.innerHTML = "";
  if (createdPreviewCopy) createdPreviewCopy.textContent = "";
  if (createdPreviewLink) {
    createdPreviewLink.hidden = true;
    createdPreviewLink.removeAttribute("href");
    createdPreviewLink.textContent = "";
  }

  setFormEnabled(true);
}

function openDialog() {
  resetDialogState();
  try {
    adForm?.reset();
  } catch {
    // Ignore.
  }
  adDialog.showModal();
  refreshHints();
  setTimeout(() => phoneInput?.focus(), 0);
}

function closeDialog() {
  if (adDialog.open) {
    adDialog.close();
  }
  resetDialogState();
}

function openMediaViewerImage(url) {
  const safeUrl = String(url || "").trim();
  if (!safeUrl) {
    return;
  }
  if (mediaViewerImg) {
    mediaViewerImg.src = safeUrl;
  }
  mediaViewerDialog?.showModal();
}

function closeMediaViewer() {
  if (mediaViewerDialog?.open) {
    mediaViewerDialog.close();
  }
  if (mediaViewerImg) {
    mediaViewerImg.removeAttribute("src");
  }
}

async function loadFeed() {
  try {
    setFeedStatus("Loading adverts…");
    const canUseAdmin = adminEnabled;
    const feedLimit = isCompactViewport ? 18 : 30;
    const adminLimit = isCompactViewport ? 40 : 60;
    const url = canUseAdmin
      ? apiUrl(`/api/adverts/admin/ads?limit=${adminLimit}`)
      : apiUrl(`/api/adverts/feed?limit=${feedLimit}`);
    const res = await fetch(url, {
      headers: {
        ...(canUseAdmin ? getAdminHeaders() : {})
      }
    });
    if (!res.ok) {
      throw new Error("Could not load adverts.");
    }
    const data = await res.json();
    renderFeed(data.items || []);
    setFeedStatus(`${(data.items || []).length} adverts`);
  } catch (error) {
    setFeedStatus(error.message);
  }
}

function renderFeed(items) {
  const list = Array.isArray(items) ? items : [];

  // Priority: show featured adverts first in the normal feed,
  // but keep them styled like the rest of the adverts.
  const featured = list.filter((row) => Boolean(row?.isFeatured));
  const normal = list.filter((row) => !row?.isFeatured);
  const ordered = featured.concat(normal);

  setFeaturedSlidesFromItems(ordered);
  adsFeed.innerHTML = "";

  if (!ordered.length) {
    const empty = document.createElement("p");
    empty.className = "adverts-hint";
    empty.textContent = "No active adverts yet.";
    adsFeed.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  ordered.forEach((item) => {
    const clone = adCardTemplate.content.cloneNode(true);
    const card = clone.querySelector(".adverts-item");
    if (card) {
      card.classList.toggle("adverts-item--featured", Boolean(item.isFeatured));
    }

    const mediaWrap = clone.querySelector(".adverts-media");
    const record = Array.isArray(item.media) && item.media.length ? item.media[0] : null;
    if (record?.type === "video") {
      const video = document.createElement("video");
      video.controls = true;
      video.src = record.url;
      video.preload = shouldFastLoadUi ? "none" : "metadata";
      mediaWrap.appendChild(video);
    } else if (record?.type === "image") {
      const img = document.createElement("img");
      img.src = record.url;
      img.alt = "Advert";
      img.loading = "lazy";
      img.decoding = "async";
      img.fetchPriority = "low";
      img.addEventListener("click", () => {
        openMediaViewerImage(record.url);
      });
      mediaWrap.appendChild(img);
    } else {
      const placeholder = document.createElement("p");
      placeholder.className = "adverts-hint";
      placeholder.textContent = "No media";
      mediaWrap.appendChild(placeholder);
    }

    const badge = clone.querySelector("[data-badge]");
    const badgeBits = [];
    if (item.isVerified) badgeBits.push("Verified");
    if (adminEnabled && item.status) badgeBits.push(String(item.status));
    badge.textContent = badgeBits.length ? badgeBits.join(" • ") : "";
    if (badge) {
      badge.hidden = badge.textContent.trim().length === 0;
    }

    const copy = clone.querySelector("[data-copy]");
    copy.textContent = item.content;
    copy.classList.remove("adverts-copy--clickable");
    copy.onclick = null;
    copy.onkeydown = null;
    copy.removeAttribute("role");
    copy.removeAttribute("tabindex");
    copy.removeAttribute("aria-label");

    const linkEl = clone.querySelector("[data-link]");
    if (linkEl) {
      const url = String(item.linkUrl || "").trim();
      if (url) {
        linkEl.hidden = false;
        linkEl.href = url;
        linkEl.textContent = "Open link";
        linkEl.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          openExternalAdvertLink(url);
        };
      } else {
        linkEl.hidden = true;
        linkEl.removeAttribute("href");
        linkEl.textContent = "";
        linkEl.onclick = null;
      }
    }

    const meta = clone.querySelector("[data-meta]");
    const until = item.activeUntil ? new Date(item.activeUntil).toLocaleString() : "";
    meta.textContent = until ? `Active until: ${until}` : "";

    const adminActions = clone.querySelector("[data-admin-actions]");
    if (adminActions) {
      const canUseAdmin = adminEnabled;
      adminActions.hidden = !canUseAdmin;
      const activateBtn = clone.querySelector("[data-admin-activate]");
      const mediaBtn = clone.querySelector("[data-admin-media]");
      const editBtn = clone.querySelector("[data-admin-edit]");
      const linkBtn = clone.querySelector("[data-admin-link]");
      const verifyBtn = clone.querySelector("[data-admin-verify]");
      const featureBtn = clone.querySelector("[data-admin-feature]");
      const removeBtn = clone.querySelector("[data-admin-remove]");

      if (activateBtn) {
        const status = String(item.status || "").toLowerCase();
        activateBtn.hidden = !canUseAdmin || status === "active";
        activateBtn.addEventListener("click", async () => {
          try {
            await adminActivateAd(item.id, item.plan || "weekly", item.isFeatured);
            await loadFeed();
          } catch (error) {
            setFeedStatus(error.message);
          }
        });
      }

      if (mediaBtn) {
        mediaBtn.addEventListener("click", async () => {
          try {
          closeDialog();
            const files = await pickAdminMediaFiles({ multiple: true });
            if (!files || !files.length) {
              return;
            }

            const anyVideo = Array.from(files).some((file) => String(file.type || "").startsWith("video/"));
            if (anyVideo && files.length > 1) {
              throw new Error("Upload either images only or a single video.");
            }

            setFeedStatus("Uploading media…");
            await adminUpdateMedia(item.id, files);
            await loadFeed();
          } catch (error) {
            setFeedStatus(error.message);
          }
        });
      }

      if (editBtn) {
        editBtn.addEventListener("click", async () => {
          try {
            const nextContent = prompt("Edit ad description:", String(item.content || "").trim());
            if (nextContent === null) {
              return;
            }
            const nextLink = prompt("Edit ad link (blank to remove):", String(item.linkUrl || "").trim());
            if (nextLink === null) {
              return;
            }

            setFeedStatus("Updating advert…");
            await adminUpdateAd(item.id, {
              content: String(nextContent || "").trim(),
              linkUrl: String(nextLink || "").trim()
            });
            await loadFeed();
          } catch (error) {
            setFeedStatus(error.message);
          }
        });
      }

      if (linkBtn) {
        linkBtn.addEventListener("click", async () => {
          try {
            const nextLink = prompt("Edit ad link (blank to remove):", String(item.linkUrl || "").trim());
            if (nextLink === null) {
              return;
            }

            setFeedStatus("Updating link…");
            await adminUpdateAd(item.id, { linkUrl: String(nextLink || "").trim() });
            await loadFeed();
          } catch (error) {
            setFeedStatus(error.message);
          }
        });
      }

      if (verifyBtn) {
        verifyBtn.textContent = item.isVerified ? "Unverify" : "Verify";
        verifyBtn.addEventListener("click", async () => {
          try {
            setFeedStatus("Updating verification…");
            await adminUpdateAd(item.id, { verified: !item.isVerified });
            await loadFeed();
          } catch (error) {
            setFeedStatus(error.message);
          }
        });
      }

      if (featureBtn) {
        featureBtn.textContent = item.isFeatured ? "Unfeature" : "Feature";
        featureBtn.addEventListener("click", async () => {
          try {
            await adminSetFeatured(item.id, !item.isFeatured);
            await loadFeed();
          } catch (error) {
            setFeedStatus(error.message);
          }
        });
      }
      if (removeBtn) {
        removeBtn.addEventListener("click", async () => {
          try {
            if (!confirm("Remove this advert?")) {
              return;
            }
            await adminRemoveAd(item.id);
            await loadFeed();
          } catch (error) {
            setFeedStatus(error.message);
          }
        });
      }
    }

    fragment.appendChild(clone);
  });

  adsFeed.appendChild(fragment);
}

async function adminActivateAd(adId, plan, featured) {
  const res = await fetch(apiUrl(`/api/adverts/admin/ads/${encodeURIComponent(adId)}/activate`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAdminHeaders()
    },
    body: JSON.stringify({
      plan: String(plan || "weekly").toLowerCase(),
      featured: Boolean(featured)
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Could not activate advert.");
  }
  return data;
}

async function adminSetFeatured(adId, enabled) {
  const res = await fetch(apiUrl(`/api/adverts/admin/ads/${encodeURIComponent(adId)}/feature`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAdminHeaders()
    },
    body: JSON.stringify({ enabled })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Could not update featured status.");
  }
  return data;
}

async function adminRemoveAd(adId) {
  const res = await fetch(apiUrl(`/api/adverts/admin/ads/${encodeURIComponent(adId)}`), {
    method: "DELETE",
    headers: {
      ...getAdminHeaders()
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Could not remove advert.");
  }
  return data;
}

async function adminUpdateMedia(adId, files) {
  const fd = new FormData();
  Array.from(files || []).forEach((file) => {
    fd.append("media", file);
  });

  const res = await fetch(apiUrl(`/api/adverts/admin/ads/${encodeURIComponent(adId)}/media`), {
    method: "POST",
    headers: {
      ...getAdminHeaders()
    },
    body: fd
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Could not update media.");
  }
  return data;
}

async function adminUpdateAd(adId, patch) {
  const res = await fetch(apiUrl(`/api/adverts/admin/ads/${encodeURIComponent(adId)}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAdminHeaders()
    },
    body: JSON.stringify(patch || {})
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Could not update advert.");
  }
  return data;
}

function pickAdminMediaFiles({ multiple }) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*";
    input.multiple = Boolean(multiple);
    input.addEventListener("change", () => resolve(input.files));
    input.click();
  });
}

async function createAdvert() {
  const mediaType = safeMediaType();
  const file = mediaInput.files?.[0] || null;

  if (mediaType === "video" && !file) {
    throw new Error("Please upload a video file for a video advert.");
  }
  if (file && mediaType === "image" && !String(file.type).startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }
  if (file && mediaType === "video" && !String(file.type).startsWith("video/")) {
    throw new Error("Please upload a video file.");
  }

  const fd = new FormData();
  fd.append("phone", phoneInput.value.trim());
  fd.append("content", contentInput.value.trim());
  fd.append("linkUrl", String(linkInput?.value || "").trim());
  fd.append("plan", planSelect.value);
  fd.append("featured", featuredCheckbox.checked ? "true" : "false");
  fd.append("mediaType", mediaType);
  if (file) {
    fd.append("media", file);
  }

  const res = await fetch(apiUrl("/api/adverts/ads"), {
    method: "POST",
    headers: {
      ...(adminEnabled ? getAdminHeaders() : {})
    },
    body: fd
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Could not create advert.");
  }

  if (!data.requiresPayment) {
    payBtn.hidden = true;
    const until = data?.ad?.activeUntil ? new Date(data.ad.activeUntil).toLocaleString() : "";
    setDialogStatus(until ? `Ad is active until ${until}.` : "Ad is active.");
    await loadFeed();
    return;
  }

  currentAdId = data.ad.id;
  renderCreatedPreview(data.ad);
  payBtn.hidden = false;
  setDialogStatus("Advert created. Please pay to activate.");
  if (createBtn) createBtn.disabled = true;
  setFormEnabled(false);

  const email = String(emailInput?.value || "").trim();
  if (!email) {
    if (emailInput) {
      emailInput.disabled = false;
      setTimeout(() => emailInput.focus(), 0);
    }
    setDialogStatus("Advert created. Enter your email to pay and activate.");
    return;
  }

  setTimeout(() => payBtn?.focus(), 0);

  // Let the preview/status paint before Paystack opens.
  setTimeout(() => {
    payForAdvert().catch((error) => setDialogStatus(error.message));
  }, 160);
}

async function verifyPayment(reference) {
  const res = await fetch(apiUrl("/api/verify-payment"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Payment verification failed.");
  }
  return data;
}

async function payForAdvert() {
  if (!currentAdId) {
    return;
  }

  if (!paystackPublicKey) {
    throw new Error("Paystack is not configured on the server.");
  }

  const email = String(emailInput?.value || "").trim();
  if (!email) {
    throw new Error("Please enter an email for payment.");
  }

  if (typeof PaystackPop === "undefined") {
    throw new Error("Paystack checkout failed to load.");
  }

  setDialogStatus("Opening Paystack checkout…");

  const restoreDialogAfterCheckout = (() => {
    const wasOpen = Boolean(adDialog?.open);
    if (wasOpen) {
      try {
        adDialog.close();
      } catch {
        // Ignore.
      }
    }

    return () => {
      if (!wasOpen || !adDialog) return;
      try {
        if (!adDialog.open) {
          adDialog.showModal();
        }
      } catch {
        // Ignore.
      }
    };
  })();

  const res = await fetch(apiUrl(`/api/adverts/ads/${currentAdId}/pay`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan: planSelect.value,
      featured: featuredCheckbox.checked,
      email
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Could not start payment.");
  }

  if (data.totals) {
    const extra = data.totals.extraFeaturedAmount ? ` + Featured ${money(data.totals.extraFeaturedAmount)}` : "";
    paymentSummary.textContent = `Total: ${money(data.totals.totalAmount)}${extra}.`;
  }

  const reference = String(data.reference || "").trim();
  const amount = Number(data.amount);
  const currency = String(data.currency || "KES").trim() || "KES";

  if (!reference || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Could not start Paystack payment.");
  }

  const handler = PaystackPop.setup({
    key: paystackPublicKey,
    email,
    amount,
    currency,
    ref: reference,
    callback: function (response) {
      restoreDialogAfterCheckout();
      setDialogStatus("Verifying payment…");
      const ref = String(response?.reference || reference).trim();
      verifyPayment(ref)
        .then(async () => {
          setDialogStatus("Payment verified. Advert activated.");
          payBtn.hidden = true;
          await loadFeed();
          closeDialog();
        })
        .catch((error) => {
          setDialogStatus(error?.message || "Payment verification failed.");
        });
    },
    onClose: function () {
      restoreDialogAfterCheckout();
      setDialogStatus("Payment cancelled.");
    }
  });

  try {
    handler.openIframe();
  } catch (error) {
    restoreDialogAfterCheckout();
    throw new Error(error?.message || "Could not open Paystack checkout.");
  }
}

advertiseBtn?.addEventListener("click", openDialog);
featuredViewerBtn?.addEventListener("click", () => {
  if (!featuredSlides.length) {
    setFeedStatus("No featured adverts right now.");
    return;
  }

  try {
    featuredViewerDialog?.showModal();
  } catch {
    featuredViewerDialog?.show();
  }
});
closeDialogBtn?.addEventListener("click", closeDialog);
closeMediaViewerBtn?.addEventListener("click", closeMediaViewer);
closeFeaturedViewerBtn?.addEventListener("click", closeFeaturedViewer);
adDialog?.addEventListener("click", (event) => {
  const rect = adDialog.getBoundingClientRect();
  const clickedInDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!clickedInDialog) {
    closeDialog();
  }
});

mediaViewerDialog?.addEventListener("click", (event) => {
  const rect = mediaViewerDialog.getBoundingClientRect();
  const clickedInDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!clickedInDialog) {
    closeMediaViewer();
  }
});

featuredViewerDialog?.addEventListener("click", (event) => {
  const rect = featuredViewerDialog.getBoundingClientRect();
  const clickedInDialog =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  if (!clickedInDialog) {
    closeFeaturedViewer();
  }
});

adForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    setDialogStatus("Creating advert…");
    await createAdvert();
  } catch (error) {
    setDialogStatus(error.message);
  }
});

payBtn.addEventListener("click", async () => {
  try {
    await payForAdvert();
  } catch (error) {
    setDialogStatus(error.message);
  }
});

planSelect.addEventListener("change", refreshHints);
mediaTypeSelect.addEventListener("change", refreshHints);
featuredCheckbox.addEventListener("change", refreshHints);

adminEnableBtn?.addEventListener("click", async () => {
  try {
    const next = String(adminTokenInput?.value || "").trim();
    setAdminToken(next);
    setFeedStatus("Checking admin token…");
    await validateAdminTokenOrThrow();
    setAdminEnabled(true);
    await loadFeed();
  } catch (error) {
    setAdminEnabled(false);
    setFeedStatus(error.message);
  }
});

document.addEventListener("keydown", async (event) => {
  const key = String(event.key || "").toLowerCase();
  if (!event.ctrlKey || !event.shiftKey || key !== "a") {
    return;
  }
  event.preventDefault();
  setAdminUiVisible(!adminUiVisible);
  if (adminUiVisible) {
    adminTokenInput?.focus();
  }
  await loadFeed();
});

(async function init() {
  try {
    setAdminToken(localStorage.getItem("adminToken") || "");
    setAdminEnabled(false);
    setAdminUiVisible(false);
    setFeedStatus("Loading…");
    await loadOffers();
    await loadFeed();
    try {
      await loadPaystackConfig();
    } catch (error) {
      paystackPublicKey = "";
    }
    setDialogStatus("Ready.");
  } catch (error) {
    setFeedStatus(error.message);
  }
})();
