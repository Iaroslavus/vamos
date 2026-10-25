/**
 * Draft a v2 topic from a short description.
 *
 * The API key stays in the environment (LLM_API_KEY). It is never written to the repo.
 * Optional: LLM_API_URL, LLM_MODEL, or `--from draft.json` to validate a saved draft without the API.
 *
 * Example:
 *   npx tsx scripts/content/generate-topic.ts \
 *     --level A1 --category food --slug cafe --icon cup \
 *     --title-ru "В кафе" --starter-day 2 \
 *     --can-do "Заказать напиток" --can-do "Спросить цену"
 *
 * The model writes ru, uk, and en together. --title-ru and --can-do are the Russian source.
 */
import fs from 'fs';
import path from 'path';

import { parseTopicArgs } from '../../src/features/content/pipeline/args';
import {
  chatCompletionBody,
  draftIssues,
  parseModelDraft,
  readCompletion,
  topicPrompt,
} from '../../src/features/content/pipeline/draft';
import { draftFilePlan, registerRequires } from '../../src/features/content/pipeline/files';
import { loadContent } from '../../src/features/content/pipeline/load';

const DEFAULT_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

async function main(): Promise<void> {
  const from = takeFlag(process.argv.slice(2), '--from');
  const spec = parseTopicArgs(from.argv);
  const root = process.cwd();
  const draft = from.value
    ? parseModelDraft(fs.readFileSync(from.value, 'utf8'))
    : await requestDraft(spec);
  const existing = loadContent(root);
  const issues = draftIssues(draft, spec, existing.bundle);
  if (issues.length > 0) {
    throw new Error(issues.join('\n'));
  }

  const plan = draftFilePlan(draft);
  for (const file of plan) {
    const full = path.join(root, file.path);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, file.body);
  }

  const loaderPath = path.join(root, 'src/features/content/loader.ts');
  const loader = fs.readFileSync(loaderPath, 'utf8');
  fs.writeFileSync(
    loaderPath,
    registerRequires(
      loader,
      plan.map((file) => file.path),
    ),
  );

  for (const file of plan) console.log(file.path);
  console.log('Черновик записан с draft: true. Вычитайте его носителем до публикации.');
}

async function requestDraft(spec: ReturnType<typeof parseTopicArgs>) {
  const apiKey = process.env.LLM_API_KEY?.trim() ?? '';
  if (!apiKey) {
    throw new Error('LLM_API_KEY не задан. Положите ключ в окружение, не в репозиторий.');
  }

  const url = process.env.LLM_API_URL?.trim() || DEFAULT_URL;
  const model = process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;
  const prompt = topicPrompt(spec);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: chatCompletionBody(model, prompt.system, prompt.user),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`LLM API ${response.status}: ${redact(body, apiKey).slice(0, 300)}`);
  }
  return parseModelDraft(readCompletion(JSON.parse(body) as unknown));
}

/** Optional `--from file.json` skips the API and validates a saved model draft. */
function takeFlag(argv: readonly string[], name: string): { argv: string[]; value?: string } {
  const index = argv.indexOf(name);
  if (index < 0) return { argv: [...argv] };
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a value`);
  return { argv: [...argv.slice(0, index), ...argv.slice(index + 2)], value };
}

function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join('[redacted]') : text;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'generate-topic failed';
  console.error(message);
  process.exitCode = 1;
});
