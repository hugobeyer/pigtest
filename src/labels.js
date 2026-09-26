import * as THREE from 'three';
import digits from '../assets/fonts/digits.json';
import sheetUrl from '../assets/fonts/digits.webp';
import {LABEL} from './tokens.js';

const sheet=new Image();
const waiting=new Set();
sheet.onload=()=>{waiting.forEach(draw=>draw()); waiting.clear();};
sheet.src=sheetUrl;

export function createLabel(parent,height=LABEL.height,aspect=LABEL.canvas[0]/LABEL.canvas[1]){
  const canvas=document.createElement('canvas');
  const h=LABEL.canvas[1], w=h*aspect;
  canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));
  sprite.scale.set(height*aspect,height,1);
  sprite.renderOrder=10;
  parent.add(sprite);
  let current=null;
  const draw=()=>{
    if(!sheet.complete){waiting.add(draw); return;}
    const glyphs=[...current].map(c=>digits.glyphs[c]).filter(Boolean);
    const scale=h/digits.height, total=glyphs.reduce((sum,[,gw])=>sum+gw*scale+LABEL.tracking,-LABEL.tracking);
    ctx.clearRect(0,0,w,h);
    let x=(w-total)*.5;
    for(const [gx,gw] of glyphs){
      ctx.drawImage(sheet,gx,0,gw,digits.height,x,0,gw*scale,h);
      x+=gw*scale+LABEL.tracking;
    }
    texture.needsUpdate=true;
  };
  sprite.userData.set=text=>{
    if(text===current)return;
    current=text;
    draw();
  };
  return sprite;
}
