import dotenv from "dotenv";
import { app } from "./app";

dotenv.config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`dpp-event running on :${PORT}`);
  console.log(`  GET  /          - HTML dashboard + timeline`);
  console.log(`  GET  /api/timeline - JSON timeline`);
  console.log(`  POST /events  - submit EPCIS event`);
  console.log(`  GET  /graph   - Turtle knowledge graph`);
  console.log(`  GET  /status  - service health`);
});
