const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealSelector = [
  ".hero-logo",
  ".hero-copy",
  ".feature-strip p",
  ".section-head",
  ".category-filters .filter-chip",
  ".product-card",
  ".product-detail-card",
  ".related-card",
  ".pagination",
  ".panel",
  ".admin-product-item",
  ".list-item",
  ".footer-wrap p"
].join(",");

let revealCounter = 0;

const revealObserver = !REDUCED_MOTION && "IntersectionObserver" in window
  ? new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.15,
      rootMargin: "0px 0px -8% 0px"
    }
  )
  : null;

function prepareReveals(root = document) {
  const targets = collectTargets(root);

  targets.forEach((element) => {
    if (element.dataset.revealReady === "1") {
      return;
    }

    element.dataset.revealReady = "1";
    element.classList.add("reveal-block");

    const delay = Math.min((revealCounter % 8) * 45, 315);
    element.style.setProperty("--reveal-delay", `${delay}ms`);
    revealCounter += 1;

    if (!revealObserver) {
      element.classList.add("is-visible");
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      requestAnimationFrame(() => {
        element.classList.add("is-visible");
      });
      return;
    }

    revealObserver.observe(element);
  });
}

function collectTargets(root) {
  const targets = [];

  if (root === document) {
    document.querySelectorAll(revealSelector).forEach((node) => targets.push(node));
    return targets;
  }

  if (root.nodeType !== Node.ELEMENT_NODE) {
    return targets;
  }

  if (root.matches(revealSelector)) {
    targets.push(root);
  }

  root.querySelectorAll(revealSelector).forEach((node) => targets.push(node));
  return targets;
}

function initMutationObserver() {
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        prepareReveals(node);
      });
    });
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function initButtonRipple() {
  if (REDUCED_MOTION) {
    return;
  }

  document.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    const button = event.target.closest(".btn, .filter-chip, .page-btn, .btn-small");
    if (!button || button.disabled) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "btn-ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;

    button.appendChild(ripple);
    ripple.addEventListener(
      "animationend",
      () => {
        ripple.remove();
      },
      { once: true }
    );
  });
}

prepareReveals(document);
initMutationObserver();
initButtonRipple();
