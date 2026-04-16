(() => {
  const moscowTime = document.getElementById("moscow-time");
  const moscowWeekday = document.getElementById("moscow-weekday");
  const workStatus = document.getElementById("work-status");
  const workStatusIcon = document.getElementById("work-status-icon");
  const desktopScene = document.querySelector(".desktop-scene");
  const desktopVideos = Array.from(document.querySelectorAll(".desktop-video"));
  const projectsWindow = document.getElementById("projects-window");
  const projectsWindowHead = document.querySelector(".desktop-window-head");
  const closeProjectsWindowButton = document.querySelector(".desktop-window-head .window-close");
  const openProjectsWindowButtons = Array.from(document.querySelectorAll("[data-open-window='projects-window']"));
  const projectsZone = document.getElementById("projects");
  const desktop = document.getElementById("desktop-icons");
  const draggableItems = Array.from(document.querySelectorAll("[data-draggable='true']"));

  let currentZ = 10;
  const DRAG_MOVE_THRESHOLD = 8;
  const VIDEO_CROSSFADE_MS = 1400;
  const VIDEO_OVERLAP_SECONDS = 1.4;
  const SKIP_HOME_VIDEO_INTRO_FLAG = "skipHomeVideoIntro";
  const moscowTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const moscowWeekdayShortFormatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    weekday: "short",
  });
  const moscowHourFormatter = new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    hour12: false,
  });

  function safePlay(video) {
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }

  function updateMoscowTime() {
    if (!moscowTime) return;
    const formatted = moscowTimeFormatter.format(new Date());
    moscowTime.textContent = formatted;
  }

  function resolveWorkStatus(now) {
    const weekdayLabel = moscowWeekdayShortFormatter.format(now).replace(".", "").toLowerCase();
    const hour = Number(moscowHourFormatter.format(now));
    const isWeekday = ["пн", "вт", "ср", "чт", "пт"].includes(weekdayLabel);
    const isWeekend = ["сб", "вс"].includes(weekdayLabel);

    if (isWeekday && hour >= 10 && hour < 19) {
      return { text: "Работаю", iconClass: "fa-pen-ruler" };
    }
    if (isWeekend) {
      return { text: "Отдых от рабочей недели", iconClass: "fa-face-smile" };
    }
    return { text: "Вне рабочего времени", iconClass: "fa-moon" };
  }

  function updateMoscowMeta() {
    if (!moscowWeekday && !workStatus && !workStatusIcon) return;

    const now = new Date();
    if (moscowWeekday) {
      const shortWeekday = moscowWeekdayShortFormatter.format(now).replace(".", "");
      moscowWeekday.textContent = shortWeekday.charAt(0).toUpperCase() + shortWeekday.slice(1);
    }
    const status = resolveWorkStatus(now);
    if (workStatus) {
      workStatus.textContent = status.text;
    }
    if (workStatusIcon) {
      workStatusIcon.className = `fa-solid ${status.iconClass} menubar-status-icon`;
    }
  }

  function initClock() {
    updateMoscowTime();
    updateMoscowMeta();
    window.setInterval(updateMoscowTime, 1000);
    window.setInterval(updateMoscowMeta, 60 * 1000);
  }

  function initVideoBackground() {
    if (!desktopVideos.length || !desktopScene) return;
    const MIN_PRELOADER_MS = 1000;
    const preloaderStartedAt = performance.now();
    let isHomeUiRevealScheduled = false;
    const hasEarlyNoIntroClass = document.documentElement.classList.contains("no-home-video-intro");
    const skipIntroOnce = hasEarlyNoIntroClass || consumeSkipHomeVideoIntroFlag() || shouldSkipVideoIntroByHash();
    if (skipIntroOnce) {
      desktopScene.classList.add("skip-video-intro");
    }
    const revealAfterCurrentPreloaderSlide = () => {
      const revealNow = () => {
        if (document.body && !document.body.classList.contains("is-ready")) {
          document.body.classList.add("is-ready");
        }
      };

      const ticker = document.querySelector(".preloader-ticker");
      if (!ticker) {
        revealNow();
        return;
      }

      let isRevealed = false;
      const revealOnce = () => {
        if (isRevealed) return;
        isRevealed = true;
        ticker.removeEventListener("animationiteration", revealOnce);
        revealNow();
      };

      ticker.addEventListener("animationiteration", revealOnce, { once: true });
      window.setTimeout(revealOnce, 520);
    };

    const revealHomeUi = () => {
      if (isHomeUiRevealScheduled) return;
      isHomeUiRevealScheduled = true;
      const elapsed = performance.now() - preloaderStartedAt;
      const delay = Math.max(0, MIN_PRELOADER_MS - elapsed);
      window.setTimeout(revealAfterCurrentPreloaderSlide, delay);
    };

    let isVideoReadyMarked = false;
    const markVideoReady = () => {
      if (isVideoReadyMarked) return;
      isVideoReadyMarked = true;
      desktopScene.classList.add("video-ready");
      revealHomeUi();
      if (skipIntroOnce) {
        window.requestAnimationFrame(() => {
          desktopScene.classList.remove("skip-video-intro");
          document.documentElement.classList.remove("no-home-video-intro");
        });
      }
    };
    const isMobileViewport = window.matchMedia("(max-width: 920px)").matches;
    const [firstVideo] = desktopVideos;

    const markWhenFrameActuallyStarts = (video) => {
      const onTimeUpdate = () => {
        if (video.currentTime > 0.01) {
          video.removeEventListener("timeupdate", onTimeUpdate);
          markVideoReady();
        }
      };
      video.addEventListener("playing", markVideoReady, { once: true });
      video.addEventListener("timeupdate", onTimeUpdate);
    };

    // Last-resort fallback if browser does not dispatch media readiness events.
    window.setTimeout(markVideoReady, 3500);
    window.setTimeout(revealHomeUi, 4200);

    if (desktopVideos.length < 2) {
      firstVideo.loop = true;
      markWhenFrameActuallyStarts(firstVideo);
      safePlay(firstVideo);
      if (firstVideo.readyState >= 2) markVideoReady();
      return;
    }

    if (isMobileViewport) {
      desktopVideos.forEach((video, index) => {
        video.loop = index === 0;
      });
      desktopVideos.forEach((video, index) => {
        video.classList.toggle("is-active", index === 0);
      });
      markWhenFrameActuallyStarts(firstVideo);
      safePlay(firstVideo);
      if (firstVideo.readyState >= 2) markVideoReady();
      return;
    }

    let activeVideo = desktopVideos[0];
    let nextVideo = desktopVideos[1];
    let isCrossfading = false;

    function setActiveVideo(video) {
      desktopVideos.forEach((item) => item.classList.toggle("is-active", item === video));
    }

    function crossfadeToNext() {
      if (isCrossfading) return;
      isCrossfading = true;
      desktopScene.classList.add("video-crossfading");

      nextVideo.currentTime = 0;
      const finishSwap = () => {
        setActiveVideo(nextVideo);
        window.setTimeout(() => {
          activeVideo.pause();
          activeVideo.currentTime = 0;
          const oldActive = activeVideo;
          activeVideo = nextVideo;
          nextVideo = oldActive;
          isCrossfading = false;
          desktopScene.classList.remove("video-crossfading");
        }, VIDEO_CROSSFADE_MS);
      };

      if (nextVideo.readyState >= 2) {
        safePlay(nextVideo);
        finishSwap();
      } else {
        const onReady = () => {
          nextVideo.removeEventListener("canplay", onReady);
          safePlay(nextVideo);
          finishSwap();
        };
        nextVideo.addEventListener("canplay", onReady);
        safePlay(nextVideo);
      }
    }

    desktopVideos.forEach((video) => {
      video.loop = false;
      video.addEventListener("timeupdate", () => {
        if (video !== activeVideo || isCrossfading) return;
        const { duration, currentTime } = video;
        if (!duration || !Number.isFinite(duration)) return;
        if (duration - currentTime <= VIDEO_OVERLAP_SECONDS) {
          crossfadeToNext();
        }
      });
      video.addEventListener("ended", crossfadeToNext);
    });

    setActiveVideo(activeVideo);
    markWhenFrameActuallyStarts(firstVideo);
    safePlay(activeVideo);
    if (firstVideo.readyState >= 2) markVideoReady();
  }

  function consumeSkipHomeVideoIntroFlag() {
    try {
      const shouldSkip = sessionStorage.getItem(SKIP_HOME_VIDEO_INTRO_FLAG) === "1";
      if (shouldSkip) {
        sessionStorage.removeItem(SKIP_HOME_VIDEO_INTRO_FLAG);
      }
      return shouldSkip;
    } catch {
      return false;
    }
  }

  function shouldSkipVideoIntroByHash() {
    return window.location.hash === "#projects";
  }

  function openProjectsWindow() {
    setProjectsWindowVisibility(true);
    if (projectsZone && window.matchMedia("(max-width: 920px)").matches) {
      const topOffset = 12;
      const zoneTop = projectsZone.getBoundingClientRect().top + window.scrollY;
      const targetY = Math.max(0, zoneTop - topOffset);
      smoothScrollToY(targetY, 650);
    }
  }

  function smoothScrollToY(targetY, durationMs = 600) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, targetY);
      return;
    }

    const startY = window.scrollY;
    const distance = targetY - startY;
    if (Math.abs(distance) < 1) return;
    const startTime = performance.now();

    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const easedProgress = easeInOutCubic(progress);
      window.scrollTo(0, startY + distance * easedProgress);
      if (progress < 1) {
        window.requestAnimationFrame(tick);
      }
    };

    window.requestAnimationFrame(tick);
  }

  function closeProjectsWindow() {
    setProjectsWindowVisibility(false);
  }

  function setProjectsWindowVisibility(isVisible) {
    if (!projectsWindow || !projectsWindowHead) return;
    projectsWindow.classList.toggle("is-hidden", !isVisible);
    projectsWindowHead.classList.toggle("is-hidden", !isVisible);
  }

  function initProjectsWindow() {
    if (closeProjectsWindowButton) {
      closeProjectsWindowButton.addEventListener("click", closeProjectsWindow);
    }
    openProjectsWindowButtons.forEach((button) => {
      button.addEventListener("click", openProjectsWindow);
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function setupDraggable(item) {
    if (!desktop) return;
    const dragState = {
      pointerId: null,
      dragging: false,
      moved: false,
      offsetX: 0,
      offsetY: 0,
      startLeft: 0,
      startTop: 0,
    };

    function onPointerMove(event) {
      if (!dragState.dragging || dragState.pointerId !== event.pointerId) return;
      event.preventDefault();

      const desktopRect = desktop.getBoundingClientRect();
      const rawLeft = event.clientX - desktopRect.left - dragState.offsetX;
      const rawTop = event.clientY - desktopRect.top - dragState.offsetY;

      const maxLeft = desktop.clientWidth - item.offsetWidth;
      const maxTop = desktop.clientHeight - item.offsetHeight;
      const nextLeft = clamp(rawLeft, 0, maxLeft);
      const nextTop = clamp(rawTop, 0, maxTop);

      const deltaX = nextLeft - dragState.startLeft;
      const deltaY = nextTop - dragState.startTop;
      if (Math.abs(deltaX) > DRAG_MOVE_THRESHOLD || Math.abs(deltaY) > DRAG_MOVE_THRESHOLD) {
        dragState.moved = true;
      }

      item.style.left = `${nextLeft}px`;
      item.style.top = `${nextTop}px`;
    }

    function releaseDrag(event) {
      if (!dragState.dragging || (event && dragState.pointerId !== event.pointerId)) return;
      dragState.dragging = false;

      if (typeof item.releasePointerCapture === "function" && dragState.pointerId !== null) {
        try {
          item.releasePointerCapture(dragState.pointerId);
        } catch {
          // Ignore failures when pointer capture is already released.
        }
      }

      item.classList.remove("is-dragging");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", releaseDrag);
      window.removeEventListener("pointercancel", releaseDrag);

      if (dragState.moved) {
        item.dataset.blockClick = "true";
      }
    }

    item.setAttribute("draggable", "false");
    item.addEventListener("dragstart", (event) => event.preventDefault());

    item.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType !== "touch") return;
      if (event.target && event.target.closest("[data-no-drag='true']")) return;

      event.preventDefault();

      const rect = item.getBoundingClientRect();
      dragState.pointerId = event.pointerId;
      dragState.dragging = true;
      dragState.moved = false;
      dragState.offsetX = event.clientX - rect.left;
      dragState.offsetY = event.clientY - rect.top;
      dragState.startLeft = item.offsetLeft;
      dragState.startTop = item.offsetTop;

      if (typeof item.setPointerCapture === "function") {
        item.setPointerCapture(event.pointerId);
      }

      item.style.zIndex = String(++currentZ);
      item.classList.add("is-dragging");

      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", releaseDrag);
      window.addEventListener("pointercancel", releaseDrag);
    });

    item.addEventListener("click", (event) => {
      if (item.dataset.blockClick === "true") {
        event.preventDefault();
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }
        item.dataset.blockClick = "false";
      }
    }, true);
  }

  function initDesktopDrag() {
    draggableItems.forEach(setupDraggable);
  }

  initClock();
  initVideoBackground();
  initProjectsWindow();
  initDesktopDrag();
})();
