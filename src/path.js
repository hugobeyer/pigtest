import * as THREE from 'three';
import {ROWS, COLS} from './assets.js';
import {MOTION, PATH} from './tokens.js';

export function createPath(grid,anchors){
  const {sideOffset,verticalOffset,cornerRadius:R,laneGap,endOffset,arcSteps}=PATH;
  const colX=grid[0].map(cell=>cell.object.getWorldPosition(new THREE.Vector3()).x);
  const rowY=grid.map(row=>row[0].object.getWorldPosition(new THREE.Vector3()).y);
  const start=anchors.RailStart.getWorldPosition(new THREE.Vector3());
  const end=anchors.RailEnd.getWorldPosition(new THREE.Vector3());
  const GRID_LEFT=colX[0], GRID_RIGHT=colX[COLS-1], GRID_TOP=rowY[0];
  const LEFT=end.x, BOTTOM=start.y, RIGHT=GRID_RIGHT+sideOffset, TOP=GRID_TOP+verticalOffset;
  const BR_X=RIGHT-R, TR_Y=TOP-R, TL_X=LEFT+R;
  const nodes=[];
  const arc=(cx,cy,a0,f0)=>{
    for(let i=1;i<=arcSteps;i++){
      const t=i/arcSteps, a=a0+Math.PI*.5*t;
      nodes.push({x:cx+Math.cos(a)*R,y:cy+Math.sin(a)*R,side:'arc',lane:-1,canShoot:false,travelFace:f0+Math.PI*.5*t});
    }
  };
  nodes.push({x:GRID_LEFT-laneGap,y:BOTTOM,side:'gap',lane:-1,canShoot:false,travelFace:-Math.PI*.5});
  for(let c=0;c<COLS;c++)nodes.push({x:colX[c],y:BOTTOM,side:'bottom',lane:c,canShoot:true,travelFace:-Math.PI*.5,shootFace:0});
  nodes.push({x:GRID_RIGHT+laneGap,y:BOTTOM,side:'gap',lane:-1,canShoot:false,travelFace:-Math.PI*.5});
  nodes.push({x:BR_X,y:BOTTOM,side:'gap',lane:-1,canShoot:false,travelFace:-Math.PI*.5});
  arc(BR_X,BOTTOM+R,-Math.PI*.5,-Math.PI*.5);
  for(let r=ROWS-1;r>=0;r--)nodes.push({x:RIGHT,y:rowY[r],side:'right',lane:r,canShoot:true,travelFace:0,shootFace:Math.PI*.5});
  nodes.push({x:RIGHT,y:TR_Y,side:'gap',lane:-1,canShoot:false,travelFace:0});
  arc(RIGHT-R,TR_Y,0,0);
  nodes.push({x:GRID_RIGHT+laneGap,y:TOP,side:'gap',lane:-1,canShoot:false,travelFace:Math.PI*.5});
  for(let c=COLS-1;c>=0;c--)nodes.push({x:colX[c],y:TOP,side:'top',lane:c,canShoot:true,travelFace:Math.PI*.5,shootFace:Math.PI});
  nodes.push({x:GRID_LEFT-laneGap,y:TOP,side:'gap',lane:-1,canShoot:false,travelFace:Math.PI*.5});
  nodes.push({x:TL_X,y:TOP,side:'gap',lane:-1,canShoot:false,travelFace:Math.PI*.5});
  arc(TL_X,TOP-R,Math.PI*.5,Math.PI*.5);
  for(let r=0;r<ROWS;r++)nodes.push({x:LEFT,y:rowY[r],side:'left',lane:r,canShoot:true,travelFace:Math.PI,shootFace:Math.PI*1.5});
  nodes.push({x:LEFT,y:end.y+endOffset,side:'end',lane:-1,canShoot:false,travelFace:Math.PI});
  return {nodes,entry:new THREE.Vector3(start.x,BOTTOM,start.z+MOTION.runnerLift)};
}
