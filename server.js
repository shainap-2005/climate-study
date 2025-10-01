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
app.use(express.static(path.join(__dirname, "public"))); // if you later add /public/*
app.use(express.static(__dirname)); // serve root-level files (e.g., sequential_climate.html, CSVs)

// --- DB Connect
mongoose.connect(MONGODB_URI, {
  dbName: DB_NAME,
  serverSelectionTimeoutMS: 20000,
  family: 4, // force IPv4 (helps on some networks)
})
.then(() => console.log("✅ Mongoose connected"))
.catch(err => {
  console.error("❌ Mongoose connection failed:", err.message);
  process.exit(1);
});

// Schemaless collection to capture raw jsPsych output
const runSchema = new mongoose.Schema({}, { strict: false, collection: COLL_NAME });
const Run = mongoose.model("Run", runSchema);

// --- Page Routes (root serves your experiment directly from repo root)
app.get("/", (_req, res) =>
  res.sendFile(path.join(__dirname, "sequential_climate.html"))
);

app.get("/experiment", (_req, res) =>
  res.sendFile(path.join(__dirname, "sequential_climate.html"))
);

// Simple finish page (use a file if you add one later)
app.get("/finish", (_req, res) => {
  res.send("<!doctype html><html><body><h1>Thanks — all done!</h1></body></html>");
});

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
