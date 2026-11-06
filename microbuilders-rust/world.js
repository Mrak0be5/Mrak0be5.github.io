// Мир вокруг стройки: небо (модель Прихама из three/examples Sky + облака, звёзды, луна), солнце и луна,
// окружение для отражений из того же неба (PMREM), дымка цвета горизонта, рельеф с выровненной площадкой,
// карта покрытия земли (глина, щебень, колеи, трава) и горы на горизонте.
import * as THREE from 'three';
import { NOISE } from './glsl.js?v=9f85320';
import { rng } from './geo.js?v=9f85320';
import { ATMO, ATMO_GLSL, AP_GLSL, uniforms as atmoUniforms, apUniforms, createAtmosphere } from './atmosphere.js?v=9f85320';

// ---------- облака и их тень ----------
// Облака — слой на высоте 1,5–3,2 км (середина 2,3 км): небо рисует их с перспективой (render.js — объёмными), а каждый материал сцены (linkSky) получает
// тень облака на луче к солнцу. Общие значения — одни объекты uniform на все программы.
// Погода для шейдеров (life.js задаёт): сырость поверхностей, сила дождя, время (рябь в лужах).
export const WEATHER = { wet: { value: 0 }, rain: { value: 0 }, time: { value: 0 } };
export const CLOUD = {
  time: { value: 0 }, cover: { value: 0.27 }, sun: { value: new THREE.Vector3(0, 1, 0) }, shadow: { value: 1 },
  fogSun: { value: new THREE.Color(0, 0, 0) },
};
export const CLOUD_GLSL = /* glsl */ `
uniform float uCloudTime;
uniform float uCloudCover;
uniform vec3 uCloudSun;
uniform float uCloudShadow;
float cHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float cNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(cHash(i), cHash(i + vec2(1.0, 0.0)), u.x), mix(cHash(i + vec2(0.0, 1.0)), cHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec2 cloudUV(vec2 xz) { return xz * (1.0 / 1100.0) + vec2(uCloudTime * 0.0055, uCloudTime * 0.002); }
float cloudN(vec2 q, int oct) {
  float n = 0.0, a = 0.55;
  for (int i = 0; i < 6; i++) { if (i >= oct) break; n += a * (cNoise(q) * 2.0 - 1.0); q = q * 2.07 + vec2(13.1, 7.3); a *= 0.5; }
  return n;
}
float cloudCover(float n) { return smoothstep(0.62 - uCloudCover, 0.95 - uCloudCover * 0.8, n * 0.5 + 0.5); }
// доля прямого солнца в точке w: облако на луче к солнцу (мягкая тень — без мелких октав)
float cloudShadow(vec3 w) {
  if (uCloudShadow < 0.01 || uCloudSun.y < 0.03) return 1.0;
  vec2 xz = w.xz + uCloudSun.xz * ((2300.0 - w.y) / uCloudSun.y);
  // у горизонта луч к облаку уходит за километры, в дымку: тень слабее
  return 1.0 - 0.8 * cloudCover(cloudN(cloudUV(xz), 2)) * uCloudShadow * smoothstep(0.03, 0.3, uCloudSun.y);
}
`;

// Тень облаков и воздушная перспектива меняются на сотнях метров — их хватает считать в вершинах
// (дешевле, чем в каждом пикселе 4K, и не тратит текстурных блоков фрагментного шейдера).
const LINK_VERTEX = /* glsl */ `
{
  vec4 sw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
  sw = instanceMatrix * sw;
  #endif
  vSkyW = (modelMatrix * sw).xyz;
  vCloud = cloudShadow(vSkyW);
  atmAerial(cameraPosition, vSkyW, vApT, vApS);
}
`;
// Прямой свет направленных источников — с тенью облаков; у листвы и травы (MB_TRANSLUCENT) ещё и свет насквозь.
const LIGHTS_BEGIN = (function () {
  const src = THREE.ShaderChunk.lights_fragment_begin;
  const k = src.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )');
  const tail = src.slice(k);
  const j = tail.indexOf('RE_Direct( directLight, geometryPosition');
  return src.slice(0, k) + tail.slice(0, j) + `
		// дальний каскад (второй теневой свет): за краем ближней карты тень берётся из дальней
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX == 0 ) && ( NUM_DIR_LIGHT_SHADOWS > 1 )
		if ( receiveShadow ) {
			vec3 nsc = vDirectionalShadowCoord[ 0 ].xyz / vDirectionalShadowCoord[ 0 ].w;
			float farMix = smoothstep( 0.42, 0.49, max( abs( nsc.x - 0.5 ), abs( nsc.y - 0.5 ) ) );
			if ( farMix > 0.0 ) directLight.color *= mix( 1.0, getShadow( directionalShadowMap[ 1 ], directionalLightShadows[ 1 ].shadowMapSize, directionalLightShadows[ 1 ].shadowBias, directionalLightShadows[ 1 ].shadowRadius, vDirectionalShadowCoord[ 1 ] ), farMix );
		}
		#endif
		directLight.color *= mbCloud;
		#ifdef MB_TRANSLUCENT
		reflectedLight.directDiffuse += directLight.color * material.diffuseColor * mbTranslucent( directLight.direction, geometryViewDir, geometryNormal );
		#endif
		` + tail.slice(j);
})();
// Мягкие тени PCSS (вместо PCFSoft): поиск заслонителей вокруг точки, полутень — по расстоянию от
// заслонителя до точки × угловой размер солнца с ореолом (shadowRadius солнца = этот множитель, считает
// fitShadow): у основания тень резкая, у кроны далеко — размытая. Поворот диска выборок меняется каждый
// кадр — шум убирает временное сглаживание. Прожекторы (shadowRadius < 0) — обычное мягкое PCF.
const SHADOW_PARS = (function () {
  const src = THREE.ShaderChunk.shadowmap_pars_fragment;
  const a = src.indexOf('#elif defined( SHADOWMAP_TYPE_PCF_SOFT )');
  const b = src.indexOf('#elif defined( SHADOWMAP_TYPE_VSM )', a);
  if (a < 0 || b < 0) return src;
  const pcss = `#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texel = vec2( 1.0 ) / shadowMapSize;
			float rot = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) + fract( uCloudTime * 37.0 ) * 0.618 ) * 6.2831853;
			mat2 R = mat2( cos( rot ), sin( rot ), -sin( rot ), cos( rot ) );
			if ( shadowRadius < 0.0 ) {
				float sum = 0.0;
				for ( int i = 0; i < 12; i ++ ) sum += texture2DCompare( shadowMap, shadowCoord.xy + R * MB_DISK[ i ] * texel * -shadowRadius, shadowCoord.z );
				shadow = sum / 12.0;
			} else {
				float zb = 0.0, nb = 0.0;
				for ( int i = 0; i < 12; i ++ ) {
					float d = unpackRGBAToDepth( texture2D( shadowMap, shadowCoord.xy + R * MB_DISK[ i ] * texel * 22.0 ) );
					if ( d < shadowCoord.z ) { zb += d; nb += 1.0; }
				}
				if ( nb > 0.5 ) {
					zb /= nb;
					float pen = clamp( ( shadowCoord.z - zb ) * shadowRadius, texel.x * 0.75, texel.x * 36.0 );
					float sum = 0.0;
					for ( int i = 0; i < 16; i ++ ) sum += texture2DCompare( shadowMap, shadowCoord.xy + R * MB_DISK[ i ] * pen, shadowCoord.z );
					shadow = sum / 16.0;
				}
			}
		`;
  const disk = `
	const vec2 MB_DISK[16] = vec2[16]( vec2(-0.94201624, -0.39906216), vec2(0.94558609, -0.76890725), vec2(-0.09418410, -0.92938870), vec2(0.34495938, 0.29387760),
		vec2(-0.91588581, 0.45771432), vec2(-0.81544232, -0.87912464), vec2(-0.38277543, 0.27676845), vec2(0.97484398, 0.75648379),
		vec2(0.44323325, -0.97511554), vec2(0.53742981, -0.47373420), vec2(-0.26496911, -0.41893023), vec2(0.79197514, 0.19090188),
		vec2(-0.24188840, 0.99706507), vec2(-0.81409955, 0.91437590), vec2(0.19984126, 0.78641367), vec2(0.14383161, -0.14100790) );
	`;
  const k = src.indexOf('float getShadow(');
  return src.slice(0, k) + disk + src.slice(k, a) + pcss + src.slice(b);
})();

