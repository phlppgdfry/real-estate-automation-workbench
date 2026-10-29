import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { sourceFiles } from '../scripts/source-files.ts';

function fixture(run: (dir: string, manifest: (files: Record<string, string>) => void) => void) {
  // Inside the checkout: the parent Git root must never supply the archive inventory.
  mkdirSync(join(process.cwd(), 'var'), { recursive: true });
  const dir = mkdtempSync(join(process.cwd(), 'var/source-archive-'));
  try {
    writeFileSync(join(dir, 'example.txt'), 'source');
    run(dir, (files) =>
      writeFileSync(
        join(dir, 'RELEASE-MANIFEST.json'),
        JSON.stringify({ kind: 'committed-source-no-credentials-or-local-state', files }),
      ),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const hash = createHash('sha256').update('source').digest('hex');
test('release inventory works without its own Git root, ignoring parent checkout', () => {
  fixture((dir, manifest) => {
    manifest({ 'example.txt': hash });
    assert.deepEqual(sourceFiles(dir), ['example.txt', 'RELEASE-MANIFEST.json']);
  });
});
test('release inventory rejects changed source bytes', () => {
  fixture((dir, manifest) => {
    manifest({ 'example.txt': hash });
    writeFileSync(join(dir, 'example.txt'), 'changed');
    assert.throws(() => sourceFiles(dir), /SOURCE_CHECKSUM_MISMATCH/);
  });
});
test('release inventory rejects paths outside the source directory', () => {
  fixture((dir, manifest) => {
    manifest({ '../example.txt': hash });
    assert.throws(() => sourceFiles(dir), /INVALID_SOURCE_PATH/);
  });
});
