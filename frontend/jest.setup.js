/**
 * frontend/jest.setup.js
 * Loaded through the `setupFiles` entry in jest.config.js.
 *
 * @testing-library/react-native 14 renders through its own `test-renderer` and never
 * declares an act-capable environment, so every state update React flushes inside the
 * library's own act() scope prints
 *   "The current testing environment is not configured to support act(...)"
 * That message is emitted by the renderer regardless of the test: setting
 * global.IS_REACT_ACT_ENVIRONMENT = true here was measured to keep all 27 lines and
 * add a second warning family ("was not wrapped in act") plus timing instability, so
 * the flag is deliberately NOT set and only this exact string is dropped.
 *
 * Every other console.error still prints, including real render errors.
 */

const ACT_ENVIRONMENT_NOISE =
  "The current testing environment is not configured to support act";

const originalConsoleError = console.error.bind(console);

console.error = (...args) => {
  const first = args[0];
  if (typeof first === "string" && first.startsWith(ACT_ENVIRONMENT_NOISE)) {
    return;
  }
  originalConsoleError(...args);
};
