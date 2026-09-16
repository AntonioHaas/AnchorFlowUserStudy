"""Build three traceable editing tasks from existing clean benchmark outputs."""
from pathlib import Path
import json, hashlib, re, shutil, subprocess, xml.etree.ElementTree as ET
P = Path(__file__).resolve().parent
R = P.parents[2]
manifest_path = R/'paper_assets/iclr_20260914/03_figures/confirmed_main/clean_v10/selection_manifest.json'
manifest = json.loads(manifest_path.read_text())
selection_path = R/'experiments/path2400_expansion_20260909/selection.jsonl'
selection = {r['global_ordinal']: r for r in map(json.loads, selection_path.read_text().splitlines())}
methods = [('ours','afnet','Ours'),('adavec','adavec','AdaVec'),('vtracer','vtracer','VTracer'),('live','live','LIVE')]
specs = [(1092,'Mikrofonkopf verschieben / Move microphone top','Den Mikrofonkopf nach links oben zur gestrichelten Linie bewegen; den unteren Teil unverändert lassen. / Move the microphone top up-left to the dashed line; keep the lower part unchanged.'),(973,'Rechten oberen Arm verlängern / Extend upper-right arm','Den rechten oberen Arm des X zur gestrichelten Linie verlängern; alles andere unverändert lassen. / Extend the upper-right arm of the X to the dashed line; keep everything else unchanged.'),(1285,'Linken Balken anheben / Raise left vertical','Die Spitze des linken vertikalen Balkens bis zur gestrichelten Linie anheben; Unterseite und rechte Seite unverändert lassen. / Raise the top of the left vertical to the dashed line; keep the lower and right parts unchanged.')]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
rows = {(r['ordinal'],r['method']):r for r in manifest['sources']}
tasks=[]
(P/'benchmark_originals').mkdir(exist_ok=True)
for ordinal,title,instruction in specs:
    ref = selection[ordinal]
    task = dict(id=f'B{ordinal:04}',benchmark_ordinal=ordinal,sample_id=ref['sample_id'],title=title,instruction=instruction,predictions={})
    for key,source_key,label in [('reference','gt','Reference')]+methods:
        row=rows[ordinal,source_key]; path=Path(row['path'])
        assert sha(path)==row['sha256'],path
        root=ET.parse(path).getroot(); paths=root.findall('.//{http://www.w3.org/2000/svg}path')
        assert len(paths)==1,(path,'single closed path required')
        assert not any(e.get('transform') for e in root.iter() if e is not paths[0]),path
        transform=paths[0].get('transform','')
        assert not transform or re.fullmatch(r'translate\([\d., +\-eE]+\)',transform),transform
        dst=P/'benchmark_originals'/f'{ordinal}_{key}.svg';shutil.copy2(path,dst)
        item=dict(method=label,d=paths[0].get('d'),transform=transform,sha256=row['sha256'],original_anchor_count=row['anchors'],relative_path=str(path.relative_to(R)),original_svg=path.read_text())
        if key=='reference':task['reference']=item
        else:task['predictions'][key]=item
    inp=Path(next(r['path'] for r in manifest['inputs'] if r['ordinal']==ordinal))
    expected=next(r['sha256'] for r in manifest['inputs'] if r['ordinal']==ordinal)
    assert sha(inp)==expected
    batch=R/f'experiments/path2400_expansion_20260909/batch_{ref["batch_index"]:02}'
    input_rows=list(map(json.loads,(batch/'method_inputs.jsonl').read_text().splitlines()))
    matching=next(r for r in input_rows if r['sample_id']==ref['sample_id'])
    assert matching['observed_input_file_sha256']==expected
    task['input_sha256']=expected;task['input_path']=str(inp.relative_to(R))
    task['source_attribution']={k:ref.get(k) for k in ['source','source_url','license_id','source_asset_id','source_file','source_svg_or_glif_sha256']}
    shutil.copy2(inp,P/'benchmark_originals'/f'{ordinal}_input.png')
    tasks.append(task)
result=subprocess.run(['node',str(P/'prepare_benchmark.cjs')],input=json.dumps(tasks),text=True,capture_output=True)
if result.returncode:
    raise RuntimeError(result.stderr.strip())
tasks=json.loads(result.stdout)
(P/'real_tasks.json').write_text(json.dumps(tasks,ensure_ascii=False,indent=2))
receipt=dict(status='verified_v11_german_english',benchmark='clean singlepath2400',ordinals=[t['benchmark_ordinal'] for t in tasks],methods=[m[2] for m in methods],selection='Three previously displayed qualitative examples, selected for distinct local editing actions. Convenience pilot; not random or representative.',source_manifest=str(manifest_path),selection_manifest_sha256=sha(selection_path),targets='Authored edits of the benchmark reference, not model predictions. Each target changes one connected local region. Native method outputs retain all anchors and control points; SVG translations are baked exactly.',ui_change='All participant-visible copy is German-first and English-second, including the three in-canvas practice guides, controls, statuses, task titles, progress, result sharing, and accessibility labels. The formal canvases retain only the locally clipped magenta target guide, without a redundant guide label. Overall and per-method progress bars remain visible.',tasks=tasks)
(P/'provenance.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2))
(P/'attribution.json').write_text(json.dumps({'usage':'Non-commercial research pilot. Editing targets are adaptations of the source shapes; retain original shape licenses.','samples':[dict(ordinal=t['benchmark_ordinal'],sample_id=t['sample_id'],**t['source_attribution']) for t in tasks]},ensure_ascii=False,indent=2))
app=(P/'app.js').read_text().replace('__TASK_DATA__',json.dumps(tasks,ensure_ascii=False).replace('</','<\\/'))
html=(P/'template.html').read_text().replace('__GEOMETRY__',(P/'geometry.js').read_text()).replace('__APP__',app)
(P/'index.html').write_text(html)
print(json.dumps({'tasks':len(tasks),'outputs':len(tasks)*len(methods),'ordinals':receipt['ordinals'],'anchors':{t['id']:{k:v['original_anchor_count'] for k,v in t['predictions'].items()} for t in tasks}},indent=2))
