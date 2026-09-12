// ระบบการทำงานร้าน โดมเบรคแตก (DOME BREAK TAK)
let state = {
  cart: [],
  missionBags: SHOP_CONFIG.initialSimulatedBags || 0,
  roundLabel: 'รอบ 13/09 - 18/09',
  selectedProduct: null,
  selectedFlavorId: 'original',
  selectedSize: 'small-bag',
  selectedQuantity: 1,
  slipDataUrl: null,
  slipQrValid: false,
  slipQrData: null,
  currentOrder: null,
  checkoutItems: [],
  isDirectBuy: false
};

// เริ่มต้นระบบเมื่อเปิดหน้าเว็บ
document.addEventListener('DOMContentLoaded', () => {
  loadSavedState();
  renderProducts();
  renderFlavorCards();
  updateMissionBar();
  updateCartBadge();
  setupEventListeners();
  fetchLiveMissionData(); // ดึงยอดและชื่อรอบจริงจาก Google Sheet
  setInterval(() => fetchLiveMissionData(false), 30000); // อัปเดตอัตโนมัติทุก 30 วินาที
});

// ดึงข้อมูลยอดสะสมและชื่อรอบจาก Google Sheet Web App
async function fetchLiveMissionData(isManual = false) {
  if (!SHOP_CONFIG.googleSheetWebAppUrl) return;

  const syncBtn = document.getElementById('sync-mission-btn');
  if (syncBtn && isManual) {
    syncBtn.innerHTML = '<span class="animate-spin">🔄</span> กำลังซิงค์...';
  }

  try {
    const res = await fetch(SHOP_CONFIG.googleSheetWebAppUrl);
    const data = await res.json();
    if (data && data.status === 'success') {
      if (data.currentBags !== undefined) state.missionBags = Number(data.currentBags);
      if (data.roundLabel) state.roundLabel = data.roundLabel;
      saveState();
      updateMissionBar();
      if (isManual) showToast(`ซิงค์ข้อมูลสำเร็จ: ${state.roundLabel} (${state.missionBags}/10 ถุง)`);
    }
  } catch (err) {
    console.log('Sync Mission Error:', err);
    if (isManual) showToast('ไม่สามารถเชื่อมต่อ Google Sheet ได้ในขณะนี้');
  } finally {
    if (syncBtn && isManual) {
      syncBtn.innerHTML = '<span>🔄 ซิงค์ยอด</span>';
    }
  }
}

// ดึงข้อมูลจาก LocalStorage
function loadSavedState() {
  try {
    const savedCart = localStorage.getItem('dbt_cart');
    if (savedCart) state.cart = JSON.parse(savedCart);
    const savedMission = localStorage.getItem('dbt_mission');
    if (savedMission) state.missionBags = parseInt(savedMission);
    const savedRound = localStorage.getItem('dbt_round');
    if (savedRound && !savedRound.includes('06/09')) {
      state.roundLabel = savedRound;
    }
  } catch (e) {}
}

function saveState() {
  try {
    localStorage.setItem('dbt_cart', JSON.stringify(state.cart));
    localStorage.setItem('dbt_mission', state.missionBags.toString());
    localStorage.setItem('dbt_round', state.roundLabel);
  } catch (e) {}
}

// อัปเดตแถบภารกิจนับถุงสะสม (ครบ 10 ถุง เปิดเตาทอดรอบส่งทันที)
function updateMissionBar() {
  const current = state.missionBags;
  const target = SHOP_CONFIG.missionTargetBags;
  const percent = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);

  const bar = document.getElementById('mission-progress-fill');
  const countText = document.getElementById('mission-count-text');
  const remainText = document.getElementById('mission-remaining-text');
  const statusBadge = document.getElementById('mission-status-badge');
  const roundBadge = document.getElementById('mission-round-badge');

  if (roundBadge && state.roundLabel) {
    roundBadge.textContent = state.roundLabel;
  }
  if (bar) bar.style.width = `${percent}%`;
  if (countText) countText.textContent = `${current}/${target} ถุง (${percent}%)`;

  if (remaining === 0) {
    if (remainText) remainText.innerHTML = `<span class="text-emerald-300 font-bold">🎉 ครบ 10 ถุงแล้ว! เปิดเตาทอดสดใหม่รอบนี้ พร้อมจัดส่งทันที</span>`;
    if (statusBadge) {
      statusBadge.textContent = "🔥 ยอดครบแล้ว! กำลังทอดสด";
      statusBadge.className = "text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500 text-white animate-pulse whitespace-nowrap";
    }
  } else {
    if (remainText) remainText.innerHTML = `เป้าหมายครบ 10 ถุงเปิดเตาทอดสดใหม่! ขาดอีกเพียง <strong class="text-yellow-300 font-bold text-base">${remaining}</strong> ถุง`;
    if (statusBadge) {
      statusBadge.textContent = "⚡ กำลังสะสมยอด";
      statusBadge.className = "text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-400 text-amber-950 whitespace-nowrap";
    }
  }
}

