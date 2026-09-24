import * as THREE from 'three';
import {LABEL} from './tokens.js';

export function createLabel(parent,height=LABEL.height){
  const canvas=document.createElement('canvas');
  canvas.width=256; canvas.height=128;
  const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));
  sprite.scale.set(height*2,height,1);
  sprite.renderOrder=10;
  parent.add(sprite);
  let current=null;
  sprite.userData.set=text=>{
    if(text===current)return;
    current=text;
    ctx.clearRect(0,0,256,128);
    ctx.font=LABEL.font;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineJoin='round'; ctx.lineWidth=LABEL.strokeWidth; ctx.strokeStyle=LABEL.stroke;
    ctx.strokeText(text,128,68);
    ctx.fillStyle=LABEL.fill;
    ctx.fillText(text,128,68);
    texture.needsUpdate=true;
  };
  return sprite;
}
