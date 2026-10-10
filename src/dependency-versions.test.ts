import { readFileSync } from 'fs';

const readInstalledPackageVersion = (packageJsonModulePath: string): string => {
  const resolvedPath = require.resolve(packageJsonModulePath);
  const parsedManifest: unknown = JSON.parse(
    readFileSync(resolvedPath, 'utf8'),
  );
  if (typeof parsedManifest !== 'object' || parsedManifest === null) {
    throw new Error(`${packageJsonModulePath} did not resolve to an object`);
  }
  if (!('version' in parsedManifest)) {
    throw new Error(`${packageJsonModulePath} has no version field`);
  }
  const { version } = parsedManifest;
  if (typeof version !== 'string') {
    throw new Error(`${packageJsonModulePath} version field is not a string`);
  }
  return version;
};

const isAtLeastMinimumVersion = (
  version: string,
  minimumMajor: number,
  minimumMinor: number,
  minimumPatch: number,
): boolean => {
  const [major, minor, patch] = version.split('.').map((part) => {
    return Number.parseInt(part, 10);
  });
  if (major !== minimumMajor) {
    return major > minimumMajor;
  }
  if (minor !== minimumMinor) {
    return minor > minimumMinor;
  }
  return patch >= minimumPatch;
};

describe('handlebars dependency version', () => {
  test('handlebars is updated to >= 4.7.10 fixing GHSA-8r5x-fm3f-whwj and GHSA-p8wg-vrv2-v86f', () => {
    const installedHandlebarsVersion = readInstalledPackageVersion(
      'handlebars/package.json',
    );

    expect(isAtLeastMinimumVersion(installedHandlebarsVersion, 4, 7, 10)).toBe(
      true,
    );
  });
});
