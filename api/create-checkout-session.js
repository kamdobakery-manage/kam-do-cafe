const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

// Load menu data once at cold start for price validation
let menuItems = null;

function loadMenuItems() {
  if (menuItems) return menuItems;

  const menuPath = path.join(__dirname, '..', 'menu.json');
  const menuData = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
  const items = new Map();

  for (const section of menuData.sections) {
    // Drinks have price_hot / price_iced instead of price
    if (section.id === 'drinks') {
      for (const drink of section.items || []) {
        if (drink.price_hot !== null) {
          const id = 'drink_hot_' + drink.name_en.replace(/\s+/g, '_').toLowerCase().substring(0, 20);
          items.set(id, drink.price_hot);
        }
        if (drink.price_iced !== null) {
          const id = 'drink_iced_' + drink.name_en.replace(/\s+/g, '_').toLowerCase().substring(0, 20);
          items.set(id, drink.price_iced);
        }
      }
      continue;
    }

    // Regular items (possibly nested in subsections)
    const allItems = [];
    if (section.subsections) {
      for (const sub of section.subsections) {
        allItems.push(...(sub.items || []));
      }
    }
    if (section.items) {
      allItems.push(...section.items);
    }

    for (const item of allItems) {
      const id = (item.code || '') + '_' + item.name_en.replace(/\s+/g, '_').toLowerCase().substring(0, 30);
      items.set(id, item.price);
    }
  }

  // Specials
  if (menuData.specials) {
    for (const special of menuData.specials) {
      if (special.items) {
        for (const item of special.items) {
          const id = (item.code || '') + '_' + item.name_en.replace(/\s+/g, '_').toLowerCase().substring(0, 30);
          items.set(id, item.price);
        }
      }
    }
  }

  menuItems = items;
  return items;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    if (items.length > 50) {
      return res.status(400).json({ error: 'Too many items' });
    }

    // Validate items against menu
    const menu = loadMenuItems();

    for (const item of items) {
      if (!item.id || !item.name_en || typeof item.price !== 'number' || typeof item.qty !== 'number') {
        return res.status(400).json({ error: 'Invalid item data' });
      }
      if (item.qty < 1 || item.qty > 99 || !Number.isInteger(item.qty)) {
        return res.status(400).json({ error: 'Invalid quantity' });
      }
      if (item.price <= 0) {
        return res.status(400).json({ error: 'Invalid price' });
      }

      // Verify price matches menu
      const menuPrice = menu.get(item.id);
      if (menuPrice !== undefined && Math.abs(menuPrice - item.price) > 0.01) {
        return res.status(400).json({ error: 'Price mismatch — please refresh the page' });
      }
    }

    // Build Stripe line items
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'cad',
        product_data: {
          name: item.name_en + (item.name_zh ? ` (${item.name_zh})` : ''),
          ...(item.code ? { description: `Item ${item.code}` } : {}),
        },
        unit_amount: Math.round(item.price * 100), // Stripe uses cents
      },
      quantity: item.qty,
    }));

    // Determine base URL from request headers
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'];
    const baseUrl = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel.html`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};