// แสดงรายการสินค้า 2 ขนาด
function renderProducts() {
  const container = document.getElementById('products-grid');
  if (!container) return;

  container.innerHTML = PRODUCTS.map(p => {
    return `
      <div class="bg-white rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 border border-amber-100 overflow-hidden flex flex-col group">
        <!-- ภาพสินค้า -->
        <div class="relative overflow-hidden bg-amber-50 cursor-pointer" onclick="openShopeeVariantModal('${p.id}')">
          <img src="${p.image}" alt="${p.name}" class="w-full h-64 sm:h-72 object-cover object-center group-hover:scale-105 transition-transform duration-500">
          <div class="absolute top-3 left-3 flex flex-col gap-1">
            ${p.tags.map(t => `<span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-white/95 backdrop-blur-sm text-amber-900 shadow-sm border border-amber-200">${t}</span>`).join('')}
          </div>
          <div class="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5">
            <span>⭐ ${p.rating}</span>
            <span class="text-gray-400">|</span>
            <span>ขายแล้ว ${p.soldCount}</span>
          </div>
        </div>

        <!-- รายละเอียดสินค้า -->
        <div class="p-5 sm:p-6 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                น้ำหนัก ${p.weight}
              </span>
              <span class="text-xs text-gray-500">${p.packageType}</span>
            </div>
            
            <h3 class="text-xl font-extrabold text-gray-900 cursor-pointer group-hover:text-amber-600 transition-colors" onclick="openShopeeVariantModal('${p.id}')">
              ${p.name}
            </h3>
            
            <p class="text-xs sm:text-sm text-gray-600 mt-1.5 line-clamp-2">
              ${p.description}
            </p>

            <!-- กล่องแสดงราคาแต่ละรสชาติ -->
            <div class="mt-4 p-3 bg-amber-50/70 rounded-2xl border border-amber-100">
              <div class="text-xs font-bold text-amber-900 mb-2 flex items-center justify-between">
                <span>มีให้เลือก 4 รสชาติ (กดเลือกได้ทันที):</span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <button type="button" onclick="openShopeeVariantModal('${p.id}', 'original')" class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-amber-200 hover:border-amber-400 text-left transition-colors">
                  <span>🍌 ออริจินอล</span>
                  <span class="font-bold text-amber-700">฿${p.prices.original}</span>
                </button>
                <button type="button" onclick="openShopeeVariantModal('${p.id}', 'sweet')" class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-amber-200 hover:border-amber-400 text-left transition-colors">
                  <span>🍯 รสหวาน</span>
                  <span class="font-bold text-amber-700">฿${p.prices.sweet}</span>
                </button>
                <button type="button" onclick="openShopeeVariantModal('${p.id}', 'salty')" class="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-amber-200 hover:border-amber-400 text-left transition-colors">
                  <span>🧂 รสเค็ม</span>
                  <span class="font-bold text-amber-700">฿${p.prices.salty}</span>
                </button>
                <button type="button" onclick="openShopeeVariantModal('${p.id}', 'paprika')" class="flex items-center justify-between bg-rose-50 px-2.5 py-1.5 rounded-xl border border-rose-200 hover:border-rose-400 text-left transition-colors">
                  <span class="text-rose-700">🌶️ ปาปริก้า</span>
                  <span class="font-bold text-rose-600">฿${p.prices.paprika}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- แถบราคาและปุ่มเลือกรสชาติ -->
          <div class="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <div>
              <div class="text-[11px] text-gray-400">ราคาเริ่มต้น</div>
              <div class="text-2xl font-extrabold text-[#EE4D2D]">
                ฿${p.basePrice} <span class="text-xs font-normal text-gray-400">- ฿${p.prices.paprika}</span>
              </div>
            </div>

            <button onclick="openShopeeVariantModal('${p.id}')" class="flex-1 max-w-[170px] py-3 px-4 rounded-xl font-bold text-white text-sm shopee-badge hover:opacity-95 active:scale-95 transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-1.5">
              <span>เลือกรสชาติ / สั่งซื้อ</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// แสดงการ์ด 4 รสชาติความอร่อย (ใช้รูปโลโก้จริงของแต่ละรสชาติ)
function renderFlavorCards() {
  const container = document.getElementById('flavors-grid');
  if (!container) return;

  container.innerHTML = FLAVORS.map(f => {
    return `
      <div class="bg-white rounded-3xl p-4 shadow-sm hover:shadow-md transition-all border border-amber-100 flex flex-col justify-between items-center text-center group">
        <div class="w-full flex flex-col items-center">
          <!-- รูปโลโก้รสชาติตามที่อัปโหลด -->
          <div class="w-36 h-36 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-amber-100 shadow-inner group-hover:scale-105 transition-transform duration-300">
            <img src="${f.stickerImage}" alt="${f.name}" class="w-full h-full object-cover">
          </div>
          
          <div class="mt-3">
            <span class="text-xs font-bold px-3 py-1 rounded-full ${f.badgeBg}">
              ${f.emoji} ${f.name} (${f.nameEn})
            </span>
            <p class="text-xs text-gray-600 mt-2 leading-relaxed px-1">
              ${f.desc}
            </p>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-gray-100 w-full flex flex-col gap-1.5">
          <button onclick="openShopeeVariantModal('small-bag', '${f.id}')" class="w-full py-1.5 px-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 transition-colors">
            สั่งถุงเล็ก (฿${f.id === 'paprika' ? 50 : 45})
          </button>
          <button onclick="openShopeeVariantModal('large-bag', '${f.id}')" class="w-full py-1.5 px-2 rounded-xl text-xs font-bold text-amber-950 bg-amber-200/80 hover:bg-amber-300 transition-colors">
            สั่งถุงใหญ่ (฿${f.id === 'paprika' ? 150 : 130})
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// เปิดโมดอลเลือกรสชาติสไตล์ Shopee
function openShopeeVariantModal(productId = 'small-bag', defaultFlavor = 'original') {
  state.selectedSize = productId;
  state.selectedProduct = PRODUCTS.find(p => p.id === productId) || PRODUCTS[0];
  state.selectedFlavorId = defaultFlavor;
  state.selectedQuantity = 1;

  updateModalView();

  const modal = document.getElementById('variant-modal');
  const drawer = document.getElementById('variant-drawer-content');
  if (modal && drawer) {
    modal.classList.remove('hidden');
    setTimeout(() => {
      drawer.classList.remove('translate-y-full');
      modal.classList.remove('opacity-0');
    }, 10);
  }
}

function closeShopeeVariantModal() {
  const modal = document.getElementById('variant-modal');
  const drawer = document.getElementById('variant-drawer-content');
  if (modal && drawer) {
    drawer.classList.add('translate-y-full');
    modal.classList.add('opacity-0');
    setTimeout(() => {
      modal.classList.add('hidden');
    }, 300);
  }
}

// อัปเดตข้อมูลบนหน้าต่าง Shopee Variant Modal แบบเรียลไทม์
function updateModalView() {
  const product = state.selectedProduct;
  const flavor = FLAVORS.find(f => f.id === state.selectedFlavorId) || FLAVORS[0];
  const unitPrice = product.prices[flavor.id];
  const totalPrice = unitPrice * state.selectedQuantity;

  // รูปแสดงตามรสชาติที่เลือก
  const modalImg = document.getElementById('modal-product-img');
  if (modalImg) {
    modalImg.src = flavor.stickerImage;
  }

  // อัปเดตราคาต่อหน่วย
  const priceDisplay = document.getElementById('modal-unit-price');
  if (priceDisplay) priceDisplay.textContent = `฿${unitPrice}`;

  // อัปเดตยอดรวมรายการ
  const totalDisplay = document.getElementById('modal-subtotal-price');
  if (totalDisplay) totalDisplay.textContent = `฿${totalPrice}`;

  const qtyInput = document.getElementById('modal-qty-input');
  if (qtyInput) qtyInput.value = state.selectedQuantity;

  // เลือกขนาด chips (ถุงเล็ก / ถุงใหญ่)
  const sizeContainer = document.getElementById('modal-size-options');
  if (sizeContainer) {
    sizeContainer.innerHTML = PRODUCTS.map(p => {
      const isSelected = p.id === state.selectedProduct.id;
      return `
        <button type="button" onclick="selectModalSize('${p.id}')" class="px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center justify-between ${
          isSelected
            ? 'border-[#EE4D2D] bg-[#EE4D2D]/10 text-[#EE4D2D] ring-2 ring-[#EE4D2D]/30 shadow-sm'
            : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300'
        }">
          <span>${p.sizeLabel} (${p.weight})</span>
          <span class="text-xs font-semibold ${isSelected ? 'text-[#EE4D2D]' : 'text-gray-400'}">฿${p.basePrice}-${p.prices.paprika}</span>
        </button>
      `;
    }).join('');
  }

  // เลือกรสชาติ chips (Shopee Style)
  const flavorContainer = document.getElementById('modal-flavor-options');
  if (flavorContainer) {
    flavorContainer.innerHTML = FLAVORS.map(f => {
      const isSelected = f.id === state.selectedFlavorId;
      const fPrice = product.prices[f.id];
      const diff = fPrice - product.basePrice;
      const diffText = diff > 0 ? ` (+฿${diff})` : '';

      return `
        <button type="button" onclick="selectModalFlavor('${f.id}')" class="px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all flex items-center justify-between ${
          isSelected
            ? 'border-[#EE4D2D] bg-[#EE4D2D]/10 text-[#EE4D2D] ring-2 ring-[#EE4D2D]/30 shadow-sm font-bold'
            : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300'
        }">
          <span>${f.emoji} ${f.name}${diffText}</span>
          <span class="text-xs font-bold ${isSelected ? 'text-[#EE4D2D]' : 'text-gray-500'}">฿${fPrice}</span>
        </button>
      `;
    }).join('');
  }
}

function selectModalFlavor(flavorId) {
  state.selectedFlavorId = flavorId;
  updateModalView();
}

function selectModalSize(productId) {
  state.selectedSize = productId;
  state.selectedProduct = PRODUCTS.find(p => p.id === productId);
  updateModalView();
}

function adjustModalQty(delta) {
  const newQty = state.selectedQuantity + delta;
  if (newQty >= 1 && newQty <= 99) {
    state.selectedQuantity = newQty;
    updateModalView();
  }
}

// เพิ่มลงตะกร้า (Add to Cart) หรือ ซื้อทันที (Buy Now)
function handleAddToCart(isBuyNow = false) {
  const product = state.selectedProduct;
  const flavor = FLAVORS.find(f => f.id === state.selectedFlavorId);
  const unitPrice = product.prices[flavor.id];

  if (isBuyNow) {
    // โหมด "ซื้อทันที": ส่งเข้าระบบชำระเงินโดยตรง ไม่นำเข้าตะกร้าสินค้า
    state.isDirectBuy = true;
    state.checkoutItems = [{
      productId: product.id,
      productName: product.name,
      sizeLabel: product.sizeLabel,
      flavorId: flavor.id,
      flavorName: flavor.name,
      flavorEmoji: flavor.emoji,
      unitPrice: unitPrice,
      quantity: state.selectedQuantity,
      image: flavor.stickerImage
    }];

    closeShopeeVariantModal();
    openCheckoutModal(true);
    return;
  }

  // โหมด "หยิบใส่ตะกร้า": นำเข้าตะกร้าสินค้าปกติ
  const existingIndex = state.cart.findIndex(
    item => item.productId === product.id && item.flavorId === flavor.id
  );

  if (existingIndex > -1) {
    state.cart[existingIndex].quantity += state.selectedQuantity;
  } else {
    state.cart.push({
      productId: product.id,
      productName: product.name,
      sizeLabel: product.sizeLabel,
      flavorId: flavor.id,
      flavorName: flavor.name,
      flavorEmoji: flavor.emoji,
      unitPrice: unitPrice,
      quantity: state.selectedQuantity,
      image: flavor.stickerImage
    });
  }

  closeShopeeVariantModal();
  saveState();
  updateCartBadge();
  showToast(`เพิ่ม "${product.sizeLabel} - ${flavor.name}" จำนวน ${state.selectedQuantity} ถุง ลงตะกร้าแล้ว!`);
}

// อัปเดตตัวเลขนับบนไอคอนตะกร้า
function updateCartBadge() {
  const totalQty = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const badges = document.querySelectorAll('.cart-count-badge');
  badges.forEach(b => {
    b.textContent = totalQty;
    if (totalQty > 0) {
      b.classList.remove('hidden');
      b.classList.add('animate-bounce-slow');
    } else {
      b.classList.add('hidden');
      b.classList.remove('animate-bounce-slow');
    }
  });

  const floatingBtn = document.getElementById('floating-cart-btn');
  if (floatingBtn) {
    if (totalQty > 0) {
      floatingBtn.classList.remove('hidden');
    } else {
      floatingBtn.classList.add('hidden');
    }
  }
}

function showToast(message) {
  const toast = document.getElementById('app-toast');
  const msgEl = document.getElementById('toast-message');
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.remove('translate-y-24', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('translate-y-24', 'opacity-0');
  }, 3000);
}

// ตะกร้าสินค้าแบบสไลด์ข้าง
function openCartDrawer() {
  renderCartDrawer();
  const drawer = document.getElementById('cart-drawer');
  const content = document.getElementById('cart-drawer-content');
  if (drawer && content) {
    drawer.classList.remove('hidden');
    requestAnimationFrame(() => {
      drawer.classList.remove('opacity-0');
      content.classList.remove('translate-x-full');
    });
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const content = document.getElementById('cart-drawer-content');
  if (drawer && content) {
    content.classList.add('translate-x-full');
    drawer.classList.add('opacity-0');
    setTimeout(() => {
      drawer.classList.add('hidden');
    }, 300);
  }
}

function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  const summarySection = document.getElementById('cart-summary-section');
  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (summarySection) summarySection.classList.add('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');
  if (summarySection) summarySection.classList.remove('hidden');

  const totalBags = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const itemsSubtotal = state.cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const isOffice = (state.deliveryMethod || 'office') === 'office';
  const shippingFee = isOffice ? 0 : 50;
  const grandTotal = itemsSubtotal + shippingFee;

  container.innerHTML = state.cart.map((item, idx) => {
    const lineTotal = item.unitPrice * item.quantity;
    return `
      <div class="flex items-center gap-3 p-3 bg-white rounded-2xl border border-amber-100 shadow-sm">
        <img src="${item.image}" alt="${item.flavorName}" class="w-16 h-16 rounded-full object-cover border-2 border-amber-200">
        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold text-gray-900 truncate">${item.sizeLabel}</div>
          <div class="text-xs text-amber-700 font-semibold">${item.flavorEmoji} ${item.flavorName}</div>
          <div class="text-xs font-bold text-[#EE4D2D] mt-0.5">฿${item.unitPrice} / ถุง</div>

          <div class="flex items-center justify-between mt-2">
            <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <button onclick="updateCartQty(${idx}, -1)" class="px-2 py-0.5 text-gray-600 hover:bg-gray-200 font-bold">-</button>
              <span class="px-2.5 py-0.5 text-xs font-bold">${item.quantity}</span>
              <button onclick="updateCartQty(${idx}, 1)" class="px-2 py-0.5 text-gray-600 hover:bg-gray-200 font-bold">+</button>
            </div>
            <div class="text-sm font-extrabold text-gray-900">฿${lineTotal}</div>
          </div>
        </div>
        <button onclick="removeCartItem(${idx})" class="p-1.5 text-gray-400 hover:text-rose-500 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    `;
  }).join('');

  // สรุปยอด
  const totalBagsEl = document.getElementById('cart-total-bags');
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping');
  const grandTotalEl = document.getElementById('cart-grand-total');
  const freeShipBadge = document.getElementById('cart-free-shipping-badge');

  if (totalBagsEl) totalBagsEl.textContent = `${totalBags} ถุง`;
  if (subtotalEl) subtotalEl.textContent = `฿${itemsSubtotal}`;
  if (shippingEl) {
    shippingEl.textContent = isOffice ? 'ฟรี! (ออฟฟิศ)' : '฿50';
    shippingEl.className = isOffice ? 'font-bold text-emerald-600' : 'font-bold text-[#EE4D2D]';
  }
  if (grandTotalEl) grandTotalEl.textContent = `฿${grandTotal}`;

  if (freeShipBadge) {
    freeShipBadge.innerHTML = `<span class="text-xs text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full font-bold">🏢 จัดส่งที่ออฟฟิศ ส่งฟรี! (หรือจัดส่งทางอื่น ๆ เหมา 50 บาท)</span>`;
  }
}

function updateCartQty(index, delta) {
  if (state.cart[index]) {
    state.cart[index].quantity += delta;
    if (state.cart[index].quantity <= 0) {
      state.cart.splice(index, 1);
    }
    saveState();
    updateCartBadge();
    renderCartDrawer();
  }
}

function removeCartItem(index) {
  if (state.cart[index]) {
    state.cart.splice(index, 1);
    saveState();
    updateCartBadge();
    renderCartDrawer();
  }
}

// จัดการเปลี่ยนรูปแบบการจัดส่ง (ออฟฟิศ vs ทางอื่นๆ)
function handleDeliveryMethodChange(method) {
  state.deliveryMethod = method;
  
  const officeCard = document.getElementById('delivery-card-office');
  const otherCard = document.getElementById('delivery-card-other');
  const otherFields = document.getElementById('other-delivery-fields');
  
  if (method === 'office') {
    if (officeCard) {
      officeCard.className = "relative flex items-center gap-3 p-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50/70 cursor-pointer transition-all shadow-sm";
    }
    if (otherCard) {
      otherCard.className = "relative flex items-center gap-3 p-3 rounded-2xl border-2 border-gray-200 bg-white cursor-pointer hover:border-amber-300 transition-all";
    }
    if (otherFields) otherFields.classList.add('hidden');
  } else {
    if (officeCard) {
      officeCard.className = "relative flex items-center gap-3 p-3 rounded-2xl border-2 border-gray-200 bg-white cursor-pointer hover:border-emerald-300 transition-all";
    }
    if (otherCard) {
      otherCard.className = "relative flex items-center gap-3 p-3 rounded-2xl border-2 border-[#EE4D2D] bg-orange-50/70 cursor-pointer transition-all shadow-sm";
    }
    if (otherFields) otherFields.classList.remove('hidden');
  }
  
  updateCheckoutSummary();
}

// ดึงรายการสินค้าสำหรับหน้าชำระเงิน (แยกกรณีซื้อทันที vs ตะกร้า)
function getCheckoutItems() {
  if (state.isDirectBuy && state.checkoutItems && state.checkoutItems.length > 0) {
    return state.checkoutItems;
  }
  return state.cart;
}

// อัปเดตสรุปยอดและค่าจัดส่งในหน้าชำระเงิน
function updateCheckoutSummary() {
  const items = getCheckoutItems();
  const itemsSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const isOffice = (state.deliveryMethod || 'office') === 'office';
  const shippingFee = isOffice ? 0 : 50;
  const grandTotal = itemsSubtotal + shippingFee;

  const amountDisplays = document.querySelectorAll('.checkout-grand-total');
  amountDisplays.forEach(el => el.textContent = `฿${grandTotal.toFixed(2)}`);

  const orderList = document.getElementById('checkout-items-summary');
  if (orderList) {
    const itemsHtml = items.map(i => `
      <div class="flex justify-between text-xs py-1 border-b border-gray-100">
        <span class="text-gray-700">${i.sizeLabel} (${i.flavorEmoji} ${i.flavorName}) x ${i.quantity}</span>
        <span class="font-bold text-gray-900">฿${i.unitPrice * i.quantity}</span>
      </div>
    `).join('');

    const shippingRowHtml = `
      <div class="flex justify-between text-xs py-1 text-gray-500 pt-2">
        <span>รวมค่าสินค้า:</span>
        <span class="font-semibold text-gray-700">฿${itemsSubtotal}</span>
      </div>
      <div class="flex justify-between text-xs py-1 text-gray-500 items-center">
        <span>ค่าจัดส่ง:</span>
        <div>
          ${isOffice 
            ? `<span class="line-through text-gray-400 mr-1.5">฿50</span><span class="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">ฟรี! (จัดส่งที่ออฟฟิศ)</span>`
            : `<span class="font-bold text-[#EE4D2D] bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">฿50 (จัดส่งทางอื่น ๆ)</span>`
          }
        </div>
      </div>
    `;

    orderList.innerHTML = itemsHtml + shippingRowHtml;
  }
}

// หน้าชำระเงิน พร้อมเพย์ QR
function openCheckoutModal(isDirect = false) {
  closeCartDrawer();

  if (!isDirect) {
    state.isDirectBuy = false;
    state.checkoutItems = [];
  }

  const items = getCheckoutItems();
  if (items.length === 0) {
    showToast('กรุณาเลือกสินค้าใส่ตะกร้าก่อนชำระเงิน');
    return;
  }

  const modal = document.getElementById('checkout-modal');
  if (!modal) return;

  state.deliveryMethod = 'office';
  const officeRadio = document.querySelector('input[name="delivery-method"][value="office"]');
  if (officeRadio) officeRadio.checked = true;
  handleDeliveryMethodChange('office');

  // ดึงข้อมูลผู้สั่งซื้อเดิมมาใส่ให้อัตโนมัติ เพื่อให้นับแต้มสะสมต่อได้ทันทีและสะดวก
  try {
    const lastCustomer = JSON.parse(localStorage.getItem('dbt_last_customer') || '{}');
    const nameInput = document.getElementById('customer-name');
    const phoneInput = document.getElementById('customer-phone');
    const addressInput = document.getElementById('customer-address');
    if (nameInput && !nameInput.value && lastCustomer.name) nameInput.value = lastCustomer.name;
    if (phoneInput && !phoneInput.value && lastCustomer.phone) phoneInput.value = lastCustomer.phone;
    if (addressInput && !addressInput.value && lastCustomer.address) addressInput.value = lastCustomer.address;
  } catch (e) {}

  removeSlip();
  modal.classList.remove('hidden');
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.classList.add('hidden');

  // หากอยู่ในโหมด "ซื้อทันที" แล้วปิด popup (กด x หรือยกเลิก)
  // ให้ล้างรายการทิ้งทันที โดยไม่มีการนำสินค้าไปใส่ตะกร้า
  if (state.isDirectBuy) {
    state.checkoutItems = [];
    state.isDirectBuy = false;
  }
}

function copyAmount() {
  const items = getCheckoutItems();
  const itemsSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const isOffice = (state.deliveryMethod || 'office') === 'office';
  const shippingFee = isOffice ? 0 : 50;
  const grandTotal = (itemsSubtotal + shippingFee).toFixed(2);

  navigator.clipboard.writeText(grandTotal).then(() => {
    showToast(`คัดลอกยอดเงิน ฿${grandTotal} เรียบร้อยแล้ว`);
  }).catch(() => {
    showToast(`ยอดเงิน: ฿${grandTotal}`);
  });
}

// ฟังก์ชันประมวลผลและสแกนตรวจจับ QR Code บนสลิปธนาคาร
function processAndScanSlip(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxWidth = 1200;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        let qrCode = null;
        if (typeof jsQR === 'function') {
          try {
            // สแกนรอบที่ 1: ภาพปกติ
            const imgData = ctx.getImageData(0, 0, width, height);
            qrCode = jsQR(imgData.data, width, height, { inversionAttempts: "dontInvert" });

            // สแกนรอบที่ 2: สลับสี (สำหรับสลิปธีมมืดหรือมีลวดลาย)
            if (!qrCode) {
              qrCode = jsQR(imgData.data, width, height, { inversionAttempts: "onlyInvert" });
            }

            // สแกนรอบที่ 3: โฟกัสเฉพาะครึ่งล่างของสลิป (จุดที่ธนาคารไทยวาง Mini QR เสมอ)
            if (!qrCode) {
              const startY = Math.floor(height * 0.35);
              const subH = height - startY;
              const subData = ctx.getImageData(0, startY, width, subH);
              qrCode = jsQR(subData.data, width, subH, { inversionAttempts: "attemptBoth" });
            }
          } catch (err) {
            console.warn('QR scan error:', err);
          }
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve({
          dataUrl: dataUrl,
          hasQr: !!qrCode,
          qrData: qrCode ? qrCode.data : null
        });
      };
      img.onerror = () => resolve({ dataUrl: null, hasQr: false });
      img.src = e.target.result;
    };
    reader.onerror = () => resolve({ dataUrl: null, hasQr: false });
    reader.readAsDataURL(file);
  });
}

