"""Regression tests for the math reference comparison in check_math_reference.py.

These pin what the checker accepts and rejects, so later edits cannot quietly
weaken it. They use a small synthetic fixture and need no compiler or driver.
Run: python scripts/test_check_math_reference.py
"""
import copy
import unittest

from check_math_reference import compare


def fixture():
    return {
        "reference": "Modified common/ C++ operators; MSVC x64 /fp:strict",
        "headers_sha256": {"accel-tiered.hpp": "aa", "rawaccel-base.hpp": "bb"},
        "absolute_tolerance": 1e-10,
        "relative_tolerance": 1e-10,
        "comparison": "abs(actual-reference) <= absolute + relative*abs(reference)",
        "limits": "Offline sampled verification.",
        "cases": [
            {"name": "tiered-natural-gain", "args": {"mode": "tiered", "gain": True},
             "xs": [0, 5, 1000], "expected": [1, 1.25, 2000.5], "table_bits": []},
            {"name": "synchronous-gain", "args": {"mode": "synchronous", "gain": True},
             "xs": [-1, 0, 1], "expected": ["NaN", 0.5, "Infinity"], "table_bits": [1065353216, 1073741824]},
        ],
    }


class CompareTests(unittest.TestCase):
    def check(self, mutate):
        reviewed = fixture()
        actual = copy.deepcopy(reviewed)
        mutate(actual)
        return compare(reviewed, actual)

    def assertAccepted(self, mutate):
        self.assertEqual(self.check(mutate), [])

    def assertRejected(self, mutate, expected_text):
        problems = self.check(mutate)
        self.assertTrue(problems, "change was accepted")
        self.assertTrue(any(expected_text in problem for problem in problems), problems)

    def sample(self, actual, case=0):
        return actual["cases"][case]["expected"]

    # Accepted: identical output and insignificant floating-point differences.
    def test_identical_output_is_accepted(self):
        self.assertAccepted(lambda actual: None)

    def test_relative_rounding_noise_is_accepted(self):
        self.assertAccepted(lambda actual: self.sample(actual).__setitem__(2, 2000.5 * (1 + 1e-14)))

    def test_absolute_noise_near_zero_is_accepted(self):
        self.assertAccepted(lambda actual: self.sample(actual).__setitem__(0, 1 + 5e-11))

    def test_integer_and_float_forms_of_one_value_are_equal(self):
        self.assertAccepted(lambda actual: self.sample(actual).__setitem__(0, 1.0))

    # Rejected: real numeric changes, including at the tolerance boundary.
    def test_real_numeric_change_is_rejected_with_location(self):
        self.assertRejected(lambda actual: self.sample(actual).__setitem__(1, 1.25 * (1 + 1e-6)),
                            "tiered-natural-gain: x=5 got")

    def test_change_just_beyond_tolerance_is_rejected(self):
        # Allowed difference at 1.25 is 1e-10 + 1.25e-10; go slightly past it.
        self.assertRejected(lambda actual: self.sample(actual).__setitem__(1, 1.25 + 2.3e-10), "x=5")

    def test_tolerance_comes_from_reviewed_fixture_not_fresh_run(self):
        def loosen(actual):
            actual["absolute_tolerance"] = 1.0
            actual["relative_tolerance"] = 1.0
            self.sample(actual)[1] = 1.5
        problems = self.check(loosen)
        self.assertTrue(any("x=5" in problem for problem in problems), problems)
        self.assertTrue(any("absolute_tolerance differs" in problem for problem in problems), problems)

    # Rejected exactly: nonfinite classifications.
    def test_nan_becoming_finite_is_rejected(self):
        self.assertRejected(lambda actual: self.sample(actual, 1).__setitem__(0, 0.0), "classification")

    def test_finite_becoming_infinity_is_rejected(self):
        self.assertRejected(lambda actual: self.sample(actual).__setitem__(1, "Infinity"), "classification")

    def test_infinity_changing_sign_is_rejected(self):
        self.assertRejected(lambda actual: self.sample(actual, 1).__setitem__(2, "-Infinity"), "classification")

    def test_infinity_becoming_nan_is_rejected(self):
        self.assertRejected(lambda actual: self.sample(actual, 1).__setitem__(2, "NaN"), "classification")

    # Rejected exactly: Synchronous table bits, inputs, shape and metadata.
    def test_single_table_bit_flip_is_rejected(self):
        self.assertRejected(lambda actual: actual["cases"][1]["table_bits"].__setitem__(0, 1065353217),
                            "synchronous-gain: table_bits differs")

    def test_changed_case_arguments_are_rejected(self):
        self.assertRejected(lambda actual: actual["cases"][0]["args"].__setitem__("gain", False),
                            "tiered-natural-gain: args differs")

    def test_changed_sample_speeds_are_rejected(self):
        self.assertRejected(lambda actual: actual["cases"][0]["xs"].__setitem__(1, 5.0000001),
                            "tiered-natural-gain: xs differs")

    def test_renamed_case_is_rejected(self):
        self.assertRejected(lambda actual: actual["cases"][0].__setitem__("name", "renamed"), "name differs")

    def test_added_case_field_is_rejected(self):
        self.assertRejected(lambda actual: actual["cases"][0].__setitem__("extra", 1), "extra differs")

    def test_missing_sample_is_rejected(self):
        self.assertRejected(lambda actual: self.sample(actual).pop(), "2 samples != reviewed 3")

    def test_missing_case_is_rejected(self):
        self.assertRejected(lambda actual: actual["cases"].pop(), "case count 1 != reviewed 2")

    def test_changed_header_hash_is_rejected(self):
        self.assertRejected(lambda actual: actual["headers_sha256"].__setitem__("accel-tiered.hpp", "cc"),
                            "headers_sha256 differs")

    def test_added_header_is_rejected(self):
        self.assertRejected(lambda actual: actual["headers_sha256"].__setitem__("accel-new.hpp", "dd"),
                            "headers_sha256 differs")

    def test_changed_description_metadata_is_rejected(self):
        self.assertRejected(lambda actual: actual.__setitem__("limits", "changed"), "limits differs")

    def test_every_problem_is_reported_not_just_the_first(self):
        def several(actual):
            self.sample(actual)[1] = 9.0
            actual["cases"][1]["table_bits"][1] = 0
            actual["headers_sha256"]["rawaccel-base.hpp"] = "zz"
        self.assertEqual(len(self.check(several)), 3)


if __name__ == "__main__":
    unittest.main()
