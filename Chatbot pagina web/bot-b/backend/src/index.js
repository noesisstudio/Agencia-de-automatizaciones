require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chatRoute = require('./routes/chat');
const leadRoute = require('./routes/lead');

const app = express();

app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
  methods: ['POST', 'GET'],
}));

app.use(express.json({ limit: '50kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', tenant: process.env.TENANT_ID });
});

app.use('/api/chat', chatRoute);
app.use('/api/lead', leadRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot B backend · tenant=${process.env.TENANT_ID} · puerto=${PORT}`);
});
