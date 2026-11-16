// Local dev entry point. On Vercel this file is NOT used —
// Vercel calls api/index.js instead (see vercel.json).
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SSHB Online (Node starter) listening on http://localhost:${PORT}`);
  console.log(`  Home:      http://localhost:${PORT}/`);
  console.log(`  API menu:  http://localhost:${PORT}/api/menu`);
  console.log(`  Health:    http://localhost:${PORT}/api/health`);
});
