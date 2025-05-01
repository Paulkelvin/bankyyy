import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(express.json());

// Define your routes here

app.use(errorHandler);

export default app;