// Дымка — воздушная перспектива из таблиц атмосферы (atmosphere.js): вдали синеет, к солнцу светлее и теплее.
const FOG_FRAGMENT = /* glsl */ `
#ifdef USE_FOG
  gl_FragColor.rgb = gl_FragColor.rgb * vApT + vApS;
#endif
`;

// G-буфер для конвейера «Максимума» и «Ультра» (render.js): кроме цвета, материал пишет нормаль и шероховатость,
// долю отражений окружения, маску затенения, отражательную способность, номер материала (кожа), альбедо
// и рассеянный свет окружения отдельно — его заменяют затенение углов и отражённый свет (gi.js). Скорость пикселя пишет отдельный проход движущихся объектов. Прозрачные пишут
// нули с нулевой альфой — при обычном смешении буферы под ними не меняются. В одноцветной цели лишние
// выходы отбрасываются.
export const GBUFFER_HEAD = /* glsl */ `
layout(location = 1) out highp vec4 gNormal;
layout(location = 2) out highp vec4 gInfo;
layout(location = 3) out highp vec4 gVelocity;
layout(location = 4) out highp vec4 gAlbedo;
layout(location = 5) out highp vec4 gIndirect;
`;
const GBUFFER_OUT = /* glsl */ `
#ifdef OPAQUE
{
  float gLum = dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722));
  float gSpecF = clamp(dot(reflectedLight.indirectSpecular, vec3(0.2126, 0.7152, 0.0722)) / max(gLum, 1e-5), 0.0, 1.0);
  float gMask = 1.0;
  #ifdef MB_TRANSLUCENT
  gMask = 0.55;
  #endif
  #ifdef MB_NOAO
  gMask = 0.0;
  #endif
  float gId = 0.0;
  #ifdef MB_SKIN
  gId = 1.0;
  #endif
  #if defined( STANDARD )
  float gRough = material.roughness;
  float gF0 = dot(material.specularColor, vec3(0.2126, 0.7152, 0.0722));
  vec3 gAlb = material.diffuseColor;
  float gMetal = metalnessFactor;
  #else
  float gRough = 1.0;
  float gF0 = 0.04;
  vec3 gAlb = diffuseColor.rgb;
  float gMetal = 0.0;
  #endif
  gNormal = vec4(normal * 0.5 + 0.5, gRough);
  gInfo = vec4(gSpecF, gMask, gF0, gId / 255.0);
  gVelocity = vec4(0.0);
  vec3 gIndD = reflectedLight.indirectDiffuse;
  #ifdef USE_TRANSMISSION
  // у стекла рассеянный свет почти весь заменён прошедшим насквозь
  gIndD *= 1.0 - material.transmission;
  gAlb *= 1.0 - material.transmission;
  #endif
  gAlbedo = vec4(gAlb, gMetal);
  gIndirect = vec4(gIndD, 1.0);
}
#else
gNormal = vec4(0.0); gInfo = vec4(0.0); gVelocity = vec4(0.0); gAlbedo = vec4(0.0); gIndirect = vec4(0.0);
#endif
`;

// Подключить материал к небу: тень облаков, дымка к солнцу. Свой onBeforeCompile материала сохраняется.
// Мокрое после дождя: пористое темнеет, всё глаже; верх мокнет сильнее боков (небо и стекло — нет). Вода
// заполняет поры — рельеф нормали мельче (иначе каждая пора ловит блик неба, камень «в соли»).
// Затем сглаживание бликов: шероховатость растёт с разбросом нормали в пикселе (Капланян, Хилл 2016).
const WET_FRAGMENT = /* glsl */ `
#if defined( STANDARD ) && !defined( MB_DRY )
{
  float mbUp = clamp((vec4(normal, 0.0) * viewMatrix).y, 0.0, 1.0);
  float mbW = uWet * (0.35 + 0.65 * mbUp);
  #ifdef MB_CLOTH
  // ткань, кожа и трава темнеют, но не блестят как плёнка
  diffuseColor.rgb *= 1.0 - 0.3 * mbW;
  roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.82, mbW);
  #else
  diffuseColor.rgb *= 1.0 - 0.36 * mbW * (1.0 - metalnessFactor);
  roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.3, mbW);
  normal = normalize(mix(normal, nonPerturbedNormal, 0.5 * mbW));
  #endif
}
#endif
#if defined( STANDARD )
{
  vec3 mbDx = dFdx(normal), mbDy = dFdy(normal);
  float mbVar = 0.25 * (dot(mbDx, mbDx) + dot(mbDy, mbDy));
  roughnessFactor = sqrt(min(roughnessFactor * roughnessFactor + min(2.0 * mbVar, 0.18), 1.0));
}
#endif
`;

// Подключённые материалы — по самому объекту (клон материала копирует userData, но не onBeforeCompile).
const LINKED = new WeakSet();
export function linkSky(material) {
  if (!material || LINKED.has(material)) return false;
  if (!(material.isMeshStandardMaterial || material.isMeshLambertMaterial || material.isMeshPhongMaterial)) return false;
  LINKED.add(material);
  const proto = THREE.Material.prototype;
  const prev = material.onBeforeCompile !== proto.onBeforeCompile ? material.onBeforeCompile : null;
  const prevKey = material.customProgramCacheKey !== proto.customProgramCacheKey ? material.customProgramCacheKey : null;
  const baseKey = prevKey ? prevKey.call(material) : prev ? prev.toString() : '';
  material.onBeforeCompile = function (shader, renderer) {
    if (prev) prev.call(this, shader, renderer);
    Object.assign(shader.uniforms, { uCloudTime: CLOUD.time, uCloudCover: CLOUD.cover, uCloudSun: CLOUD.sun, uCloudShadow: CLOUD.shadow, uWet: WEATHER.wet, uRainK: WEATHER.rain, uWTime: WEATHER.time }, apUniforms());
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSkyW;\nvarying float vCloud;\nvarying vec3 vApT;\nvarying vec3 vApS;\n' + CLOUD_GLSL + AP_GLSL)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + LINK_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSkyW;\nvarying float vCloud;\nvarying vec3 vApT;\nvarying vec3 vApS;\nuniform vec3 uCloudSun;\nuniform float uWet, uRainK, uWTime;\n' + GBUFFER_HEAD)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + WET_FRAGMENT)
      .replace('#include <shadowmap_pars_fragment>', 'uniform float uCloudTime;\n' + SHADOW_PARS)
      .replace('#include <lights_fragment_begin>', 'float mbCloud = vCloud;\n#ifdef MB_POM\nmbCloud *= mbPom;\n#endif\n' + LIGHTS_BEGIN)
      .replace('#include <fog_fragment>', FOG_FRAGMENT)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + GBUFFER_OUT);
  };
  material.customProgramCacheKey = function () { return baseKey + '|sky10'; };
  material.needsUpdate = true;
  return true;
}
// Все материалы объекта (и потомков).
export function linkSkyTree(root) {
  let n = 0;
  root.traverse(function (o) {
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { if (linkSky(m)) n++; });
  });
  return n;
}

// ---------- небо ----------

const SKY_VERTEX = /* glsl */ `
varying vec3 vWorldPosition;
void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w * 0.99999;
}
`;

