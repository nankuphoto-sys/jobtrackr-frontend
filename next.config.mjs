import { withSentryConfig } from '@sentry/nextjs/config';

/** @type {import('next').NextConfig} */
const nextConfig = {
  sassOptions: {
    includePaths: ['./node_modules'],
  },
};

export default withSentryConfig(nextConfig, {
  org: 'jobtrackr',
  project: 'jobtrackr-frontend',
  silent: !process.env.CI,
});
