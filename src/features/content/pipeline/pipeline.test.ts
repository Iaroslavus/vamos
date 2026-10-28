import { ItemSchema, LessonSchema, SceneSchema, TopicSchema, type Item } from '../schema';
import { fillLocales } from '../text';
import { parseTopicArgs } from './args';
import {
  chatCompletionBody,
  draftIssues,
  forceDraft,
  parseModelDraft,
  readCompletion,
  topicPrompt,
  type TopicDraft,
  type TopicSpec,
} from './draft';
import { draftFilePlan, registerRequires } from './files';
import { loadContent, loaderLinkIssues } from './load';
import { compareClipName, comparePhrases } from './compare';
import { buildReport, formatReport, hasPlayableAudio } from './report';
import { normalizeAudioArgs, SLOW_PROSODY, spanishSsml } from './ssml';
import {
  applyAudioPaths,
  AUDIO_BUCKET_MIME_TYPES,
  audioObjectPath,
  audioUploadContentType,
  needsGeneratedAudio,
  planItemClips,
  storageUploadRequest,
} from './tts';
import { ttsAdapter } from './ttsProviders';

const spec: TopicSpec = {
  level: 'A1',
  category: 'food',
  titleRu: 'В кафе',
  icon: 'cup',
  slug: 'cafe',
  canDoRu: ['Заказать напиток'],
  starterDay: 2,
};

describe('parseModelDraft', () => {
  it('strips a json fence, validates, and forces an unpublished draft', () => {
    const draft = parseModelDraft(`\`\`\`json\n${JSON.stringify(rawDraft())}\n\`\`\``);

    expect(draft.topic.draft).toBe(true);
    expect(draft.topic.draft_i18n).toBe(true);
    expect(draft.items.every((item) => item.draft_i18n)).toBe(true);
    expect(draft.lessons.every((lesson) => lesson.draft)).toBe(true);
    expect(draft.scene.draft).toBe(true);
    expect(draft.items.every((item) => item.draft && item.audio.es === null)).toBe(true);
    expect(draftIssues(draft, spec)).toEqual([]);
  });

  it('rejects a response that is not JSON', () => {
    expect(() => parseModelDraft('not json')).toThrow('not JSON');
  });
});

describe('draftIssues', () => {
  it('asks a full topic for four lessons and 25–30 units', () => {
    const issues = draftIssues(forceDraft(validDraft()), { ...spec, starterDay: undefined });
    expect(issues.join('\n')).toContain('expected 4 lessons');
    expect(issues.join('\n')).toContain('expected 25–30 units');
  });

  it('names a lesson list that does not match the files', () => {
    const draft = forceDraft(validDraft());
    draft.topic = { ...draft.topic, lessons: ['a1.cafe.l9'] };
    expect(draftIssues(draft, spec).join('\n')).toContain('file order');
  });

  it('puts the level and the goals into the model prompt', () => {
    const prompt = topicPrompt(spec);
    expect(prompt.system).toContain('a1.cafe');
    expect(prompt.system).toContain('Ukrainian');
    expect(prompt.user).toContain('uk and en');
    expect(prompt.user).toContain('A1');
    expect(prompt.user).toContain('Заказать напиток');
    expect(prompt.user).toContain('exactly 2 lessons');
    const full = topicPrompt({ ...spec, starterDay: undefined });
    expect(full.user).toContain('exactly 4 lessons');
    expect(full.user).toContain('25–30');
    const body = JSON.parse(chatCompletionBody('gpt-4o-mini', prompt.system, prompt.user)) as {
      messages: { content: string }[];
    };
    expect(body.messages[1]?.content).toContain('В кафе');
  });
});

describe('parseTopicArgs', () => {
  it('reads repeated goals and the starter day', () => {
    expect(
      parseTopicArgs([
        '--level',
        'A1',
        '--category',
        'food',
        '--title-ru',
        'В кафе',
        '--slug',
        'cafe',
        '--icon',
        'cup',
        '--starter-day',
        '2',
        '--can-do',
        'Заказать напиток',
        '--can-do',
        'Спросить цену',
      ]),
    ).toMatchObject({
      slug: 'cafe',
      starterDay: 2,
      canDoRu: ['Заказать напиток', 'Спросить цену'],
    });
  });
});

