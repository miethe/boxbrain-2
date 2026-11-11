import importlib.util
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('ingest', Path(__file__).parents[1] / 'scripts' / 'ingest.py')
ingest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ingest)


def manifest():
    return {'practice_key': 'northstar', 'practice_id': 'bb:northstar:practice:001',
            'offering_ids': ['bb:northstar:offering:001'],
            'sources': [{'title': 'Example deck', 'type': 'deck', 'path': 'assets/seller-only/example.md', 'rights': 'fictional-original'}]}


class IngestTests(unittest.TestCase):
    def test_draft_and_no_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            paths = ingest.write_drafts(manifest(), directory)
            text = paths[0].read_text()
            self.assertIn('"audience": "seller-only"', text)
            self.assertIn('"status": "draft"', text)
            with self.assertRaises(FileExistsError):
                ingest.write_drafts(manifest(), directory)
            self.assertEqual(paths[0].read_text(), text)

    def test_unsafe_path_and_duplicate_rejected(self):
        data = manifest()
        data['sources'][0]['path'] = '../secret.pdf'
        with self.assertRaises(ValueError):
            ingest.draft_records(data)
        data = manifest()
        data['sources'].append(data['sources'][0])
        with self.assertRaises(ValueError):
            ingest.draft_records(data)

    def test_external_link(self):
        data = manifest()
        data['sources'] = [{'title': 'Example', 'type': 'external-link', 'path': 'https://example.org/'}]
        self.assertEqual(ingest.draft_records(data)[0]['rights'], 'link-only')
        data['sources'][0]['path'] = 'http://example.org/'
        with self.assertRaises(ValueError):
            ingest.draft_records(data)


if __name__ == '__main__':
    unittest.main()
