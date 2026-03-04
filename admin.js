import {
  db,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "./firebase.js";
import { formatPrice, toNumber, setButtonLoading } from "./utils.js";

const categoryForm = document.getElementById("categoryForm");
const categoryNameInput = document.getElementById("categoryNameInput");
const categoryList = document.getElementById("categoryList");

const productForm = document.getElementById("productForm");
const productNameInput = document.getElementById("productNameInput");
const productPriceInput = document.getElementById("productPriceInput");
const productDescriptionInput = document.getElementById("productDescriptionInput");
const productCategorySelect = document.getElementById("productCategorySelect");
const productImageUrlInput = document.getElementById("productImageUrlInput");
const productIsNewInput = document.getElementById("productIsNewInput");

const adminProductList = document.getElementById("adminProductList");

const editModal = document.getElementById("editModal");
const closeEditModalBtn = document.getElementById("closeEditModalBtn");
const editProductForm = document.getElementById("editProductForm");
const editProductNameInput = document.getElementById("editProductNameInput");
const editProductPriceInput = document.getElementById("editProductPriceInput");
const editProductDescriptionInput = document.getElementById("editProductDescriptionInput");
const editProductCategorySelect = document.getElementById("editProductCategorySelect");
const editProductImageUrlInput = document.getElementById("editProductImageUrlInput");
const editProductIsNewInput = document.getElementById("editProductIsNewInput");

const toastEl = document.getElementById("toast");

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23d7e8ff'/%3E%3Ctext x='50%25' y='50%25' fill='%23051c45' font-size='24' text-anchor='middle' dominant-baseline='middle'%3EChoice Seven Star%3C/text%3E%3C/svg%3E";

const state = {
  categories: [],
  products: [],
  editingProductId: "",
  unsubCategories: null,
  unsubProducts: null
};

function init() {
  bindEvents();
  startDataListeners();
}

function bindEvents() {
  categoryForm?.addEventListener("submit", onCategorySubmit);
  categoryList?.addEventListener("click", onCategoryListClick);

  productForm?.addEventListener("submit", onProductSubmit);
  adminProductList?.addEventListener("click", onAdminProductListClick);

  closeEditModalBtn?.addEventListener("click", closeEditModal);
  editModal?.addEventListener("click", (event) => {
    if (event.target === editModal) {
      closeEditModal();
    }
  });
  editProductForm?.addEventListener("submit", onEditProductSubmit);
}

function startDataListeners() {
  teardownDataListeners();

  state.unsubCategories = onSnapshot(
    query(collection(db, "categories"), orderBy("name", "asc")),
    (snapshot) => {
      state.categories = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      renderCategoryList();
      renderCategoryOptions();
      renderAdminProducts();
    },
    () => showToast("Failed to load categories.", "error")
  );

  state.unsubProducts = onSnapshot(
    query(collection(db, "products"), orderBy("createdAt", "desc")),
    (snapshot) => {
      state.products = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      renderAdminProducts();
    },
    () => showToast("Failed to load products.", "error")
  );
}

function teardownDataListeners() {
  if (typeof state.unsubCategories === "function") {
    state.unsubCategories();
  }

  if (typeof state.unsubProducts === "function") {
    state.unsubProducts();
  }

  state.unsubCategories = null;
  state.unsubProducts = null;
  state.categories = [];
  state.products = [];
}

async function onCategorySubmit(event) {
  event.preventDefault();
  const submitButton = categoryForm.querySelector("button[type='submit']");
  const name = (categoryNameInput?.value || "").trim();

  if (!name) {
    showToast("Category name is required.", "error");
    return;
  }

  const alreadyExists = state.categories.some(
    (category) => category.name.toLowerCase() === name.toLowerCase()
  );
  if (alreadyExists) {
    showToast("Category already exists.", "error");
    return;
  }

  try {
    setButtonLoading(submitButton, true, "Adding...");
    await addDoc(collection(db, "categories"), {
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    categoryForm.reset();
    showToast("Category added.", "success");
  } catch (error) {
    showToast(error.message || "Failed to add category.", "error");
  } finally {
    setButtonLoading(submitButton, false);
  }
}

async function onCategoryListClick(event) {
  const button = event.target.closest("button[data-action][data-id]");
  if (!button) {
    return;
  }

  const categoryId = button.dataset.id;
  const action = button.dataset.action;
  const category = state.categories.find((item) => item.id === categoryId);

  if (!category) {
    return;
  }

  if (action === "edit") {
    const newName = window.prompt("Enter new category name", category.name);
    if (!newName) {
      return;
    }

    const trimmedName = newName.trim();
    if (!trimmedName) {
      return;
    }

    try {
      await updateDoc(doc(db, "categories", categoryId), {
        name: trimmedName,
        updatedAt: serverTimestamp()
      });

      const linkedProducts = state.products.filter((product) => product.categoryId === categoryId);
      if (linkedProducts.length) {
        await Promise.all(
          linkedProducts.map((product) =>
            updateDoc(doc(db, "products", product.id), {
              categoryName: trimmedName,
              updatedAt: serverTimestamp()
            })
          )
        );
      }

      showToast("Category updated.", "success");
    } catch (error) {
      showToast(error.message || "Failed to update category.", "error");
    }
    return;
  }

  if (action === "delete") {
    const ok = window.confirm(`Delete category \"${category.name}\"?`);
    if (!ok) {
      return;
    }

    try {
      const linkedProducts = state.products.filter((product) => product.categoryId === categoryId);
      if (linkedProducts.length) {
        await Promise.all(
          linkedProducts.map((product) =>
            updateDoc(doc(db, "products", product.id), {
              categoryId: "",
              categoryName: "Uncategorized",
              updatedAt: serverTimestamp()
            })
          )
        );
      }

      await deleteDoc(doc(db, "categories", categoryId));
      showToast("Category deleted.", "success");
    } catch (error) {
      showToast(error.message || "Failed to delete category.", "error");
    }
  }
}

function renderCategoryList() {
  if (!categoryList) {
    return;
  }

  categoryList.innerHTML = "";

  if (!state.categories.length) {
    categoryList.innerHTML = '<p class="empty-state">No categories yet.</p>';
    return;
  }

  state.categories.forEach((category) => {
    const row = document.createElement("div");
    row.className = "list-item";
    row.innerHTML = `
      <strong>${escapeHtml(category.name)}</strong>
      <div class="item-actions">
        <button type="button" class="btn btn-small btn-edit" data-action="edit" data-id="${category.id}">Edit</button>
        <button type="button" class="btn btn-small btn-danger" data-action="delete" data-id="${category.id}">Delete</button>
      </div>
    `;
    categoryList.appendChild(row);
  });
}

function renderCategoryOptions() {
  const optionsHtml = ['<option value="">Select category</option>']
    .concat(
      state.categories.map(
        (category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`
      )
    )
    .join("");

  if (productCategorySelect) {
    productCategorySelect.innerHTML = optionsHtml;
  }

  if (editProductCategorySelect) {
    editProductCategorySelect.innerHTML = optionsHtml;
  }
}

async function onProductSubmit(event) {
  event.preventDefault();

  if (!state.categories.length) {
    showToast("Create at least one category first.", "error");
    return;
  }

  const submitButton = productForm.querySelector("button[type='submit']");
  const formData = readProductForm();

  if (!formData.valid) {
    showToast(formData.message, "error");
    return;
  }

  try {
    setButtonLoading(submitButton, true, "Saving...");

    await addDoc(collection(db, "products"), {
      name: formData.name,
      price: formData.price,
      description: formData.description,
      categoryId: formData.category.id,
      categoryName: formData.category.name,
      imageUrl: formData.imageUrl,
      isNew: formData.isNew,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    productForm.reset();
    showToast("Product added.", "success");
  } catch (error) {
    showToast(error.message || "Failed to add product.", "error");
  } finally {
    setButtonLoading(submitButton, false);
  }
}

function readProductForm() {
  const name = (productNameInput?.value || "").trim();
  const price = toNumber(productPriceInput?.value);
  const description = (productDescriptionInput?.value || "").trim();
  const categoryId = productCategorySelect?.value || "";
  const imageUrl = (productImageUrlInput?.value || "").trim();
  const isNew = Boolean(productIsNewInput?.checked);

  if (!name) {
    return { valid: false, message: "Product name is required." };
  }

  if (!price || price < 1) {
    return { valid: false, message: "Price must be greater than 0." };
  }

  if (!description) {
    return { valid: false, message: "Description is required." };
  }

  const category = state.categories.find((item) => item.id === categoryId);
  if (!category) {
    return { valid: false, message: "Select a valid category." };
  }

  if (!isValidImageUrl(imageUrl)) {
    return { valid: false, message: "Enter a valid image URL." };
  }

  return {
    valid: true,
    name,
    price,
    description,
    category,
    imageUrl,
    isNew
  };
}

function onAdminProductListClick(event) {
  const button = event.target.closest("button[data-action][data-id]");
  if (!button) {
    return;
  }

  const productId = button.dataset.id;
  const action = button.dataset.action;

  if (action === "delete") {
    deleteProduct(productId);
    return;
  }

  if (action === "edit") {
    openEditModal(productId);
  }
}

async function deleteProduct(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  const ok = window.confirm(`Delete product \"${product.name}\"?`);
  if (!ok) {
    return;
  }

  try {
    await deleteDoc(doc(db, "products", productId));
    showToast("Product deleted.", "success");
  } catch (error) {
    showToast(error.message || "Failed to delete product.", "error");
  }
}

function openEditModal(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  state.editingProductId = productId;
  editProductNameInput.value = product.name || "";
  editProductPriceInput.value = product.price || "";
  editProductDescriptionInput.value = product.description || "";
  editProductCategorySelect.value = product.categoryId || "";
  editProductImageUrlInput.value = product.imageUrl || "";
  editProductIsNewInput.checked = Boolean(product.isNew);

  editModal?.classList.remove("hidden");
}

function closeEditModal() {
  state.editingProductId = "";
  editModal?.classList.add("hidden");
}

async function onEditProductSubmit(event) {
  event.preventDefault();

  const productId = state.editingProductId;
  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    showToast("Product not found.", "error");
    return;
  }

  const submitButton = editProductForm.querySelector("button[type='submit']");

  const name = (editProductNameInput.value || "").trim();
  const price = toNumber(editProductPriceInput.value);
  const description = (editProductDescriptionInput.value || "").trim();
  const categoryId = editProductCategorySelect.value;
  const category = state.categories.find((item) => item.id === categoryId);
  const imageUrl = (editProductImageUrlInput.value || "").trim();
  const isNew = Boolean(editProductIsNewInput.checked);

  if (!name || !price || !description || !category) {
    showToast("Complete all required fields.", "error");
    return;
  }

  if (!isValidImageUrl(imageUrl)) {
    showToast("Enter a valid image URL.", "error");
    return;
  }

  try {
    setButtonLoading(submitButton, true, "Updating...");

    const payload = {
      name,
      price,
      description,
      categoryId: category.id,
      categoryName: category.name,
      imageUrl,
      isNew,
      updatedAt: serverTimestamp()
    };

    await updateDoc(doc(db, "products", productId), payload);
    closeEditModal();
    showToast("Product updated.", "success");
  } catch (error) {
    showToast(error.message || "Failed to update product.", "error");
  } finally {
    setButtonLoading(submitButton, false);
  }
}

function renderAdminProducts() {
  if (!adminProductList) {
    return;
  }

  adminProductList.innerHTML = "";

  if (!state.products.length) {
    adminProductList.innerHTML = '<p class="empty-state">No products yet.</p>';
    return;
  }

  state.products.forEach((product) => {
    const item = document.createElement("article");
    item.className = "admin-product-item";

    const imageUrl = isValidImageUrl(product.imageUrl) ? product.imageUrl : FALLBACK_IMAGE;
    const safeImageUrl = escapeHtml(imageUrl);
    const title = escapeHtml(product.name || "Product");
    const description = escapeHtml(product.description || "");
    const categoryName = escapeHtml(product.categoryName || "Uncategorized");
    const badge = product.isNew ? '<span class="new-badge">New</span>' : "";

    item.innerHTML = `
      <div class="product-image-wrap">
        <img src="${safeImageUrl}" alt="${title}" loading="lazy" />
        ${badge}
      </div>
      <div class="admin-product-meta">
        <h3>${title}</h3>
        <p>${categoryName} | ${formatPrice(product.price)}</p>
        <p>${description}</p>
      </div>
      <div class="item-actions">
        <button type="button" class="btn btn-small btn-edit" data-action="edit" data-id="${product.id}">Edit</button>
        <button type="button" class="btn btn-small btn-danger" data-action="delete" data-id="${product.id}">Delete</button>
      </div>
    `;

    adminProductList.appendChild(item);
  });
}

function isValidImageUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function showToast(message, type = "success") {
  if (!toastEl) {
    return;
  }

  toastEl.textContent = message;
  toastEl.classList.remove("hidden", "error", "success");
  toastEl.classList.add(type === "error" ? "error" : "success");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2500);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

init();
