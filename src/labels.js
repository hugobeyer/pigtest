import * as THREE from 'three';
import digits from '../assets/fonts/digits.json';
import sheetUrl from '../assets/fonts/digits.webp';
import {LABEL} from './tokens.js';

const sheet=new Image();
const waiting=new Set();
sheet.onload=()=>{waiting.forEach(draw=>draw()); waiting.clear();};
sheet.src=sheetUrl;

function layout(text,height){
  const scale=height/digits.height;
  const glyphs=[...text.toUpperCase()].map(c=>c===' ' ? [null,digits.space] : digits.glyphs[c]).filter(Boolean);
  return {glyphs,scale,width:glyphs.reduce((sum,[,gw])=>sum+gw*scale+LABEL.tracking,-LABEL.tracking)};
}

function paint(ctx,text,x,height){
  const {glyphs,scale}=layout(text,height);
  for(const [gx,gw] of glyphs){
    if(gx!==null)ctx.drawImage(sheet,gx,0,gw,digits.height,x,0,gw*scale,height);
    x+=gw*scale+LABEL.tracking;
  }
}

export function writeText(canvas,text,height){
  if(!sheet.complete){waiting.add(()=>writeText(canvas,text,height)); return;}
  const ratio=devicePixelRatio, width=layout(text,height).width;
  canvas.width=Math.ceil(width*ratio); canvas.height=Math.ceil(height*ratio);
  canvas.style.width=`${width}px`; canvas.style.height=`${height}px`;
  const ctx=canvas.getContext('2d');
  ctx.scale(ratio,ratio);
  paint(ctx,text,0,height);
}

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
    ctx.clearRect(0,0,w,h);
    paint(ctx,current,(w-layout(current,h).width)*.5,h);
    texture.needsUpdate=true;
  };
  sprite.userData.set=text=>{
    if(text===current)return;
    current=text;
    draw();
  };
  return sprite;
}
