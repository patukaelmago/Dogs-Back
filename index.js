require('dotenv').config();
const server = require('./src/app.js');
const { conn } = require('./src/db.js');
const port = process.env.PORT || 3001;

// Preserve user-created breeds across deploys and service restarts.
conn.sync().then(() => {
  server.listen(port, () => {
    console.log(`Server raised on port ${port}`);
  });
}).catch((error) => {
  // Avoid logging database URLs or credentials.
  const connectionValue = process.env.DATABASE_URL || process.env.DB_DEPLOY;
  let provider = 'local or individual DB variables';
  if (connectionValue) {
    try {
      const host = new URL(connectionValue).hostname;
      // Only the public provider domain is logged, never credentials or a resource hostname.
      provider = host.split('.').slice(-2).join('.');
    } catch (_) {
      provider = 'invalid connection URL';
    }
  }
  const cause = error.original || error;
  const reason = cause.message === 'Connection terminated unexpectedly'
    ? 'Connection terminated unexpectedly' : (cause.code || error.name);
  console.error('Database initialization failed:', { provider, reason, runtime: process.version });
  process.exitCode = 1;
});
