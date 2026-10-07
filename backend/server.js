require('dotenv').config();

const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

let server;



const startServer = async () => {
  try {
    await connectDB();
    server = app.listen(PORT, () => {
      console.log(`[server] Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[server] Failed to start server:', err);
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  console.log('[server] Shutting down gracefully...');
  if (server) {
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

startServer();
