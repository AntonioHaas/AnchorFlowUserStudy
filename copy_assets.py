import json
import os
import shutil

with open('v16_static_reference/ui/real_tasks.json', 'r') as f:
    v16_tasks = json.load(f)

with open('web/src/lib/tasks.json', 'r') as f:
    tasks_json = json.load(f)

for task in tasks_json['formal']:
    tid = task['id']
    ord_id = task['benchmark_ordinal']
    
    # Update input_path to a logical local path
    task['input_path'] = f"web/study_assets/{tid}/input.png"
    
    # Create the directory in public
    pub_dir = f"web/public/study_assets/{tid}"
    os.makedirs(pub_dir, exist_ok=True)
    
    # Source image
    src_img = f"v16_static_reference/ui/benchmark_originals/{ord_id}_input.png"
    if os.path.exists(src_img):
        shutil.copy(src_img, f"{pub_dir}/input.png")
    
    # The SVG in v16_static_reference/ui/benchmark_originals?
    # ground_truth svg is <ord_id>_ground_truth.svg
    src_svg = f"v16_static_reference/ui/benchmark_originals/{ord_id}_ground_truth.svg"
    if os.path.exists(src_svg):
        shutil.copy(src_svg, f"{pub_dir}/reference.svg")
        if 'reference' in task:
            task['reference']['relative_path'] = f"web/study_assets/{tid}/reference.svg"
            
with open('web/src/lib/tasks.json', 'w') as f:
    json.dump(tasks_json, f, indent=2)

print("Assets copied and paths updated!")
