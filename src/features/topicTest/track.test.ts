import { trackTopicTestFinish, trackTopicTestStart } from './track';

describe('topic test analytics', () => {
  it('records the start and the finish with the score', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    trackTopicTestStart('a1.hola');
    trackTopicTestFinish({ topicId: 'a1.hola', score: 80, passed: true });

    expect(spy).toHaveBeenCalledWith('[analytics] topic_test_start', { topicId: 'a1.hola' });
    expect(spy).toHaveBeenCalledWith('[analytics] topic_test_finish', {
      topicId: 'a1.hola',
      score: 80,
      passed: true,
    });
    spy.mockRestore();
  });
});
