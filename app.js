/* ArgiaMart v2 — Full-featured SPA */
(function () {
  "use strict";

  /* ================= CONSTANTS ================= */
  const VERSION = "2.0.0";
  const CATS = ["Makanan", "Minuman", "Snack", "Kebersihan", "Dapur", "Lainnya"];
  const CAT_META = {
    Makanan:    { count: 600, range: [3000, 25000],  icon: "🍜", colors: ["#ff9a56","#ff5e62"], emojis: ["🍜","🍛","🍲","🍚","🥘","🍝","🍱","🥡","🍔","🌮","🍕","🥗","🍤","🍣","🥟"] },
    Minuman:    { count: 540, range: [2500, 20000],  icon: "🥤", colors: ["#56ccf2","#2f80ed"], emojis: ["🥤","🧃","🧋","☕","🍵","🥛","🍶","🧊","🍹","🧉","🥂","🍺"] },
    Snack:      { count: 480, range: [5000, 20000],  icon: "🍪", colors: ["#f7b733","#fc4a1a"], emojis: ["🍪","🍫","🍬","🥨","🍿","🍩","🧁","🍭","🍰","🎂","🍮","🥧"] },
    Kebersihan: { count: 420, range: [4000, 35000],  icon: "🧴", colors: ["#43e97b","#38f9d7"], emojis: ["🧴","🧼","🪥","🧽","🧻","🪒","🧺","🧯","🧹","🪣"] },
    Dapur:      { count: 480, range: [5000, 80000],  icon: "🍳", colors: ["#a18cd1","#fbc2eb"], emojis: ["🍳","🥄","🍴","🔪","🍶","🧂","🫙","🥣","🍽️","🥢"] },
    Lainnya:    { count: 480, range: [3000, 50000],  icon: "📦", colors: ["#30cfd0","#330867"], emojis: ["📦","🔋","💡","📓","✏️","📌","🔌","🗂️","🧲","🔦"] }
  };

  const LS = {
    users: "am_users_v2", session: "am_session_v2", cart: "am_cart_v2",
    orders: "am_orders_v2", theme: "am_theme_v2", reviews: "am_reviews_v2",
    wishlist: "am_wishlist_v2", products: "am_products_v2", coupons: "am_coupons_v2",
    addresses: "am_addresses_v2", notif: "am_notif_v2", recentlyViewed: "am_recent_v2"
  };

  /* ================= STATE ================= */
  let products = [];
  let cart = [];
  let currentUser = null;
  const state = {
    q: "", cats: new Set(), minPrice: 0, maxPrice: 80000,
    sort: "default", page: 1, perPage: 20, view: "grid",
    ratingFilter: 0, inStockOnly: false
  };

  /* ================= UTILS ================= */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const formatRupiah = n => "Rp" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const hashPwd = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i); return (h >>> 0).toString(16); };
  const readLS = (k, f) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch (e) { return f; } };
  const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn("LS full", k); } };
  const debounce = (fn, ms) => { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; };
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const uid = p => (p || "") + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const fmtDate = d => new Date(d).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });
  const fmtDateShort = d => new Date(d).toLocaleDateString("id-ID");

  function imgTag(emoji, color, size) {
    size = size || 200;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + color[0] + '"/><stop offset="1" stop-color="' + color[1] + '"/>' +
      '</linearGradient></defs><rect width="' + size + '" height="' + size + '" fill="url(#g)"/>' +
      '<text x="' + (size/2) + '" y="' + (size*0.55) + '" font-size="' + (size*0.5) + '" text-anchor="middle" dominant-baseline="middle" ' +
      'font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">' + emoji + '</text></svg>';
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  }

  function toast(msg, type) {
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = msg;
    $("#toastContainer").appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 2600);
  }

  /* ================= PRODUCT GENERATION (10MB+ data) ================= */
  const POOLS = {
    Makanan: {
      brands: ["Indomie","Mie Sedaap","Sarimi","Pop Mie","Supermi","Nissin","ABC","Mama Suka","Bumbu Desa","Sari Rasa","Kari Ayam","Rice Bowl","Bakmi","Kwetiau","Bihun","Wings","Mamasuka","Bango","Sedaap","Royco","Knorr","Maggi","Bamboe","Desaku","Finna","Kobe","Sasa","Ladaku","Masako","Indofood"],
      types: ["Goreng","Soto","Ayam Bawang","Kari Spesial","Rendang","Sambal Matah","Seafood","Sayur","Baso","Rawon","Ayam Jamur","Cakalang","Empal","Semur","Opor","Gulai","Teriyaki","Blackpepper","Padang","Betawi"],
      variants: ["Reguler","Jumbo","Pedas","Spesial","Family","Ekonomis","Premium","Ori","Hot","Extra"],
      weights: ["70g","80g","85g","90g","100g","120g","150g","200g","250g","300g"]
    },
    Minuman: {
      brands: ["Teh Botol","Coca Cola","Fanta","Sprite","Aqua","Pulpy","Buavita","Floridina","Mizone","Isotonik","Kapal Api","Good Day","Nescafe","Ultra Milk","Frisian Flag","Pocari","Hydro Coco","Cleo","AdeS","Teh Pucuk","Frestea","Golda","Luwak","Torabika","Indocafe","ABC","Ale-Ale","Kino","Orang Tua","Wong Coco"],
      types: ["Original","Less Sugar","Strawberry","Mango","Orange","Lychee","Cappuccino","Mocha","Vanilla","Choco","Lemon","Guava","Apple","Grape","Melon","Taro","Matcha","Honey","Soda","Tonic"],
      variants: ["Botol","Kaleng","Dus","Pet","Refill","Sachet"],
      weights: ["250ml","350ml","500ml","600ml","1L","1.5L","2L","330ml","240ml","200ml"]
    },
    Snack: {
      brands: ["Chitato","Lays","Taro","Qtela","Pringles","Oreo","Roma","Beng Beng","KitKat","Silverqueen","Cadbury","Delfi","Wrigley","Kopiko","Tic Tac","Tango","Nabati","Richeese","Better","Gery","Khong Guan","Hatari","Momogi","Twisties","Cheetos","Doritos","Ritz","Kraft","Ultra","Wim"],
      types: ["Sapi Panggang","Rumput Laut","Keju","Cokelat","Vanilla","Strawberry","BBQ","Jagung Bakar","Original","Mint","Ayam","Balado","Seaweed","Tomato","Pizza","Sour Cream","Honey","Caramel","Matcha","Tiramisu"],
      variants: ["Pack","Family","Sharing","Mini","Single","Duo","Twin"],
      weights: ["50g","68g","100g","120g","150g","180g","200g","250g","300g","500g"]
    },
    Kebersihan: {
      brands: ["Lifebuoy","Dettol","Pepsodent","Close Up","Sensodyne","Rinso","So Klin","Attack","Sunlight","Mama Lemon","Softex","Cussons","Wipol","Bayclin","Stella","Antis","Enzim","Molto","Downy","Vanish","Harpic","Porstex","Soklin","Boom","Daia","Total","Lantai","Kispray","Bagus","Ekonomi"],
      types: ["Sabun Cair","Sabun Batang","Pasta Gigi","Deterjen","Pembersih Lantai","Pemutih","Shampoo","Body Wash","Hand Wash","Tisu Basah","Pembersih Kaca","Disinfektan","Pelembut","Pewangi","Pembersih Porselen"],
      variants: ["Refill","Botol","Sachet","Pouch","Dus","Pack","Jumbo"],
      weights: ["100ml","200ml","250ml","500ml","800ml","1L","1.5L","2L","3L","5L"]
    },
    Dapur: {
      brands: ["Beras","Minyak Goreng","Gula Pasir","Garam","Tepung","Kecap","Saus","Santan","Mentega","Margarin","Telur","Susu Bubuk","Baking Powder","Bumbu Instan","Kaldu","Bimoli","Sanco","Sania","Fortune","Sedaap","Bango","ABC","Heinz","Blue Band","Simas","Anchor","Dancow","Frisian","Indomilk","Mama Suka"],
      types: ["Premium","Ekonomis","Pilihan","Spesial","Organik","Segar","Wangi","Kemasan","Kualitas","Hemat","Gold","Super","Deluxe","Original","Pouch"],
      variants: ["1kg","2kg","5kg","Pack","Dus","Bungkus","Karung","Jerigen"],
      weights: ["200g","250g","500g","1kg","2kg","5kg","1L","2L","5L","25kg"]
    },
    Lainnya: {
      brands: ["Baterai ABC","Baterai Energizer","Lampu Philips","Lampu Osram","Tisu Paseo","Tisu Kleenex","Korek Api","Lilin","Pulpen Standard","Buku Tulis","Penghapus","Penggaris","Stapler","Spidol","Lem Fox","Tali Rapia","Solasi","Gunting","Cutter","Paku","Sekrup","Kabel","Colokan","Adaptor","Senter","Kunci","Gembok","Masker","Handscoon","Obat Nyamuk"],
      types: ["AA","AAA","9W","12W","Isi 10","Isi 5","Putih","Hitam","Warna","Besar","Kecil","Sedang","Original","Refill","Premium","LED","Neon","Emergency","Anti Air","Tahan Panas"],
      variants: ["Pack","Unit","Set","Dus","Bungkus","Kotak","Lusin"],
      weights: ["1pcs","2pcs","5pcs","10pcs","1pack","1box","1set"]
    }
  };

  const DESC_TEMPLATES = {
    Makanan: n => `${n} adalah pilihan makanan praktis dengan cita rasa rumahan yang autentik. Dibuat dari bahan-bahan pilihan berkualitas tinggi, produk ini siap disajikan kapan saja untuk melengkapi stok dapur Anda. Cocok untuk sarapan, makan siang, makan malam, atau camilan di antara waktu makan. Dikemas higienis dengan teknologi modern untuk menjaga kesegaran dan cita rasa. Nikmati kelezatannya bersama keluarga tercinta.`,
    Minuman: n => `${n} menghadirkan kesegaran alami yang menyegarkan hari Anda. Diformulasikan dari bahan pilihan dengan standar kualitas tinggi, minuman ini cocok dinikmati dingin maupun dalam suhu ruang. Kandungan nutrisinya membantu menjaga hidrasi tubuh sepanjang hari. Kemasan praktis memudahkan Anda membawanya ke mana saja. Sempurna untuk menemani aktivitas, kerja, maupun bersantai.`,
    Snack: n => `${n} adalah camilan renyah dengan rasa gurih yang pas untuk menemani waktu santai atau kerja. Dibuat dari bahan berkualitas dengan proses produksi modern, menghasilkan tekstur renyah dan cita rasa yang konsisten di setiap gigitan. Cocok untuk dinikmati sendiri, bersama teman, atau saat menonton film. Kemasan kedap udara menjaga kerenyahan lebih lama.`,
    Kebersihan: n => `${n} adalah kebutuhan kebersihan andalan untuk menjaga rumah tetap bersih, sehat, dan wangi. Diformulasikan dengan bahan aktif berkualitas yang efektif membersihkan tanpa merusak permukaan. Wangi segar yang tahan lama membuat rumah terasa lebih nyaman. Cocok untuk penggunaan harian di seluruh ruangan rumah Anda.`,
    Dapur: n => `${n} merupakan bahan dapur pilihan dengan kualitas terjamin untuk masakan sehari-hari. Diproses dengan standar tinggi untuk memastikan kesegaran, rasa, dan nutrisi tetap terjaga. Praktis digunakan untuk berbagai resep andalan keluarga. Kemasan dirancang agar mudah disimpan dan tahan lama.`,
    Lainnya: n => `${n} adalah kebutuhan rumah tangga serbaguna yang praktis dan siap pakai. Dirancang untuk memenuhi kebutuhan sehari-hari dengan kualitas terbaik. Awet, fungsional, dan mudah digunakan. Solusi tepat untuk berbagai kebutuhan rumah Anda.`
  };

  const BENEFITS = [
    "Kualitas terjamin", "Harga bersaing", "Stok selalu tersedia", "Pengiriman cepat",
    "Kemasan aman", "Halal & higienis", "Cocok untuk keluarga", "Praktis digunakan",
    "Tahan lama", "Ramah lingkungan", "Bergaransi", "Pilihan favorit pelanggan"
  ];

  function generateProducts() {
    const cached = readLS(LS.products, null);
    if (cached && cached.length > 0 && cached.version === VERSION) return cached.data;
    const out = [];
    let id = 1;
    CATS.forEach(cat => {
      const meta = CAT_META[cat];
      const pool = POOLS[cat];
      const need = meta.count;
      const combos = new Set();
      const picked = [];
      let guard = 0;
      while (picked.length < need && guard < 500000) {
        guard++;
        const b = pool.brands[Math.floor(Math.random() * pool.brands.length)];
        const t = pool.types[Math.floor(Math.random() * pool.types.length)];
        const v = pool.variants[Math.floor(Math.random() * pool.variants.length)];
        const w = pool.weights[Math.floor(Math.random() * pool.weights.length)];
        const name = `${b} ${t} ${v} ${w}`;
        if (combos.has(name)) continue;
        combos.add(name);
        picked.push(name);
      }
      const [rMin, rMax] = meta.range;
      const emojis = meta.emojis;
      picked.forEach(name => {
        const price = Math.round((rMin + Math.random() * (rMax - rMin)) / 500) * 500;
        const stock = Math.random() < 0.08 ? 0 : Math.floor(Math.random() * 151);
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const rating = Math.round((3 + Math.random() * 2) * 10) / 10;
        const sold = Math.floor(Math.random() * 5000);
        const reviews = [];
        for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
          reviews.push({
            user: ["Budi","Siti","Andi","Rina","Dewi","Joko","Ani","Rudi","Maya","Tono"][Math.floor(Math.random()*10)] + " " + ["S.","P.","W.","K.","M."][Math.floor(Math.random()*5)],
            rating: Math.floor(3 + Math.random() * 3),
            text: ["Produk bagus, sesuai deskripsi.","Mantap, akan beli lagi!","Cepat sampai, packing rapi.","Kualitas oke, harga bersahabat.","Sesuai ekspektasi, recommended.","Lumayan, tapi bisa lebih baik lagi.","Sangat memuaskan, terima kasih!","Barang original, pengiriman cepat."][Math.floor(Math.random()*8)],
            date: new Date(Date.now() - Math.random() * 90 * 864e5).toISOString()
          });
        }
        const benefits = shuffle(BENEFITS).slice(0, 4);
        out.push({
          id: id++, name, cat, price, stock,
          desc: DESC_TEMPLATES[cat](name),
          emoji, color: meta.colors, img: imgTag(emoji, meta.colors),
          rating, sold, reviews,
          benefits,
          brand: name.split(" ")[0],
          sku: "AM-" + cat.slice(0,3).toUpperCase() + "-" + String(id).padStart(6, "0"),
          createdAt: new Date(Date.now() - Math.random() * 180 * 864e5).toISOString()
        });
      });
    });
    writeLS(LS.products, { version: VERSION, data: out });
    return out;
  }

  const productById = id => products.find(p => p.id === Number(id));

  /* ================= THEME ================= */
  function initTheme() {
    const saved = localStorage.getItem(LS.theme) || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeBtn(saved);
  }
  function updateThemeBtn(t) { const b = $("#themeToggle"); if (b) b.textContent = t === "dark" ? "☀️" : "🌙"; }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(LS.theme, next);
    updateThemeBtn(next);
  }

  /* ================= AUTH ================= */
  const getUsers = () => readLS(LS.users, []);
  const saveUsers = u => writeLS(LS.users, u);
  const getSession = () => readLS(LS.session, null);
  const saveSession = s => writeLS(LS.session, s);
  const clearSession = () => localStorage.removeItem(LS.session);
  const isValidEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  function registerUser(name, email, password) {
    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase()))
      return { ok: false, error: "Email sudah terdaftar." };
    const user = {
      email, name, password_hash: hashPwd(password),
      created: new Date().toISOString(), address: null,
      phone: null, avatar: name.charAt(0).toUpperCase()
    };
    users.push(user);
    saveUsers(users);
    return { ok: true, user };
  }

  function loginUser(email, password) {
    const users = getUsers();
    const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());
    if (!u) return { ok: false, error: "Email tidak terdaftar." };
    if (u.password_hash !== hashPwd(password)) return { ok: false, error: "Password salah." };
    const session = { email: u.email, name: u.name, loginAt: new Date().toISOString() };
    saveSession(session);
    currentUser = session;
    refreshAuthUI();
    return { ok: true };
  }

  function logout() {
    clearSession();
    currentUser = null;
    refreshAuthUI();
    navigate("home");
    toast("Anda telah keluar.", "warn");
  }

  function refreshAuthUI() {
    const btn = $("#accountBtn");
    if (currentUser) { btn.textContent = "👤"; btn.title = currentUser.name; }
    else { btn.textContent = "👤"; btn.title = "Masuk"; }
  }

  /* ================= CART ================= */
  function loadCart() { cart = readLS(LS.cart, []); if (!Array.isArray(cart)) cart = []; }
  function saveCart() { writeLS(LS.cart, cart); updateCartBadge(); renderCart(); if ($("#cartDrawer").classList.contains("open")) renderCart(); }
  function updateCartBadge() {
    const n = cart.reduce((s, i) => s + i.qty, 0);
    const b = $("#cartBadge"); if (b) b.textContent = n;
  }

  function addToCart(id, qty) {
    const p = productById(id);
    if (!p) return;
    qty = qty || 1;
    if (p.stock === 0) { toast("Stok habis.", "err"); return; }
    const ex = cart.find(i => i.id === p.id);
    const cur = ex ? ex.qty : 0;
    if (cur + qty > p.stock) { toast("Melebihi stok tersedia (" + p.stock + ").", "err"); return; }
    if (ex) ex.qty += qty;
    else cart.push({ id: p.id, name: p.name, price: p.price, qty, emoji: p.emoji, cat: p.cat, img: p.img });
    saveCart();
    toast(p.name + " ditambahkan.", "ok");
    addNotification("Keranjang", p.name + " ditambahkan ke keranjang.");
  }

  function changeQty(id, delta) {
    const item = cart.find(i => i.id === Number(id));
    if (!item) return;
    const p = productById(id);
    const next = item.qty + delta;
    if (next <= 0) { removeItem(id); return; }
    if (p && next > p.stock) { toast("Stok tersedia: " + p.stock + ".", "err"); return; }
    item.qty = next;
    saveCart();
  }

  function removeItem(id) { cart = cart.filter(i => i.id !== Number(id)); saveCart(); }
  function clearCart() { cart = []; saveCart(); }

  function cartTotals(couponCode) {
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = subtotal === 0 ? 0 : (subtotal >= 100000 ? 0 : 10000);
    const tax = Math.round(subtotal * 0.11);
    let discount = 0;
    if (couponCode) {
      const coupons = readLS(LS.coupons, []);
      const c = coupons.find(x => x.code === couponCode && x.active);
      if (c) {
        if (c.type === "percent") discount = Math.round(subtotal * c.value / 100);
        else discount = c.value;
        if (c.maxDiscount && discount > c.maxDiscount) discount = c.maxDiscount;
        if (discount > subtotal) discount = subtotal;
      }
    }
    const total = subtotal + shipping + tax - discount;
    return { subtotal, shipping, tax, discount, total: Math.max(0, total) };
  }

  function renderCart() {
    const itemsEl = $("#cartItems"), summaryEl = $("#cartSummary");
    if (!itemsEl || !summaryEl) return;
    if (cart.length === 0) {
      itemsEl.innerHTML = '<div class="empty-state"><div class="empty-emoji">🛒</div><p>Keranjang masih kosong.</p><button class="btn btn-primary" data-page="products">Mulai Belanja</button></div>';
      summaryEl.innerHTML = "";
      return;
    }
    itemsEl.innerHTML = cart.map(i => {
      const p = productById(i.id);
      return `
      <div class="cart-item">
        <div class="cart-item-img" data-open-product="${i.id}">
          <img src="${p ? p.img : imgTag(i.emoji, ["#666","#333"])}" alt="">
        </div>
        <div class="cart-item-body">
          <div class="cart-item-name">${escapeHtml(i.name)}</div>
          <div class="cart-item-price">${formatRupiah(i.price)}</div>
          <div class="qty-row">
            <button class="qty-btn" data-cart-qty="${i.id}" data-delta="-1">−</button>
            <span class="qty-val">${i.qty}</span>
            <button class="qty-btn" data-cart-qty="${i.id}" data-delta="1">+</button>
            <button class="qty-remove" data-cart-remove="${i.id}">Hapus</button>
          </div>
        </div>
        <div class="cart-item-sub">${formatRupiah(i.price * i.qty)}</div>
      </div>`;
    }).join("");
    