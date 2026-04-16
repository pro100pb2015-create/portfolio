(() => {
  const SKIP_HOME_VIDEO_INTRO_FLAG = "skipHomeVideoIntro";
  const MIN_PRELOADER_MS = 700;
  const preloaderStartedAt = performance.now();
  let isPageRevealScheduled = false;
  const yearElement = document.getElementById("year");
  const closeDetailLinks = Array.from(document.querySelectorAll(".detail-close"));
  const moscowTime = document.getElementById("moscow-time");
  const moscowWeekday = document.getElementById("moscow-weekday");
  const workStatus = document.getElementById("work-status");
  const workStatusIcon = document.getElementById("work-status-icon");
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

  if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
  }

  function updateMoscowTime() {
    if (!moscowTime) return;
    moscowTime.textContent = moscowTimeFormatter.format(new Date());
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

  if (moscowTime || moscowWeekday || workStatus || workStatusIcon) {
    updateMoscowTime();
    updateMoscowMeta();
    window.setInterval(updateMoscowTime, 1000);
    window.setInterval(updateMoscowMeta, 60 * 1000);
  }

  const revealPageUi = () => {
    if (isPageRevealScheduled) return;
    isPageRevealScheduled = true;
    const elapsed = performance.now() - preloaderStartedAt;
    const delay = Math.max(0, MIN_PRELOADER_MS - elapsed);
    window.setTimeout(() => {
      const preloaderVisuals = Array.from(document.querySelectorAll(".preloader-visual"));
      if (!preloaderVisuals.length || !document.body) {
        document.body?.classList.add("is-ready");
        return;
      }

      const getVisibleSlideIndex = () =>
        preloaderVisuals.findIndex((node) => Number.parseFloat(getComputedStyle(node).opacity) > 0.5);

      const initialSlideIndex = getVisibleSlideIndex();
      if (initialSlideIndex < 0) {
        document.body.classList.add("is-ready");
        return;
      }

      let attempts = 0;
      const maxAttempts = 20;
      const checkSlideBoundary = () => {
        if (!document.body || document.body.classList.contains("is-ready")) return;
        const currentSlideIndex = getVisibleSlideIndex();
        if (currentSlideIndex >= 0 && currentSlideIndex !== initialSlideIndex) {
          document.body.classList.add("is-ready");
          return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) {
          document.body.classList.add("is-ready");
          return;
        }
        window.setTimeout(checkSlideBoundary, 30);
      };

      window.setTimeout(checkSlideBoundary, 30);
    }, delay);
  };

  if (document.readyState === "complete") {
    revealPageUi();
  } else {
    window.addEventListener("load", revealPageUi, { once: true });
  }
  window.setTimeout(revealPageUi, 1800);

  const markSkipHomeVideoIntro = () => {
    try {
      sessionStorage.setItem(SKIP_HOME_VIDEO_INTRO_FLAG, "1");
    } catch {
      // Ignore storage errors in restricted contexts.
    }
  };

  closeDetailLinks.forEach((link) => {
    link.addEventListener("pointerdown", markSkipHomeVideoIntro);
    link.addEventListener("click", markSkipHomeVideoIntro);
  });
})();
