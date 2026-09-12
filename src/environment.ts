import os from "node:os";

export const PACKAGE_NAME = "mcp-drugsea";
export const PACKAGE_VERSION = "0.11.0";

export type EnvironmentFingerprint = Readonly<{
  packageName: string;
  packageVersion: string;
  nodeVersion: string;
  platform: NodeJS.Platform;
  osRelease: string;
  arch: string;
  userAgent: string;
}>;

/**
 * Capture non-identifying runtime metadata once when the MCP process starts.
 * Deliberately excludes hostname, username, network addresses, and machine IDs.
 */
function collectEnvironmentFingerprint(): EnvironmentFingerprint {
  const platform = process.platform;
  const osRelease = os.release();
  const arch = process.arch;
  const nodeVersion = process.version;

  return Object.freeze({
    packageName: PACKAGE_NAME,
    packageVersion: PACKAGE_VERSION,
    nodeVersion,
    platform,
    osRelease,
    arch,
    userAgent:
      `${PACKAGE_NAME}/${PACKAGE_VERSION} ` +
      `(Node.js ${nodeVersion}; ${platform} ${osRelease}; ${arch})`,
  });
}

export const ENVIRONMENT_FINGERPRINT = collectEnvironmentFingerprint();
