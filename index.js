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
  console.error('Database initialization failed:', error.name, error.original?.code || '');
  process.exitCode = 1;
});
