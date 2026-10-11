import http from 'http';
import dotenv from 'dotenv';
import app from '../src/app';
import { initSocket } from "./sockets/socket";

dotenv.config();

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});