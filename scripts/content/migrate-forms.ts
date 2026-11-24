/**
 * One-shot content migration:
 * gender pairs → forms, fragment phrases → full lines, numbers one per card,
 * dialog `accept`, scene partner and place.
 *
 * Run: npx tsx scripts/content/migrate-forms.ts
 */
import fs from 'fs';
import path from 'path';

import { migrateGenderItem, type GenderChange } from '../../src/features/content/gender';
import { ItemSchema, type Item, type LocalizedText } from '../../src/features/content/schema';

type ChangeRow = {
  id: string;
  beforeEs: string;
  afterEs: string;
  beforeRu: string;
  afterRu: string;
  beforeUk: string;
  afterUk: string;
  beforeEn: string;
  afterEn: string;
};

const root = process.cwd();
const rows: ChangeRow[] = [];

function main(): void {
  for (const file of walk(path.join(root, 'content/items'))) {
    const items = JSON.parse(fs.readFileSync(file, 'utf8')) as Item[];
    const removed = items.filter((item) => REMOVED_NUMBER_IDS.has(item.id));
    for (const item of removed) {
      rows.push({
        id: item.id,
        beforeEs: item.es,
        afterEs: '—',
        beforeRu: item.tr.ru ?? '',
        afterRu: '—',
        beforeUk: item.tr.uk ?? '',
        afterUk: '—',
        beforeEn: item.tr.en ?? '',
        afterEn: '—',
      });
    }
    const next = items
      .filter((item) => !REMOVED_NUMBER_IDS.has(item.id))
      .map((item) => finishItem(item));
    if (file.endsWith(`${path.sep}numbers.json`) && !next.some((item) => item.id === 'numbers.cero')) {
      next.push(...numberItems());
    }
    for (const item of next) ItemSchema.parse(item);
    writeIfChanged(file, items, next);
  }

  for (const file of walk(path.join(root, 'content/topics'))) {
    if (!file.endsWith('.json')) continue;
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    const before = JSON.stringify(raw);
    if (file.endsWith(`${path.sep}topic.json`) && raw.id === 'a1.numbers') {
      raw.lessons = ['a1.numbers.l1', 'a1.numbers.l2', 'a1.numbers.l3', 'a1.numbers.l4'];
    }
    if (typeof raw.id === 'string' && raw.id.endsWith('.scene')) fillScene(raw);
    if (raw.dialog) migrateDialog(raw);
    writeIfChanged(file, JSON.parse(before) as unknown, raw);
  }

  writeNumberLessons();
  updateCoursePlan();
  console.log(markdownTable(rows));
}

const REMOVED_NUMBER_IDS = new Set([
  'numbers.cuatro_y_cinco',
  'numbers.seis_y_siete',
  'numbers.ocho_y_nueve',
]);

function finishItem(item: Item): Item {
  const migrated = migrateGenderItem(item);
  let next = migrated.item;
  if (migrated.change) pushChange(migrated.change);
  next = phraseFix(next);
  if (next.id === 'hola.encantado' && next.es.trim().split(/\s+/).length === 1) {
    next = { ...next, type: 'word' };
  }
  next = verbNote(next);
  next = numberDisplay(next);
  notePartChange(item, next);
  return next;
}

function notePartChange(before: Item, after: Item): void {
  const beforeParts = partCell(before);
  const afterParts = partCell(after);
  if (beforeParts === afterParts) return;
  if (rows.some((row) => row.id === before.id)) return;
  rows.push({
    id: before.id,
    beforeEs: before.es,
    afterEs: after.es,
    beforeRu: partCell(before, 'ru'),
    afterRu: partCell(after, 'ru'),
    beforeUk: partCell(before, 'uk'),
    afterUk: partCell(after, 'uk'),
    beforeEn: partCell(before, 'en'),
    afterEn: partCell(after, 'en'),
  });
}

function partCell(item: Item, lang: 'ru' | 'uk' | 'en' = 'en'): string {
  return (item.parts ?? [])
    .map((part) => part.tr[lang] ?? '')
    .filter((line) => line.length > 0)
    .join(' · ');
}

