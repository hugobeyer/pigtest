import look from './look.json';
import feel from './feel.json';

export const MOTION={speed:10.7,aimTime:.028,runnerLift:.395};
export const SHOT={speed:12,minDuration:.045,targetZ:.6048,mouth:[0,.92,.67]};
export const PATH={sideOffset:1.38,verticalOffset:2.38,cornerRadius:1.10,laneGap:.42,endOffset:.15,arcSteps:12};
export const PIGS={ammo:20,hitScale:1.6,rowGap:1.35,columns:4,visibleRows:3,railCapacity:5};
export const FRAME={maxDelta:.033};
export const WIN={
  delay:1.1,title:'Level clear!',heading:'Great job!',hint:'Tap to play again',next:'Tap for next level',done:'Tap for menu',ink:'#7a3f12',
  fail:{delay:.8,title:'Out of pigs!',heading:'So close!',hint:'Tap to retry',rows:[['left','Blocks left'],['time','Time'],['pigs','Pigs used']]},
  bumpIn:.55,swing:2.4,swingAngle:3,rowStagger:.12,countDuration:.8,
  text:{sign:.55,plank:.5,label:.62,value:.78},
  stats:[['blocks','Blocks'],['time','Time'],['pigs','Pigs used'],['shots','Shots'],['bestCombo','Best combo']]
};

export const INTRO={text:'Tap the pigs!',level:'Level',top:'24%',size:.5};
export const MENU={title:'Pig pop!',classic:'Classic',adventure:'Adventure',back:'Menu',size:.5};
export const ADVENTURE={
  chain:{delay:.12,pitch:.08,tone:4,words:['nice','great','awesome']},
  rainbow:{duration:3,gold:'#ffc233',pulse:6,cycle:3},
  wipe:{sweep:.03},
  levels:[
    {size:12,pattern:'checker',checker:2,queues:['DLD','LDL','DLD','LDL'],ammo:20},
    {size:12,pattern:'checker',checker:2,queues:['DLD','LDL','DLD','LDL'],ammo:20,chains:true},
    {size:16,pattern:'checker',checker:2,queues:['DLDL','LDLD','DLDL','LDLD'],ammo:20,chains:true,golden:4},
    {size:16,pattern:'stripes',checker:2,queues:['DLDL','LDLD','DLDL','LDLD'],ammo:20,chains:true,golden:3,wipe:true},
    {size:20,pattern:'checker',checker:2,queues:['DLDLD','LDLDL','DLDLD','LDLDL'],ammo:20,chains:true,golden:3,wipe:true}
  ]
};

