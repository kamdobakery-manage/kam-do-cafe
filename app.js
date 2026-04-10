/* ============================================
   Kam Do Cafe — 金都茶餐廳
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
    featuredContainer: null,
    footerInfo: null,
    toast: null,
    mobileToggle: null,
  };

  // --- Food emoji map by section for placeholders ---
  const sectionEmoji = {
    'breakfast': '🍳',
    'noodles': '🍜',
    'plates': '🍛',
    'baked': '🧀',
    'hk-authentic': '🥘',
    'snacks': '🥐',
    'drinks': '☕',
    'party-tray': '🎉',
  };

  // --- Init ---
  async function init() {
    cacheDOM();
    bindEvents();
    await loadMenu();
    renderHero();
    renderFeatured();
    renderMenu();
    renderSpecials();
    renderFooter();
    loadCartFromStorage();
    initScrollSpy();
  }

  // --- Scroll Spy ---
  function initScrollSpy() {
    if (!menuData) return;

    const indicator = document.getElementById('section-indicator');
    const indicatorNumber = document.getElementById('indicator-number');
    const indicatorNameZh = document.getElementById('indicator-name-zh');
    const indicatorNameEn = document.getElementById('indicator-name-en');
    const navLinksContainer = document.getElementById('nav-links');
    const navLinks = document.querySelectorAll('.nav__link');
    const sections = document.querySelectorAll('.section');
    const menuContainer = document.getElementById('menu-container');

    if (!menuContainer || sections.length === 0) return;

    // Build section data map
    const sectionMap = {};
    let counter = 0;
    for (const s of menuData.sections) {
      counter++;
      sectionMap[s.id] = {
        num: String(counter).padStart(2, '0'),
        title_en: s.title_en,
        title_zh: s.title_zh
      };
    }

    let currentSectionId = null;
    let isVisible = false;

    // Scroll nav link into view horizontally only (no window scroll)
    function scrollNavLink(activeLink) {
      if (!navLinksContainer || !activeLink) return;
      const containerRect = navLinksContainer.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      const linkCenter = linkRect.left + linkRect.width / 2;
      const containerCenter = containerRect.left + containerRect.width / 2;
      const scrollDelta = linkCenter - containerCenter;
      navLinksContainer.scrollBy({ left: scrollDelta, behavior: 'smooth' });
    }

    function show(sectionId) {
      const info = sectionMap[sectionId];
      if (!info) return;

      if (sectionId !== currentSectionId) {
        currentSectionId = sectionId;
        indicatorNumber.textContent = info.num;
        indicatorNameZh.textContent = info.title_zh;
        indicatorNameEn.textContent = info.title_en;

        // Text slide-in animation
        indicator.classList.remove('entering');
        void indicator.offsetWidth;
        indicator.classList.add('entering');

        // Highlight active nav link (horizontal scroll only, never window scroll)
        navLinks.forEach(link => {
          const isActive = link.getAttribute('href') === '#' + sectionId;
          link.classList.toggle('active', isActive);
          if (isActive) {
            scrollNavLink(link);
          }
        });
      }

      if (!isVisible) {
        indicator.classList.add('visible');
        isVisible = true;
      }
    }

    function hide() {
      if (!isVisible) return;
      indicator.classList.remove('visible');
      isVisible = false;
      currentSectionId = null;
      navLinks.forEach(link => link.classList.remove('active'));
    }

    // Single scroll handler with debounce
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // Detection line: below nav (64px on desktop, 56px on mobile)
        const navHeight = document.querySelector('.nav').offsetHeight;
        const offset = navHeight + 56;

        const menuRect = menuContainer.getBoundingClientRect();
        const inMenu = menuRect.top < offset && menuRect.bottom > offset;

        if (!inMenu) {
          hide();
          ticking = false;
          return;
        }

        // Walk sections top-down; last one whose top passed the offset wins
        let found = null;
        for (let i = 0; i < sections.length; i++) {
          if (sections[i].getBoundingClientRect().top <= offset) {
            found = sections[i].id;
          }
        }

        if (found) {
          show(found);
        } else {
          hide();
        }

        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // Run once on init in case page is already scrolled
    onScroll();
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
    app.featuredContainer = document.getElementById('featured-container');
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

  // --- Helper: find item by code or name ---
  function findItem(sectionId, code, name) {
    const section = menuData.sections.find(s => s.id === sectionId);
    if (!section) return null;

    const searchItems = (items) => {
      if (!items) return null;
      if (code) return items.find(i => i.code === code);
      if (name) return items.find(i => i.name_en === name);
      return null;
    };

    if (section.items) return searchItems(section.items);
    if (section.subsections) {
      for (const sub of section.subsections) {
        const found = searchItems(sub.items);
        if (found) return found;
      }
    }
    return null;
  }

  // --- Helper: image HTML with placeholder fallback ---
  function imageHtml(src, alt, cssClass, placeholderClass, emoji) {
    if (!src) {
      return `<div class="${placeholderClass}">${emoji}</div>`;
    }
    return `<img src="${src}" alt="${escapeHtml(alt)}" class="${cssClass}" loading="lazy" onerror="this.outerHTML='<div class=&quot;${placeholderClass}&quot;>${emoji}</div>'">`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Render Nav Links ---
  function renderNavLinks(sections) {
    const links = sections.map(s => {
      return `<li><a href="#${s.id}" class="nav__link">${escapeHtml(s.title_en)}</a></li>`;
    });
    app.navLinks.innerHTML = links.join('');
  }

  // --- Render Hero ---
  function renderHero() {
    if (!menuData) return;
    const r = menuData.restaurant;
    const hero = document.getElementById('hero');

    const logoImg = r.logo
      ? `<img src="${r.logo}" alt="${r.name_zh}" class="hero__logo" width="80" height="80">`
      : '';

    hero.innerHTML = `
      ${logoImg}
      <div class="hero__badge">\u2605 Authentic Hong Kong Caf\u00e9</div>
      <h1 class="hero__title-zh">${r.name_zh}</h1>
      <p class="hero__title">${r.name_en}</p>
      <p class="hero__description">${r.tagline_en}. Classic comfort food made fresh daily \u2014 from satay beef noodles to golden pineapple buns.</p>
      <div class="hero__meta">
        <span class="hero__meta-item">\ud83d\udccd ${r.address}</span>
        <span class="hero__meta-item">\ud83d\udd50 ${r.hours.general}</span>
        <span class="hero__meta-item">\ud83d\udcde <a href="tel:${r.phone}">${r.phone}</a></span>
      </div>
      <div class="hero__cta-row">
        <a href="#breakfast" class="btn btn--primary">Browse Menu</a>
        <button class="btn btn--secondary" onclick="document.getElementById('cart-btn').click()">\ud83d\uded2 View Cart</button>
      </div>
    `;
  }

  // --- Render Featured ---
  function renderFeatured() {
    if (!menuData || !menuData.featured || menuData.featured.length === 0) {
      app.featuredContainer.style.display = 'none';
      return;
    }

    let cards = '';
    for (const feat of menuData.featured) {
      const item = findItem(feat.section_id, feat.item_code, feat.item_name);
      if (!item) continue;

      const emoji = sectionEmoji[feat.section_id] || '🍽';
      const imgHtml = imageHtml(
        item.image,
        item.name_en,
        'featured__card-image',
        'featured__card-placeholder',
        emoji
      );

      cards += `
        <div class="featured__card">
          ${imgHtml}
          <div class="featured__card-body">
            <div class="featured__card-name">${item.name_zh}</div>
            <div class="featured__card-name-en">${escapeHtml(item.name_en)}</div>
            <div class="featured__card-footer">
              <span class="featured__card-caption">${feat.caption_en} \u00b7 ${feat.caption_zh}</span>
              <span class="featured__card-price">$${item.price.toFixed(2)}</span>
            </div>
          </div>
        </div>
      `;
    }

    if (!cards) {
      app.featuredContainer.style.display = 'none';
      return;
    }

    app.featuredContainer.innerHTML = `
      <div class="featured__header">
        <h2 class="featured__title">Signature Dishes</h2>
        <p class="featured__subtitle">\u62db\u724c\u63a8\u4ecb</p>
      </div>
      <div class="featured__grid">${cards}</div>
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
          itemsHtml += renderMenuItem(item, section.id);
        }
        itemsHtml += `</ul></div>`;
      }
    } else if (section.items) {
      itemsHtml += `<ul class="menu-list">`;
      for (const item of section.items) {
        itemsHtml += renderMenuItem(item, section.id);
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

  function renderMenuItem(item, sectionId) {
    const code = item.code ? `<span class="menu-item__code">${item.code}</span>` : '<span class="menu-item__code"></span>';

    let badges = '';
    if (item.badge) {
      const badgeClass = item.badge === 'New' ? 'new' : item.badge === 'Signature' ? 'signature' : 'award';
      badges += `<span class="menu-item__badge menu-item__badge--${badgeClass}">\u2605 ${item.badge}</span>`;
    }

    let note = '';
    if (item.note_en) {
      note = `<div class="menu-item__note">${item.note_en}</div>`;
    }

    // Image thumbnail
    const emoji = sectionEmoji[sectionId] || '🍽';
    const imgHtml = item.image
      ? imageHtml(item.image, item.name_en, 'menu-item__image', 'menu-item__image-placeholder', emoji)
      : '';

    const hasImageClass = item.image ? ' menu-item--has-image' : '';
    const signatureClass = item.badge === 'Signature' ? ' menu-item--signature' : '';

    const itemId = generateItemId(item);
    const itemData = encodeURIComponent(JSON.stringify({
      id: itemId,
      name_zh: item.name_zh,
      name_en: item.name_en,
      price: item.price,
      code: item.code || ''
    }));

    return `
      <li class="menu-item${hasImageClass}${signatureClass}">
        ${code}
        ${imgHtml}
        <div class="menu-item__info">
          <div class="menu-item__name-zh">${item.name_zh}</div>
          <div class="menu-item__name-en">${escapeHtml(item.name_en)}</div>
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
      const hotPrice = drink.price_hot !== null ? `$${drink.price_hot.toFixed(2)}` : '\u2014';
      const icedPrice = drink.price_iced !== null ? `$${drink.price_iced.toFixed(2)}` : '\u2014';

      const hotData = drink.price_hot !== null ? encodeURIComponent(JSON.stringify({
        id: generateDrinkId(drink, 'hot'),
        name_zh: drink.name_zh + '\uff08\u71b1\uff09',
        name_en: drink.name_en + ' (Hot)',
        price: drink.price_hot,
        code: ''
      })) : '';

      const icedData = drink.price_iced !== null ? encodeURIComponent(JSON.stringify({
        id: generateDrinkId(drink, 'iced'),
        name_zh: drink.name_zh + '\uff08\u51cd\uff09',
        name_en: drink.name_en + ' (Iced)',
        price: drink.price_iced,
        code: ''
      })) : '';

      rows += `
        <tr>
          <td>
            <span>${drink.name_zh}</span>
            <span class="drink-name-en"> ${escapeHtml(drink.name_en)}</span>
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

      const visualHtml = special.image
        ? `<div class="special-card__visual"><img src="${special.image}" alt="${escapeHtml(special.title_en)}" loading="lazy" onerror="this.style.display='none';this.parentNode.classList.add('special-card__visual--placeholder')"></div>`
        : `<div class="special-card__visual special-card__visual--placeholder"></div>`;

      html += `
        <div class="special-card">
          <div>
            <div class="special-card__badge">${special.badge}</div>
            <h3 class="special-card__title">${special.title_en}</h3>
            <p class="special-card__title-zh">${special.title_zh}</p>
            <div class="special-card__price">$${special.price.toFixed(2)}</div>
            <ul class="special-card__includes">${includesHtml}</ul>
            <p class="special-card__note">${special.note_en} \u00b7 ${special.note_zh}</p>
          </div>
          ${visualHtml}
        </div>
      `;
    }
    app.specialsContainer.innerHTML = html;
  }

  // --- Render Footer ---
  function renderFooter() {
    if (!menuData) return;
    const r = menuData.restaurant;

    const logoHtml = r.logo
      ? `<img src="${r.logo}" alt="${r.name_zh}" class="footer__logo">`
      : '';

    let socialHtml = '';
    if (r.social) {
      socialHtml = '<div class="footer__social">';
      if (r.social.facebook) {
        socialHtml += `<a href="${r.social.facebook}" class="footer__social-link" target="_blank" rel="noopener" aria-label="Facebook">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        </a>`;
      }
      if (r.social.instagram) {
        socialHtml += `<a href="${r.social.instagram}" class="footer__social-link" target="_blank" rel="noopener" aria-label="Instagram">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
        </a>`;
      }
      socialHtml += '</div>';
    }

    app.footerInfo.innerHTML = `
      <div>
        ${logoHtml}
        <div class="footer__brand-zh">${r.name_zh}</div>
        <div class="footer__brand-en">${r.name_en}</div>
        <p class="footer__desc">${r.tagline_en}. ${r.tagline_zh}. From our signature satay beef to freshly baked pineapple buns \u2014 taste the real Hong Kong.</p>
        <p class="footer__address">\ud83d\udccd ${r.address}</p>
        ${socialHtml}
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
          <div class="cart-drawer__empty-icon">\ud83d\uded2</div>
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
            <div class="cart-item__name">${item.code ? item.code + ' \u00b7 ' : ''}${item.name_zh}</div>
            <div class="cart-item__name-en">${escapeHtml(item.name_en)}</div>
            <div class="cart-item__controls">
              <button class="cart-item__qty-btn" onclick="window.__cartUpdateQty('${item.id}', -1)">\u2212</button>
              <span class="cart-item__qty">${item.qty}</span>
              <button class="cart-item__qty-btn" onclick="window.__cartUpdateQty('${item.id}', 1)">+</button>
            </div>
          </div>
          <span class="cart-item__price">$${(item.price * item.qty).toFixed(2)}</span>
          <button class="cart-item__remove" onclick="window.__cartRemove('${item.id}')" aria-label="Remove">\u00d7</button>
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
      lines.push(`${code}${item.name_en} x${item.qty} \u2014 $${(item.price * item.qty).toFixed(2)}`);
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
    btn.textContent = '\u2713';
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
