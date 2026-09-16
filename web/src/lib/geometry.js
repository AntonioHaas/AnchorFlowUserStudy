// Native closed-path topology. No resampling or simplification on load.
const Geometry=(()=>{
 const cp=p=>({x:p.x,y:p.y}),mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function parse(d){
  const re=/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g,t=d.match(re)||[];
  if(d.replace(re,'').replace(/[\s,]/g,''))throw Error('SVG 路径中存在不支持的字符');
  let i=0,cmd='',prev='',cur={x:0,y:0},nodes=[],edges=[],qprev=null,closed=false;
  const num=()=>{if(i>=t.length||/^[a-z]$/i.test(t[i]))throw Error('不完整的 SVG 命令');let v=Number(t[i++]);if(!Number.isFinite(v))throw Error('无效坐标');return v};
  while(i<t.length){
   if(/^[a-z]$/i.test(t[i]))cmd=t[i++];
   if(!cmd||closed)throw Error('仅支持一条闭合子路径');
   const upper=cmd.toUpperCase(),rel=cmd!==upper,start=cp(cur);
   const point=()=>{let p={x:num(),y:num()};if(rel){p.x+=start.x;p.y+=start.y}return p};
   let end,c1,c2,q;
   if(upper==='M'){if(nodes.length)throw Error('不支持多个子路径');cur=point();nodes.push(cp(cur));prev='M';cmd=rel?'l':'L';continue}
   if(!nodes.length)throw Error('路径缺少起点');
   if(upper==='Z'){
    const last=nodes.length-1;
    if(last>0&&cur.x===nodes[0].x&&cur.y===nodes[0].y){nodes.pop();edges[edges.length-1].b=0}
    else edges.push({a:last,b:0});closed=true;cmd='';continue;
   }
   if(upper==='L')end=point();
   else if(upper==='H')end={x:num()+(rel?cur.x:0),y:cur.y};
   else if(upper==='V')end={x:cur.x,y:num()+(rel?cur.y:0)};
   else if(upper==='C'){c1=point();c2=point();end=point()}
   else if(upper==='S'){const pe=edges[edges.length-1];c1=(prev==='C'||prev==='S')?{x:2*cur.x-pe.c2.x,y:2*cur.y-pe.c2.y}:cp(cur);c2=point();end=point()}
   else if(upper==='Q'||upper==='T'){
    q=upper==='Q'?point():((prev==='Q'||prev==='T')?{x:2*cur.x-qprev.x,y:2*cur.y-qprev.y}:cp(cur));end=point();c1=mix(cur,q,2/3);c2=mix(end,q,2/3);
   }else throw Error('不支持的 SVG 命令：'+cmd);
   const a=nodes.length-1,b=nodes.length;nodes.push(end);edges.push({a,b,...(c1?{c1,c2}:{})});cur=end;prev=upper;qprev=q||null;
  }
  // DiffVG exports closed paths by returning exactly to M, without a Z token.
  if(!closed&&nodes.length>1&&cur.x===nodes[0].x&&cur.y===nodes[0].y){nodes.pop();edges[edges.length-1].b=0;closed=true}
  if(!closed||nodes.length<2)throw Error('需要至少两个锚点的闭合轮廓');
  return {nodes,edges,modes:nodes.map(()=>'corner')};
 }
 function order(g){let result=[],a=0;for(let k=0;k<g.edges.length;k++){let j=g.edges.findIndex(e=>e.a===a);if(j<0)throw Error('断开的轮廓');result.push(j);a=g.edges[j].b}if(a!==0)throw Error('轮廓未闭合');return result}
 function path(g){let s=`M ${g.nodes[0].x} ${g.nodes[0].y}`;for(let j of order(g)){let e=g.edges[j],p=g.nodes[e.b];s+=e.c1?` C ${e.c1.x} ${e.c1.y} ${e.c2.x} ${e.c2.y} ${p.x} ${p.y}`:` L ${p.x} ${p.y}`}return s+' Z'}
 function controls(g,e){let a=g.nodes[e.a],b=g.nodes[e.b];return [a,e.c1||mix(a,b,1/3),e.c2||mix(a,b,2/3),b]}
 function at(c,t){const a=mix(c[0],c[1],t),b=mix(c[1],c[2],t),d=mix(c[2],c[3],t);return mix(mix(a,b,t),mix(b,d,t),t)}
 function nearest(g,j,p){const c=controls(g,g.edges[j]);let best=0,value=Infinity;for(let k=0;k<=80;k++){let v=dist(at(c,k/80),p);if(v<value){value=v;best=k/80}}let lo=Math.max(0,best-1/80),hi=Math.min(1,best+1/80);for(let k=0;k<28;k++){let a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(dist(at(c,a),p)<dist(at(c,b),p))hi=b;else lo=a}return Math.max(.005,Math.min(.995,(lo+hi)/2))}
 function split(g,j,t){
  const e=g.edges[j],c=controls(g,e),a=mix(c[0],c[1],t),b=mix(c[1],c[2],t),d=mix(c[2],c[3],t),u=mix(a,b,t),v=mix(b,d,t),p=mix(u,v,t),n=g.nodes.length;
  g.nodes.push(p);g.modes.push(e.c1?'smooth':'corner');
  g.edges.splice(j,1,{a:e.a,b:n,...(e.c1?{c1:a,c2:u}:{})},{a:n,b:e.b,...(e.c1?{c1:v,c2:d}:{})});return n;
 }
 function length(c){let l=0,p=c[0];for(let i=1;i<=32;i++){let q=at(c,i/32);l+=dist(p,q);p=q}return l}
 function unit(p,fallback){let m=Math.hypot(p.x,p.y);return m>1e-9?{x:p.x/m,y:p.y/m}:fallback}
 function remove(g,n){
  if(g.nodes.length<=2)throw Error('闭合曲线至少保留两个锚点');
  const incoming=g.edges.find(e=>e.b===n),outgoing=g.edges.find(e=>e.a===n),c=controls(g,incoming),d=controls(g,outgoing),a=c[0],b=d[3];
  const chord=unit({x:b.x-a.x,y:b.y-a.y},{x:1,y:0}),u=unit({x:c[1].x-a.x,y:c[1].y-a.y},chord),v=unit({x:d[2].x-b.x,y:d[2].y-b.y},{x:-chord.x,y:-chord.y});
  const l=length(c),r=length(d),f=(l+r)>1e-8?l/(l+r):.5;
  let aa=0,ab=0,bb=0,ra=0,rb=0,samples=[];
  for(let k=1;k<64;k++){let t=k/64,old=t<=f?at(c,f>0?t/f:0):at(d,f<1?(t-f)/(1-f):1),s=1-t,B1=3*s*s*t,B2=3*s*t*t;
   let base={x:(s*s*s+B1)*a.x+(B2+t*t*t)*b.x,y:(s*s*s+B1)*a.y+(B2+t*t*t)*b.y},x={x:B1*u.x,y:B1*u.y},y={x:B2*v.x,y:B2*v.y},z={x:old.x-base.x,y:old.y-base.y};
   aa+=x.x*x.x+x.y*x.y;ab+=x.x*y.x+x.y*y.y;bb+=y.x*y.x+y.y*y.y;ra+=x.x*z.x+x.y*z.y;rb+=y.x*z.x+y.y*z.y;samples.push({x,y,z});}
  const det=aa*bb-ab*ab,candidates=[[Math.max(0,ra/(aa||1)),0],[0,Math.max(0,rb/(bb||1))],[0,0]];
  if(det>1e-12){let x=(ra*bb-rb*ab)/det,y=(rb*aa-ra*ab)/det;if(x>=0&&y>=0)candidates.push([x,y])}
  const error=([x,y])=>samples.reduce((z,p)=>z+(p.z.x-x*p.x.x-y*p.y.x)**2+(p.z.y-x*p.x.y-y*p.y.y)**2,0);
  candidates.sort((a,b)=>error(a)-error(b));const [alpha,beta]=candidates[0];
  let merged={a:incoming.a,b:outgoing.b,c1:{x:a.x+alpha*u.x,y:a.y+alpha*u.y},c2:{x:b.x+beta*v.x,y:b.y+beta*v.y}};
  g.edges=g.edges.filter(e=>e!==incoming&&e!==outgoing);g.edges.push(merged);g.nodes.splice(n,1);g.modes.splice(n,1);for(let e of g.edges){if(e.a>n)e.a--;if(e.b>n)e.b--}return Math.max(0,n-1);
 }
 function curve(g,n){const e=g.edges.find(e=>e.a===n);if(e.c1)return false;const c=controls(g,e);e.c1=cp(c[1]);e.c2=cp(c[2]);return true}
 function smooth(g,n){const inc=g.edges.find(e=>e.b===n),out=g.edges.find(e=>e.a===n),p=g.nodes[n];g.modes[n]='smooth';if(inc.c2&&out.c1){let r=dist(p,inc.c2),u=unit({x:out.c1.x-p.x,y:out.c1.y-p.y},{x:1,y:0});inc.c2={x:p.x-r*u.x,y:p.y-r*u.y}}}
 function moveControl(g,j,key,p){const e=g.edges[j],n=key==='c1'?e.a:e.b;e[key]=p;if(g.modes[n]!=='smooth')return;const anchor=g.nodes[n],other=key==='c1'?g.edges.find(x=>x.b===n):g.edges.find(x=>x.a===n),k=key==='c1'?'c2':'c1';if(!other[k])return;const l=dist(anchor,other[k]),u=unit({x:p.x-anchor.x,y:p.y-anchor.y},{x:0,y:0});other[k]={x:anchor.x-u.x*l,y:anchor.y-u.y*l}}
 return {parse,path,order,controls,at,nearest,split,remove,curve,smooth,moveControl,dist};
})();
export default Geometry;
