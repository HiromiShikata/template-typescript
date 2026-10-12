import fs from 'fs';
import path from 'path';

type MinimumVersionExpectation = {
  packageName: string;
  minimumVersion: string;
};

const dependencyMinimumVersions: MinimumVersionExpectation[] = [
  { packageName: '@swc/core', minimumVersion: '1.16.13' },
  {
    packageName: '@typescript-eslint/eslint-plugin',
    minimumVersion: '8.71.0',
  },
  { packageName: '@typescript-eslint/parser', minimumVersion: '8.71.0' },
  { packageName: 'commitlint', minimumVersion: '21.2.3' },
  { packageName: 'eslint', minimumVersion: '10.12.0' },
  { packageName: 'jest', minimumVersion: '30.5.2' },
  { packageName: 'prettier', minimumVersion: '3.9.9' },
  { packageName: 'dotenv', minimumVersion: '18.0.5' },
];

function isRecordOfUnknown(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInstalledPackageEntryKey(key: string, packageName: string): boolean {
  const nodeModulesSegment = 'node_modules/';
  const lastSegmentStart = key.lastIndexOf(nodeModulesSegment);
  if (lastSegmentStart === -1) {
    return false;
  }
  const installedPackageName = key.slice(
    lastSegmentStart + nodeModulesSegment.length,
  );
  return installedPackageName === packageName;
}

function readInstalledPackageVersions(packageName: string): string[] {
  const packageLockPath = path.join(__dirname, '../package-lock.json');
  const rawPackageLock = fs.readFileSync(packageLockPath, 'utf8');
  const parsedPackageLock: unknown = JSON.parse(rawPackageLock);
  if (!isRecordOfUnknown(parsedPackageLock)) {
    throw new Error('package-lock.json did not parse to an object');
  }
  const packages = parsedPackageLock.packages;
  if (!isRecordOfUnknown(packages)) {
    throw new Error('package-lock.json is missing a "packages" object');
  }
  const installedVersions: string[] = [];
  for (const key of Object.keys(packages)) {
    if (!isInstalledPackageEntryKey(key, packageName)) {
      continue;
    }
    const entry = packages[key];
    if (!isRecordOfUnknown(entry)) {
      continue;
    }
    const version = entry.version;
    if (typeof version === 'string') {
      installedVersions.push(version);
    }
  }
  return installedVersions;
}

function isVersionAtLeast(
  actualVersion: string,
  minimumVersion: string,
): boolean {
  const actualParts = actualVersion.split('.').map((part) => Number(part));
  const minimumParts = minimumVersion.split('.').map((part) => Number(part));
  const partCount = Math.max(actualParts.length, minimumParts.length);
  for (let index = 0; index < partCount; index += 1) {
    const actualPart = actualParts[index] ?? 0;
    const minimumPart = minimumParts[index] ?? 0;
    if (actualPart > minimumPart) {
      return true;
    }
    if (actualPart < minimumPart) {
      return false;
    }
  }
  return true;
}

describe('isVersionAtLeast', () => {
  test.each([
    {
      actualVersion: '1.16.13',
      minimumVersion: '1.16.13',
      expected: true,
      label: 'equal versions',
    },
    {
      actualVersion: '1.16.14',
      minimumVersion: '1.16.13',
      expected: true,
      label: 'greater patch version',
    },
    {
      actualVersion: '1.17.0',
      minimumVersion: '1.16.13',
      expected: true,
      label: 'greater minor version',
    },
    {
      actualVersion: '2.0.0',
      minimumVersion: '1.16.13',
      expected: true,
      label: 'greater major version',
    },
    {
      actualVersion: '1.16.0',
      minimumVersion: '1.16',
      expected: true,
      label: 'minimum missing a patch segment',
    },
    {
      actualVersion: '1.16.2',
      minimumVersion: '1.16.13',
      expected: false,
      label: 'lower patch version',
    },
    {
      actualVersion: '1.15.99',
      minimumVersion: '1.16.0',
      expected: false,
      label: 'lower minor version',
    },
    {
      actualVersion: '0.9.0',
      minimumVersion: '1.0.0',
      expected: false,
      label: 'lower major version',
    },
    {
      actualVersion: '1.16',
      minimumVersion: '1.16.0.1',
      expected: false,
      label: 'actual missing a segment that the minimum requires',
    },
  ])(
    '$label: isVersionAtLeast($actualVersion, $minimumVersion) === $expected',
    ({ actualVersion, minimumVersion, expected }) => {
      expect(isVersionAtLeast(actualVersion, minimumVersion)).toBe(expected);
    },
  );
});

describe('dependency version pins after weekly bump', () => {
  test.each(dependencyMinimumVersions)(
    '$packageName is installed at version $minimumVersion or newer',
    ({ packageName, minimumVersion }) => {
      const installedVersions = readInstalledPackageVersions(packageName);
      expect(installedVersions.length).toBeGreaterThan(0);
      for (const installedVersion of installedVersions) {
        expect(isVersionAtLeast(installedVersion, minimumVersion)).toBe(true);
      }
    },
  );
});
