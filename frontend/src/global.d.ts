// Ambient module declarations for CSS side-effect imports, so `tsc --noEmit`
// (bun build handles them at bundle time) does not report TS2882.
declare module '*.css';
