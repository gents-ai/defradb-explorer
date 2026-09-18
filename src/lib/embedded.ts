// Embedded mode: the explorer is served by the DefraDB node itself. The
// connection is pinned to the serving origin and connection management is
// hidden — you are always exploring the database that served the page.
// Enabled at build time with VITE_EMBEDDED=1.
export const EMBEDDED = import.meta.env.VITE_EMBEDDED === '1'
