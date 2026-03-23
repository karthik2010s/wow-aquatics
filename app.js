const orderStatuses = {
  pickup: ["Order placed", "Packed", "Ready for pickup", "Completed"],
  delivery: ["Order placed", "Packed", "Out for delivery", "Delivered"],
};

const state = {
  filter: "all",
  query: "",
  sort: "featured",
  products: [],
  cart: [],
  orders: [],
  isAdmin: false,
  adminToken: window.localStorage.getItem("adminToken") || "",
  customerToken: window.localStorage.getItem("customerToken") || "",
  customer: null,
  customerOrders: [],
  analytics: {
    enabled: false,
    measurementId: "",
    loaded: false,
  },
  loading: false,
};

const productGrid = document.getElementById("product-grid");
const template = document.getElementById("product-card-template");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
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
const summaryProducts = document.getElementById("summary-products");
const summaryLowStock = document.getElementById("summary-low-stock");
const summaryOrders = document.getElementById("summary-orders");
const summaryRevenue = document.getElementById("summary-revenue");
const topCategories = document.getElementById("top-categories");
const recentOrders = document.getElementById("recent-orders");
const analyticsStatusPanel = document.getElementById("analytics-status-panel");
const analyticsQuickStatus = document.getElementById("analytics-quick-status");
const adminLoginForm = document.getElementById("admin-login-form");
const adminPasswordInput = document.getElementById("admin-password");
const adminSessionCard = document.getElementById("admin-session-card");
const adminLogoutButton = document.getElementById("admin-logout");
const adminStatusText = document.getElementById("admin-status-text");
const adminScrollButton = document.getElementById("admin-scroll");
const loadMarketplaceDemoButton = document.getElementById("load-marketplace-demo");
const productImageFileInput = document.getElementById("product-image-file");
const imagePreviewWrap = document.getElementById("image-preview-wrap");
const imagePreview = document.getElementById("image-preview");
const customerScrollButton = document.getElementById("customer-scroll");
const customerStatusText = document.getElementById("customer-status-text");
const customerLoginForm = document.getElementById("customer-login-form");
const customerRegisterForm = document.getElementById("customer-register-form");
const customerSessionCard = document.getElementById("customer-session-card");
const customerAuthCard = document.getElementById("customer-auth-card");
const customerProfile = document.getElementById("customer-profile");
const customerOrdersList = document.getElementById("customer-orders-list");
const customerLogoutButton = document.getElementById("customer-logout");
const customerLoginEmail = document.getElementById("customer-login-email");
const customerLoginPassword = document.getElementById("customer-login-password");
const customerRegisterName = document.getElementById("customer-register-name");
const customerRegisterEmail = document.getElementById("customer-register-email");
const customerRegisterPhone = document.getElementById("customer-register-phone");
const customerRegisterAddress = document.getElementById("customer-register-address");
const customerRegisterPassword = document.getElementById("customer-register-password");
const customerPhoneInput = document.getElementById("customer-phone");
const installAppButton = document.getElementById("install-app");
const productModal = document.getElementById("product-modal");
const productModalBackdrop = document.getElementById("product-modal-backdrop");
const productModalCloseButton = document.getElementById("product-modal-close");
const productModalImage = document.getElementById("product-modal-image");
const productModalCategory = document.getElementById("product-modal-category");
const productModalTitle = document.getElementById("product-modal-title");
const productModalPrice = document.getElementById("product-modal-price");
const productModalBadges = document.getElementById("product-modal-badges");
const productModalDescription = document.getElementById("product-modal-description");
const productModalMeta = document.getElementById("product-modal-meta");
const productModalAddButton = document.getElementById("product-modal-add");
let deferredInstallPrompt = null;
let activeProductId = null;

function openCart() {
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCartDrawer() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
}

