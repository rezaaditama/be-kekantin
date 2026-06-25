import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import tokoRoutes from '../src/routes/tokoRoutes';
import menuRoutes from '../src/routes/menuRoutes';
import orderRoutes from '../src/routes/orderRoutes';
import authRoutes from '../src/routes/authRoutes';
import penjualRoutes from '../src/routes/penjualRoutes';
import path from 'path';
import chatRoutes from '../src/routes/chatRoutes';

// Inisialisasi Express
const app = express();

// Middleware cors
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/api/toko', tokoRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', authRoutes);
app.use('/api/toko', tokoRoutes);
app.use('/api', penjualRoutes);
app.use('/api/chat', chatRoutes);

// Tester
app.get('/', (req: Request, res: Response) => {
  res.send("Backend E-Canteen UIKA is running!");
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Lokal: http://localhost:${PORT}`);
  });
}

export default app;