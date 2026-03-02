module.exports = function tenantMiddleware(req, res, next) {
  const tenantId =
    req.headers['x-tenant-id'] ||
    req.body.tenant_id ||
    'demo-tenant'; // dev default

  if (!tenantId) {
    return res.status(400).json({ error: 'tenant_id required' });
  }

  req.tenantId = tenantId;
  next();
};