// Tag incoming requests with the cloud provider that owns the source IP.
// Useful for: bot filtering, abuse routing, analytics.
//
// Run with: npm i express && node example/express-middleware.mjs
// Then:    curl -H "X-Forwarded-For: 52.94.76.1" http://localhost:3000/
import express from 'express';
import { lookup } from 'js-cloudip';

const app = express();

app.use(async (req, res, next) => {
  const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.ip ?? '').trim();
  req.cloud = await lookup(ip);
  next();
});

app.get('/', (req, res) => {
  if (req.cloud.found) {
    res.json({
      ip: req.ip,
      cloud: req.cloud.provider,
      region: req.cloud.region,
      service: req.cloud.service,
      cidr: req.cloud.cidr,
    });
  } else {
    res.json({ ip: req.ip, cloud: null });
  }
});

app.listen(3000, () => console.log('listening on http://localhost:3000'));
