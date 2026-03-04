import {
  db,
  collection,
  onSnapshot,
  query,
  orderBy
} from "./firebase.js";
import { appSettings } from "./firebase-config.js";
import { formatPrice, makeWhatsAppUrl } from "./utils.js";

const categoryFiltersEl = document.getElementById("categoryFilters");
const productsGridEl = document.getElementById("productsGrid");
const emptyStateEl = document.getElementById("emptyState");
const paginationEl = document.getElementById("pagination");
const productTemplate = document.getElementById("productCardTemplate");
const globalWhatsappLinkEl = document.getElementById("globalWhatsappLink");
const PRODUCTS_PER_PAGE = 30;

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23d6e7ff'/%3E%3Cstop offset='100%25' stop-color='%23a9c8ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='500' height='500' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23051c45' font-size='30' font-family='Source Sans 3'%3EChoice Seven Star%3C/text%3E%3C/svg%3E";

const state = {
  categories: [],
  products: [],
  activeCategory: "all",
  currentPage: 1
};

function initialize() {
  if (globalWhatsappLinkEl) {
    const href = makeWhatsAppUrl({});
    globalWhatsappLinkEl.href = href;
  }

  listenToCategories();
  listenToProducts();
}

function listenToCategories() {
  const categoriesRef = query(collection(db, "categories"), orderBy("name", "asc"));
  onSnapshot(categoriesRef, (snapshot) => {
    state.categories = snapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    }));

    if (
      state.activeCategory !== "all" &&
      !state.categories.some((category) => category.id === state.activeCategory)
    ) {
      state.activeCategory = "all";
    }

    renderCategoryFilters();
    renderProducts();
  });
}

function listenToProducts() {
  const productsRef = query(collection(db, "products"), orderBy("createdAt", "desc"));
  onSnapshot(productsRef, (snapshot) => {
    state.products = snapshot.docs.map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data()
    }));

    renderProducts();
  });
}

