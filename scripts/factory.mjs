#!/usr/bin/env node
// Fábrica local: issue -> brief + worktree -> PR.
// Diseño: docs/TECH-DESIGN-SoftwareFactory.md
//   node scripts/factory.mjs prepare <n> [--radio a,b]
//   node scripts/factory.mjs run     <n> [--radio a,b]   # prepare + agente + PR
//   node scripts/factory.mjs check   <n>     # radio de impacto + tests
//   node scripts/factory.mjs finish  <n>     # check + push + PR
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.FACTORY_BASE || 'develop';
const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
const sh = (cmd, opts = {}) => execSync(cmd, { encoding: 'utf8', cwd: ROOT, ...opts }).trim();
const shRaw = (cmd, cwd) => execSync(cmd, { encoding: 'utf8', cwd });

// `git status --porcelain` es "XY path": sin trim previo, o el primer espacio se
// pierde y slice(3) amputa un carácter del nombre (bug real, no teórico).
export function parsePorcelain(raw) {
  return raw
    .split('\n')
    .filter((line) => line.length > 3)
    .map((line) => line.slice(3).trim().replace(/^.* -> /, ''));
}

export function outsideRadio(files, radio) {
  return files.filter((f) => !radio.some((r) => f === r || f.startsWith(r.replace(/\*+$/, ''))));
}
const briefPath = (n) => join(ROOT, '.factory', 'briefs', `${n}.md`);
const worktree = (n) => join(ROOT, '..', `${'importador-tiempos'}-wt-${n}`);

const [cmd, arg, ...rest] = process.argv.slice(2);
const n = Number(arg);

if (cmd === 'selftest') {
  // El parseo decide si el runner escribe fuera del radio: no va sin prueba.
  const assert = (cond, msg) => { if (!cond) { console.error(`FALLO: ${msg}`); process.exit(1); } };
  assert(parsePorcelain(' M a/b.ts').join() === 'a/b.ts', 'espacio inicial del primer fichero');
  assert(parsePorcelain('?? c/d.ts\n M e/f.ts').join() === 'c/d.ts,e/f.ts', 'varias lineas');
  assert(parsePorcelain('R  old.ts -> new.ts')[0] === 'new.ts', 'renombrado');
  assert(outsideRadio(['x/a.ts'], ['x/**']).length === 0, 'dentro del radio');
  assert(outsideRadio(['y/a.ts'], ['x/**']).length === 1, 'fuera del radio');
  assert(outsideRadio(['x'], ['x']).length === 0, 'fichero exacto');
  console.log('selftest ok');
  process.exit(0);
}

if (!cmd || !n) {
  console.error('uso: factory.mjs prepare|check|finish <issue> [--radio p1,p2]');
  process.exit(2);
}

