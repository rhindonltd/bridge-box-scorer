import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // TypeScript 7 does not ship the compiler API that Next.js uses for type
    // checking. This flag tells Next.js to invoke the TypeScript CLI directly
    // (tsc) instead, which works with TypeScript 7's native Go-based compiler.
    useTypeScriptCli: true,
  },
};

export default nextConfig;
