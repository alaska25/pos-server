const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
    setTimeout(connectDB, 5000); // retry after 5 seconds
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected, retrying...');
  setTimeout(connectDB, 5000);
});

module.exports = connectDB;