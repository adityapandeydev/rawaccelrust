"""Inspect an explicit offline packet capture; never opens a device or applies settings.

Exit 0 means structurally readable, NOT that a driver or curve passed verification.
The input contract and calibration prerequisites are in CURVE-LABORATORY.txt.
"""
import argparse
import json
import math
from pathlib import Path
import sys

MAX_FILE_BYTES = 16 * 1024 * 1024
MAX_PACKETS = 50000


def integer(value, minimum, maximum, label):
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(f"{label} must be an integer in [{minimum}, {maximum}]")
    return value


def decode_extra_information(value):
    """Candidate signed shorts in the x64 driver's little-endian diagnostic word.

    There is no tag or validity bit. Zero is ambiguous and narrowing can wrap.
    Decoding never establishes that this word originated from RawAccel.
    """
    value = integer(value, 0, 0xFFFFFFFF, "extra_information")
    def signed16(word):
        return word - 0x10000 if word >= 0x8000 else word
    return signed16(value & 0xFFFF), signed16(value >> 16)


def inspect_capture(document):
    if not isinstance(document, dict):
        raise ValueError("Capture must be a JSON object")
    integer(document.get("schema_version"), 1, 1, "schema_version")
    if document.get("source") not in ("synthetic", "wm-input"):
        raise ValueError("source must be synthetic or wm-input; aggregated windows are not packets")
    if document.get("timestamp_domain") != "userspace-arrival-ns":
        raise ValueError("Only monotonic userspace-arrival-ns timestamps are supported")
    device_id = document.get("device_id")
    if not isinstance(device_id, str) or not device_id.strip() or len(device_id) > 1024:
        raise ValueError("device_id must identify one device (1..1024 characters)")
    packets = document.get("packets")
    if not isinstance(packets, list) or not 1 <= len(packets) <= MAX_PACKETS:
        raise ValueError(f"Capture must contain 1..{MAX_PACKETS} packets")
    path_x = path_y = 0
    path_whole = 0.0
    intervals, candidate_x, candidate_y = [], [], []
    previous = None
    coalesced = zero_extra = boundary = 0
    for index, packet in enumerate(packets):
        if not isinstance(packet, dict):
            raise ValueError(f"Packet {index} must be an object")
        if packet.get("device_id") != device_id:
            raise ValueError(f"Packet {index} belongs to a different/missing device")
        integer(packet.get("sequence"), index, index, f"Packet {index} sequence")
        timestamp = integer(packet.get("arrival_ns"), 0, 2**63 - 1, "arrival_ns")
        if previous is not None:
            if timestamp <= previous:
                raise ValueError(f"Packet {index} arrival_ns must strictly increase; batched/equal arrivals require a different capture contract")
            intervals.append(timestamp - previous)
        previous = timestamp
        flags = integer(packet.get("flags"), 0, 65535, "flags")
        if flags & 1:
            raise ValueError(f"Packet {index} uses absolute coordinates, not relative counts")
        if flags & ~0x0F:
            raise ValueError(f"Packet {index} contains unsupported mouse flags")
        coalesced += not bool(flags & 8)
        x = integer(packet.get("x"), -(2**31), 2**31 - 1, "x")
        y = integer(packet.get("y"), -(2**31), 2**31 - 1, "y")
        ix, iy = decode_extra_information(packet.get("extra_information"))
        candidate_x.append(ix)
        candidate_y.append(iy)
        zero_extra += packet["extra_information"] == 0
        boundary += ix in (-32768, 32767) or iy in (-32768, 32767)
        path_x += abs(x)
        path_y += abs(y)
        path_whole += math.hypot(x, y)
    return {
        "schema_version": 1, "source": document["source"], "packet_count": len(packets),
        "observed_path_counts": {"x": path_x, "y": path_y, "whole": path_whole},
        "arrival_intervals_ns": {"min": min(intervals), "max": max(intervals)} if intervals else None,
        "candidate_input_bounds": {"x": [min(candidate_x), max(candidate_x)],
                                   "y": [min(candidate_y), max(candidate_y)]},
        "zero_extra_information_packets": zero_extra,
        "candidate_int16_boundary_packets": boundary,
        "potentially_coalesced_packets": coalesced,
        "curve_verdict": "not_measured", "kernel_latency_ns": None,
        "limitations": [
            "Capture provenance is not independently verified; metadata claims cannot establish calibration.",
            "ExtraInformation is only a candidate input: no tag, possible signed-16-bit wrap, zero is ambiguous; non-boundary values can also have wrapped.",
            "Observed x/y are reported relative counts; their position relative to RawAccel requires controlled calibration.",
            "Userspace arrival intervals are not driver processing time, polling intervals, or end-to-end latency.",
            "Expected output requires the actual applied profile/device configuration, driver batch timing, smoothing state and fractional carry.",
            "No gain, curve parity, or latency verdict is available from this inspection.",
        ],
    }


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def reject_constant(value):
    raise ValueError(f"Invalid JSON number: {value}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("capture", type=Path, help="Explicit capture JSON; never personal settings")
    args = parser.parse_args()
    try:
        with args.capture.open("rb") as stream:
            raw = stream.read(MAX_FILE_BYTES + 1)
        if len(raw) > MAX_FILE_BYTES:
            raise ValueError("Capture exceeds 16 MiB")
        document = json.loads(raw, object_pairs_hook=unique_object,
                              parse_constant=reject_constant)
        print(json.dumps(inspect_capture(document), indent=2, allow_nan=False))
    except (OSError, ValueError, RecursionError) as error:
        print(f"Capture rejected: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
