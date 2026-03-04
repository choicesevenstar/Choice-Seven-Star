import {
  db,
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  orderBy
} from "./firebase.js";
import { appSettings } from "./firebase-config.js";
import { formatPrice, makeWhatsAppUrl } from "./utils.js";

const detailCardEl = document.getElementById("productDetailCard");
const detailLoadingEl = document.getElementById("detailLoading");
const detailErrorEl = document.getElementById("detailError");

const detailImageEl = document.getElementById("detailImage");
const detailCategoryEl = document.getElementById("detailCategory");
const detailNameEl = document.getElementById("detailName");
const detailDescriptionEl = document.getElementById("detailDescription");
const detailPriceEl = document.getElementById("detailPrice");
const detailOrderButtonEl = document.getElementById("detailOrderButton");

const relatedSectionEl = document.getElementById("relatedSection");
const relatedProductsGridEl = document.getElementById("relatedProductsGrid");
const relatedEmptyStateEl = document.getElementById("relatedEmptyState");

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23d6e7ff'/%3E%3Cstop offset='100%25' stop-color='%23a9c8ff'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='500' height='500' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23051c45' font-size='30' font-family='Source Sans 3'%3EChoice Seven Star%3C/text%3E%3C/svg%3E";

init();

async function init() {
  setDocumentTitle();

  const productId = getProductIdFromUrl();
  if (!productId) {
    showError();
    return;
  }

  try {
    const productSnap = await getDoc(doc(db, "products", productId));
    if (!productSnap.exists()) {
      showError();
      return;
    }

    const product = productSnap.data();
    renderProduct(productSnap.id, product);
    showDetails();
    listenToRelatedProducts(productSnap.id, product);
  } catch {
    showError();
  }
}

function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function renderProduct(productId, product) {
  const name = product?.name || "Product";
  const price = Number(product?.price) || 0;
  const imageUrl = product?.imageUrl || FALLBACK_IMAGE;

  detailImageEl.src = imageUrl;
  detailImageEl.alt = name;
  detailCategoryEl.textContent = product?.categoryName || "Uncategorized";
  detailNameEl.textContent = name;
  detailDescriptionEl.textContent = product?.description || "No description available.";
  detailPriceEl.textContent = formatPrice(price);

  const orderUrl = makeWhatsAppUrl({
    productName: name,
    price
  });

  detailOrderButtonEl.href = orderUrl;
  detailOrderButtonEl.setAttribute("aria-label", `Order ${name} on WhatsApp`);
  detailCardEl.dataset.productId = productId;
}

function setDocumentTitle() {
  if (appSettings.brandName) {
    document.title = `${appSettings.brandName} | Product Details`;
  }
}

function showDetails() {
  detailLoadingEl.classList.add("hidden");
  detailErrorEl.classList.add("hidden");
  detailCardEl.classList.remove("hidden");
}

function showError() {
  detailLoadingEl.classList.add("hidden");
  detailCardEl.classList.add("hidden");
  detailErrorEl.classList.remove("hidden");
  relatedSectionEl?.classList.add("hidden");
}

function listenToRelatedProducts(currentProductId, currentProduct) {
  onSnapshot(
    query(collection(db, "products"), orderBy("createdAt", "desc")),
    (snapshot) => {
      const products = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      }));

      const fallbackList = products.filter((product) => product.id !== currentProductId);
      const sameCategoryList = fallbackList.filter((product) =>
        isSameCategory(product, currentProduct)
      );

      const relatedProducts = (sameCategoryList.length ? sameCategoryList : fallbackList).slice(0, 6);
      renderRelatedProducts(relatedProducts);
    },
    () => {
      renderRelatedProducts([]);
    }
  );
}

function isSameCategory(candidateProduct, currentProduct) {
  const currentCategoryId = currentProduct?.categoryId || "";
  const candidateCategoryId = candidateProduct?.categoryId || "";

  if (currentCategoryId && candidateCategoryId) {
    return currentCategoryId === candidateCategoryId;
  }

  const currentCategoryName = String(currentProduct?.categoryName || "").trim().toLowerCase();
  const candidateCategoryName = String(candidateProduct?.categoryName || "").trim().toLowerCase();

  if (currentCategoryName && candidateCategoryName) {
    return currentCategoryName === candidateCategoryName;
  }

  return false;
}

function renderRelatedProducts(products) {
  if (!relatedSectionEl || !relatedProductsGridEl || !relatedEmptyStateEl) {
    return;
  }

  relatedSectionEl.classList.remove("hidden");
  relatedProductsGridEl.innerHTML = "";

  if (!products.length) {
    relatedEmptyStateEl.classList.remove("hidden");
    return;
  }

  relatedEmptyStateEl.classList.add("hidden");

  products.forEach((product) => {
    const article = document.createElement("article");
    article.className = "related-card";

    const name = escapeHtml(product?.name || "Product");
    const category = escapeHtml(product?.categoryName || "Uncategorized");
    const imageUrl = escapeHtml(product?.imageUrl || FALLBACK_IMAGE);
    const priceText = formatPrice(Number(product?.price) || 0);
    const detailHref = `product.html?id=${encodeURIComponent(product.id)}`;

    article.innerHTML = `
      <a class="related-link" href="${detailHref}" aria-label="Open details for ${name}">
        <div class="related-image-wrap">
          <img src="${imageUrl}" alt="${name}" loading="lazy" />
        </div>
        <div class="related-body">
          <p class="related-category">${category}</p>
          <h3>${name}</h3>
          <p class="related-price">${priceText}</p>
        </div>
      </a>
    `;

    relatedProductsGridEl.appendChild(article);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
