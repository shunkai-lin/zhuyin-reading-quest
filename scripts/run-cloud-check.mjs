import ts from 'typescript';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const dir = 'work/cloud-test';
mkdirSync(dir, { recursive: true });
for (const path of [
  'lib/cloud-progress.ts',
  'lib/progress-backend.ts',
  'lib/firebase.ts',
  'lib/curriculum.ts',
  'lib/rewards.ts',
  'scripts/cloud-check.ts',
]) {
  const name = path.split('/').at(-1).replace('.ts', '.mjs');
  let source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  source = source.replace(
    /from ['"](?:\.\/|\.\.\/lib\/)([^'"]+)['"]/g,
    (_, file) =>
      file.endsWith('.json')
        ? `from './${file}' with {type:'json'}`
        : `from './${file}.mjs'`,
  );
  writeFileSync(`${dir}/${name}`, source);
}
copyFileSync('lib/curriculum.json', `${dir}/curriculum.json`);
copyFileSync('lib/reward-pool.json',`${dir}/reward-pool.json`);
const result = spawnSync(process.execPath, [`${dir}/cloud-check.mjs`], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
