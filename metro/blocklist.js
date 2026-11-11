/**
 * Paths Metro must not crawl. A git worktree or a second copy of the app
 * inside the project (or its node_modules) is enough to exhaust the JS heap:
 * Metro indexes every file it can see.
 *
 * Expo's file crawler tests `resolver.blockList` against both the absolute
 * path and the project-relative path, and it does not scandir a directory
 * that matches. `watchFolders` cannot drop the project root (Metro adds it
 * back), so nested directories are excluded there only when they show up as
 * their own watch root.
 */
const fs = require('fs');
const path = require('path');

/** Project-relative directories. Blocked even when they do not exist yet. */
const STATIC_DIRS = [
  '.cursor/worktrees',
  '.claude/worktrees',
  'tmp',
  'ios',
  'android',
  'supabase/.temp',
];

const WALK_SKIP = new Set([
  'node_modules',
  '.git',
  '.expo',
  'ios',
  'android',
  'dist',
  'coverage',
  'build',
  'Pods',
  'tmp',
]);

const CONTENT_AUDIO_DIR_NAMES = new Set(['audio', 'clips', 'audio-cache', '.audio-cache']);

/** Generated clips under content/, relative or absolute. JSON lessons stay visible. */
const CONTENT_AUDIO_DIR =
  /(?:^|[/\\])content[/\\](?:.+[/\\])?(?:audio|clips|audio-cache|\.audio-cache)(?:[/\\]|$)/;

const CONTENT_AUDIO_FILE = /(?:^|[/\\])content[/\\].+\.(?:m4a|mp3|wav|aac)$/;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toPosix(value) {
  return value.split(path.sep).join('/');
}

/**
 * Matches the project-relative directory and the same directory as an absolute
 * path. Does not match a same-named folder inside node_modules.
 */
function directoryPattern(projectRoot, relativePosix) {
  const relative = escapeRegExp(relativePosix).replaceAll('/', '[/\\\\]');
  const root = escapeRegExp(path.resolve(projectRoot)).replaceAll('/', '[/\\\\]');
  return new RegExp(`(?:^${relative}(?:[/\\\\]|$)|${root}[/\\\\]${relative}(?:[/\\\\]|$))`);
}

/**
 * `node_modules` of a nested copy. The project's own `node_modules` stays visible.
 */
function nestedNodeModulesPattern(projectRoot) {
  const root = escapeRegExp(path.resolve(projectRoot)).replaceAll('/', '[/\\\\]');
  // Relative paths only: a leading "/" or "C:" would also match the project's
  // own node_modules. Absolute paths are matched with the root prefix below.
  const relativeNested =
    '^(?![A-Za-z]:)(?!node_modules(?:[/\\\\]|$))[^/\\\\].*[/\\\\]node_modules(?:[/\\\\]|$)';
  const absoluteNested = `${root}[/\\\\](?!node_modules(?:[/\\\\]|$)).*[/\\\\]node_modules(?:[/\\\\]|$)`;
  return new RegExp(`(?:${relativeNested}|${absoluteNested})`);
}

function isStaticBlocked(relativePosix) {
  return STATIC_DIRS.some((dir) => relativePosix === dir || relativePosix.startsWith(`${dir}/`));
}

function isContentAudioCache(relativePosix) {
  if (!relativePosix.startsWith('content/')) return false;
  const name = relativePosix.slice(relativePosix.lastIndexOf('/') + 1);
  return CONTENT_AUDIO_DIR_NAMES.has(name);
}

/** A git worktree (`.git` file) or another copy of this app. */
function isNestedProjectCopy(directory) {
  const gitPath = path.join(directory, '.git');
  try {
    if (fs.statSync(gitPath).isFile()) return true;
  } catch {
    // Not a worktree.
  }
  const packagePath = path.join(directory, 'package.json');
  if (!fs.existsSync(packagePath)) return false;
  if (
    fs.existsSync(path.join(directory, 'app.json')) ||
    fs.existsSync(path.join(directory, 'node_modules'))
  ) {
    return true;
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return pkg.name === 'vamos';
  } catch {
    return false;
  }
}

