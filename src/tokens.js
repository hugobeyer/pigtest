import look from './look.json';

export const MOTION={speed:10.7,aimTime:.028,runnerLift:.38+.015};
export const SHOT={speed:22.0,minDuration:.045,targetZ:.84*.72,mouth:[0,.92,.67]};
export const PATH={sideOffset:1.38,verticalOffset:2.38,cornerRadius:1.10,laneGap:.42,endOffset:.15,arcSteps:12};
export const PIGS={ammo:20,visibleRows:3,railCapacity:5};
export const FRAME={maxDelta:.033};
export const WIN={
  delay:1.1,title:'level_clear',hint:'Tap to play again',
  bumpIn:.55,swing:2.4,swingAngle:3,rowStagger:.12,countDuration:.8,
  text:{label:20,value:26,hint:16},
  stats:[['blocks','Blocks'],['time','Time'],['pigs','Pigs used'],['shots','Shots'],['bestCombo','Best combo']]
};

export const ANIM={
  tapBump:{amount:.15,duration:.08},
  enterBump:{amount:.25,duration:.12},
  shotBump:{amount:.12,duration:.06},
  queueSlide:{duration:.16},
  queueGrow:{duration:.16},
  vanish:{inflate:.2,puff:.45,duration:1.1,distance:14,rise:5,toCamera:.3,reach:.85,wobble:1.1,wobbles:3,spin:16,tumble:.6,squash:.2,inflateJiggles:1.5,deflate:.5,shrinkAt:.8,popJiggle:2,popJiggleSpeed:40,popJiggleTime:.25}
};
export const LABEL={height:.8,lift:.35,capacityOffset:[0,-1.06,.28],backOpacity:.45,canvas:[256,128],tracking:-4};
export const SHADING={terminator:0,softness:.6,darkColor:'#9a9ab4',...look.shading};
export const ENVIRONMENT={terminator:-.1,softness:.7,darkColor:'#8aa08a',...look.environment};
export const GROUND={name:'Ground_Plane',offset:[0,0],scenery:.6,characters:0,...look.ground};
export const FOG={enabled:true,mode:'soft light',color:'#cfe3b4',near:60,far:110,...look.fog};
export const RENDER={background:look.background,maxPixelRatio:2};
export const LIGHTS={
  hemisphere:look.hemisphere,
  key:{color:0xffffff,intensity:2.65,position:[10,-14,18],target:[0,1.5,0],shadowMapSize:2048,shadowCamera:{left:-18,right:18,top:22,bottom:-22,near:.5,far:70},...look.shadow}
};
export const FX={
  particles:{max:160,gravity:-22,spin:9},
  trail:{length:1.8,headWidth:.4,tailWidth:0,opacity:.85},
  tapRing:{size:1.6,from:.6,to:1.4,duration:.35,lift:.05},
  death:{count:10,speed:4.5,up:8,life:.6,size:.6},
  confetti:{count:50,speed:10,up:16,life:1.4,size:.7},
  blockPop:{amount:.22,peak:.22,duration:.2,rise:.9},
  numberPunch:{amount:.4,duration:.12},
  counterPunch:{amount:.35,duration:.16},
  idleBob:{height:.14,speed:5},
  queueSway:{height:.06,speed:2.4,tilt:.07,vary:.35,rows:[1,.45,.25]},
  runnerBob:{height:.1,speed:9,tilt:.06,hold:.25,settle:.2},
  idleHint:{after:4,every:2.5,jitter:.4,mark:'!',size:1.3,lift:.55,duration:1.1,popIn:.2,fadeOut:.25,wobble:.25,wobbles:3,huh:{rise:.12,hold:.7,recover:1.2,jump:.3,stretch:.15}},
  sparkles:{max:600,sizeScale:1.4,countScale:1.6,lifeJitter:.3,sizeJitter:.3,speedJitter:.6,upJitter:.5,growIn:.12,shrinkPower:3,fadeOut:.25,frameScale:[1.6,1.6,1,1,1,1,1,1,1]},
  shake:{amplitude:.05,duration:.15},
  combo:{every:30,words:['nice','sweet','cool','wow','yes','combo','great','awesome'],width:.34,lift:1.2,duration:1.9,sweep:.55}
};
const sparkles={
  levelClear:{frames:'0',count:60,speed:10,up:14,gravity:-16,drag:1.2,life:1.6,size:1.1,spin:4,tilt:1,ring:false},
  tap:{frames:'2',count:8,speed:5,up:.5,gravity:0,drag:6,life:.45,size:.45,spin:3,tilt:1,ring:true},
  block:{frames:'7',count:2,speed:2.5,up:5,gravity:-18,drag:1,life:.45,size:.4,spin:0,tilt:.15,ring:false},
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
export const SPARKLES=Object.fromEntries(Object.entries(sparkles).map(([name,preset])=>[name,{align:false,...preset,...look.sparkles?.[name]}]));
