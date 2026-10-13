import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/common.js";
import auth from "./routes/auth.js";
import plans from "./routes/plans.js";
import injury from "./routes/injury.js";
import discomfort from "./routes/discomfort.js";
import acwr from "./routes/acwr.js";
import checkins from "./routes/checkins.js";
import performance from "./routes/performance.js";
import vision from "./routes/vision.js";
import integrations from "./routes/integrations.js";
import community from "./routes/community.js";
import { shopRouter, cartRouter } from "./routes/shop.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cors({ origin: [env.frontendUrl], credentials: false }));
  app.use(express.json({ limit: "200kb" }));

  app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
  app.use("/api/auth", auth);
  app.use("/api/plans", plans);
  app.use("/api/injury", injury);
  app.use("/api/discomfort", discomfort);
  app.use("/api/acwr", acwr);
  app.use("/api/check-ins", checkins);
  app.use("/api/performance", performance);
  app.use("/api/vision", vision);
  app.use("/api/integrations", integrations);
  app.post("/api/healthconnect/sync", (req, res, next) => { req.url = "/healthconnect/sync"; integrations(req, res, next); });   // legacy path used by the shipped Android companion
  app.use("/api/community", community);
  app.use("/api/shop", shopRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api", notFound);

  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/dist");   // single-origin production serving
  if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get("*", (req, res) => res.sendFile(path.join(dist, "index.html"))); }

  app.use(errorHandler);
  return app;
}