async function handleSlipUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const uploadPrompt = document.getElementById('slip-upload-prompt');
  if (uploadPrompt) {
    uploadPrompt.innerHTML = `
      <div class="text-xs font-bold text-amber-700 flex items-center justify-center gap-2 py-3">
        <svg class="animate-spin h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <span>กำลังตรวจสอบ QR Code สลิปธนาคาร...</span>
      </div>
    `;
  }

  const result = await processAndScanSlip(file);
  const previewContainer = document.getElementById('slip-preview-container');
  const previewImg = document.getElementById('slip-preview-img');

  if (result.hasQr && result.dataUrl) {
    // กรณีผ่าน: ตรวจพบ QR Code ของสลิปธนาคาร
    state.slipDataUrl = result.dataUrl;
    state.slipQrValid = true;
    state.slipQrData = result.qrData;

    if (previewImg) previewImg.src = result.dataUrl;
    if (previewContainer) {
      previewContainer.className = "relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-emerald-50/40 p-2.5 shadow-sm";
      previewContainer.innerHTML = `
        <img id="slip-preview-img" src="${result.dataUrl}" alt="สลิปโอนเงิน" class="max-h-52 mx-auto rounded-xl object-contain border border-emerald-200 shadow-sm">
        <div class="mt-2.5 p-2 bg-emerald-100/70 rounded-xl flex items-center justify-between border border-emerald-300">
          <div class="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
            <span>✅</span> ตรวจพบสลิปธนาคารเรียบร้อย (มี QR ตรวจสอบ)
          </div>
          <button type="button" onclick="removeSlip()" class="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer">เปลี่ยนรูป</button>
        </div>
      `;
      previewContainer.classList.remove('hidden');
    }
    if (uploadPrompt) uploadPrompt.classList.add('hidden');
  } else {
    // กรณีไม่ผ่าน: แนบรูปอื่นที่ไม่ใช่สลิป หรือตรวจไม่พบ QR Code
    state.slipDataUrl = null;
    state.slipQrValid = false;

    if (previewContainer) {
      previewContainer.className = "relative rounded-2xl overflow-hidden border-2 border-rose-400 bg-rose-50/50 p-3 shadow-sm";
      previewContainer.innerHTML = `
        <div class="text-center py-2">
          <div class="text-3xl mb-1">❌</div>
          <div class="text-xs font-extrabold text-rose-800">รูปภาพนี้ไม่ใช่สลิปโอนเงินธนาคาร</div>
          <p class="text-[11px] text-rose-600 mt-1 leading-relaxed max-w-xs mx-auto">
            ระบบตรวจไม่พบ QR Code บนภาพสลิป กรุณาแนบรูปภาพสลิปที่บันทึกจากแอปธนาคารโดยตรงครับ
          </p>
          <button type="button" onclick="removeSlip()" class="mt-3 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow cursor-pointer">
            แตะเพื่อเลือกรูปสลิปใหม่
          </button>
        </div>
      `;
      previewContainer.classList.remove('hidden');
    }
    if (uploadPrompt) uploadPrompt.classList.add('hidden');
  }
}

