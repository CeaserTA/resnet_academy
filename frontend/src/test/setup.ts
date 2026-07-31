import '@testing-library/jest-dom/vitest';

/**
 * JSDOM doesn't implement the Pointer Events capture API or scrollIntoView — Radix UI's
 * Select/Dialog/etc. call these during open/close/selection, so without these no-op polyfills
 * every test that interacts with a Radix component throws (not just Select: any Radix primitive
 * using pointer capture would hit the same wall). Global, not per-test, since this affects any
 * component built on Radix.
 */
if (typeof Element !== 'undefined') {
    if (!Element.prototype.hasPointerCapture) {
        Element.prototype.hasPointerCapture = () => false;
    }
    if (!Element.prototype.setPointerCapture) {
        Element.prototype.setPointerCapture = () => {};
    }
    if (!Element.prototype.releasePointerCapture) {
        Element.prototype.releasePointerCapture = () => {};
    }
    if (!Element.prototype.scrollIntoView) {
        Element.prototype.scrollIntoView = () => {};
    }
}
