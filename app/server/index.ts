// DealSpine API server — Express on port 8791 (vite dev proxies /api here).
import { openDb } from "./db";
import { createApp } from "./app";

const PORT = Number(process.env.DEALSPINE_API_PORT ?? 8791);

const db = openDb();
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`[dealspine] api listening on http://localhost:${PORT}`);
});