function removeSlip() {
  state.slipDataUrl = null;
  state.slipQrValid = false;
  state.slipQrData = null;

  const previewContainer = document.getElementById('slip-preview-container');
  const uploadPrompt = document.getElementById('slip-upload-prompt');
  const fileInput = document.getElementById('slip-file-input');

  if (previewContainer) previewContainer.classList.add('hidden');
  if (uploadPrompt) {
    uploadPrompt.classList.remove('hidden');
    uploadPrompt.innerHTML = `
      <input type="file" id="slip-file-input" accept="image/*" onchange="handleSlipUpload(event)" class="absolute inset-0 opacity-0 cursor-pointer">
      <svg class="w-8 h-8 text-amber-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      <div class="text-xs font-extrabold text-amber-900">แตะเพื่อเลือกรูปภาพสลิปโอนเงิน *</div>
      <div class="text-[10px] text-gray-500 mt-0.5">รองรับรูปถ่ายหรือภาพแคปหน้าจอสลิปจากทุกธนาคาร</div>
    `;
  }
  if (fileInput) fileInput.value = '';
}

// ยืนยันคำสั่งซื้อ
function handleOrderSubmit(e) {
  if (e) e.preventDefault();

  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const addressInput = document.getElementById('customer-address');
  const noteInput = document.getElementById('customer-note');

  // ชื่อ นามสกุล ผู้รับ required อย่างเดียวพอ!
  if (!nameInput.value.trim()) {
    alert('กรุณากรอกชื่อ - นามสกุล ผู้รับ');
    nameInput.focus();
    return;
  }

  // บังคับแนบสลิปการโอนเงิน 100% ป้องกันออเดอร์หลุด/กดเล่น
  if (!state.slipDataUrl || !state.slipQrValid) {
    alert('⚠️ กรุณาแนบสลิปหลักฐานการโอนเงินที่ถูกต้องก่อนยืนยันคำสั่งซื้อครับ\n(ระบบต้องสามารถตรวจพบ QR Code บนสลิปธนาคารได้ครับ)');
    const slipSection = document.getElementById('slip-upload-section');
    if (slipSection) slipSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const isOffice = (state.deliveryMethod || 'office') === 'office';

  // หากเลือกจัดส่งทางอื่น ๆ จึงจะบังคับกรอกเบอร์โทรและที่อยู่
  if (!isOffice) {
    if (!phoneInput.value.trim()) {
      alert('กรุณากรอกเบอร์โทรศัพท์ติดต่อสำหรับการจัดส่ง');
      phoneInput.focus();
      return;
    }
    if (!addressInput.value.trim()) {
      alert('กรุณากรอกที่อยู่จัดส่งโดยละเอียด');
      addressInput.focus();
      return;
    }
  }

  const items = getCheckoutItems();
  const totalBags = items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const shippingFee = isOffice ? 0 : 50;
  const grandTotal = itemsSubtotal + shippingFee;

  const orderId = 'BT-' + Math.floor(1000 + Math.random() * 9000);

  // อัปเดตแถบภารกิจตามจำนวนถุงที่สั่งซื้อจริง
  state.missionBags = Math.min(SHOP_CONFIG.missionTargetBags, state.missionBags + totalBags);
  saveState();
  updateMissionBar();

  // สร้างข้อความสรุปเพื่อส่งเข้า LINE Official @448gijej
  const orderItemsText = items.map(i => `- ${i.sizeLabel} (${i.flavorName}) x ${i.quantity} ถุง (${i.unitPrice * i.quantity} บ.)`).join('\n');
  const slipNote = state.slipDataUrl ? '(แนบสลิปโอนเงินผ่านระบบแล้ว)' : '(รบกวนส่งสลิปโอนเงินในแชทนี้)';
  const deliveryLabel = isOffice ? '🏢 จัดส่งที่ออฟฟิศ (ส่งฟรี)' : '🚚 จัดส่งทางอื่น ๆ (เหมา 50 บ.)';

  let customerDetailsText = `ชื่อ: ${nameInput.value.trim()}\nรูปแบบ: ${deliveryLabel}\n`;
  if (phoneInput && phoneInput.value.trim()) customerDetailsText += `เบอร์โทร: ${phoneInput.value.trim()}\n`;
  if (addressInput && addressInput.value.trim()) customerDetailsText += `ที่อยู่: ${addressInput.value.trim()}\n`;
  if (noteInput && noteInput.value.trim()) customerDetailsText += `หมายเหตุ: ${noteInput.value.trim()}\n`;

  // คำนวณแต้มสะสมสำหรับออเดอร์นี้ (ถุงเล็ก = 1 แต้ม, ถุงใหญ่ = 3 แต้ม)
  const smallBagPoints = (SHOP_CONFIG.loyaltyConfig && SHOP_CONFIG.loyaltyConfig.smallBagPoints) || 1;
  const largeBagPoints = (SHOP_CONFIG.loyaltyConfig && SHOP_CONFIG.loyaltyConfig.largeBagPoints) || 3;

  let earnedPoints = 0;
  items.forEach(item => {
    if (item.productId === 'small-bag') {
      earnedPoints += item.quantity * smallBagPoints;
    } else {
      earnedPoints += item.quantity * largeBagPoints;
    }
  });

  const lKey = getLoyaltyKey(nameInput.value.trim(), phoneInput ? phoneInput.value.trim() : '');
  const prevLoyalty = getCustomerLoyalty(lKey);
  const prevPoints = prevLoyalty.currentPoints || 0;
  const newPoints = Math.min(30, prevPoints + earnedPoints);

  let loyaltyNotice = '';
  if (newPoints >= 30) {
    loyaltyNotice = ' 👑 สะสมครบ 30 แต้ม แลกรับฟรีถุงใหญ่!';
  } else if (newPoints >= 10) {
    loyaltyNotice = ` 🎁 สะสมครบ 10 แต้ม แลกรับฟรีถุงเล็กได้แล้ว (หรือสะสมต่ออีก ${30 - newPoints} แต้มเพื่อแลกถุงใหญ่)`;
  } else {
    loyaltyNotice = ` (ขาดอีก ${10 - newPoints} แต้ม แลกฟรีถุงเล็ก)`;
  }

  const stampsInfoText = `🎫 แต้มสะสม: ${newPoints}/30 แต้ม (+${earnedPoints} แต้มจากออเดอร์นี้)${loyaltyNotice}\n`;

  const lineMessage = `🍌 ยืนยันคำสั่งซื้อ กล้วยเบรคแตก [ออเดอร์ #${orderId}] 🍌\n\n` +
    `👤 ข้อมูลผู้สั่งซื้อ:\n${customerDetailsText}` +
    `${stampsInfoText}\n` +
    `📦 รายการสินค้า:\n${orderItemsText}\n\n` +
    `รวมค่าสินค้า: ฿${itemsSubtotal}\n` +
    `ค่าจัดส่ง: ${isOffice ? 'ฟรี! (ส่งที่ออฟฟิศ)' : '฿50'}\n` +
    `💰 ยอดโอนสุทธิ: ฿${grandTotal}\n` +
    `สถานะ: ${slipNote}\n\n` +
    `ขอบคุณที่อุดหนุนโดมเบรคแตกครับ!`;

  state.currentOrder = {
    orderId,
    customerName: nameInput.value.trim(),
    phone: (phoneInput && phoneInput.value.trim()) || (isOffice ? 'จัดส่งที่ออฟฟิศ' : '-'),
    address: isOffice ? 'จัดส่งที่ออฟฟิศ' : ((addressInput && addressInput.value.trim()) || '-'),
    totalBags,
    earnedPoints,
    grandTotal,
    lineMessage
  };

  try {
    localStorage.setItem('dbt_last_customer', JSON.stringify({
      name: nameInput.value.trim(),
      phone: (phoneInput && phoneInput.value.trim()) || '',
      address: (addressInput && addressInput.value.trim()) || ''
    }));
  } catch (e) {}

  // คำนวณสรุปแยกขนาดถุงและรสชาติสำหรับลง Google Sheet
  const breakdown = {
    small_original: 0,
    small_sweet: 0,
    small_salty: 0,
    small_paprika: 0,
    small_total: 0,
    large_original: 0,
    large_sweet: 0,
    large_salty: 0,
    large_paprika: 0,
    large_total: 0,
    grand_total: 0
  };

  items.forEach(item => {
    const isSmall = item.productId === 'small-bag';
    const prefix = isSmall ? 'small_' : 'large_';
    const key = prefix + item.flavorId;
    if (breakdown[key] !== undefined) {
      breakdown[key] += item.quantity;
    }
    if (isSmall) {
      breakdown.small_total += item.quantity;
    } else {
      breakdown.large_total += item.quantity;
    }
    breakdown.grand_total += item.quantity;
  });

  // ส่งข้อมูลออเดอร์ลง Google Sheet อัตโนมัติ (เบื้องหลัง)
  if (SHOP_CONFIG.googleSheetWebAppUrl) {
    const orderPayload = {
      orderId: orderId,
      customerName: nameInput.value.trim(),
      deliveryMethod: state.deliveryMethod || 'office',
      phone: (phoneInput && phoneInput.value.trim()) || '-',
      address: isOffice ? 'จัดส่งที่ออฟฟิศ' : ((addressInput && addressInput.value.trim()) || '-'),
      itemsSummary: items.map(i => `${i.sizeLabel} (${i.flavorName}) x${i.quantity}`).join(', '),
      breakdown: breakdown,
      totalBags: totalBags,
      earnedPoints: earnedPoints,
      customerLoyaltyKey: lKey,
      currentPoints: newPoints,
      grandTotal: grandTotal,
      note: (noteInput && noteInput.value.trim()) || '-',
      slipBase64: state.slipDataUrl // แนบสลิปเพื่อบันทึกลง Google Drive และส่งเข้า LINE
    };

    fetch(SHOP_CONFIG.googleSheetWebAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(orderPayload)
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.status === 'success') {
        if (data.currentBags !== undefined) {
          state.missionBags = Number(data.currentBags);
        }
        if (data.roundLabel) {
          state.roundLabel = data.roundLabel;
        }
        saveState();
        updateMissionBar();
      }
    })
    .catch(err => {
      console.log('Order sync to Google Sheet error:', err);
    });
  }

  const wasDirectBuy = state.isDirectBuy;
  triggerConfetti();
  closeCheckoutModal();

  // หากสั่งซื้อผ่านตะกร้า ให้เคลียร์สินค้าในตะกร้า
  // หากสั่งซื้อผ่าน "ซื้อทันที" ตะกร้าเดิมยังคงอยู่ตามปกติ
  if (!wasDirectBuy) {
    state.cart = [];
    saveState();
    updateCartBadge();
  }
  state.checkoutItems = [];
  state.isDirectBuy = false;

  openOrderSuccessModal();
}

