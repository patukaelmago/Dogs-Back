const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const routes = require('./routes/index.js');
const cors = require('cors');
const { conn } = require('./db');
const allowedOrigins = (process.env.CORS_URL || '').split(',').map(value => value.trim()).filter(Boolean);


const server = express();

server.name = 'API';

server.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
server.use(bodyParser.json({ limit: '50mb' }));
server.use(cookieParser());
server.use(morgan('dev'));
server.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : '*',
  credentials: allowedOrigins.length > 0,
}));

server.get('/health', async (req, res) => {
  try {
    await conn.authenticate();
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'unavailable' });
  }
});

server.use('/', routes);

// Error catching endware.
server.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  const message = err.message || err;
  console.error('Request failed:', err.name, status);
  res.status(status).send(status >= 500 && status !== 502 ? 'Service temporarily unavailable. Please try again.' : message);
});

module.exports = server;