function openProductModal(productId) {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product) {
    return;
  }

  const inventory = getInventoryState(product.stock);
  activeProductId = productId;
  productModalCategory.textContent = formatCategory(product.category);
  productModalTitle.textContent = product.name;
  productModalPrice.textContent = formatPrice(product.price);
  productModalDescription.textContent = product.description;
  productModalMeta.innerHTML = `
    <p><strong>Highlights</strong></p>
    <p>${product.meta}</p>
    <p><strong>Availability</strong></p>
    <p>${inventory.label} - ${product.stock} item(s) left</p>
  `;
  productModalBadges.innerHTML = `
    <span class="inventory-badge ${inventory.className}">${inventory.label}</span>
    <span class="inventory-badge in-stock">${formatCategory(product.category)}</span>
  `;
  productModalImage.src = product.imageUrl || getPlaceholderImage(product);
  productModalImage.alt = product.name;
  productModalAddButton.disabled = product.stock <= 0;
  productModalAddButton.textContent = product.stock <= 0 ? "Sold out" : "Add to cart";
  productModal.classList.remove("hidden");
  productModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeProductModal() {
  activeProductId = null;
  productModal.classList.add("hidden");
  productModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function updateInstallButtonVisibility(visible) {
  if (!installAppButton) {
    return;
  }

  installAppButton.classList.toggle("hidden", !visible);
}

function isIosInstallHintAvailable() {
  const ua = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  return isIos && !isStandalone;
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

function formatDateTime(value) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function maskMeasurementId(measurementId) {
  if (!measurementId) {
    return "Not connected";
  }

  if (measurementId.length <= 6) {
    return measurementId;
  }

  return `${measurementId.slice(0, 6)}...${measurementId.slice(-3)}`;
}

function getPlaceholderImage(product) {
  const label = encodeURIComponent(getCategoryLabel(product.category || "Product"));
  return `https://placehold.co/800x550/fff1b8/7b6436?text=${label}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function clearImagePreview() {
  imagePreview.src = "";
  imagePreviewWrap.classList.add("hidden");
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
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.adminToken) {
    headers["X-Admin-Token"] = state.adminToken;
  }

  if (state.customerToken) {
    headers["X-Customer-Token"] = state.customerToken;
  }

  const response = await fetch(url, {
    credentials: "same-origin",
    headers,
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

function trackEvent(eventName, params = {}) {
  if (!state.analytics.loaded || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}

function renderAnalyticsStatus() {
  const statusText = state.analytics.enabled
    ? `Google Analytics connected: ${maskMeasurementId(state.analytics.measurementId)}`
    : "Google Analytics not connected yet";

  if (analyticsQuickStatus) {
    analyticsQuickStatus.textContent = statusText;
  }

  analyticsStatusPanel.innerHTML = "";

  const card = document.createElement("div");
  card.className = "insight-row";
  card.innerHTML = `
    <div>
      <p><strong>${statusText}</strong></p>
      <p class="summary-meta">${
        state.analytics.enabled
          ? `Reports are visible only in your Google Analytics admin account. ID: ${maskMeasurementId(
              state.analytics.measurementId
            )}`
          : "Add GA_MEASUREMENT_ID in your server environment to enable visitor tracking."
      }</p>
    </div>
  `;
  analyticsStatusPanel.appendChild(card);
}

function loadAnalyticsScript(measurementId) {
  if (!measurementId || state.analytics.loaded) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);
  state.analytics.loaded = true;
}

function renderCustomerOrders() {
  customerOrdersList.innerHTML = "";

  if (!state.customer) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Login is optional. Sign in to view your previous orders here.";
    customerOrdersList.appendChild(empty);
    return;
  }

  if (!state.customerOrders.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No customer orders yet. Your future orders will appear here.";
    customerOrdersList.appendChild(empty);
    return;
  }

  state.customerOrders.forEach((order) => {
    const steps = orderStatuses[order.fulfillmentType];
    const timeline = steps
      .map(
        (step, index) =>
          `<span class="timeline-step${index <= order.statusIndex ? " active" : ""}">${step}</span>`
      )
      .join("");
    const card = document.createElement("article");
    card.className = "order-card";
    card.innerHTML = `
      <div class="order-header">
        <div>
          <p><strong>Order #${order.id}</strong></p>
          <p class="order-status-label">${order.itemsSummary}</p>
        </div>
        <span class="inventory-badge in-stock">${formatCategory(order.fulfillmentType)}</span>
      </div>
      <div class="order-meta">
        <p class="order-status-label">${order.address}</p>
        <p class="order-status-label">Total: ${formatPrice(order.total)}</p>
      </div>
      <p class="order-status-label">Status: ${steps[order.statusIndex]}</p>
      <details class="order-details">
        <summary>View details</summary>
        <div class="order-details-grid">
          <p><strong>Order placed:</strong> ${formatDateTime(order.createdAt)}</p>
          <p><strong>Customer:</strong> ${order.customerName}</p>
          <p><strong>Phone:</strong> ${order.customerPhone || "Not provided"}</p>
          <p><strong>Fulfillment:</strong> ${formatCategory(order.fulfillmentType)}</p>
          <p><strong>Address:</strong> ${order.address}</p>
          <p><strong>Items:</strong> ${order.itemsSummary}</p>
        </div>
        <div class="timeline-row">${timeline}</div>
      </details>
    `;
    customerOrdersList.appendChild(card);
  });
}

function renderCustomerState() {
  const isLoggedIn = Boolean(state.customer);
  customerAuthCard.classList.toggle("hidden", isLoggedIn);
  customerSessionCard.classList.toggle("hidden", !isLoggedIn);
  customerStatusText.textContent = isLoggedIn
    ? "Logged in. Your checkout details are pre-filled and your orders are saved to this account."
    : "Continue as guest or sign in to save details and view your order history.";

  if (!isLoggedIn) {
    customerProfile.innerHTML = "";
    renderCustomerOrders();
    return;
  }

  customerProfile.innerHTML = `
    <p><strong>${state.customer.fullName}</strong></p>
    <p>${state.customer.email}</p>
    <p>${state.customer.phone || "Phone not added yet"}</p>
    <p>${state.customer.address || "No default address saved"}</p>
  `;

  document.getElementById("customer-name").value = state.customer.fullName || "";
  document.getElementById("customer-address").value = state.customer.address || "";
  if (customerPhoneInput) {
    customerPhoneInput.value = state.customer.phone || "";
  }

  renderCustomerOrders();
}

function renderAdminState() {
  dashboardSection.classList.toggle("hidden", !state.isAdmin);
  activeOrdersCard.classList.toggle("hidden", !state.isAdmin);
  adminLoginForm.classList.toggle("hidden", state.isAdmin);
  adminSessionCard.classList.toggle("hidden", !state.isAdmin);
  adminStatusText.textContent = state.isAdmin
    ? "Admin access is active. Inventory and order tracking controls are unlocked."
    : "Customers can browse and order, but stock controls stay private.";
  renderAnalyticsStatus();
}

function renderFilters() {
  if (!filters) {
    return;
  }

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

function renderDashboardSummary() {
  const summary = {
    totalProducts: state.products.length,
    lowStockProducts: state.products.filter((product) => product.stock <= 5).length,
    totalOrders: state.orders.length,
    totalRevenue: state.orders.reduce((sum, order) => sum + order.total, 0),
    topCategories: [...new Set(state.products.map((product) => product.category))]
      .map((category) => ({
        category,
        count: state.products.filter((product) => product.category === category).length,
      }))
      .sort((first, second) => second.count - first.count || first.category.localeCompare(second.category))
      .slice(0, 4),
    recentOrders: [...state.orders].slice(0, 4),
  };

  summaryProducts.textContent = summary.totalProducts;
  summaryLowStock.textContent = summary.lowStockProducts;
  summaryOrders.textContent = summary.totalOrders;
  summaryRevenue.textContent = formatPrice(summary.totalRevenue);

  topCategories.innerHTML = "";
  recentOrders.innerHTML = "";

  if (!summary.topCategories.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No category data yet.";
    topCategories.appendChild(empty);
  } else {
    summary.topCategories.forEach((entry) => {
      const row = document.createElement("article");
      row.className = "insight-row";
      row.innerHTML = `
        <p><strong>${formatCategory(entry.category)}</strong></p>
        <p>${entry.count} product(s)</p>
      `;
      topCategories.appendChild(row);
    });
  }

  if (!summary.recentOrders.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No recent orders yet.";
    recentOrders.appendChild(empty);
  } else {
    summary.recentOrders.forEach((order) => {
      const row = document.createElement("article");
      row.className = "insight-row";
      row.innerHTML = `
        <div>
          <p><strong>${order.customerName}</strong></p>
          <p class="summary-meta">${formatCategory(order.fulfillmentType)}</p>
        </div>
        <p>${formatPrice(order.total)}</p>
      `;
      recentOrders.appendChild(row);
    });
  }

  renderAnalyticsStatus();
}

function renderProducts() {
  if (!productGrid || !template) {
    return;
  }

  const filtered = state.products.filter((product) => {
    const matchesFilter = state.filter === "all" || product.category === state.filter;
    const text = `${product.name} ${product.description} ${product.meta}`.toLowerCase();
    const matchesSearch = text.includes(state.query.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  filtered.sort((first, second) => {
    if (state.sort === "price-low") {
      return first.price - second.price;
    }

    if (state.sort === "price-high") {
      return second.price - first.price;
    }

    if (state.sort === "name-az") {
      return first.name.localeCompare(second.name);
    }

    if (state.sort === "stock-high") {
      return second.stock - first.stock;
    }

    return 0;
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
    const image = node.querySelector(".product-image");
    node.dataset.productId = product.id;

    node.querySelector(".product-category").textContent = formatCategory(product.category);
    node.querySelector(".product-price").textContent = formatPrice(product.price);
    node.querySelector(".product-name").textContent = product.name;
    node.querySelector(".product-description").textContent = product.description;
    node.querySelector(
      ".product-meta"
    ).innerHTML = `${product.meta}<br /><span class="inventory-badge ${inventory.className}">${inventory.label} - ${product.stock} left</span>`;
    image.src = product.imageUrl || getPlaceholderImage(product);
    image.alt = product.name;
    image.addEventListener(
      "error",
      () => {
        image.src = getPlaceholderImage(product);
      },
      { once: true }
    );

    addButton.dataset.productId = product.id;
    addButton.disabled = product.stock <= 0;
    addButton.textContent = product.stock <= 0 ? "Sold out" : "Add to cart";

    productGrid.appendChild(node);
  });

  if (!filtered.length && !state.loading) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No products matched your search or filters. Try another keyword.";
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
        <button class="remove-button" type="button" data-stock-action="delete" data-product-id="${product.id}">Delete product</button>
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
    renderDashboardSummary();
    renderInventory();
    renderOrders();
  } catch (error) {
    setStatus(error.message);
  } finally {
    state.loading = false;
  }
}

async function loadCustomerOrders() {
  if (!state.customer) {
    state.customerOrders = [];
    renderCustomerOrders();
    return;
  }

  try {
    state.customerOrders = await apiFetch("/api/customer/orders");
    renderCustomerOrders();
  } catch (error) {
    state.customerOrders = [];
    renderCustomerOrders();
    setStatus(error.message);
  }
}

async function loadAdminSession() {
  try {
    const session = await apiFetch("/api/admin/session");
    state.isAdmin = Boolean(session.authenticated);
    state.adminToken = session.authenticated ? state.adminToken : "";
    if (!state.isAdmin) {
      window.localStorage.removeItem("adminToken");
    }
    renderAdminState();
  } catch {
    state.isAdmin = false;
    state.adminToken = "";
    window.localStorage.removeItem("adminToken");
    renderAdminState();
  }
}

async function loadCustomerSession() {
  try {
    const session = await apiFetch("/api/customer/session");
    if (!session.authenticated) {
      state.customer = null;
      state.customerToken = "";
      window.localStorage.removeItem("customerToken");
    } else {
      state.customer = session.customer;
    }
  } catch {
    state.customer = null;
    state.customerToken = "";
    window.localStorage.removeItem("customerToken");
  }

  renderCustomerState();
  await loadCustomerOrders();
}

async function loadPublicConfig() {
  try {
    const config = await apiFetch("/api/public-config");
    state.analytics.enabled = Boolean(config.analyticsEnabled && config.gaMeasurementId);
    state.analytics.measurementId = config.gaMeasurementId || "";
    if (state.analytics.enabled) {
      loadAnalyticsScript(state.analytics.measurementId);
    }
  } catch {
    state.analytics.enabled = false;
    state.analytics.measurementId = "";
  }

  renderAnalyticsStatus();
}

async function createProduct(event) {
  event.preventDefault();

  let imageUrl = "";
  const imageFile = productImageFileInput.files[0];

  if (imageFile) {
    if (imageFile.size > 2 * 1024 * 1024) {
      setStatus("Image must be 2 MB or smaller");
      return;
    }

    try {
      imageUrl = await readFileAsDataUrl(imageFile);
    } catch (error) {
      setStatus(error.message);
      return;
    }
  }

  const payload = {
    name: document.getElementById("product-name").value.trim(),
    category: document.getElementById("product-category").value.trim().toLowerCase(),
    price: Number(document.getElementById("product-price").value),
    stock: Number(document.getElementById("product-stock").value),
    imageUrl,
    description: document.getElementById("product-description").value.trim(),
    meta: document.getElementById("product-meta").value.trim(),
  };

  if (!payload.name || !payload.category) {
    setStatus("Enter product name and category");
    return;
  }

  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    setStatus("Enter a valid price");
    return;
  }

  if (!Number.isFinite(payload.stock) || payload.stock < 0) {
    setStatus("Enter a valid stock quantity");
    return;
  }

  try {
    const createdProduct = await apiFetch("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.products.unshift(createdProduct);
    productForm.reset();
    clearImagePreview();
    renderFilters();
    renderProducts();
    renderInventory();
    renderDashboardSummary();
    setStatus("Product added to shared inventory");
  } catch (error) {
    setStatus(error.message === "Admin login required." ? "Please unlock admin first" : error.message);
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

  const customerNameInput = document.getElementById("customer-name");
  const customerAddressInput = document.getElementById("customer-address");
  const payload = {
    customerName: customerNameInput.value.trim() || state.customer?.fullName || "",
    customerPhone: customerPhoneInput?.value.trim() || state.customer?.phone || "",
    fulfillmentType: document.getElementById("fulfillment-type").value,
    address: customerAddressInput.value.trim() || state.customer?.address || "",
    items: state.cart,
  };
  const purchaseValue = state.cart.reduce((sum, item) => {
    const product = state.products.find((entry) => entry.id === item.productId);
    return product ? sum + product.price * item.quantity : sum;
  }, 0);

  try {
    await apiFetch("/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.cart = [];
    orderForm.reset();
    closeCartDrawer();
    await loadRemoteData();
    await loadCustomerOrders();
    if (state.customer) {
      renderCustomerState();
    }
    trackEvent("purchase", {
      currency: "INR",
      value: purchaseValue,
      method: payload.fulfillmentType,
    });
    setStatus(`${formatCategory(payload.fulfillmentType)} order placed successfully`);
  } catch (error) {
    setStatus(error.message);
  }
}

async function deleteProduct(productId) {
  try {
    await apiFetch(`/api/products/${productId}`, {
      method: "DELETE",
    });
    state.products = state.products.filter((product) => product.id !== productId);
    state.cart = state.cart.filter((item) => item.productId !== productId);
    renderFilters();
    renderProducts();
    renderCart();
    renderInventory();
    renderDashboardSummary();
    setStatus("Product removed successfully");
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
    const result = await apiFetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: adminPasswordInput.value }),
    });
    state.adminToken = result.token || "";
    if (state.adminToken) {
      window.localStorage.setItem("adminToken", state.adminToken);
    }
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
    state.adminToken = "";
    window.localStorage.removeItem("adminToken");
    state.orders = [];
    renderAdminState();
    renderDashboardSummary();
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

async function loginCustomer(event) {
  event.preventDefault();

  try {
    const result = await apiFetch("/api/customer/login", {
      method: "POST",
      body: JSON.stringify({
        email: customerLoginEmail.value.trim(),
        password: customerLoginPassword.value,
      }),
    });

    state.customerToken = result.token || "";
    state.customer = result.customer || null;
    state.customerOrders = [];
    if (state.customerToken) {
      window.localStorage.setItem("customerToken", state.customerToken);
    }
    customerLoginForm.reset();
    renderCustomerState();
    await loadCustomerOrders();
    trackEvent("login", { method: "email" });
    setStatus("Customer account logged in");
  } catch (error) {
    setStatus(error.message);
  }
}

async function registerCustomer(event) {
  event.preventDefault();

  try {
    const result = await apiFetch("/api/customer/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: customerRegisterName.value.trim(),
        email: customerRegisterEmail.value.trim(),
        phone: customerRegisterPhone.value.trim(),
        address: customerRegisterAddress.value.trim(),
        password: customerRegisterPassword.value,
      }),
    });

    state.customerToken = result.token || "";
    state.customer = result.customer || null;
    state.customerOrders = [];
    if (state.customerToken) {
      window.localStorage.setItem("customerToken", state.customerToken);
    }
    customerRegisterForm.reset();
    renderCustomerState();
    await loadCustomerOrders();
    trackEvent("sign_up", { method: "email" });
    setStatus("Customer account created");
  } catch (error) {
    setStatus(error.message);
  }
}

async function logoutCustomer() {
  try {
    await apiFetch("/api/customer/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });
    state.customer = null;
    state.customerToken = "";
    state.customerOrders = [];
    window.localStorage.removeItem("customerToken");
    renderCustomerState();
    setStatus("Customer account logged out");
  } catch (error) {
    setStatus(error.message);
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    console.error("Service worker registration failed", error);
  }
}

if (searchInput) {
  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    renderProducts();
  });
}

if (sortSelect) {
  sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderProducts();
  });
}

if (productGrid) {
  productGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".add-button");
    if (button) {
      addToCart(Number(button.dataset.productId));
      return;
    }

    const card = event.target.closest(".product-card");
    if (!card) {
      return;
    }

    openProductModal(Number(card.dataset.productId));
  });
}

if (filters) {
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
}

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
  if (button.dataset.stockAction === "delete") {
    deleteProduct(productId);
    return;
  }

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
productImageFileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) {
    clearImagePreview();
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    clearImagePreview();
    setStatus("Image must be 2 MB or smaller");
    productImageFileInput.value = "";
    return;
  }

  try {
    const result = await readFileAsDataUrl(file);
    imagePreview.src = result;
    imagePreviewWrap.classList.remove("hidden");
  } catch (error) {
    clearImagePreview();
    setStatus(error.message);
  }
});
orderForm.addEventListener("submit", createOrder);
adminLoginForm.addEventListener("submit", loginAdmin);
adminLogoutButton.addEventListener("click", logoutAdmin);
loadMarketplaceDemoButton.addEventListener("click", loadMarketplaceDemo);
customerLoginForm.addEventListener("submit", loginCustomer);
customerRegisterForm.addEventListener("submit", registerCustomer);
customerLogoutButton.addEventListener("click", logoutCustomer);
cartButton.addEventListener("click", openCart);
closeCart.addEventListener("click", closeCartDrawer);
installAppButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    if (isIosInstallHintAvailable()) {
      setStatus("On iPhone, tap Share and then Add to Home Screen.");
    }
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  updateInstallButtonVisibility(false);
});
productModalAddButton.addEventListener("click", () => {
  if (!activeProductId) {
    return;
  }

  addToCart(activeProductId);
});
productModalBackdrop.addEventListener("click", closeProductModal);
productModalCloseButton.addEventListener("click", closeProductModal);
customerScrollButton.addEventListener("click", () => {
  document.getElementById("customer-access").scrollIntoView({ behavior: "smooth" });
});
adminScrollButton.addEventListener("click", () => {
  document.getElementById("admin-access").scrollIntoView({ behavior: "smooth" });
});

checkoutButton.addEventListener("click", () => {
  document.getElementById("orders").scrollIntoView({ behavior: "smooth" });
  setStatus(
    state.cart.length
      ? "Fill customer details in checkout to place your order"
      : "Add products to the cart before checkout"
  );
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButtonVisibility(true);
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallButtonVisibility(false);
  setStatus("App installed successfully");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !productModal.classList.contains("hidden")) {
    closeProductModal();
  }
});

renderAdminState();
renderCustomerState();
updateInstallButtonVisibility(isIosInstallHintAvailable());
registerServiceWorker();
Promise.all([loadPublicConfig(), loadAdminSession(), loadCustomerSession()]).then(loadRemoteData);
