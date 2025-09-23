// server.js  — writes to climate_experiment.runs
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json({ limit: "10mb" }));

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME     = process.env.DB_NAME || "climate_experiment";
const COLL_NAME   = process.env.COLL_NAME || "runs";
const PORT        = process.env.PORT || 3000;

if (!MONGODB_URI) {
  console.error(" Missing MONGODB_URI in .env");
  process.exit(1);
}


mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    dbName: DB_NAME,           
  })
  .then(() => console.log("✅ Mongoose connected"))
  .catch(err => {
    console.error(" Mongoose connection failed:", err.message);
    process.exit(1);
  });


const runSchema = new mongoose.Schema({}, { strict: false, collection: COLL_NAME });
const Run = mongoose.model("Run", runSchema);


app.use(express.static(path.join(__dirname, "public")));

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


app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🗄️  Writing to ${DB_NAME}.${COLL_NAME}`);
});