// Небо из таблицы атмосферы, диск солнца с потемнением к краю, перистые на 7 км, кучевые слоем на 1,4 км
// (без них, когда облака объёмные — render.js), ночью звёзды, Млечный Путь и луна; ниже горизонта — земля.
const SKY_FRAGMENT = /* glsl */ `
varying vec3 vWorldPosition;
uniform float uTime, uNight, uGain, uFlatClouds;
uniform vec3 uMoonDir, uSunColor;
layout(location = 1) out highp vec4 gNormal;
layout(location = 2) out highp vec4 gInfo;
layout(location = 3) out highp vec4 gVelocity;
layout(location = 4) out highp vec4 gAlbedo;
layout(location = 5) out highp vec4 gIndirect;
float hgPhase(float cosTheta, float g) {
  float g2 = g * g;
  return 0.07957747154594767 * (1.0 - g2) / pow(max(1.0 - 2.0 * g * cosTheta + g2, 1e-4), 1.5);
}
void main() {
  vec3 direction = normalize(vWorldPosition - cameraPosition);
  vec3 col = atmSky(direction);
  float cosT = dot(direction, uSunDirA);
  // диск солнца (угловой радиус ~0,27°), к краю темнее
  float disk = smoothstep(0.999965, 0.999985, cosT);
  if (disk > 0.0) {
    float x = clamp((1.0 - cosT) / (1.0 - 0.999965), 0.0, 1.0);
    col += uSunIllum * atmTransmit(uCamR, uSunDirA.y) * 2600.0 * disk * (1.0 - 0.55 * x);
  }
  // перистые: тонкие вытянутые волокна на 7 км
  if (direction.y > 0.0 && uCloudCover > 0.0) {
    float tc = (7000.0 - cameraPosition.y) / max(direction.y, 0.01);
    vec2 q = (cameraPosition.xz + direction.xz * tc) * (1.0 / 5200.0) + vec2(uCloudTime * 0.0012, 0.0);
    q = vec2(q.x * 0.35 + q.y * 0.94, q.y * 0.35 - q.x * 0.94);
    float ci = cloudN(vec2(q.x * 3.5, q.y * 0.6), 5);
    float cir = smoothstep(0.12, 0.62, ci * 0.5 + 0.5) * 0.3 * smoothstep(0.03, 0.3, direction.y) * (1.0 - smoothstep(40000.0, 90000.0, tc));
    float lumC = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, vec3(lumC) * 1.25 + uSunColor * uSunIllum * 0.012 * (0.4 + hgPhase(cosT, 0.6) * 3.0) * (1.0 - uNight), cir * (1.0 - uNight * 0.8));
  }
  // кучевые слоем (окружение для отражений и качества без объёмных облаков)
  if (uFlatClouds > 0.5 && direction.y > 0.0 && uCloudCover > 0.0) {
    float t = (2300.0 - cameraPosition.y) / max(direction.y, 0.01);
    vec2 cp = cloudUV(cameraPosition.xz + direction.xz * t);
    float n = cloudN(cp, 6);
    float cover = cloudCover(n);
    float dens = smoothstep(0.62 - uCloudCover, 1.15 - uCloudCover * 0.8, n * 0.5 + 0.5);
    float n2 = cloudN(cp + uSunDirA.xz * 0.12, 6);
    float lit = clamp(0.55 + (n - n2) * 2.2, 0.0, 1.0);
    vec3 horizon = atmSky(normalize(vec3(direction.x, 0.04, direction.z)));
    float lum = dot(horizon, vec3(0.2126, 0.7152, 0.0722));
    vec3 base = mix(horizon, vec3(lum), 0.55) * 1.05;
    float phase = hgPhase(cosT, 0.55) * 3.0;
    vec3 cloud = base * (0.55 + 0.45 * lit - 0.25 * dens) + uSunColor * uSunIllum * 0.06 * (0.3 + 0.85 * lit) * (0.4 + phase) * (1.0 - uNight);
    cloud = mix(cloud, vec3(0.012, 0.015, 0.024), uNight * 0.9);
    float fade = smoothstep(0.03, 0.3, direction.y) * (1.0 - smoothstep(16000.0, 42000.0, t));
    col = mix(col, cloud, cover * fade * 0.96);
  }
  // ночь: глубокая синь, звёзды, Млечный Путь и луна
  col += vec3(0.0012, 0.002, 0.0048) * uNight;
  if (uNight > 0.01 && direction.y > 0.0) {
    vec3 d = direction * 420.0;
    vec3 id = floor(d);
    float h = hash13(id);
    if (h > 0.9965) {
      vec3 c = id + 0.5 + (vec3(hash13(id + 1.7), hash13(id + 3.1), hash13(id + 5.3)) - 0.5) * 0.6;
      float s = 1.0 - smoothstep(0.0, 0.35, length(d - c));
      float tw = 0.75 + 0.25 * sin(uTime * 2.0 + h * 400.0);
      vec3 tint = mix(vec3(1.0, 0.82, 0.66), vec3(0.75, 0.85, 1.0), hash13(id + 9.1));
      col += tint * s * tw * (h - 0.9965) * 900.0 * uNight * smoothstep(0.0, 0.2, direction.y);
    }
    // Млечный Путь: полоса вдоль большого круга, клочья и тёмные прожилки пыли
    vec3 gal = normalize(vec3(0.42, 0.55, -0.72));
    float band = exp(-pow(dot(direction, gal), 2.0) / 0.018);
    if (band > 0.01) {
      vec2 gq = vec2(atan(direction.z, direction.x) * 6.0, dot(direction, gal) * 40.0);
      float cl = cloudN(gq, 5) * 0.5 + 0.5;
      float dust = smoothstep(0.45, 0.7, cloudN(gq * 1.7 + 4.0, 4) * 0.5 + 0.5);
      col += vec3(0.0016, 0.0017, 0.0021) * band * (0.4 + cl) * (1.0 - 0.7 * dust) * uNight * smoothstep(0.0, 0.25, direction.y);
    }
    float md = dot(direction, uMoonDir);
    float disc = smoothstep(0.99985, 0.99992, md);
    col += vec3(1.1, 1.08, 1.0) * disc * uNight;
    col += vec3(0.03, 0.035, 0.05) * pow(max(md, 0.0), 300.0) * uNight;
  }
  // ниже горизонта — освещённый луг (альбедо 0,14): в окружении снизу светит земля, а не небо
  {
    vec3 Esun = uSunIllum * max(uSunDirA.y, 0.0) * atmTransmit(uCamR, uSunDirA.y) * (1.0 - 0.45 * uCloudCover);
    vec3 Esky = texture2D(tSkyIrr, vec2(0.5)).rgb * uSunIllum;
    vec3 ground = (Esun + Esky) * (0.14 / 3.14159265) * vec3(0.86, 1.0, 0.66) + vec3(0.0006, 0.0008, 0.0012) * uNight;
    col = mix(col, ground, smoothstep(-0.005, -0.09, direction.y));
  }
  // диск солнца ярче предела HalfFloat: без ограничения в отражениях выходит бесконечность
  gl_FragColor = vec4(min(col * uGain, vec3(40.0)), 1.0);
  gNormal = vec4(0.5, 0.5, 1.0, 1.0);
  gInfo = vec4(0.0);
  gVelocity = vec4(0.0);
  gAlbedo = vec4(0.0);
  gIndirect = vec4(0.0);
}
`;