describe('content report', () => {
  it('counts phrases, drafts, and missing audio without failing on them', () => {
    const draft = validDraft();
    const report = buildReport({
      items: draft.items,
      topics: [draft.topic],
      lessons: draft.lessons,
      scenes: [draft.scene],
    });

    expect(report.ok).toBe(true);
    expect(report.phraseShare).toBeGreaterThan(0.5);
    expect(report.missingAudio.length).toBe(report.items);
    expect(report.lessons[0]).toMatchObject({ id: 'a1.cafe.l1', units: 6, draft: true });
    expect(formatReport(report)).toContain('a1.cafe.l1');
    expect(formatReport(report)).toContain('Ссылки: ок');
    expect(formatReport(report)).toContain('Не хватает переводов');
    expect(report.missingTranslations).toEqual({ ru: [], uk: [], en: [] });
  });

  it('lists a missing language and still treats links as ok', () => {
    const draft = validDraft();
    const gap = {
      ...draft.items[0]!,
      tr: { ru: draft.items[0]!.tr.ru, en: 'Coffee, please' },
    };
    const report = buildReport({
      items: [gap, ...draft.items.slice(1)],
      topics: [draft.topic],
      lessons: draft.lessons,
      scenes: [draft.scene],
    });

    expect(report.ok).toBe(true);
    expect(report.missingTranslations.uk).toContain(`item ${gap.id} tr`);
    expect(formatReport(report)).toContain(`item ${gap.id} tr`);
    expect(
      draftIssues({ ...draft, items: [gap, ...draft.items.slice(1)] }, spec).join('\n'),
    ).toContain(`missing uk translation: item ${gap.id} tr`);
  });

  it('fails when a lesson points at a missing unit', () => {
    const draft = validDraft();
    const broken = {
      ...draft.lessons[0]!,
      items: ['cafe.missing', ...draft.lessons[0]!.items.slice(1)],
    };
    const report = buildReport({
      items: draft.items,
      topics: [draft.topic],
      lessons: [broken, draft.lessons[1]!],
      scenes: [draft.scene],
    });

    expect(report.ok).toBe(false);
    expect(formatReport(report)).toContain('cafe.missing is missing');
  });
});

