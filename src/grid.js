import {ROWS, COLS} from './assets.js';

let grid;

export function createGrid(objects){
  grid=objects.map((row,r)=>row.map((object,c)=>{
    const {row:rr,column:cc,is_light}=object.userData;
    if(rr!==r || cc!==c || typeof is_light!=='boolean')throw new Error(`${object.name}: invalid row/column/is_light metadata`);
    return {r,c,isLight:is_light,alive:true,reserved:false,object};
  }));
  return grid;
}

function frontCell(node){
  if(!node.canShoot || node.lane<0)return null;
  if(node.side==='bottom'){
    for(let r=ROWS-1;r>=0;r--)if(grid[r][node.lane].alive)return grid[r][node.lane];
  }else if(node.side==='top'){
    for(let r=0;r<ROWS;r++)if(grid[r][node.lane].alive)return grid[r][node.lane];
  }else if(node.side==='left'){
    for(let c=0;c<COLS;c++)if(grid[node.lane][c].alive)return grid[node.lane][c];
  }else if(node.side==='right'){
    for(let c=COLS-1;c>=0;c--)if(grid[node.lane][c].alive)return grid[node.lane][c];
  }
  return null;
}

export function validTarget(isLight,node){
  const cell=frontCell(node);
  if(!cell || cell.reserved || cell.isLight!==isLight)return null;
  return cell;
}

export function destroyCell(cell){
  cell.reserved=false;
  if(!cell.alive)return;
  cell.alive=false;
  cell.object.visible=false;
}