function renderCategoryFilters() {
  if (!categoryFiltersEl) {
    return;
  }

  categoryFiltersEl.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = `filter-chip ${state.activeCategory === "all" ? "active" : ""}`;
  allButton.textContent = "All";
  allButton.addEventListener("click", () => {
    state.activeCategory = "all";
    state.currentPage = 1;
    renderCategoryFilters();
    renderProducts();
  });
  categoryFiltersEl.appendChild(allButton);

  state.categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip ${state.activeCategory === category.id ? "active" : ""}`;
    button.textContent = category.name;
    button.addEventListener("click", () => {
      state.activeCategory = category.id;
      state.currentPage = 1;
      renderCategoryFilters();
      renderProducts();
    });
    categoryFiltersEl.appendChild(button);
  });
}

function renderProducts() {
  if (!productsGridEl || !productTemplate) {
    return;
  }

  productsGridEl.innerHTML = "";

  const visibleProducts = state.activeCategory === "all"
    ? state.products
    : state.products.filter((product) => product.categoryId === state.activeCategory);

  if (!visibleProducts.length) {
    emptyStateEl?.classList.remove("hidden");
    renderPagination(0, 0);
    return;
  }

  emptyStateEl?.classList.add("hidden");
  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / PRODUCTS_PER_PAGE));
  if (state.currentPage > totalPages) {
    state.currentPage = totalPages;
  }

  const startIndex = (state.currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const paginatedProducts = visibleProducts.slice(startIndex, endIndex);

  paginatedProducts.forEach((product) => {
    const cardFragment = productTemplate.content.cloneNode(true);

    const cardEl = cardFragment.querySelector(".product-card");
    const imageEl = cardFragment.querySelector(".product-image");
    const newBadgeEl = cardFragment.querySelector(".new-badge");
    const categoryEl = cardFragment.querySelector(".product-category");
    const nameEl = cardFragment.querySelector(".product-name");
    const descriptionEl = cardFragment.querySelector(".product-description");
    const priceEl = cardFragment.querySelector(".product-price");
    const orderButtonEl = cardFragment.querySelector(".order-button");

    const imageUrl = product.imageUrl || FALLBACK_IMAGE;
    const productName = product.name || "Product";
    const productPrice = Number(product.price) || 0;

    if (imageEl) {
      imageEl.src = imageUrl;
      imageEl.alt = productName;
    }

    if (newBadgeEl) {
      if (product.isNew) {
        newBadgeEl.classList.remove("hidden");
      } else {
        newBadgeEl.classList.add("hidden");
      }
    }

    if (categoryEl) {
      categoryEl.textContent = product.categoryName || "Uncategorized";
    }

    if (nameEl) {
      nameEl.textContent = productName;
    }

    if (descriptionEl) {
      descriptionEl.textContent = product.description || "No description available.";
    }

    if (priceEl) {
      priceEl.textContent = formatPrice(productPrice);
    }

    if (orderButtonEl) {
      orderButtonEl.href = makeWhatsAppUrl({
        productName,
        price: productPrice
      });
      orderButtonEl.setAttribute("aria-label", `Order ${productName} on WhatsApp`);
      orderButtonEl.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    }

    if (cardEl) {
      cardEl.classList.add("product-card-clickable");
      cardEl.tabIndex = 0;
      cardEl.setAttribute("role", "link");
      cardEl.setAttribute("aria-label", `Open product details for ${productName}`);

      const detailUrl = `product.html?id=${encodeURIComponent(product.id)}`;
      cardEl.addEventListener("click", () => {
        window.location.href = detailUrl;
      });

      cardEl.addEventListener("keydown", (event) => {
        if (event.target !== event.currentTarget) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          window.location.href = detailUrl;
        }
      });
    }

    productsGridEl.appendChild(cardFragment);
  });

  renderPagination(visibleProducts.length, totalPages);
}

function renderPagination(totalProducts, totalPages) {
  if (!paginationEl) {
    return;
  }

  if (totalProducts <= PRODUCTS_PER_PAGE || totalPages <= 1) {
    paginationEl.innerHTML = "";
    paginationEl.classList.add("hidden");
    return;
  }

  paginationEl.classList.remove("hidden");
  paginationEl.innerHTML = "";

  const info = document.createElement("p");
  info.className = "pagination-info";
  const start = (state.currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const end = Math.min(totalProducts, state.currentPage * PRODUCTS_PER_PAGE);
  info.textContent = `Showing ${start}-${end} of ${totalProducts} products`;
  paginationEl.appendChild(info);

  const controls = document.createElement("div");
  controls.className = "pagination-controls";

  const previousButton = createPageButton("Previous", state.currentPage === 1, () => {
    goToPage(state.currentPage - 1);
  });
  controls.appendChild(previousButton);

  const pageItems = buildPageItems(totalPages, state.currentPage);
  pageItems.forEach((item) => {
    if (item === "...") {
      const gap = document.createElement("span");
      gap.className = "page-gap";
      gap.textContent = "...";
      controls.appendChild(gap);
      return;
    }

    const pageButton = createPageButton(String(item), false, () => {
      goToPage(item);
    });
    pageButton.classList.add("page-number");
    if (item === state.currentPage) {
      pageButton.classList.add("active");
      pageButton.setAttribute("aria-current", "page");
    }
    controls.appendChild(pageButton);
  });

  const nextButton = createPageButton("Next", state.currentPage === totalPages, () => {
    goToPage(state.currentPage + 1);
  });
  controls.appendChild(nextButton);

  paginationEl.appendChild(controls);
}

function goToPage(page) {
  if (page < 1) {
    return;
  }

  state.currentPage = page;
  renderProducts();
  productsGridEl?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildPageItems(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push("...");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("...");
  }

  items.push(totalPages);
  return items;
}

function createPageButton(label, isDisabled, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "page-btn";
  button.textContent = label;
  button.disabled = isDisabled;

  if (!isDisabled) {
    button.addEventListener("click", onClick);
  }

  return button;
}

initialize();

if (appSettings.brandName) {
  document.title = `${appSettings.brandName} | Clothing Store`;
}
