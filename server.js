const express = require("express");
const crypto = require("crypto");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const INDEX_FILE = path.join(__dirname, "index.html");
const STYLES_FILE = path.join(__dirname, "styles.css");
const APP_FILE = path.join(__dirname, "app.js");
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-admin-secret";

if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL environment variable.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

const ORDER_STATUSES = {
  pickup: ["Order placed", "Packed", "Ready for pickup", "Completed"],
  delivery: ["Order placed", "Packed", "Out for delivery", "Delivered"],
};

const seedProducts = [
  {
    name: "Neon Tetra Pack",
    category: "fish",
    price: 18,
    stock: 14,
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
    description: "A peaceful schooling fish bundle for planted community tanks.",
    meta: "Min tank: 15 gal | Temperament: peaceful",
  },
  {
    name: "Betta Starter Kit",
    category: "equipment",
    price: 42,
    stock: 6,
    imageUrl: "https://images.unsplash.com/photo-1520637836862-4d197d17c35a?auto=format&fit=crop&w=1200&q=80",
    description: "Compact setup with filter, light, and conditioner essentials.",
    meta: "Best for beginners | Nano tank ready",
  },
  {
    name: "Java Moss Pad",
    category: "plants",
    price: 9,
    stock: 21,
    imageUrl: "https://images.unsplash.com/photo-1512428813834-c702c7702b78?auto=format&fit=crop&w=1200&q=80",
    description: "Hardy live moss for shrimp tanks, driftwood, and fry cover.",
    meta: "Low light | Beginner friendly",
  },
  {
    name: "Canister Filter Pro",
    category: "equipment",
    price: 95,
    stock: 3,
    imageUrl: "https://images.unsplash.com/photo-1521207418485-99c705420785?auto=format&fit=crop&w=1200&q=80",
    description: "Quiet high-flow filter for clear water in mid-size display tanks.",
    meta: "For 40-75 gal tanks",
  },
  {
    name: "Guppy Color Mix",
    category: "fish",
    price: 16,
    stock: 10,
    imageUrl: "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?auto=format&fit=crop&w=1200&q=80",
    description: "Bright community guppies selected for active, colorful displays.",
    meta: "Livebearer | Great for family tanks",
  },
  {
    name: "Aquascape Care Pack",
    category: "care",
    price: 24,
    stock: 12,
    imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
    description: "Water conditioner, bacteria starter, and algae control in one set.",
    meta: "Weekly maintenance bundle",
  },
  {
    name: "Amazon Sword",
    category: "plants",
    price: 12,
    stock: 8,
    imageUrl: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1200&q=80",
    description: "Lush rooted plant that adds height and movement to freshwater tanks.",
    meta: "Background plant | Moderate growth",
  },
  {
    name: "Home Tank Cleaning Visit",
    category: "care",
    price: 60,
    stock: 5,
    imageUrl: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80",
    description: "Book a maintenance slot for water testing, cleanup, and filter rinsing.",
    meta: "Service slot | In-store team visit",
  },
];

const marketplaceDemoProducts = [
  {
    name: "Wireless Noise-Canceling Headphones",
    category: "electronics",
    price: 2499,
    stock: 18,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    description: "Bluetooth over-ear headphones with deep bass and all-day battery life.",
    meta: "Brand: SonicBeat | Color: Black",
  },
  {
    name: "Smart LED Desk Lamp",
    category: "home",
    price: 899,
    stock: 25,
    imageUrl: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    description: "Touch-controlled desk lamp with brightness levels and USB charging port.",
    meta: "Warm + cool light modes",
  },
  {
    name: "Running Sneakers",
    category: "fashion",
    price: 1899,
    stock: 20,
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    description: "Lightweight everyday sneakers with breathable mesh and cushioned sole.",
    meta: "Sizes: 6-10 | Unisex",
  },
  {
    name: "Herbal Skin Care Kit",
    category: "beauty",
    price: 699,
    stock: 16,
    imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80",
    description: "Face wash, serum, and moisturizer bundle for daily skincare.",
    meta: "Suitable for normal skin",
  },
  {
    name: "Premium Dry Fruits Box",
    category: "grocery",
    price: 1299,
    stock: 14,
    imageUrl: "https://images.unsplash.com/photo-1514517220017-8ce97a34a7b6?auto=format&fit=crop&w=1200&q=80",
    description: "Mixed almonds, cashews, raisins, and pistachios in a gift-ready box.",
    meta: "500g pack",
  },
  {
    name: "Building Blocks Set",
    category: "toys",
    price: 1099,
    stock: 22,
    imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1200&q=80",
    description: "Creative building toy set for kids with colorful pieces and storage box.",
    meta: "Ages 5+",
  },
  {
    name: "Ergonomic Office Chair Cushion",
    category: "office",
    price: 799,
    stock: 19,
    imageUrl: "https://images.unsplash.com/photo-1505843513577-22bb7d21e455?auto=format&fit=crop&w=1200&q=80",
    description: "Memory foam back and seat support cushion for long work hours.",
    meta: "Portable design",
  },
  {
    name: "Yoga Mat Pro",
    category: "sports",
    price: 999,
    stock: 17,
    imageUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80",
    description: "Anti-slip yoga mat with carrying strap for home and studio workouts.",
    meta: "6 mm thickness",
  },
];

