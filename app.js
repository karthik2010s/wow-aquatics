const orderStatuses = {
  pickup: ["Order placed", "Packed", "Ready for pickup", "Completed"],
  delivery: ["Order placed", "Packed", "Out for delivery", "Delivered"],
};

const state = {
  filter: "all",
  query: "",
  products: [],
  cart: [],
  orders: [],
  isAdmin: false,
  loading: false,
};

const productGrid = document.getElementById("product-grid");
const template = document.getElementById("product-card-template");
const searchInput = document.getElementById("search-input");
const filters = document.getElementById("filters");
const cartButton = document.getElementById("cart-button");
const cartDrawer = document.getElementById("cart-drawer");
const closeCart = document.getElementById("close-cart");
const cartItems = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const cartStatus = document.getElementById("cart-status");
const checkoutButton = document.getElementById("checkout-button");
const productForm = document.getElementById("product-form");
const inventoryList = document.getElementById("inventory-list");
const orderForm = document.getElementById("order-form");
const ordersList = document.getElementById("orders-list");
const dashboardSection = document.getElementById("dashboard");
const activeOrdersCard = document.getElementById("active-orders-card");
const adminLoginForm = document.getElementById("admin-login-form");
const adminPasswordInput = document.getElementById("admin-password");
const adminSessionCard = document.getElementById("admin-session-card");
const adminLogoutButton = document.getElementById("admin-logout");
const adminStatusText = document.getElementById("admin-status-text");
const adminScrollButton = document.getElementById("admin-scroll");
const loadMarketplaceDemoButton = document.getElementById("load-marketplace-demo");

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCartDrawer() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

function getCategoryLabel(category) {
  return String(category)
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCategory(category) {
  return getCategoryLabel(category);
}

function formatPrice(amount) {
  return `Rs. ${amount}`;
}

function getInventoryState(stock) {
  if (stock <= 0) {
    return { label: "Sold Out", className: "sold-out" };
  }

  if (stock <= 5) {
    return { label: "Low Stock", className: "low-stock" };
  }

  return { label: "In Stock", className: "in-stock" };
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json();
}

function setStatus(message) {
  cartStatus.textContent = message;
}

function renderAdminState() {
  dashboardSection.classList.toggle("hidden", !state.isAdmin);
  activeOrdersCard.classList.toggle("hidden", !state.isAdmin);
  adminLoginForm.classList.toggle("hidden", state.isAdmin);
  adminSessionCard.classList.toggle("hidden", !state.isAdmin);
  adminStatusText.textContent = state.isAdmin
    ? "Admin access is active. Inventory and order tracking controls are unlocked."
    : "Customers can browse and order, but stock controls stay private.";
}

function renderFilters() {
  const categories = [...new Set(state.products.map((product) => product.category))].sort((a, b) =>
    a.localeCompare(b)
  );

  if (state.filter !== "all" && !categories.includes(state.filter)) {
    state.filter = "all";
  }

  filters.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.className = `filter-chip${state.filter === "all" ? " active" : ""}`;
  allButton.type = "button";
  allButton.dataset.filter = "all";
  allButton.textContent = "All";
  filters.appendChild(allButton);

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.className = `filter-chip${state.filter === category ? " active" : ""}`;
    button.type = "button";
    button.dataset.filter = category;
    button.textContent = getCategoryLabel(category);
    filters.appendChild(button);
  });
}

