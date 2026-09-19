import json

# 1. Load V16 reference tasks
with open('v16_static_reference/ui/real_tasks.json', 'r') as f:
    v16_tasks = json.load(f)

# 2. Extract the 4 requested tasks
target_ids = ['B1641', 'B0973', 'B1407', 'B0724']
filtered_tasks = []

for task in v16_tasks:
    if task['id'] in target_ids:
        # Move ground_truth to reference
        if 'ground_truth' in task.get('predictions', {}):
            gt = task['predictions'].pop('ground_truth')
            gt['method'] = 'Reference'
            task['reference'] = gt
        filtered_tasks.append(task)

# Make sure they are in the exact order requested
ordered_tasks = []
for tid in target_ids:
    for task in filtered_tasks:
        if task['id'] == tid:
            ordered_tasks.append(task)

# 3. Load existing tasks.json
with open('web/src/lib/tasks.json', 'r') as f:
    tasks_json = json.load(f)

# 4. Replace formal tasks
tasks_json['formal'] = ordered_tasks

# 5. Save back
with open('web/src/lib/tasks.json', 'w') as f:
    json.dump(tasks_json, f, indent=2)

print("Tasks updated successfully!")
