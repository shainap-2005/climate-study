// server.js  — writes to climate_experiment.runs
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME     = process.env.DB_NAME || "climate_experiment";
const COLL_NAME   = process.env.COLL_NAME || "runs";
const PORT        = process.env.PORT || 3000;

if (!MONGODB_URI) {
  console.error("❌ Missing MONGODB_URI in .env");
  process.exit(1);
}

// --- Connect to Atlas and pin the database name ---
mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    dbName: DB_NAME,            // <-- this ensures the DB is climate_experiment
  })
  .then(() => console.log("✅ Mongoose connected"))
  .catch(err => {
    console.error("❌ Mongoose connection failed:", err.message);
    process.exit(1);
  });

// --- Loose schema; force collection name to 'runs' ---
const runSchema = new mongoose.Schema({}, { strict: false, collection: COLL_NAME });
// The third arg also locks the collection explicitly (either works):
// const Run = mongoose.model("Run", runSchema, COLL_NAME);
const Run = mongoose.model("Run", runSchema);

//
// Static hosting — serve your experiment
//
app.use(express.static(path.join(__dirname, "public")));
// If your HTML isn’t in /public, use this instead:
// app.use(express.static(__dirname));
// app.get("/", (req, res) => res.sendFile(path.join(__dirname, "sequential_climate.html")));

//
// Tutorial-style endpoint: store JSON + CSV + meta
//
app.post("/experiment-data", async (req, res) => {
  try {
    const doc = await Run.create({
      created_at: new Date(),
      ...req.body, // expects { meta, json, csv }
    });
    res.json({ ok: true, id: String(doc._id) });
  } catch (err) {
    console.error("❌ Insert failed:", err);
    res.status(500).json({ ok: false, error: "DB insert failed" });
  }
});

// quick health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🗄️  Writing to ${DB_NAME}.${COLL_NAME}`);
});
