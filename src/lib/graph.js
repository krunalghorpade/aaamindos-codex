import dagre from 'dagre';
export const GOAL = 'goal-node';
export function tiersFor(nodes, edges) {
  const tiers = new Map([[GOAL, 0]]), incoming = new Map();
  for (const e of edges) { if (!incoming.has(e.target)) incoming.set(e.target, []); incoming.get(e.target).push(e.source); }
  const queue = [GOAL];
  for (let i = 0; i < queue.length; i++) for (const source of incoming.get(queue[i]) || []) {
    if (!tiers.has(source)) { tiers.set(source, tiers.get(queue[i]) + 1); queue.push(source); }
  }
  return new Map(nodes.map(n => [n.id, tiers.get(n.id) ?? null]));
}
export function pathFor(id, edges) {
  const ancestors = new Set([id]), descendants = new Set([id]);
  function visit(set, from, to) { const q = [id]; for (let i=0;i<q.length;i++) for(const e of edges) if(e[from] === q[i] && !set.has(e[to])) {set.add(e[to]); q.push(e[to]);} }
  visit(ancestors,'target','source'); visit(descendants,'source','target');
  return new Set([...ancestors, ...descendants]);
}
export function attachHandles(nodes, edges) {
  const byId = new Map(nodes.map(n => [n.id,n]));
  return edges.filter(e=>byId.has(e.source)&&byId.has(e.target)).map(e => {
    const s=byId.get(e.source),t=byId.get(e.target), dx=t.position.x-s.position.x, dy=t.position.y-s.position.y;
    const horizontal=Math.abs(dx)>Math.abs(dy);
    return {...e, type:'custom', sourceHandle:horizontal?(dx>0?'right':'left'):(dy>0?'bottom':'top'), targetHandle:horizontal?(dx>0?'left':'right'):(dy>0?'top':'bottom')};
  });
}
export function getSpiderwebLayout(nodes, edges) {
  const tiers=tiersFor(nodes,edges), groups=new Map();
  for (const n of nodes) if(n.id!==GOAL) {const tier=tiers.get(n.id)??7; if(!groups.has(tier)) groups.set(tier,[]); groups.get(tier).push(n);}
  const radii=new Map();let prior=0;for(const tier of [...groups.keys()].sort((a,b)=>a-b)){const radius=Math.max(tier*320,prior+320,groups.get(tier).length*290/(2*Math.PI));radii.set(tier,radius);prior=radius;}
  const incoming=new Set(edges.map(e=>e.target)), leaves=nodes.filter(n=>n.id!==GOAL&&!incoming.has(n.id));
  const angles=new Map(leaves.map((n,i)=>[n.id, -Math.PI/2+i*2*Math.PI/Math.max(1,leaves.length)]));
  function angle(n,seen=new Set()) { if(angles.has(n.id))return angles.get(n.id); if(seen.has(n.id))return 0; seen.add(n.id); const children=edges.filter(e=>e.target===n.id).map(e=>nodes.find(x=>x.id===e.source)).filter(Boolean); const as=children.map(c=>angle(c,new Set(seen))); const a=as.length?Math.atan2(as.reduce((s,a)=>s+Math.sin(a),0),as.reduce((s,a)=>s+Math.cos(a),0)):0; angles.set(n.id,a);return a;}
  let result=nodes.map(n=>{
    if(n.id===GOAL)return {...n,position:{x:500,y:0}};
    const tier=tiers.get(n.id)??7, a=angle(n), r=radii.get(tier);
    return {...n,position:{x:500+Math.cos(a)*r,y:Math.sin(a)*r},data:{...n.data,tier:tiers.get(n.id)}};
  });
  for(let pass=0;pass<20;pass++)for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++){
    const a=result[i],b=result[j],dx=b.position.x-a.position.x,dy=b.position.y-a.position.y;
    if(Math.abs(dx)<270&&Math.abs(dy)<175){const shift=(175-Math.abs(dy))/2+8; if(a.id!==GOAL)a.position={...a.position,y:a.position.y-(dy>=0?shift:-shift)};if(b.id!==GOAL)b.position={...b.position,y:b.position.y+(dy>=0?shift:-shift)};}
  }
  return {nodes:result,edges:attachHandles(result,edges)};
}
export function getDagreLayout(nodes,edges){
  const g=new dagre.graphlib.Graph();g.setDefaultEdgeLabel(()=>({}));g.setGraph({rankdir:'LR',nodesep:75,ranksep:130});
  nodes.forEach(n=>g.setNode(n.id,{width:n.id===GOAL?270:224,height:n.id===GOAL?170:130})); edges.forEach(e=>g.setEdge(e.source,e.target));dagre.layout(g);
  const result=nodes.map(n=>({...n,position:{x:g.node(n.id).x-112,y:g.node(n.id).y-65}}));return {nodes:result,edges:attachHandles(result,edges)};
}
export function removeNode(graph,nodeId){return {nodes:graph.nodes.filter(n=>n.id!==nodeId),edges:graph.edges.filter(e=>e.source!==nodeId&&e.target!==nodeId)};}
export function insertBetween(graph,edgeId,node){const edge=graph.edges.find(e=>e.id===edgeId);if(!edge)throw new Error('This connection no longer exists.');return {nodes:[...graph.nodes,node],edges:[...graph.edges.filter(e=>e.id!==edgeId),{id:`e-${edge.source}-${node.id}`,source:edge.source,target:node.id,type:'custom'},{id:`e-${node.id}-${edge.target}`,source:node.id,target:edge.target,type:'custom'}]};}
