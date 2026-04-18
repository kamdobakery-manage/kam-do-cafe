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
  let pendingComboItem = null;

  // --- Header Image Config ---
  const HEADER_IMAGES = {
    'breakfast':    { src: 'assets/headers/01-all-day-breakfast.png',       alt: '01 All-Day Breakfast 全日早·常餐' },
    'noodles':      { src: 'assets/headers/02-stirred-nissin-noodles.png',  alt: '02 Stirred Nissin Noodles 出前撈丁' },
    'plates':       { src: 'assets/headers/03-rice-spaghetti-plates.png',   alt: '03 Rice & Spaghetti Plates 碟頭（飯或意粉）' },
    'baked':        { src: 'assets/headers/04-200c-baked.png',              alt: '04 200°C Baked 200°C 真焗' },
    'hk-authentic': { src: 'assets/headers/05-hk-authentic.png',            alt: '05 HK Authentic 經典港味' },
    'snacks':       { src: 'assets/headers/06-hk-snacks-pineapple-buns.png',alt: '06 HK Snacks & Pineapple Buns 香港情懷 & 菠蘿包' },
    'drinks':       { src: 'assets/headers/07-drinks.png',                  alt: '07 Drinks 冷熱飲品' },
    'party-tray':   { src: 'assets/headers/08-party-tray-catering.png',     alt: '08 Party Tray & Catering 派對到會' },
    'featured':     { src: 'assets/headers/00-signature-dishes.png',       alt: 'Signature Dishes 招牌推介' },
  };

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
    categoryDrawer: null,
    categoryOverlay: null,
    categoryFab: null,
    categoryList: null,
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
    renderCategoryDrawer();
    renderSpecials();
    renderFooter();
    loadCartFromStorage();
    initScrollSpy();
    initScrollAnimations();
    initImageFallbacks();
    initLightbox();

    initPaletteToggle();

    // Auto-open cart if returning from cancelled payment
    if (window.location.hash === '#open-cart') {
      openCart();
      history.replaceState(null, '', window.location.pathname);
    }
  }

  // --- Palette Toggle ---
  function initPaletteToggle() {
    const saved = localStorage.getItem('kamdo_palette');
    if (saved) document.documentElement.setAttribute('data-palette', saved);

    const btn = document.getElementById('palette-toggle');
    if (!btn) return;

    var palettes = ['mongkok', ''];

    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-palette') || '';
      var idx = palettes.indexOf(current);
      var next = palettes[(idx + 1) % palettes.length];
      if (next) {
        document.documentElement.setAttribute('data-palette', next);
        localStorage.setItem('kamdo_palette', next);
      } else {
        document.documentElement.removeAttribute('data-palette');
        localStorage.removeItem('kamdo_palette');
      }
    });
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

        // Sync category drawer active state
        updateCategoryActive(sectionId);
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
    app.categoryDrawer = document.getElementById('category-drawer');
    app.categoryOverlay = document.getElementById('category-overlay');
    app.categoryFab = document.getElementById('category-fab');
    app.categoryList = document.getElementById('category-list');
    app.cartFab = document.getElementById('cart-fab');
    app.cartFabCount = document.getElementById('cart-fab-count');
    app.comboModal = document.getElementById('combo-modal');
    app.comboOverlay = document.getElementById('combo-modal-overlay');
    app.comboTitle = document.getElementById('combo-modal-title');
    app.comboBody = document.getElementById('combo-modal-body');
    app.comboPrice = document.getElementById('combo-modal-price');
    app.comboAddBtn = document.getElementById('combo-modal-add');
  }

  function bindEvents() {
    app.cartBtn.addEventListener('click', toggleCart);
    app.cartOverlay.addEventListener('click', closeCart);
    document.getElementById('cart-close').addEventListener('click', closeCart);
    app.cartCheckoutBtn.addEventListener('click', handleCheckout);
    document.getElementById('cart-whatsapp').addEventListener('click', handleWhatsApp);
    app.mobileToggle.addEventListener('click', toggleMobileMenu);
    // Nav link clicks — custom scroll + close mobile menu
    app.navLinks.addEventListener('click', (e) => {
      const link = e.target.closest('.nav__link');
      if (link) {
        e.preventDefault();
        app.navLinks.classList.remove('mobile-open');
        const sectionId = link.getAttribute('href').replace('#', '');
        scrollToSection(sectionId);
      }
    });
    // Hero CTA — custom scroll
    document.getElementById('hero').addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link) {
        e.preventDefault();
        scrollToSection(link.getAttribute('href').replace('#', ''));
      }
    });
    // Category drawer
    app.categoryFab.addEventListener('click', openCategoryDrawer);
    app.categoryOverlay.addEventListener('click', closeCategoryDrawer);
    document.getElementById('category-close').addEventListener('click', closeCategoryDrawer);
    // Cart FAB (mobile)
    app.cartFab.addEventListener('click', toggleCart);
    // Combo modal
    document.getElementById('combo-modal-close').addEventListener('click', closeComboModal);
    app.comboOverlay.addEventListener('click', closeComboModal);
    app.comboAddBtn.addEventListener('click', handleComboAdd);
    app.comboBody.addEventListener('click', handleOptionSelect);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && app.comboModal.classList.contains('open')) closeComboModal();
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

  // --- Helper: image HTML with elegant text placeholder fallback ---
  function imageHtml(src, alt, cssClass, placeholderClass, placeholderText) {
    const placeholder = `<div class="${placeholderClass}"><span class="placeholder__text">${placeholderText}</span></div>`;
    if (!src) {
      return placeholder;
    }
    // Use data attribute + global handler to avoid onerror escaping issues
    return `<img src="${src}" alt="${escapeHtml(alt)}" class="${cssClass}" loading="lazy" data-placeholder="${escapeHtml(placeholderText)}" data-placeholder-class="${placeholderClass}">`;
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

    // Check if hero image exists (classic palette only)
    const heroImagePath = 'assets/hero/hero-main.jpg';
    const img = new Image();
    img.onload = function () {
      hero.classList.remove('hero--no-image');
      const bg = hero.querySelector('.hero__bg');
      if (bg) bg.style.backgroundImage = `url('${heroImagePath}')`;
    };
    img.onerror = function () {
      hero.classList.add('hero--no-image');
    };
    img.src = heroImagePath;

    // Default to no-image state
    hero.classList.add('hero--no-image');

    // Build Mong Kok food collage: prefer featured items with images, fall back to any item
    const collageItems = [];
    for (const feat of (menuData.featured || [])) {
      const it = findItem(feat.section_id, feat.item_code, feat.item_name);
      if (it && it.image) collageItems.push(it);
      if (collageItems.length >= 3) break;
    }
    // If fewer than 3, pad from any section's first items with images
    if (collageItems.length < 3) {
      for (const section of (menuData.sections || [])) {
        const pool = section.items || (section.subsections || []).reduce((a, s) => a.concat(s.items || []), []);
        for (const it of pool) {
          if (collageItems.length >= 3) break;
          if (it.image && !collageItems.includes(it)) collageItems.push(it);
        }
        if (collageItems.length >= 3) break;
      }
    }
    const burstTexts = ['招牌!', '必食', '人氣#1'];
    const burstClasses = ['', 'mk-starburst--tilt-right', ''];
    const collage = collageItems.slice(0, 3).map(function (item, i) {
      const priceTxt = item.price ? `$${item.price.toFixed(2)}` : '';
      const nameShort = (item.name_zh || '').length > 7 ? item.name_zh.substring(0, 7) : item.name_zh;
      return `
        <figure class="hero-mk__dish hero-mk__dish--${i + 1}">
          ${imageHtml(item.image, item.name_en, 'hero-mk__dish-img', 'hero-mk__dish-ph', item.name_zh.substring(0, 2))}
          <div class="hero-mk__dish-name">${nameShort}</div>
          <span class="mk-starburst ${burstClasses[i]} hero-mk__dish-burst">${burstTexts[i]}</span>
          <span class="hero-mk__dish-price">${priceTxt}</span>
        </figure>
      `;
    }).join('');

    hero.innerHTML = `
      <!-- Classic hero layout (shown when palette is not mongkok) -->
      <div class="hero__classic">
        <div class="hero__bg"></div>
        <div class="hero__watermark">${r.name_zh.substring(0, 2)}</div>
        <div class="hero__content">
          <p class="hero__tagline">Authentic Hong Kong Caf\u00e9</p>
          <h1 class="hero__title-zh">${r.name_zh}</h1>
          <p class="hero__title">${r.name_en}</p>
          <p class="hero__description">${r.tagline_en}. Classic comfort food made fresh daily.</p>
          <div class="hero__cta-row">
            <a href="#breakfast" class="btn btn--primary">Browse Menu</a>
          </div>
        </div>
      </div>

      <!-- Mong Kok hero layout (shown when palette is mongkok) -->
      <div class="hero-mk">
        <div class="hero-mk__inner">
          <div class="hero-mk__left">
            <div class="mk-vertical-cal hero-mk__big-name">金都茶餐廳</div>
            <div class="hero-mk__signboard">
              <span>KAM DO CAFE</span><span class="hero-mk__dot">·</span>
              <span>RICHMOND BC</span><span class="hero-mk__dot">·</span>
              <span>SINCE 1988</span>
            </div>
            <div class="hero-mk__status">營業中 · 8AM–7PM</div>
            <a href="#breakfast" class="hero-mk__cta">落單 睇餐牌 →</a>
          </div>
          <div class="hero-mk__right">
            <div class="mk-chop mk-chop--ring mk-chop--lg hero-mk__chop">
              <span>正宗港式</span>
              <small>AUTHENTIC HK</small>
            </div>
            <div class="hero-mk__collage">
              ${collage}
            </div>
            <div class="mk-handwritten hero-mk__note">今日人氣之選 →</div>
          </div>
        </div>
        <div class="mk-marquee hero-mk__marquee">
          <div class="mk-marquee__track">
            <span class="mk-marquee__item">🔥 全日早餐 · 奉送咖啡/茶 · 出前一丁任選 · 外賣 WhatsApp ☎ 604-000-0000 · 開業 1988 · 正宗港式 🔥</span>
            <span class="mk-marquee__item">🔥 全日早餐 · 奉送咖啡/茶 · 出前一丁任選 · 外賣 WhatsApp ☎ 604-000-0000 · 開業 1988 · 正宗港式 🔥</span>
          </div>
        </div>
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

      const placeholderText = item.name_zh.substring(0, 4);
      const imgHtml = imageHtml(
        item.image,
        item.name_en,
        'featured__card-image',
        'featured__card-placeholder',
        placeholderText
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

    const featImg = HEADER_IMAGES['featured'];
    app.featuredContainer.innerHTML = `
      <div class="featured__header">
        <img class="section__header-img" src="${featImg.src}" alt="${featImg.alt}">
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

    // Bind customize (combo) buttons
    app.menuContainer.querySelectorAll('[data-customize-item]').forEach(btn => {
      btn.addEventListener('click', handleCustomizeItem);
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
        const customizations = sub.customizations || section.customizations || null;
        itemsHtml += `<div class="subsection">`;
        itemsHtml += `<h3 class="subsection__title">${sub.title_en}</h3>`;
        itemsHtml += `<p class="subsection__title-zh">${sub.title_zh}</p>`;
        if (sub.description_en) {
          itemsHtml += `<div class="subsection__description">${sub.description_en}</div>`;
        }
        itemsHtml += `<ul class="menu-list">`;
        for (const item of sub.items) {
          itemsHtml += renderMenuItem(item, section.id, item.customizations || customizations);
        }
        itemsHtml += `</ul></div>`;
      }
    } else if (section.items) {
      const customizations = section.customizations || null;
      itemsHtml += `<ul class="menu-list">`;
      for (const item of section.items) {
        itemsHtml += renderMenuItem(item, section.id, item.customizations || customizations);
      }
      itemsHtml += `</ul>`;
    }

    const descHtml = section.description_en
      ? `<p class="section__description">${section.description_en}</p>`
      : '';

    const headerImg = HEADER_IMAGES[section.id];
    const headerContent = headerImg
      ? `<img class="section__header-img" src="${headerImg.src}" alt="${headerImg.alt}">`
      : `<div class="section__number">${num}</div>
         <h2 class="section__title">${section.title_en}</h2>
         <p class="section__title-zh">${section.title_zh}</p>`;

    // Mong Kok text-based section header (hidden in classic palette)
    const mkHeader = `
      <div class="section__header-mk">
        <span class="section__header-mk-tape section__header-mk-tape--tl"></span>
        <span class="section__header-mk-tape section__header-mk-tape--tr"></span>
        <div class="section__header-mk-inner">
          <h2 class="section__header-mk-zh">${section.title_zh}</h2>
          <p class="section__header-mk-en">${section.title_en}</p>
        </div>
        ${section.description_zh ? `<p class="section__header-mk-sub">「${section.description_zh}」</p>` : ''}
      </div>
    `;

    return `
      <section class="section" id="${section.id}">
        <div class="section__header">
          ${headerContent}
          ${descHtml}
        </div>
        ${mkHeader}
        ${itemsHtml}
      </section>
    `;
  }

  function renderMenuItem(item, sectionId, customizations) {
    let badges = '';
    if (item.badge) {
      const badgeClass = item.badge === 'New' ? 'new' : item.badge === 'Signature' ? 'signature' : 'award';
      badges += `<span class="menu-item__badge menu-item__badge--${badgeClass}">${item.badge}</span>`;
    }

    let note = '';
    if (item.note_en) {
      note = `<div class="menu-item__note">${item.note_en}</div>`;
    }

    // Code prefix for display in name
    const codePrefix = item.code ? `<span class="menu-item__code-inline">${item.code}</span> ` : '';

    // Image or elegant text placeholder
    const placeholderText = item.name_zh.substring(0, 4);
    const imgHtml = imageHtml(
      item.image,
      item.name_en,
      'menu-item__image',
      'menu-item__image-placeholder',
      placeholderText
    );

    const itemId = generateItemId(item);
    const baseData = {
      id: itemId,
      name_zh: item.name_zh,
      name_en: item.name_en,
      price: item.price,
      code: item.code || ''
    };

    let btnAttr;
    if (customizations && customizations.length) {
      const comboData = { ...baseData, customizations };
      btnAttr = `data-customize-item="${encodeURIComponent(JSON.stringify(comboData))}"`;
    } else {
      btnAttr = `data-add-item="${encodeURIComponent(JSON.stringify(baseData))}"`;
    }

    // Mong Kok decorations (hidden in other palettes via CSS)
    const chopChars = ['正', '好', '招', '人', '必', '靚'];
    const chopSeed = item.code ? (item.code.charCodeAt(0) + (item.code.charCodeAt(1) || 0)) : 0;
    const chop = chopChars[chopSeed % chopChars.length];
    const isSignature = item.badge === 'Signature';
    const burstText = item.badge === 'Signature' ? '招牌!'
      : item.badge === 'New' ? '新品!'
      : item.badge === 'Award' ? '得獎!'
      : '';
    const hasFreeDrink = customizations && customizations.some(function (c) {
      return (c.label_zh || '').indexOf('飲') >= 0
        && c.options && c.options.some(function (o) { return o.price === 0; });
    });
    const mkDecorations = `
      <div class="menu-item__mk">
        ${item.code ? `<span class="menu-item__mk-code mk-code-sticker">${item.code}</span>` : ''}
        <span class="menu-item__mk-chop mk-chop mk-chop--square">${chop}</span>
        ${burstText ? `<span class="menu-item__mk-burst mk-starburst mk-starburst--sm">${burstText}</span>` : ''}
      </div>
    `;

    return `
      <li class="menu-item${isSignature ? ' menu-item--signature' : ''}">
        ${mkDecorations}
        ${imgHtml}
        <div class="menu-item__info">
          <div>
            <div class="menu-item__name-zh">${codePrefix}${item.name_zh}</div>
            <div class="menu-item__name-en">${escapeHtml(item.name_en)}</div>
            ${note}
            ${badges}
            ${hasFreeDrink ? '<span class="menu-item__mk-tag mk-tag-green">配奉送飲</span>' : ''}
          </div>
          <div class="menu-item__right">
            <span class="menu-item__price">$${item.price.toFixed(2)}</span>
            <span class="menu-item__mk-good mk-good-sticker">GOOD</span>
            <button class="menu-item__add-btn" ${btnAttr} aria-label="Add to cart">+</button>
          </div>
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

    const headerImg = HEADER_IMAGES[section.id];
    const headerContent = headerImg
      ? `<img class="section__header-img" src="${headerImg.src}" alt="${headerImg.alt}">`
      : `<div class="section__number">${num}</div>
         <h2 class="section__title">${section.title_en}</h2>
         <p class="section__title-zh">${section.title_zh}</p>`;

    return `
      <section class="section" id="${section.id}">
        <div class="section__header">
          ${headerContent}
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
      <div class="footer__col">
        ${logoHtml}
        <div class="footer__brand-zh">${r.name_zh}</div>
        <div class="footer__brand-en">${r.name_en}</div>
        <p class="footer__address">${r.address}</p>
        ${socialHtml}
      </div>
      <div class="footer__col footer__col--story">
        <div class="footer__story-title">Our Story</div>
        <p class="footer__story">From our first cup of silky milk tea to today\u2019s signature satay beef noodles \u2014 Kam Do Cafe has been serving authentic Hong Kong comfort food to Richmond families. Every dish carries the warmth of a cha chaan teng, where the food is honest and the welcome is genuine.</p>
        <p class="footer__story footer__story--zh">\u5f9e\u7b2c\u4e00\u676f\u7d72\u896a\u5976\u8336\u958b\u59cb\uff0c\u91d1\u90fd\u8336\u9910\u5ef3\u4e00\u76f4\u70ba\u5217\u6cbb\u6587\u8857\u574a\u5e36\u4f86\u6700\u6b63\u5b97\u7684\u6e2f\u5f0f\u98a8\u5473\u3002\u6bcf\u4e00\u789f\u90fd\u627f\u8f09\u8457\u8336\u9910\u5ef3\u7684\u4eba\u60c5\u6eab\u6696\u2014\u2014\u98df\u7269\u8e0f\u5be6\uff0c\u7b11\u5bb9\u771f\u646f\u3002</p>
      </div>
      <div class="footer__col">
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

  // --- Combo Customization Modal ---
  function handleCustomizeItem(e) {
    pendingComboItem = JSON.parse(decodeURIComponent(e.currentTarget.dataset.customizeItem));
    openComboModal();
  }

  function openComboModal() {
    const item = pendingComboItem;
    app.comboTitle.innerHTML = `${item.code ? '<span class="menu-item__code-inline">' + item.code + '</span> ' : ''}${item.name_zh}<br><span style="font-size:0.85rem;font-family:var(--font-body);color:var(--color-text-secondary);font-weight:400">${escapeHtml(item.name_en)}</span>`;

    let html = '';
    item.customizations.forEach((group, gi) => {
      const reqLabel = group.required ? '' : ' <span>(Optional)</span>';
      html += `<div class="combo-modal__group" data-group="${gi}" data-type="${group.type}" data-required="${group.required}">`;
      html += `<div class="combo-modal__group-label">${group.label_en}${reqLabel}</div>`;
      html += `<div class="combo-modal__options">`;
      group.options.forEach((opt, oi) => {
        const priceTag = opt.price > 0 ? `<span class="combo-modal__option-price">+$${opt.price.toFixed(2)}</span>` : '';
        html += `<button class="combo-modal__option" data-group="${gi}" data-option="${oi}" type="button">${opt.name_en} ${priceTag}</button>`;
      });
      html += `</div></div>`;
    });
    app.comboBody.innerHTML = html;

    updateComboPrice();
    validateComboRequired();

    app.comboModal.classList.add('open');
    app.comboOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeComboModal() {
    app.comboModal.classList.remove('open');
    app.comboOverlay.classList.remove('open');
    document.body.style.overflow = '';
    pendingComboItem = null;
  }

  function handleOptionSelect(e) {
    const btn = e.target.closest('.combo-modal__option');
    if (!btn) return;

    const gi = parseInt(btn.dataset.group);
    const groupEl = app.comboBody.querySelector(`.combo-modal__group[data-group="${gi}"]`);
    const type = groupEl.dataset.type;
    const required = groupEl.dataset.required === 'true';

    if (type === 'radio') {
      const siblings = groupEl.querySelectorAll('.combo-modal__option');
      if (btn.classList.contains('selected') && !required) {
        btn.classList.remove('selected');
      } else {
        siblings.forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');
      }
    } else {
      btn.classList.toggle('selected');
    }

    updateComboPrice();
    validateComboRequired();
  }

  function updateComboPrice() {
    if (!pendingComboItem) return;
    let addon = 0;
    app.comboBody.querySelectorAll('.combo-modal__option.selected').forEach(btn => {
      const gi = parseInt(btn.dataset.group);
      const oi = parseInt(btn.dataset.option);
      addon += pendingComboItem.customizations[gi].options[oi].price;
    });
    const total = pendingComboItem.price + addon;
    app.comboPrice.textContent = `$${total.toFixed(2)}`;
  }

  function validateComboRequired() {
    if (!pendingComboItem) return;
    let valid = true;
    pendingComboItem.customizations.forEach((group, gi) => {
      if (group.required) {
        const groupEl = app.comboBody.querySelector(`.combo-modal__group[data-group="${gi}"]`);
        if (!groupEl.querySelector('.combo-modal__option.selected')) {
          valid = false;
        }
      }
    });
    app.comboAddBtn.disabled = !valid;
  }

  function handleComboAdd() {
    if (!pendingComboItem) return;
    const item = pendingComboItem;
    const selections = [];
    let addonPrice = 0;

    item.customizations.forEach((group, gi) => {
      const selectedBtns = app.comboBody.querySelectorAll(`.combo-modal__option.selected[data-group="${gi}"]`);
      const selected = [];
      selectedBtns.forEach(btn => {
        const oi = parseInt(btn.dataset.option);
        const opt = group.options[oi];
        selected.push({ name_en: opt.name_en, name_zh: opt.name_zh, price: opt.price });
        addonPrice += opt.price;
      });
      if (selected.length > 0) {
        selections.push({ group: group.label_en, selected });
      }
    });

    const selKey = selections.map(s => s.selected.map(o => o.name_en.toLowerCase().replace(/[^a-z0-9]/g, '')).join('+')).join('_');
    const customId = item.id + '__' + selKey;

    addToCart({
      id: customId,
      name_zh: item.name_zh,
      name_en: item.name_en,
      price: item.price + addonPrice,
      code: item.code,
      qty: 1,
      selections: selections
    });

    closeComboModal();
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
    app.cartFabCount.textContent = totalItems;
    app.cartFabCount.dataset.count = totalItems;

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
      let customDetail = '';
      if (item.selections && item.selections.length > 0) {
        const details = item.selections.map(s => s.selected.map(o => o.name_en).join(', ')).join(' · ');
        customDetail = `<div class="cart-item__custom">${escapeHtml(details)}</div>`;
      }
      html += `
        <div class="cart-item">
          <div class="cart-item__info">
            <div class="cart-item__name">${item.code ? item.code + ' \u00b7 ' : ''}${item.name_zh}</div>
            <div class="cart-item__name-en">${escapeHtml(item.name_en)}</div>
            ${customDetail}
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

  // Online payment disabled — Stripe not yet configured.
  // To enable, replace this function with the Stripe checkout flow:
  //   1. Set STRIPE_SECRET_KEY in Vercel environment variables
  //   2. Uncomment the Stripe version below and remove the placeholder
  function handleCheckout() {
    if (cart.length === 0) return;
    const orderText = buildOrderText();
    alert('Online payment coming soon!\n\n' + orderText + '\n\nPlease use WhatsApp or call us to place your order.');
  }

  /*  --- Stripe Checkout (enable when ready) ---
  async function handleCheckout() {
    if (cart.length === 0) return;

    const btn = app.cartCheckoutBtn;
    btn.disabled = true;
    btn.textContent = 'Processing...';
    btn.classList.add('loading');

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(item => ({
            id: item.id,
            code: item.code || null,
            name_en: item.name_en,
            name_zh: item.name_zh || null,
            price: item.price,
            qty: item.qty,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('Something went wrong. Please try again or call us.');
      btn.disabled = false;
      btn.textContent = 'Place Order';
      btn.classList.remove('loading');
    }
  }
  */

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
      if (item.selections && item.selections.length > 0) {
        const details = item.selections.map(s => s.selected.map(o => o.name_en).join(', ')).join(' | ');
        lines.push(`   \u21b3 ${details}`);
      }
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

  // --- Image Lightbox ---
  function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');

    function open(src, alt) {
      lightboxImg.src = src;
      lightboxImg.alt = alt;
      lightboxCaption.textContent = alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    // Click on featured card images
    document.addEventListener('click', function (e) {
      const img = e.target.closest('.featured__card-image, .menu-item__image');
      if (img) {
        e.preventDefault();
        open(img.src, img.alt);
      }
    });

    // Close lightbox
    lightboxClose.addEventListener('click', close);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) close();
    });
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

  // --- Image Fallbacks ---
  function initImageFallbacks() {
    document.querySelectorAll('img[data-placeholder]').forEach(img => {
      img.addEventListener('error', function () {
        const text = this.dataset.placeholder;
        const cls = this.dataset.placeholderClass;
        const div = document.createElement('div');
        div.className = cls;
        div.innerHTML = `<span class="placeholder__text">${text}</span>`;
        this.replaceWith(div);
      }, { once: true });
    });
  }

  // --- Category Drawer ---
  function renderCategoryDrawer() {
    if (!menuData) return;
    let html = '';
    let counter = 0;
    for (const section of menuData.sections) {
      counter++;
      const num = String(counter).padStart(2, '0');
      html += `
        <li>
          <a href="#${section.id}" class="category-drawer__item" data-section="${section.id}">
            <span class="category-drawer__num">${num}</span>
            <span class="category-drawer__names">
              <span class="category-drawer__name-zh">${section.title_zh}</span>
              <span class="category-drawer__name-en">${section.title_en}</span>
            </span>
          </a>
        </li>
      `;
    }
    app.categoryList.innerHTML = html;

    // Bind clicks
    app.categoryList.querySelectorAll('.category-drawer__item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        closeCategoryDrawer();
        scrollToSection(item.dataset.section);
      });
    });
  }

  // Scroll to a section, positioning so header + description are visible
  function scrollToSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (!target) return;
    const navHeight = document.querySelector('.nav').offsetHeight;
    const y = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 16;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  function openCategoryDrawer() {
    app.categoryDrawer.classList.add('open');
    app.categoryOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeCategoryDrawer() {
    app.categoryDrawer.classList.remove('open');
    app.categoryOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function updateCategoryActive(sectionId) {
    app.categoryList.querySelectorAll('.category-drawer__item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === sectionId);
    });
  }

  // --- Scroll Animations ---
  function initScrollAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.featured__card, .special-card')
      .forEach(el => observer.observe(el));
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', init);
})();
