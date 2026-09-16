"""Rebuild the self-contained index.html from editable sources."""
from pathlib import Path
import json

HERE = Path(__file__).resolve().parent
tasks = json.loads((HERE / "real_tasks.json").read_text(encoding="utf-8"))
app = (HERE / "app.js").read_text(encoding="utf-8")
app = app.replace("__TASK_DATA__", json.dumps(tasks, ensure_ascii=False).replace("</", "<\\/"))
html = (HERE / "template.html").read_text(encoding="utf-8")
html = html.replace("__GEOMETRY__", (HERE / "geometry.js").read_text(encoding="utf-8"))
html = html.replace("__APP__", app)
(HERE / "index.html").write_text(html, encoding="utf-8")
print(HERE / "index.html")
