import { File } from 'expo-file-system';

import { deleteSpeechFile } from './recording';

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));

describe('deleteSpeechFile', () => {
  beforeEach(() => {
    jest.mocked(File).mockReset();
  });

  it('deletes a cache file that is still there', () => {
    const remove = jest.fn();
    jest.mocked(File).mockImplementation(() => ({ exists: true, delete: remove }) as never);

    deleteSpeechFile('file:///tmp/take.wav');

    expect(File).toHaveBeenCalledWith('file:///tmp/take.wav');
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('ignores an empty path and a file that is already gone', () => {
    deleteSpeechFile(null);
    expect(File).not.toHaveBeenCalled();

    jest.mocked(File).mockImplementation(() => ({ exists: false, delete: jest.fn() }) as never);
    deleteSpeechFile('file:///tmp/missing.wav');
    expect(jest.mocked(File).mock.results[0]?.value.delete).not.toHaveBeenCalled();
  });
});