function skyUniforms() {
  return Object.assign({
    uTime: { value: 0 },
    uCloudTime: CLOUD.time, uCloudCover: CLOUD.cover, uCloudSun: CLOUD.sun, uCloudShadow: CLOUD.shadow,
    uNight: { value: 0 },
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uSunColor: { value: new THREE.Color(1, 1, 1) },
    uGain: { value: 1 },
  }, atmoUniforms());
}
function skyMaterial(uniforms, flatClouds) {
  return new THREE.ShaderMaterial({
    uniforms: Object.assign({}, uniforms, { uFlatClouds: { value: flatClouds ? 1 : 0 } }),
    vertexShader: SKY_VERTEX,
    fragmentShader: NOISE + CLOUD_GLSL + ATMO_GLSL + SKY_FRAGMENT,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}

// Солнце в «люксах» сцены — освещённость над атмосферой (ATMO.sunIllum); у земли её ослабляет пропускание
// атмосферы: днём прямой свет в 4–6 раз сильнее рассеянного от неба, как в жизни.

// ---------- рельеф ----------

function fbm2(fn, x, z, oct) {
  let s = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { s += a * fn(x * f + i * 17.3, z * f - i * 9.1); f *= 2.03; a *= 0.5; }
  return s;
}
function noise2Factory(seed) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, function (_, i) { return i; });
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  return function (x, z) {
    const X = Math.floor(x), Z = Math.floor(z);
    const fx = x - X, fz = z - Z;
    const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10), v = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
    function gd(i, j, dx, dz) { const g = grad[perm[(perm[(X + i) & 255] + Z + j) & 255] & 7]; return g[0] * dx + g[1] * dz; }
    const a = gd(0, 0, fx, fz), b = gd(1, 0, fx - 1, fz), c = gd(0, 1, fx, fz - 1), d = gd(1, 1, fx - 1, fz - 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 1.2;
  };
}

export function createTerrain(seed, flatRadius) {
  const n1 = noise2Factory(seed), n2 = noise2Factory(seed + 1), n3 = noise2Factory(seed + 2);
  function heightAt(x, z) {
    const r = Math.hypot(x, z);
    const hills = fbm2(n1, x / 220, z / 220, 5) * 26 + fbm2(n2, x / 70, z / 70, 4) * 4.5;
    const ridge = Math.pow(1 - Math.abs(n3(x / 400, z / 400)), 3) * 18;
    const w = THREE.MathUtils.smoothstep(r, flatRadius, flatRadius + 55);
    const bumps = fbm2(n2, x / 6, z / 6, 3) * 0.08;
    return (hills + ridge - 8) * w + bumps * (1 - w * 0.5);
  }
  return { heightAt, noise: n1, noise2: n2 };
}

// Карта покрытия земли вокруг стройки: R — глина, G — щебень, B — колеи и утоптанная земля, A — трава.
export function splatMap(terrain, layout, size = 512, span = 240) {
  const data = new Uint8Array(size * size * 4);
  const n = terrain.noise, n2 = terrain.noise2;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i / (size - 1) - 0.5) * span, z = (j / (size - 1) - 0.5) * span;
      const nn = fbm2(n, x / 9, z / 9, 4);
      const nf = fbm2(n2, x / 2.2, z / 2.2, 3);
      // площадка: овал вокруг здания с неровной кромкой
      const dx = (x - layout.site.x) / layout.site.rx, dz = (z - layout.site.z) / layout.site.rz;
      const site = 1 - THREE.MathUtils.smoothstep(Math.hypot(dx, dz) + nn * 0.18 + nf * 0.05, 0.85, 1.05);
      // двор со щебнем
      const yx = (x - layout.yard.x) / layout.yard.rx, yz = (z - layout.yard.z) / layout.yard.rz;
      const yard = 1 - THREE.MathUtils.smoothstep(Math.hypot(yx, yz) + nn * 0.2 + nf * 0.06, 0.7, 1.0);
      // дорога от края к двору
      let road = 0;
      layout.roads.forEach(function (rd) {
        const ax = rd[0][0], az = rd[0][1], bx = rd[1][0], bz = rd[1][1];
        const vx = bx - ax, vz = bz - az; const l2 = vx * vx + vz * vz;
        const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
        const d = Math.hypot(x - ax - vx * t, z - az - vz * t);
        road = Math.max(road, 1 - THREE.MathUtils.smoothstep(d + nn * 0.6, rd[2] * 0.7, rd[2]));
      });
      // колеи по дороге
      let rut = 0;
      layout.roads.forEach(function (rd) {
        const ax = rd[0][0], az = rd[0][1], bx = rd[1][0], bz = rd[1][1];
        const vx = bx - ax, vz = bz - az; const l = Math.hypot(vx, vz);
        const t = ((x - ax) * vx + (z - az) * vz) / (l * l);
        if (t < 0 || t > 1) return;
        const side = ((x - ax) * -vz + (z - az) * vx) / l;
        const tr = Math.min(Math.abs(side - 0.95), Math.abs(side + 0.95));
        rut = Math.max(rut, 1 - THREE.MathUtils.smoothstep(tr + nf * 0.08, 0.12, 0.32));
      });
      const dirt = Math.max(site * (0.75 + 0.25 * nf), road * 0.55);
      const gravel = Math.max(yard * (0.8 + 0.2 * nf), road * 0.75 * (0.6 + 0.4 * nn));
      const worn = Math.max(rut, site * 0.25);
      const grass = Math.max(0, Math.min(1, 1 - Math.max(dirt, gravel) * 1.3 + nn * 0.4));
      const k = (j * size + i) * 4;
      data[k] = Math.round(Math.min(1, dirt) * 255);
      data[k + 1] = Math.round(Math.min(1, gravel) * 255);
      data[k + 2] = Math.round(Math.min(1, worn) * 255);
      data[k + 3] = Math.round(grass * 255);
    }
  }
  // Вторая карта — луг: R сухость травы, G высота травы, B лесная подстилка под кронами (addCanopy),
  // A сырость (лужи в колеях и низинах площадки). По ней одинаково красятся земля и травинки.
  const meadow = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = (i / (size - 1) - 0.5) * span, z = (j / (size - 1) - 0.5) * span;
      const k = (j * size + i) * 4;
      const grass = data[k + 3] / 255, dirt = data[k] / 255, rut = data[k + 2] / 255;
      const dryBig = fbm2(n, x / 38 + 40, z / 38 - 12, 4), dryFine = fbm2(n2, x / 7 - 3, z / 7 + 9, 3);
      const dry = THREE.MathUtils.clamp(0.35 + dryBig * 1.1 + dryFine * 0.35, 0, 1);
      // у кромки площадки трава вытоптана и низкая, дальше — по пятнам: где по колено, где по щиколотку
      const edge = THREE.MathUtils.smoothstep(grass, 0.25, 0.95);
      const patch = THREE.MathUtils.clamp(0.7 + fbm2(n2, x / 13 + 7, z / 13 - 5, 3) * 0.9, 0.25, 1.0);
      const height = edge * patch;
      const low = fbm2(n2, x / 3.2 + 21, z / 3.2 + 4, 3);
      const wet = Math.max(rut * THREE.MathUtils.smoothstep(low, 0.12, 0.3), dirt * THREE.MathUtils.smoothstep(low, 0.2, 0.34) * 0.85);
      meadow[k] = Math.round(dry * 255);
      meadow[k + 1] = Math.round(height * 255);
      meadow[k + 2] = 0;
      meadow[k + 3] = Math.round(THREE.MathUtils.clamp(wet, 0, 1) * 255);
    }
  }
  function dataTexture(arr) {
    const tex = new THREE.DataTexture(arr, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }
  const tex = dataTexture(data), meadowTex = dataTexture(meadow);
  function read(arr, x, z, out) {
    const u = x / span + 0.5, v = z / span + 0.5;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    const k = (Math.round(v * (size - 1)) * size + Math.round(u * (size - 1))) * 4;
    out[0] = arr[k] / 255; out[1] = arr[k + 1] / 255; out[2] = arr[k + 2] / 255; out[3] = arr[k + 3] / 255;
    return out;
  }
  function sample(x, z) { return read(data, x, z, [0, 0, 0, 0]) || [0, 0, 0, 1]; }
  // вне карты — открытый луг средней сухости
  function sampleMeadow(x, z) { return read(meadow, x, z, [0, 0, 0, 0]) || [0.45, 1, 0, 0]; }
  // Подстилка под кронами: круг радиуса r вокруг каждого дерева, мягкий край.
  function addCanopy(trees) {
    trees.forEach(function (t) {
      const r = t[2];
      const i0 = Math.max(0, Math.floor(((t[0] - r) / span + 0.5) * (size - 1))), i1 = Math.min(size - 1, Math.ceil(((t[0] + r) / span + 0.5) * (size - 1)));
      const j0 = Math.max(0, Math.floor(((t[1] - r) / span + 0.5) * (size - 1))), j1 = Math.min(size - 1, Math.ceil(((t[1] + r) / span + 0.5) * (size - 1)));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = (i / (size - 1) - 0.5) * span, z = (j / (size - 1) - 0.5) * span;
        const d = Math.hypot(x - t[0], z - t[1]) / r;
        if (d >= 1) continue;
        const k = (j * size + i) * 4 + 2;
        meadow[k] = Math.max(meadow[k], Math.round((1 - THREE.MathUtils.smoothstep(d, 0.45, 1)) * 255));
      }
    });
    meadowTex.needsUpdate = true;
  }
  return { texture: tex, meadow: meadowTex, span, sample, sampleMeadow, addCanopy };
}

