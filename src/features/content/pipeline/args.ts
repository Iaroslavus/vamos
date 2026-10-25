import { TopicSpecSchema, type TopicSpec } from './draft';

/** CLI flags for generate-topic. `--can-do` may be repeated. */
export function parseTopicArgs(argv: readonly string[]): TopicSpec {
  const values = new Map<string, string>();
  const canDoRu: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg?.startsWith('--')) throw new Error(`Unknown argument ${arg ?? ''}`);
    const name = arg.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${arg} needs a value`);
    }
    index += 1;
    if (name === 'can-do') canDoRu.push(value);
    else values.set(name, value);
  }

  const starter = values.get('starter-day');
  const parsed = TopicSpecSchema.safeParse({
    level: values.get('level'),
    category: values.get('category'),
    titleRu: values.get('title-ru'),
    icon: values.get('icon'),
    slug: values.get('slug'),
    canDoRu,
    starterDay: starter === undefined ? undefined : Number(starter),
  });
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'spec'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Некорректное описание темы. ${detail}`);
  }
  return parsed.data;
}
