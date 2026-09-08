// Platform-agnostic code shared by the web and mobile apps: domain types,
// pure logic, and static data. No DOM, no fetch, no React — safe to import
// from React Native (Metro) and Vite alike.
export * from './types';
export * from './lib/readiness';
export * from './lib/entitlement';
export * from './lib/awardLetter';
export * from './lib/coursePlan';
export * from './lib/scorecardId';
export * from './data/colleges';
export * from './data/careerPathways';
export * from './data/timelineDefaults';
export * from './data/essayPrompts';
export * from './data/sampleProfile';