export const ANIM={
  tapOut:{amount:.3,bump:.03,shrink:.08},
  enterBump:{amount:.25,duration:.12},
  shotBump:{amount:.12,duration:.06},
  queueSlide:{duration:.16},
  queueGrow:{duration:.16},
  refuse:{duration:.4,angle:.35,shakes:3},
  vanish:{inflate:.2,puff:.45,duration:1.1,distance:14,rise:5,toCamera:.3,reach:.85,wobble:1.1,wobbles:3,spin:16,tumble:.6,squash:.2,inflateJiggles:1.5,deflate:.5,shrinkAt:.8,popJiggle:2,popJiggleSpeed:40,popJiggleTime:.25}
};
export const LABEL={height:.8,lift:.35,capacityOffset:[0,-1.06,.28],backOpacity:.45,canvas:[256,128],tracking:-4};
export const SHADING={terminator:0,softness:.6,darkColor:'#9a9ab4',...look.shading};
export const ENVIRONMENT={terminator:-.1,softness:.7,darkColor:'#8aa08a',detail:2,...look.environment};
export const GROUND={name:'Ground_Plane',offset:[0,0],scenery:.6,characters:0,detailTile:6,detailCenter:0,detailEdge:1,...look.ground};
export const FOG={enabled:true,mode:'soft light',color:'#cfe3b4',near:60,far:110,...look.fog};
export const RENDER={background:look.background,maxPixelRatio:2,anisotropy:8,tone:{mapping:'none',exposure:1,...look.tone}};
export const LIGHTS={
  hemisphere:look.hemisphere,
  key:{color:0xffffff,intensity:2.65,position:[10,-14,18],target:[0,1.5,0],shadowMapSize:2048,shadowCamera:{left:-18,right:18,top:22,bottom:-22,near:.5,far:70},...look.shadow}
};
export const FX={
  particles:{max:160,gravity:-22,spin:9},
  trail:{length:1.8,segments:10,headWidth:.4,tailWidth:0,opacity:.85,fade:.12},
  tapRing:{size:1.6,from:.6,to:1.4,duration:.35,lift:.05},
  death:{count:10,speed:4.5,up:8,life:.6,size:.6},
  confetti:{count:50,speed:10,up:16,life:1.4,size:.7},
  blockPop:{amount:.22,time:.06},
  ghost:{max:160,scale:1.5,tall:3.5,tallMax:10,tallAt:20,rise:.2,life:.35,snap:6,glow:5,power:1.8,core:.35},
  tapGlow:{color:'#fff1c4',strength:3,power:1.5,duration:.12,grow:1.03},
  blockFlash:{color:'#b86bff',strength:1.4},
  ramp:{colors:['#440154','#3b528b','#21918c','#5ec962','#fde725'],step:.12},
  numberPunch:{amount:.4,duration:.12},
  counterPunch:{amount:.35,duration:.16},
  idleBob:{height:.14,speed:5},
  queueSway:{height:.06,speed:2.4,tilt:.07,vary:.35,rows:[1,.45,.25]},
  runnerBob:{height:.1,speed:9,tilt:.06,hold:.25,settle:.2,shooting:.6},
  recoil:{distance:.18,kick:.35,decay:14},
  idleHint:{after:4,every:2.5,jitter:.4,marks:'!?',size:1.9,lift:.75,duration:1.1,popIn:.2,fadeOut:.25,wobble:.25,wobbles:3,huh:{rise:.12,hold:.7,recover:1.2,jump:.3,stretch:.15}},
  sparkles:{columns:6,rows:4,max:600,sizeScale:1.4,countScale:1.6,lifeJitter:.3,sizeJitter:.3,speedJitter:.6,upJitter:.5,growIn:.12,shrinkPower:3,fadeOut:.25,frameScale:[1.6,1.6,1,1,1,1,1,1,1]},
  shake:{amplitude:.05,duration:.15},
  combo:{every:30,words:['nice','sweet','cool','wow','yes','combo','great','awesome'],width:.34,lift:1.2,duration:1.9,sweep:.55}
};
const sparkles={
  levelClear:{frames:'0',count:60,speed:10,up:14,gravity:-16,drag:1.2,life:1.6,size:1.1,spin:4,tilt:1,ring:false},
  tap:{frames:'2',count:8,speed:5,up:.5,gravity:0,drag:6,life:.45,size:.45,spin:3,tilt:1,ring:true},
  blockLight:{frames:'12,13,14,15,16,17',count:3,maxCount:6,speed:4,up:7,gravity:-25,drag:.5,life:.6,size:.4,sizeJitter:.6,spin:1.5,tilt:.1,ring:false},
  blockDark:{frames:'18,19,20,21,22,23',count:3,maxCount:6,speed:4,up:7,gravity:-25,drag:.5,life:.6,size:.4,sizeJitter:.6,spin:1.5,tilt:.1,ring:false},
  combo:{frames:'8',count:6,speed:11,up:1.5,gravity:0,drag:3,life:.7,size:1.2,spin:.5,tilt:.2,ring:true},
  pop:{frames:'6',count:8,speed:14,up:0,gravity:0,drag:9,life:.4,size:1.1,spin:0,tilt:.08,ring:true,align:true}
};
export const SFX={volume:.8,music:{volume:.35,fadeIn:1.5},sounds:{
  tap:{volume:.8,pitch:.06,gap:.05},
  shot:{volume:.35,pitch:.1,gap:.04},
  hit:{volume:.45,pitch:.12,gap:.04},
  pop:{volume:.9,pitch:.08,gap:.05},
  fly:{volume:.5,pitch:.1,gap:.1},
  huh:{volume:.8,pitch:.06,gap:.3},
  combo:{volume:.8,pitch:0,gap:.3},
  clear:{volume:1,pitch:0,gap:1},
  full:{volume:.6,pitch:.04,gap:.25}
}};
export const SPARKLES=Object.fromEntries(Object.entries(sparkles).map(([name,preset])=>{
  const merged={align:false,...preset,...look.sparkles?.[name]};
  merged.maxCount??=merged.count;
  merged.sizeJitter??=FX.sparkles.sizeJitter;
  return [name,merged];
}));

function merge(target,source={}){
  for(const [key,value] of Object.entries(source)){
    if(value && typeof value==='object' && !Array.isArray(value))merge(target[key]??={},value);
    else target[key]=value;
  }
}
for(const [name,group] of Object.entries({MOTION,SHOT,PIGS,ANIM,FX,ADVENTURE}))merge(group,feel[name]);
