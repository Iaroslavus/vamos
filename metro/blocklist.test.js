const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  applyWatchExclusions,
  blockListPatterns,
  directoryPattern,
  discoverBlockedDirectories,
  filterWatchFolders,
  isBlockedPath,
  isNestedProjectCopy,
  nestedNodeModulesPattern,
} = require('./blocklist');

const projectRoot = path.resolve(__dirname, '..');

function write(file, body = '{}\n') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

describe('metro watch exclusions', () => {
  let fixture;

  beforeEach(() => {
    fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'vamos-metro-'));
  });

  afterEach(() => {
    fs.rmSync(fixture, { recursive: true, force: true });
  });

  it('blocks worktrees, native projects, tmp, supabase temp, and content audio', () => {
    const patterns = blockListPatterns(projectRoot);
    const samples = [
      'tmp',
      'tmp/tts-compare/hola.m4a',
      'ios',
      'ios/Pods/Headers',
      'android',
      'android/app/build.gradle',
      'supabase/.temp',
      'supabase/.temp/cli/config.json',
      '.cursor/worktrees',
      '.cursor/worktrees/task/node_modules/left-pad/index.js',
      '.claude/worktrees/task/app/index.tsx',
      'content/audio/hola.m4a',
      'content/items/a1/clips/hola.m4a',
      'content/items/a1/hola.m4a',
    ];
    for (const sample of samples) {
      expect(isBlockedPath(projectRoot, sample, patterns)).toBe(true);
      expect(isBlockedPath(projectRoot, path.join(projectRoot, sample), patterns)).toBe(true);
    }
  });

  it('keeps app source, content JSON, and the project node_modules visible', () => {
    const patterns = blockListPatterns(projectRoot);
    const samples = [
      'app/index.tsx',
      'src/features/audio/cache.ts',
      'content/items/a1/hola.json',
      'content/topics/a1/hola/topic.json',
      'assets/sounds/correct.wav',
      'node_modules/react-native/package.json',
      'node_modules/react-native/android/package.json',
    ];
    for (const sample of samples) {
      expect(isBlockedPath(projectRoot, sample, patterns)).toBe(false);
    }
  });

  it('matches a directory both as a relative path and under this project root', () => {
    const pattern = directoryPattern(projectRoot, 'supabase/.temp');
    expect(pattern.test('supabase/.temp')).toBe(true);
    expect(pattern.test(path.join(projectRoot, 'supabase/.temp/cli'))).toBe(true);
    expect(pattern.test('node_modules/supabase/.temp')).toBe(false);
    expect(pattern.test(path.join(projectRoot, 'node_modules/supabase/.temp'))).toBe(false);
  });

  it('blocks nested node_modules and not the root install', () => {
    const pattern = nestedNodeModulesPattern(projectRoot);
    expect(pattern.test('copy/node_modules/pkg/index.js')).toBe(true);
    expect(pattern.test(path.join(projectRoot, 'copy/node_modules'))).toBe(true);
    expect(pattern.test('node_modules/react/index.js')).toBe(false);
    expect(pattern.test(path.join(projectRoot, 'node_modules/react/index.js'))).toBe(false);
  });

  it('finds a nested app copy and a content audio cache, then stops', () => {
    write(path.join(fixture, 'src/ok.ts'), 'export const ok = 1;\n');
    write(path.join(fixture, 'nested/package.json'), JSON.stringify({ name: 'vamos' }));
    write(path.join(fixture, 'nested/app.json'), '{}\n');
    write(path.join(fixture, 'nested/node_modules/pkg/index.js'), 'module.exports = {};\n');
    write(path.join(fixture, 'nested/app/index.tsx'), 'export {};\n');
    write(path.join(fixture, 'content/items/a1/hola.json'), '{}\n');
    write(path.join(fixture, 'content/audio/hola.m4a'), 'audio');
    write(path.join(fixture, 'ios/AppDelegate.swift'), '');

    expect(discoverBlockedDirectories(fixture).sort()).toEqual(['content/audio', 'nested']);
    expect(isNestedProjectCopy(path.join(fixture, 'nested'))).toBe(true);
    expect(isNestedProjectCopy(fixture)).toBe(false);
  });

  it('treats a git worktree symlink as a blocked copy and does not walk it', () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'vamos-worktree-'));
    try {
      write(path.join(outside, '.git'), 'gitdir: /tmp/main.git/worktrees/task\n');
      write(path.join(outside, 'package.json'), JSON.stringify({ name: 'vamos' }));
      write(path.join(outside, 'node_modules/pkg/index.js'), '');
      fs.symlinkSync(outside, path.join(fixture, 'linked-copy'));

      expect(discoverBlockedDirectories(fixture)).toEqual(['linked-copy']);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it('drops blocked watch folders and keeps the project root', () => {
    const patterns = blockListPatterns(fixture, ['nested']);
    const folders = filterWatchFolders(
      fixture,
      [
        fixture,
        path.join(fixture, 'ios'),
        path.join(fixture, 'tmp'),
        path.join(fixture, '.cursor/worktrees/task'),
        path.join(fixture, 'nested'),
        path.join(fixture, 'src'),
      ],
      patterns,
    );
    expect(folders).toEqual([fixture, path.join(fixture, 'src')]);
  });

  it('does not let the file crawler scandir blocked directories', async () => {
    write(path.join(fixture, 'src/ok.ts'), 'export const ok = 1;\n');
    write(path.join(fixture, 'content/items/a1/hola.json'), '{}\n');
    write(path.join(fixture, 'content/items/a1/hola.m4a'), 'audio');
    write(path.join(fixture, 'content/audio/clip.m4a'), 'audio');
    write(path.join(fixture, 'tmp/secret.m4a'), 'audio');
    write(path.join(fixture, 'ios/AppDelegate.swift'), '');
    write(path.join(fixture, 'android/app/src/Main.java'), '');
    write(path.join(fixture, 'supabase/.temp/cli.json'), '{}\n');
    write(
      path.join(fixture, '.cursor/worktrees/task/node_modules/pkg/index.js'),
      'module.exports = {};\n',
    );
    write(path.join(fixture, '.claude/worktrees/task/app/index.tsx'), 'export {};\n');
    write(path.join(fixture, 'nested/package.json'), JSON.stringify({ name: 'other' }));
    write(path.join(fixture, 'nested/app.json'), '{}\n');
    write(path.join(fixture, 'nested/node_modules/pkg/index.js'), 'module.exports = {};\n');

    const patterns = blockListPatterns(fixture);
    const seen = [];
    const readdir = fs.readdir.bind(fs);
    const spy = jest.spyOn(fs, 'readdir').mockImplementation((dir, options, callback) => {
      seen.push(dir);
      return readdir(dir, options, callback);
    });
    try {
      const nodeCrawl = require('@expo/metro-file-map/build/crawlers/node').default;
      const found = await nodeCrawl({
        console,
        previousState: {
          fileSystem: {
            getDifference(fileData) {
              return fileData;
            },
            getMtimeByNormalPath() {
              return null;
            },
          },
        },
        extensions: ['ts', 'tsx', 'js', 'json', 'm4a', 'swift', 'java'],
        ignore: (filePath) => patterns.some((pattern) => pattern.test(filePath)),
        rootDir: fixture,
        includeSymlinks: true,
        roots: [fixture],
      });
      const keys = [...found.keys()];
      expect(keys).toEqual(expect.arrayContaining(['src/ok.ts', 'content/items/a1/hola.json']));
      expect(keys.some((key) => key.endsWith('.m4a') || key.includes('worktrees'))).toBe(false);
      expect(keys.some((key) => key.startsWith('nested/') || key.startsWith('ios/'))).toBe(false);

      const blocked = [
        'tmp',
        'ios',
        'android',
        'supabase/.temp',
        '.cursor/worktrees',
        '.claude/worktrees',
        'content/audio',
        'nested',
        'nested/node_modules',
      ];
      for (const dir of blocked) {
        expect(seen).not.toContain(path.join(fixture, dir));
      }
    } finally {
      spy.mockRestore();
    }
  });
});