describe('tts plan', () => {
  it('plans both voices and both speeds, and skips a narrator recording', () => {
    const spain = { ...word('cafe.aqui'), variant: 'es' as const };
    const clips = planItemClips(spain);
    expect(needsGeneratedAudio(spain)).toBe(true);
    expect(clips.map((clip) => `${clip.locale} ${clip.speed}`)).toEqual([
      'es-ES normal',
      'es-ES slow',
    ]);
    expect(audioObjectPath(spain, { partIndex: null, voice: 'es', speed: 'slow' })).toBe(
      'items/a1/cafe/aqui.es.slow.m4a',
    );
    expect(planItemClips({ ...spain, audio: { ...spain.audio, source: 'human' } })).toEqual([]);

    const phraseItem = phrase('cafe.un_cafe', 'Un café', 'Кофе');
    const part = planItemClips(phraseItem).find((clip) => clip.partIndex === 0);
    expect(part?.objectPath).toBe('items/a1/cafe/un_cafe.p0.es.normal.m4a');
    expect(
      planItemClips({ ...word('cafe.gracias'), variant: 'latam' }).every(
        (clip) => clip.voice === 'latam',
      ),
    ).toBe(true);
  });

  it('asks the neural voice for SSML rate 75% and encodes aac 64k without stretching', () => {
    const slow = spanishSsml('café & té', 'es-MX', 'es-MX-DaliaNeural', 'slow');
    expect(slow).toContain(`rate="${SLOW_PROSODY}"`);
    expect(slow).toContain('es-MX-DaliaNeural');
    expect(slow).toContain('café &amp; té');
    expect(spanishSsml('hola', 'es-ES', 'es-ES-ElviraNeural', 'normal')).not.toContain('prosody');

    const azure = ttsAdapter('azure').request({
      apiKey: 'secret',
      text: 'Hola',
      locale: 'es-ES',
      speed: 'slow',
      region: 'westeurope',
    });
    expect(azure.headers['Ocp-Apim-Subscription-Key']).toBe('secret');
    expect(azure.body).toContain('rate="75%"');
    expect(azure.body).toContain('es-ES-ElviraNeural');

    const openai = JSON.parse(
      ttsAdapter('openai').request({
        apiKey: 'secret',
        text: 'Hola',
        locale: 'es-ES',
        speed: 'slow',
      }).body ?? '{}',
    ) as { speed: number };
    expect(openai.speed).toBe(0.75);

    const args = normalizeAudioArgs('in.mp3', 'out.m4a');
    expect(args).toEqual(expect.arrayContaining(['-c:a', 'aac', '-b:a', '64k']));
    expect(args.join(' ')).toContain('loudnorm');
    expect(args.join(' ')).toContain('silenceremove');
    expect(args.join(' ')).not.toContain('atempo');

    const upload = storageUploadRequest({
      supabaseUrl: 'http://127.0.0.1:54321/',
      apiKey: 'storage',
      objectPath: 'items/a1/cafe/un_cafe.es.normal.m4a',
    });
    expect(upload.url).toBe(
      'http://127.0.0.1:54321/storage/v1/object/audio/items/a1/cafe/un_cafe.es.normal.m4a',
    );
    expect(upload.headers['Content-Type']).toBe('audio/mp4');
    expect(audioUploadContentType('items/a1/hola/hola.es.normal.mp3')).toBe('audio/mpeg');
    expect(AUDIO_BUCKET_MIME_TYPES).toContain(upload.headers['Content-Type']);
    expect(AUDIO_BUCKET_MIME_TYPES).toContain(audioUploadContentType('clip.mp3'));
    expect(AUDIO_BUCKET_MIME_TYPES).toEqual([
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
      'audio/mpeg',
    ]);
    expect(() => audioUploadContentType('clip.wav')).toThrow(/\.m4a/);
  });

  it('writes clip paths and does not replace a human recording', () => {
    const next = applyAudioPaths(
      [
        { id: 'cafe.un_cafe', ru: 'Кофе', audio: { es: null, latam: null } },
        { id: 'human.hola', audio: { source: 'human', es: 'items/a1/hola/human.m4a' } },
        { id: 'other' },
      ],
      [
        {
          id: 'cafe.un_cafe',
          partIndex: null,
          voice: 'es',
          speed: 'normal',
          path: 'items/a1/cafe/un_cafe.es.normal.m4a',
        },
        {
          id: 'cafe.un_cafe',
          partIndex: 0,
          voice: 'latam',
          speed: 'slow',
          path: 'items/a1/cafe/un_cafe.p0.mx.slow.m4a',
        },
        {
          id: 'human.hola',
          partIndex: null,
          voice: 'es',
          speed: 'normal',
          path: 'items/a1/hola/tts.m4a',
        },
      ],
    );
    expect(next).toEqual([
      {
        id: 'cafe.un_cafe',
        ru: 'Кофе',
        audio: {
          source: 'tts',
          es: 'items/a1/cafe/un_cafe.es.normal.m4a',
          latam: null,
          slow: { es: null, latam: null },
          parts: [
            {
              es: null,
              latam: null,
              slow: { es: null, latam: 'items/a1/cafe/un_cafe.p0.mx.slow.m4a' },
            },
          ],
        },
      },
      { id: 'human.hola', audio: { source: 'human', es: 'items/a1/hola/human.m4a' } },
      { id: 'other' },
    ]);
  });

  it('counts a unit as playable only when every required clip is stored', () => {
    const ready = {
      ...word('cafe.aqui'),
      variant: 'es' as const,
      parts: [],
      audio: {
        ...word('cafe.aqui').audio,
        es: 'https://cdn.example/a.m4a',
        slow: { es: 'items/a1/cafe/aqui.es.slow.m4a', latam: null },
      },
    };
    expect(hasPlayableAudio(ready)).toBe(true);
    expect(hasPlayableAudio(word('cafe.aqui'))).toBe(false);
    expect(needsGeneratedAudio(ready)).toBe(false);
  });
});

describe('draft files', () => {
  it('plans the v2 paths and registers each require once', () => {
    const plan = draftFilePlan(forceDraft(validDraft()));
    expect(plan.map((file) => file.path)).toEqual([
      'content/items/a1/cafe.json',
      'content/topics/a1/cafe/topic.json',
      'content/topics/a1/cafe/l1.json',
      'content/topics/a1/cafe/l2.json',
      'content/topics/a1/cafe/scene.json',
    ]);

    const loader = `const ITEM_FILES: readonly unknown[] = [\n];\nconst TOPIC_FILES: readonly unknown[] = [\n];\nconst LESSON_FILES: readonly unknown[] = [\n];\nconst SCENE_FILES: readonly unknown[] = [\n];\n`;
    const once = registerRequires(
      loader,
      plan.map((file) => file.path),
    );
    const twice = registerRequires(
      once,
      plan.map((file) => file.path),
    );
    expect(twice).toBe(once);
    expect(once).toContain("require('../../../content/items/a1/cafe.json')");
    expect(once).toContain("require('../../../content/topics/a1/cafe/l1.json')");
  });
});

describe('loader links', () => {
  it('reports a file that the app cannot require', () => {
    expect(loaderLinkIssues('', ['content/items/a1/cafe.json'])).toEqual([
      'content file content/items/a1/cafe.json is not registered in the loader',
    ]);
  });
});

