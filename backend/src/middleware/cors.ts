import cors from 'cors';

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

export const corsMiddleware = cors({
  origin: frontendUrl,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
});
