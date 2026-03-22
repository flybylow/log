import dotenv from "dotenv";
import { app } from "./app";

dotenv.config();

// Default 3001 so local dev can run next to Next.js (3000). Set PORT in .env for hosting.
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`dpp-event running on :${PORT}`);
  console.log(`  GET  /          - React graph UI (static from frontend/dist)`);
  console.log(`  GET  /api/timeline - JSON timeline`);
  console.log(`  POST /events  - submit EPCIS event`);
  console.log(`  GET  /graph   - Turtle knowledge graph`);
  console.log(`  GET  /status  - service health`);
});
