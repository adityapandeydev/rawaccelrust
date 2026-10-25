"""Offline laboratory checks; all packets are synthetic, never driver captures."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from inspect_capture import inspect_capture, decode_extra_information


def capture():
    return {
        "schema_version": 1, "source": "synthetic",
        "timestamp_domain": "userspace-arrival-ns", "device_id": "test-mouse",
        "packets": [
            {"sequence": 0, "device_id": "test-mouse", "arrival_ns": 0,
             "flags": 0, "x": 6, "y": -8, "extra_information": 4294705155},
            {"sequence": 1, "device_id": "test-mouse", "arrival_ns": 1000000,
             "flags": 0, "x": -6, "y": 8, "extra_information": 327677},
        ],
    }


class InspectorTests(unittest.TestCase):
    def test_signed_packing_is_decoded_without_claiming_provenance(self):
        self.assertEqual(decode_extra_information(0xFFFC0003), (3, -4))
        self.assertEqual(decode_extra_information(0x0004FFFD), (-3, 4))
        self.assertEqual(decode_extra_information(0x80007FFF), (32767, -32768))
        self.assertEqual(decode_extra_information(0), (0, 0))
        for invalid in [-1, 2**32, True, 1.5, "123"]:
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                decode_extra_information(invalid)

    def test_synthetic_capture_has_observed_distances_not_a_kernel_verdict(self):
        original = capture()
        report = inspect_capture(original)
        self.assertEqual(original, capture())
        self.assertEqual(report["observed_path_counts"], {"x": 12, "y": 16, "whole": 20.0})
        self.assertEqual(report["arrival_intervals_ns"], {"min": 1000000, "max": 1000000})
        self.assertIsNone(report["kernel_latency_ns"])
        self.assertEqual(report["curve_verdict"], "not_measured")
        self.assertEqual(report["candidate_input_bounds"], {"x": [-3, 3], "y": [-4, 4]})

    def test_declared_raw_input_never_promotes_itself_to_verified_measurements(self):
        document = capture()
        document["source"] = "wm-input"
        document["calibrated"] = True  # Arbitrary file assertions are not evidence.
        report = inspect_capture(document)
        self.assertEqual(report["curve_verdict"], "not_measured")
        self.assertIsNone(report["kernel_latency_ns"])
        self.assertIn("provenance", " ".join(report["limitations"]).lower())

    def test_mixed_devices_nonmonotonic_timing_and_sequence_gaps_are_rejected(self):
        for field, value in [("device_id", "other-mouse"), ("arrival_ns", 0),
                             ("arrival_ns", -1), ("sequence", 3), ("sequence", True)]:
            document = capture()
            document["packets"][1][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                inspect_capture(document)

    def test_absolute_and_potentially_coalesced_packets_are_not_hidden(self):
        document = capture()
        document["packets"][0]["flags"] = 1
        with self.assertRaises(ValueError):
            inspect_capture(document)
        document = capture()
        self.assertEqual(inspect_capture(document)["potentially_coalesced_packets"], 2)
        for packet in document["packets"]:
            packet["flags"] = 8
        self.assertEqual(inspect_capture(document)["potentially_coalesced_packets"], 0)

    def test_invalid_shapes_ranges_and_nonfinite_values_are_rejected(self):
        for bad in [None, [], {}, {**capture(), "schema_version": True},
                    {**capture(), "source": "aggregate-tracker"},
                    {**capture(), "timestamp_domain": "kernel"},
                    {**capture(), "packets": []}]:
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                inspect_capture(bad)
        for field, value in [("x", float("nan")), ("x", 2**31), ("y", True),
                             ("extra_information", -1), ("flags", 65536)]:
            document = capture()
            document["packets"][0][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                inspect_capture(document)

    def test_cli_reads_only_the_explicit_file_and_rejects_invalid_input(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "synthetic.json"
            path.write_text(json.dumps(capture()), encoding="utf-8")
            command = [sys.executable, str(Path(__file__).with_name("inspect_capture.py")), str(path)]
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)["curve_verdict"], "not_measured")
            self.assertEqual(json.loads(path.read_text()), capture())
            path.write_text('{"schema_version":1,"schema_version":2}', encoding="utf-8")
            self.assertNotEqual(subprocess.run(command, capture_output=True).returncode, 0)

    def test_single_packet_has_no_interval_and_reports_ambiguous_zero(self):
        document = capture()
        document["packets"] = document["packets"][:1]
        document["packets"][0]["extra_information"] = 0
        report = inspect_capture(document)
        self.assertIsNone(report["arrival_intervals_ns"])
        self.assertEqual(report["zero_extra_information_packets"], 1)

    def test_cli_bounds_file_size_depth_and_json_numbers(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "capture.json"
            command = [sys.executable, str(Path(__file__).with_name("inspect_capture.py")), str(path)]
            for raw in [b' ' * (16 * 1024 * 1024 + 1), b'[' * 2000 + b']' * 2000,
                        b'{"schema_version":NaN}', b'{"schema_version":Infinity}']:
                path.write_bytes(raw)
                result = subprocess.run(command, capture_output=True, text=True)
                self.assertEqual(result.returncode, 1)
                self.assertIn("Capture rejected:", result.stderr)
                self.assertEqual(result.stdout, "")

    def test_report_omits_device_paths_and_private_capture_metadata(self):
        document = capture()
        document["device_id"] = r"private-device-path"
        document["operator_notes"] = "private notes"
        for packet in document["packets"]:
            packet["device_id"] = document["device_id"]
        report = json.dumps(inspect_capture(document))
        self.assertNotIn(document["device_id"], report)
        self.assertNotIn(document["operator_notes"], report)


if __name__ == "__main__":
    unittest.main()
