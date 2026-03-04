# Choice Seven Star Ecommerce Website

Professional realtime clothing ecommerce website for **Choice Seven Star** with:
- Public user storefront (`index.html`)
- Separate direct admin panel (`admin.html`)
- Firebase Firestore realtime data sync (modular JavaScript SDK)
- WhatsApp ordering with auto-filled product name and price
- Category and product management (add, edit, delete)
- Product image via URL link (no gallery upload)

## Project Structure

- `index.html` -> User storefront
- `admin.html` -> Admin panel (separate page)
- `assets/css/styles.css` -> Navy + white aesthetic UI theme
- `assets/js/firebase-config.js` -> Firebase and app settings
- `assets/js/firebase.js` -> Firebase initialization
- `assets/js/storefront.js` -> Realtime storefront logic
- `assets/js/admin.js` -> Admin CRUD logic
- `assets/js/utils.js` -> Shared helpers

## Firebase Setup

1. Create a Firebase project.
2. Enable **Firestore Database**.
3. Open `assets/js/firebase-config.js` and fill your values:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
4. In `assets/js/firebase-config.js`, set:
   - `brandName: "Choice Seven Star"`
   - `whatsappNumber` in international format (example: `923001234567`)

## Firestore Collections

### `categories`
Document fields:
- `name` (string)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### `products`
Document fields:
- `name` (string)
- `price` (number)
- `description` (string)
- `categoryId` (string)
- `categoryName` (string)
- `imageUrl` (string, direct image URL)
- `isNew` (boolean)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

## Admin Workflow

1. Open `admin.html` directly.
2. Add categories.
3. Add products with image URL links.
4. Edit or delete categories/products anytime.

## User Workflow

1. Open `index.html`.
2. Browse and filter realtime products.
3. Click `Order on WhatsApp`.
4. WhatsApp opens with product name and price pre-filled.

## Optional Firestore Rules

Adjust rules based on your access model. Example rule allowing public read/write (for direct admin page with no auth):

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{docId} {
      allow read, write: if true;
    }

    match /categories/{docId} {
      allow read, write: if true;
    }
  }
}
```

## Run Locally

Use a static server (for example VS Code Live Server):
- `index.html` for users
- `admin.html` for admin

Because Firebase modular SDK uses ES modules, do not run with direct `file://` URLs.