function phraseFix(item: Item): Item {
  if (item.id === 'hola.soy') {
    return replacePhrase(item, {
      type: 'phrase',
      es: 'Soy Ana',
      tr: { ru: 'Я Ана', uk: 'Я Ана', en: "I'm Ana" },
      literal: null,
      parts: [
        { es: 'Soy', tr: { ru: 'я есть', uk: 'я є', en: 'I am' } },
        { es: 'Ana', tr: { ru: 'Ана', uk: 'Ана', en: 'Ana' } },
      ],
      say: { ru: 'сой Ана', uk: 'сой Ана', en: 'soy Ana' },
      note: {
        ru: 'Имя после soy. Инфинитив ser.',
        uk: "Ім'я після soy. Інфінітив ser.",
        en: 'The name follows soy. Infinitive ser.',
      },
      clearAudio: true,
    });
  }
  if (item.id === 'hola.me_llamo') {
    return replacePhrase(item, {
      type: 'phrase',
      es: 'Me llamo {name}',
      tr: { ru: 'Меня зовут {name}', uk: 'Мене звати {name}', en: 'My name is {name}' },
      say: { ru: 'ме йАмо', uk: 'ме йАмо', en: 'me yAmo' },
      note: {
        ru: 'Вместо {name} — имя из профиля. Инфинитив llamarse.',
        uk: "Замість {name} — ім'я з профілю. Інфінітив llamarse.",
        en: '{name} is the name from the profile. Infinitive llamarse.',
      },
      clearAudio: true,
    });
  }
  if (item.id === 'cafe.quiero' || item.id === 'mercado.quiero') {
    return replacePhrase(item, {
      tr: { ru: 'я хочу', uk: 'я хочу', en: 'I want' },
      note: {
        ru: '(querer). Дальше сразу то, что вы хотите.',
        uk: '(querer). Далі одразу те, що ви хочете.',
        en: '(querer). What you want comes right after.',
      },
    });
  }
  return item;
}

function verbNote(item: Item): Item {
  if (item.es.trim().toLowerCase() !== 'quisiera') return item;
  if (item.note && [item.note.ru, item.note.uk, item.note.en].some((line) => line?.includes('querer'))) {
    return item;
  }
  return {
    ...item,
    note: {
      ru: '(querer). Вежливое «я бы хотел».',
      uk: '(querer). Ввічливе «я б хотів».',
      en: '(querer). A polite "I would like".',
    },
  };
}

function numberDisplay(item: Item): Item {
  const digit: Record<string, string> = {
    cero: '0',
    uno: '1',
    dos: '2',
    tres: '3',
    cuatro: '4',
    cinco: '5',
    seis: '6',
    siete: '7',
    ocho: '8',
    nueve: '9',
    diez: '10',
  };
  const token = item.es.trim().toLowerCase();
  const display = digit[token];
  if (!display || item.display === display) return item;
  return { ...item, display };
}

function replacePhrase(
  item: Item,
  patch: {
    type?: Item['type'];
    es?: string;
    tr?: LocalizedText;
    literal?: Item['literal'];
    parts?: Item['parts'];
    say?: LocalizedText;
    note?: LocalizedText;
    clearAudio?: boolean;
  },
): Item {
  const before = { es: item.es, ru: item.tr.ru ?? '', uk: item.tr.uk ?? '', en: item.tr.en ?? '' };
  const next: Item = {
    ...item,
    ...(patch.type ? { type: patch.type } : {}),
    ...(patch.es ? { es: patch.es } : {}),
    ...(patch.tr ? { tr: patch.tr } : {}),
    ...(patch.literal !== undefined ? { literal: patch.literal } : {}),
    ...(patch.parts ? { parts: patch.parts } : {}),
    ...(patch.say ? { say: patch.say } : {}),
    ...(patch.note ? { note: patch.note } : {}),
    ...(patch.clearAudio
      ? {
          audio: {
            source: 'tts' as const,
            es: null,
            latam: null,
            slow: { es: null, latam: null },
            parts: [],
            features: null,
          },
        }
      : {}),
  };
  if (
    before.es !== next.es ||
    before.ru !== (next.tr.ru ?? '') ||
    before.uk !== (next.tr.uk ?? '') ||
    before.en !== (next.tr.en ?? '')
  ) {
    rows.push({
      id: item.id,
      beforeEs: before.es,
      afterEs: next.es,
      beforeRu: before.ru,
      afterRu: next.tr.ru ?? '',
      beforeUk: before.uk,
      afterUk: next.tr.uk ?? '',
      beforeEn: before.en,
      afterEn: next.tr.en ?? '',
    });
  }
  return next;
}

