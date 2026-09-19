"""Build four traceable, mechanism-focused editing tasks from real benchmark outputs."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET

P = Path(__file__).resolve().parent
R = P.parents[2]
manifest_path = R / "paper_assets/iclr_20260914/03_figures/confirmed_main/clean_v10/selection_manifest.json"
manifest = json.loads(manifest_path.read_text())
selection_path = R / "experiments/path2400_expansion_20260909/selection.jsonl"
selection = {r["global_ordinal"]: r for r in map(json.loads, selection_path.read_text().splitlines())}
manifest_rows = {(r["ordinal"], r["method"]): r for r in manifest["sources"]}
manifest_inputs = {r["ordinal"]: r for r in manifest["inputs"]}

METHODS = [("adavec", "adavec", "AdaVec"), ("ours", "afnet", "Ours"), ("ground_truth", "gt", "Ground Truth"), ("live", "live", "LIVE")]
SPECS = [
    (1641, "Oberen Balken anheben und verbreitern / Raise and widen top bar", "Den obersten Balken anheben und nach außen verlängern, sodass die oberen Rundungen größer werden. / Raise and extend the top bar outward so the upper rounded ends become larger."),
    (973, "Rechten oberen Arm verlängern / Extend upper-right arm", "Den rechten oberen Arm des X bis zur gestrichelten Zielkontur verlängern. / Extend the upper-right arm of the X to the dashed target outline."),
    (1407, "Form auf halbe Länge kürzen / Shorten shape to half length", "Die linke Seite beibehalten und das rechte Ende nach links verschieben, bis die Form halb so lang ist. / Keep the left side fixed and move the right end left until the shape is half as long."),
    (724, "Unterkante stärker einziehen / Deepen bottom curvature", "Die Mitte der Unterkante nach oben biegen, bis sie der gestrichelten Zielkontur entspricht. / Curve the middle of the bottom edge upward until it matches the dashed target outline."),
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_jsonl(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def evaluated_row(ordinal):
    ref = selection[ordinal]
    path = R / f'experiments/path2400_expansion_20260909/batch_{ref["batch_index"]:02}/evaluated.jsonl'
    return next(r for r in read_jsonl(path) if r["ordinal"] == ordinal)


def source_rows(ordinal):
    if ordinal in manifest_inputs:
        return {key: manifest_rows[(ordinal, source_key)] for key, source_key, _ in METHODS}, manifest_inputs[ordinal]

    row = evaluated_row(ordinal)
    live_row = next(r for r in read_jsonl(R / "experiments/diffvg_live240_20260909/both2400/live_rows.jsonl") if r["global_ordinal"] == ordinal)
    ours_row = next(r for r in read_jsonl(R / "paper_assets/iclr_20260914/02_experiments/singlepath2400/remote/experiments/a04d_singlepath2400_20260913/per_example.jsonl") if r["ordinal"] == ordinal)["methods"]["a04d"]
    local_ours = P / "benchmark_originals" / f"{ordinal}_ours.svg"
    local_live = P / "benchmark_originals" / f"{ordinal}_live.svg"
    sources = {
        "ground_truth": {"path": row["reference"]["svg"], "sha256": row["reference"]["svg_sha256"], "anchors": row["reference"]["anchor_count"]},
        "ours": {"path": str(local_ours), "sha256": ours_row["svg_sha256"], "anchors": ours_row["anchor_count"]},
        "adavec": {"path": row["methods"]["adavec_single_region"]["svg"], "sha256": row["methods"]["adavec_single_region"]["svg_sha256"], "anchors": row["methods"]["adavec_single_region"]["anchor_count"]},
        "live": {"path": str(local_live), "sha256": live_row["svg_sha256"], "anchors": live_row["anchor_count"]},
    }
    ref = selection[ordinal]
    inp = R / f'experiments/path2400_expansion_20260909/batch_{ref["batch_index"]:02}/inputs/{ref["local_ordinal"]:04}/observed_L8.png'
    return sources, {"path": str(inp), "sha256": ref["input_file_sha256"]}


tasks = []
(P / "benchmark_originals").mkdir(exist_ok=True)
for ordinal, title, instruction in SPECS:
    ref = selection[ordinal]
    rows, input_row = source_rows(ordinal)
    task = dict(id=f"B{ordinal:04}", benchmark_ordinal=ordinal, sample_id=ref["sample_id"], title=title, instruction=instruction, predictions={})
    for key, _, label in METHODS:
        row = rows[key]
        path = Path(row["path"])
        assert sha(path) == row["sha256"], path
        root = ET.parse(path).getroot()
        paths = root.findall(".//{http://www.w3.org/2000/svg}path")
        assert len(paths) == 1, (path, "single closed path required")
        assert not any(e.get("transform") for e in root.iter() if e is not paths[0]), path
        transform = paths[0].get("transform", "")
        assert not transform or re.fullmatch(r"translate\([\d., +\-eE]+\)", transform), transform
        dst = P / "benchmark_originals" / f"{ordinal}_{key}.svg"
        if path.resolve() != dst.resolve():
            shutil.copy2(path, dst)
        item = dict(method=label, d=paths[0].get("d"), transform=transform, sha256=row["sha256"], original_anchor_count=row["anchors"], relative_path=str(path.relative_to(R)) if path.is_relative_to(R) else str(path), original_svg=path.read_text())
        task["predictions"][key] = item
        if key == "ground_truth":
            task["reference"] = item

    inp = Path(input_row["path"])
    assert sha(inp) == input_row["sha256"], inp
    task["input_sha256"] = input_row["sha256"]
    task["input_path"] = str(inp.relative_to(R))
    task["source_attribution"] = {k: ref.get(k) for k in ["source", "source_url", "license_id", "source_asset_id", "source_file", "source_svg_or_glif_sha256"]}
    shutil.copy2(inp, P / "benchmark_originals" / f"{ordinal}_input.png")
    tasks.append(task)

result = subprocess.run(["node", str(P / "prepare_benchmark.cjs")], input=json.dumps(tasks), text=True, capture_output=True)
if result.returncode:
    raise RuntimeError(result.stderr.strip())
tasks = json.loads(result.stdout)
(P / "real_tasks.json").write_text(json.dumps(tasks, ensure_ascii=False, indent=2))
receipt = dict(
    status="verified_v16_svg_experience_and_per_task_method_timing",
    benchmark="clean singlepath2400",
    ordinals=[t["benchmark_ordinal"] for t in tasks],
    methods=[m[2] for m in METHODS],
    selection="Mechanism-focused diagnostic pilot. The four anonymized options are AdaVec, Ours, the source Ground Truth, and LIVE in that order. VTracer is not participant-facing in this version. Tasks were selected before participant collection by explicit criteria: one connected semantic edit and comparable initial fidelity. This is not a random or representative benchmark sample and must not support overall superiority claims.",
    source_manifest=str(manifest_path),
    selection_manifest_sha256=sha(selection_path),
    targets="Authored edits of the benchmark Ground Truth, not model predictions. Option C starts from that unedited Ground Truth; the dashed target is its separately authored edited goal. Each target changes one connected local region. Every editor shows the complete magenta target outline; unchanged regions therefore remain visible as alignment constraints.",
    ui_change="All participant-visible copy is German-first and English-second. A required three-level self-report of SVG editing experience appears before practice and is exported in the session profile and every task-method record. The formal canvases show the full target outline above the editable SVG and below its nodes. Overall and per-method progress bars remain visible. Every task-method card has an independent Start gate and exports active time, wall time, pause time, and active intervals as one task-method record.",
    tasks=tasks,
)
(P / "provenance.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2))
(P / "attribution.json").write_text(json.dumps({"usage": "Non-commercial research pilot. Editing targets are adaptations of the source shapes; retain original shape licenses.", "samples": [dict(ordinal=t["benchmark_ordinal"], sample_id=t["sample_id"], **t["source_attribution"]) for t in tasks]}, ensure_ascii=False, indent=2))
app = (P / "app.js").read_text().replace("__TASK_DATA__", json.dumps(tasks, ensure_ascii=False).replace("</", "<\\/"))
html = (P / "template.html").read_text().replace("__GEOMETRY__", (P / "geometry.js").read_text()).replace("__APP__", app)
(P / "index.html").write_text(html)
print(json.dumps({"tasks": len(tasks), "outputs": len(tasks) * len(METHODS), "ordinals": receipt["ordinals"], "anchors": {t["id"]: {k: v["original_anchor_count"] for k, v in t["predictions"].items()} for t in tasks}}, indent=2))
