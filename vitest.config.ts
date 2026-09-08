import { defineConfig } from 'vitest/config';

// The root (web) test project. The server and mobile packages have their own
// test setups, so scope this to the web app's own src/ — otherwise vitest also
// discovers server/src/*.test.ts, which need the server's generated Prisma
// client and shouldn't run from the web workspace.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
