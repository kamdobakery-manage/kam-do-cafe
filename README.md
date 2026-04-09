# Kam Do Cafe · 金都茶室

Modern, clean website for Kam Do Cafe — an authentic Hong Kong cha chaan teng in Richmond, BC.

## Project Structure

```
kam-do-cafe/
├── index.html    → Main page (single-page layout)
├── styles.css    → All styles (CSS variables, responsive)
├── app.js        → Menu rendering, cart, interactions
├── menu.json     → All menu data (edit this to update menu)
└── README.md     → This file
```

## Quick Start

1. Clone the repo
2. Open `index.html` in a browser, or serve with any static server:
   ```bash
   # Python
   python3 -m http.server 8000

   # Node
   npx serve .
   ```
3. Visit `http://localhost:8000`

## Editing the Menu

All menu data lives in `menu.json`. The structure is:

- **`restaurant`** — Name, address, phone, hours
- **`sections`** — Array of menu sections (breakfast, noodles, plates, etc.)
  - Each section has `id`, `title_en`, `title_zh`, and either `items` or `subsections`
  - Items have: `code`, `name_zh`, `name_en`, `price`, optional `badge`, `note_en`, `note_zh`
- **`specials`** — Promotional items (rotisserie duo, seasonal deals)
- **Drinks** section uses `price_hot` and `price_iced` instead of a single `price`

### Adding a new item

Add to the relevant section's `items` array:
```json
{
  "code": "A8",
  "name_zh": "新菜式",
  "name_en": "New Dish Name",
  "price": 12.50,
  "badge": "New",
  "note_en": "Optional note"
}
```

### Adding a new section

Add to the `sections` array in `menu.json`. Use the same structure as existing sections.

## Customization

- **Colors**: Edit CSS variables in `:root` in `styles.css`
- **Fonts**: Change Google Fonts imports in `index.html` and font-family vars in `styles.css`
- **Logo**: Replace the `.nav__logo` div in `index.html` with an `<img>` tag
- **Phone/WhatsApp**: Update `phone` in `menu.json` restaurant object

## Cart / Ordering

The cart system works client-side. Orders are submitted via:
- **WhatsApp** — sends the full order as a message
- **Alert summary** — shows order details for phone-in orders

To upgrade to online payment, integrate Stripe Checkout in the `handleCheckout()` function in `app.js`.

## Hosting

Static files only — deploy anywhere:
- **GitHub Pages**: Push to `main`, enable Pages in repo settings
- **Netlify**: Drag and drop the folder
- **Vercel**: `vercel .` from the project root
- **Any web host**: Upload the 4 files

## Tech

- Vanilla HTML/CSS/JS — no build step, no dependencies
- Google Fonts (Playfair Display, DM Sans, Noto Sans/Serif TC, JetBrains Mono)
- Responsive design (mobile-first)
- Cart persists in localStorage

## License

Private — Kam Do Cafe · 金都茶室
