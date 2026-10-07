const mongoose = require('mongoose');

/**
 * MongoDB connection (single source of truth for the whole backend).
 *
 * Uses Mongoose as the ODM. The URI is always taken from the environment so the
 * same code works against a local `mongod` instance or MongoDB Atlas.
 *
 *   local : MONGO_URI=mongodb://localhost:27017/corporate_access
 *   atlas : MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>
 */

const DEFAULT_LOCAL_URI = 'mongodb://localhost:27017/corporate_access';

// Fail fast instead of buffering queries for 10s and then timing out.
mongoose.set('strictQuery', true);

let isConnected = false;

const connectDB = async (uri = process.env.MONGO_URI) => {
  const mongoUri = uri || DEFAULT_LOCAL_URI;

  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      // Keep connection pool modest for an internal tool.
      maxPoolSize: 20,
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    isConnected = true;

    console.log(
      `[db] MongoDB connected -> host=${conn.connection.host} db=${conn.connection.name}`
    );

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('[db] MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`[db] MongoDB connection error: ${err.message}`);
    });

    return conn;
  } catch (error) {
    console.error(`[db] Unable to connect to MongoDB: ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.connection.close();
  isConnected = false;
  console.log('[db] MongoDB connection closed');
};

module.exports = { connectDB, disconnectDB, DEFAULT_LOCAL_URI };
