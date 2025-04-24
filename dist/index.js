var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  cartItems: () => cartItems,
  categories: () => categories,
  insertCartItemSchema: () => insertCartItemSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertOrderItemSchema: () => insertOrderItemSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertProductSchema: () => insertProductSchema,
  insertUserSchema: () => insertUserSchema,
  orderItems: () => orderItems,
  orders: () => orders,
  products: () => products,
  users: () => users
});
import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
var users, insertUserSchema, products, insertProductSchema, cartItems, insertCartItemSchema, categories, insertCategorySchema, orders, insertOrderSchema, orderItems, insertOrderItemSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = sqliteTable("users", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      username: text("username").notNull().unique(),
      email: text("email"),
      password: text("password").notNull(),
      role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`)
    });
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true,
      role: true
    });
    products = sqliteTable("products", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      name: text("name").notNull(),
      description: text("description").notNull(),
      price: real("price").notNull(),
      category: text("category").notNull(),
      subcategory: text("subcategory").notNull(),
      imageUrl: text("image_url").notNull(),
      inStock: integer("in_stock", { mode: "boolean" }).notNull().default(true),
      inventory: integer("inventory").default(0),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
      updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`)
    });
    insertProductSchema = createInsertSchema(products).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    cartItems = sqliteTable("cart_items", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      productId: integer("product_id").notNull().references(() => products.id),
      quantity: integer("quantity").notNull().default(1),
      sessionId: text("session_id").notNull(),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`)
    }, (table) => {
      return {
        productCartIdx: index("product_cart_idx").on(table.productId)
      };
    });
    insertCartItemSchema = createInsertSchema(cartItems).omit({
      id: true,
      createdAt: true
    });
    categories = sqliteTable("categories", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      name: text("name").notNull(),
      parentId: integer("parent_id").references(() => categories.id),
      slug: text("slug").notNull().unique(),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`)
    });
    insertCategorySchema = createInsertSchema(categories).omit({
      id: true,
      createdAt: true
    });
    orders = sqliteTable("orders", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      userId: integer("user_id").references(() => users.id),
      status: text("status", { enum: ["pending", "processing", "shipped", "delivered", "cancelled"] }).default("pending").notNull(),
      total: real("total").notNull(),
      shippingAddress: text("shipping_address"),
      createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`),
      updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`CURRENT_TIMESTAMP`)
    });
    insertOrderSchema = createInsertSchema(orders).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    orderItems = sqliteTable("order_items", {
      id: integer("id").primaryKey({ autoIncrement: true }),
      orderId: integer("order_id").notNull().references(() => orders.id),
      productId: integer("product_id").notNull().references(() => products.id),
      quantity: integer("quantity").notNull(),
      price: real("price").notNull()
    }, (table) => {
      return {
        orderIdx: index("order_idx").on(table.orderId),
        productIdx: index("product_item_idx").on(table.productId)
      };
    });
    insertOrderItemSchema = createInsertSchema(orderItems).omit({
      id: true
    });
  }
});

// server/db.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
var sqlite, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    sqlite = new Database(process.env.DATABASE_URL || "store.db");
    db = drizzle(sqlite, { schema: schema_exports });
  }
});

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSecret = process.env.SESSION_SECRET || "your-secret-key";
  const sessionSettings = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1e3 * 60 * 60 * 24 * 7,
      // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email } = req.body;
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email,
        role: username === "admin" ? "admin" : "user"
      });
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json(user);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
}
var scryptAsync;
var init_auth = __esm({
  "server/auth.ts"() {
    "use strict";
    init_storage();
    scryptAsync = promisify(scrypt);
  }
});

// scripts/seed-data.ts
var seed_data_exports = {};
__export(seed_data_exports, {
  adminUser: () => adminUser,
  newInProducts: () => newInProducts,
  sampleCategories: () => sampleCategories,
  sampleProducts: () => sampleProducts
});
var sampleCategories, sampleProducts, newInProducts, adminUser;
var init_seed_data = __esm({
  async "scripts/seed-data.ts"() {
    "use strict";
    init_auth();
    sampleCategories = [
      { name: "Ladies", parentId: null, slug: "ladies" },
      { name: "Men", parentId: null, slug: "men" },
      { name: "Kids", parentId: null, slug: "kids" },
      { name: "Home", parentId: null, slug: "home" },
      { name: "Shirts & Blouses", parentId: 1, slug: "shirts-blouses" },
      { name: "Linen Shirts", parentId: 1, slug: "linen-shirts" },
      { name: "Shirts", parentId: 1, slug: "shirts" },
      { name: "Blouses", parentId: 1, slug: "blouses" },
      { name: "Denim Shirts", parentId: 1, slug: "denim-shirts" }
    ];
    sampleProducts = [
      {
        name: "Printed linen-blend shirt",
        description: "A stylish printed linen-blend shirt perfect for any occasion.",
        price: 1499,
        category: "ladies",
        subcategory: "linen-shirts",
        imageUrl: "https://image.hm.com/assets/hm/ce/72/ce722545587b01c07aa14ebf1af57c93776372a8.jpg",
        inStock: true
      },
      {
        name: "Printed mini skirt",
        description: "A fashionable printed mini skirt for a trendy look.",
        price: 1299,
        category: "ladies",
        subcategory: "skirts",
        imageUrl: "https://image.hm.com/assets/hm/9d/f3/9df3167cc6bb821fe236013766adf842b049d142.jpg",
        inStock: true
      },
      {
        name: "Scalloped mini dress",
        description: "An elegant scalloped mini dress for special occasions.",
        price: 1999,
        category: "ladies",
        subcategory: "dresses",
        imageUrl: "https://image.hm.com/assets/hm/d1/fa/d1faeb012a403ccc01d6be4305d909bdb33a47f8.jpg",
        inStock: true
      },
      {
        name: "Cotton Embroidered Blouse",
        description: "A light cotton blouse with embroidered details.",
        price: 1299,
        category: "ladies",
        subcategory: "blouses",
        imageUrl: "https://unsplash.com/photos/H8uf5ua5uW4/download?ixid=M3wxMjA3fDB8MXxhbGx8fHx8fHx8fHwxNzQ0ODYwOTgxfA&force=true",
        inStock: true
      },
      {
        name: "Floral Print Blouse",
        description: "A floral print blouse perfect for summer.",
        price: 1499,
        category: "ladies",
        subcategory: "blouses",
        imageUrl: "https://unsplash.com/photos/3I_aBm_xbkw/download?force=true",
        inStock: true
      },
      {
        name: "Lace-back Cotton Blouse",
        description: "A cotton blouse with a beautiful lace back detail.",
        price: 1799,
        category: "ladies",
        subcategory: "blouses",
        imageUrl: "https://unsplash.com/photos/p5C3Ur0HciM/download?ixid=M3wxMjA3fDB8MXxhbGx8fHx8fHx8fHwxNzQ0ODYxMDc4fA&force=true",
        inStock: true
      },
      {
        name: "Oversized Linen Shirt",
        description: "A comfortable oversized linen shirt.",
        price: 1999,
        category: "ladies",
        subcategory: "linen-shirts",
        imageUrl: "https://unsplash.com/photos/u_qeBMfHCbg/download?ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8TGluZW4lMjBTaGlydHxlbnwwfHx8fDE3NDQ4NjEwOTd8MA&force=true",
        inStock: true
      },
      {
        name: "Striped Cotton Blouse",
        description: "A light striped cotton blouse with a classic collar.",
        price: 1399,
        category: "ladies",
        subcategory: "blouses",
        imageUrl: "https://images.unsplash.com/photo-1589810635657-232948472d98?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        inStock: true
      },
      {
        name: "Floral Print Scarf",
        description: "A beautiful floral print scarf to complement your outfit.",
        price: 899,
        category: "ladies",
        subcategory: "accessories",
        imageUrl: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        inStock: true
      },
      {
        name: "Red Sleeveless Dress",
        description: "A stunning red sleeveless dress for special occasions.",
        price: 2499,
        category: "ladies",
        subcategory: "dresses",
        imageUrl: "https://unsplash.com/photos/I_a57bVkkw4/download?ixid=M3wxMjA3fDB8MXxzZWFyY2h8Mnx8UmVkJTIwU2xlZXZlbGVzcyUyMERyZXNzfGVufDB8fHx8MTc0NDg2MTEzNHww&force=true",
        inStock: true
      },
      {
        name: "Red Puff Sleeve Dress",
        description: "An elegant red dress with puff sleeves.",
        price: 2699,
        category: "ladies",
        subcategory: "dresses",
        imageUrl: "https://images.unsplash.com/photo-1580651214613-f4692d6d138f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        inStock: true
      },
      {
        name: "Red Ruffle Dress",
        description: "A beautiful red ruffle dress for special occasions.",
        price: 2599,
        category: "ladies",
        subcategory: "dresses",
        imageUrl: "https://images.unsplash.com/photo-1551048632-24e444b48a3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        inStock: true
      },
      {
        name: "White Cotton Shirt",
        description: "A crisp white cotton shirt, a wardrobe essential.",
        price: 1599,
        category: "ladies",
        subcategory: "shirts",
        imageUrl: "https://unsplash.com/photos/R570zdM32J0/download?ixid=M3wxMjA3fDB8MXxzZWFyY2h8MTB8fFJlZCUyMFNsZWV2ZWxlc3MlMjBEcmVzc3xlbnwwfHx8fDE3NDQ4NjExMzR8MA&force=true",
        inStock: true
      },
      {
        name: "Denim Button-Up Shirt",
        description: "A classic denim button-up shirt.",
        price: 1999,
        category: "ladies",
        subcategory: "denim-shirts",
        imageUrl: "https://images.unsplash.com/photo-1589810635657-232948472d98?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        inStock: true
      },
      {
        name: "Linen Blend Shirt",
        description: "A comfortable linen blend shirt perfect for summer.",
        price: 1799,
        category: "ladies",
        subcategory: "linen-shirts",
        imageUrl: "https://unsplash.com/photos/rpwaDdp0agg/download?ixid=M3wxMjA3fDB8MXxhbGx8fHx8fHx8fHwxNzQ0ODYxMDEwfA&force=true",
        inStock: true
      }
    ];
    newInProducts = [
      {
        name: "Broderie anglaise dress",
        description: "A beautiful broderie anglaise dress with delicate detailing.",
        price: 2499,
        category: "ladies",
        subcategory: "dresses",
        imageUrl: "https://image.hm.com/assets/hm/7a/d5/7ad5c9917ae0114b6dcfcba93df4a9e1182ff0dd.jpg",
        inStock: true
      },
      {
        name: "Oversized T-shirt",
        description: "A comfortable oversized t-shirt for casual wear.",
        price: 799,
        category: "ladies",
        subcategory: "t-shirts",
        imageUrl: "https://image.hm.com/assets/hm/98/1a/981aa526a27f2ea98ad60a547805217bafe24b89.jpg",
        inStock: true
      },
      {
        name: "Poplin maxi skirt",
        description: "An elegant poplin maxi skirt for a sophisticated look.",
        price: 1999,
        category: "ladies",
        subcategory: "skirts",
        imageUrl: "https://image.hm.com/assets/hm/5a/9e/5a9ecd40f003bf10e1656cd1264f1308085aff54.jpg",
        inStock: true
      },
      {
        name: "Cropped poplin top",
        description: "A stylish cropped poplin top perfect for summer.",
        price: 1299,
        category: "ladies",
        subcategory: "tops",
        imageUrl: "https://image.hm.com/assets/hm/b9/54/b954598aa2c2324c33ed29672ad367573e9f7046.jpg",
        inStock: true
      },
      {
        name: "Printed satin scarf",
        description: "A luxurious printed satin scarf to elevate any outfit.",
        price: 899,
        category: "ladies",
        subcategory: "accessories",
        imageUrl: "https://image.hm.com/assets/hm/f3/8a/f38ad697361b02e423993c883db347f2b757b98a.jpg",
        inStock: true
      },
      {
        name: "Bow-back dress",
        description: "An elegant dress with a beautiful bow detail at the back.",
        price: 2299,
        category: "ladies",
        subcategory: "dresses",
        imageUrl: "https://image.hm.com/assets/hm/08/d0/08d034e94db78663ffc9ca9d1ab138f787bf83dc.jpg",
        inStock: true
      },
      {
        name: "Broderie anglaise-detail dress",
        description: "A stunning dress with broderie anglaise detailing.",
        price: 2699,
        category: "ladies",
        subcategory: "dresses",
        imageUrl: "https://image.hm.com/assets/hm/f3/17/f3176f33f09c1dccfbf05126d665cc185575d386.jpg",
        inStock: true
      },
      {
        name: "Broderie anglaise-sleeved dress",
        description: "A charming dress with broderie anglaise sleeves.",
        price: 2499,
        category: "ladies",
        subcategory: "dresses",
        imageUrl: "https://image.hm.com/assets/hm/13/5f/135f111c73b65873cc5272bfaa99ab572e768070.jpg",
        inStock: true
      },
      {
        name: "Linen-blend trousers",
        description: "Comfortable and stylish linen-blend trousers.",
        price: 1799,
        category: "ladies",
        subcategory: "trousers",
        imageUrl: "https://image.hm.com/assets/hm/bf/54/bf54e0a9ba3e30ffebbf2cd28bd336ef7e8083ea.jpg",
        inStock: true
      }
    ];
    adminUser = {
      username: "admin",
      password: await hashPassword("admin123"),
      email: "admin@example.com",
      role: "admin"
    };
  }
});

// server/sqlite-storage.ts
import { eq, and, sql as sql2 } from "drizzle-orm";
import session2 from "express-session";
import createMemoryStore from "memorystore";
var MemoryStore, SQLiteStorage;
var init_sqlite_storage = __esm({
  "server/sqlite-storage.ts"() {
    "use strict";
    init_db();
    init_schema();
    MemoryStore = createMemoryStore(session2);
    SQLiteStorage = class {
      sessionStore;
      constructor() {
        this.sessionStore = new MemoryStore({
          checkPeriod: 864e5
          // prune expired entries every 24h
        });
        this.initializeData().catch((err) => {
          console.error("Failed to initialize database:", err);
          process.exit(1);
        });
        db.run(sql2`PRAGMA foreign_keys = ON;`);
      }
      async initializeData() {
        try {
          const { adminUser: adminUser2, sampleCategories: sampleCategories2, sampleProducts: sampleProducts2 } = await init_seed_data().then(() => seed_data_exports);
          const existingAdmin = await this.getUserByUsername("admin");
          if (!existingAdmin) {
            await this.createUser(adminUser2);
          }
          const existingCategories = await this.getAllCategories();
          if (existingCategories.length === 0) {
            for (const category of sampleCategories2) {
              await this.createCategory(category);
            }
          }
          const existingProducts = await this.getAllProducts();
          if (existingProducts.length === 0) {
            for (const product of sampleProducts2) {
              await this.createProduct(product);
            }
          }
        } catch (error) {
          console.error("Error initializing database:", error);
          throw error;
        }
      }
      // User Methods
      async getUserByUsername(username) {
        const result = await db.select().from(users).where(eq(users.username, username));
        return result[0];
      }
      async getUser(id) {
        const result = await db.select().from(users).where(eq(users.id, id));
        return result[0];
      }
      async getAllUsers() {
        return await db.select().from(users);
      }
      async createUser(user) {
        const result = await db.insert(users).values(user).returning();
        return result[0];
      }
      async updateUser(id, userData) {
        const result = await db.update(users).set(userData).where(eq(users.id, id)).returning();
        return result[0];
      }
      async deleteUser(id) {
        const result = await db.delete(users).where(eq(users.id, id));
        return result.changes > 0;
      }
      // Product Methods
      async getAllProducts() {
        return await db.select().from(products);
      }
      async getProductById(id) {
        const result = await db.select().from(products).where(eq(products.id, id));
        return result[0];
      }
      async getProductsByCategory(category) {
        return await db.select().from(products).where(eq(products.category, category));
      }
      async getProductsBySubCategory(subcategory) {
        return await db.select().from(products).where(eq(products.subcategory, subcategory));
      }
      async createProduct(product) {
        const result = await db.insert(products).values(product).returning();
        return result[0];
      }
      async updateProduct(id, productData) {
        const result = await db.update(products).set(productData).where(eq(products.id, id)).returning();
        return result[0];
      }
      async deleteProduct(id) {
        const result = await db.delete(products).where(eq(products.id, id));
        return result.changes > 0;
      }
      // Cart Methods
      async getCartItems(sessionId) {
        const items = await db.select().from(cartItems).where(eq(cartItems.sessionId, sessionId));
        const itemsWithProduct = [];
        for (const item of items) {
          const product = await this.getProductById(item.productId);
          if (product) {
            itemsWithProduct.push({ ...item, product });
          }
        }
        return itemsWithProduct;
      }
      async getCartItemById(id) {
        const result = await db.select().from(cartItems).where(eq(cartItems.id, id));
        return result[0];
      }
      async addToCart(cartItem) {
        const existingItem = await db.select().from(cartItems).where(
          and(
            eq(cartItems.productId, cartItem.productId),
            eq(cartItems.sessionId, cartItem.sessionId)
          )
        );
        if (existingItem.length > 0) {
          const updatedItem = await db.update(cartItems).set({ quantity: existingItem[0].quantity + cartItem.quantity }).where(eq(cartItems.id, existingItem[0].id)).returning();
          return updatedItem[0];
        }
        const result = await db.insert(cartItems).values(cartItem).returning();
        return result[0];
      }
      async updateCartItem(id, quantity) {
        if (quantity <= 0) {
          await this.removeFromCart(id);
          return void 0;
        }
        const result = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
        return result[0];
      }
      async removeFromCart(id) {
        const result = await db.delete(cartItems).where(eq(cartItems.id, id));
        return result.changes > 0;
      }
      async clearCart(sessionId) {
        const result = await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
        return result.changes > 0;
      }
      // Category Methods
      async getAllCategories() {
        return await db.select().from(categories);
      }
      async getCategoryBySlug(slug) {
        const result = await db.select().from(categories).where(eq(categories.slug, slug));
        return result[0];
      }
      async createCategory(category) {
        const result = await db.insert(categories).values(category).returning();
        return result[0];
      }
      // Order Methods
      async getAllOrders() {
        return await db.select().from(orders);
      }
      async getOrderById(id) {
        const result = await db.select().from(orders).where(eq(orders.id, id));
        return result[0];
      }
      async getUserOrders(userId) {
        return await db.select().from(orders).where(eq(orders.userId, userId));
      }
      async createOrder(order) {
        const result = await db.insert(orders).values(order).returning();
        return result[0];
      }
      async updateOrderStatus(id, status) {
        const result = await db.update(orders).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(orders.id, id)).returning();
        return result[0];
      }
      // Order Item Methods
      async getOrderItems(orderId) {
        return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      }
      async createOrderItem(orderItem) {
        const result = await db.insert(orderItems).values(orderItem).returning();
        return result[0];
      }
    };
  }
});

// server/storage.ts
import session3 from "express-session";
import createMemoryStore2 from "memorystore";
var MemoryStore2, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_sqlite_storage();
    MemoryStore2 = createMemoryStore2(session3);
    storage = new SQLiteStorage();
  }
});

// server/index.ts
import express3 from "express";

// server/routes.ts
init_storage();
init_auth();
init_schema();
import express from "express";
import { createServer } from "http";
import { z } from "zod";
async function registerRoutes(app2) {
  setupAuth(app2);
  const apiRouter = express.Router();
  apiRouter.get("/products", async (req, res) => {
    try {
      const category = req.query.category;
      const subcategory = req.query.subcategory;
      let products2;
      if (subcategory) {
        products2 = await storage.getProductsBySubCategory(subcategory);
      } else if (category) {
        products2 = await storage.getProductsByCategory(category);
      } else {
        products2 = await storage.getAllProducts();
      }
      res.json(products2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });
  apiRouter.get("/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const product = await storage.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });
  apiRouter.post("/products", isAdmin, async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating product" });
    }
  });
  apiRouter.put("/products/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const updatedProduct = await storage.updateProduct(id, req.body);
      if (!updatedProduct) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(updatedProduct);
    } catch (error) {
      res.status(500).json({ message: "Error updating product" });
    }
  });
  apiRouter.delete("/products/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }
      const success = await storage.deleteProduct(id);
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting product" });
    }
  });
  apiRouter.get("/categories", async (req, res) => {
    try {
      const categories2 = await storage.getAllCategories();
      res.json(categories2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  apiRouter.get("/categories/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      const category = await storage.getCategoryBySlug(slug);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });
  apiRouter.post("/categories", isAdmin, async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating category" });
    }
  });
  apiRouter.put("/categories/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      const category = await storage.getCategoryBySlug(req.body.slug);
      if (category && category.id !== id) {
        return res.status(400).json({ message: "Slug already exists" });
      }
      const updatedCategory = { id, ...req.body };
      res.json(updatedCategory);
    } catch (error) {
      res.status(500).json({ message: "Error updating category" });
    }
  });
  apiRouter.delete("/categories/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting category" });
    }
  });
  apiRouter.get("/cart", async (req, res) => {
    try {
      const sessionId = req.session.id || "guest-session";
      const cartItems2 = await storage.getCartItems(sessionId);
      res.json(cartItems2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch cart items" });
    }
  });
  apiRouter.post("/cart", async (req, res) => {
    try {
      const result = insertCartItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid cart item data" });
      }
      const sessionId = req.session.id || "guest-session";
      const cartItem = await storage.addToCart({
        ...result.data,
        sessionId
      });
      res.status(201).json(cartItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to add item to cart" });
    }
  });
  apiRouter.put("/cart/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cart item ID" });
      }
      const quantitySchema = z.object({
        quantity: z.number().int().positive()
      });
      const result = quantitySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid quantity" });
      }
      const updatedItem = await storage.updateCartItem(id, result.data.quantity);
      if (!updatedItem) {
        return res.status(404).json({ message: "Cart item not found or removed" });
      }
      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });
  apiRouter.delete("/cart/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid cart item ID" });
      }
      const success = await storage.removeFromCart(id);
      if (!success) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove cart item" });
    }
  });
  apiRouter.delete("/cart", async (req, res) => {
    try {
      const sessionId = req.session.id || "guest-session";
      await storage.clearCart(sessionId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });
  apiRouter.get("/users", isAdmin, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      res.json(users2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  apiRouter.post("/users", isAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });
  apiRouter.put("/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const adminUser2 = req.user;
      if (id === adminUser2.id) {
        return res.status(403).json({ message: "Cannot modify your own admin account" });
      }
      const updatedUser = await storage.updateUser(id, req.body);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Error updating user" });
    }
  });
  apiRouter.delete("/users/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      const adminUser2 = req.user;
      if (id === adminUser2.id) {
        return res.status(403).json({ message: "Cannot delete your own admin account" });
      }
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting user" });
    }
  });
  apiRouter.get("/orders", isAdmin, async (req, res) => {
    try {
      const orders2 = await storage.getAllOrders();
      res.json(orders2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders" });
    }
  });
  apiRouter.get("/orders/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      const order = await storage.getOrderById(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Error fetching order" });
    }
  });
  apiRouter.get("/orders/:id/items", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      const orderItems2 = await storage.getOrderItems(id);
      res.json(orderItems2);
    } catch (error) {
      res.status(500).json({ message: "Error fetching order items" });
    }
  });
  apiRouter.put("/orders/:id/status", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      const { status } = req.body;
      if (!["pending", "processing", "shipped", "delivered", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const updatedOrder = await storage.updateOrderStatus(id, status);
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(updatedOrder);
    } catch (error) {
      res.status(500).json({ message: "Error updating order status" });
    }
  });
  app2.use("/api", apiRouter);
  const httpServer = createServer(app2);
  return httpServer;
}
function isAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = req.user;
  if (user.role !== "admin") {
    return res.status(403).json({ message: "Not authorized" });
  }
  next();
}

// server/vite.ts
import express2 from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express2.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express3();
app.use(express3.json());
app.use(express3.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0"
    // reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
