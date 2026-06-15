import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`[macula-backend] listening on http://localhost:${config.port}`);
  console.log(`[macula-backend] storage dir: ${config.storageDir}`);
});
