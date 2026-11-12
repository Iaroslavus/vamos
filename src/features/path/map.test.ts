import {
  buildPath,
  heroLine,
  initialNodeId,
  lessonToOpen,
  pathAction,
  pathCelebration,
  type PathModule,
  type PathPlan,
  type PathSnapshot,
} from './map';
import { doneTrack, moduleAtScroll, nodeAnchor, smoothPath } from './layout';

const plan: PathPlan = {
  modules: [
    module(
      'a1.u01',
      1,
      null,
      [],
      [
        { id: 'hola', lessonIds: ['l1', 'l2'], day: 1 },
        { id: 'cafe', lessonIds: ['c1'], day: 2 },
      ],
    ),
    module('a1.u02', 2, 'cp.week', ['p1'], [{ id: 'shop', lessonIds: ['s1', 's2'], day: null }]),
  ],
};

function module(
  id: string,
  week: number,
  checkpointId: string | null,
  chestLessonIds: string[],
  topics: PathModule['topics'],
): PathModule {
  return {
    id,
    level: 'A1',
    week,
    checkpointId,
    chestLessonIds,
    topics,
  };
}

describe('buildPath', () => {
  it('marks the first unfinished topic current and leaves the rest open', () => {
    const nodes = buildPath(plan, { completedLessonIds: [] });

    expect(nodes.map((node) => [node.id, node.status])).toEqual([
      ['hola', 'current'],
      ['cafe', 'open'],
      ['shop', 'open'],
      ['chest:cp.week', 'chest'],
    ]);
    expect(initialNodeId(nodes)).toBe('hola');
    expect(nodes.find((node) => node.id === 'hola')).toMatchObject({
      day: 1,
      nextLessonId: 'l1',
      nextLessonNumber: 1,
      completedLessons: 0,
    });
    expect(pathAction(nodes[0]!)).toBe('start');
    expect(lessonToOpen(nodes[0]!)).toBe('l1');
  });

  it('keeps a partly finished topic current until every lesson is done', () => {
    const nodes = buildPath(plan, { completedLessonIds: ['l1'] });
    const hola = nodes.find((node) => node.id === 'hola');

    expect(hola).toMatchObject({
      status: 'current',
      completedLessons: 1,
      nextLessonId: 'l2',
      nextLessonNumber: 2,
    });
    expect(pathAction(hola!)).toBe('continue');
    expect(lessonToOpen(hola!)).toBe('l2');
    expect(nodes.find((node) => node.id === 'cafe')?.status).toBe('open');
  });

  it('does not lock a later topic that was started out of order', () => {
    const nodes = buildPath(plan, { completedLessonIds: ['s1'] });
    const shop = nodes.find((node) => node.id === 'shop');

    expect(nodes.find((node) => node.id === 'hola')?.status).toBe('current');
    expect(shop?.status).toBe('open');
    expect(pathAction(shop!)).toBe('continue');
    expect(lessonToOpen(shop!)).toBe('s2');
  });

  it('moves current to the next topic and offers a repeat of the finished one', () => {
    const nodes = buildPath(plan, { completedLessonIds: ['l1', 'l2'] });
    const hola = nodes.find((node) => node.id === 'hola');

    expect(hola?.status).toBe('done');
    expect(pathAction(hola!)).toBe('repeat');
    expect(lessonToOpen(hola!)).toBe('l1');
    expect(nodes.find((node) => node.id === 'cafe')?.status).toBe('current');
    expect(nodes.find((node) => node.id === 'chest:cp.week')?.status).toBe('chest');
  });

  it('has no current topic once every topic is finished and still shows the chest', () => {
    const nodes = buildPath(plan, { completedLessonIds: ['l1', 'l2', 'c1', 's1', 's2'] });

    expect(
      nodes.filter((node) => node.kind === 'topic').every((node) => node.status === 'done'),
    ).toBe(true);
    expect(nodes.some((node) => node.status === 'current')).toBe(false);
    expect(nodes.find((node) => node.kind === 'chest')).toMatchObject({
      status: 'chest',
      lessonIds: ['p1'],
    });
    expect(pathAction(nodes.find((node) => node.kind === 'chest')!)).toBe('try');
    expect(lessonToOpen(nodes.find((node) => node.kind === 'chest')!)).toBe('p1');
    expect(initialNodeId(nodes)).toBe('shop');
  });
});

describe('hero lines and celebration', () => {
  it('picks the bubble from the selected status, and the finish line after a topic', () => {
    expect(heroLine('current', false)).toBe('vamos');
    expect(heroLine('done', false)).toBe('known');
    expect(heroLine('open', false)).toBe('shortcut');
    expect(heroLine('chest', false)).toBe('challenge');
    expect(heroLine('current', true)).toBe('done');
  });

  it('ignores the first snapshot, then tells a lesson from a finished topic', () => {
    const start: PathSnapshot[] = [
      { id: 'hola', kind: 'topic', status: 'current', completedLessons: 0 },
    ];
    const mid: PathSnapshot[] = [
      { id: 'hola', kind: 'topic', status: 'current', completedLessons: 1 },
    ];
    const done: PathSnapshot[] = [
      { id: 'hola', kind: 'topic', status: 'done', completedLessons: 2 },
    ];

    expect(pathCelebration(null, start)).toBeNull();
    expect(pathCelebration([], mid)).toBeNull();
    expect(pathCelebration(start, mid)).toBe('lesson');
    expect(pathCelebration(mid, done)).toBe('topic');
    expect(pathCelebration(done, done)).toBeNull();
  });
});

describe('path layout', () => {
  it('repeats the zigzag every six topics and climbs from the bottom', () => {
    const width = 300;
    const first = nodeAnchor(0, 12, width);
    const seventh = nodeAnchor(6, 12, width);
    const second = nodeAnchor(1, 12, width);

    expect(first.x).toBe(seventh.x);
    expect(first.x).not.toBe(second.x);
    expect(first.y).toBeGreaterThan(second.y);
  });

  it('draws a curve and paints only the stretches that leave a finished node', () => {
    const points = [
      { x: 0, y: 30 },
      { x: 10, y: 20 },
      { x: 20, y: 10 },
    ];

    expect(smoothPath(points)).toMatch(/^M /);
    expect(smoothPath(points)).toContain(' C ');
    expect(doneTrack(points, ['done', 'open', 'open'])).toContain('M ');
    expect(doneTrack(points, ['open', 'open', 'open'])).toBe('');
  });

  it('names the city in the lower part of the viewport', () => {
    const nodes = [
      { moduleId: 'a1.u01', y: 900 },
      { moduleId: 'a1.u02', y: 200 },
    ];

    expect(moduleAtScroll(nodes, 648, 600)).toBe('a1.u01');
    expect(moduleAtScroll(nodes, 0, 600)).toBe('a1.u02');
  });
});