function openOrderSuccessModal() {
  const modal = document.getElementById('order-success-modal');
  if (!modal) return;

  const order = state.currentOrder;
  if (order) {
    document.getElementById('success-order-id').textContent = '#' + order.orderId;
    document.getElementById('success-customer-name').textContent = order.customerName;
    document.getElementById('success-phone').textContent = order.phone;
    document.getElementById('success-grand-total').textContent = '฿' + order.grandTotal;

    // อัปเดตและแสดงแอนิเมชันปั๊มตราบัตรสะสมแต้ม E-Stamp (30 แต้ม, ถุงเล็ก=1, ถุงใหญ่=3)
    updateSuccessStampCard(order, order.earnedPoints || 1);
  }

  modal.classList.remove('hidden');
}

function closeOrderSuccessModal() {
  const modal = document.getElementById('order-success-modal');
  if (modal) modal.classList.add('hidden');
}

// ==========================================
// 🎫 ระบบบัตรสะสมแต้ม E-Stamp (Loyalty Card)
// กติกา: ถุงเล็ก = 1 แต้ม, ถุงใหญ่ = 3 แต้ม
// สะสม 10 แต้ม = ฟรีถุงเล็ก 1 ถุง
// สะสม 30 แต้ม = ฟรีถุงใหญ่ 1 ถุง
// หากใช้แต้มก่อน แต้มจะเคลียร์เป็น 0 เพื่อเริ่มรอบใหม่
// ==========================================