function pushChange(change: GenderChange): void {
  if (
    change.before.es === change.after.es &&
    change.before.ru === change.after.ru &&
    change.before.uk === change.after.uk &&
    change.before.en === change.after.en
  ) {
    return;
  }
  rows.push({
    id: change.id,
    beforeEs: change.before.es,
    afterEs: change.after.es,
    beforeRu: change.before.ru,
    afterRu: change.after.ru,
    beforeUk: change.before.uk,
    afterUk: change.after.uk,
    beforeEn: change.before.en,
    afterEn: change.after.en,
  });
}

function writeIfChanged(file: string, before: unknown, after: unknown): void {
  if (JSON.stringify(before) === JSON.stringify(after)) return;
  fs.writeFileSync(file, `${JSON.stringify(after, null, 2)}\n`);
}

function numberItems(): Item[] {
  const words: { id: string; es: string; display: string; ru: string; uk: string; en: string; say: string }[] = [
    { id: 'numbers.cero', es: 'cero', display: '0', ru: 'ноль', uk: 'нуль', en: 'zero', say: 'сЭро' },
    { id: 'numbers.cuatro', es: 'cuatro', display: '4', ru: 'четыре', uk: 'чотири', en: 'four', say: 'куАтро' },
    { id: 'numbers.cinco', es: 'cinco', display: '5', ru: 'пять', uk: "п'ять", en: 'five', say: 'сИнко' },
    { id: 'numbers.seis', es: 'seis', display: '6', ru: 'шесть', uk: 'шість', en: 'six', say: 'сейс' },
    { id: 'numbers.siete', es: 'siete', display: '7', ru: 'семь', uk: 'сім', en: 'seven', say: 'сьЕте' },
    { id: 'numbers.ocho', es: 'ocho', display: '8', ru: 'восемь', uk: 'вісім', en: 'eight', say: 'Очо' },
    { id: 'numbers.nueve', es: 'nueve', display: '9', ru: 'девять', uk: "дев'ять", en: 'nine', say: 'нуЭве' },
    { id: 'numbers.diez', es: 'diez', display: '10', ru: 'десять', uk: 'десять', en: 'ten', say: 'дьес' },
  ];
  const phrases: { id: string; es: string; ru: string; uk: string; en: string; say: string }[] = [
    { id: 'numbers.cuantos', es: '¿Cuántos?', ru: 'Сколько?', uk: 'Скільки?', en: 'How many?', say: 'куАнтос' },
    { id: 'numbers.dos_cafes', es: 'Dos cafés', ru: 'Два кофе', uk: 'Дві кави', en: 'Two coffees', say: 'дос кафЭс' },
    {
      id: 'numbers.cuantos_anos',
      es: '¿Cuántos años tienes?',
      ru: 'Сколько тебе лет?',
      uk: 'Скільки тобі років?',
      en: 'How old are you?',
      say: 'куАнтос Аньос тьЕнес',
    },
    {
      id: 'numbers.tengo_treinta',
      es: 'Tengo treinta años',
      ru: 'Мне тридцать лет',
      uk: 'Мені тридцять років',
      en: 'I am thirty',
      say: 'тЭнго трейнта Аньос',
    },
    {
      id: 'numbers.tengo_treinta_y_dos',
      es: 'Tengo treinta y dos años',
      ru: 'Мне тридцать два года',
      uk: 'Мені тридцять два роки',
      en: 'I am thirty-two',
      say: 'тЭнго трейнта и дос Аньос',
    },
    {
      id: 'numbers.mi_numero',
      es: 'Mi número es…',
      ru: 'Мой номер…',
      uk: 'Мій номер…',
      en: 'My number is…',
      say: 'ми нУмеро эс',
    },
    { id: 'numbers.cien', es: 'cien', ru: 'сто', uk: 'сто', en: 'one hundred', say: 'сьен' },
    { id: 'numbers.mil', es: 'mil', ru: 'тысяча', uk: 'тисяча', en: 'one thousand', say: 'миль' },
  ];
  return [
    ...words.map((word) => card(word.id, 'word', word.es, word.ru, word.uk, word.en, word.say, word.display)),
    ...phrases.map((phrase) =>
      card(phrase.id, phrase.es.split(/\s+/).length > 1 ? 'phrase' : 'word', phrase.es, phrase.ru, phrase.uk, phrase.en, phrase.say),
    ),
  ];
}