// ---------- тропы ----------
// Карта вытоптанности вокруг стройки (64 × 64 м, 256²): ноги рабочих и колёса тачек её накапливают; земля по ней
// темнее и глаже, трава ниже. Копится на процессоре, в текстуру уходит не чаще двух раз в секунду.
export function createWear(span = 64, size = 256) {
  const data = new Float32Array(size * size);
  const bytes = new Uint8Array(size * size);
  const texture = new THREE.DataTexture(bytes, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  const cell = span / size;
  let dirty = false, clock = 0;
  function add(x, z, amount, radius) {
    const ci = (x / span + 0.5) * size, cj = (z / span + 0.5) * size, rr = radius / cell;
    const i0 = Math.max(0, Math.floor(ci - rr)), i1 = Math.min(size - 1, Math.ceil(ci + rr));
    const j0 = Math.max(0, Math.floor(cj - rr)), j1 = Math.min(size - 1, Math.ceil(cj + rr));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(i + 0.5 - ci, j + 0.5 - cj) / rr;
      if (d >= 1) continue;
      const k = j * size + i;
      data[k] = Math.min(1, data[k] + amount * (1 - d * d));
    }
    dirty = true;
  }
  function update(dt) {
    clock += dt;
    if (!dirty || clock < 0.5) return;
    clock = 0; dirty = false;
    for (let k = 0; k < data.length; k++) bytes[k] = data[k] * 255;
    texture.needsUpdate = true;
  }
  function fade(k) { for (let i = 0; i < data.length; i++) data[i] *= k; dirty = true; }
  return { texture, span, add, update, fade };
}

const TERRAIN_FRAGMENT_HEAD = /* glsl */ `
varying vec3 vWPos;
uniform sampler2D tSplat; uniform sampler2D tMeadow; uniform float uSplatSpan;
uniform sampler2D tWear; uniform float uWearSpan;
uniform sampler2D tGrassA, tGrassN, tGrassO, tDirtA, tDirtN, tDirtO, tGravelA, tGravelN, tGravelO;
uniform float uDetail, uPomDepth, uHD, uHV, uHG;
float tHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float tNoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(tHash(i), tHash(i + vec2(1, 0)), u.x), mix(tHash(i + vec2(0, 1)), tHash(i + vec2(1, 1)), u.x), u.y); }
// Две выборки с поворотом и сдвигом, смешанные по крупному шуму: повтор плитки не читается.
vec4 tri(sampler2D t, vec2 uv, float k) {
  vec4 a = texture2D(t, uv);
  if (uDetail < 0.5) return a;
  vec2 uv2 = mat2(0.8, -0.6, 0.6, 0.8) * uv * 0.71 + 0.37;
  vec4 b = texture2D(t, uv2);
  return mix(a, b, k);
}
// высота щебня и глины в точке (0..1 от uPomDepth метров) — для параллакса и тени камешков
float pomH(vec2 p, float wd, float wv, float k) {
  float h = 0.0;
  if (wd > 0.04) h += tri(tDirtN, p / 4.0, k).a * uHD * wd;
  if (wv > 0.04) h += tri(tGravelN, p / 2.0, k).a * uHV * wv;
  return h / uPomDepth;
}
`;

const TERRAIN_MAP = /* glsl */ `
vec2 wxz = vWPos.xz;
vec4 sp = texture2D(tSplat, wxz / uSplatSpan + 0.5);
vec2 eu = wxz / uSplatSpan + 0.5;
float inside = step(0.0, eu.x) * step(eu.x, 1.0) * step(0.0, eu.y) * step(eu.y, 1.0);
sp = mix(vec4(0.0, 0.0, 0.0, 1.0), sp, inside);
vec4 md = mix(vec4(0.45, 1.0, 0.0, 0.0), texture2D(tMeadow, eu), inside);
float macro = tNoise(wxz * 0.035) * 0.6 + tNoise(wxz * 0.11) * 0.4;
float k = smoothstep(0.3, 0.7, tNoise(wxz * 0.07 + 3.0));
// Параллакс вблизи (до 14 м): щебень и комья глины выпуклые; от найденной точки — луч к солнцу по той же
// высоте: камешки отбрасывают маленькие тени (mbPom гасит прямой свет в lights_fragment_begin).
float mbPom = 1.0;
#ifdef MB_POM
{
  float camD = length(cameraPosition - vWPos);
  float pk = (1.0 - smoothstep(6.0, 14.0, camD)) * uDetail;
  float wd = sp.r, wv = sp.g;
  if (pk > 0.01 && wd + wv > 0.08) {
    vec3 V = normalize(cameraPosition - vWPos);
    vec2 dir = -V.xz / max(V.y, 0.3) * uPomDepth * pk;
    const int ST = 10;
    float lay = 1.0 / float(ST);
    float d = 0.0, dPrev = 0.0, hPrev = 1.0;
    float h = pomH(wxz, wd, wv, k);
    for (int i = 0; i < ST; i++) {
      if (1.0 - d <= h) break;
      dPrev = d; hPrev = h;
      d += lay;
      h = pomH(wxz + dir * d, wd, wv, k);
    }
    // уточнение между двумя последними шагами
    float a = (1.0 - dPrev) - hPrev, b = (1.0 - d) - h;
    float dHit = mix(dPrev, d, clamp(a / max(a - b, 1e-4), 0.0, 1.0));
    wxz += dir * dHit;
    vec3 L = uCloudSun;
    if (L.y > 0.04) {
      float h0 = 1.0 - dHit, occ = 0.0;
      vec2 ls = L.xz / L.y * uPomDepth;
      for (int j = 1; j <= 5; j++) {
        float t = float(j) * 0.16;
        float rayH = h0 + t;
        float hh = pomH(wxz + ls * t, wd, wv, k);
        occ = max(occ, (hh - rayH) * 6.0);
      }
      mbPom = mix(1.0, 1.0 - clamp(occ, 0.0, 0.85), pk);
    }
  }
}
#endif
vec4 gA = tri(tGrassA, wxz / 4.0, k), dA = tri(tDirtA, wxz / 4.0, k), vA = tri(tGravelA, wxz / 2.0, k);
vec4 gO = tri(tGrassO, wxz / 4.0, k), dO = tri(tDirtO, wxz / 4.0, k), vO = tri(tGravelO, wxz / 2.0, k);
// смешивание по маскам с учётом рельефа плитки (впадины щебня принимают глину раньше)
float wDirt = sp.r, wGravel = sp.g;
float hv = vO.r; float hd = dO.r;
wGravel = clamp(wGravel * 1.4 - (1.0 - hv) * 0.5 + 0.1, 0.0, 1.0) * step(0.02, sp.g);
float wGrass = clamp(1.0 - wDirt - wGravel, 0.0, 1.0);
float sum = wDirt + wGravel + wGrass + 1e-4;
wDirt /= sum; wGravel /= sum; wGrass /= sum;
vec3 alb = gA.rgb * wGrass + dA.rgb * wDirt + vA.rgb * wGravel;
// утоптано и колеи: темнее и глаже
alb *= 1.0 - sp.b * 0.28;
// крупные пятна; трава — сочная или сухая по карте луга (тот же оттенок у травинок над ней)
alb *= 0.86 + 0.28 * macro;
alb = mix(alb, alb * mix(vec3(0.84, 1.0, 0.74), vec3(1.42, 1.2, 0.62), md.r), wGrass);
// под кронами — хвойная подстилка
vec3 litter = mix(vec3(0.07, 0.048, 0.03), vec3(0.115, 0.078, 0.046), tNoise(wxz * 1.7) * 0.6 + tNoise(wxz * 7.0) * 0.4);
alb = mix(alb, litter, md.b * 0.88 * (1.0 - wDirt * 0.7));
// сырая глина темнее, в низинах колей и площадки — лужи (гладкие, в них отражается небо)
float damp = smoothstep(0.08, 0.6, md.a) * (1.0 - wGrass);
float puddle = smoothstep(0.66 - 0.2 * uWet, 0.82 - 0.16 * uWet, md.a) * clamp(wDirt + sp.b * 0.6, 0.0, 1.0) * (1.0 - wGrass);
damp = max(damp, uWet * 0.8 * (1.0 - wGrass * 0.6));
// тропы и колея: утоптанная земля темнее и глаже, на траве — вытертая до земли полоса
float wear = smoothstep(0.04, 0.75, texture2D(tWear, wxz / uWearSpan + 0.5).r);
alb = mix(alb, mix(dA.rgb * 0.82, alb, 1.0 - wGrass), wear * 0.85);
alb *= 1.0 - 0.2 * wear * (1.0 - wGrass);
alb *= mix(1.0, 0.6, damp);
alb = mix(alb, alb * 0.32, puddle);
diffuseColor.rgb = alb;
float tRough = gO.g * wGrass + dO.g * wDirt + vO.g * wGravel;
tRough = mix(tRough, tRough * 0.82, sp.b);
tRough = mix(tRough, 0.42, damp * 0.7);
tRough = mix(tRough, tRough * 0.8, wear);
tRough = mix(tRough, 0.03, puddle);
float tAo = gO.r * wGrass + dO.r * wDirt + vO.r * wGravel;
`;

