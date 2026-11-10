#!/usr/bin/env python3
"""Create private, unapproved collateral drafts from a JSON manifest."""
import argparse
import hashlib
import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

KINDS = {'deck', 'case-study', 'white-paper', 'one-pager', 'external-link'}
FORMATS = {'markdown', 'pdf', 'pptx', 'html'}


def draft_records(manifest):
    practice = manifest['practice_key']
    if not re.fullmatch(r'[a-z][a-z0-9-]{1,31}', practice):
        raise ValueError('invalid practice_key')
    practice_id = manifest['practice_id']
    offerings = manifest['offering_ids']
    if not isinstance(offerings, list) or not offerings:
        raise ValueError('offering_ids must be non-empty')
    records = []
    seen = set()
    for item in manifest['sources']:
        title, kind, location = item['title'], item['type'], item['path']
        if not all(isinstance(x, str) and x.strip() for x in (title, kind, location)):
            raise ValueError('title, type and path must be non-empty strings')
        if kind not in KINDS:
            raise ValueError('invalid source type')
        if location in seen:
            raise ValueError('duplicate source path')
        seen.add(location)
        token = hashlib.sha256(location.encode()).hexdigest()[:16]
        slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
        if not slug or len(title) > 100:
            raise ValueError('invalid title')
        record = dict(schema_version=1, type='collateral', id=f'bb:{practice}:collateral:{token}',
                      slug=f'{slug}-{token[:8]}', title=title, summary='Draft awaiting editorial review.',
                      audience='seller-only', status='draft', owner='Practice editor', tags=[],
                      practice_id=practice_id, kind=kind, offering_ids=offerings,
                      source={'origin': f'pending:{token}', 'locator': 'Pending review', 'captured_on': date.today().isoformat()})
        if kind == 'external-link':
            parsed = urlsplit(location)
            if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
                raise ValueError('external links require an HTTPS URL without credentials')
            record.update(external_url=location, format='html', rights='link-only')
        else:
            path = Path(location)
            if path.is_absolute() or '..' in path.parts or path.parts[:2] != ('assets', 'seller-only'):
                raise ValueError('local paths must be under assets/seller-only')
            fmt = {'.md': 'markdown', '.pdf': 'pdf', '.pptx': 'pptx', '.html': 'html'}.get(path.suffix.lower())
            if fmt not in FORMATS:
                raise ValueError('unsupported source format')
            rights = item.get('rights')
            if rights not in {'fictional-original', 'approved-internal'}:
                raise ValueError('local sources require explicit rights')
            record.update(asset_path=location, format=fmt, rights=rights)
        records.append(record)
    if not records:
        raise ValueError('sources must be non-empty')
    return records


def write_drafts(manifest, output):
    records = draft_records(manifest)
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    paths = [output / (record['slug'] + '.md') for record in records]
    if any(path.exists() for path in paths):
        raise FileExistsError('draft already exists; review it rather than overwriting')
    for path, record in zip(paths, records):
        path.write_text('---\n' + json.dumps(record, indent=2) + '\n---\n\n## Use\nPending editorial review.\n\n## Limits\nPending rights and audience review.\n', encoding='utf-8')
    return paths


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    for path in write_drafts(json.loads(args.manifest.read_text(encoding='utf-8')), args.output):
        print(path)


if __name__ == '__main__':
    main()
