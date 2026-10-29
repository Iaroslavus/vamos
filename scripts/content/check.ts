/**
 * Content report for CI.
 * Prints units per lesson, phrase share, units still missing a storage clip,
 * missing translations, drafts, and a warning when parts[].tr glue matches tr
 * on a phrase whose word-for-word reading (literal) differs.
 * Exits with code 1 when a link does not resolve. Missing audio stays on device TTS.
 * Literal-part warnings do not fail the link check.
 */
import { loadContent } from '../../src/features/content/pipeline/load';
import { buildReport, formatReport } from '../../src/features/content/pipeline/report';

const loaded = loadContent(process.cwd());
const report = buildReport(loaded.bundle, loaded.issues);
console.log(formatReport(report));
if (!report.ok) process.exitCode = 1;
