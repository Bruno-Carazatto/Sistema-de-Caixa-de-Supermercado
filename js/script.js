/* =========================
   Caixa de Supermercado (POS)
   - Produtos mock
   - Carrinho + LocalStorage
   - Pagamento + troco
   - Finalizar venda -> Histórico
   - Exportar CSV (carrinho e histórico)
   - Teclado numérico (quantidade/valor pago)
   - Tema claro/escuro
   ========================= */

(() => {
  "use strict";

  // ---------- STORAGE KEYS ----------
  const LS_PRODUCTS = "pos_products_v1";
  const LS_CART = "pos_cart_v1";
  const LS_HISTORY = "pos_history_v1";
  const LS_THEME = "pos_theme_v1";

  // ---------- ELEMENTS ----------
  const elProductsTbody = document.getElementById("productsTbody");
  const elProductsCount = document.getElementById("productsCount");
  const elProductSearch = document.getElementById("productSearch");
  const btnClearSearch = document.getElementById("btnClearSearch");
  const btnResetProducts = document.getElementById("btnResetProducts");

  const elCartTbody = document.getElementById("cartTbody");
  const elCartItemsCount = document.getElementById("cartItemsCount");
  const elTotalValue = document.getElementById("totalValue");
  const elChangeValue = document.getElementById("changeValue");

  const elPaymentMethod = document.getElementById("paymentMethod");
  const elPaidValue = document.getElementById("paidValue");
  const btnFocusPaid = document.getElementById("btnFocusPaid");
  const btnFinalize = document.getElementById("btnFinalize");
  const btnClearAll = document.getElementById("btnClearAll");

let alertArea = document.getElementById("alertArea");

// Fallback: se o container não existir no HTML, criamos automaticamente
if (!alertArea) {
  alertArea = document.createElement("div");
  alertArea.id = "alertArea";
  alertArea.className = "toast-area";
  alertArea.setAttribute("aria-live", "polite");
  alertArea.setAttribute("aria-atomic", "true");
  document.body.appendChild(alertArea);
}

  const btnExportCart = document.getElementById("btnExportCart");
  const btnExportHistory = document.getElementById("btnExportHistory");
  const btnClearHistory = document.getElementById("btnClearHistory");

  const historyList = document.getElementById("historyList");

  const btnTheme = document.getElementById("btnTheme");

  // Keypad
  const activeFieldLabel = document.getElementById("activeFieldLabel");
  const btnFocusQty = document.getElementById("btnFocusQty");
  const btnFocusPaid2 = document.getElementById("btnFocusPaid2");
  const btnBackspace = document.getElementById("btnBackspace");
  const btnClearKeypad = document.getElementById("btnClearKeypad");
  const keypadButtons = document.querySelectorAll(".keypad .key");

  // ---------- DATA ----------
  const defaultProducts = [
    { code: "1001", name: "Arroz 5kg", price: 27.90 },
    { code: "1002", name: "Feijão 1kg", price: 8.49 },
    { code: "1003", name: "Açúcar 1kg", price: 4.99 },
    { code: "1004", name: "Café 500g", price: 16.90 },
    { code: "1005", name: "Leite 1L", price: 5.79 },
    { code: "1006", name: "Pão de forma", price: 9.99 },
    { code: "1007", name: "Ovos (dúzia)", price: 12.50 },
    { code: "1008", name: "Macarrão 500g", price: 4.39 },
    { code: "1009", name: "Refrigerante 2L", price: 9.49 },
    { code: "1010", name: "Água 1,5L", price: 2.99 },
    { code: "1011", name: "Sabonete", price: 2.49 },
    { code: "1012", name: "Detergente", price: 2.79 },
  ];

  let products = loadJSON(LS_PRODUCTS, null);
  if (!Array.isArray(products) || products.length === 0) {
    products = structuredClone(defaultProducts);
    saveJSON(LS_PRODUCTS, products);
  }

  // Cart model: [{code, name, price, qty}]
  let cart = loadJSON(LS_CART, []);
  if (!Array.isArray(cart)) cart = [];

  // History model:
  // [{ id, dateISO, total, paid, change, method, items:[...]}]
  let history = loadJSON(LS_HISTORY, []);
  if (!Array.isArray(history)) history = [];

  // Keypad active field: "qty" or "paid"
  let keypadTarget = "qty"; // default
  let selectedCartCodeForQty = null; // which cart item qty is being edited
  // We'll set selectedCartCodeForQty when user clicks qty area.

  // ---------- INIT ----------
  initTheme();
  renderProducts();
  renderCart();
  renderHistory();
  recalcTotals();

  // ---------- EVENTS: PRODUCTS ----------
  elProductSearch.addEventListener("input", () => renderProducts());
  btnClearSearch.addEventListener("click", () => {
    elProductSearch.value = "";
    elProductSearch.focus();
    renderProducts();
  });

  btnResetProducts.addEventListener("click", () => {
    products = structuredClone(defaultProducts);
    saveJSON(LS_PRODUCTS, products);
    showAlert("Produtos resetados para o padrão ✅", "success");
    renderProducts();
  });

  // ---------- EVENTS: CART & PAYMENT ----------
  elPaidValue.addEventListener("input", () => {
    elPaidValue.value = sanitizeMoneyInput(elPaidValue.value);
    recalcTotals();
  });

  btnFocusPaid.addEventListener("click", () => focusKeypad("paid"));
  btnFocusPaid2.addEventListener("click", () => focusKeypad("paid"));

  btnFocusQty.addEventListener("click", () => focusKeypad("qty"));

  elPaymentMethod.addEventListener("change", () => recalcTotals());

  btnFinalize.addEventListener("click", finalizeSale);

  btnClearAll.addEventListener("click", () => {
    cart = [];
    saveJSON(LS_CART, cart);
    elPaidValue.value = "";
    selectedCartCodeForQty = null;
    showAlert("Caixa limpo 🧹", "info");
    renderCart();
    recalcTotals();
  });

  // Export cart
  btnExportCart.addEventListener("click", () => {
    if (cart.length === 0) {
      showAlert("Carrinho vazio. Nada para exportar.", "warning");
      return;
    }
    const rows = cart.map(i => ({
      codigo: i.code,
      produto: i.name,
      preco: moneyBR(i.price),
      quantidade: i.qty,
      subtotal: moneyBR(i.price * i.qty),
    }));
    downloadCSV(`carrinho_${stampDateTime()}.csv`, rows);
  });

  // History actions
  btnExportHistory.addEventListener("click", () => {
    if (history.length === 0) {
      showAlert("Histórico vazio. Nada para exportar.", "warning");
      return;
    }

    // Flatten sales + items
    const rows = [];
    for (const sale of history) {
      for (const item of sale.items) {
        rows.push({
          venda_id: sale.id,
          data: formatDateTimeBR(sale.dateISO),
          forma_pagamento: sale.method,
          total_venda: moneyBR(sale.total),
          valor_pago: moneyBR(sale.paid),
          troco: moneyBR(sale.change),
          item_codigo: item.code,
          item_nome: item.name,
          item_preco: moneyBR(item.price),
          item_qtd: item.qty,
          item_subtotal: moneyBR(item.price * item.qty),
        });
      }
    }
    downloadCSV(`historico_vendas_${stampDateTime()}.csv`, rows);
  });

  btnClearHistory.addEventListener("click", () => {
    if (!confirm("Tem certeza que deseja limpar o histórico de vendas?")) return;
    history = [];
    saveJSON(LS_HISTORY, history);
    showAlert("Histórico limpo 🗑️", "info");
    renderHistory();
  });

  // Theme
  btnTheme.addEventListener("click", toggleTheme);

  // ---------- EVENTS: KEYPAD ----------
  keypadButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-key");
      handleKeypad(key);
    });
  });

  btnBackspace.addEventListener("click", () => handleKeypad("backspace"));
  btnClearKeypad.addEventListener("click", () => handleKeypad("clear"));

  // ---------- RENDER: PRODUCTS ----------
  function renderProducts() {
    const q = (elProductSearch.value || "").trim().toLowerCase();
    const filtered = products.filter(p => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q)
      );
    });

    elProductsCount.textContent = String(filtered.length);

    elProductsTbody.innerHTML = filtered.map(p => `
      <tr>
        <td class="mono">${escapeHTML(p.code)}</td>
        <td>${escapeHTML(p.name)}</td>
        <td class="text-end mono">R$ ${moneyBR(p.price)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-primary" data-add="${escapeAttr(p.code)}" type="button">
            ➕ Adicionar
          </button>
        </td>
      </tr>
    `).join("");

    // bind add buttons
    elProductsTbody.querySelectorAll("[data-add]").forEach(btn => {
      btn.addEventListener("click", () => {
        const code = btn.getAttribute("data-add");
        addToCart(code);
      });
    });
  }

  // ---------- CART OPS ----------
 function addToCart(code) {
  const product = products.find(p => p.code === code);
  if (!product) return;

  const idx = cart.findIndex(i => i.code === code);

  if (idx >= 0) {
    // Se já existe, aumenta qtd e move para o topo (mais recente)
    const item = cart[idx];
    item.qty += 1;
    cart.splice(idx, 1);     // remove da posição antiga
    cart.unshift(item);      // coloca no topo
  } else {
    // Se é novo, entra direto no topo
    cart.unshift({ code: product.code, name: product.name, price: product.price, qty: 1 });
  }

  saveJSON(LS_CART, cart);
  showAlert(`Adicionado: ${product.name} ✅`, "success", 2200);

  // Seleciona sempre o item mais recente para editar QTD no teclado
  selectedCartCodeForQty = cart[0]?.code || null;

  renderCart();
  recalcTotals();
}

  function removeFromCart(code) {
    cart = cart.filter(i => i.code !== code);
    if (selectedCartCodeForQty === code) selectedCartCodeForQty = null;
    saveJSON(LS_CART, cart);
    renderCart();
    recalcTotals();
  }

  function changeQty(code, delta) {
    const item = cart.find(i => i.code === code);
    if (!item) return;

    item.qty = Math.max(1, item.qty + delta);
    saveJSON(LS_CART, cart);
    renderCart();
    recalcTotals();
  }

  function setQty(code, qty) {
    const item = cart.find(i => i.code === code);
    if (!item) return;

    const n = Number(qty);
    if (!Number.isFinite(n)) return;

    const finalQty = Math.max(1, Math.floor(n));
    item.qty = finalQty;

    saveJSON(LS_CART, cart);
    renderCart();
    recalcTotals();
  }

  // ---------- RENDER: CART ----------
  function renderCart() {
    const totalItems = cart.reduce((acc, i) => acc + i.qty, 0);
    elCartItemsCount.textContent = `${totalItems} item(s)`;

    if (cart.length === 0) {
      elCartTbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="text-center text-body-secondary py-4">
              Carrinho vazio 🧺 <br/>
              <small>Adicione produtos para começar.</small>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    elCartTbody.innerHTML = cart.map(i => {
      const isSelected = selectedCartCodeForQty === i.code;
      return `
        <tr class="${isSelected ? "table-active" : ""}">
          <td>
            <div class="fw-semibold">${escapeHTML(i.name)}</div>
            <small class="text-body-secondary mono">Código: ${escapeHTML(i.code)}</small>
          </td>
          <td class="text-center">
            <div class="qty-controls">
              <button class="btn btn-sm btn-outline-secondary" data-qtydec="${escapeAttr(i.code)}" type="button" aria-label="Diminuir">−</button>
              <button class="btn btn-sm ${isSelected ? "btn-primary" : "btn-outline-primary"} qty-value mono"
                data-qtyselect="${escapeAttr(i.code)}"
                type="button"
                title="Selecionar para digitar no teclado numérico">${i.qty}</button>
              <button class="btn btn-sm btn-outline-secondary" data-qtyinc="${escapeAttr(i.code)}" type="button" aria-label="Aumentar">+</button>
            </div>
          </td>
          <td class="text-end mono">R$ ${moneyBR(i.price)}</td>
          <td class="text-end mono">R$ ${moneyBR(i.price * i.qty)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" data-remove="${escapeAttr(i.code)}" type="button" aria-label="Remover">🗑️</button>
          </td>
        </tr>
      `;
    }).join("");

    // Bind cart buttons
    elCartTbody.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => removeFromCart(btn.getAttribute("data-remove")));
    });
    elCartTbody.querySelectorAll("[data-qtyinc]").forEach(btn => {
      btn.addEventListener("click", () => changeQty(btn.getAttribute("data-qtyinc"), +1));
    });
    elCartTbody.querySelectorAll("[data-qtydec]").forEach(btn => {
      btn.addEventListener("click", () => changeQty(btn.getAttribute("data-qtydec"), -1));
    });
    elCartTbody.querySelectorAll("[data-qtyselect]").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedCartCodeForQty = btn.getAttribute("data-qtyselect");
        focusKeypad("qty");
        renderCart();
      });
    });

    // If nothing selected yet, select first item for qty by default
    if (!selectedCartCodeForQty && cart.length > 0) {
      selectedCartCodeForQty = cart[0].code;
    }
  }

  // ---------- TOTALS ----------
  function cartTotal() {
    return cart.reduce((acc, i) => acc + (i.price * i.qty), 0);
  }

  function recalcTotals() {
    const total = cartTotal();
    elTotalValue.textContent = `R$ ${moneyBR(total)}`;

    const paid = parseMoneyBR(elPaidValue.value);
    const change = Math.max(0, paid - total);

    // For pix/cartão, troco geralmente é 0 (mas vamos manter cálculo se usuário digitar)
    elChangeValue.textContent = `R$ ${moneyBR(change)}`;
  }

  // ---------- FINALIZE SALE ----------
  function finalizeSale() {
    clearAlert();

    if (cart.length === 0) {
      showAlert("Carrinho vazio. Adicione produtos antes de finalizar.", "warning");
      return;
    }

    const total = cartTotal();
    const method = elPaymentMethod.value;

    const paid = parseMoneyBR(elPaidValue.value);
    if (!Number.isFinite(paid) || paid <= 0) {
      showAlert("Informe o valor pago para finalizar a venda.", "warning");
      focusKeypad("paid");
      return;
    }

    if (paid < total) {
      showAlert(`Valor insuficiente. Falta R$ ${moneyBR(total - paid)}.`, "danger");
      focusKeypad("paid");
      return;
    }

    const change = paid - total;

    const sale = {
      id: `V${Date.now()}`,
      dateISO: new Date().toISOString(),
      total,
      paid,
      change,
      method,
      items: structuredClone(cart),
    };

    // Add to history (most recent first)
    history.unshift(sale);
    saveJSON(LS_HISTORY, history);

    // Clear cart
    cart = [];
    saveJSON(LS_CART, cart);
    selectedCartCodeForQty = null;

    elPaidValue.value = "";
    renderCart();
    recalcTotals();
    renderHistory();

    showAlert(`Venda finalizada ✅ Total: R$ ${moneyBR(total)} | Troco: R$ ${moneyBR(change)}`, "success", 4500);
  }

  // ---------- HISTORY RENDER ----------
  function renderHistory() {
    if (!Array.isArray(history) || history.length === 0) {
      historyList.innerHTML = `
        <div class="text-center text-body-secondary py-4">
          Sem vendas ainda 🧾<br/>
          <small>Finalize uma venda para aparecer aqui.</small>
        </div>
      `;
      return;
    }

    historyList.innerHTML = history.slice(0, 50).map(sale => {
      const itemsCount = sale.items.reduce((acc, i) => acc + i.qty, 0);
      const methodLabel = sale.method === "dinheiro" ? "Dinheiro" : sale.method === "pix" ? "Pix" : "Cartão";

      return `
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <div>
                <div class="fw-semibold">Venda ${escapeHTML(sale.id)}</div>
                <div class="text-body-secondary small">${formatDateTimeBR(sale.dateISO)} • ${methodLabel} • ${itemsCount} item(s)</div>
              </div>
              <div class="text-end">
                <div class="fw-bold mono">R$ ${moneyBR(sale.total)}</div>
                <div class="text-body-secondary small mono">Pago: R$ ${moneyBR(sale.paid)} • Troco: R$ ${moneyBR(sale.change)}</div>
              </div>
            </div>

            <hr class="my-2">

            <details>
              <summary class="small">Ver itens</summary>
              <div class="table-responsive mt-2">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr class="text-body-secondary">
                      <th>Item</th>
                      <th class="text-end">Qtd</th>
                      <th class="text-end">Preço</th>
                      <th class="text-end">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${sale.items.map(i => `
                      <tr>
                        <td>${escapeHTML(i.name)} <small class="text-body-secondary mono">(${escapeHTML(i.code)})</small></td>
                        <td class="text-end mono">${i.qty}</td>
                        <td class="text-end mono">R$ ${moneyBR(i.price)}</td>
                        <td class="text-end mono">R$ ${moneyBR(i.price * i.qty)}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </div>
      `;
    }).join("");
  }

  // ---------- KEYPAD LOGIC ----------
  function focusKeypad(target) {
    keypadTarget = target; // "qty" or "paid"
    activeFieldLabel.textContent = (keypadTarget === "paid") ? "Valor pago" : "Quantidade";

    if (keypadTarget === "paid") {
      elPaidValue.focus();
    } else {
      // qty: ensure some item is selected
      if (!selectedCartCodeForQty && cart.length > 0) {
        selectedCartCodeForQty = cart[0].code;
        renderCart();
      }
    }
  }

  function handleKeypad(key) {
    if (keypadTarget === "paid") {
      handlePaidKey(key);
    } else {
      handleQtyKey(key);
    }
  }

  function handlePaidKey(key) {
    let v = elPaidValue.value || "";

    if (key === "enter") {
      // just validate & recalc
      elPaidValue.value = sanitizeMoneyInput(v);
      recalcTotals();
      return;
    }
    if (key === "backspace") {
      elPaidValue.value = v.slice(0, -1);
      elPaidValue.value = sanitizeMoneyInput(elPaidValue.value);
      recalcTotals();
      return;
    }
    if (key === "clear") {
      elPaidValue.value = "";
      recalcTotals();
      return;
    }

    // allow digits and comma
    if (/^\d$/.test(key)) {
      elPaidValue.value = sanitizeMoneyInput(v + key);
      recalcTotals();
      return;
    }
    if (key === ",") {
      if (!v.includes(",")) {
        elPaidValue.value = sanitizeMoneyInput(v + ",");
        recalcTotals();
      }
      return;
    }
  }

  function handleQtyKey(key) {
    if (cart.length === 0) {
      showAlert("Carrinho vazio. Adicione itens para editar quantidade.", "warning");
      return;
    }

    if (!selectedCartCodeForQty) {
      selectedCartCodeForQty = cart[0].code;
      renderCart();
    }

    const item = cart.find(i => i.code === selectedCartCodeForQty);
    if (!item) return;

    // We'll build qty as a string in dataset
    const currentStr = String(item.qty);

    if (key === "enter") {
      // ok
      return;
    }
    if (key === "backspace") {
      const newStr = currentStr.length > 1 ? currentStr.slice(0, -1) : "1";
      setQty(item.code, Number(newStr));
      return;
    }
    if (key === "clear") {
      setQty(item.code, 1);
      return;
    }

    if (/^\d$/.test(key)) {
      // append digit but avoid crazy big numbers
      const appended = (currentStr === "0") ? key : (currentStr + key);
      const limited = appended.slice(0, 4); // max 4 digits
      setQty(item.code, Number(limited));
      return;
    }

    // ignore comma in qty mode
  }

  // ---------- THEME ----------
  function initTheme() {
    const saved = localStorage.getItem(LS_THEME);
    const theme = (saved === "dark" || saved === "light") ? saved : "light";
    setTheme(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-bs-theme") || "light";
    const next = current === "light" ? "dark" : "light";
    setTheme(next);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem(LS_THEME, theme);
    btnTheme.textContent = theme === "dark" ? "☀️ Tema" : "🌙 Tema";
  }

  // ---------- ALERTS ----------
function clearAlert() {
  // Agora limpa TODOS os toasts
  alertArea.innerHTML = "";
}

function showAlert(message, type = "info", timeoutMs = 3200) {
  const id = `a_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  // Cria o toast
  const wrapper = document.createElement("div");
  wrapper.id = id;
  wrapper.className = `alert alert-${type} d-flex align-items-start justify-content-between gap-2`;
  wrapper.setAttribute("role", "alert");
  wrapper.innerHTML = `
    <div>${escapeHTML(message)}</div>
    <button type="button" class="btn-close" aria-label="Fechar"></button>
  `;

  // Adiciona no topo (mais novo em cima)
  alertArea.prepend(wrapper);

  // Botão fechar
  const closeBtn = wrapper.querySelector(".btn-close");
  closeBtn?.addEventListener("click", () => {
    wrapper.remove();
  });

  // Auto remover
  if (timeoutMs && timeoutMs > 0) {
    window.setTimeout(() => {
      if (document.getElementById(id)) wrapper.remove();
    }, timeoutMs);
  }

  // Limite de alertas na tela (evita bagunça)
  const maxToasts = 3;
  const all = alertArea.querySelectorAll(".alert");
  if (all.length > maxToasts) {
    for (let i = maxToasts; i < all.length; i++) {
      all[i].remove();
    }
  }
}

  // ---------- CSV ----------
  function downloadCSV(filename, rows) {
    if (!rows || rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(";"),
      ...rows.map(row => headers.map(h => csvCell(row[h])).join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    showAlert(`CSV gerado: ${filename} ✅`, "success", 2500);
  }

  function csvCell(value) {
    const s = String(value ?? "");
    // escape quotes, wrap
    const escaped = s.replaceAll('"', '""');
    return `"${escaped}"`;
  }

  // ---------- HELPERS ----------
  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function moneyBR(n) {
    const v = Number(n) || 0;
    return v.toFixed(2).replace(".", ",");
  }

  function parseMoneyBR(str) {
    const s = String(str || "").trim();
    if (!s) return 0;
    // keep digits and comma
    const cleaned = s.replace(/[^\d,]/g, "");
    // only first comma
    const parts = cleaned.split(",");
    const intPart = parts[0] || "0";
    const decPart = (parts[1] || "").slice(0, 2);
    const normalized = `${intPart}.${decPart.padEnd(2, "0")}`;
    const num = Number(normalized);
    return Number.isFinite(num) ? num : 0;
  }

  function sanitizeMoneyInput(str) {
    let s = String(str ?? "");

    // keep only digits and comma
    s = s.replace(/[^\d,]/g, "");

    // allow only one comma
    const firstComma = s.indexOf(",");
    if (firstComma !== -1) {
      const before = s.slice(0, firstComma);
      const after = s.slice(firstComma + 1).replaceAll(",", "");
      s = before + "," + after.slice(0, 2);
    }

    // avoid leading zeros like 0002 (keep single 0 unless "0," case)
    if (s.includes(",")) {
      const [a, b] = s.split(",");
      const a2 = a.replace(/^0+(?=\d)/, "");
      s = (a2 === "" ? "0" : a2) + "," + (b ?? "");
    } else {
      s = s.replace(/^0+(?=\d)/, "");
    }

    return s;
  }

  function stampDateTime() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  function formatDateTimeBR(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function escapeHTML(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(s) {
    return escapeHTML(s).replaceAll('"', "&quot;");
  }

  // Default focus for keypad
  focusKeypad("qty");
})();
