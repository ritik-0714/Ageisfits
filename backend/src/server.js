import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { createApp } from "./app.js";
import { Community } from "./models/Community.js";
import { buildSeed } from "./data/communitySeed.js";

await connectDb();
if ((await Community.estimatedDocumentCount()) === 0) { await Community.insertMany(buildSeed()); console.log("Seeded sample communities for 22 cities"); }
createApp().listen(env.port, () => console.log(`AegisFit API -> http://localhost:${env.port}`));
