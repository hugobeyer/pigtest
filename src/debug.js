import GUI from 'lil-gui';
import look from './look.json';
import { catcher } from './environment.js';
import { FOG_MODES, uniforms as fogBlend } from './fog.js';
import { sparkle } from './fx/sparkles.js';
import { showIntro } from './intro.js';
import { showWin } from './win.js';
import { destroyAll } from './grid.js';
import { tunePanel } from './tune.js';
import { ENVIRONMENT, FOG, GROUND, LIGHTS, RENDER, SHADING, SPARKLES, sheenAxis, sunPosition } from './tokens.js';
import { uniforms as vignette } from './ground.js';
import { sheenColor, uniforms as shade } from './shading.js';

export function debug({ scene, renderer, toneMappings, fog, ambient, key, center }) {
  const state = structuredClone(look);
  const curve = ({ terminator, softness, darkColor }) => ({ terminator, softness, darkColor });
  state.shading = { ...curve(SHADING), ...state.shading };
  state.environment = { ...curve(ENVIRONMENT), detail: ENVIRONMENT.detail, ...state.environment };
  for (const group of [state.shading, state.environment]) {
    delete group.wrap;
    delete group.power;
  }
  state.ground = {
    offset: [...GROUND.offset],
    scenery: GROUND.scenery,
    characters: GROUND.characters,
    detailTile: GROUND.detailTile,
    detailCenter: GROUND.detailCenter,
    detailEdge: GROUND.detailEdge,
    ...state.ground
  };
  state.fog = structuredClone(FOG);
  state.shadow = { shadowMapSize: LIGHTS.key.shadowMapSize, ...state.shadow };
  state.sparkles = SPARKLES;
  state.tone = { ...RENDER.tone };
  const on = { sss: true, rim: true, outline: true, sheen: true, vignette: true };
  state.environment.sheen = { ...ENVIRONMENT.sheen, ...state.environment.sheen };
  const { shading: s, environment: e, ground: g, hemisphere: h } = state;
  const { color, intensity, azimuth, elevation } = LIGHTS.key;
  state.key = { color, intensity, azimuth, elevation, ...state.key };
  const apply = () => {
    shade.uTerminator.value = s.terminator;
    shade.uSoftness.value = s.softness;
    shade.uDarkColor.value.set(s.darkColor);
    shade.uSceneryTerminator.value = e.terminator;
    shade.uScenerySoftness.value = e.softness;
    shade.uSceneryDarkColor.value.set(e.darkColor);
    shade.uSceneryDetail.value = e.detail;
    shade.uSssStrength.value = on.sss ? s.sss.strength : 0;
    shade.uSssWidth.value = s.sss.width;
    shade.uRimColor.value.set(s.rim.color);
    shade.uRimStrength.value = on.rim ? s.rim.strength : 0;
    shade.uRimPower.value = s.rim.power;
    shade.uOutlineColor.value.set(s.outline.color);
    shade.uOutlineFrom.value = s.outline.from;
    shade.uOutlineStrength.value = on.outline ? s.outline.strength : 0;
    shade.uSheenStrength.value = on.sheen ? e.sheen.strength : 0;
    shade.uSheenPower.value = e.sheen.power;
    sheenColor(e.sheen, shade.uSheenColor.value);
    shade.uSheenAlbedo.value = e.sheen.albedo;
    shade.uSheenAniso.value = e.sheen.aniso;
    shade.uSheenBend.value = e.sheen.bend;
    sheenAxis(e.sheen, shade.uSheenAxis.value);
    shade.uSheenMask.value = e.sheen.mask;
    shade.uSheenMaskPower.value = e.sheen.maskPower;
    catcher.color.set(e.shadowColor);
    catcher.opacity = e.shadowOpacity;
    vignette.uSceneryVignette.value = on.vignette ? g.scenery : 0;
    vignette.uCharacterVignette.value = on.vignette ? g.characters : 0;
    vignette.uOffset.value.fromArray(g.offset);
    vignette.uRadius.value.fromArray(g.radius);
    vignette.uInner.value = g.inner;
    vignette.uOuter.value = g.outer;
    vignette.uDetailTile.value = g.detailTile;
    vignette.uDetailCenter.value = g.detailCenter;
    vignette.uDetailEdge.value = g.detailEdge;
    vignette.uMiddle.value.set(g.middle);
    vignette.uEdge.value.set(on.vignette ? g.edge : g.middle);
    ambient.groundColor.set(h.ground);
    ambient.color.set(h.sky);
    ambient.intensity = h.intensity;
    key.color.set(state.key.color);
    key.intensity = state.key.intensity;
    sunPosition({ ...LIGHTS.key, ...state.key }, key.position);
    const { shadowMapSize, ...shadow } = state.shadow;
    Object.assign(key.shadow, shadow);
    if (key.shadow.mapSize.x !== shadowMapSize) {
      key.shadow.map?.dispose();
      key.shadow.map = null;
      key.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    }
    scene.background.set(state.background);
    renderer.toneMapping = toneMappings[state.tone.mapping];
    renderer.toneMappingExposure = state.tone.exposure;
    fogBlend.uFogMode.value = FOG_MODES.indexOf(state.fog.mode);
    fog.color.set(state.fog.color);
    fog.near = state.fog.near;
    fog.far = state.fog.far;
    fogBlend.uFogBottom.value = state.fog.height.bottom;
    fogBlend.uFogTop.value = state.fog.height.top;
    fogBlend.uFogDepthBias.value = state.fog.depthBias;
    fogBlend.uFogHeightBias.value = state.fog.height.bias;
    fogBlend.uFogHeightMix.value = state.fog.height.mix;
    scene.fog = state.fog.enabled ? fog : null;
  };

  const gui = new GUI({ title: 'Tuning  (G to toggle)', width: 420 });
  const lookPanel = gui.addFolder('Look');
  gui.domElement.style.setProperty('--name-width', '48%');
  const character = lookPanel.addFolder('Characters');
  character.add(s, 'terminator', -1, 1, 0.01).name('shadow starts (lower = more lit)');
  character.add(s, 'softness', 0.01, 1, 0.01).name('edge softness');
  character.addColor(s, 'darkColor').name('dark side color');
  character.add(on, 'sss').name('SSS on');
  character.add(s.sss, 'strength', 0, 1, 0.01).name('SSS strength');
  character.add(s.sss, 'width', 0.02, 1, 0.01).name('SSS width');
  character.add(on, 'rim').name('rim on');
  character.addColor(s.rim, 'color').name('rim color');
  character.add(s.rim, 'strength', 0, 1.5, 0.01).name('rim strength');
  character.add(s.rim, 'power', 0.5, 8, 0.05).name('rim power');
  character.add(on, 'outline').name('outline on');
  character.addColor(s.outline, 'color').name('outline color');
  character.add(s.outline, 'from', 0, 0.95, 0.01).name('outline from');
  character.add(s.outline, 'strength', 0, 1, 0.01).name('outline strength');

  const scenery = lookPanel.addFolder('Scenery');
  scenery.add(e, 'lit').name('lit (save, then reloads)');
  scenery.add(e, 'terminator', -1, 1, 0.01).name('shadow starts (lower = more lit)');
  scenery.add(e, 'softness', 0.01, 1, 0.01).name('edge softness');
  scenery.add(e, 'detail', 0, 6, 0.05).name('normal map detail');
  scenery.addColor(e, 'darkColor').name('dark side color');
  scenery.add(on, 'sheen').name('sheen on');
  scenery.add(e.sheen, 'strength', 0, 1, 0.01).name('sheen strength');
  scenery.add(e.sheen, 'power', 1, 16, 0.1).name('sheen power');
  scenery.add(e.sheen, 'hue', 0, 360, 1).name('sheen hue');
  scenery.add(e.sheen, 'saturation', 0, 1, 0.01).name('sheen saturation');
  scenery.add(e.sheen, 'albedo', 0, 1, 0.01).name('sheen object color');
  scenery.add(e.sheen, 'aniso', 0, 1, 0.01).name('sheen along axis (aniso)');
  scenery.add(e.sheen, 'bend', -1, 1, 0.01).name('sheen tangent bend');
  scenery.add(e.sheen, 'axisAzimuth', -180, 180, 1).name('sheen axis azimuth');
  scenery.add(e.sheen, 'axisElevation', -90, 90, 1).name('sheen axis angle');
  scenery.add(e.sheen, 'mask', 0, 1, 0.01).name('sheen axis fresnel mask');
  scenery.add(e.sheen, 'maskPower', 0.2, 8, 0.05).name('sheen mask power');

  const ground = lookPanel.addFolder('Ground');
  ground.add(on, 'vignette').name('vignette on');
  ground.add(g, 'scenery', 0, 1, 0.01).name('scenery follows vignette');
  ground.add(g, 'characters', 0, 1, 0.01).name('pigs/blocks follow vignette');
  ground.add(g.offset, 1, -20, 20, 0.1).name('center offset up/down');
  ground.add(g.radius, 0, 1, 40, 0.1).name('radius across');
  ground.add(g.radius, 1, 1, 40, 0.1).name('radius up/down');
  ground.add(g, 'inner', 0, 2, 0.01);
  ground.add(g, 'outer', 0, 3, 0.01);
  ground.add(g, 'detailTile', 0.5, 40, 0.1).name('texture tile size');
  ground.add(g, 'detailCenter', 0, 3, 0.01).name('texture at center');
  ground.add(g, 'detailEdge', 0, 3, 0.01).name('texture at edges');
  ground.addColor(g, 'middle').name('center color');
  ground.addColor(g, 'edge').name('edge color');
  ground.addColor(e, 'shadowColor').name('shadow color');
  ground.add(e, 'shadowOpacity', 0, 1, 0.01).name('shadow opacity');

  const light = lookPanel.addFolder('Light');
  light.addColor(state.key, 'color').name('sun color');
  light.add(state.key, 'intensity', 0, 10, 0.01).name('sun intensity');
  light.add(state.key, 'azimuth', -180, 180, 0.5).name('sun azimuth');
  light.add(state.key, 'elevation', 5, 90, 0.5).name('sun angle');
  light.addColor(h, 'sky').name('ambient sky');
  light.add(h, 'intensity', 0, 6, 0.01).name('ambient intensity');
  light.addColor(h, 'ground').name('ambient bounce');
  light.add(state.shadow, 'shadowMapSize', [512, 1024, 2048, 4096]).name('shadow map size');
  light.add(state.shadow, 'radius', 0, 12, 0.1).name('shadow blur');
  light.add(state.shadow, 'normalBias', 0, 0.2, 0.001).name('shadow normal bias');
  light.add(state.shadow, 'bias', -0.005, 0.005, 0.00005).name('shadow bias');
  light.add(state.tone, 'mapping', Object.keys(toneMappings)).name('tone mapping');
  light.add(state.tone, 'exposure', 0.2, 3, 0.01);
  light.addColor(state, 'background');

  const fogFolder = lookPanel.addFolder('Fog');
  fogFolder.add(state.fog, 'enabled').name('fog on');
  fogFolder.add(state.fog, 'mode', FOG_MODES).name('blend on scenery/ground');
  fogFolder.addColor(state.fog, 'color').name('fog color');
  fogFolder.add(state.fog, 'near', 0, 200, 0.5).name('starts at distance');
  fogFolder.add(state.fog, 'far', 0, 250, 0.5).name('full fog at distance');
  fogFolder.add(state.fog.height, 'mix', 0, 1, 0.01).name('height falloff amount');
  fogFolder.add(state.fog.height, 'bottom', -10, 20, 0.1).name('full fog below height');
  fogFolder.add(state.fog.height, 'top', -10, 40, 0.1).name('no fog above height');
  fogFolder.add(state.fog, 'depthBias', 0.01, 0.99, 0.01).name('depth curve bias');
  fogFolder.add(state.fog.height, 'bias', 0.01, 0.99, 0.01).name('height curve bias');

  const sparkles = lookPanel.addFolder('Sparkles');
  for (const [name, p] of Object.entries(state.sparkles)) {
    const preset = sparkles.addFolder(name).close();
    preset.add({ test: () => sparkle(center, name) }, 'test').name('▶ test at grid center');
    preset.add(p, 'frames').name('sprites 0-23, random pick (e.g. 6,7)');
    preset.add(p, 'count', 1, 120, 1).name('count min');
    preset.add(p, 'maxCount', 1, 120, 1).name('count max');
    preset.add(p, 'ring').name('even ring');
    preset.add(p, 'align').name('point along motion');
    preset.add(p, 'speed', 0, 30, 0.1).name('spread speed');
    preset.add(p, 'up', 0, 30, 0.1).name('up speed');
    preset.add(p, 'gravity', -40, 10, 0.1);
    preset.add(p, 'drag', 0, 10, 0.1);
    preset.add(p, 'life', 0.1, 4, 0.01).name('life (s)');
    preset.add(p, 'size', 0.05, 4, 0.01);
    preset.add(p, 'sizeJitter', 0, 0.95, 0.01).name('size randomness');
    preset.add(p, 'spin', 0, 20, 0.1);
    preset.add(p, 'tilt', 0, 1, 0.01).name('random tilt');
  }
  sparkles.close();


  lookPanel.add({ save: () => fetch('/__look', { method: 'POST', body: JSON.stringify(state) }) }, 'save').name('Save to look.json');
  lookPanel.add({ copy: () => navigator.clipboard.writeText(JSON.stringify(state, null, 2)) }, 'copy').name('Copy JSON');
  lookPanel.close();
  tunePanel(gui.addFolder('Feel'));
  const test = gui.addFolder('Test');
  test.add({ clear: destroyAll }, 'clear').name('▶ clear level');
  test.add({ win: () => showWin({ blocks: 676, time: 42, pigs: 12, shots: 240, bestCombo: 20 }) }, 'win').name('▶ preview win screen');
  test.add({ intro: () => showIntro() }, 'intro').name('▶ show intro');
  gui.onChange(apply);

  let shown = false;
  gui.hide();
  addEventListener('keydown', event => {
    if (event.key !== 'g' && event.key !== 'G') return;
    shown = !shown;
    gui.show(shown);
  });
}