function readBrief() {
  if (!existsSync(briefPath(n))) {
    console.error(`falta el brief: ${briefPath(n)}. Ejecuta "prepare ${n}" primero.`);
    process.exit(2);
  }
  const text = readFileSync(briefPath(n), 'utf8');
  const radio = (text.match(/^radio: (.+)$/m)?.[1] || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (!radio.length) {
    console.error('el brief no declara "radio: ". El runner no escribe sin radio declarado.');
    process.exit(2);
  }
  return { text, radio };
}

function filesChanged(cwd) {
  const diff = shRaw(`git diff --name-only ${BASE}...HEAD`, cwd);
  const dirty = parsePorcelain(shRaw('git status --porcelain', cwd));
  return [...new Set([...diff.split('\n'), ...dirty])].map((f) => f.trim()).filter(Boolean);
}

if (cmd === 'run') {
  // prepare + una sesión de agente + PR. La sesión es un `pi --print` en el worktree:
  // contexto limpio, sin nada de la conversación donde se decidió (eso es el brief).
  const radioArg = rest.join(' ');
  sh(`node "${join(ROOT, 'scripts', 'factory.mjs')}" prepare ${n} ${radioArg}`);
  const { text } = readBrief();
  const prompt = [
    'Estás implementando una issue en solitario. El brief es tu único contexto.',
    '',
    text,
    '',
    'Instrucciones:',
    '- Implementa lo que pide la issue. Nada más.',
    '- Añade los tests que pide el contrato y ejecuta: cd web-ui && npm run type-check &&',
    '  npm run lint && npm run test:run   (y lo equivalente del backend si tocaste src/).',
    '- No hagas commit ni push: de eso se encarga el runner.',
    '- Escribe .factory/briefs/' + n + '.pr.md con: "subject: <mensaje convencional>", la línea',
    '  "Closes #' + n + '" y las secciones del DoD (qué cambió, qué NO se hizo, cambio',
    '  observable, cómo verificarlo en 2 minutos). Ese fichero es la descripción del PR.',
    '- Si necesitas escribir fuera del radio declarado, PARA y explica por qué en voz alta.',
    '- Al terminar, responde solo con un resumen de 5 líneas: qué hiciste y qué quedó fuera.',
  ].join('\n');
  console.log('lanzando agente en el worktree...');
  execSync('pi --print ' + JSON.stringify(prompt), {
    cwd: worktree(n), stdio: 'inherit', shell: true,
  });
  sh(`node "${join(ROOT, 'scripts', 'factory.mjs')}" finish ${n}`, { stdio: 'inherit' });
}

if (cmd === 'prepare') {
  const issue = JSON.parse(sh(`gh issue view ${n} --json number,title,body,labels`));
  const radioArg = rest.join(' ').match(/--radio[= ]([^ ]+)/)?.[1]
    || issue.body.match(/^radio: (.+)$/m)?.[1] || '';
  if (!radioArg) {
    console.error('sin radio: pasa --radio "web-ui/src/features/x/**" o añade "radio: ..." a la issue.');
    process.exit(2);
  }
  const slug = issue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const branch = `factory/${n}-${slug}`;
  const wt = worktree(n);
  mkdirSync(join(ROOT, '.factory', 'briefs'), { recursive: true });
  writeFileSync(briefPath(n), [
    `# Brief #${issue.number} — ${issue.title}`,
    '',
    `radio: ${radioArg}`,
    `rama: ${branch}`,
    `base: ${BASE}`,
    '',
    '## Qué pide la issue',
    '',
    issue.body.trim(),
    '',
    '## Contrato (DoD — docs/TECH-DESIGN-SoftwareFactory.md §3.4)',
    '',
    '1. lint + type-check + test verdes en ambos paquetes.',
    '2. Test que cubre la lógica nueva (rama, bucle, parser; no trivial).',
    '3. .snap intacto, o actualizado con una línea de por qué.',
    '4. Cuerpo del PR: qué cambió, qué NO se hizo, cambio observable, verificación en 2 min.',
    '',
    'No escribas fuera del radio. Si lo necesitas, para y devuelve "esto es más grande',
    'de lo que decía la issue" en lugar de ampliarlo por tu cuenta.',
  ].join('\n'));
  if (!existsSync(wt)) sh(`git worktree add -b ${branch} "${wt}" ${BASE}`);
  // Sin node_modules el worktree no puede correr tests: enlazar los del repo en
  // lugar de pagar un npm ci por issue.
  for (const dir of ['node_modules', 'web-ui/node_modules']) {
    const link = join(wt, dir);
    if (!existsSync(link) && existsSync(join(ROOT, dir))) {
      try { execSync(`cmd /c mklink /J "${link}" "${join(ROOT, dir)}"`, { stdio: 'ignore' }); }
      catch { console.warn(`aviso: no pude enlazar ${dir}; corre npm ci en ${wt}`); }
    }
  }
  console.log(`brief:  ${briefPath(n)}\nworktree: ${wt}\nrama:   ${branch}`);
}

if (cmd === 'check' || cmd === 'finish') {
  const { radio } = readBrief();
  const wt = worktree(n);
  const files = filesChanged(wt);
  const out = outsideRadio(files, radio);
  if (out.length) {
    console.error(`fuera del radio declarado (${radio.join(', ')}):\n  ${out.join('\n  ')}`);
    console.error('Amplía el radio en el brief con justificación, o reduce el cambio.');
    process.exit(1);
  }
  console.log(`radio ok: ${files.length} ficheros dentro de ${radio.join(', ')}`);
  if (cmd === 'check') process.exit(0);

  sh('git add -A', { cwd: wt });
  const prFile = join(ROOT, '.factory', 'briefs', `${n}.pr.md`);
  const prRaw = existsSync(prFile) ? readFileSync(prFile, 'utf8') : '';
  const subject = prRaw.match(/^subject: (.+)$/m)?.[1]
    || `feat(#${n}): ${JSON.parse(sh(`gh issue view ${n} --json title`)).title.toLowerCase()}`;
  try { sh(`git commit -q -m ${JSON.stringify(subject)}`, { cwd: wt }); }
  catch { console.log('nada que commitear'); }
  sh(`git push -u origin ${sh('git rev-parse --abbrev-ref HEAD', { cwd: wt })}`, { cwd: wt });
  const body = prRaw.replace(/^subject: .+\n?/m, '').trim() || [
    `Closes #${n}`, '', '## Qué cambió', '', '(completar)', '', '## Qué NO se hizo', '',
    '(completar)', '', '## Cambio observable', '', '(completar)', '',
    '## Cómo verificarlo en 2 minutos', '', '(completar)', '',
    `> Abierto por la fábrica local. Radio: ${radio.join(', ')}`,
  ].join('\n');
  console.log(sh(`gh pr create --base ${BASE} --title ${JSON.stringify(subject)} --body ${JSON.stringify(body)}`, { cwd: wt }));
}
