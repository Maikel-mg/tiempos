#!/usr/bin/env node
// Fábrica local: issue -> brief + worktree -> PR.
// Diseño: docs/TECH-DESIGN-SoftwareFactory.md
//   node scripts/factory.mjs prepare <n> [--radio a,b]
//   node scripts/factory.mjs run     <n> [--radio a,b]   # prepare + agente + PR
//   node scripts/factory.mjs check   <n>     # radio de impacto + tests
//   node scripts/factory.mjs finish  <n>     # check + push + PR
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function radioPropuesto(issue, ficheros) {
  const texto = `${issue.title}\n${issue.body || ''}`;
  // Solo se propone radio si la issue nombra ficheros que existen: adivinar por palabras
  // del título daba propuestas con confianza y equivocadas (T7 acababa en server.ts).
  const tokens = [...texto.matchAll(/([\w./-]+\.tsx?)/g)].map((m) => m[1].split('/').pop());
  const dirs = new Set();
  for (const t of tokens) {
    for (const f of ficheros) {
      if (!f.endsWith('/' + t)) continue;
      // Un test vive junto al código que prueba: se propone la carpeta padre.
      const sinTests = f.split('/').slice(0, -1).join('/').replace(/\/__tests__$/, '');
      dirs.add(sinTests + '/**');
    }
  }
  return [...dirs].slice(0, 3).join(',');
}

function prDeIssue(n, todos) {
  // Solo dos señales fiables: la rama de la fábrica, o un cierre explícito en el cuerpo.
  // Mencionar "#N" de pasada no cuenta: el PR #3 menciona media cola y el #141 menciona
  // #113 como "esto no lo hace", que no es lo mismo que cerrarlo.
  try {
    const lista = todos || JSON.parse(sh('gh pr list --state all --json number,state,url,title,body,headRefName --limit 100'));
    const cierre = new RegExp(`(closes|fixes|resolves)\\s+#${n}\\b`, 'i');
    return lista.find((p) => p.headRefName.startsWith(`factory/${n}-`) || cierre.test(p.body || '')) || null;
  } catch { return null; }
}

if (cmd === 'clean') {
  const wt = worktree(n);
  const rama = `factory/${n}-`;
  const pr = prDeIssue(n);
  if (pr && pr.state === 'OPEN') {
    console.error(`el PR #${pr.number} sigue abierto: mergea (o cierra) antes de limpiar.\n${pr.url}`);
    process.exit(1);
  }
  const ramas = sh('git branch --list "factory/*"').split('\n').map((s) => s.replace('*', '').trim())
    .filter((b) => b.startsWith(rama));
  if (!existsSync(wt) && !ramas.length) {
    console.log(`nada que limpiar para #${n}.`);
    process.exit(0);
  }
  if (existsSync(wt)) {
    const sucio = execSync('git status --porcelain', { cwd: wt, encoding: 'utf8' }).split('\n').filter(Boolean).length;
    if (sucio) {
      console.error(`el worktree tiene ${sucio} cambios sin commitear: revisalo antes de borrarlo.\n${wt}`);
      process.exit(1);
    }
    sh(`git worktree remove "${wt}"`);
    console.log(`worktree borrado: ${wt}`);
  }
  for (const b of ramas) {
    try { sh(`git branch -D ${b}`); console.log(`rama borrada: ${b}`); }
    catch { console.log(`no pude borrar ${b} (¿sin mergear?): git branch -D ${b} a mano`); }
    try { sh(`git push origin --delete ${b}`); } catch { /* ya no estaba en origin */ }
  }
  rmSync(join(ROOT, '.factory', 'briefs', `${n}.md`), { force: true });
  rmSync(join(ROOT, '.factory', 'briefs', `${n}.pr.md`), { force: true });
  console.log(`limpio. #${n} no vuelve a la cola: si sigue abierta, cierrala.`);
  process.exit(0);
}

