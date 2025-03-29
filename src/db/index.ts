import mongoose from 'mongoose';
import { config } from '../config';

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

export const connectDB = async (retryCount = 0): Promise<void> => {
    try {
        if (!config.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }

        await mongoose.connect(config.MONGODB_URI);
        console.log('Connected to MongoDB successfully');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        
        if (retryCount < MAX_RETRIES) {
            console.log(`Retrying MongoDB connection in ${RETRY_DELAY/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return connectDB(retryCount + 1);
        }
        
        throw error;
    }
};

// Handle MongoDB connection errors
mongoose.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
});

mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
}); 