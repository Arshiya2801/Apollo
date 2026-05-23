import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import path from 'path';

dns.setServers(['8.8.8.8', '8.8.4.4']); // Fix for querySrv ECONNREFUSED on some networks

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('⚠️  MONGO_URI is missing in .env file. Database will not connect.');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