function card(
  id: string,
  type: 'word' | 'phrase',
  es: string,
  ru: string,
  uk: string,
  en: string,
  say: string,
  display?: string,
): Item {
  rows.push({
    id,
    beforeEs: '—',
    afterEs: es,
    beforeRu: '—',
    afterRu: ru,
    beforeUk: '—',
    afterUk: uk,
    beforeEn: '—',
    afterEn: en,
  });
  return ItemSchema.parse({
    id,
    type,
    es,
    tr: { ru, uk, en },
    say: { ru: say, uk: say, en: say.toLowerCase() },
    ...(display ? { display } : {}),
    level: 'A1',
    tags: ['number'],
    draft: true,
    draft_i18n: true,
  });
}

function migrateDialog(raw: Record<string, unknown>): void {
  const dialog = raw.dialog as { lines?: Record<string, unknown>[] } | undefined;
  if (!dialog?.lines) return;
  for (const line of dialog.lines) {
    if (line.who !== 'user') continue;
    if (!line.accept && typeof line.target === 'string') {
      line.accept = [line.target];
      delete line.target;
    }
  }
  if (raw.id === 'a1.hola.l2') {
    for (const line of dialog.lines) {
      if (line.who !== 'user' || !Array.isArray(line.accept)) continue;
      if (line.accept[0] === 'hola.me_llamo') line.slot = 'name';
      if (line.accept[0] === 'hola.mucho_gusto') {
        line.accept = ['hola.mucho_gusto', 'hola.encantado'];
      }
    }
  }
}

const SCENES: Record<string, { partner: LocalizedText; place: LocalizedText }> = {
  'a1.hola.scene': {
    partner: { ru: 'Ана', uk: 'Ана', en: 'Ana' },
    place: { ru: 'Знакомство на вечеринке', uk: 'Знайомство на вечірці', en: 'Meeting someone at a party' },
  },
  'a1.cafe.scene': {
    partner: { ru: 'Лусия', uk: 'Лусія', en: 'Lucía' },
    place: { ru: 'У стойки кафе', uk: 'Біля стійки кав’ярні', en: 'At the café counter' },
  },
  'a1.numbers.scene': {
    partner: { ru: 'Пабло', uk: 'Пабло', en: 'Pablo' },
    place: { ru: 'На рынке', uk: 'На ринку', en: 'At the market' },
  },
  'a1.tienda.scene': {
    partner: { ru: 'Марта', uk: 'Марта', en: 'Marta' },
    place: { ru: 'У кассы', uk: 'Біля каси', en: 'At the checkout' },
  },
  'a1.camino.scene': {
    partner: { ru: 'Луис', uk: 'Луїс', en: 'Luis' },
    place: { ru: 'На улице', uk: 'На вулиці', en: 'On the street' },
  },
  'a1.restaurante.scene': {
    partner: { ru: 'Кармен', uk: 'Кармен', en: 'Carmen' },
    place: { ru: 'Ужин в ресторане', uk: 'Вечеря в ресторані', en: 'Dinner at a restaurant' },
  },
  'a1.mercado.scene': {
    partner: { ru: 'Роса', uk: 'Роса', en: 'Rosa' },
    place: { ru: 'У прилавка', uk: 'Біля прилавка', en: 'At the stall' },
  },
  'a1.supermercado.scene': {
    partner: { ru: 'Диего', uk: 'Дієго', en: 'Diego' },
    place: { ru: 'У кассы', uk: 'Біля каси', en: 'At the checkout' },
  },
  'a1.ropa.scene': {
    partner: { ru: 'Елена', uk: 'Олена', en: 'Elena' },
    place: { ru: 'В примерочной', uk: 'У примірочній', en: 'In the fitting room' },
  },
  'a1.metro.scene': {
    partner: { ru: 'Андрес', uk: 'Андрес', en: 'Andrés' },
    place: { ru: 'На станции метро', uk: 'На станції метро', en: 'At the metro station' },
  },
  'a1.tiempo.scene': {
    partner: { ru: 'Пабло', uk: 'Пабло', en: 'Pablo' },
    place: { ru: 'В субботу утром', uk: 'У суботу вранці', en: 'Saturday morning' },
  },
  'a1.primera.scene': {
    partner: { ru: 'Ана', uk: 'Ана', en: 'Ana' },
    place: { ru: 'День в городе', uk: 'День у місті', en: 'A day in the city' },
  },
};

function fillScene(raw: Record<string, unknown>): void {
  const scene = SCENES[String(raw.id)];
  if (!scene) return;
  raw.partner = scene.partner;
  raw.place = scene.place;
}

