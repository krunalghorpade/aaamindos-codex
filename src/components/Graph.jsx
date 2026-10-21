import { memo, useContext, createContext, useMemo, useState, useEffect, useCallback } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Handle, Position, ConnectionMode, BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, useOnViewportChange, MiniMap } from '@xyflow/react';
import { Plus, X, Check, Crosshair, Maximize, Minus, Network, Bookmark, ArrowUpRight, Move } from 'lucide-react';
import { GOAL, pathFor } from '../lib/graph';
export const MapContext=createContext({});
const positions={top:Position.Top,right:Position.Right,bottom:Position.Bottom,left:Position.Left};
const Handles=()=>Object.entries(positions).map(([id,position])=><Handle key={id} type="source" position={position} id={id}/>);
const Corners=()=> <><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/></>;
const MindMapNode=memo(function MindMapNode({id,data,selected}){
 const api=useContext(MapContext);
 return <div className={`mind-node ${data.isAdded?'saved-node':''} ${data.isMediaRoot?'media-root':''} ${selected?'selected':''}`}>
   <Corners/><div className="node-top"><span className={`origin-dot ${data.originType?.toLowerCase()}`}/><span>{data.type}</span><span className="node-code">{id.replace('starter-','').slice(0,6).toUpperCase()}</span></div>
   <div className="node-label">{data.label}</div><div className="node-bottom"><span>{data.isAdded?<><Check size={10}/> SAVED STATE</>:data.isMediaRoot?'MEDIA → POSSIBILITY':data.type==='State'?'POSSIBLE FUTURE':'ORIGIN SIGNAL'}</span><ArrowUpRight size={12}/></div>
   <div className="node-actions nodrag nopan"><button title={data.isAdded?'View path to reality':'Save as state'} aria-label={data.isAdded?'View path to reality':'Save as state'} onClick={()=>api.save(id)}>{data.isAdded?<Bookmark size={14}/>:<Plus size={14}/>}</button><button title="Extend path" aria-label="Extend path" onClick={()=>api.extend(id)}><ArrowUpRight size={14}/></button><button title="Delete node" aria-label="Delete node" onClick={()=>api.remove(id)}><X size={14}/></button></div>
   {data.isAdded&&<div className="node-action-preview"><b>PATH TO REALITY</b>{data.actions?.map((a,i)=><p key={i}><span>0{i+1}</span>{a}</p>)}</div>}<Handles/>
 </div>;
});
const GoalNode=memo(function GoalNode(){return <div className="goal-wrap"><div className="goal-node"><div className="goal-eyebrow"><Crosshair size={12}/> THE ULTIMATE OBJECTIVE</div><div className="goal-title">WORLD’S<br/>NUMBER <span>1</span> DJ</div><div className="goal-rule"/><div className="goal-foot">EVERY SIGNAL. ONE DIRECTION.</div></div><Handles/></div>;});
const CustomEdge=memo(function CustomEdge(props){const api=useContext(MapContext);const [hover,setHover]=useState(false);const[path,x,y]=getBezierPath(props);return <g onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}><BaseEdge path={path} interactionWidth={40} style={props.style} className={props.className}/><EdgeLabelRenderer><button className={`edge-add nodrag nopan ${hover?'visible':''}`} style={{transform:`translate(-50%, -50%) translate(${x}px, ${y}px)`}} aria-label="Insert step on connection" title="Insert intermediate step" onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onClick={()=>api.insert(props.id)}><Plus size={14}/></button></EdgeLabelRenderer></g>;});
const nodeTypes={mindMapNode:MindMapNode,goalNode:GoalNode},edgeTypes={custom:CustomEdge};
function Canvas({graph,onNodesChange,onEdgesChange,onConnect,api,onNew,layoutSignal}){
 const flow=useReactFlow();const[hover,setHover]=useState(null),[zoom,setZoom]=useState(1),[minimap,setMinimap]=useState(false),[context,setContext]=useState(null);
 useOnViewportChange({onChange:v=>setZoom(v.zoom)});
 useEffect(()=>{if(layoutSignal)requestAnimationFrame(()=>flow.fitView({padding:.16,duration:500}));},[layoutSignal,flow]);
 const active=useMemo(()=>hover&&pathFor(hover,graph.edges),[hover,graph.edges]);
 const nodes=useMemo(()=>graph.nodes.map(n=>({...n,style:{...n.style,opacity:!active||active.has(n.id)?1:.18}})),[graph.nodes,active]);
 const edges=useMemo(()=>graph.edges.map(e=>({...e,className:active&&active.has(e.source)&&active.has(e.target)?'edge-highlighted-path':'',style:{stroke:'var(--accent-color)',strokeWidth:active&&active.has(e.source)&&active.has(e.target)?1.8:1,opacity:!active?0.43:active.has(e.source)&&active.has(e.target)?1:.12}})),[graph.edges,active]);
 const contextNew=type=>{onNew(type,flow.screenToFlowPosition({x:context.clientX,y:context.clientY}));setContext(null);};
 return <MapContext.Provider value={api}><div className="map-canvas"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeDragStop={()=>api.reconnect()} connectionMode={ConnectionMode.Loose} fitView fitViewOptions={{padding:.15,minZoom:window.innerWidth<760?.65:.5,maxZoom:.85}} minZoom={.01} maxZoom={2} deleteKeyCode={null} onNodeMouseEnter={(_,n)=>setHover(n.id)} onNodeMouseLeave={()=>setHover(null)} onPaneClick={()=>setContext(null)} onPaneContextMenu={event=>{event.preventDefault();const rect=event.currentTarget.getBoundingClientRect();setContext({x:Math.min(event.clientX-rect.left,rect.width-225),y:Math.min(event.clientY-rect.top,rect.height-210),clientX:event.clientX,clientY:event.clientY});}} onConnectEnd={(event,state)=>{if(!state.isValid&&state.fromNode){const point='changedTouches'in event?event.changedTouches[0]:event;api.extend(state.fromNode.id,flow.screenToFlowPosition({x:point.clientX,y:point.clientY}));}}} attributionPosition="bottom-left">
 <Background gap={24} size={1} color="var(--grid-color)"/>{minimap&&<MiniMap position="bottom-right" nodeColor="var(--accent-color)" maskColor="rgba(10,10,10,.7)"/>}
 </ReactFlow>
 <div className="map-coordinates micro"><span>KRATEX / COGNITIVE FIELD</span><span>X: 0500 &nbsp; Y: 0000</span></div>
 <div className="map-legend"><span><i className="legend-square"/> ACTIVITY</span><span><i className="legend-diamond"/> THOUGHT</span><span><i className="legend-x">×</i> MISTAKE</span><span><i className="legend-saved"/> SAVED STATE</span></div>
 <div className="map-help micro"><Move size={12}/><span>DRAG TO EXPLORE</span><i>·</i><span>SCROLL TO ZOOM</span><i>·</i><span>RIGHT CLICK TO ADD</span></div>
 <div className="map-controls"><button title="Zoom out" aria-label="Zoom out" onClick={()=>flow.zoomOut()}><Minus size={16}/></button><span>{Math.round(zoom*100)}%</span><button title="Zoom in" aria-label="Zoom in" onClick={()=>flow.zoomIn()}><Plus size={16}/></button><div className="control-divider"/><button title="Fit map" aria-label="Fit map" onClick={()=>flow.fitView({padding:.15,duration:400})}><Maximize size={15}/></button><button title="Toggle minimap" aria-label="Toggle minimap" onClick={()=>setMinimap(!minimap)}><Network size={15}/></button></div>
 {context&&<div className="context-menu" style={{left:context.x,top:context.y}} onPointerDown={e=>{if(e.target.closest('button'))return;const start={x:context.x,y:context.y,startX:e.clientX,startY:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.onpointermove=ev=>setContext({...context,x:start.x+ev.clientX-start.startX,y:start.y+ev.clientY-start.startY});e.currentTarget.onpointerup=ev=>{ev.currentTarget.onpointermove=null;};}}><span className="micro">+ CAPTURE A SIGNAL</span>{['Activity','Thought','Mistake'].map(t=><button key={t} onClick={()=>contextNew(t)}>{t}<ArrowUpRight size={14}/></button>)}</div>}
 </div></MapContext.Provider>;
}
export default function Graph(props){return <ReactFlowProvider><Canvas {...props}/></ReactFlowProvider>;}
