/**
 * Content report for CI.
 * Prints units per lesson, phrase share, missing audio, and drafts.
 * Exits with code 1 when a link does not resolve. Missing audio stays on device TTS.
 */
import { loadContent } from '../../src/features/content/pipeline/load';
import { buildReport, formatReport } from '../../src/features/content/pipeline/report';

const loaded = loadContent(process.cwd());
const report = buildReport(loaded.bundle, loaded.issues);
console.log(formatReport(report));
if (!report.ok) process.exitCode = 1;
