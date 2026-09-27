import * as THREE from 'three';
import {board, destroyCell, glowCell, hooks} from './grid.js';
import {tween} from './tweens.js';
import {popup} from './fx/popups.js';
import {rampColor} from './fx/ramp.js';
import {sparkle} from './fx/sparkles.js';
import {play} from './sfx.js';
import {ADVENTURE} from './tokens.js';

const gold=new THREE.Color(ADVENTURE.rainbow.gold);
let squares=null, golden=[], wiped=new Set(), now=0, lastBurst=-1, wordDepth=0;

const shard=cell=>sparkle(cell.position,cell.isLight ? 'blockLight' : 'blockDark');

export function setupAdventure(rules,{checker}){
  hooks.destroyed=null;
  squares=null;
  golden=[];
  wiped.clear();
  if(!rules)return;
  const grid=board(), cells=grid.flat();
  if(rules.chains){
    squares=new Map();
    for(const cell of cells){
      const key=`${Math.floor(cell.r/checker)},${Math.floor(cell.c/checker)}`;
      if(!squares.has(key))squares.set(key,{r:Math.floor(cell.r/checker),c:Math.floor(cell.c/checker),cells:[],center:new THREE.Vector3()});
      const square=squares.get(key);
      square.cells.push(cell);
      square.center.add(cell.position);
      cell.square=square;
    }
    for(const square of squares.values())square.center.divideScalar(square.cells.length);
  }
  if(rules.golden){
    const pool=[...cells];
    for(let i=0;i<rules.golden && pool.length;i++){
      const cell=pool.splice(Math.floor(Math.random()*pool.length),1)[0];
      cell.golden=true;
      golden.push(cell);
    }
  }
  hooks.destroyed=(cell,depth)=>{
    if(squares && cell.square && cell.square.cells.every(c=>!c.alive))tween(ADVENTURE.chain.delay,null,()=>burst(cell.square,depth+1));
    if(rules.wipe)checkWipe(grid,cell,depth);
  };
}

function burst(square,depth){
  const {pitch,words,tone}=ADVENTURE.chain, color=rampColor(depth*tone);
  sparkle(square.center,'pop');
  play('hit',1+depth*pitch);
  if(now-lastBurst>ADVENTURE.chain.delay*2)wordDepth=0;
  lastBurst=now;
  if(depth>=2 && depth>wordDepth){
    wordDepth=depth;
    popup(words[Math.min(depth-2,words.length-1)],square.center);
  }
  for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const next=squares.get(`${square.r+dr},${square.c+dc}`);
    let target=null, best=Infinity;
    for(const cell of next?.cells ?? []){
      const d=cell.alive ? cell.position.distanceToSquared(square.center) : Infinity;
      if(d<best){best=d; target=cell;}
    }
    if(!target)continue;
    shard(target);
    destroyCell(target,color,depth*5,depth);
  }
}

function checkWipe(grid,cell,depth){
  const row=grid[cell.r], column=grid.map(r=>r[cell.c]);
  const lines=[];
  if(!wiped.has(`r${cell.r}`) && row.every(c=>!c.alive)){wiped.add(`r${cell.r}`); lines.push(grid[cell.r-1],grid[cell.r+1]);}
  if(!wiped.has(`c${cell.c}`) && column.every(c=>!c.alive)){wiped.add(`c${cell.c}`); lines.push(grid.map(r=>r[cell.c-1]),grid.map(r=>r[cell.c+1]));}
  const color=rampColor((depth+1)*ADVENTURE.chain.tone);
  for(const line of lines){
    if(!line || line.includes(undefined))continue;
    line.forEach((target,i)=>{
      if(i%2 || !target.alive)return;
      tween(i*ADVENTURE.wipe.sweep,null,()=>{
        if(!target.alive)return;
        shard(target);
        destroyCell(target,color,10,depth+1);
      });
    });
  }
}

export function updateAdventure(time){
  now=time;
  const {pulse}=ADVENTURE.rainbow;
  for(const cell of golden)if(cell.alive)glowCell(cell,gold,.45+.3*Math.sin(time*pulse));
}
