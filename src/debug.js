import GUI from 'lil-gui';
import look from './look.json';
import {catcher} from './environment.js';
import {ENVIRONMENT, FOG, GROUND, LIGHTS, SHADING} from './tokens.js';
import {uniforms as vignette} from './ground.js';
import {sheenColor, uniforms as shade} from './shading.js';

export function debug({scene,fog,ambient,key,blender}){
  const state=structuredClone(look);
  const curve=({terminator,softness,darkColor})=>({terminator,softness,darkColor});
  state.shading={...curve(SHADING),...state.shading};
  state.environment={...curve(ENVIRONMENT),...state.environment};
  for(const group of [state.shading,state.environment]){delete group.wrap; delete group.power;}
  state.ground={offset:[...GROUND.offset],...state.ground};
  state.fog=structuredClone(FOG);
  state.shadow={shadowMapSize:LIGHTS.key.shadowMapSize,...state.shadow};
  const on={sss:true,rim:true,outline:true,sheen:true,vignette:true};
  const {shading:s,environment:e,ground:g,hemisphere:h}=state;
  const live={sun:'#'+key.color.getHexString(),sunIntensity:key.intensity,sky:'#'+ambient.color.getHexString(),skyIntensity:ambient.intensity};
  const apply=()=>{
    shade.uTerminator.value=s.terminator; shade.uSoftness.value=s.softness; shade.uDarkColor.value.set(s.darkColor);
    shade.uSceneryTerminator.value=e.terminator; shade.uScenerySoftness.value=e.softness; shade.uSceneryDarkColor.value.set(e.darkColor);
    shade.uSssStrength.value=on.sss ? s.sss.strength : 0; shade.uSssWidth.value=s.sss.width;
    shade.uRimColor.value.set(s.rim.color); shade.uRimStrength.value=on.rim ? s.rim.strength : 0; shade.uRimPower.value=s.rim.power;
    shade.uOutlineColor.value.set(s.outline.color); shade.uOutlineFrom.value=s.outline.from; shade.uOutlineStrength.value=on.outline ? s.outline.strength : 0;
    shade.uSheenStrength.value=on.sheen ? e.sheen.strength : 0; shade.uSheenPower.value=e.sheen.power; sheenColor(e.sheen,shade.uSheenColor.value); shade.uSheenAlbedo.value=e.sheen.albedo;
    catcher.color.set(e.shadowColor); catcher.opacity=e.shadowOpacity;
    vignette.uOffset.value.fromArray(g.offset); vignette.uRadius.value.fromArray(g.radius); vignette.uInner.value=g.inner; vignette.uOuter.value=g.outer;
    vignette.uMiddle.value.set(g.middle); vignette.uEdge.value.set(on.vignette ? g.edge : g.middle);
    ambient.groundColor.set(h.ground);
    if(blender.world){ambient.color.set(live.sky); ambient.intensity=live.skyIntensity;}
    else{ambient.color.set(h.sky); ambient.intensity=h.intensity;}
    key.color.set(live.sun); key.intensity=live.sunIntensity;
    const {shadowMapSize,...shadow}=state.shadow;
    Object.assign(key.shadow,shadow);
    if(key.shadow.mapSize.x!==shadowMapSize){key.shadow.map?.dispose(); key.shadow.map=null; key.shadow.mapSize.set(shadowMapSize,shadowMapSize);}
    scene.background.set(state.background);
    fog.color.set(state.fog.color); fog.near=state.fog.near; fog.far=state.fog.far; scene.fog=state.fog.enabled ? fog : null;
  };

  const gui=new GUI({title:'Look  (G to hide)',width:420});
  gui.domElement.style.setProperty('--name-width','48%');
  const character=gui.addFolder('Pigs, blocks, bullets');
  character.add(s,'terminator',-1,1,.01).name('shadow starts (lower = more lit)');
  character.add(s,'softness',.01,1,.01).name('edge softness');
  character.addColor(s,'darkColor').name('dark side color');
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
  scenery.add(e,'terminator',-1,1,.01).name('shadow starts (lower = more lit)');
  scenery.add(e,'softness',.01,1,.01).name('edge softness');
  scenery.addColor(e,'darkColor').name('dark side color');
  scenery.add(on,'sheen').name('sheen on');
  scenery.add(e.sheen,'strength',0,1,.01).name('sheen strength');
  scenery.add(e.sheen,'power',1,16,.1).name('sheen power');
  scenery.add(e.sheen,'hue',0,360,1).name('sheen hue');
  scenery.add(e.sheen,'saturation',0,1,.01).name('sheen saturation');
  scenery.add(e.sheen,'albedo',0,1,.01).name('sheen object color');

  const ground=gui.addFolder('Ground');
  ground.add(on,'vignette').name('vignette on');
  ground.add(g.offset,0,-20,20,.1).name('center offset across');
  ground.add(g.offset,1,-20,20,.1).name('center offset up/down');
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
  light.add(state.shadow,'shadowMapSize',[512,1024,2048,4096]).name('shadow map size');
  light.add(state.shadow,'radius',0,12,.1).name('shadow blur');
  light.add(state.shadow,'normalBias',0,.2,.001).name('shadow normal bias');
  light.add(state.shadow,'bias',-.005,.005,.00005).name('shadow bias');
  light.addColor(state,'background');

  const fogFolder=gui.addFolder('Fog (farther = foggier, top of screen)');
  fogFolder.add(state.fog,'enabled').name('fog on');
  fogFolder.addColor(state.fog,'color').name('fog color');
  fogFolder.add(state.fog,'near',0,200,.5).name('starts at distance');
  fogFolder.add(state.fog,'far',0,250,.5).name('full fog at distance');

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
