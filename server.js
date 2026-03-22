const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
const INDEX_FILE = path.join(__dirname, "index.html");
const STYLES_FILE = path.join(__dirname, "styles.css");
const APP_FILE = path.join(__dirname, "app.js");
const DATABASE_URL = process.env.DATABASE_URL;

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
    description: "A peaceful schooling fish bundle for planted community tanks.",
    meta: "Min tank: 15 gal | Temperament: peaceful",
  },
  {
    name: "Betta Starter Kit",
    category: "equipment",
    price: 42,
    stock: 6,
    description: "Compact setup with filter, light, and conditioner essentials.",
    meta: "Best for beginners | Nano tank ready",
  },
  {
    name: "Java Moss Pad",
    category: "plants",
    price: 9,
    stock: 21,
    description: "Hardy live moss for shrimp tanks, driftwood, and fry cover.",
    meta: "Low light | Beginner friendly",
  },
  {
    name: "Canister Filter Pro",
    category: "equipment",
    price: 95,
    stock: 3,
    description: "Quiet high-flow filter for clear water in mid-size display tanks.",
    meta: "For 40-75 gal tanks",
  },
  {
    name: "Guppy Color Mix",
    category: "fish",
    price: 16,
    stock: 10,
    description: "Bright community guppies selected for active, colorful displays.",
    meta: "Livebearer | Great for family tanks",
  },
  {
    name: "Aquascape Care Pack",
    category: "care",
    price: 24,
    stock: 12,
    description: "Water conditioner, bacteria starter, and algae control in one set.",
    meta: "Weekly maintenance bundle",
  },
  {
    name: "Amazon Sword",
    category: "plants",
    price: 12,
    stock: 8,
    description: "Lush rooted plant that adds height and movement to freshwater tanks.",
    meta: "Background plant | Moderate growth",
  },
  {
    name: "Home Tank Cleaning Visit",
    category: "care",
    price: 60,
    stock: 5,
    description: "Book a maintenance slot for water testing, cleanup, and filter rinsing.",
    meta: "Service slot | In-store team visit",
  },
];

app.use(express.json());

function sanitizeProduct(product) {
  return {
    name: String(product.name || "").trim(),
    category: String(product.category || "").trim(),
    price: Number(product.price),
    stock: Number(product.stock),
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
      description TEXT NOT NULL,
      meta TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
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
  if (result.rows[0].count > 0) {
    return;
  }

  for (const product of seedProducts) {
    await pool.query(
      `
        INSERT INTO products (name, category, price, stock, description, meta)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [product.name, product.category, product.price, product.stock, product.description, product.meta]
    );
  }
}

async function getProducts() {
  const result = await pool.query(
    `
      SELECT id::int AS id, name, category, price::float8 AS price, stock, description, meta
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

app.get("/api/products", async (_req, res) => {
  try {
    res.json(await getProducts());
  } catch (error) {
    res.status(500).json({ error: "Failed to load products." });
  }
});

app.post("/api/products", async (req, res) => {
  const product = sanitizeProduct(req.body);

  if (!product.name || !product.category || !product.description || !product.meta) {
    return res.status(400).json({ error: "Missing required product fields." });
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO products (name, category, price, stock, description, meta)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id::int AS id, name, category, price::float8 AS price, stock, description, meta
      `,
      [product.name, product.category, product.price, product.stock, product.description, product.meta]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create product." });
  }
});

app.patch("/api/products/:id/stock", async (req, res) => {
  const productId = Number(req.params.id);
  const change = Number(req.body.change || 0);

  try {
    const result = await pool.query(
      `
        UPDATE products
        SET stock = GREATEST(0, stock + $2)
        WHERE id = $1
        RETURNING id::int AS id, name, category, price::float8 AS price, stock, description, meta
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

app.get("/api/orders", async (_req, res) => {
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

app.patch("/api/orders/:id/status", async (req, res) => {
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
