import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';

export function sourceFiles(root = process.cwd()): string[] {
  let gitRoot: string | undefined;
  try {
    gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    /* A release archive intentionally has no Git metadata. */
  }
  if (gitRoot && realpathSync(gitRoot) === realpathSync(root))
    return [
      ...new Set(
        execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
          cwd: root,
          encoding: 'utf8',
        })
          .split('\0')
          .filter(Boolean),
      ),
    ];
  const manifest = JSON.parse(readFileSync(join(root, 'RELEASE-MANIFEST.json'), 'utf8'));
  if (
    !['committed-source-no-credentials-or-local-state', 'isolated-source-snapshot'].includes(
      manifest.kind,
    ) ||
    !manifest.files ||
    typeof manifest.files !== 'object' ||
    Array.isArray(manifest.files)
  )
    throw Error('INVALID_SOURCE_MANIFEST');
  const files = Object.entries(manifest.files);
  if (!files.length) throw Error('EMPTY_SOURCE_MANIFEST');
  for (const [file, hash] of files) {
    if (
      isAbsolute(file) ||
      file.includes('\\') ||
      file.includes('\0') ||
      file.split('/').some((part) => !part || part === '.' || part === '..') ||
      file === 'RELEASE-MANIFEST.json' ||
      !/^[a-f0-9]{64}$/.test(String(hash))
    )
      throw Error('INVALID_SOURCE_PATH_OR_HASH');
    const bytes = readFileSync(join(root, file));
    if (createHash('sha256').update(bytes).digest('hex') !== hash)
      throw Error('SOURCE_CHECKSUM_MISMATCH: ' + file);
  }
  return [...files.map(([file]) => file), 'RELEASE-MANIFEST.json'];
}
