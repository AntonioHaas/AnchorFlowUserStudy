const G=require('./geometry.js');let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{
 const tasks=JSON.parse(input);
 const points=g=>[...g.nodes,...g.edges.flatMap(e=>e.c1?[e.c1,e.c2]:[])];
 for(const t of tasks){
  for(const src of [t.reference,...Object.values(t.predictions)]){
   const g=G.parse(src.d);if(g.nodes.length!==src.original_anchor_count)throw Error(`${t.id} ${src.method}: ${g.nodes.length} != ${src.original_anchor_count}`);
   if(src.transform){const xy=src.transform.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g).map(Number);for(const p of points(g)){p.x+=xy[0];p.y+=xy[1]||0}}
   src.d=G.path(g);src.coordinate_conversion=src.transform?'exact SVG translation':'none';
 }
  t.before=t.reference.d;const original=G.parse(t.before),target=G.parse(t.before);
  for(const p of points(target)){
   let w=0,dx=0,dy=0;
   if(t.benchmark_ordinal===1092){w=Math.max(0,Math.min(1,(125-p.y)/35));dx=-12;dy=-8}
   if(t.benchmark_ordinal===973){w=Math.max(0,Math.min(1,(p.x-130)/45))*Math.max(0,Math.min(1,(125-p.y)/35));dx=12;dy=-10}
   if(t.benchmark_ordinal===1285){w=Math.max(0,Math.min(1,(115-p.y)/35))*Math.max(0,Math.min(1,(100-p.x)/20));dy=-14}
   p.x+=w*dx;p.y+=w*dy;
  }
  t.after=G.path(target);if(t.after===t.before)throw Error('unchanged target');
  const moved=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)>1e-6;
  const edgeMoved=(i)=>{
   const a=original.edges[i],b=target.edges[i];
   return moved(original.nodes[a.a],target.nodes[b.a])||moved(original.nodes[a.b],target.nodes[b.b])||
    (!!a.c1&&(moved(a.c1,b.c1)||moved(a.c2,b.c2)));
  };
  const edgePath=(g,i)=>{const e=g.edges[i],a=g.nodes[e.a],b=g.nodes[e.b];return `M ${a.x} ${a.y}`+(e.c1?` C ${e.c1.x} ${e.c1.y} ${e.c2.x} ${e.c2.y} ${b.x} ${b.y}`:` L ${b.x} ${b.y}`)};
  const changed=target.edges.map((_,i)=>i).filter(edgeMoved);
  const components=changed.filter(i=>!changed.includes((i-1+target.edges.length)%target.edges.length)).length||1;
  if(!changed.length||components!==1)throw Error(`${t.id}: target must be one connected local edit, got ${components}`);
  const originalPoints=points(original),targetPoints=points(target),movedPoints=targetPoints.filter((p,i)=>moved(originalPoints[i],p));
  const xs=movedPoints.map(p=>p.x),ys=movedPoints.map(p=>p.y),pad=10;
  t.target_guide_bounds={x:Math.min(...xs)-pad,y:Math.min(...ys)-pad,width:Math.max(...xs)-Math.min(...xs)+2*pad,height:Math.max(...ys)-Math.min(...ys)+2*pad};
  t.target_guide=changed.map(i=>edgePath(target,i)).join(' ');
  t.target_guide_edge_indices=changed;
 }
 process.stdout.write(JSON.stringify(tasks));
});
