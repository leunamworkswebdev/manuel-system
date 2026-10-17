'use strict';
/* ---------- Settings ---------- */
const CUR = '₱';                 // currency symbol
const K = { o: 'hh_orders_v1', c: 'hh_cart_v1' };
const CATS = { '4': '4 months old', '5': '5 months old', '6': '6 months & older' };
const BREEDS = {
  'Silkie': { img: 'images/silkie.png', origin: 'China', weight: '0.9 to 1.8 kg', use: 'Pet and broody mother', temper: 'Calm and friendly' },
  'Rhode Island Red': { img: 'images/rhode-island-red.png', origin: 'United States', weight: '2.9 to 3.9 kg', use: 'Brown eggs and meat', temper: 'Hardy and active' },
  'Brahma': { img: 'images/brahma.png', origin: 'United States (Asian stock)', weight: '3.6 to 5.4 kg', use: 'Meat and eggs', temper: 'Gentle and docile' },
  'Leghorn': { img: 'images/leghorn.png', origin: 'Italy', weight: '1.8 to 2.7 kg', use: 'High volume of white eggs', temper: 'Energetic and alert' },
  'Kadaknath': { img: 'images/kadaknath.png', origin: 'India', weight: '1.5 to 2.5 kg', use: 'Black-fleshed meat, traditional use', temper: 'Hardy and active' }
};

/* ---------- Helpers ---------- */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => CUR + Number(n || 0).toLocaleString('en-US');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const catOf = a => a <= 4 ? '4' : a === 5 ? '5' : '6';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
let toastTimer;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800); }
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast('Storage is full. Try a smaller photo.'); return false; } };

/* ---------- Data ---------- */
/* Edit your chickens here. One listing per photo: mk(id, name, breed, ageInMonths, price, stock, description, sex, featured) */
const mk = (id, name, breed, age, price, stock, desc, sex, featured = false) =>
  ({ id, name, breed, age, cat: catOf(age), price, stock, img: BREEDS[breed].img, desc, sex, featured });
const seed = () => [
  mk('silkie', 'Silkie Pullet', 'Silkie', 4, 950, 12, 'Soft, fluffy and gentle. Blue ears and black skin.', 'Female', true),
  mk('rir', 'Rhode Island Red Pullet', 'Rhode Island Red', 5, 850, 15, 'Hardy, active and bred for reliable brown eggs.', 'Female'),
  mk('brahma', 'Brahma Hen', 'Brahma', 6, 1800, 3, 'A gentle giant with massive size and feathered feet.', 'Female', true),
  mk('leghorn', 'Leghorn Pullet', 'Leghorn', 4, 650, 18, 'Lightweight and energetic, built for white eggs.', 'Female'),
  mk('kadaknath', 'Kadaknath Young Hen', 'Kadaknath', 5, 1600, 6, 'Rare Indian breed with black feathers, skin and bones.', 'Female', true)
];
const products = seed();
let orders = load(K.o, []);
let cart = load(K.c, {});
const filter = { cat: 'all', q: '', breed: 'all', sort: 'featured' };
const get = id => products.find(p => p.id === id);
// stock = listed stock minus birds already ordered on this device
orders.forEach(o => o.lines.forEach(l => { const p = get(l.id); if (p) p.stock = Math.max(0, p.stock - l.qty); }));

/* ---------- Product rendering ---------- */
const avail = p => p.stock <= 0 ? '<span class="tag out">Sold out</span>'
  : p.stock <= 5 ? `<span class="tag low">Only ${p.stock} left</span>` : `<span class="tag in">${p.stock} available</span>`;

const card = p => `<article class="card reveal">
  <button class="pic" data-act="view" data-id="${p.id}" aria-label="View details of ${esc(p.name)}"><img loading="lazy" src="${esc(p.img)}" alt="${esc(p.breed)} chicken"></button>
  <div class="cbody">
    <div class="meta"><span>${esc(p.breed)}</span><span>${p.age} months</span></div>
    <h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p>
    <div class="foot"><strong class="price">${money(p.price)}</strong>${avail(p)}</div>
    <div class="acts">
      <button class="btn ghost" data-act="view" data-id="${p.id}">Details</button>
      <button class="btn" data-act="add" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>${p.stock <= 0 ? 'Sold out' : 'Add to cart'}</button>
    </div></div></article>`;

