import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { minimiseDocument } from '../src/dify-contracts';
const exec = promisify(execFile);
export async function extractDocument(filename: string, bytes: Buffer, ocr = false) {
  if (bytes.length > 2 * 1024 * 1024 || !bytes.length) throw Error('DOCUMENT_SIZE');
  const extension = filename.toLowerCase().split('.').at(-1)!;
  if (!['pdf', 'docx', 'eml', 'txt', 'md'].includes(extension)) throw Error('DOCUMENT_TYPE');
  const dir = await mkdtemp(join(tmpdir(), 'duin-document-'));
  const path = join(dir, 'source.' + extension);
  try {
    await writeFile(path, bytes, { mode: 0o600 });
    let text = '';
    let method = extension;
    if (extension === 'pdf') {
      if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw Error('DOCUMENT_SIGNATURE');
      await exec('pdftotext', ['-layout', path, join(dir, 'text.txt')], {
        timeout: 15000,
        maxBuffer: 524288,
      });
      text = await readFile(join(dir, 'text.txt'), 'utf8');
      if (text.trim().length < 20 && ocr) {
        await exec(
          'pdftoppm',
          ['-f', '1', '-l', '5', '-scale-to', '1600', '-png', path, join(dir, 'page')],
          { timeout: 20000, maxBuffer: 524288 },
        );
        for (const file of (await readdir(dir)).filter((f) => f.endsWith('.png')).sort()) {
          const out = await exec('tesseract', [join(dir, file), 'stdout', '-l', 'eng'], {
            timeout: 15000,
            maxBuffer: 524288,
          });
          text += '\n' + out.stdout;
        }
        method = 'pdf-ocr-first-5-pages';
      }
    } else if (extension === 'docx' || extension === 'eml') {
      const { stdout } = await exec('python3', ['scripts/extract_document.py', path, extension], {
        timeout: 10000,
        maxBuffer: 524288,
      });
      text = stdout;
    } else {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    }
    if (text.trim().length < 20)
      return {
        state: 'needs_ocr' as const,
        source: '',
        method,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      };
    if (text.length > 12000) throw Error('DOCUMENT_TEXT_TOO_LARGE');
    return {
      state: 'extracted' as const,
      source: minimiseDocument(text.replace(/\r\n?/g, '\n').trim()),
      method,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
