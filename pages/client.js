window.ClientPage = {
  init: initClient,
};

function initClient() {
  const $ = window.jQuery;

  if (!$) {
    console.warn("jQuery is not available. Client page code did not run.");
    return;
  }

  const ROOT = ".page_wrap";
  if (!$(ROOT).length) return;

  const SEL = {
    slider: ROOT + " .slider-category_component",
    card: ROOT + " .move-category-box",
    swiper: ".swiper",
    next: ".swiper-next",
    prev: ".swiper-prev",

    randomize: ROOT + " #randomize-button",
    startButton: ROOT + " #start-button",
    lockSwitch: ".lock-switch",

    // Triggers inside each card
    btnDeepdive: ".ex-modes-button.is-deepdive",
    btnExecute: ".ex-modes-button.is-execute",

    // Overlay wrapper + close + mode toggle
    overlay: ROOT + " .exercise-overlay",
    overlayClose: ROOT + " .exercise-overlay-close",
    overlayToggle: ROOT + " .overlay-mode-toggle",

    // Deepdive targets
    ddBody: ".deepdive-body",
    ddGraphic: ".deepdive-graphic",
    chevron: ".chevron",

    // Deepdive sources inside card, hidden
    hiddenSource: ".ex-hidden-source",
    ddRichSrc: ".ex-deepdive-rt",
    ddImgSrc: "img.ex-graphic-img",

    // EXECUTE IDs
    executeOverlay: "#executeOverlay",
    executeMount: "#executeVimeoMount",
    executeDose: "#executeDose",
    executeCue1: "#executeCue1",
    executeCue2: "#executeCue2",
    executeCue3: "#executeCue3",
    executeClose: "#executeClose",
    executeBack: "#executeBack",
    executeNext: "#executeNext",
    executeFit: "#executeFit",
    executeFill: "#executeFill",
    executeFullscreen: "#executeFullscreen",

    // Progress
    progressFill: "#executeProgressFill",

    // NEXT internal UI
    nextLabel: ".execute-text-label",
    nextComplete: ".execute-complete",
    completeBtn: ".execute-complete__btn",
  };

  const CLS = {
    locked: "is-locked",
    executeOpen: "is-open",
  };

  let currentCard = null;
  let currentCatIndex = -1;
  let executeMode = "preview";

  // -------------------------
  // 0) SWIPER INIT
  // -------------------------
  if (typeof Swiper !== "undefined") {
    $(SEL.slider).each(function () {
      const $comp = $(this);
      const swEl = $comp.find(SEL.swiper)[0];

      if (!swEl) return;
      if ($comp.data("swiper")) return;

      const inst = new Swiper(swEl, {
        speed: 200,
        rewind: true,
        allowTouchMove: false,
        slidesPerView: "auto",
        navigation: {
          nextEl: $comp.find(SEL.next)[0],
          prevEl: $comp.find(SEL.prev)[0],
        },
      });

      $comp.data("swiper", inst);
    });
  }

  // -------------------------
  // 1) OVERLAY SHELL
  // -------------------------
  const Overlay = (function () {
    const $ov = $(SEL.overlay).first();

    if (!$ov.length) {
      return {
        isOpen: () => false,
        open: () => {},
        close: () => {},
        activeScene: () => "",
        $ov: $(),
      };
    }

    const $btnClose = $ov.find(SEL.overlayClose).first();
    const $btnToggle = $ov.find(SEL.overlayToggle).first();

    function lockScroll(lock) {
      document.documentElement.style.overflow = lock ? "hidden" : "";
      document.body.style.overflow = lock ? "hidden" : "";
    }

    function open(scene) {
      $ov.attr("data-open", "true")
        .attr("data-active-scene", scene)
        .attr("aria-hidden", "false");

      lockScroll(true);

      if ($btnToggle.length) {
        $btnToggle.text(scene === "deepdive" ? "Practice" : "Deep dive");
      }
    }

    function close() {
      $ov.attr("data-open", "false").attr("aria-hidden", "true");
      lockScroll(false);
    }

    function isOpen() {
      return $ov.attr("data-open") === "true";
    }

    function activeScene() {
      return $ov.attr("data-active-scene");
    }

    $btnClose.on("click", function (e) {
      e.preventDefault();
      closeAll();
    });

    return { isOpen, open, close, activeScene, $ov };
  })();

  function setOverlayTitles(title) {
    const t = (title || "").trim() || "Exercise";
    Overlay.$ov.find(".deepdive-ex-title").text(t);
  }

  function cloneImgFullRes(imgEl) {
    const clone = imgEl.cloneNode(true);
    const srcset = clone.getAttribute("srcset");

    if (srcset) {
      const best = srcset
        .split(",")
        .map((s) => s.trim())
        .map((part) => {
          const [url, size] = part.split(/\s+/);
          const w = size && size.endsWith("w") ? parseInt(size, 10) : 0;
          return { url, w };
        })
        .sort((a, b) => b.w - a.w)[0];

      if (best?.url) clone.setAttribute("src", best.url);
      clone.removeAttribute("srcset");
      clone.removeAttribute("sizes");
    }

    clone.setAttribute("decoding", "async");
    clone.setAttribute("loading", "eager");

    return clone;
  }

  function setCurrentFromCard($card) {
    currentCard = $card;
    const $cat = $card.closest(".slider-category_component");
    currentCatIndex = $(SEL.slider).index($cat);
  }

  // -------------------------
  // 2) LOCK SWITCH
  // -------------------------
  function syncSwitch($sw, isOn) {
    $sw.toggleClass("is-on", isOn)
      .attr("role", "switch")
      .attr("tabindex", "0")
      .attr("aria-label", "Lock category")
      .attr("aria-checked", isOn ? "true" : "false");
  }

  $(ROOT + " " + SEL.lockSwitch).each(function () {
    const $sw = $(this);
    const $cat = $sw.closest(".slider-category_component");
    syncSwitch($sw, $cat.hasClass(CLS.locked));
  });

  $(document).on("click", ROOT + " " + SEL.lockSwitch, function (e) {
    e.preventDefault();
    e.stopPropagation();

    const $sw = $(this);
    const $cat = $sw.closest(".slider-category_component");
    const newState = !$cat.hasClass(CLS.locked);

    $cat.toggleClass(CLS.locked, newState);
    syncSwitch($sw, newState);
  });

  // -------------------------
  // 3) RANDOMIZE
  // -------------------------
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  }

  $(document).on("click", SEL.randomize, function (e) {
    e.preventDefault();
    if (Overlay.isOpen()) return;

    $(SEL.slider).each(function () {
      const $cat = $(this);
      if ($cat.hasClass(CLS.locked)) return;

      const inst = $cat.data("swiper");
      const $wrapper = $cat.find(SEL.swiper).first().find(".swiper-wrapper").first();

      if (!$wrapper.length) return;

      const slides = Array.from($wrapper[0].children);
      if (slides.length <= 1) return;

      shuffleArray(slides).forEach((slide) => $wrapper[0].appendChild(slide));

      if (inst) {
        inst.update();
        inst.slideTo(0, 0);
      }
    });
  });

  // -------------------------
  // 4) DEEPDIVE
  // -------------------------
  function populateDeepdiveFromCard($card) {
    const title = ($card.attr("data-ex-title") || "").trim() || "Exercise";
    setOverlayTitles(title);

    const $ddScene = Overlay.$ov.find(".exercise-scene.is-deepdive").first();
    const $body = $ddScene.find(SEL.ddBody).first();
    const $graphic = $ddScene.find(SEL.ddGraphic).first();
    const $chev = $ddScene.find(SEL.chevron).first();

    const $src = $card.find(SEL.hiddenSource).first();
    const $rt = $src.find(SEL.ddRichSrc).first();

    if ($body.length) $body.html($rt.length ? $rt.html() : "");

    const $img = $src.find(SEL.ddImgSrc).first();

    if ($graphic.length) {
      $graphic.empty();
      if ($img.length) $graphic.append(cloneImgFullRes($img[0]));
    }

    if ($body.length) $body.addClass("is-shrinked").attr("aria-expanded", "false");
    if ($chev.length) $chev.removeClass("is-rotated");

    const ovEl = Overlay.$ov[0];
    if (ovEl) ovEl.scrollTop = 0;
  }

  $(document).on("click", SEL.card, function (e) {
    if (
      $(e.target).closest(
        SEL.btnExecute + "," + SEL.lockSwitch + "," + SEL.next + "," + SEL.prev
      ).length
    ) {
      return;
    }

    const $card = $(this).closest(".move-category-box");
    if (!$card.length) return;

    setCurrentFromCard($card);

    if ($executeOverlay.hasClass(CLS.executeOpen)) {
      $executeOverlay.removeClass(CLS.executeOpen).attr("aria-hidden", "true");
      unloadPlayer();
    }

    populateDeepdiveFromCard($card);
    Overlay.open("deepdive");
  });

  function toggleDeepdiveBody($body) {
    const isShrinked = $body.toggleClass("is-shrinked").hasClass("is-shrinked");

    $body.siblings(SEL.chevron).toggleClass("is-rotated", !isShrinked);
    $body.attr("aria-expanded", isShrinked ? "false" : "true");
  }

  $(document).on("click", SEL.overlay + " " + SEL.ddBody, function (e) {
    if ($(e.target).closest("a, button, [data-no-toggle]").length) return;
    toggleDeepdiveBody($(this));
  });

  $(document).on("click", SEL.overlay + " " + SEL.chevron, function (e) {
    e.preventDefault();

    const $body = $(this).siblings(SEL.ddBody);
    if ($body.length) toggleDeepdiveBody($body);
  });

  // -------------------------
  // 5) EXECUTE
  // -------------------------
  const $executeOverlay = $(SEL.executeOverlay);
  const $mount = $(SEL.executeMount);
  const $dose = $(SEL.executeDose);
  const $cue1 = $(SEL.executeCue1);
  const $cue2 = $(SEL.executeCue2);
  const $cue3 = $(SEL.executeCue3);
  const $btnClose = $(SEL.executeClose);
  const $btnBack = $(SEL.executeBack);
  const $btnNext = $(SEL.executeNext);
  const $btnFit = $(SEL.executeFit);
  const $btnFill = $(SEL.executeFill);
  const $btnFullscreen = $(SEL.executeFullscreen);

  const LS_KEY = "execute_fitfill_portrait";
  let player = null;

  $(ROOT).find(".execute-button .noise-block").css("pointer-events", "none");

  function isMobilePortrait() {
    return window.matchMedia("(max-width: 767px) and (orientation: portrait)").matches;
  }

  function getSavedFitFill() {
    try {
      return localStorage.getItem(LS_KEY) || "fit";
    } catch (e) {
      return "fit";
    }
  }

  function setFitFillUI(mode) {
    const portrait = isMobilePortrait();
    const m = portrait ? mode : "fit";

    $btnFit.toggleClass("is-active", m === "fit");
    $btnFill.toggleClass("is-active", m === "fill");
  }

  function applyFitFill(mode) {
    try {
      localStorage.setItem(LS_KEY, mode);
    } catch (e) {}

    const isFill = isMobilePortrait() && mode === "fill";

    $executeOverlay.toggleClass("is-fill", isFill);
    setFitFillUI(mode);
  }

  function syncFitFillForViewport() {
    if (!isMobilePortrait()) {
      $executeOverlay.removeClass("is-fill");
      setFitFillUI("fit");
      return;
    }

    applyFitFill(getSavedFitFill());
  }

  syncFitFillForViewport();

  let fitFillTimer = null;

  $(window).on("resize orientationchange", function () {
    clearTimeout(fitFillTimer);
    fitFillTimer = setTimeout(syncFitFillForViewport, 80);
  });

  $btnFit.on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    applyFitFill("fit");
  });

  $btnFill.on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    applyFitFill("fill");
  });

  (function preconnectVimeo() {
    if (document.querySelector("link[data-preconnect-vimeo]")) return;

    ["https://player.vimeo.com", "https://i.vimeocdn.com", "https://f.vimeocdn.com"].forEach(
      (href) => {
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = href;
        link.crossOrigin = "anonymous";
        link.setAttribute("data-preconnect-vimeo", "1");
        document.head.appendChild(link);
      }
    );
  })();

  function wrapIndex(i, total) {
    return (i + total) % total;
  }

  function unloadPlayer() {
    if (player) {
      try {
        player.unload();
      } catch (e) {}
    }

    player = null;
    $mount.empty();
  }

  function extractVimeoId(url) {
    if (!url) return null;

    const match =
      url.match(/player\.vimeo\.com\/video\/(\d+)/) ||
      url.match(/vimeo\.com\/(?:video\/)?(\d+)/);

    return match ? match[1] : null;
  }

  function getActiveCardInCategory(catIndex) {
    const $cat = $(SEL.slider).eq(catIndex);
    const $activeSlide = $cat.find(".swiper-slide.swiper-slide-active").first();

    return $activeSlide.find(".move-category-box").first();
  }

  async function loadCard($card) {
    const title = ($card.attr("data-ex-title") || "").trim() || "Exercise";
    setOverlayTitles(title);

    const doseTxt = ($card.attr("data-ex-dose") || "").trim();
    const cue1Txt = ($card.attr("data-ex-cue1") || "").trim();
    const cue2Txt = ($card.attr("data-ex-cue2") || "").trim();
    const cue3Txt = ($card.attr("data-ex-cue3") || "").trim();
    const cue4Txt = ($card.attr("data-ex-cue4") || "").trim();
    const vimeoUrl = ($card.attr("data-ex-vimeo-url") || "").trim();

    $dose.text(doseTxt);
    $cue1.text(cue1Txt).toggle(!!cue1Txt);
    $cue2.text(cue2Txt).toggle(!!cue2Txt);
    $cue3.text(cue3Txt || cue4Txt).toggle(!!(cue3Txt || cue4Txt));

    unloadPlayer();

    const vimeoId = extractVimeoId(vimeoUrl);
    if (!vimeoId) return;

    const iframe = document.createElement("iframe");
    const url = new URL(`https://player.vimeo.com/video/${vimeoId}`);

    url.search = new URLSearchParams({
      autoplay: "1",
      loop: "1",
      muted: "1",
      autopause: "0",
      controls: "1",
      title: "0",
      byline: "0",
      portrait: "0",
    }).toString();

    iframe.src = url.toString();
    iframe.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
    iframe.setAttribute("allowfullscreen", "");

    $mount.empty().append(iframe);

    if (typeof Vimeo !== "undefined" && Vimeo.Player) {
      player = new Vimeo.Player(iframe);

      try {
        await player.setMuted(true);
        await player.setLoop(true);
        await player.play();
      } catch (e) {}
    }
  }

  function totalCategories() {
    return $(SEL.slider).length;
  }

  function isLastCategory(catIndex) {
    const total = totalCategories();
    return total && catIndex === total - 1;
  }

  function setProgressUI(catIndex) {
    const total = totalCategories() || 1;
    const idx = Math.max(0, Math.min(catIndex, total - 1));
    const pct = Math.round(((idx + 1) / total) * 100);
    const $fill = $(SEL.progressFill);

    if ($fill.length) $fill.css("width", pct + "%");
  }

  function setNextNormal() {
    $btnNext.attr("data-state", "next");
    $btnNext.find(SEL.nextLabel).css("display", "");
    $btnNext.find(SEL.nextComplete).css("display", "none");
  }

  function setNextComplete() {
    $btnNext.attr("data-state", "complete");
    $btnNext.find(SEL.nextLabel).css("display", "none");
    $btnNext.find(SEL.nextComplete).css("display", "flex");
  }

  function syncNextState() {
    if (executeMode !== "session") {
      setNextNormal();
      return;
    }

    if (isLastCategory(currentCatIndex)) setNextComplete();
    else setNextNormal();
  }

  function openExecuteForCategory(catIndex) {
    const total = totalCategories();
    if (!total) return;

    currentCatIndex = wrapIndex(catIndex, total);

    const $card = getActiveCardInCategory(currentCatIndex);
    if (!$card.length) return;

    currentCard = $card;

    Overlay.open("execute");
    $executeOverlay.addClass(CLS.executeOpen).attr("aria-hidden", "false");

    syncFitFillForViewport();
    setProgressUI(currentCatIndex);
    syncNextState();
    loadCard($card);
  }

  $(document).on("click", SEL.card + " " + SEL.btnExecute, function (e) {
    e.preventDefault();
    e.stopPropagation();

    const $card = $(this).closest(".move-category-box");
    if (!$card.length) return;

    executeMode = "preview";
    setCurrentFromCard($card);

    Overlay.open("execute");
    $executeOverlay.addClass(CLS.executeOpen).attr("aria-hidden", "false");

    syncFitFillForViewport();
    setProgressUI(currentCatIndex);
    syncNextState();
    loadCard($card);
  });

  $(document).on("click", SEL.startButton, function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (Overlay.isOpen()) return;

    executeMode = "session";
    openExecuteForCategory(0);
  });

  $btnClose.on("click", function (e) {
    e.preventDefault();
    closeAll();
  });

  function goBack() {
    const total = totalCategories();
    if (!total) return;

    if (executeMode === "session") {
      if (currentCatIndex <= 0) {
        closeAll();
        return;
      }

      openExecuteForCategory(currentCatIndex - 1);
      return;
    }

    openExecuteForCategory(currentCatIndex - 1);
  }

  function goNext() {
    const total = totalCategories();
    if (!total) return;

    if ($btnNext.attr("data-state") === "complete") return;

    if (executeMode === "session") {
      if (currentCatIndex >= total - 1) {
        setNextComplete();
        return;
      }

      openExecuteForCategory(currentCatIndex + 1);
      return;
    }

    openExecuteForCategory(currentCatIndex + 1);
  }

  $btnBack.on("click", function (e) {
    e.preventDefault();
    goBack();
  });

  $btnNext.on("click", function (e) {
    e.preventDefault();
    goNext();
  });

  function bindDivButtonA11y($el, onActivate) {
    $el.on("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    });
  }

  bindDivButtonA11y($btnBack, goBack);
  bindDivButtonA11y($btnNext, goNext);

  $btnNext.on("click", SEL.completeBtn, function (e) {
    e.preventDefault();
    e.stopPropagation();

    const action = $(this).attr("data-exec-complete");

    if (action === "finish") {
      closeAll();
      return;
    }

    if (action === "repeat") {
      executeMode = "session";
      openExecuteForCategory(0);
    }
  });

  $btnNext.on("keydown", SEL.completeBtn, function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;

    e.preventDefault();
    e.stopPropagation();

    $(this).trigger("click");
  });

  $executeOverlay.on("click", function (e) {
    if (e.target === this) closeAll();
  });

  $btnFullscreen.on("click", async function (e) {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (player) await player.requestFullscreen();
    } catch (err) {
      const iframe = document.querySelector("#executeVimeoMount iframe");
      if (iframe?.requestFullscreen) iframe.requestFullscreen();
    }
  });

  // -------------------------
  // 5b) MODE TOGGLE
  // -------------------------
  $(document).on("click", SEL.overlayToggle, function (e) {
    e.preventDefault();
    e.stopPropagation();

    if (!Overlay.isOpen() || !currentCard || !currentCard.length) return;

    const active = Overlay.activeScene();

    if (active === "execute") {
      if ($executeOverlay.hasClass(CLS.executeOpen)) {
        $executeOverlay.removeClass(CLS.executeOpen).attr("aria-hidden", "true");
        unloadPlayer();
      }

      populateDeepdiveFromCard(currentCard);
      Overlay.open("deepdive");
      return;
    }

    if (active === "deepdive") {
      setCurrentFromCard(currentCard);

      Overlay.open("execute");
      $executeOverlay.addClass(CLS.executeOpen).attr("aria-hidden", "false");

      syncFitFillForViewport();
      setProgressUI(currentCatIndex);
      syncNextState();
      loadCard(currentCard);
    }
  });

  // -------------------------
  // 6) CLOSE ALL + ESC
  // -------------------------
  function closeAll() {
    if ($executeOverlay.hasClass(CLS.executeOpen)) {
      $executeOverlay.removeClass(CLS.executeOpen).attr("aria-hidden", "true");
      unloadPlayer();
    }

    Overlay.close();
    executeMode = "preview";
    setNextNormal();
  }

  $(document).on("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!Overlay.isOpen()) return;

    closeAll();
  });

  if ($btnNext.length) {
    $btnNext.find(SEL.nextComplete).css("display", "none");
    $btnNext.find(SEL.nextLabel).css("display", "");
    $btnNext.attr("data-state", "next");
  }

  initHowToOverlay();
  initHowToScroll();
}

function initHowToOverlay() {
  const overlay = document.querySelector(".howto-overlay");
  const openButtons = document.querySelectorAll("[data-howto-open]");
  const closeButtons = document.querySelectorAll("[data-howto-close]");

  if (!overlay) return;

  openButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();

      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    });
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      e.preventDefault();

      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    });
  });
}

function initHowToScroll() {
  const scrollContainer = document.getElementById("howto-scroll");
  const topbar = document.getElementById("howto-topbar");
  const navLinks = document.querySelectorAll("[data-scroll-target]");

  if (!scrollContainer || !navLinks.length) return;

  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("data-scroll-target");
      const targetEl = document.getElementById(targetId);

      if (!targetEl) return;

      const containerTop = scrollContainer.getBoundingClientRect().top;
      const targetTop = targetEl.getBoundingClientRect().top;
      const currentScroll = scrollContainer.scrollTop;

      const topbarHeight = topbar ? topbar.getBoundingClientRect().height : 0;
      const extraGap = 12;

      const offset = targetTop - containerTop + currentScroll - topbarHeight - extraGap;

      scrollContainer.scrollTo({
        top: offset,
        behavior: "smooth",
      });
    });
  });
}