const TERRAIN_NORMAL = /* glsl */ `
{
  vec3 nG = tri(tGrassN, wxz / 4.0, k).xyz * 2.0 - 1.0;
  vec3 nD = tri(tDirtN, wxz / 4.0, k).xyz * 2.0 - 1.0;
  vec3 nV = tri(tGravelN, wxz / 2.0, k).xyz * 2.0 - 1.0;
  vec3 tn = normalize(mix(nG * wGrass + nD * wDirt + nV * wGravel, vec3(0.0, 0.0, 1.0), max(puddle, wear * 0.4)));
  // рябь от капель в лужах: кольца в ячейках 0,35 м, у каждой ячейки свой такт
  if (uRainK > 0.01 && puddle > 0.05) {
    vec2 rp = vWPos.xz / 0.35;
    vec2 rd = vec2(0.0);
    for (int ry = 0; ry < 2; ry++) for (int rx = 0; rx < 2; rx++) {
      vec2 cell = floor(rp) + vec2(float(rx), float(ry)) - 0.5;
      float ph = tHash(cell);
      vec2 c = cell + 0.5 + (vec2(tHash(cell + 3.1), tHash(cell + 7.7)) - 0.5) * 0.6;
      float t = fract(uWTime * 0.9 + ph);
      vec2 dv = rp - c;
      float d = length(dv);
      float ring = sin((d - t * 1.1) * 28.0) * smoothstep(0.0, 0.08, t * 1.1 - d + 0.12) * (1.0 - t) * smoothstep(0.55, 0.2, d);
      rd += dv / max(d, 1e-3) * ring;
    }
    tn = normalize(tn + vec3(rd * 0.25 * uRainK * puddle, 0.0));
  }
  vec3 T = normalize((viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  T = normalize(T - normal * dot(normal, T));
  vec3 B = cross(T, normal);
  normal = normalize(mat3(T, B, normal) * tn);
}
`;

export function terrainMaterial(textures, splat, quality, wear) {
  const g = textures.get('grass'), d = textures.get('dirt'), v = textures.get('gravel');
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  m.onBeforeCompile = function (shader) {
    Object.assign(shader.uniforms, {
      tSplat: { value: splat.texture }, tMeadow: { value: splat.meadow }, uSplatSpan: { value: splat.span },
      tGrassA: { value: g.map }, tGrassN: { value: g.normalMap }, tGrassO: { value: g.ormMap },
      tDirtA: { value: d.map }, tDirtN: { value: d.normalMap }, tDirtO: { value: d.ormMap },
      tGravelA: { value: v.map }, tGravelN: { value: v.normalMap }, tGravelO: { value: v.ormMap },
      uDetail: { value: quality.terrainDetail },
      tWear: { value: wear.texture }, uWearSpan: { value: wear.span },
      uPomDepth: { value: 0.03 }, uHD: { value: 0.02 }, uHV: { value: 0.022 }, uHG: { value: 0.02 },
    });
    if (quality.terrainDetail) shader.defines = Object.assign(shader.defines || {}, { MB_POM: '' });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + TERRAIN_FRAGMENT_HEAD)
      .replace('#include <map_fragment>', TERRAIN_MAP)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
      .replace('#include <normal_fragment_maps>', TERRAIN_NORMAL)
      .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= tAo; reflectedLight.indirectSpecular *= tAo;');
  };
  m.customProgramCacheKey = function () { return 'terrain4' + (quality.terrainDetail ? 'p' : ''); };
  return m;
}

export function terrainMesh(terrain, material, size = 1400, seg = 280) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) p[i + 1] = terrain.heightAt(p[i], p[i + 2]);
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material);
  mesh.receiveShadow = true;
  // холмы отбрасывают тени на низком солнце (в дальнем каскаде)
  mesh.castShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// Горы: кольцо 0,6–3,6 км (внутренний край уходит под рельеф). Высота — гребневой шум с искривлением