function writeNumberLessons(): void {
  const dir = path.join(root, 'content/topics/a1/numbers');
  const lesson = (
    id: string,
    title: LocalizedText,
    items: string[],
    speak: string[],
    lines: Record<string, unknown>[],
  ) => ({
    id,
    topic: 'a1.numbers',
    title,
    items,
    speak,
    dialog: { lines },
    overrides: [],
    draft: true,
    draft_i18n: true,
  });
  const npc = (es: string, ru: string, uk: string, en: string) => ({
    who: 'npc',
    es,
    tr: { ru, uk, en },
  });
  const user = (accept: string[], options: string[]) => ({ who: 'user', accept, options });

  const files: Record<string, unknown> = {
    'l1.json': lesson(
      'a1.numbers.l1',
      { ru: 'Числа 1–5', uk: 'Числа 1–5', en: 'Numbers 1–5' },
      ['numbers.uno', 'numbers.dos', 'numbers.tres', 'numbers.cuatro', 'numbers.cinco', 'numbers.cuantos'],
      ['numbers.tres', 'numbers.cuantos'],
      [
        npc('¿Cuántos?', 'Сколько?', 'Скільки?', 'How many?'),
        user(['numbers.tres'], ['numbers.tres', 'numbers.uno', 'numbers.dos']),
        npc('¿Y cinco?', 'А пять?', "А п'ять?", 'And five?'),
        user(['numbers.cinco'], ['numbers.cinco', 'numbers.cuatro', 'numbers.dos']),
      ],
    ),
    'l2.json': lesson(
      'a1.numbers.l2',
      { ru: 'Числа 6–10', uk: 'Числа 6–10', en: 'Numbers 6–10' },
      ['numbers.seis', 'numbers.siete', 'numbers.ocho', 'numbers.nueve', 'numbers.diez', 'numbers.dos_cafes'],
      ['numbers.ocho', 'numbers.dos_cafes'],
      [
        npc('¿Cuántos cafés?', 'Сколько кофе?', 'Скільки кави?', 'How many coffees?'),
        user(['numbers.dos_cafes'], ['numbers.dos_cafes', 'numbers.ocho', 'numbers.diez']),
        npc('¿Y el ocho?', 'А восемь?', 'А вісім?', 'And eight?'),
        user(['numbers.ocho'], ['numbers.ocho', 'numbers.nueve', 'numbers.seis']),
      ],
    ),
    'l3.json': lesson(
      'a1.numbers.l3',
      { ru: 'Цены', uk: 'Ціни', en: 'Prices' },
      [
        'numbers.cuanto_cuesta',
        'numbers.cuanto_cuestan',
        'numbers.un_euro',
        'numbers.dos_euros',
        'numbers.diez_euros',
        'numbers.dos_con_cincuenta',
      ],
      ['numbers.cuanto_cuesta', 'numbers.dos_euros'],
      [
        npc('¿Cuánto cuesta?', 'Сколько стоит?', 'Скільки коштує?', 'How much is it?'),
        user(['numbers.dos_euros'], ['numbers.dos_euros', 'numbers.un_euro', 'numbers.diez_euros']),
        npc('Son dos con cincuenta.', 'Два пятьдесят.', "Два п'ятдесят.", 'Two fifty.'),
        user(
          ['numbers.dos_con_cincuenta'],
          ['numbers.dos_con_cincuenta', 'numbers.cuanto_cuesta', 'numbers.diez_euros'],
        ),
      ],
    ),
    'l4.json': lesson(
      'a1.numbers.l4',
      { ru: 'Возраст и телефон', uk: 'Вік і телефон', en: 'Age and phone' },
      [
        'numbers.cuantos_anos',
        'numbers.tengo_treinta',
        'numbers.tengo_treinta_y_dos',
        'numbers.mi_numero',
        'numbers.cero',
        'numbers.cien',
        'numbers.mil',
      ],
      ['numbers.cuantos_anos', 'numbers.tengo_treinta'],
      [
        npc('¿Cuántos años tienes?', 'Сколько тебе лет?', 'Скільки тобі років?', 'How old are you?'),
        user(
          ['numbers.tengo_treinta'],
          ['numbers.tengo_treinta', 'numbers.tengo_treinta_y_dos', 'numbers.mi_numero'],
        ),
        npc('¿Y el teléfono?', 'А телефон?', 'А телефон?', 'And the phone?'),
        user(['numbers.mi_numero'], ['numbers.mi_numero', 'numbers.cero', 'numbers.cien']),
      ],
    ),
  };
  for (const [name, body] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), `${JSON.stringify(body, null, 2)}\n`);
  }
}