function getLoyaltyKey(name, phone) {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone && cleanPhone.length >= 9) {
    return 'p_' + cleanPhone;
  }
  const cleanName = (name || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!cleanName || cleanName === 'guest') return 'n_guest';

  // ตรวจสอบว่าเคยมีบันทึกของชื่อนี้ในระบบมาก่อนหรือไม่ (เพื่อให้นับยอดสะสมต่อได้ทันที)
  const all = getAllLoyaltyData();
  for (const [k, v] of Object.entries(all)) {
    const existingName = (v.customerName || '').trim().toLowerCase().replace(/\s+/g, '');
    if (existingName && existingName === cleanName) {
      return k; // เชื่อมโยงกับบัตรเดิมของลูกค้ารายนี้ทันที
    }
  }

  return 'n_' + cleanName;
}

function getAllLoyaltyData() {
  try {
    return JSON.parse(localStorage.getItem('dbt_loyalty_data') || '{}');
  } catch (e) {
    return {};
  }
}

function getCustomerLoyalty(key) {
  const all = getAllLoyaltyData();
  const rec = all[key] || {};
  return {
    customerName: rec.customerName || '',
    phone: rec.phone || '',
    currentPoints: rec.currentPoints ?? rec.currentStamps ?? 0,
    totalPointsLifetime: rec.totalPointsLifetime ?? rec.totalBagsLifetime ?? 0,
    totalRewardsEarned: rec.totalRewardsEarned || 0,
    history: rec.history || []
  };
}

function saveCustomerLoyalty(key, data) {
  try {
    const all = getAllLoyaltyData();
    all[key] = data;
    localStorage.setItem('dbt_loyalty_data', JSON.stringify(all));
    localStorage.setItem('dbt_active_loyalty_key', key);
  } catch (e) {}
}

// เรนเดอร์ช่องตราสแตมป์ 30 ช่อง (Grid 10x3) พร้อมอนิเมชันปั๊มตราทีละดวง
function renderStampGrid(containerEl, currentPoints, newlyAdded = 0) {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  const stampsBefore = Math.max(0, currentPoints - newlyAdded);

  for (let i = 1; i <= 30; i++) {
    const isStamped = i <= currentPoints;
    const isNewlyStamped = isStamped && i > stampsBefore;
    const isSlot10 = (i === 10);
    const isSlot30 = (i === 30);

    const slot = document.createElement('div');
    slot.className = `relative aspect-square rounded-lg sm:rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
      isStamped
        ? (isSlot30
            ? 'bg-gradient-to-br from-amber-300 via-orange-400 to-amber-600 text-amber-950 shadow-md ring-2 ring-yellow-100 font-extrabold animate-pulse-glow'
            : (isSlot10
                ? 'bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-500 text-amber-950 shadow-md ring-2 ring-yellow-200 font-extrabold animate-pulse-glow'
                : 'bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-500 text-amber-950 shadow-sm ring-1 ring-yellow-200 font-black'
              )
          )
        : (isSlot30
            ? 'border-2 border-dashed border-amber-300 bg-amber-400/25 text-amber-100 ring-1 ring-amber-300/40'
            : (isSlot10
                ? 'border-2 border-dashed border-yellow-300/80 bg-yellow-400/20 text-yellow-100 ring-1 ring-yellow-300/30'
                : 'border border-dashed border-white/40 bg-white/10 text-white/60'
              )
          )
    }`;

    // แต้มใหม่ที่เพิ่งได้ ให้เล่นแอนิเมชันปั๊มตราตามลำดับ
    if (isNewlyStamped) {
      const delayMs = (i - stampsBefore - 1) * 120;
      slot.style.animationDelay = `${delayMs}ms`;
      slot.classList.add('animate-stamp-in');
    }

    if (isStamped) {
      if (isSlot30) {
        slot.innerHTML = `
          <span class="text-xs sm:text-sm leading-none animate-bounce-slow">👑</span>
          <span class="text-[7px] font-black uppercase leading-none mt-0.5 text-amber-950">30🎁</span>
        `;
      } else if (isSlot10) {
        slot.innerHTML = `
          <span class="text-xs sm:text-sm leading-none animate-bounce-slow">🎁</span>
          <span class="text-[7px] font-black uppercase leading-none mt-0.5 text-amber-950">10⭐</span>
        `;
      } else {
        slot.innerHTML = `
          <span class="text-xs sm:text-sm leading-none">🍌</span>
          <span class="text-[7px] sm:text-[8px] font-black leading-none mt-0.5">${i}</span>
        `;
      }
    } else {
      if (isSlot30) {
        slot.innerHTML = `
          <span class="text-[11px] opacity-80 leading-none">👑</span>
          <span class="text-[7px] font-bold text-amber-100 leading-none mt-0.5">30</span>
        `;
      } else if (isSlot10) {
        slot.innerHTML = `
          <span class="text-[11px] opacity-70 leading-none">🎁</span>
          <span class="text-[7px] font-bold text-yellow-200 leading-none mt-0.5">10</span>
        `;
      } else {
        slot.innerHTML = `
          <span class="text-[8px] sm:text-[9px] font-bold opacity-70 leading-none">${i}</span>
        `;
      }
    }

    containerEl.appendChild(slot);
  }
}

// อัปเดตบัตรสะสมแต้มในหน้า Order Success
function updateSuccessStampCard(order, addedPoints = 0) {
  const key = getLoyaltyKey(order.customerName, order.phone);
  const prevRecord = getCustomerLoyalty(key);

  const prevPoints = prevRecord.currentPoints || 0;
  let newPoints = prevPoints;
  if (addedPoints > 0) {
    newPoints = Math.min(30, prevPoints + addedPoints);
    const updatedRecord = {
      ...prevRecord,
      customerName: order.customerName,
      phone: order.phone,
      currentPoints: newPoints,
      totalPointsLifetime: (prevRecord.totalPointsLifetime || 0) + addedPoints
    };
    saveCustomerLoyalty(key, updatedRecord);
  }

  // อัปเดต UI บนการ์ด
  const customerBadge = document.getElementById('stamp-customer-badge');
  const progressBar = document.getElementById('stamp-progress-bar-fill');
  const statusText = document.getElementById('stamp-status-text');
  const rewardBadge = document.getElementById('stamp-reward-badge');
  const actionsContainer = document.getElementById('stamp-actions-container');
  const gridContainer = document.getElementById('stamp-grid-container');

  if (customerBadge) customerBadge.textContent = order.customerName || 'ลูกค้า';

  // แถบความคืบหน้า (0-100%)
  const percent = Math.min(100, Math.round((newPoints / 30) * 100));
  if (progressBar) progressBar.style.width = `${percent}%`;

  if (statusText) {
    statusText.textContent = `สะสมแล้ว ${newPoints}/30 แต้ม` + (addedPoints > 0 ? ` (+${addedPoints} แต้มรอบนี้)` : '');
  }

  if (rewardBadge) {
    if (newPoints >= 30) {
      rewardBadge.innerHTML = '👑 <span class="underline">ครบ 30 แต้ม แลกถุงใหญ่ได้เลย!</span>';
    } else if (newPoints >= 10) {
      rewardBadge.innerHTML = '🎁 <span class="underline">ครบ 10 แต้ม แลกถุงเล็กได้แล้ว!</span>';
    } else {
      rewardBadge.textContent = `ขาดอีก ${10 - newPoints} แต้ม แลกฟรีถุงเล็ก`;
    }
  }

  // เรนเดอร์ปุ่มแลกรางวัลตามเงื่อนไข
  if (actionsContainer) {
    if (newPoints >= 30) {
      actionsContainer.innerHTML = `
        <div class="space-y-1.5">
          <button type="button" onclick="redeemLoyaltyReward('${key}', 2)" class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 text-amber-950 font-extrabold text-xs shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-yellow-200 animate-pulse-glow cursor-pointer">
            <span>👑 แลกรับฟรี "ถุงใหญ่ 1 ถุง" (แต้มจะเคลียร์เป็น 0)</span>
          </button>
          <button type="button" onclick="redeemLoyaltyReward('${key}', 1)" class="w-full py-1.5 px-3 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] transition-all text-center cursor-pointer">
            หรือเลือกแลก "ถุงเล็ก 1 ถุง" (แต้มจะเคลียร์เป็น 0)
          </button>
        </div>
      `;
    } else if (newPoints >= 10) {
      actionsContainer.innerHTML = `
        <div class="space-y-1.5">
          <button type="button" onclick="redeemLoyaltyReward('${key}', 1)" class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-yellow-300 to-amber-400 text-amber-950 font-extrabold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-yellow-200 cursor-pointer">
            <span>🎁 ใช้ 10 แต้ม แลกฟรี "ถุงเล็ก 1 ถุง" (แต้มจะเคลียร์เป็น 0)</span>
          </button>
          <div class="text-[10px] text-amber-100 text-center font-medium bg-black/20 py-1 px-2 rounded-lg">
            ✨ หรือสะสมต่ออีก <strong class="text-yellow-200">${30 - newPoints} แต้ม</strong> เพื่อแลก <strong class="text-yellow-200">ฟรีถุงใหญ่</strong>!
          </div>
        </div>
      `;
    } else {
      actionsContainer.innerHTML = `
        <div class="text-[10px] sm:text-[11px] text-amber-100 bg-black/15 py-1.5 px-2.5 rounded-xl text-center">
          🍌 สั่งถุงเล็ก = 1 แต้ม • ถุงใหญ่ = 3 แต้ม (ครบ 10 แต้มแลกถุงเล็ก / ครบ 30 แต้มแลกถุงใหญ่)
        </div>
      `;
    }
  }

  // เรนเดอร์ 30 ช่องพร้อมแอนิเมชันปั๊มตรา
  renderStampGrid(gridContainer, newPoints, addedPoints);

  if ((newPoints >= 10 || newPoints >= 30) && addedPoints > 0) {
    setTimeout(() => triggerConfetti(), 800);
  }
}