function renderProducts() {
  const filtered = state.products.filter((product) => {
    const matchesFilter = state.filter === "all" || product.category === state.filter;
    const text = `${product.name} ${product.description} ${product.meta}`.toLowerCase();
    const matchesSearch = text.includes(state.query.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  productGrid.innerHTML = "";

  if (state.loading && !filtered.length) {
    const loading = document.createElement("div");
    loading.className = "empty-state";
    loading.textContent = "Loading products...";
    productGrid.appendChild(loading);
    return;
  }

  filtered.forEach((product) => {
    const inventory = getInventoryState(product.stock);
    const node = template.content.firstElementChild.cloneNode(true);
    const addButton = node.querySelector(".add-button");

    node.querySelector(".product-category").textContent = formatCategory(product.category);
    node.querySelector(".product-price").textContent = formatPrice(product.price);
    node.querySelector(".product-name").textContent = product.name;
    node.querySelector(".product-description").textContent = product.description;
    node.querySelector(
      ".product-meta"
    ).innerHTML = `${product.meta}<br /><span class="inventory-badge ${inventory.className}">${inventory.label} - ${product.stock} left</span>`;

    addButton.dataset.productId = product.id;
    addButton.disabled = product.stock <= 0;
    addButton.textContent = product.stock <= 0 ? "Sold out" : "Add to cart";

    productGrid.appendChild(node);
  });

  if (!filtered.length && !state.loading) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No products matched your search. Try another product, brand, or category keyword.";
    productGrid.appendChild(empty);
  }
}

function renderCart() {
  cartItems.innerHTML = "";

  if (!state.cart.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Your cart is empty. Add a few fish, plants, or service items to get started.";
    cartItems.appendChild(empty);
  } else {
    state.cart.forEach((item) => {
      const product = state.products.find((entry) => entry.id === item.productId);
      if (!product) {
        return;
      }

      const row = document.createElement("article");
      row.className = "cart-row";
      row.innerHTML = `
        <div class="cart-row-details">
          <p><strong>${product.name}</strong></p>
          <p>${item.quantity} x ${formatPrice(product.price)}</p>
          <div class="cart-controls">
            <button class="qty-button" type="button" data-action="decrease" data-product-id="${product.id}">-</button>
            <span>${item.quantity}</span>
            <button class="qty-button" type="button" data-action="increase" data-product-id="${product.id}">+</button>
            <button class="remove-button" type="button" data-action="remove" data-product-id="${product.id}">Remove</button>
          </div>
        </div>
        <strong>${formatPrice(item.quantity * product.price)}</strong>
      `;
      cartItems.appendChild(row);
    });
  }

  const quantity = state.cart.reduce((total, item) => total + item.quantity, 0);
  const total = state.cart.reduce((sum, item) => {
    const product = state.products.find((entry) => entry.id === item.productId);
    return product ? sum + product.price * item.quantity : sum;
  }, 0);

  cartCount.textContent = quantity;
  cartTotal.textContent = formatPrice(total);
  if (!state.loading) {
    setStatus(quantity ? `${quantity} item(s) ready in cart` : "Cart is empty");
  }
}

function renderInventory() {
  inventoryList.innerHTML = "";

  state.products.forEach((product) => {
    const inventory = getInventoryState(product.stock);
    const item = document.createElement("article");
    item.className = "inventory-item";
    item.innerHTML = `
      <div class="inventory-item-header">
        <div>
          <p><strong>${product.name}</strong></p>
          <p class="stock-count">${formatCategory(product.category)} - ${formatPrice(product.price)}</p>
        </div>
        <span class="inventory-badge ${inventory.className}">${inventory.label}</span>
      </div>
      <p class="stock-count">Current stock: ${product.stock}</p>
      <div class="stock-controls">
        <button class="stock-button" type="button" data-stock-action="decrease" data-product-id="${product.id}">-1 stock</button>
        <button class="stock-button" type="button" data-stock-action="increase" data-product-id="${product.id}">+1 stock</button>
      </div>
    `;
    inventoryList.appendChild(item);
  });
}

function renderOrders() {
  ordersList.innerHTML = "";

  if (!state.orders.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No active orders yet. Create one from the cart to track delivery or pickup.";
    ordersList.appendChild(empty);
    return;
  }

  state.orders.forEach((order) => {
    const steps = orderStatuses[order.fulfillmentType];
    const card = document.createElement("article");
    card.className = "order-card";
    card.innerHTML = `
      <div class="order-header">
        <div>
          <p><strong>${order.customerName}</strong></p>
          <p class="order-status-label">Order #${order.id}</p>
        </div>
        <span class="inventory-badge in-stock">${formatCategory(order.fulfillmentType)}</span>
      </div>
      <div class="order-meta">
        <p class="order-status-label">${order.address}</p>
        <p class="order-status-label">Total: ${formatPrice(order.total)}</p>
      </div>
      <p class="order-status-label">Status: ${steps[order.statusIndex]}</p>
      <p class="order-items">${order.itemsSummary}</p>
      <div class="order-actions">
        <button class="status-button" type="button" data-order-action="back" data-order-id="${order.id}">Previous</button>
        <button class="status-button" type="button" data-order-action="next" data-order-id="${order.id}">Next</button>
      </div>
    `;
    ordersList.appendChild(card);
  });
}

function syncCartWithProducts() {
  state.cart = state.cart
    .map((item) => {
      const product = state.products.find((entry) => entry.id === item.productId);
      if (!product || product.stock <= 0) {
        return null;
      }

      return {
        ...item,
        quantity: Math.min(item.quantity, product.stock),
      };
    })
    .filter(Boolean);
}

function addToCart(productId) {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product || product.stock <= 0) {
    setStatus("This item is currently out of stock");
    return;
  }

  const existing = state.cart.find((item) => item.productId === productId);
  const currentQuantity = existing ? existing.quantity : 0;

  if (currentQuantity >= product.stock) {
    setStatus("You already added all available stock for this item");
    return;
  }

  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ productId, quantity: 1 });
  }

  renderCart();
  openCart();
}

function updateQuantity(productId, change) {
  const item = state.cart.find((entry) => entry.productId === productId);
  const product = state.products.find((entry) => entry.id === productId);
  if (!item || !product) {
    return;
  }

  if (change > 0 && item.quantity >= product.stock) {
    setStatus("No more stock available for this product");
    return;
  }

  item.quantity += change;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter((entry) => entry.productId !== productId);
  }

  renderCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((entry) => entry.productId !== productId);
  renderCart();
}

async function loadRemoteData() {
  state.loading = true;
  renderProducts();
  renderCart();

  try {
    const requests = [apiFetch("/api/products")];
    if (state.isAdmin) {
      requests.push(apiFetch("/api/orders"));
    }

    const [products, orders = []] = await Promise.all(requests);
    state.products = products;
    state.orders = orders;
    syncCartWithProducts();
    renderFilters();
    renderProducts();
    renderCart();
    renderInventory();
    renderOrders();
  } catch (error) {
    setStatus(error.message);
  } finally {
    state.loading = false;
  }
}

