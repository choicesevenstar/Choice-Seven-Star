import { appSettings } from "./firebase-config.js";

const currencyFormatter = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: appSettings.currencyCode || "PKR",
  maximumFractionDigits: 0
});

export function formatPrice(price) {
  return currencyFormatter.format(Number(price) || 0);
}

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function makeWhatsAppUrl({ productName, price }) {
  const number = (appSettings.whatsappNumber || "").replace(/\D/g, "");
  const safeName = productName || "a product";
  const hasPrice = typeof price !== "undefined" && price !== null;
  const text = hasPrice
    ? `Hello ${appSettings.brandName}, I want to order: ${safeName}. Price: ${formatPrice(price)}.`
    : `Hello ${appSettings.brandName}, please share your latest clothing catalog.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function setButtonLoading(button, isLoading, labelText) {
  if (!button) {
    return;
  }

  if (isLoading) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = labelText || "Please wait...";
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || labelText || button.textContent;
    button.disabled = false;
  }
}