function renderFeatured() {
  let l = products.filter(p => p.featured);
  if (!l.length) l = products.slice(0, 3);
  $('#featuredGrid').innerHTML = l.slice(0, 8).map(card).join('');
}
function renderCats() {
  $('#catCards').innerHTML = Object.keys(CATS).map(k => {
    const l = products.filter(p => p.cat === k), n = l.reduce((s, p) => s + p.stock, 0);
    return `<button class="catcard reveal" data-act="cat" data-cat="${k}"><b>${CATS[k]}</b><span>${l.length} listings, ${n} birds in stock</span></button>`;
  }).join('');
}
function renderChips() {
  const all = { all: 'All ages', ...CATS };
  $('#chips').innerHTML = Object.keys(all).map(k =>
    `<button class="chip" data-act="chip" data-cat="${k}" aria-pressed="${filter.cat === k}">${all[k]}</button>`).join('');
}
function renderBreedSel() {
  const names = [...new Set([...Object.keys(BREEDS), ...products.map(p => p.breed)])];
  if (filter.breed !== 'all' && !names.includes(filter.breed)) filter.breed = 'all';
  $('#breedSel').innerHTML = '<option value="all">All breeds</option>' + names.map(n => `<option>${esc(n)}</option>`).join('');
  $('#breedSel').value = filter.breed;
}
function renderShop() {
  const q = filter.q.toLowerCase();
  const l = products.filter(p => (filter.cat === 'all' || p.cat === filter.cat) && (filter.breed === 'all' || p.breed === filter.breed)
    && `${p.name} ${p.breed} ${p.desc}`.toLowerCase().includes(q));
  const s = filter.sort;
  l.sort(s === 'low' ? (a, b) => a.price - b.price : s === 'high' ? (a, b) => b.price - a.price : s === 'age' ? (a, b) => a.age - b.age
    : (a, b) => (+!!b.featured) - (+!!a.featured) || a.name.localeCompare(b.name));
  $('#productGrid').innerHTML = l.map(card).join('');
  $('#emptyMsg').hidden = l.length > 0;
  $('#resultCount').textContent = `Showing ${l.length} of ${products.length} listings`;
  renderChips();
}
function syncFilterUI() { $('#search').value = filter.q; $('#breedSel').value = filter.breed; $('#sortSel').value = filter.sort; renderShop(); }
function goShop() { $('#shop').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }

/* ---------- Detail modal ---------- */
function openModal(id) {
  const p = get(id); if (!p) return;
  const b = BREEDS[p.breed] || {};
  const row = (k, v) => `<div><dt>${k}</dt><dd>${esc(v || 'Not listed')}</dd></div>`;
  $('#mBody').innerHTML = `<img src="${esc(p.img)}" alt="${esc(p.breed)} chicken">
  <div class="minfo">
    <div class="meta"><span>${esc(p.breed)}</span><span>${p.age} months</span></div>
    <h2 id="mTitle">${esc(p.name)}</h2><p>${esc(p.desc)}</p>
    <div class="foot"><strong class="price big">${money(p.price)}</strong>${avail(p)}</div>
    <dl>${row('Age', p.age + ' months')}${row('Age group', CATS[p.cat])}${row('Sex', p.sex)}${row('Adult weight', b.weight)}${row('Origin', b.origin)}${row('Best for', b.use)}${row('Temperament', b.temper)}</dl>
    ${p.stock > 0 ? `<div class="buy"><label>Quantity<input type="number" id="mQty" min="1" max="${p.stock}" value="1"></label>
    <button class="btn big" data-act="addq" data-id="${p.id}">Add to cart</button></div>` : '<p class="err">This chicken is sold out right now.</p>'}
  </div>`;
  $('#modal').hidden = false; lockScroll(); $('#mClose').focus();
}
function closeModal() { $('#modal').hidden = true; lockScroll(); }