// (острые хребты, кулуары), дальние хребты выше. Цвет и рельеф — в шейдере: лес на пологих нижних склонах
// пятнами крон, скалы на крутых со слоями, осыпи, альпийский луг выше леса, снег на пологих вершинах
// (на северных склонах ниже). Тени хребтов: для каждой вершины заранее посчитан угол горизонта по
// 8 направлениям — склон в тени соседнего хребта, когда солнце ниже этого угла.
const MOUNT_VERT_HEAD = /* glsl */ `
attribute vec4 aHor0, aHor1;
varying vec3 vMW;
varying vec3 vMN;
varying float vHor;
uniform vec3 uMSun;
`;
const MOUNT_VERT = /* glsl */ `
vMW = (modelMatrix * vec4(transformed, 1.0)).xyz;
vMN = normalize(mat3(modelMatrix) * objectNormal);
{
  float az = atan(uMSun.z, uMSun.x);
  float f = mod(az / 0.7853982 + 8.0, 8.0);
  int i0 = int(floor(f)); int i1 = (i0 + 1) - ((i0 + 1) / 8) * 8; float w = f - float(i0);
  float h[8]; h[0] = aHor0.x; h[1] = aHor0.y; h[2] = aHor0.z; h[3] = aHor0.w; h[4] = aHor1.x; h[5] = aHor1.y; h[6] = aHor1.z; h[7] = aHor1.w;
  float hz = mix(h[i0], h[i1], w);
  float st = uMSun.y / max(length(uMSun.xz), 1e-3);
  vHor = smoothstep(hz - 0.03, hz + 0.02, st);
}
`;
const MOUNT_FRAG_HEAD = /* glsl */ `
varying vec3 vMW;
varying vec3 vMN;
varying float vHor;
float mHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float mNoise(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mHash(i), mHash(i + vec2(1, 0)), u.x), mix(mHash(i + vec2(0, 1)), mHash(i + vec2(1, 1)), u.x), u.y); }
float mFbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * mNoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
`;
const MOUNT_MAP = /* glsl */ `
vec3 mN = normalize(vMN);
float slope = 1.0 - mN.y;
float mh = vMW.y;
float nz = mFbm(vMW.xz * 0.004) - 0.5;
float fine = mFbm(vMW.xz * 0.03) - 0.5;
float forest = (1.0 - smoothstep(0.3, 0.46, slope + nz * 0.12)) * (1.0 - smoothstep(380.0, 540.0, mh + nz * 140.0));
float rock = smoothstep(0.36, 0.52, slope + nz * 0.15 + fine * 0.08);
float snow = smoothstep(520.0, 640.0, mh + nz * 200.0 - mN.z * 80.0) * (1.0 - smoothstep(0.5, 0.72, slope + fine * 0.1));
// лес — мягкие пятна крон, выше — альпийский луг, на скалах — слои и осыпи
float crowns = mFbm(vMW.xz * 0.035);
vec3 cForest = mix(vec3(0.02, 0.032, 0.018), vec3(0.036, 0.055, 0.028), smoothstep(0.25, 0.75, crowns)) * (0.88 + 0.24 * nz);
vec3 cMeadow = mix(vec3(0.16, 0.17, 0.08), vec3(0.24, 0.22, 0.12), smoothstep(-0.3, 0.3, nz + fine));
float strata = 0.5 + 0.5 * sin(mh * 0.07 + nz * 9.0 + fine * 4.0);
vec3 cRock = mix(vec3(0.21, 0.2, 0.19), vec3(0.36, 0.34, 0.31), strata * 0.6 + fine + 0.2);
vec3 cScree = vec3(0.34, 0.33, 0.31) * (0.9 + 0.2 * fine);
vec3 col = mix(cMeadow, cForest, forest);
col = mix(col, mix(cScree, cRock, smoothstep(0.45, 0.62, slope)), rock);
col = mix(col, vec3(0.86, 0.89, 0.93), snow);
diffuseColor.rgb = col;
float mRough = mix(mix(0.95, 0.86, rock), 0.55, snow);
float mbPom = vHor;
`;

