import { withSentryConfig } from '@sentry/nextjs/config';

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withSentryConfig(nextConfig, {
  org: 'jobtrackr',
  project: 'jobtrackr-frontend',
  silent: !process.env.CI,
});
