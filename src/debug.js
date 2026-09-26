import GUI from 'lil-gui';
import look from './look.json';
import {catcher} from './environment.js';
import {uniforms as vignette} from './ground.js';
import {uniforms as shade} from './shading.js';

export function debug({scene,ambient,key,blender}){
  const state=structuredClone(look), on={sss:true,rim:true,outline:true,sheen:true,vignette:true};
  const {shading:s,environment:e,ground:g,hemisphere:h}=state;
  const live={sun:'#'+key.color.getHexString(),sunIntensity:key.intensity,sky:'#'+ambient.color.getHexString(),skyIntensity:ambient.intensity};
  const apply=()=>{
    shade.uWrap.value=s.wrap; shade.uPower.value=s.power;
    shade.uSssStrength.value=on.sss ? s.sss.strength : 0; shade.uSssWidth.value=s.sss.width;
    shade.uRimColor.value.set(s.rim.color); shade.uRimStrength.value=on.rim ? s.rim.strength : 0; shade.uRimPower.value=s.rim.power;
    shade.uOutlineColor.value.set(s.outline.color); shade.uOutlineFrom.value=s.outline.from; shade.uOutlineStrength.value=on.outline ? s.outline.strength : 0;
    shade.uSheenStrength.value=on.sheen ? e.sheen.strength : 0; shade.uSheenPower.value=e.sheen.power; shade.uSheenSaturation.value=e.sheen.saturation;
    catcher.color.set(e.shadowColor); catcher.opacity=e.shadowOpacity;
    vignette.uRadius.value.fromArray(g.radius); vignette.uInner.value=g.inner; vignette.uOuter.value=g.outer;
    vignette.uMiddle.value.set(g.middle); vignette.uEdge.value.set(on.vignette ? g.edge : g.middle);
    ambient.groundColor.set(h.ground);
    if(blender.world){ambient.color.set(live.sky); ambient.intensity=live.skyIntensity;}
    else{ambient.color.set(h.sky); ambient.intensity=h.intensity;}
    key.color.set(live.sun); key.intensity=live.sunIntensity;
    Object.assign(key.shadow,state.shadow);
    scene.background.set(state.background);
  };

  const gui=new GUI({title:'Look  (G to hide)'});
  const character=gui.addFolder('Pigs, blocks, rail');
  character.add(s,'wrap',0,1,.01);
  character.add(s,'power',.5,4,.01);
  character.add(on,'sss').name('SSS on');
  character.add(s.sss,'strength',0,1,.01).name('SSS strength');
  character.add(s.sss,'width',.02,1,.01).name('SSS width');
  character.add(on,'rim').name('rim on');
  character.addColor(s.rim,'color').name('rim color');
  character.add(s.rim,'strength',0,1.5,.01).name('rim strength');
  character.add(s.rim,'power',.5,8,.05).name('rim power');
  character.add(on,'outline').name('outline on');
  character.addColor(s.outline,'color').name('outline color');
  character.add(s.outline,'from',0,.95,.01).name('outline from');
  character.add(s.outline,'strength',0,1,.01).name('outline strength');

  const scenery=gui.addFolder('Scenery');
  scenery.add(e,'lit').name('lit (save, then reloads)');
  scenery.add(on,'sheen').name('sheen on');
  scenery.add(e.sheen,'strength',0,1,.01).name('sheen strength');
  scenery.add(e.sheen,'power',1,16,.1).name('sheen power');
  scenery.add(e.sheen,'saturation',0,1,.01).name('sheen saturation');

  const ground=gui.addFolder('Ground');
  ground.add(on,'vignette').name('vignette on');
  ground.add(g.radius,0,1,40,.1).name('radius across');
  ground.add(g.radius,1,1,40,.1).name('radius up/down');
  ground.add(g,'inner',0,2,.01);
  ground.add(g,'outer',0,3,.01);
  ground.addColor(g,'middle').name('center color');
  ground.addColor(g,'edge').name('edge color');
  ground.addColor(e,'shadowColor').name('shadow color');
  ground.add(e,'shadowOpacity',0,1,.01).name('shadow opacity');

  const light=gui.addFolder('Light');
  light.addColor(h,'ground').name('ambient bounce');
  if(!blender.world){light.addColor(h,'sky').name('ambient sky'); light.add(h,'intensity',0,6,.01).name('ambient intensity');}
  light.add(state.shadow,'radius',0,12,.1).name('shadow blur');
  light.add(state.shadow,'normalBias',0,.2,.001).name('shadow normal bias');
  light.add(state.shadow,'bias',-.005,.005,.00005).name('shadow bias');
  light.addColor(state,'background');

  const fromBlender=gui.addFolder('From Blender (live only, set in Blender)');
  fromBlender.addColor(live,'sun').name('sun color');
  fromBlender.add(live,'sunIntensity',0,8,.01).name('sun strength');
  if(blender.world){fromBlender.addColor(live,'sky').name('world color'); fromBlender.add(live,'skyIntensity',0,8,.01).name('world strength');}
  fromBlender.close();

  gui.add({save:()=>fetch('/__look',{method:'POST',body:JSON.stringify(state)})},'save').name('Save to look.json');
  gui.add({copy:()=>navigator.clipboard.writeText(JSON.stringify(state,null,2))},'copy').name('Copy JSON');
  gui.onChange(apply);

  let shown=true;
  addEventListener('keydown',event=>{
    if(event.key!=='g' && event.key!=='G')return;
    shown=!shown;
    gui.show(shown);
  });
}
