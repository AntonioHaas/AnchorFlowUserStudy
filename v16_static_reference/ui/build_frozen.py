"""Rebuild the standalone V16 page from the frozen task payload."""

from pathlib import Path
import json


ROOT = Path(__file__).resolve().parent
tasks = json.loads((ROOT / "real_tasks.json").read_text())
app = (ROOT / "app.js").read_text().replace(
    "__TASK_DATA__", json.dumps(tasks, ensure_ascii=False).replace("</", "<\\/")
)
html = (
    (ROOT / "template.html")
    .read_text()
    .replace("__GEOMETRY__", (ROOT / "geometry.js").read_text())
    .replace("__APP__", app)
)
(ROOT / "index.html").write_text(html)
print(json.dumps({"tasks": len(tasks), "conditions": 4, "trials": len(tasks) * 4}))