describe('metro.config.js', () => {
  it('exports a config whose blockList skips worktrees and whose watchFolders do not', () => {
    const config = require('../metro.config');
    const patterns = config.resolver.blockList;
    expect(isBlockedPath(projectRoot, '.cursor/worktrees/task/index.js', patterns)).toBe(true);
    expect(isBlockedPath(projectRoot, 'supabase/.temp/cli.json', patterns)).toBe(true);
    expect(isBlockedPath(projectRoot, 'app/index.tsx', patterns)).toBe(false);
    for (const folder of config.watchFolders) {
      const relative = path.relative(projectRoot, folder);
      expect(relative === '' || !isBlockedPath(projectRoot, folder, patterns)).toBe(true);
    }
  });

  const config = applyWatchExclusions(
    {
      resolver: { blockList: [/keep-me/] },
      watchFolders: [projectRoot, path.join(projectRoot, 'ios'), path.join(projectRoot, 'tmp')],
    },
    projectRoot,
  );

  it('appends blockList patterns and removes blocked watch folders', () => {
    expect(config.resolver.blockList[0]).toEqual(/keep-me/);
    expect(isBlockedPath(projectRoot, 'ios/Pods', config.resolver.blockList)).toBe(true);
    expect(isBlockedPath(projectRoot, 'src/theme/tokens.ts', config.resolver.blockList)).toBe(
      false,
    );
    expect(config.watchFolders).toEqual([projectRoot]);
  });
});
