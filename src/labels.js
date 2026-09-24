import * as THREE from 'three';
import {LABEL} from './tokens.js';

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
  sprite.userData.set=text=>{
    if(text===current)return;
    current=text;
    ctx.clearRect(0,0,w,h);
    ctx.font=LABEL.font;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineJoin='round'; ctx.lineWidth=LABEL.strokeWidth; ctx.strokeStyle=LABEL.stroke;
    ctx.strokeText(text,w*.5,h*.5+LABEL.baseline);
    ctx.fillStyle=LABEL.fill;
    ctx.fillText(text,w*.5,h*.5+LABEL.baseline);
    texture.needsUpdate=true;
  };
  return sprite;
}
