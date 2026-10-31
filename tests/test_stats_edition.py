"""Keep imported season statistics confined to the currently running FM edition."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('fmstats', Path(__file__).parents[1] / 'tools/fmstats_sidecar.py')
fmstats = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fmstats)

class SaveEditionTest(unittest.TestCase):
    def test_newer_fm26_save_cannot_override_fm27(self):
        with tempfile.TemporaryDirectory() as directory:
            documents = Path(directory)
            saves = {}
            for edition in (26, 27):
                root = documents / 'Sports Interactive' / f'Football Manager {edition}' / 'games'
                root.mkdir(parents=True)
                saves[edition] = root / 'career.fm'
                saves[edition].touch()
            import os
            os.utime(saves[26], (2_000_000_000, 2_000_000_000))
            with patch.object(fmstats, '_documents_directories', return_value=[documents]):
                self.assertEqual(fmstats._latest_save(27), saves[27])
                self.assertEqual(fmstats._latest_save(26), saves[26])
                saves[27].unlink()
                self.assertIsNone(fmstats._latest_save(27))
                self.assertIsNone(fmstats._latest_save(28))

if __name__ == '__main__':
    unittest.main()
