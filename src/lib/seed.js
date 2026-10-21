import { attachHandles, GOAL } from './graph';
export const goalNode={id:GOAL,type:'goalNode',position:{x:500,y:0},deletable:false,data:{label:"WORLD'S NUMBER ONE DJ",type:'Goal'}};
const seeds=[
 ['sonic','A sound that is unmistakably KRATEX','State',150,-190,'sonic-root',true],
 ['sonic-root','Build my 5-second sonic fingerprint','Thought',-180,-320,null,false],
 ['live','My M-House sound has reached global stages','State',850,-190,'live-root',true],
 ['live-root','Take M-House beyond borders','Thought',1180,-320,null,false],
 ['culture','A movement, not just a music genre','State',170,260,'culture-root',false],
 ['culture-root','Marathi rhythm. Universal dance floor.','Thought',-180,380,null,false],
 ['craft','Every release has a signature worth remembering','State',860,260,'craft-root',true],
 ['craft-root','Turn set feedback into a stronger next release','Mistake',1180,380,null,false],
 ['audience','A community that carries the sound forward','State',510,-390,null,false],
 ['release','My catalog has earned consistent international support','State',510,480,null,false],
];
const actions={
 sonic:['Choose one Marathi rhythmic motif for the next release.','Record three variations with a local percussionist.','Build one eight-bar drop around the strongest take.','Blind-test the drop with five listeners.','Keep the version listeners recognize without the artist name.'],
 live:['Select three cities with an existing M-House audience.','Build a concise live-set reel with crowd footage.','Create a shortlist of ten relevant promoters per city.','Send each promoter a tailored support-slot pitch.','Track replies and follow up with a fresh unreleased edit.'],
 craft:['Review notes from the last three DJ sets.','Identify the moment that consistently lost energy.','Produce two alternative transitions for that moment.','Test both versions in a rehearsal recording.','Carry the stronger transition into the next live set.'],
};
export function starterGraph(){const nodes=[structuredClone(goalNode),...seeds.map(([id,label,type,x,y,parent,saved])=>({id:`starter-${id}`,type:'mindMapNode',position:{x,y},data:{label,type,originType:id.startsWith('craft')?'Mistake':'Thought',isAdded:saved,actions:actions[id]||[],sample:true,tier:parent?1:2}}))];const edges=[];for(const [id,,,,,parent]of seeds){edges.push({id:`e-${id}`,source:`starter-${id}`,target:parent?GOAL:(id==='audience'||id==='release'?GOAL:`starter-${id.replace('-root','')}`),type:'custom'});}return {nodes,edges:attachHandles(nodes,edges)};}
export const initialInspiration={lastFetchDate:null,curated:true,consumed:[],content:{news:['Marathi electronic music','Amsterdam Dance Event showcases','Tech house label demos','Spatial audio club systems','India electronic music exports'],movie:'We Are Your Friends',movie_desc:'Study how an artist searches for a sound that feels like their own.',game:'Journey',game_desc:'Explore how atmosphere and a wordless narrative create an emotional signature.',book:'The Creative Act',book_desc:'A lens on attention, experimentation, and building a consistent creative practice.',quote:'Turn what you notice into something only you can make.'}};