/* ---------- Cart ---------- */
const drawerOpen = () => $('#drawer').classList.contains('open');
function lockScroll() { document.body.classList.toggle('lock', drawerOpen() || !$('#modal').hidden); }
function openDrawer() { $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('on'); lockScroll(); $('#dClose').focus(); }
function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#scrim').classList.remove('on'); lockScroll(); }
function addToCart(id, n = 1) {
  const p = get(id);
  if (!p || p.stock <= 0) return toast('Sorry, this chicken is sold out.');
  const cur = cart[id] || 0;
  if (cur + n > p.stock) return toast(`Only ${p.stock} available for ${p.name}.`);
  cart[id] = cur + n; save(K.c, cart); renderCart();
  toast(`${p.name} added to cart`);
  const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
}
function renderCart() {
  Object.keys(cart).forEach(id => { const p = get(id); if (!p || p.stock <= 0) delete cart[id]; else if (cart[id] > p.stock) cart[id] = p.stock; });
  save(K.c, cart);
  const items = Object.keys(cart).map(id => ({ p: get(id), n: cart[id] }));
  const total = items.reduce((s, i) => s + i.p.price * i.n, 0);
  $('#cartCount').textContent = items.reduce((s, i) => s + i.n, 0);
  $('#cartItems').innerHTML = items.length ? items.map(({ p, n }) => `<div class="ci">
    <img src="${esc(p.img)}" alt="${esc(p.breed)} chicken">
    <div><b>${esc(p.name)}</b><small>${p.age} months, ${money(p.price)} each</small>
      <div class="qty"><button data-act="dec" data-id="${p.id}" aria-label="Decrease quantity">&minus;</button><span>${n}</span><button data-act="inc" data-id="${p.id}" aria-label="Increase quantity">+</button></div></div>
    <button class="link" data-act="rm" data-id="${p.id}">Remove</button></div>`).join('')
    + `<div class="total"><span>Total</span><span>${money(total)}</span></div>`
    : '<p class="empty">Your cart is empty. Add a chicken to get started.</p>';
  $('#checkout').hidden = !items.length;
}
function checkout(e) {
  e.preventDefault();
  const name = $('#c_name').value.trim(), phone = $('#c_phone').value.trim(), addr = $('#c_addr').value.trim(), err = $('#checkoutErr');
  const ids = Object.keys(cart);
  if (!ids.length) return;
  if (name.length < 2) return err.textContent = 'Enter your full name.';
  if (phone.replace(/\D/g, '').length < 7) return err.textContent = 'Enter a valid phone number.';
  if (addr.length < 5) return err.textContent = 'Enter your pickup or delivery address.';
  for (const id of ids) { const p = get(id); if (!p || p.stock < cart[id]) { err.textContent = 'Stock changed. Please review your cart.'; return renderCart(); } }
  const lines = ids.map(id => { const p = get(id); p.stock -= cart[id]; return { id, name: p.name, qty: cart[id], price: p.price }; });
  const order = { id: uid().slice(-6).toUpperCase(), date: new Date().toLocaleString(), name, phone, addr, lines, total: lines.reduce((s, l) => s + l.qty * l.price, 0), status: 'Pending' };
  orders.unshift(order); save(K.o, orders);
  cart = {}; save(K.c, cart); err.textContent = ''; $('#checkout').reset();
  closeDrawer(); renderAll(); toast(`Order ${order.id} placed. We will message you to confirm.`);
}

