import { intro, outro, select, isCancel, log } from '@clack/prompts';
import { runDbDiagnostics, runDbPushAndSeed, runDbForceResetAndSeed } from './db.cli.js';
import { runRedisDiagnostics, runRedisFlush } from './redis.cli.js';
import { runInfraUp, runInfraDown, runInfraStatus, runSmtpTest } from './infra.cli.js';
import { runQualityCheck, runKnipCheck } from './quality.cli.js';

async function handleDbMenu(): Promise<void> {
  const choice = await select({
    message: '🗄️  Database Operations:',
    options: [
      { value: 'db-health', label: '🔍  PostgreSQL Connection Diagnostics' },
      { value: 'db-sync-seed', label: '🔄  Schema Sync & Seed (Non-destructive prisma db push)' },
      {
        value: 'db-force-reset',
        label: '🔥  Full Database Wipe & Reset (prisma db push --force-reset + seed)',
      },
      { value: 'back', label: '⬅️   Back to Main Menu' },
    ],
  });

  if (isCancel(choice) || choice === 'back') {
    return;
  }

  if (choice === 'db-health') {
    await runDbDiagnostics();
  } else if (choice === 'db-sync-seed') {
    await runDbPushAndSeed();
  } else if (choice === 'db-force-reset') {
    await runDbForceResetAndSeed();
  }
}

async function handleRedisMenu(): Promise<void> {
  const choice = await select({
    message: '⚡  Redis & Cache Operations:',
    options: [
      { value: 'redis-health', label: '📡  Redis Connection Ping' },
      { value: 'redis-flush', label: '🧹  Flush Redis Keys' },
      { value: 'back', label: '⬅️   Back to Main Menu' },
    ],
  });

  if (isCancel(choice) || choice === 'back') {
    return;
  }

  if (choice === 'redis-health') {
    await runRedisDiagnostics();
  } else if (choice === 'redis-flush') {
    await runRedisFlush();
  }
}

async function handleInfraMenu(): Promise<void> {
  const choice = await select({
    message: '🐳  Docker & Network Operations:',
    options: [
      { value: 'infra-up', label: '🚀  Start Docker Containers (infra:up)' },
      { value: 'infra-down', label: '🛑  Stop Docker Containers (infra:down)' },
      { value: 'infra-status', label: '📊  View Container Status (docker compose ps)' },
      { value: 'smtp-test', label: '📧  Run SMTP Email Diagnostic Test' },
      { value: 'back', label: '⬅️   Back to Main Menu' },
    ],
  });

  if (isCancel(choice) || choice === 'back') {
    return;
  }

  if (choice === 'infra-up') {
    await runInfraUp();
  } else if (choice === 'infra-down') {
    await runInfraDown();
  } else if (choice === 'infra-status') {
    await runInfraStatus();
  } else if (choice === 'smtp-test') {
    await runSmtpTest();
  }
}

async function handleQualityMenu(): Promise<void> {
  const choice = await select({
    message: '🧪  Quality & Verification Operations:',
    options: [
      { value: 'quality-check', label: '✨  Run Quality Checks (pnpm check)' },
      { value: 'knip-check', label: '🔍  Run Knip Unused Code Scanner (pnpm knip)' },
      { value: 'back', label: '⬅️   Back to Main Menu' },
    ],
  });

  if (isCancel(choice) || choice === 'back') {
    return;
  }

  if (choice === 'quality-check') {
    await runQualityCheck();
  } else if (choice === 'knip-check') {
    await runKnipCheck();
  }
}

async function main(): Promise<void> {
  intro('🚀 Monorepo App Template - Centralized Developer & SRE Console');

  let running = true;

  while (running) {
    const category = await select({
      message: 'Select category:',
      options: [
        { value: 'db', label: '🗄️  Database Operations (PostgreSQL)' },
        { value: 'redis', label: '⚡  Redis & Cache Operations' },
        { value: 'infra', label: '🐳  Docker & Network Operations' },
        { value: 'quality', label: '🧪  Code Quality & Verification' },
        { value: 'exit', label: '🚪  Exit Console' },
      ],
    });

    if (isCancel(category) || category === 'exit') {
      running = false;
      break;
    }

    if (category === 'db') {
      await handleDbMenu();
    } else if (category === 'redis') {
      await handleRedisMenu();
    } else if (category === 'infra') {
      await handleInfraMenu();
    } else if (category === 'quality') {
      await handleQualityMenu();
    }
  }

  outro('👋 Console session closed.');
  process.exit(0);
}

main().catch((err) => {
  log.error(`Fatal error: ${(err as Error).message}`);
  process.exit(1);
});
