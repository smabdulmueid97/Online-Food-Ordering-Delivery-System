// Vercel serverless entry point.
// vercel.json rewrites every non-static request here, and this module
// exports the same Express app that server.js runs locally.
const app = require('../app');

module.exports = app;
