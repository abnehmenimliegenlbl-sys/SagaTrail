import importlib.util
import pathlib
import unittest


MODULE_PATH = pathlib.Path(__file__).with_name("extract_schweizmobil_wanderland.py")
SPEC = importlib.util.spec_from_file_location("official_wanderland", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class OfficialWanderlandOrderingTests(unittest.TestCase):
    def test_orders_and_reverses_parts_by_shared_endpoints(self):
        parts = [
            [(200.0, 0.0), (300.0, 0.0)],
            [(100.0, 0.0), (200.0, 0.0)],
            [(0.0, 0.0), (100.0, 0.0)],
        ]

        ordered = MODULE.order_parts(parts, start_hint=(0.0, 0.0))

        self.assertEqual(
            MODULE.flatten(ordered),
            [
                (0.0, 0.0),
                (100.0, 0.0),
                (200.0, 0.0),
                (300.0, 0.0),
            ],
        )

    def test_keeps_stage_direction_from_previous_stage(self):
        parts = [
            [(1_200.0, 0.0), (1_100.0, 0.0)],
            [(1_000.0, 0.0), (1_100.0, 0.0)],
        ]

        ordered = MODULE.order_parts(parts, start_hint=(1_000.0, 0.0))

        self.assertEqual(ordered[0][0], (1_000.0, 0.0))
        self.assertEqual(ordered[-1][-1], (1_200.0, 0.0))


if __name__ == "__main__":
    unittest.main()