# AegisFit (MERN)

MongoDB · Express · React 18 + Vite + Tailwind · Node. Matches the project report's architecture.

## Run
```bash
npm run install:all
cp backend/.env.example backend/.env      # set MONGODB_URI, JWT_SECRET (optional: SMTP, API keys)
npm run dev:backend                       # API on :5000 (seeds sample communities on first start)
npm run dev:frontend                      # UI on :5173 (proxies /api)
npm test                                  # 34 backend + 13 biomechanics tests (no database needed)
```
Production: `npm run build && npm start` serves the built UI from the API on :5000.
Email: with no `SMTP_HOST` the server uses an Ethereal test inbox; the preview link is shown on the verify screen and printed in the server log.

## Report -> code map
| Report section | Where |
|---|---|
| Auth: bcrypt(10), JWT 7d, login rate-limit, email verification (Nodemailer) | `backend/src/routes/auth.js`, `middleware/`, `services/mailer.js` |
| AI Plan Engine (BMR/TDEE/macros/micros, Indian meals, weekly split; optional LLM personalisation) | `services/aiPlanEngine.js` |
| ACWR via MongoDB aggregation, rolling + EWMA | `services/acwrService.js` |
| Decision Engine (TRAIN/MODIFY/POSTPONE/RECOVERY, traceable rule ids) | `services/decisionEngine.js` |
| Discomfort Engine, exercise->anatomy map, alternatives, recurrence | `services/discomfortEngine.js`, `data/exerciseMap.js` |
| 3D Anatomical Mapper (React Three Fiber, GLB, raycast picking) | `frontend/src/components/SkeletonModel.jsx`, `public/models/skeleton.glb` (`tools/generate_skeleton.py`) |
| AI Vision Trainer (MediaPipe, Web Worker, 8 exercises, ROM/alignment/stability/tempo/consistency, fatigue) | `frontend/src/biomechanics/` |
| Wearables: Strava/Fitbit/Garmin OAuth, Apple Health & Health Connect pairing, idempotent sync, AES-256-GCM token storage | `services/providers.js`, `wearableSync.js`, `routes/integrations.js`, `android/` |
| Recovery analytics (heatmap, readiness/ACWR trends, consistency, decision history) | `services/recoveryService.js`, `pages/Recovery.jsx` |
| Connect (22 cities, 12 sports, radius filter, haversine distance) / Store (activity-category-budget-skill filters, live price refresh, cart) | `routes/community.js`, `routes/shop.js`, `data/storeCatalog.js` |

## Things to know
- **Sample data:** the 132 seeded communities are generated placeholders (`isSample: true`), not real clubs.
- **Sandbox wearables:** providers without OAuth credentials connect in a clearly-labelled sandbox mode (3 sample activities) when `ALLOW_DEMO_WEARABLES=true`.
- **Garmin** is partner-gated; its adapter follows the documented shape but has not been run against a live account. **Apple Health** needs a native iOS companion that this repo does not include.
- Micronutrient reference values follow ICMR-NIN 2020 (approximate): verify before clinical use.

## GUI (matches the report's Figures 4.5 - 5.2)
Top navigation: Dashboard · Connect · Devices · AI Form Check · 3D Injury Map · Equipment Store · Logout. Routes: `/login`, `/dashboard`, `/connect`, `/devices`, `/form-check`, `/injury-map`, `/store`, `/plan`.
The AI Form Check offers the 8 exercises of Fig 4.7 (Squat, Push-up, Bicep Curl, Plank, Lunge, Shoulder Press, Deadlift, Jumping Jack). Quality score weights: ROM 25 %, Alignment 25 %, Stability 20 %, Tempo 15 %, Consistency 15 %.

## AI camera troubleshooting
The pose runtime and model are shipped locally (`frontend/public/mediapipe`, `frontend/public/models`), so the camera needs no internet. If it fails, the red status line under the camera says why:
- **Permission blocked**: click the camera icon in the address bar -> Allow.
- **Camera in use**: close Zoom/Teams/other tabs.
- **Page reloads when you press Start (dev mode)**: fixed by `optimizeDeps` in `vite.config.js`; restart `npm run dev:frontend` once.
- Use Chrome/Edge on `http://localhost:5173` (a plain LAN IP is not a secure context, so browsers block the camera).
The line "Engine: local model · GPU/CPU · runtime local" under the buttons confirms what loaded.
