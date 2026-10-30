export function getJwtAccessSecret(): string {
  const configuredSecret = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;
  if (configuredSecret) {
    return configuredSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_ACCESS_SECRET must be configured in production');
  }
  return 'development-only-change-this-secret';
}
