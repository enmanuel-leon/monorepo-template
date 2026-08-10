import { spinner, log } from '@clack/prompts';
import { spawnSync } from 'node:child_process';

export async function runQualityCheck(): Promise<void> {
  const s = spinner();
  s.start('Running workspace quality checks (format, oxlint, typecheck, vitest)...');

  const res = spawnSync('pnpm', ['check'], {
    stdio: 'pipe',
    encoding: 'utf-8',
    cwd: '../../',
  });

  if (res.status !== 0) {
    s.stop('Quality checks failed!');
    log.error(res.stderr || res.stdout || 'Check command failed');
    return;
  }

  s.stop('All quality checks passed clean!');
}

export async function runKnipCheck(): Promise<void> {
  const s = spinner();
  s.start('Running Knip scanner for dead code and unlisted dependencies...');

  const res = spawnSync('pnpm', ['knip'], {
    stdio: 'pipe',
    encoding: 'utf-8',
    cwd: '../../',
  });

  if (res.status !== 0) {
    s.stop('Knip scanner reported unused items!');
    log.error(res.stdout || res.stderr || 'Knip check failed');
    return;
  }

  s.stop('Knip scanner passed cleanly with 0 unused files!');
}
