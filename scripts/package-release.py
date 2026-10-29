"""Package exactly committed source, with reproducible ZIP metadata and file checksums."""
from pathlib import Path
import hashlib
import io
import json
import subprocess
import tarfile
import zipfile

root = Path(__file__).resolve().parent.parent
if subprocess.check_output(['git', 'status', '--porcelain'], cwd=root).strip():
    raise SystemExit('Commit the reviewed source first; release packaging requires a clean tree.')
commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
version = json.loads((root / 'package.json').read_text())['version']
source = subprocess.check_output(['git', 'archive', '--format=tar', 'HEAD'], cwd=root)
files = {}
with tarfile.open(fileobj=io.BytesIO(source)) as archive:
    for member in archive:
        if not member.isfile():
            continue
        if member.name.startswith(('.env', 'var/', 'node_modules/')) or '..' in Path(member.name).parts:
            raise SystemExit('Unexpected source path: ' + member.name)
        files[member.name] = archive.extractfile(member).read()
manifest = {'version': version, 'sourceCommit': commit, 'kind': 'committed-source-no-credentials-or-local-state',
            'files': {name: hashlib.sha256(data).hexdigest() for name, data in sorted(files.items())}}
files['RELEASE-MANIFEST.json'] = (json.dumps(manifest, indent=2, ensure_ascii=False) + '\n').encode()
out = root / 'var' / 'release'
out.mkdir(parents=True, exist_ok=True)
name = f'duin-dorp-v{version}-source.zip'
path = out / name
with zipfile.ZipFile(path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for filename, data in sorted(files.items()):
        info = zipfile.ZipInfo(filename, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, data)
sha = hashlib.sha256(path.read_bytes()).hexdigest()
(out / 'SHA256SUMS.txt').write_text(f'{sha}  {name}\n')
print(f'PASS {name}: {len(manifest["files"])} committed source files; SHA-256 {sha}; source {commit}')
