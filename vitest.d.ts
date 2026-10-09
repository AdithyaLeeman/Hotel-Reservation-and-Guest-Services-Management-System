/**
 * vitest.d.ts - Extends Vitest's expect with @testing-library/jest-dom matchers.
 *
 * Importing '@testing-library/jest-dom/vitest' brings in jest-dom matcher types
 * for Vitest's Assertion interface so that methods like toBeInTheDocument()
 * are recognized cleanly by TypeScript and the IDE.
 */
import '@testing-library/jest-dom/vitest';