async function loadAdminSession() {
  try {
    const session = await apiFetch("/api/admin/session");
    state.isAdmin = Boolean(session.authenticated);
    renderAdminState();
  } catch {
    state.isAdmin = false;
    renderAdminState();
  }
}

async function createProduct(event) {
  event.preventDefault();

  const payload = {
    name: document.getElementById("product-name").value.trim(),
    category: document.getElementById("product-category").value,
    price: Number(document.getElementById("product-price").value),
    stock: Number(document.getElementById("product-stock").value),
    description: document.getElementById("product-description").value.trim(),
    meta: document.getElementById("product-meta").value.trim(),
  };

  try {
    await apiFetch("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    productForm.reset();
    await loadRemoteData();
    setStatus("Product added to shared inventory");
  } catch (error) {
    setStatus(error.message);
  }
}

async function adjustStock(productId, change) {
  try {
    await apiFetch(`/api/products/${productId}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ change }),
    });
    await loadRemoteData();
    setStatus("Inventory updated");
  } catch (error) {
    setStatus(error.message);
  }
}

async function createOrder(event) {
  event.preventDefault();

  if (!state.cart.length) {
    setStatus("Add products to the cart before creating an order");
    openCart();
    return;
  }

  const payload = {
    customerName: document.getElementById("customer-name").value.trim(),
    fulfillmentType: document.getElementById("fulfillment-type").value,
    address: document.getElementById("customer-address").value.trim(),
    items: state.cart,
  };

  try {
    await apiFetch("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.cart = [];
    orderForm.reset();
    closeCartDrawer();
    await loadRemoteData();
    setStatus(`${formatCategory(payload.fulfillmentType)} order created`);
  } catch (error) {
    setStatus(error.message);
  }
}

async function updateOrderStatus(orderId, direction) {
  try {
    await apiFetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ direction }),
    });
    await loadRemoteData();
    setStatus("Order status updated");
  } catch (error) {
    setStatus(error.message);
  }
}

async function loginAdmin(event) {
  event.preventDefault();

  try {
    await apiFetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: adminPasswordInput.value }),
    });
    state.isAdmin = true;
    adminPasswordInput.value = "";
    renderAdminState();
    await loadRemoteData();
    setStatus("Admin dashboard unlocked");
  } catch (error) {
    setStatus(error.message);
  }
}

async function logoutAdmin() {
  try {
    await apiFetch("/api/admin/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });
    state.isAdmin = false;
    state.orders = [];
    renderAdminState();
    renderOrders();
    setStatus("Admin session closed");
  } catch (error) {
    setStatus(error.message);
  }
}

async function loadMarketplaceDemo() {
  try {
    await apiFetch("/api/admin/load-marketplace-demo", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await loadRemoteData();
    setStatus("Marketplace demo products added");
  } catch (error) {
    setStatus(error.message);
  }
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  renderProducts();
});

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".add-button");
  if (!button) {
    return;
  }

  addToCart(Number(button.dataset.productId));
});

filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) {
    return;
  }

  state.filter = button.dataset.filter;
  document.querySelectorAll(".filter-chip").forEach((chip) => chip.classList.remove("active"));
  button.classList.add("active");
  renderProducts();
});

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) {
    return;
  }

  const productId = Number(button.dataset.productId);
  const action = button.dataset.action;

  if (action === "increase") {
    updateQuantity(productId, 1);
  }

  if (action === "decrease") {
    updateQuantity(productId, -1);
  }

  if (action === "remove") {
    removeFromCart(productId);
  }
});

inventoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-stock-action]");
  if (!button) {
    return;
  }

  const productId = Number(button.dataset.productId);
  const change = button.dataset.stockAction === "increase" ? 1 : -1;
  adjustStock(productId, change);
});

ordersList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-order-action]");
  if (!button) {
    return;
  }

  const orderId = button.dataset.orderId;
  const direction = button.dataset.orderAction === "next" ? 1 : -1;
  updateOrderStatus(orderId, direction);
});

productForm.addEventListener("submit", createProduct);
orderForm.addEventListener("submit", createOrder);
adminLoginForm.addEventListener("submit", loginAdmin);
adminLogoutButton.addEventListener("click", logoutAdmin);
loadMarketplaceDemoButton.addEventListener("click", loadMarketplaceDemo);
cartButton.addEventListener("click", openCart);
closeCart.addEventListener("click", closeCartDrawer);
adminScrollButton.addEventListener("click", () => {
  document.getElementById("admin-access").scrollIntoView({ behavior: "smooth" });
});

checkoutButton.addEventListener("click", () => {
  document.getElementById("orders").scrollIntoView({ behavior: "smooth" });
  setStatus(
    state.cart.length
      ? "Fill customer details to create a delivery or pickup order"
      : "Add products before requesting checkout"
  );
});

renderAdminState();
loadAdminSession().then(loadRemoteData);