// ใช้แต้มแลกของรางวัล (เงื่อนไข: เมื่อใช้สิทธิ์แล้ว แต้มจะถูกเคลียร์เป็น 0 ทันทีเพื่อเริ่มรอบใหม่)
function redeemLoyaltyReward(key, tier) {
  const record = getCustomerLoyalty(key);
  const currentPoints = record.currentPoints || 0;

  if (tier === 1 && currentPoints < 10) {
    showToast('แต้มสะสมยังไม่ถึง 10 แต้มครับ');
    return;
  }
  if (tier === 2 && currentPoints < 30) {
    showToast('แต้มสะสมยังไม่ถึง 30 แต้มครับ');
    return;
  }

  const rewardTitle = (tier === 2) 
    ? (SHOP_CONFIG.loyaltyConfig?.tier2Reward || 'ฟรีกล้วยเบรคแตกถุงใหญ่ 1 ถุง') 
    : (SHOP_CONFIG.loyaltyConfig?.tier1Reward || 'ฟรีกล้วยเบรคแตกถุงเล็ก 1 ถุง');

  const confirmMsg = `🎁 ยืนยันการใช้สิทธิ์แลก "${rewardTitle}" ใช่หรือไม่?\n\n` +
    `⚠️ สำคัญ: เมื่อกดยืนยันแล้ว แต้มสะสมทั้งหมด (${currentPoints} แต้ม) จะถูกเคลียร์เป็น 0 ทันที เพื่อเริ่มสะสมรอบใหม่`;

  if (!confirm(confirmMsg)) return;

  const pointsSpent = currentPoints;
  record.currentPoints = 0; // เคลียร์เป็น 0 ทันทีตามเงื่อนไขที่ผู้ใช้สั่ง!
  record.totalRewardsEarned = (record.totalRewardsEarned || 0) + 1;
  record.lastRedeemed = {
    date: new Date().toLocaleString('th-TH'),
    tier,
    rewardTitle,
    pointsSpent
  };
  saveCustomerLoyalty(key, record);

  // ส่งบันทึกการใช้สิทธิ์แลกของรางวัลลง Google Sheet
  if (SHOP_CONFIG.googleSheetWebAppUrl) {
    fetch(SHOP_CONFIG.googleSheetWebAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'redeem_loyalty',
        customerKey: key,
        customerName: record.customerName || 'ลูกค้า',
        phone: record.phone || '-',
        tier: tier,
        rewardTitle: rewardTitle,
        pointsSpent: pointsSpent
      })
    }).catch(err => console.log('Loyalty redemption sync error:', err));
  }

  triggerConfetti();
  showToast(`🎉 แลกรับ ${rewardTitle} สำเร็จ! แต้มถูกเคลียร์เป็น 0 เพื่อเริ่มสะสมรอบใหม่`);

  // อัปเดต UI หน้าที่เปิดอยู่
  const successModal = document.getElementById('order-success-modal');
  if (successModal && !successModal.classList.contains('hidden')) {
    updateSuccessStampCard({ customerName: record.customerName, phone: record.phone }, 0);
  }

  const loyaltyModal = document.getElementById('loyalty-modal');
  if (loyaltyModal && !loyaltyModal.classList.contains('hidden')) {
    renderStandaloneCard(record, key);
  }

  // สร้างข้อความแจ้งใช้สิทธิ์ส่งเข้า LINE Official @448gijej
  const claimLineMessage = `🎉 ขอใช้สิทธิ์แลกของรางวัลบัตรสะสมแต้ม โดมเบรคแตก 🎉\n\n` +
    `👤 ลูกค้า: ${record.customerName || 'ลูกค้า'}\n` +
    `📞 เบอร์โทร: ${record.phone || '-'}\n` +
    `🎁 รางวัลที่แลก: ${rewardTitle}\n` +
    `🎫 แต้มที่ใช้: ${pointsSpent} แต้ม\n` +
    `🔄 สถานะแต้มปัจจุบัน: เคลียร์เป็น 0 แต้ม (เริ่มสะสมรอบใหม่)\n\n` +
    `ขอรับสิทธิ์พร้อมคำสั่งซื้อ/รับหน้าร้านนะครับ/ค่ะ ขอบคุณครับ!`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(claimLineMessage).catch(() => {});
  }

  setTimeout(() => {
    const askOpenLine = confirm(
      `🎉 แลกสิทธิ์สำเร็จเรียบร้อยครับ!\n\nระบบได้คัดลอกข้อความแจ้งสิทธิ์ให้แล้ว คุณต้องการเปิด LINE Official (@448gijej) เพื่อส่งแจ้งให้ทางร้านทราบทันทีหรือไม่?`
    );
    if (askOpenLine) {
      window.open(SHOP_CONFIG.lineUrl, '_blank');
    }
  }, 400);
}

// เปิดโมดอลตรวจสอบบัตรสะสมแต้ม (เปิดดูได้ตลอดเวลา)
function openLoyaltyModal() {
  const modal = document.getElementById('loyalty-modal');
  if (!modal) return;

  const activeKey = localStorage.getItem('dbt_active_loyalty_key');
  const searchInput = document.getElementById('loyalty-search-input');
  
  if (activeKey) {
    const record = getCustomerLoyalty(activeKey);
    if (searchInput) {
      searchInput.value = (record.phone && record.phone !== '-' && record.phone !== 'จัดส่งที่ออฟฟิศ') 
        ? record.phone 
        : (record.customerName || '');
    }
    renderStandaloneCard(record, activeKey);
  } else {
    renderStandaloneCard(null, '');
  }

  modal.classList.remove('hidden');
}

function closeLoyaltyModal() {
  const modal = document.getElementById('loyalty-modal');
  if (modal) modal.classList.add('hidden');
}

