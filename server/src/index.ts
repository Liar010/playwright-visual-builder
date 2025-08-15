import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs/promises';
import flowRoutes from './routes/flows';
import { TestRunner } from './services/testRunner';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3002;
const HOST = process.env.HOST || '0.0.0.0';
const FLOWS_DIR = path.join(process.cwd(), '../flows');

app.use(cors());
app.use(express.json());

app.use('/api/flows', flowRoutes);

async function ensureFlowsDirectory() {
  try {
    await fs.access(FLOWS_DIR);
  } catch {
    await fs.mkdir(FLOWS_DIR, { recursive: true });
    console.log(`Created flows directory at ${FLOWS_DIR}`);
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('test:start', async (data) => {
    console.log('Starting test execution...');
    const config = data.config || {};
    const runner = new TestRunner(socket, config);
    try {
      await runner.run(data.nodes, data.edges);
    } catch (error) {
      console.error('Test execution error:', error);
      socket.emit('test:error', {
        message: error instanceof Error ? error.message : 'Test execution failed',
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

async function start() {
  await ensureFlowsDirectory();
  
  httpServer.listen(Number(PORT), HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`LAN access: http://<your-server-ip>:${PORT}`);
    console.log(`Flows will be saved to: ${FLOWS_DIR}`);
  });
}

start().catch(console.error);