/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

// Fontsource variable font packages export CSS via package.json#main.
// TypeScript does not resolve the CSS module type automatically for package imports,
// so we declare the side-effect-only module here.
declare module "@fontsource-variable/inter";
