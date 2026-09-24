import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const ROWS=26, COLS=26, PIG_COUNT=12;
const pad=n=>String(n).padStart(2,'0');

function requireObject(root,name){
  const object=root.getObjectByName(name);
  if(!object)throw new Error(`Missing Blender object: ${name}`);
  return object;
}

export async function loadAssets(url){
  const root=(await new GLTFLoader().loadAsync(url)).scene;
  root.rotation.x=Math.PI*.5;
  root.updateMatrixWorld(true);
  const lights=[];
  root.traverse(object=>{
    if(object.isMesh){object.castShadow=true; object.receiveShadow=true;}
    if(object.isLight)lights.push(object);
  });
  lights.forEach(light=>light.parent.remove(light));
  ['Rail_Start','Rail_Main','Rail_End','GridCenter','CameraTarget'].forEach(name=>requireObject(root,name));
  const runner=requireObject(root,'PigRunner');
  runner.visible=false;
  return {
    root,runner,
    anchors:{RailStart:requireObject(root,'RailStart'),RailEnd:requireObject(root,'RailEnd')},
    grid:Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>requireObject(root,`Grid_r${pad(r)}_c${pad(c)}`))),
    pigs:Array.from({length:PIG_COUNT},(_,i)=>requireObject(root,`Pig_${pad(i)}`))
  };
}