export function mountains(seed, terrain) {
  const n = noise2Factory(seed + 9), n2 = noise2Factory(seed + 19);
  const segA = 1200, segR = 120;
  const R0 = 640, R1 = 3800;
  const cols = segA + 1, rows = segR + 1;
  const H = new Float32Array(cols * rows), RR = new Float32Array(rows);
  function ridged(x, z) {
    // искривление области и гребневой шум: 1 − |шум|, вес октавы — по предыдущей (резкие гребни, мягкие долины)
    const wx = x + 900 * n2(x / 2600, z / 2600), wz = z + 900 * n2(x / 2600 + 5.2, z / 2600 - 3.1);
    let sum = 0, amp = 1, f = 1 / 2200, w = 1, norm = 0;
    for (let o = 0; o < 7; o++) {
      let v = 1 - Math.abs(n(wx * f + o * 13.1, wz * f - o * 7.7));
      v *= v; v *= w;
      w = Math.min(1, Math.max(0, v * 1.7));
      sum += v * amp; norm += amp;
      amp *= 0.5; f *= 2.05;
    }
    return sum / norm;
  }
  for (let j = 0; j < rows; j++) {
    const t = j / segR;
    const r = R0 + Math.pow(t, 1.25) * (R1 - R0);
    RR[j] = r;
    for (let i = 0; i < cols; i++) {
      const a = (i / segA) * Math.PI * 2;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const big = n(Math.cos(a) * 1.6 + 3.0, Math.sin(a) * 1.6 - 2.0) * 0.5 + 0.5;
      // ближние — лесистые холмы до ~120 м, дальние хребты (2,5–3,8 км) — до 700 м со снегом
      const maxH = 70 + 640 * Math.pow(THREE.MathUtils.smoothstep(t, 0.22, 0.85), 1.5) * (0.6 + 0.4 * big);
      let h = ridged(x, z) * maxH * 1.25 - 30;
      // за дальним краем — вниз за горизонт
      if (t > 0.92) h -= (t - 0.92) * 9000;
      if (r < 820) h = THREE.MathUtils.lerp(terrain.heightAt(x, z) - 3, h, THREE.MathUtils.smoothstep(r, 680, 820));
      H[j * cols + i] = h;
    }
  }
  // угол горизонта по 8 направлениям (тангенс): шаги по сетке кольца с билинейной выборкой высоты
  function heightAt(x, z) {
    const r = Math.hypot(x, z);
    if (r < R0 || r > R1) return -1e9;
    let a = Math.atan2(z, x); if (a < 0) a += Math.PI * 2;
    const fi = (a / (Math.PI * 2)) * segA;
    const tt = Math.pow((r - R0) / (R1 - R0), 1 / 1.25) * segR;
    const i0 = Math.floor(fi), j0 = Math.min(segR - 1, Math.floor(tt));
    const u = fi - i0, v = tt - j0;
    const i1 = Math.min(segA, i0 + 1);
    const h00 = H[j0 * cols + i0], h10 = H[j0 * cols + i1], h01 = H[(j0 + 1) * cols + i0], h11 = H[(j0 + 1) * cols + i1];
    return (h00 * (1 - u) + h10 * u) * (1 - v) + (h01 * (1 - u) + h11 * u) * v;
  }
  // горизонт — на редкой сетке (каждая 4-я вершина по кругу, 2-я по радиусу), между узлами — по соседям
  const CI = 4, CJ = 2, ccols = Math.floor(segA / CI) + 1, crows = Math.floor(segR / CJ) + 1;
  const coarse = new Float32Array(ccols * crows * 8);
  for (let cj = 0; cj < crows; cj++) for (let ci = 0; ci < ccols; ci++) {
    const i = Math.min(segA, ci * CI), j = Math.min(segR, cj * CJ);
    const a = (i / segA) * Math.PI * 2, r = RR[j];
    const x = Math.cos(a) * r, z = Math.sin(a) * r, h = H[j * cols + i];
    for (let d = 0; d < 8; d++) {
      const ang = d * Math.PI / 4, dx = Math.cos(ang), dz = Math.sin(ang);
      let best = -1, dist = 45;
      for (let st = 0; st < 18; st++) {
        const hh = heightAt(x + dx * dist, z + dz * dist);
        if (hh > -1e8) best = Math.max(best, (hh - h) / dist);
        dist *= 1.38;
      }
      coarse[(cj * ccols + ci) * 8 + d] = Math.max(-1, best);
    }
  }
  const hor0 = new Float32Array(cols * rows * 4), hor1 = new Float32Array(cols * rows * 4);
  const pos = new Float32Array(cols * rows * 3);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = (i / segA) * Math.PI * 2, r = RR[j];
      const k = j * cols + i;
      pos[k * 3] = Math.cos(a) * r; pos[k * 3 + 1] = H[k]; pos[k * 3 + 2] = Math.sin(a) * r;
      const fi = i / CI, fj = j / CJ;
      const i0 = Math.min(ccols - 1, Math.floor(fi)), j0 = Math.min(crows - 1, Math.floor(fj));
      const i1 = Math.min(ccols - 1, i0 + 1), j1 = Math.min(crows - 1, j0 + 1), u = fi - i0, v = fj - j0;
      for (let d = 0; d < 8; d++) {
        const c00 = coarse[(j0 * ccols + i0) * 8 + d], c10 = coarse[(j0 * ccols + i1) * 8 + d];
        const c01 = coarse[(j1 * ccols + i0) * 8 + d], c11 = coarse[(j1 * ccols + i1) * 8 + d];
        (d < 4 ? hor0 : hor1)[k * 4 + (d & 3)] = (c00 * (1 - u) + c10 * u) * (1 - v) + (c01 * (1 - u) + c11 * u) * v;
      }
    }
  }
  const idx = [];
  for (let j = 0; j < segR; j++) for (let i = 0; i < segA; i++) {
    const a = j * cols + i, b = a + cols;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aHor0', new THREE.BufferAttribute(hor0, 4));
  g.setAttribute('aHor1', new THREE.BufferAttribute(hor1, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  mat.defines = { MB_POM: '' };
  mat.onBeforeCompile = function (shader) {
    shader.uniforms.uMSun = CLOUD.sun;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + MOUNT_VERT_HEAD)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n' + MOUNT_VERT);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + MOUNT_FRAG_HEAD)
      .replace('#include <map_fragment>', MOUNT_MAP)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mRough;');
  };
  mat.customProgramCacheKey = function () { return 'mount2'; };
  const m = new THREE.Mesh(g, mat);
  m.name = 'mountains';
  m.userData.noAO = true;
  m.receiveShadow = false;
  return m;
}

// ---------- небо, свет, сутки ----------

export function createSky(renderer, scene, quality) {
  const atmo = createAtmosphere(renderer);
  const skyU = skyUniforms();
  // объёмные облака рисует render.js — у неба в кадре тогда нет плоского слоя; в окружении он есть всегда
  const material = skyMaterial(skyU, !(quality.taa && quality.clouds));
  const envMaterial = skyMaterial(skyU, true);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), material);
  sky.name = 'sky';
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  sky.userData.noAO = true;
  scene.add(sky);

  // Для окружения — та же сфера малого радиуса в отдельной сцене.
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), envMaterial);
  envScene.add(envSky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;

  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(quality.shadow, quality.shadow);
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 2.5;
  sun.shadow.blurSamples = 16;
  scene.add(sun);
  scene.add(sun.target);

  // Дальний каскад: свет без яркости, только карта тени 520 × 520 м вокруг площадки (лес и холмы отбрасывают
  // тени вдали). Перерисовывается, когда солнце сдвинулось или камера ушла далеко.
  let farSun = null;
  const farDir = new THREE.Vector3(9, 9, 9), farFocus = new THREE.Vector3(1e9, 0, 0);
  if (quality.farShadow) {
    farSun = new THREE.DirectionalLight(0xffffff, 0);
    farSun.castShadow = true;
    farSun.shadow.mapSize.set(quality.farShadow, quality.farShadow);
    farSun.shadow.bias = -0.0005;
    farSun.shadow.normalBias = 0.25;
    const fc = farSun.shadow.camera;
    fc.left = -260; fc.right = 260; fc.top = 260; fc.bottom = -260; fc.near = 1; fc.far = 1400;
    fc.updateProjectionMatrix();
    farSun.shadow.radius = ((fc.far - fc.near) * 0.009) / (fc.right - fc.left);
    farSun.shadow.autoUpdate = false;
    scene.add(farSun);
    scene.add(farSun.target);
  }

  const moon = new THREE.DirectionalLight(0x9db4ff, 0);
  scene.add(moon);
  scene.add(moon.target);

  scene.fog = new THREE.FogExp2(0xb8c4cc, 0.00045);

  const sunDir = new THREE.Vector3();
  const moonDir = new THREE.Vector3();
  const lastEnvDir = new THREE.Vector3(9, 9, 9);
  const rgb = [0, 0, 0];
  const tmpDir = new THREE.Vector3();
  const state = { hour: 9, night: 0, sunDir, sunColor: new THREE.Color(), envDirty: true, exposure: 1 };

  // Солнце: восход в 5:30 на востоке (+x), в 13:00 на высоте 52° на юге (+z), закат в 20:30 на западе.
  function sunPosition(hour, out) {
    const h = ((hour % 24) + 24) % 24;
    let elev, az;
    if (h >= 5.5 && h <= 20.5) {
      const day = (h - 5.5) / 15;
      elev = Math.sin(day * Math.PI) * THREE.MathUtils.degToRad(52);
      az = THREE.MathUtils.degToRad(100 - 200 * day);
    } else {
      const night = ((h - 20.5 + 24) % 24) / 9;
      elev = -Math.sin(night * Math.PI) * THREE.MathUtils.degToRad(25);
      az = THREE.MathUtils.degToRad(-100 - 160 * night);
    }
    out.set(Math.sin(az) * Math.cos(elev), Math.sin(elev), Math.cos(az) * Math.cos(elev));
    return out;
  }

  function update(hour, time, focus) {
    state.hour = hour;
    sunPosition(hour, sunDir);
    moonDir.copy(sunDir).multiplyScalar(-1);
    moonDir.y = Math.abs(moonDir.y) * 0.8 + 0.25;
    moonDir.normalize();
    const u = skyU;
    atmo.update(sunDir, 20, time);
    u.uTime.value = time;
    u.uMoonDir.value.copy(moonDir);
    const night = 1 - THREE.MathUtils.smoothstep(sunDir.y, -0.12, 0.04);
    state.night = night;
    u.uNight.value = night;

    atmo.sunTransmit(sunDir, rgb);
    const lift = THREE.MathUtils.smoothstep(sunDir.y, -0.02, 0.12);
    state.sunColor.setRGB(rgb[0], rgb[1], rgb[2], THREE.LinearSRGBColorSpace);
    u.uSunColor.value.copy(state.sunColor);
    sun.color.copy(state.sunColor);
    // Источники не прячутся (visible), а гаснут: иначе меняется их число и все шейдеры пересобираются
    // на рассвете и закате. Ночью карта теней солнца не перерисовывается.
    sun.intensity = ATMO.sunIllum.value * lift;
    sun.shadow.autoUpdate = lift > 0.001;
    moon.intensity = 0.35 * night;
    CLOUD.time.value = time;
    CLOUD.sun.value.copy(sunDir);

    const r = 60;
    sun.position.copy(focus).addScaledVector(sunDir, r);
    sun.target.position.copy(focus);
    moon.position.copy(focus).addScaledVector(moonDir, r);
    moon.target.position.copy(focus);
    if (farSun && lift > 0.001 && (farDir.distanceTo(sunDir) > 0.004 || farFocus.distanceTo(focus) > 20)) {
      farDir.copy(sunDir); farFocus.copy(focus);
      farSun.position.copy(focus).addScaledVector(sunDir, 600);
      farSun.target.position.copy(focus);
      farSun.shadow.needsUpdate = true;
    }

    // ночная дымка: слабый свет луны и звёзд в воздухе
    ATMO.nightSky.value.set(0.0008, 0.0012, 0.0022).multiplyScalar(night);
    state.exposure = THREE.MathUtils.lerp(0.42, 0.95, THREE.MathUtils.smoothstep(-sunDir.y, -0.25, 0.02)) * THREE.MathUtils.lerp(1, 1.9, night);
    if (lastEnvDir.distanceTo(sunDir) > 0.012 || state.envDirty) refreshEnv();
  }

  function refreshEnv() {
    lastEnvDir.copy(sunDir);
    state.envDirty = false;
    const prev = envRT;
    envRT = pmrem.fromScene(envScene, 0.0, 0.1, 200);
    scene.environment = envRT.texture;
    if (prev) prev.dispose();
  }

  function follow(camera) { sky.position.copy(camera.position); }

  // Квадрат карты теней — по площадке (центр и радиус в метрах).
  // множитель полутени PCSS: глубина карты → метры × tg(углового размера солнца с ореолом, ~0,5°) → доли карты
  const PENUMBRA = 0.009;
  function fitShadow(center, radius) {
    const c = sun.shadow.camera;
    c.left = -radius; c.right = radius; c.top = radius; c.bottom = -radius;
    c.near = 1; c.far = 160;
    c.updateProjectionMatrix();
    sun.shadow.radius = ((c.far - c.near) * PENUMBRA) / (c.right - c.left);
  }

  return { sky, sun, moon, farSun, material, update, follow, fitShadow, refreshEnv, state, pmrem, sunPosition, atmo, uniforms: skyU };
}
