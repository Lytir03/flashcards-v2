import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * eslint-config-next v16 ships flat config directly — no FlatCompat shim.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "lib/db/types.ts", // generated
    ],
  },
];

export default eslintConfig;
