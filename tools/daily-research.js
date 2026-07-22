const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { expandPath, runDailyKnowledge } = require('./daily-knowledge-lib');

const projectRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    configPath: path.join(projectRoot, 'config', 'daily-knowledge-agent.json'),
    collect: false,
    dryRun: false,
    headless: undefined,
    bootstrapLogin: false,
    skipModel: false
  };
  for (let index = 2; index < argv.length; index++) {
    const value = argv[index];
    if (value === '--collect') args.collect = true;
    else if (value === '--dry-run') args.dryRun = true;
    else if (value === '--skip-model') args.skipModel = true;
    else if (value === '--bootstrap-login') args.bootstrapLogin = true;
    else if (value === '--headless') args.headless = argv[++index] !== 'false';
    else if (value === '--config' && argv[index + 1]) args.configPath = path.resolve(argv[++index]);
  }
  return args;
}

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) throw new Error(`每日代理配置不存在：${configPath}`);
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function runCollector(config, args) {
  const collection = config.collection || {};
  if (!collection.enabled) return { ok: true, warnings: ['平台采集已在配置中关闭'] };

  const collectorArgs = [
    path.join(projectRoot, 'tools', 'collect-platform-references.js'),
    '--config', expandPath(collection.sourcesConfig || 'assets/platform-collections.json', projectRoot),
    '--outDir', expandPath(collection.captureDir || 'data/platform-captures', projectRoot),
    '--debugDir', expandPath(collection.debugDir || 'data/platform-debug', projectRoot),
    '--profileDir', expandPath(collection.profileDir || '.browser-profile/platform-collector', projectRoot),
    '--limit', String(collection.limitPerCollection || 120),
    '--scrollRounds', String(args.bootstrapLogin ? 1 : (collection.scrollRounds || 30)),
    '--loginWaitMs', String(args.bootstrapLogin ? 120000 : (collection.loginWaitMs || 0)),
    '--headless', String(args.bootstrapLogin ? false : (args.headless ?? collection.headless ?? true))
  ];
  const result = spawnSync(process.execPath, collectorArgs, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: args.bootstrapLogin ? 'inherit' : 'pipe',
    timeout: args.bootstrapLogin ? 10 * 60 * 1000 : 5 * 60 * 1000
  });

  if (result.error) return { ok: false, warnings: [`平台采集启动失败：${result.error.message}`] };
  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || '').replace(/\s+/g, ' ').trim().slice(0, 300);
    return { ok: false, warnings: [`平台采集未完成：${detail || `退出码 ${result.status}`}`] };
  }
  return { ok: true, warnings: [] };
}

async function main() {
  const args = parseArgs(process.argv);
  const config = loadConfig(args.configPath);
  let collectionResult = { ok: true, warnings: [] };

  if (args.bootstrapLogin || args.collect) collectionResult = runCollector(config, args);
  if (args.bootstrapLogin) {
    const summary = await runDailyKnowledge({
      projectRoot,
      configPath: args.configPath,
      config,
      skipModel: true,
      collectionWarnings: collectionResult.warnings
    });
    console.log(JSON.stringify({
      ok: collectionResult.ok,
      mode: 'bootstrap-login',
      message: collectionResult.ok ? '登录态引导完成，可运行每日任务。' : '登录态引导未完成。',
      warnings: collectionResult.warnings,
      summary
    }, null, 2));
    return;
  }

  const summary = await runDailyKnowledge({
    projectRoot,
    configPath: args.configPath,
    config,
    dryRun: args.dryRun,
    skipModel: args.skipModel,
    collectionWarnings: collectionResult.warnings
  });
  console.log(JSON.stringify(summary, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message || String(error) }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { loadConfig, main, parseArgs, runCollector };