if (cmd === 'help' || !cmd) {
  console.log(`fábrica local — issue -> PR

  npm run factory -- list                  qué issues se pueden lanzar, con radio propuesto
  npm run factory -- status                qué está en curso y qué espera merge
  npm run factory -- run <n> --radio "..."  brief + agente + PR (el comando normal)
  npm run factory -- check <n>              verifica el radio sin lanzar ni pushear
  npm run factory -- prepare <n> --radio "..."  solo brief + worktree (sin agente)
  npm run factory -- finish <n>             commit + push + PR del worktree existente
  npm run factory -- clean <n>              borra worktree + rama de una issue ya mergeada
  npm run factory -- selftest              comprueba el verificador de radio

Documentación: docs/TECH-DESIGN-SoftwareFactory.md (sección 0)
El radio se acepta como comodines separados por comas: "ruta/a/**,otra/ruta/**"`);
  process.exit(0);
}

if (cmd === 'list') {
  const issues = JSON.parse(sh('gh issue list --state open --label ready-for-agent --limit 100 --json number,title,body'));
  const todosLosPR = JSON.parse(sh('gh pr list --state all --json number,state,url,title,body,headRefName --limit 100'));
  const ficheros = sh('git ls-files').split('\n');
  const enCurso = new Set(sh('git worktree list --porcelain').split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice(9)).filter((p) => /-wt-\d+$/.test(p)).map((p) => Number(p.match(/-wt-(\d+)$/)[1])));
  for (const issue of issues) {
    const pr = prDeIssue(issue.number, todosLosPR);
    const estado = pr && pr.state === 'OPEN' ? `PR #${pr.number} abierto`
      : enCurso.has(issue.number) ? 'en curso (worktree)' : 'libre';
    const radio = radioPropuesto(issue, ficheros);
    console.log(`#${issue.number}  ${estado.padEnd(16)} ${issue.title.slice(0, 62)}`);
    console.log(`        radio: ${radio || '⚠ sin radio propuesto, pásalo tú con --radio'}`);
  }
  process.exit(0);
}

if (cmd === 'status') {
  const wts = sh('git worktree list --porcelain').split('\n\n').filter(Boolean).map((b) => {
    const l = b.split('\n');
    return { path: l[0].slice(9), branch: (l.find((x) => x.startsWith('branch ')) || 'branch (detached)').replace('branch refs/heads/', '') };
  });
  const fabrica = wts.filter((w) => /-wt-\d+$/.test(w.path));
  if (!fabrica.length) console.log('nada en curso.');
  for (const w of fabrica) {
    const n = Number(w.path.match(/-wt-(\d+)$/)[1]);
    const sucio = execSync('git status --porcelain', { cwd: w.path, encoding: 'utf8' })
      .split('\n').filter(Boolean).length;
    const pr = prDeIssue(n);
    console.log(`#${n}  ${w.branch}\n      ${w.path}\n      cambios sin commitear: ${sucio}`
      + (pr ? `\n      PR #${pr.number} (${pr.state}) ${pr.url}` : '\n      sin PR todavía'));
  }
  const abiertos = JSON.parse(sh('gh pr list --state open --json number,title,headRefName --limit 30'))
    .filter((p) => p.headRefName.startsWith('factory/'));
  console.log(`\nPRs de la fábrica abiertos: ${abiertos.length ? '' : 'ninguno'}`);
  for (const p of abiertos) console.log(`  #${p.number}  ${p.title}`);
  process.exit(0);
}

if (!n) {
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
  // `finish` tiene que poder repetirse: si el PR ya existe se actualiza en vez de
  // romper con un stack trace de gh.
  const rama = sh('git rev-parse --abbrev-ref HEAD', { cwd: wt });
  const existente = JSON.parse(sh(`gh pr list --head ${rama} --state all --json number,url,state`))[0];
  if (existente) {
    if (existente.state !== 'OPEN') {
      console.log(`el PR #${existente.number} está ${existente.state}: ${existente.url}\nNo se toca. Para empezar de nuevo, borra el worktree y la rama.`);
      process.exit(0);
    }
    sh(`gh pr edit ${existente.number} --title ${JSON.stringify(subject)} --body ${JSON.stringify(body)}`, { cwd: wt });
    console.log(`PR actualizado: ${existente.url}`);
    process.exit(0);
  }
  console.log(sh(`gh pr create --base ${BASE} --title ${JSON.stringify(subject)} --body ${JSON.stringify(body)}`, { cwd: wt }));
}
