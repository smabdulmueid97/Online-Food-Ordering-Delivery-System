// SSHB Online — plain-JS frontend (no framework).
// Menu/dish data: GET /api/menu, /api/menu/:id, /api/categories, /api/slider.
// Cart: localStorage only (mirrors the PHP session cart in addtocart.php).
// Checkout: POST /api/checkout is a 501 placeholder — no order, no payment.
const view = document.getElementById('view');
const cartCountEl = document.getElementById('cart-count');

const CART_KEY = 'sshb-cart-v1';
const loadCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
const saveCart = (c) => { localStorage.setItem(CART_KEY, JSON.stringify(c)); updateCartCount(); };
const cartQty = () => loadCart().reduce((n, i) => n + i.qty, 0);
const cartTotal = () => loadCart().reduce((n, i) => n + i.qty * i.price_tk, 0);
function updateCartCount() { cartCountEl.textContent = cartQty(); }

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tk = (n) => 'Tk. ' + Number(n).toLocaleString('en-US');

async function api(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error('API ' + r.status + ' on ' + path);
  return r.json();
}

function addToCart(item, qty = 1) {
  const cart = loadCart();
  const found = cart.find((i) => i.id === item.id);
  if (found) found.qty = Math.min(found.qty + qty, item.stock || 99);
  else cart.push({ id: item.id, name: item.name, price_tk: item.price_tk, image: item.image, qty });
  saveCart(cart);
}

function cardHTML(p) {
  return `<article class="card">
    <a href="#/dish/${p.id}"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='/images/logo.png'"></a>
    <div class="card-body">
      <span class="cat">${esc(p.category)}</span>
      <h3><a href="#/dish/${p.id}">${esc(p.name)}</a></h3>
      <p class="desc">${esc(p.description)}</p>
      <div class="price-row"><span class="price">${tk(p.price_tk)}</span>
      <span class="stock ${p.in_stock ? '' : 'out'}">${p.in_stock ? 'In stock (' + p.stock + ')' : 'Out of stock'}</span></div>
      <div class="btn-row">
        <a class="btn secondary" href="#/dish/${p.id}">View</a>
        <button class="btn" data-add="${p.id}" ${p.in_stock ? '' : 'disabled'}>Add to cart</button>
      </div>
    </div>
  </article>`;
}

let MENU = [], CATS = [], SLIDER = [];

