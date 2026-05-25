# Deferred Items — Quick 260521-jsd

Discovered during execution but out of scope per the plan's scope boundary
(only files in `files_modified` should be touched).

## Pre-existing TypeScript errors (unrelated to this task)

`src/components/social-icons/index.tsx` imports 7 `.svg` files as React
components, but the repo has no `*.svg.d.ts` ambient module declaration, so
`npx tsc --noEmit` reports 7 `TS2307: Cannot find module './*.svg'` errors.

Build output is unaffected because next.config.ts wires SVGR via webpack/turbopack
(SVGs resolve at bundle time, not via TypeScript module resolution). The errors
only surface under raw `tsc --noEmit`.

Fix in a future quick task by adding `src/svg.d.ts`:

```ts
declare module "*.svg" {
  import * as React from "react";
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
```

Not fixed here — out of scope per executor scope-boundary rule.
