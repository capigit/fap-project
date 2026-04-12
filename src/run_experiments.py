import csv
import re
import subprocess
import sys
import time
from pathlib import Path


DATASETS = [
    ("original", "data/fap.json"),
    ("small", "data/fap_small.json"),
    ("medium", "data/fap_medium.json"),
]

TIME_LIMITS = [30, 60, 120]

MODES = [
    ("feasible", "src/modelSansOptimisation.py"),
    ("optimized", "src/model.py"),
]


def parse_metrics(stdout: str):
    status_match = re.search(r"status=([A-Z]+)", stdout)
    nvals_match = re.search(r"nbFreqDiff=(\d+)", stdout)
    max_match = re.search(r"maxFreq=(\d+)", stdout)

    status = status_match.group(1) if status_match else "UNKNOWN"
    nb_freq_diff = int(nvals_match.group(1)) if nvals_match else None
    max_freq = int(max_match.group(1)) if max_match else None
    return status, nb_freq_diff, max_freq


def run_one(mode: str, script_path: str, dataset_path: str, t_limit: int):
    cmd = [
        sys.executable,
        script_path,
        "--data",
        dataset_path,
    ]
    t0 = time.perf_counter()
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=t_limit)
        elapsed = time.perf_counter() - t0
        status, nb_freq_diff, max_freq = parse_metrics(proc.stdout)
        if proc.returncode != 0 and status == "UNKNOWN":
            status = "ERROR"
        stderr = proc.stderr.strip()
        return_code = proc.returncode
    except subprocess.TimeoutExpired as e:
        elapsed = time.perf_counter() - t0
        proc_stdout = e.stdout if isinstance(e.stdout, str) else ""
        status, nb_freq_diff, max_freq = parse_metrics(proc_stdout)
        status = "TIMEOUT"
        stderr = ""
        return_code = 124
    return {
        "mode": mode,
        "dataset": dataset_path,
        "time_limit": t_limit,
        "status": status,
        "nbFreqDiff": nb_freq_diff if nb_freq_diff is not None else "-",
        "maxFreq": max_freq if max_freq is not None else "-",
        "elapsed_s": f"{elapsed:.2f}",
        "return_code": return_code,
        "stderr": stderr,
    }


def save_csv(rows, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "dataset",
                "time_limit",
                "mode",
                "status",
                "nbFreqDiff",
                "maxFreq",
                "elapsed_s",
                "return_code",
                "stderr",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def save_markdown(rows, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "| Jeu | Mode | Limite (s) | Statut | nbFreqDiff | maxFreq | Temps reel (s) |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    name_by_path = {p: n for n, p in DATASETS}
    for r in rows:
        lines.append(
            f"| {name_by_path[r['dataset']]} | {r['mode']} | {r['time_limit']} | {r['status']} | {r['nbFreqDiff']} | {r['maxFreq']} | {r['elapsed_s']} |"
        )
    path.write_text("\n".join(lines) + "\n")


def main():
    rows = []
    for mode, script_path in MODES:
        for _, dataset_path in DATASETS:
            for t_limit in TIME_LIMITS:
                row = run_one(mode, script_path, dataset_path, t_limit)
                rows.append(row)
                print(
                    f"mode={row['mode']} dataset={row['dataset']} t={row['time_limit']} status={row['status']} nbFreqDiff={row['nbFreqDiff']} maxFreq={row['maxFreq']} elapsed={row['elapsed_s']}"
                )

    save_csv(rows, Path("results/experiments.csv"))
    save_markdown(rows, Path("results/experiments.md"))
    print("Saved results/experiments.csv and results/experiments.md")


if __name__ == "__main__":
    main()