describe('readCompletion', () => {
  it('reads the assistant message', () => {
    expect(readCompletion({ choices: [{ message: { content: '{"ok":true}' } }] })).toBe(
      '{"ok":true}',
    );
  });
});

describe('starter week on disk', () => {
  it('resolves every link in the seven-day course', () => {
    const loaded = loadContent(process.cwd());
    const report = buildReport(loaded.bundle, loaded.issues);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.missingTranslations).toEqual({ ru: [], uk: [], en: [] });
    expect(report.draftTopics).toBe(report.topics);
    expect(report.phraseShare).toBeGreaterThanOrEqual(0.6);
    const sample = comparePhrases(loaded.bundle);
    expect(sample).toHaveLength(10);
    expect(sample.every((item) => item.type === 'phrase')).toBe(true);
    expect(compareClipName(0, sample[0]!.id, 'azure')).toMatch(/^01-.+-azure\.m4a$/);
  });
});

function rawDraft(): unknown {
  const draft = validDraft();
  return {
    ...draft,
    items: draft.items.map((item) => ({
      ...item,
      draft: false,
      audio: { es: 'fake.mp3', latam: null },
    })),
    topic: { ...draft.topic, draft: false },
  };
}

function validDraft(): TopicDraft {
  const items = [
    phrase('cafe.hola_buenos', 'Buenos días', 'Доброе утро'),
    phrase('cafe.cafe_con_leche', 'Un café con leche', 'Кофе с молоком'),
    phrase('cafe.un_te', 'Un té', 'Чай'),
    phrase('cafe.para_llevar', 'Para llevar', 'С собой'),
    phrase('cafe.cuanto_es', 'Cuánto es', 'Сколько'),
    word('cafe.aqui'),
    phrase('cafe.la_cuenta', 'La cuenta', 'Счёт'),
    phrase('cafe.nada_mas', 'Nada más', 'Больше ничего'),
    phrase('cafe.esta_bien', 'Está bien', 'Хорошо'),
    phrase('cafe.por_favor', 'Por favor', 'Пожалуйста'),
    word('cafe.gracias', 'gracias', 'спасибо'),
  ];
  const topic = TopicSchema.parse({
    id: 'a1.cafe',
    level: 'A1',
    category: 'food',
    title: fillLocales('В кафе'),
    icon: 'cup',
    can_do: [fillLocales('Заказать напиток')],
    lessons: ['a1.cafe.l1', 'a1.cafe.l2'],
    scene: 'a1.cafe.scene',
    starter_day: 2,
    draft: true,
  });
  const lessons = [
    lesson(
      'a1.cafe.l1',
      'Заказываем',
      items.slice(0, 6).map((item) => item.id),
      ['cafe.cafe_con_leche', 'cafe.para_llevar'],
    ),
    lesson(
      'a1.cafe.l2',
      'Счёт',
      [
        'cafe.cuanto_es',
        'cafe.la_cuenta',
        'cafe.nada_mas',
        'cafe.esta_bien',
        'cafe.por_favor',
        'cafe.gracias',
      ],
      ['cafe.cuanto_es', 'cafe.la_cuenta'],
    ),
  ];
  return {
    items,
    topic,
    lessons,
    scene: SceneSchema.parse({
      id: 'a1.cafe.scene',
      topic: 'a1.cafe',
      title: fillLocales('У стойки'),
      draft: true,
    }),
  };
}

function lesson(id: string, title: string, items: string[], speak: string[]) {
  const target = items[0] ?? id;
  const other = items[1] ?? target;
  return LessonSchema.parse({
    id,
    topic: 'a1.cafe',
    title: fillLocales(title),
    items,
    speak,
    dialog: {
      lines: [
        { who: 'npc', es: '¿Qué le pongo?', tr: fillLocales('Что вам?') },
        { who: 'user', target, options: [target, other] },
        { who: 'npc', es: 'Aquí tiene.', tr: fillLocales('Вот.') },
        { who: 'user', target: other, options: [other, target] },
      ],
    },
    draft: true,
  });
}

function phrase(id: string, es: string, ru: string): Item {
  const [first, ...rest] = es.split(' ');
  return ItemSchema.parse({
    id,
    type: 'phrase',
    es,
    tr: fillLocales(ru),
    parts: [
      { es: first, tr: fillLocales('а') },
      { es: rest.join(' '), tr: fillLocales('б') },
    ],
    say: fillLocales(es),
    level: 'A1',
    draft: true,
  });
}

function word(id: string, es = 'aquí', ru = 'здесь'): Item {
  return ItemSchema.parse({
    id,
    type: 'word',
    es,
    tr: fillLocales(ru),
    say: fillLocales(es),
    level: 'A1',
    draft: true,
  });
}