function handleLoyaltySearch() {
  const searchInput = document.getElementById('loyalty-search-input');
  const query = searchInput ? searchInput.value.trim() : '';

  if (!query) {
    showToast('กรุณากรอกเบอร์โทรหรือชื่อผู้รับ');
    return;
  }

  const all = getAllLoyaltyData();
  let matchedRecord = null;
  let matchedKey = '';
  const cleanQ = query.toLowerCase().replace(/\D/g, '');

  for (const [k, v] of Object.entries(all)) {
    const cleanPhone = (v.phone || '').replace(/\D/g, '');
    const cleanName = (v.customerName || '').trim().toLowerCase();

    if ((cleanQ && cleanPhone && cleanPhone.includes(cleanQ)) || (cleanName && cleanName.includes(query.toLowerCase()))) {
      matchedRecord = v;
      matchedKey = k;
      localStorage.setItem('dbt_active_loyalty_key', k);
      break;
    }
  }

  // หากพบในเครื่อง ให้แสดงผลทันทีก่อน
  if (matchedRecord) {
    renderStandaloneCard(matchedRecord, matchedKey);
    showToast(`พบข้อมูลบัตรสะสมแต้มของคุณ "${matchedRecord.customerName}"`);
  } else {
    // แสดง loading ขณะกำลังค้นหาจาก Google Sheet
    const container = document.getElementById('standalone-stamp-card-container');
    if (container) {
      container.innerHTML = `
        <div class="p-6 bg-amber-50 rounded-3xl border border-amber-200 text-center text-amber-900 text-xs animate-pulse">
          🔍 กำลังค้นหาข้อมูลแต้มสะสมจากฐานข้อมูล Google Sheet...
        </div>
      `;
    }
  }

  // ดึงข้อมูลอัปเดตล่าสุดจาก Google Sheet แบบ Real-time (ช่วยให้เห็นแต้มที่เจ้าของร้านเพิ่มในชีทได้ทันที)
  if (SHOP_CONFIG.googleSheetWebAppUrl) {
    fetch(`${SHOP_CONFIG.googleSheetWebAppUrl}?action=get_loyalty&query=${encodeURIComponent(query)}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.status === 'success' && data.found) {
          const key = data.customerKey || getLoyaltyKey(data.customerName, data.phone);
          const sheetRecord = {
            customerName: data.customerName,
            phone: data.phone || data.customerKey,
            currentPoints: Number(data.currentPoints) || 0,
            totalPointsLifetime: Number(data.lifetimePoints) || Number(data.currentPoints) || 0,
            totalRewardsEarned: Number(data.totalRewardsEarned) || 0,
            history: []
          };
          saveCustomerLoyalty(key, sheetRecord);
          renderStandaloneCard(sheetRecord, key);
          showToast(`ซิงค์แต้มของคุณ "${data.customerName}" สำเร็จ (${sheetRecord.currentPoints} แต้ม)`);
        } else if (!matchedRecord) {
          const newKey = getLoyaltyKey(query, query);
          const newRecord = {
            customerName: query,
            phone: query,
            currentPoints: 0,
            totalPointsLifetime: 0,
            totalRewardsEarned: 0
          };
          renderStandaloneCard(newRecord, newKey);
          showToast(`ยังไม่พบประวัติสะสมแต้ม สั่งซื้อเพื่อเริ่มสะสมแต้มได้เลยครับ!`);
        }
      })
      .catch(err => {
        console.log('Loyalty fetch error:', err);
        if (!matchedRecord) {
          const newKey = getLoyaltyKey(query, query);
          const newRecord = {
            customerName: query,
            phone: query,
            currentPoints: 0,
            totalPointsLifetime: 0,
            totalRewardsEarned: 0
          };
          renderStandaloneCard(newRecord, newKey);
        }
      });
  } else if (!matchedRecord) {
    const newKey = getLoyaltyKey(query, query);
    const newRecord = {
      customerName: query,
      phone: query,
      currentPoints: 0,
      totalPointsLifetime: 0,
      totalRewardsEarned: 0
    };
    renderStandaloneCard(newRecord, newKey);
    showToast(`ยังไม่พบประวัติสะสมแต้ม สั่งซื้อเพื่อเริ่มสะสมแต้มได้เลยครับ!`);
  }
}

function renderStandaloneCard(record, key) {
  const container = document.getElementById('standalone-stamp-card-container');
  if (!container) return;

  const currentPoints = record ? (record.currentPoints || 0) : 0;
  const customerName = record ? (record.customerName || record.phone || 'สมาชิก') : 'ยังไม่มีแต้ม';
  const effectiveKey = key || (record ? getLoyaltyKey(record.customerName, record.phone) : '');
  const percent = Math.min(100, Math.round((currentPoints / 30) * 100));

  let rewardStatusHtml = '';
  if (currentPoints >= 30) {
    rewardStatusHtml = `
      <div class="space-y-1.5 mt-2">
        <button type="button" onclick="redeemLoyaltyReward('${effectiveKey}', 2)" class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 text-amber-950 font-extrabold text-xs shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-yellow-200 animate-pulse-glow cursor-pointer">
          <span>👑 แลกรับฟรีกล้วยเบรคแตก "ถุงใหญ่ 1 ถุง" (แต้มจะเคลียร์เป็น 0)</span>
        </button>
        <button type="button" onclick="redeemLoyaltyReward('${effectiveKey}', 1)" class="w-full py-1.5 px-3 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] transition-all text-center cursor-pointer">
          หรือเลือกแลก "ถุงเล็ก 1 ถุง" (แต้มจะเคลียร์เป็น 0)
        </button>
      </div>
    `;
  } else if (currentPoints >= 10) {
    rewardStatusHtml = `
      <div class="space-y-1.5 mt-2">
        <button type="button" onclick="redeemLoyaltyReward('${effectiveKey}', 1)" class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-yellow-300 to-amber-400 text-amber-950 font-extrabold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-yellow-200 cursor-pointer">
          <span>🎁 ใช้ 10 แต้ม แลกฟรี "ถุงเล็ก 1 ถุง" (แต้มจะเคลียร์เป็น 0)</span>
        </button>
        <div class="text-[10px] text-amber-100 text-center font-medium bg-black/20 py-1 px-2 rounded-lg">
          ✨ หรือสะสมต่ออีก <strong class="text-yellow-200">${30 - currentPoints} แต้ม</strong> เพื่อแลก <strong class="text-yellow-200">ฟรีถุงใหญ่</strong>!
        </div>
      </div>
    `;
  } else {
    rewardStatusHtml = `
      <div class="text-[10px] sm:text-[11px] text-amber-100 bg-black/15 py-1.5 px-2.5 rounded-xl text-center mt-2">
        🍌 สั่งถุงเล็ก = 1 แต้ม • ถุงใหญ่ = 3 แต้ม (ขาดอีก ${10 - currentPoints} แต้ม แลกฟรีถุงเล็ก)
      </div>
    `;
  }

  container.innerHTML = `
    <div class="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white shadow-xl text-left relative overflow-hidden border border-amber-300">
      <div class="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
      <div class="absolute -left-6 -top-6 w-24 h-24 bg-yellow-300/20 rounded-full blur-lg pointer-events-none"></div>

      <div class="relative z-10">
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-2">
            <span class="text-2xl animate-bounce-slow">🎫</span>
            <div>
              <h4 class="font-extrabold text-sm sm:text-base leading-tight text-white">บัตรสะสมแต้ม โดมเบรคแตก</h4>
              <p class="text-[10px] text-amber-100 font-medium">ถุงเล็ก = 1 แต้ม • ถุงใหญ่ = 3 แต้ม</p>
            </div>
          </div>
          <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-black/20 backdrop-blur-sm border border-white/20 text-yellow-200 max-w-[120px] truncate">
            ${customerName}
          </span>
        </div>

        <!-- แถบความคืบหน้ารางวัล 2 ขั้น (10 แต้ม & 30 แต้ม) -->
        <div class="bg-black/20 backdrop-blur-sm p-2 rounded-2xl border border-white/20 my-2.5 text-xs">
          <div class="flex justify-between items-center text-[10px] sm:text-[11px] font-bold mb-1">
            <span class="text-yellow-200 flex items-center gap-1">🎯 10 แต้ม: ฟรีถุงเล็ก</span>
            <span class="text-amber-200 flex items-center gap-1">👑 30 แต้ม: ฟรีถุงใหญ่</span>
          </div>
          <div class="w-full bg-white/20 rounded-full h-2 overflow-hidden shadow-inner">
            <div class="bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-400 h-full rounded-full transition-all duration-700" style="width: ${percent}%;"></div>
          </div>
        </div>

        <!-- ช่องสแตมป์ 30 ช่อง (Grid 10x3) -->
        <div id="standalone-stamp-grid" class="grid grid-cols-10 gap-1 my-3">
          <!-- Rendered by JS -->
        </div>

        <!-- แถบสรุปแต้ม & ปุ่มแลกสิทธิ์ -->
        <div class="pt-2 border-t border-white/20">
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-bold text-amber-100">สะสมแล้ว ${currentPoints}/30 แต้ม</span>
            <span class="font-extrabold text-yellow-200">
              ${currentPoints >= 30 ? '👑 ครบ 30 แต้มแล้ว!' : (currentPoints >= 10 ? '🎉 ครบ 10 แต้มแล้ว!' : `ขาดอีก ${10 - currentPoints} แต้ม`)}
            </span>
          </div>
          ${rewardStatusHtml}
        </div>
      </div>
    </div>
  `;

  renderStampGrid(document.getElementById('standalone-stamp-grid'), currentPoints, 0);
}

function sendOrderToLine() {
  const order = state.currentOrder;
  if (!order) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(order.lineMessage).catch(() => {});
  }
  const lineUrl = `https://line.me/R/ti/p/@448gijej`;
  window.open(lineUrl, '_blank');
}

function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
}

function setupEventListeners() {
  const resetBtn = document.getElementById('demo-reset-mission');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.missionBags = (state.missionBags >= 10) ? 0 : state.missionBags + 2;
      saveState();
      updateMissionBar();
      if (state.missionBags >= 10) triggerConfetti();
    });
  }
}
