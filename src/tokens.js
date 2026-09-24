export const MOTION={speed:10.7,aimTime:.028,runnerLift:.38+.015};
export const SHOT={speed:22.0,minDuration:.045,radius:.24,segments:[16,12],targetZ:.84*.72,mouth:[0,.92,.67]};
export const PATH={sideOffset:1.38,verticalOffset:2.38,cornerRadius:1.10,laneGap:.42,endOffset:.15,arcSteps:12};
export const PIGS={ammo:20,visibleRows:3,railCapacity:5};
export const FRAME={maxDelta:.033};

export const ANIM={
  tapBump:{amount:.15,duration:.08},
  enterBump:{amount:.25,duration:.12},
  shotBump:{amount:.12,duration:.06},
  queueSlide:{duration:.16},
  queueGrow:{duration:.16},
  vanish:{rise:3.2,duration:.6}
};
export const LABEL={height:.8,lift:.35,capacityGap:.55,backOpacity:.45,canvas:[256,128],baseline:4,font:'900 96px "Arial Black", Arial, sans-serif',fill:'#fff',stroke:'#1d1f2e',strokeWidth:18};
export const RENDER={background:0x505471,maxPixelRatio:2};
export const LIGHTS={
  hemisphere:{sky:0xffffff,ground:0x303449,intensity:1.65},
  key:{color:0xffffff,intensity:2.65,position:[10,-14,18],target:[0,1.5,0],shadowMapSize:2048,shadowCamera:{left:-18,right:18,top:22,bottom:-22,near:.5,far:70},bias:-.00035,normalBias:.025,radius:2.0}
};
