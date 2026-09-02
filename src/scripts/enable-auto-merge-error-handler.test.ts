import { spawnSync } from 'child_process';
import path from 'path';

const scriptPath = path.join(
  __dirname,
  '../../scripts/enable-auto-merge-error-handler.sh',
);

function runScript(input: string): {
  stdout: string;
  status: number | null;
} {
  const result = spawnSync('bash', [scriptPath], {
    input,
    encoding: 'utf8',
  });
  return { stdout: result.stdout, status: result.status };
}

describe('enable-auto-merge-error-handler.sh', () => {
  test('exits 0 and reports success when response has no errors field', () => {
    const result = runScript(
      JSON.stringify({
        data: { enablePullRequestAutoMerge: { clientMutationId: null } },
      }),
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Auto merge enabled successfully');
  });

  test('exits 0 with warning when error type is RATE_LIMIT', () => {
    const result = runScript(
      JSON.stringify({
        errors: [{ message: 'API rate limit exceeded', type: 'RATE_LIMIT' }],
      }),
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Warning: could not enable auto merge');
  });

  test('exits 0 with warning when error message contains "unstable"', () => {
    const result = runScript(
      JSON.stringify({
        errors: [
          {
            message: 'Pull request is in an unstable state',
            type: 'UNPROCESSABLE',
          },
        ],
      }),
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Warning: could not enable auto merge');
  });

  test('exits 1 when error is not a known transient condition', () => {
    const result = runScript(
      JSON.stringify({
        errors: [{ message: 'Some unexpected error', type: 'INTERNAL' }],
      }),
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Failed to enable auto merge');
  });
});
