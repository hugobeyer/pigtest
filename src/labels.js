import * as THREE from 'three';

export function createLabel(scene,height=.8){
  const canvas=document.createElement('canvas');
  canvas.width=256; canvas.height=128;
  const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false}));
  sprite.scale.set(height*2,height,1);
  sprite.renderOrder=10;
  scene.add(sprite);
  let current=null;
  sprite.userData.set=text=>{
    if(text===current)return;
    current=text;
    ctx.clearRect(0,0,256,128);
    ctx.font='900 96px "Arial Black", Arial, sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineJoin='round'; ctx.lineWidth=18; ctx.strokeStyle='#1d1f2e';
    ctx.strokeText(text,128,68);
    ctx.fillStyle='#fff';
    ctx.fillText(text,128,68);
    texture.needsUpdate=true;
  };
  return sprite;
}