/* ---------- Scroll effects ---------- */
const shapes = $$('.shape'), blob = $('#blob'), header = $('#top');
const morph = x => { const f = k => (50 + 22 * Math.sin(x + k)).toFixed(1) + '%'; return `${f(0)} ${f(1.7)} ${f(3.1)} ${f(4.6)} / ${f(2.2)} ${f(5.1)} ${f(.8)} ${f(3.8)}`; };
let ticking = false;
function onScroll() {
  if (ticking) return; ticking = true;
  requestAnimationFrame(() => {
    const y = scrollY; header.classList.toggle('stuck', y > 20);
    if (!reduce) {
      shapes.forEach((s, i) => {
        s.style.transform = `translate3d(${Math.sin(y / 500 + i * 2) * 70}px,${Math.cos(y / 420 + i) * 110}px,0) rotate(${y * (i + 1) * .04}deg) scale(${1 + .15 * Math.sin(y / 600 + i)})`;
        s.style.borderRadius = morph(y / 260 + i * 2);
      });
      blob.style.borderRadius = morph(y / 220);
      blob.style.transform = `translateY(${Math.min(y, 800) * .1}px) rotate(${y * .02}deg)`;
    }
    ticking = false;
  });
}
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => {
  if (!en.isIntersecting) return;
  const t = en.target; t.classList.add('in'); io.unobserve(t); setTimeout(() => t.style.transitionDelay = '', 1300);
}), { threshold: .1 }) : null;
function watch() { $$('.reveal:not(.in)').forEach((el, i) => { if (!io) return el.classList.add('in'); el.style.transitionDelay = (i % 4) * 80 + 'ms'; io.observe(el); }); }

/* ---------- Hero ---------- */
const names = Object.keys(BREEDS); let hi = 0, heroTimer;
function showHero(n) {
  hi = (n + names.length) % names.length; const b = names[hi], img = $('#heroImg');
  img.classList.add('swap');
  setTimeout(() => { img.src = BREEDS[b].img; img.alt = b + ' chicken'; $('#heroShop').textContent = 'Shop ' + b; img.classList.remove('swap'); }, 250);
}
function autoHero() { clearInterval(heroTimer); if (!reduce) heroTimer = setInterval(() => showHero(hi + 1), 5000); }

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = b.dataset.id, a = b.dataset.act;
  if (a === 'view') openModal(id);
  else if (a === 'add') addToCart(id);
  else if (a === 'addq') { addToCart(id, Math.max(1, parseInt($('#mQty').value, 10) || 1)); closeModal(); }
  else if (a === 'cat') { filter.cat = b.dataset.cat; filter.breed = 'all'; filter.q = ''; syncFilterUI(); watch(); goShop(); }
  else if (a === 'chip') { filter.cat = b.dataset.cat; renderShop(); watch(); }
  else if (a === 'inc') addToCart(id);
  else if (a === 'dec') { cart[id] = (cart[id] || 1) - 1; if (cart[id] <= 0) delete cart[id]; renderCart(); }
  else if (a === 'rm') { delete cart[id]; renderCart(); }

});
$('#search').addEventListener('input', e => { filter.q = e.target.value; renderShop(); watch(); });
$('#breedSel').addEventListener('change', e => { filter.breed = e.target.value; renderShop(); watch(); });
$('#sortSel').addEventListener('change', e => { filter.sort = e.target.value; renderShop(); watch(); });
$('#clearBtn').addEventListener('click', () => { Object.assign(filter, { cat: 'all', q: '', breed: 'all', sort: 'featured' }); syncFilterUI(); watch(); });
$('#cartBtn').addEventListener('click', openDrawer);
$('#dClose').addEventListener('click', closeDrawer);
$('#scrim').addEventListener('click', closeDrawer);
$('#mClose').addEventListener('click', closeModal);
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
$('#checkout').addEventListener('submit', checkout);
$('#prev').addEventListener('click', () => { showHero(hi - 1); autoHero(); });
$('#next').addEventListener('click', () => { showHero(hi + 1); autoHero(); });
$('#heroShop').addEventListener('click', () => { Object.assign(filter, { cat: 'all', q: '', breed: names[hi] }); syncFilterUI(); watch(); goShop(); });
$('#burger').addEventListener('click', () => { const o = $('#nav').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); $('#burger').setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); });
$('#nav').addEventListener('click', e => { if (e.target.tagName === 'A') { $('#nav').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false'); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeDrawer(); } });
addEventListener('scroll', onScroll, { passive: true });

/* ---------- Init ---------- */
function renderAll() { renderFeatured(); renderCats(); renderBreedSel(); renderShop(); renderCart(); watch(); }
renderAll(); onScroll(); autoHero();
