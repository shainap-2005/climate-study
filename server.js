// server.js — serves jsPsych pages and writes to MongoDB (DB: climate_experiment, Coll: runs)
const express  = require("express");
const path     = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const app  = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME     = process.env.DB_NAME     || "climate_experiment";
const COLL_NAME   = process.env.COLL_NAME   || "runs";

if (!MONGODB_URI) {
  console.error("❌ Missing MONGODB_URI in .env");
  process.exit(1);
}

// --- Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public"))); // serves /public/** (e.g., /stimuli/*.csv)

// --- DB Connect (longer timeout + IPv4 helps on some networks)
mongoose.connect(MONGODB_URI, {
  dbName: DB_NAME,
  serverSelectionTimeoutMS: 20000,
  family: 4,
})
.then(() => console.log("✅ Mongoose connected"))
.catch(err => {
  console.error("❌ Mongoose connection failed:", err.message);
  process.exit(1);
});

// Schemaless collection to capture raw jsPsych output
const runSchema = new mongoose.Schema({}, { strict: false, collection: COLL_NAME });
const Run = mongoose.model("Run", runSchema);

// --- Page Routes
// Serve the experiment at '/' so Render root works immediately.
// If you prefer a landing page, create public/views/index.html and change this route.
app.get("/", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "views", "sequential_climate.html"))
);

app.get("/experiment", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "views", "sequential_climate.html"))
);

app.get("/finish", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "views", "finish.html"))
);

// --- API: Receive jsPsych data
// Accepts body as either { meta, json, csv } or an array of trial rows
app.post("/experiment-data", async (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? { rows: req.body } : req.body;
    const doc = await Run.create({ created_at: new Date(), ...payload });
    res.status(201).json({ ok: true, id: String(doc._id) });
  } catch (err) {
    console.error("❌ Insert failed:", err);
    res.status(500).json({ ok: false, error: "DB insert failed" });
  }
});

// --- Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- 404 fallback
app.use((_req, res) => res.status(404).json({ ok: false, error: "Not found" }));

// --- Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🗄️  Writing to ${DB_NAME}.${COLL_NAME}`);
});

public/views/sequential_climate.html