async function renderHome(search = '', category = '') {
  if (!MENU.length) {
    const [menu, cats, slider] = await Promise.all([api('/api/menu'), api('/api/categories'), api('/api/slider')]);
    MENU = menu.items; CATS = cats; SLIDER = slider;
  }
  const hero = SLIDER[0] || {};
  let list = MENU.slice();
  if (category) list = list.filter((p) => String(p.category_id) === String(category) || p.category.toLowerCase() === String(category).toLowerCase());
  if (search) {
    const q = search.toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  view.innerHTML = `
    <section class="hero">
      <img src="/images/${esc(hero.image || 's1.jpg')}" alt="" onerror="this.style.display='none'">
      <div class="hero-text">
        <span class="tag">${esc(hero.line3 || 'We Can Deliver In 30 min')}</span>
        <h1>${esc(hero.line1 || 'Welcome To SSHB Online')}</h1>
        <p>${esc(hero.line2 || 'Fresh Breakfast One Click Away')}</p>
      </div>
    </section>
    <div class="toolbar">
      <input type="search" id="search" placeholder="Search dishes… (e.g. Khichuri, BBQ, Cake)" value="${esc(search)}">
      <div class="chips" id="chips">
        <button class="chip ${!category ? 'active' : ''}" data-cat="">All (${MENU.length})</button>
        ${CATS.map((c) => `<button class="chip ${String(category) === String(c.id) ? 'active' : ''}" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}
      </div>
    </div>
    <p class="meta">${list.length} dish${list.length === 1 ? '' : 'es'} · Prices in Tk. (BDT) · Menu from the original sshb.sql</p>
    ${list.length ? `<div class="grid">${list.map(cardHTML).join('')}</div>` : `<p class="empty">No dishes match that search. Try another word, or clear the category filter.</p>`}
  `;
  document.getElementById('search').addEventListener('input', (e) => {
    clearTimeout(window.__t);
    window.__t = setTimeout(() => renderHome(e.target.value, category), 250);
  });
  document.getElementById('chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (b) renderHome(document.getElementById('search').value, b.dataset.cat);
  });
}

async function renderDish(id) {
  const d = await api('/api/menu/' + encodeURIComponent(id));
  let qty = 1;
  view.innerHTML = `
    <p><a href="#/">← Back to menu</a></p>
    <div class="detail">
      <img src="${esc(d.image)}" alt="${esc(d.name)}" onerror="this.src='/images/logo.png'">
      <div>
        <span class="cat">${esc(d.category)}</span>
        <h1>${esc(d.name)}</h1>
        <p class="price">${tk(d.price_tk)}</p>
        <p class="meta">SKU: ${d.id} · Stock: ${d.stock} · ${d.in_stock ? 'In stock' : 'Out of stock'}</p>
        <p class="full-desc">${esc(d.description)}</p>
        <div class="qty-row">
          <button id="minus" aria-label="Decrease quantity">−</button><span id="qty">1</span><button id="plus" aria-label="Increase quantity">+</button>
        </div>
        <div class="btn-row">
          <button class="btn" id="add" ${d.in_stock ? '' : 'disabled'}>Add to cart</button>
          <a class="btn secondary" href="#/cart">View cart</a>
        </div>
      </div>
    </div>
    ${d.related && d.related.length ? `<h2>More ${esc(d.category)}</h2><div class="grid">${d.related.map(cardHTML).join('')}</div>` : ''}`;
  document.getElementById('minus').onclick = () => { qty = Math.max(1, qty - 1); document.getElementById('qty').textContent = qty; };
  document.getElementById('plus').onclick = () => { qty = Math.min(d.stock || 99, qty + 1); document.getElementById('qty').textContent = qty; };
  document.getElementById('add').onclick = (e) => { addToCart(d, qty); e.target.textContent = 'Added ✓'; setTimeout(() => { e.target.textContent = 'Add to cart'; }, 1200); };
}

function renderCart() {
  const cart = loadCart();
  view.innerHTML = `<h1>Your cart</h1>
    ${cart.length ? `
    <table><thead><tr><th>Dish</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead><tbody>
      ${cart.map((i) => `<tr>
        <td><img src="${esc(i.image)}" alt="" onerror="this.style.display='none'">${esc(i.name)}</td>
        <td>${tk(i.price_tk)}</td>
        <td><button data-dec="${i.id}">−</button> ${i.qty} <button data-inc="${i.id}">+</button></td>
        <td>${tk(i.price_tk * i.qty)}</td>
        <td><button data-del="${i.id}">Remove</button></td></tr>`).join('')}
    </tbody></table>
    <div class="total-box"><span class="total">Subtotal: ${tk(cartTotal())}</span>
      <span><button class="btn secondary" id="clear">Clear cart</button> <a class="btn" href="#/checkout">Checkout →</a></span></div>`
    : `<p class="empty">Your cart is empty. <a href="#/">Browse the menu →</a></p>`}`;
  view.querySelectorAll('[data-inc]').forEach((b) => b.onclick = () => { const c = loadCart(); c.find((i) => i.id == b.dataset.inc).qty++; saveCart(c); renderCart(); });
  view.querySelectorAll('[data-dec]').forEach((b) => b.onclick = () => { const c = loadCart(); const it = c.find((i) => i.id == b.dataset.dec); it.qty--; saveCart(c.filter((i) => i.qty > 0)); renderCart(); });
  view.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { saveCart(loadCart().filter((i) => i.id != b.dataset.del)); renderCart(); });
  const clear = document.getElementById('clear');
  if (clear) clear.onclick = () => { saveCart([]); renderCart(); };
}

function renderCheckout() {
  const cart = loadCart();
  view.innerHTML = `<h1>Checkout</h1>
    <div class="notice"><strong>Demo checkout — placeholder.</strong> This starter has no database and no PayPal
    wired up, so <strong>no order is placed and no payment is taken</strong>. Submitting below calls
    <code>POST /api/checkout</code>, which intentionally returns <code>501 checkout_not_available</code>.
    The original PHP flow is: cart → PayPal (BDT→USD) → upload receipt → admin manages the order.</div>
    ${cart.length ? `<p class="meta">${cartQty()} item(s) · Subtotal <strong>${tk(cartTotal())}</strong> · Delivery: Dhaka, Bangladesh (per the original demo orders)</p>` : `<p class="empty">Your cart is empty — <a href="#/">add a dish first</a>.</p>`}
    <form class="checkout" id="co-form">
      <label>Your name <input name="name" required placeholder="e.g. Akmal"></label>
      <label>Mobile <input name="mobile" required placeholder="e.g. 017xxxxxxxx"></label>
      <label>Delivery address <textarea name="address" rows="2" required placeholder="e.g. Dhaka, Bangladesh"></textarea></label>
      <button class="btn" type="submit" ${cart.length ? '' : 'disabled'}>Place order (demo — nothing is charged)</button>
      <p id="co-result" class="meta"></p>
    </form>`;
  document.getElementById('co-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const r = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fd.get('name'), mobile: fd.get('mobile'), address: fd.get('address'), items: loadCart(), total_tk: cartTotal() }),
    });
    const data = await r.json();
    document.getElementById('co-result').textContent =
      `Server replied ${r.status}: ${data.message || data.error} — no order was placed.`;
  });
}

async function route() {
  updateCartCount();
  const hash = location.hash || '#/';
  try {
    if (hash.startsWith('#/dish/')) await renderDish(hash.split('/')[2]);
    else if (hash === '#/cart') renderCart();
    else if (hash === '#/checkout') renderCheckout();
    else await renderHome();
  } catch (err) {
    view.innerHTML = `<p class="empty">Could not load the menu (${esc(err.message)}). Is the server running?</p>`;
  }
}

view.addEventListener('click', (e) => {
  const b = e.target.closest('[data-add]');
  if (!b) return;
  const id = Number(b.dataset.add);
  const item = MENU.find((p) => p.id === id);
  if (item) { addToCart(item, 1); b.textContent = 'Added ✓'; setTimeout(() => { b.textContent = 'Add to cart'; }, 1000); }
});

window.addEventListener('hashchange', route);
route();
