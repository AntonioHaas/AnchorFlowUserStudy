const assert=require('node:assert/strict'),fs=require('node:fs'),G=require('./geometry.js');
const tasks=JSON.parse(fs.readFileSync(__dirname+'/real_tasks.json')),clone=x=>JSON.parse(JSON.stringify(x));
let splitError=0,cases=0;
for(const t of tasks)for(const s of Object.values(t.predictions)){
 const original=G.parse(s.d);assert.equal(original.nodes.length,s.original_anchor_count);assert.equal(original.edges.filter(e=>e.c1).length,s.original_anchor_count);
 assert.deepEqual(G.parse(G.path(original)).nodes,original.nodes);
 for(let j=0;j<original.edges.length;j++){
  const c=G.controls(original,original.edges[j]),g=clone(original),fraction=.371,n=G.split(g,j,fraction);assert.equal(g.nodes.length,original.nodes.length+1);
  const left=G.controls(g,g.edges[j]),right=G.controls(g,g.edges[j+1]);
  for(let k=0;k<=100;k++){let u=k/100,expected=G.at(c,u),actual=u<=fraction?G.at(left,u/fraction):G.at(right,(u-fraction)/(1-fraction));splitError=Math.max(splitError,G.dist(expected,actual))}
  assert.equal(G.parse(G.path(g)).nodes.length,g.nodes.length);
  G.remove(g,n);assert.equal(g.nodes.length,original.nodes.length);assert.doesNotThrow(()=>G.parse(G.path(g)));
 }
 for(let n=0;n<original.nodes.length;n++){
  const g=clone(original);G.remove(g,n);assert.equal(g.nodes.length,original.nodes.length-1);assert.doesNotThrow(()=>G.parse(G.path(g)));
  for(let e of g.edges)for(let p of G.controls(g,e))assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
 }
 const g=clone(original);G.smooth(g,0);const e=g.edges.findIndex(e=>e.a===0);G.moveControl(g,e,'c1',{x:g.nodes[0].x+10,y:g.nodes[0].y+20});let inc=g.edges.find(e=>e.b===0),p=g.nodes[0],q=g.edges[e].c1,r=inc.c2;assert(Math.abs((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x))<1e-6);
 cases++;
}
assert(splitError<1e-9);assert.throws(()=>G.parse('M0 0 L1 1'));assert.throws(()=>G.parse('M0 0 L1 1 Z M5 5 L6 6 Z'));
console.log(JSON.stringify({real_paths:cases,maximum_split_error_px:splitError,all_node_deletions_closed_and_finite:true,control_and_smooth_tests:true}));