app.use(express.json({ limit: "10mb" }));

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((cookies, item) => {
    const [key, ...rest] = item.trim().split("=");
    if (!key) {
      return cookies;
    }

    cookies[key] = decodeURIComponent(rest.join("="));
    return cookies;
  }, {});
}

function createSessionToken() {
  const payload = "admin";
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function isAdminRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.admin_session;
  if (!token) {
    return false;
  }

  const expectedToken = createSessionToken();
  return token === expectedToken;
}

function requireAdmin(req, res, next) {
  if (!isAdminRequest(req)) {
    return res.status(401).json({ error: "Admin login required." });
  }

  next();
}

function sanitizeProduct(product) {
  return {
    name: String(product.name || "").trim(),
    category: String(product.category || "").trim(),
    price: Number(product.price),
    stock: Number(product.stock),
    imageUrl: String(product.imageUrl || "").trim(),
    description: String(product.description || "").trim(),
    meta: String(product.meta || "").trim(),
  };
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      meta TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      fulfillment_type TEXT NOT NULL,
      address TEXT NOT NULL,
      total NUMERIC(10, 2) NOT NULL,
      status_index INTEGER NOT NULL DEFAULT 0,
      items_summary TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const result = await pool.query("SELECT COUNT(*)::int AS count FROM products");
  if (result.rows[0].count === 0) {
    for (const product of seedProducts) {
      await pool.query(
        `
          INSERT INTO products (name, category, price, stock, image_url, description, meta)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [product.name, product.category, product.price, product.stock, product.imageUrl || "", product.description, product.meta]
      );
    }
  }

  for (const product of [...seedProducts, ...marketplaceDemoProducts]) {
    await pool.query(
      `
        UPDATE products
        SET image_url = $2
        WHERE LOWER(name) = LOWER($1) AND COALESCE(image_url, '') = ''
      `,
      [product.name, product.imageUrl || ""]
    );
  }
}

async function getProducts() {
  const result = await pool.query(
    `
      SELECT id::int AS id, name, category, price::float8 AS price, stock, image_url AS "imageUrl", description, meta
      FROM products
      ORDER BY created_at DESC, id DESC
    `
  );
  return result.rows;
}

async function getOrders() {
  const result = await pool.query(
    `
      SELECT
        id::text AS id,
        customer_name AS "customerName",
        fulfillment_type AS "fulfillmentType",
        address,
        total::float8 AS total,
        status_index AS "statusIndex",
        items_summary AS "itemsSummary"
      FROM orders
      ORDER BY created_at DESC, id DESC
    `
  );
  return result.rows;
}

app.get("/", (_req, res) => {
  res.sendFile(INDEX_FILE);
});

app.get("/styles.css", (_req, res) => {
  res.sendFile(STYLES_FILE);
});

app.get("/app.js", (_req, res) => {
  res.sendFile(APP_FILE);
});

app.get("/api/admin/session", (req, res) => {
  res.json({ authenticated: isAdminRequest(req) });
});

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body.password || "");
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Incorrect admin password." });
  }

  const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `admin_session=${createSessionToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secureCookie}`
  );
  res.json({ authenticated: true });
});

app.post("/api/admin/logout", (_req, res) => {
  const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie}`
  );
  res.json({ authenticated: false });
});

app.post("/api/admin/load-marketplace-demo", requireAdmin, async (_req, res) => {
  try {
    for (const product of marketplaceDemoProducts) {
      const existing = await pool.query("SELECT id FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1", [product.name]);
      if (existing.rows.length) {
        continue;
      }

      await pool.query(
        `
          INSERT INTO products (name, category, price, stock, image_url, description, meta)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [product.name, product.category, product.price, product.stock, product.imageUrl || "", product.description, product.meta]
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to load marketplace demo products." });
  }
});

app.get("/api/products", async (_req, res) => {
  try {
    res.json(await getProducts());
  } catch (error) {
    res.status(500).json({ error: "Failed to load products." });
  }
});

app.post("/api/products", requireAdmin, async (req, res) => {
  const product = sanitizeProduct(req.body);

  if (!product.name || !product.category || !product.description || !product.meta) {
    return res.status(400).json({ error: "Missing required product fields." });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO products (name, category, price, stock, image_url, description, meta)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id::int AS id, name, category, price::float8 AS price, stock, image_url AS "imageUrl", description, meta
      `,
      [product.name, product.category, product.price, product.stock, product.imageUrl || "", product.description, product.meta]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create product." });
  }
});

app.patch("/api/products/:id/stock", requireAdmin, async (req, res) => {
  const productId = Number(req.params.id);
  const change = Number(req.body.change || 0);

  try {
    const result = await pool.query(
      `
        UPDATE products
        SET stock = GREATEST(0, stock + $2)
        WHERE id = $1
        RETURNING id::int AS id, name, category, price::float8 AS price, stock, image_url AS "imageUrl", description, meta
      `,
      [productId, change]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update stock." });
  }
});

app.get("/api/orders", requireAdmin, async (_req, res) => {
  try {
    res.json(await getOrders());
  } catch (error) {
    res.status(500).json({ error: "Failed to load orders." });
  }
});

app.post("/api/orders", async (req, res) => {
  const { customerName, fulfillmentType, address, items } = req.body;

  if (!customerName || !address || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Missing order details." });
  }

  if (!ORDER_STATUSES[fulfillmentType]) {
    return res.status(400).json({ error: "Invalid fulfillment type." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderItems = [];
    let total = 0;

    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);

      const productResult = await client.query(
        `
          SELECT id, name, price::float8 AS price, stock
          FROM products
          WHERE id = $1
          FOR UPDATE
        `,
        [productId]
      );

      if (!productResult.rows.length) {
        throw new Error(`Product ${productId} not found.`);
      }

      const product = productResult.rows[0];

      if (quantity <= 0 || quantity > product.stock) {
        throw new Error(`Insufficient stock for ${product.name}.`);
      }

      await client.query("UPDATE products SET stock = stock - $2 WHERE id = $1", [productId, quantity]);

      orderItems.push({
        productId: product.id,
        name: product.name,
        quantity,
        price: product.price,
      });
      total += product.price * quantity;
    }

    const itemsSummary = orderItems.map((item) => `${item.name} x${item.quantity}`).join(", ");

    const orderResult = await client.query(
      `
        INSERT INTO orders (customer_name, fulfillment_type, address, total, status_index, items_summary)
        VALUES ($1, $2, $3, $4, 0, $5)
        RETURNING
          id::text AS id,
          customer_name AS "customerName",
          fulfillment_type AS "fulfillmentType",
          address,
          total::float8 AS total,
          status_index AS "statusIndex",
          items_summary AS "itemsSummary"
      `,
      [String(customerName).trim(), fulfillmentType, String(address).trim(), total, itemsSummary]
    );

    await client.query("COMMIT");
    res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    const message = error.message || "Failed to create order.";
    const status = message.startsWith("Insufficient stock") || message.includes("not found") ? 400 : 500;
    res.status(status).json({ error: message });
  } finally {
    client.release();
  }
});

app.patch("/api/orders/:id/status", requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);
  const direction = Number(req.body.direction || 0);

  try {
    const currentResult = await pool.query(
      `
        SELECT id, fulfillment_type AS "fulfillmentType", status_index AS "statusIndex"
        FROM orders
        WHERE id = $1
      `,
      [orderId]
    );

    if (!currentResult.rows.length) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = currentResult.rows[0];
    const maxIndex = ORDER_STATUSES[order.fulfillmentType].length - 1;
    const nextIndex = Math.min(maxIndex, Math.max(0, order.statusIndex + direction));

    const updatedResult = await pool.query(
      `
        UPDATE orders
        SET status_index = $2
        WHERE id = $1
        RETURNING
          id::text AS id,
          customer_name AS "customerName",
          fulfillment_type AS "fulfillmentType",
          address,
          total::float8 AS total,
          status_index AS "statusIndex",
          items_summary AS "itemsSummary"
      `,
      [orderId, nextIndex]
    );

    res.json(updatedResult.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update order status." });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(INDEX_FILE);
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`karthik server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
