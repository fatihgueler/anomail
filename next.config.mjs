import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Bindet die Ableitung des Projektstamms fest, sonst waehlt Next.js bei
  // mehreren Lockfiles im Elternverzeichnis den falschen Ordner.
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