function isDirectoryEntry(entry, absolute) {
  if (entry.isDirectory()) return true;
  if (!entry.isSymbolicLink()) return false;
  try {
    return fs.statSync(absolute).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Nested copies and content audio caches that are not already named above.
 * Does not walk node_modules, ios, android, tmp, or the static worktree dirs.
 */
function discoverBlockedDirectories(projectRoot) {
  const root = path.resolve(projectRoot);
  const found = [];
  const stack = [''];

  while (stack.length > 0) {
    const relative = stack.pop();
    if (relative && isStaticBlocked(relative)) continue;
    const absolute = relative ? path.join(root, relative) : root;
    let entries;
    try {
      entries = fs.readdirSync(absolute, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const childAbsolute = path.join(absolute, entry.name);
      if (!isDirectoryEntry(entry, childAbsolute)) continue;
      if (WALK_SKIP.has(entry.name) || isStaticBlocked(childRelative)) continue;
      const copy = isNestedProjectCopy(childAbsolute);
      const audioCache = isContentAudioCache(childRelative);
      // Never follow a symlink: it may point at a second checkout.
      if (entry.isSymbolicLink() || copy || audioCache) {
        if (copy || audioCache) found.push(childRelative);
        continue;
      }
      stack.push(childRelative);
    }
  }

  return found;
}

function blockListPatterns(projectRoot, discovered = discoverBlockedDirectories(projectRoot)) {
  return [
    ...STATIC_DIRS.map((dir) => directoryPattern(projectRoot, dir)),
    ...discovered.map((dir) => directoryPattern(projectRoot, dir)),
    CONTENT_AUDIO_DIR,
    CONTENT_AUDIO_FILE,
    nestedNodeModulesPattern(projectRoot),
  ];
}

function matchesAny(patterns, value) {
  return patterns.some((pattern) => pattern.test(value));
}

/** Same check Expo's crawler runs before it scandirs a child directory. */
function isBlockedPath(projectRoot, filePath, patterns = blockListPatterns(projectRoot)) {
  const root = path.resolve(projectRoot);
  const absolute = path.resolve(root, filePath);
  const relative = path.relative(root, absolute);
  if (relative === '') return false;
  const posix = toPosix(relative);
  return (
    matchesAny(patterns, filePath) || matchesAny(patterns, absolute) || matchesAny(patterns, posix)
  );
}

/**
 * Drop watch roots that are a blocked directory or sit inside one.
 * The project root stays: Metro prepends it itself, and the crawler then
 * skips the blocked children via `blockList`.
 */
function filterWatchFolders(projectRoot, watchFolders, patterns = blockListPatterns(projectRoot)) {
  const root = path.resolve(projectRoot);
  return watchFolders.filter((folder) => {
    const resolved = path.resolve(folder);
    const relative = path.relative(root, resolved);
    if (relative === '') return true;
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      return !isNestedProjectCopy(resolved);
    }
    return !isBlockedPath(root, resolved, patterns);
  });
}

function applyWatchExclusions(config, projectRoot) {
  const discovered = discoverBlockedDirectories(projectRoot);
  const patterns = blockListPatterns(projectRoot, discovered);
  const existing = config.resolver?.blockList;
  const current = Array.isArray(existing) ? existing : existing ? [existing] : [];
  config.resolver = {
    ...config.resolver,
    blockList: [...current, ...patterns],
  };
  config.watchFolders = filterWatchFolders(projectRoot, config.watchFolders ?? [], patterns);
  return config;
}

module.exports = {
  CONTENT_AUDIO_DIR,
  CONTENT_AUDIO_FILE,
  STATIC_DIRS,
  applyWatchExclusions,
  blockListPatterns,
  directoryPattern,
  discoverBlockedDirectories,
  filterWatchFolders,
  isBlockedPath,
  isNestedProjectCopy,
  nestedNodeModulesPattern,
};