function updateCoursePlan(): void {
  const file = path.join(root, 'content/course-plan.json');
  const plan = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    levels: { units: { topics: { id: string; lessons: { items?: { es?: string; ru?: string }[] }[] }[] }[] }[];
  };
  const before = JSON.stringify(plan);
  for (const level of plan.levels) {
    for (const unit of level.units) {
      for (const topic of unit.topics) {
        if (topic.id === 'a1.numbers') topic.lessons = numberPlanLessons() as typeof topic.lessons;
        if (!Array.isArray(topic.lessons)) continue;
        for (const lesson of topic.lessons) {
          for (const entry of lesson.items ?? []) {
            if (entry.es === 'Soy Pablo') {
              entry.es = 'Soy Ana';
              if (entry.ru === 'Я Пабло') entry.ru = 'Я Ана';
            }
          }
        }
      }
    }
  }
  if (JSON.stringify(plan) === before) return;
  fs.writeFileSync(file, `${JSON.stringify(plan, null, 2)}\n`);
}

function numberPlanLessons(): unknown[] {
  const item = (es: string, ru: string, type: 'word' | 'phrase', display?: string) => ({
    es,
    ru,
    type,
    ...(display ? { display } : {}),
  });
  return [
    {
      id: 'a1.numbers.l1',
      title_ru: 'Числа 1–5',
      goal_ru: 'Считать от одного до пяти и спросить «сколько?»',
      items: [
        item('Uno', 'Один', 'word', '1'),
        item('Dos', 'Два', 'word', '2'),
        item('Tres', 'Три', 'word', '3'),
        item('Cuatro', 'Четыре', 'word', '4'),
        item('Cinco', 'Пять', 'word', '5'),
        item('¿Cuántos?', 'Сколько?', 'word'),
      ],
    },
    {
      id: 'a1.numbers.l2',
      title_ru: 'Числа 6–10',
      goal_ru: 'Считать от шести до десяти и назвать количество',
      items: [
        item('Seis', 'Шесть', 'word', '6'),
        item('Siete', 'Семь', 'word', '7'),
        item('Ocho', 'Восемь', 'word', '8'),
        item('Nueve', 'Девять', 'word', '9'),
        item('Diez', 'Десять', 'word', '10'),
        item('Dos cafés', 'Два кофе', 'phrase'),
      ],
    },
    {
      id: 'a1.numbers.l3',
      title_ru: 'Цены',
      goal_ru: 'Спросить и понять цену',
      items: [
        item('¿Cuánto cuesta?', 'Сколько стоит?', 'phrase'),
        item('¿Cuánto cuestan?', 'Сколько стоят?', 'phrase'),
        item('Un euro', 'Один евро', 'phrase'),
        item('Dos euros', 'Два евро', 'phrase'),
        item('Diez euros', 'Десять евро', 'phrase'),
        item('Dos con cincuenta', 'Два пятьдесят', 'phrase'),
      ],
    },
    {
      id: 'a1.numbers.l4',
      title_ru: 'Возраст и телефон',
      goal_ru: 'Назвать возраст и номер телефона',
      items: [
        item('¿Cuántos años tienes?', 'Сколько тебе лет?', 'phrase'),
        item('Tengo treinta años', 'Мне тридцать лет', 'phrase'),
        item('Tengo treinta y dos años', 'Мне тридцать два года', 'phrase'),
        item('Mi número es…', 'Мой номер…', 'phrase'),
        item('Cero', 'Ноль', 'word', '0'),
        item('Cien', 'Сто', 'word'),
        item('Mil', 'Тысяча', 'word'),
      ],
    },
  ];
}

function markdownTable(changes: ChangeRow[]): string {
  const lines = [
    '| id | es было | es стало | ru было | ru стало | uk было | uk стало | en было | en стало |',
    '|---|---|---|---|---|---|---|---|---|',
    ...changes.map((row) =>
      `| ${row.id} | ${cell(row.beforeEs)} | ${cell(row.afterEs)} | ${cell(row.beforeRu)} | ${cell(row.afterRu)} | ${cell(row.beforeUk)} | ${cell(row.afterUk)} | ${cell(row.beforeEn)} | ${cell(row.afterEn)} |`,
    ),
  ];
  return lines.join('\n');
}

function cell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else if (entry.name.endsWith('.json')) found.push(full);
  }
  return found;
}

main();
