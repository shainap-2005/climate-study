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

let Run = null; // Will be null if no DB connection

if (!MONGODB_URI) {
  console.warn("⚠️  No MONGODB_URI found - running in LOCAL MODE (data will NOT be saved)");
} else {
  // --- DB Connect (only if MONGODB_URI is provided)
  mongoose.connect(MONGODB_URI, {
    dbName: DB_NAME,
    serverSelectionTimeoutMS: 20000,
    family: 4, // force IPv4 (helps on some networks)
  })
  .then(() => {
    console.log("✅ Mongoose connected");
    // Schemaless collection to capture raw jsPsych output
    const runSchema = new mongoose.Schema({}, { strict: false, collection: COLL_NAME });
    Run = mongoose.model("Run", runSchema);
  })
  .catch(err => {
    console.error("❌ Mongoose connection failed:", err.message);
    console.warn("⚠️  Continuing in LOCAL MODE (data will NOT be saved)");
  });
}

// --- Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public"))); // if you later add /public/*
app.use(express.static(__dirname)); // serve root-level files (e.g., sequential_climate.html, CSVs)

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
    
    if (Run) {
      // Database is connected - save data
      const doc = await Run.create({ created_at: new Date(), ...payload });
      console.log("✅ Data saved to database - ID:", String(doc._id), "| Condition:", payload.meta?.condition);
      res.status(201).json({ ok: true, id: String(doc._id) });
    } else {
      // No database - just log and return success (local testing mode)
      console.log("📝 Data received (not saved - local mode):", {
        condition: payload.meta?.condition,
        dataset: payload.meta?.dataset_file,
        trials: Array.isArray(payload.json) ? payload.json.length : "unknown"
      });
      res.status(201).json({ ok: true, id: "local-test-mode" });
    }
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
