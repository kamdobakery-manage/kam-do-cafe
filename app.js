/* ============================================
   Kam Do Cafe — 金都茶室
   Main Application Script
   ============================================ */

(function () {
  'use strict';

  // --- State ---
  let menuData = null;
  let cart = [];
  let sectionCounter = 0;

  // --- DOM Cache ---
  const app = {
    nav: null,
    navLinks: null,
    cartBtn: null,
    cartCount: null,
    cartDrawer: null,
    cartOverlay: null,
    cartItemsContainer: null,
    cartTotalAmount: null,
    cartCheckoutBtn: null,
    menuContainer: null,
    specialsContainer: null,
    footerInfo: null,
    toast: null,
    mobileToggle: null,
  };

  // --- Init ---
  async function init() {
    cacheDOM();
    bindEvents();
    await loadMenu();
    renderHero();
    renderMenu();
    renderSpecials();
    renderFooter();
    loadCartFromStorage();
  }

  function cacheDOM() {
    app.navLinks = document.getElementById('nav-links');
    app.cartBtn = document.getElementById('cart-btn');
    app.cartCount = document.getElementById('cart-count');
    app.cartDrawer = document.getElementById('cart-drawer');
    app.cartOverlay = document.getElementById('cart-overlay');
    app.cartItemsContainer = document.getElementById('cart-items');
    app.cartTotalAmount = document.getElementById('cart-total-amount');
    app.cartCheckoutBtn = document.getElementById('cart-checkout-btn');
    app.menuContainer = document.getElementById('menu-container');
    app.specialsContainer = document.getElementById('specials-container');
    app.footerInfo = document.getElementById('footer-info');
    app.toast = document.getElementById('toast');
    app.mobileToggle = document.getElementById('mobile-toggle');
  }

  function bindEvents() {
    app.cartBtn.addEventListener('click', toggleCart);
    app.cartOverlay.addEventListener('click', closeCart);
    document.getElementById('cart-close').addEventListener('click', closeCart);
    app.cartCheckoutBtn.addEventListener('click', handleCheckout);
    document.getElementById('cart-whatsapp').addEventListener('click', handleWhatsApp);
    app.mobileToggle.addEventListener('click', toggleMobileMenu);

    // Close mobile menu on link click
    app.navLinks.addEventListener('click', (e) => {
      if (e.target.classList.contains('nav__link')) {
        app.navLinks.classList.remove('mobile-open');
      }
    });
  }

  // --- Data ---
  async function loadMenu() {
    try {
      const res = await fetch('menu.json');
      menuData = await res.json();
    } catch (e) {
      console.error('Failed to load menu:', e);
      app.menuContainer.innerHTML = '<p style="text-align:center;padding:4rem 1rem;color:#999;">Menu is loading...</p>';
    }
  }

  // --- Render Nav Links ---
  function renderNavLinks(sections) {
    const links = sections.map(s => {
      return `<li><a href="#${s.id}" class="nav__link">${s.title_en.replace(/&/g, '&amp;')}</a></li>`;
    });
    app.navLinks.innerHTML = links.join('');
  }

  // --- Render Hero ---
  function renderHero() {
    if (!menuData) return;
    const r = menuData.restaurant;
    const hero = document.getElementById('hero');
    hero.innerHTML = `
      <div class="hero__badge">★ Authentic Hong Kong Café</div>
      <h1 class="hero__title">${r.name_en}</h1>
      <p class="hero__title-zh">${r.name_zh}</p>
      <p class="hero__description">${r.tagline_en}. Classic comfort food made fresh daily — from satay beef noodles to golden pineapple buns.</p>
      <div class="hero__meta">
        <span class="hero__meta-item">📍 ${r.address}</span>
        <span class="hero__meta-item">🕐 ${r.hours.general}</span>
        <span class="hero__meta-item">📞 <a href="tel:${r.phone}">${r.phone}</a></span>
      </div>
      <div class="hero__cta-row">
        <a href="#breakfast" class="btn btn--primary">Browse Menu</a>
        <button class="btn btn--secondary" onclick="document.getElementById('cart-btn').click()">🛒 View Cart</button>
      </div>
    `;
  }

  // --- Render Menu ---
  function renderMenu() {
    if (!menuData) return;
    const sections = menuData.sections;
    renderNavLinks(sections);

    sectionCounter = 0;
    let html = '';
    for (const section of sections) {
      sectionCounter++;
      html += renderSection(section);
    }
    app.menuContainer.innerHTML = html;

    // Bind add buttons
    app.menuContainer.querySelectorAll('[data-add-item]').forEach(btn => {
      btn.addEventListener('click', handleAddItem);
    });

    // Bind drink add buttons
    app.menuContainer.querySelectorAll('[data-add-drink]').forEach(btn => {
      btn.addEventListener('click', handleAddDrink);
    });
  }

  function renderSection(section) {
    const num = String(sectionCounter).padStart(2, '0');

    if (section.id === 'drinks') {
      return renderDrinksSection(section, num);
    }

    let itemsHtml = '';
    if (section.subsections) {
      for (const sub of section.subsections) {
        itemsHtml += `<div class="subsection">`;
        itemsHtml += `<h3 class="subsection__title">${sub.title_en}</h3>`;
        itemsHtml += `<p class="subsection__title-zh">${sub.title_zh}</p>`;
        if (sub.description_en) {
          itemsHtml += `<div class="subsection__description">${sub.description_en}</div>`;
        }
        itemsHtml += `<ul class="menu-list">`;
        for (const item of sub.items) {
          itemsHtml += renderMenuItem(item);
        }
        itemsHtml += `</ul></div>`;
      }
    } else if (section.items) {
      itemsHtml += `<ul class="menu-list">`;
      for (const item of section.items) {
        itemsHtml += renderMenuItem(item);
      }
      itemsHtml += `</ul>`;
    }

    const descHtml = section.description_en
      ? `<p class="section__description">${section.description_en}</p>`
      : '';

    return `
      <section class="section" id="${section.id}">
        <div class="section__header">
          <div class="section__number">${num}</div>
          <h2 class="section__title">${section.title_en}</h2>
          <p class="section__title-zh">${section.title_zh}</p>
          ${descHtml}
        </div>
        ${itemsHtml}
      </section>
    `;
  }

  function renderMenuItem(item) {
    const code = item.code ? `<span class="menu-item__code">${item.code}</span>` : '<span class="menu-item__code"></span>';

    let badges = '';
    if (item.badge) {
      const badgeClass = item.badge === 'New' ? 'new' : item.badge === 'Signature' ? 'signature' : 'award';
      badges += `<span class="menu-item__badge menu-item__badge--${badgeClass}">★ ${item.badge}</span>`;
    }

    let note = '';
    if (item.note_en) {
      note = `<div class="menu-item__note">${item.note_en}</div>`;
    }

    const itemId = generateItemId(item);
    const itemData = encodeURIComponent(JSON.stringify({
      id: itemId,
      name_zh: item.name_zh,
      name_en: item.name_en,
      price: item.price,
      code: item.code || ''
    }));

    return `
      <li class="menu-item">
        ${code}
        <div class="menu-item__info">
          <div class="menu-item__name-zh">${item.name_zh}</div>
          <div class="menu-item__name-en">${item.name_en}</div>
          ${note}
          ${badges}
        </div>
        <div class="menu-item__right">
          <span class="menu-item__price">$${item.price.toFixed(2)}</span>
          <button class="menu-item__add-btn" data-add-item="${itemData}" aria-label="Add to cart">+</button>
        </div>
      </li>
    `;
  }

  function renderDrinksSection(section, num) {
    let rows = '';
    for (const drink of section.items) {
      const hotPrice = drink.price_hot !== null ? `$${drink.price_hot.toFixed(2)}` : '—';
      const icedPrice = drink.price_iced !== null ? `$${drink.price_iced.toFixed(2)}` : '—';

      const hotData = drink.price_hot !== null ? encodeURIComponent(JSON.stringify({
        id: generateDrinkId(drink, 'hot'),
        name_zh: drink.name_zh + '（熱）',
        name_en: drink.name_en + ' (Hot)',
        price: drink.price_hot,
        code: ''
      })) : '';

      const icedData = drink.price_iced !== null ? encodeURIComponent(JSON.stringify({
        id: generateDrinkId(drink, 'iced'),
        name_zh: drink.name_zh + '（凍）',
        name_en: drink.name_en + ' (Iced)',
        price: drink.price_iced,
        code: ''
      })) : '';

      rows += `
        <tr>
          <td>
            <span>${drink.name_zh}</span>
            <span class="drink-name-en"> ${drink.name_en}</span>
          </td>
          <td>${hotPrice} ${hotData ? `<button class="menu-item__add-btn" data-add-drink="${hotData}" aria-label="Add hot drink" style="display:inline-flex;width:24px;height:24px;font-size:14px;margin-left:8px;vertical-align:middle;">+</button>` : ''}</td>
          <td>${icedPrice} ${icedData ? `<button class="menu-item__add-btn" data-add-drink="${icedData}" aria-label="Add iced drink" style="display:inline-flex;width:24px;height:24px;font-size:14px;margin-left:8px;vertical-align:middle;">+</button>` : ''}</td>
        </tr>
      `;
    }

    return `
      <section class="section" id="${section.id}">
        <div class="section__header">
          <div class="section__number">${num}</div>
          <h2 class="section__title">${section.title_en}</h2>
          <p class="section__title-zh">${section.title_zh}</p>
        </div>
        <table class="drinks-table">
          <thead>
            <tr>
              <th></th>
              <th>${section.columns[0]}</th>
              <th>${section.columns[1]}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    `;
  }

  // --- Render Specials ---
  function renderSpecials() {
    if (!menuData || !menuData.specials || menuData.specials.length === 0) return;

    let html = '';
    for (const special of menuData.specials) {
      const includesHtml = special.includes.map(i =>
        `<li><strong>${i.en}</strong> ${i.zh}</li>`
      ).join('');

      html += `
        <div class="special-card">
          <div>
            <div class="special-card__badge">${special.badge}</div>
            <h3 class="special-card__title">${special.title_en}</h3>
            <p class="special-card__title-zh">${special.title_zh}</p>
            <div class="special-card__price">$${special.price.toFixed(2)}</div>
            <ul class="special-card__includes">${includesHtml}</ul>
            <p class="special-card__note">${special.note_en} · ${special.note_zh}</p>
          </div>
          <div class="special-card__visual">Photo coming soon</div>
        </div>
      `;
    }
    app.specialsContainer.innerHTML = html;
  }

  // --- Render Footer ---
  function renderFooter() {
    if (!menuData) return;
    const r = menuData.restaurant;
    app.footerInfo.innerHTML = `
      <div>
        <div class="footer__brand-zh">${r.name_zh}</div>
        <div class="footer__brand-en">${r.name_en}</div>
        <p class="footer__desc">${r.tagline_en}. ${r.tagline_zh}. From our signature satay beef to freshly baked pineapple buns — taste the real Hong Kong.</p>
        <p class="footer__address">📍 ${r.address}</p>
      </div>
      <div>
        <div class="footer__right-title">Hours</div>
        <div class="footer__hours">
          <strong>${r.hours.general}</strong><br>
          Last order: ${r.hours.last_order}<br><br>
          ${r.hours.breakfast_note_en}<br>
          ${r.hours.lunch_note_en}
        </div>
        <div class="footer__phone">
          Phone: <a href="tel:${r.phone}">${r.phone}</a>
        </div>
      </div>
    `;
  }

  // --- Cart Logic ---
  function handleAddItem(e) {
    const data = JSON.parse(decodeURIComponent(e.currentTarget.dataset.addItem));
    addToCart(data);
    animateAddButton(e.currentTarget);
  }

  function handleAddDrink(e) {
    const data = JSON.parse(decodeURIComponent(e.currentTarget.dataset.addDrink));
    addToCart(data);
    animateAddButton(e.currentTarget);
  }

  function addToCart(item) {
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ ...item, qty: 1 });
    }
    updateCartUI();
    saveCartToStorage();
    showToast(`Added ${item.name_en}`);
  }

  function removeFromCart(id) {
    cart = cart.filter(c => c.id !== id);
    updateCartUI();
    saveCartToStorage();
  }

  function updateQty(id, delta) {
    const item = cart.find(c => c.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      removeFromCart(id);
      return;
    }
    updateCartUI();
    saveCartToStorage();
  }

  function updateCartUI() {
    const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);
    const totalPrice = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

    // Update count badge
    app.cartCount.textContent = totalItems;
    app.cartCount.dataset.count = totalItems;

    // Update total
    app.cartTotalAmount.textContent = `$${totalPrice.toFixed(2)}`;

    // Update checkout button
    app.cartCheckoutBtn.disabled = cart.length === 0;

    // Render cart items
    if (cart.length === 0) {
      app.cartItemsContainer.innerHTML = `
        <div class="cart-drawer__empty">
          <div class="cart-drawer__empty-icon">🛒</div>
          <p>Your cart is empty</p>
          <p style="font-size:12px;margin-top:8px;">Browse the menu and add items</p>
        </div>
      `;
      return;
    }

    let html = '';
    for (const item of cart) {
      html += `
        <div class="cart-item">
          <div class="cart-item__info">
            <div class="cart-item__name">${item.code ? item.code + ' · ' : ''}${item.name_zh}</div>
            <div class="cart-item__name-en">${item.name_en}</div>
            <div class="cart-item__controls">
              <button class="cart-item__qty-btn" onclick="window.__cartUpdateQty('${item.id}', -1)">−</button>
              <span class="cart-item__qty">${item.qty}</span>
              <button class="cart-item__qty-btn" onclick="window.__cartUpdateQty('${item.id}', 1)">+</button>
            </div>
          </div>
          <span class="cart-item__price">$${(item.price * item.qty).toFixed(2)}</span>
          <button class="cart-item__remove" onclick="window.__cartRemove('${item.id}')" aria-label="Remove">×</button>
        </div>
      `;
    }
    app.cartItemsContainer.innerHTML = html;
  }

  // Expose cart functions to inline handlers
  window.__cartUpdateQty = updateQty;
  window.__cartRemove = removeFromCart;

  function toggleCart() {
    const isOpen = app.cartDrawer.classList.contains('open');
    if (isOpen) {
      closeCart();
    } else {
      openCart();
    }
  }

  function openCart() {
    app.cartDrawer.classList.add('open');
    app.cartOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    app.cartDrawer.classList.remove('open');
    app.cartOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function handleCheckout() {
    if (cart.length === 0) return;
    const orderText = buildOrderText();
    const phone = menuData.restaurant.phone.replace(/[^0-9]/g, '');
    // Try phone call with order summary
    alert('Order Summary:\n\n' + orderText + '\n\nPlease call or WhatsApp us to place your order.');
  }

  function handleWhatsApp() {
    if (cart.length === 0) return;
    const orderText = buildOrderText();
    const phone = menuData.restaurant.phone.replace(/[^0-9+]/g, '');
    const encoded = encodeURIComponent('Hi, I would like to place an order:\n\n' + orderText);
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
  }

  function buildOrderText() {
    let lines = [];
    for (const item of cart) {
      const code = item.code ? `[${item.code}] ` : '';
      lines.push(`${code}${item.name_en} x${item.qty} — $${(item.price * item.qty).toFixed(2)}`);
    }
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
    lines.push('');
    lines.push(`Subtotal: $${total.toFixed(2)}`);
    lines.push('(Tax not included)');
    return lines.join('\n');
  }

  // --- Animations ---
  function animateAddButton(btn) {
    btn.classList.add('added');
    btn.textContent = '✓';
    setTimeout(() => {
      btn.classList.remove('added');
      btn.textContent = '+';
    }, 800);
  }

  function showToast(msg) {
    app.toast.textContent = msg;
    app.toast.classList.add('show');
    setTimeout(() => app.toast.classList.remove('show'), 1800);
  }

  // --- Mobile Menu ---
  function toggleMobileMenu() {
    app.navLinks.classList.toggle('mobile-open');
  }

  // --- Persistence ---
  function saveCartToStorage() {
    try {
      localStorage.setItem('kamdo_cart', JSON.stringify(cart));
    } catch (e) { /* ignore */ }
  }

  function loadCartFromStorage() {
    try {
      const saved = localStorage.getItem('kamdo_cart');
      if (saved) {
        cart = JSON.parse(saved);
        updateCartUI();
      }
    } catch (e) { /* ignore */ }
  }

  // --- Helpers ---
  function generateItemId(item) {
    return (item.code || '') + '_' + item.name_en.replace(/\s+/g, '_').toLowerCase().substring(0, 30);
  }

  function generateDrinkId(drink, temp) {
    return 'drink_' + temp + '_' + drink.name_en.replace(/\s+/g, '_').toLowerCase().substring(0, 20);
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', init);
})();
