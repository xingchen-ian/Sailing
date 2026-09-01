import * as THREE from 'three';

/**
 * Sky — 天空、太阳与全局光照
 * 使用渐变天空球 + 方向光（太阳）+ 环境光。
 * 太阳方向同时驱动 Ocean 的高光与风的可视化。
 */
export class Sky {
  constructor(scene) {
    this.scene = scene;
    // 太阳方向（单位向量），指向太阳所在位置
    this.sunDir = new THREE.Vector3(0.5, 0.65, 0.4).normalize();
    this.create();
  }

  create() {
    // 渐变天空盒
    const skyGeo = new THREE.SphereGeometry(800, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color('#2a6cb8') },
        uHorizon: { value: new THREE.Color('#a8c8e8') },
        uSunDir: { value: this.sunDir },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform vec3 uSunDir;
        varying vec3 vDir;
        void main() {
          float t = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(uHorizon, uTop, pow(t, 0.8));
          // 太阳辉光
          float sun = max(dot(normalize(vDir), uSunDir), 0.0);
          col += vec3(1.0, 0.92, 0.7) * pow(sun, 200.0) * 1.5;
          col += vec3(1.0, 0.85, 0.6) * pow(sun, 8.0) * 0.25;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.sky.name = 'sky';
    this.scene.add(this.sky);

    // 方向光 —— 太阳
    this.sun = new THREE.DirectionalLight(0xfff2d6, 1.2);
    this.sun.position.copy(this.sunDir).multiplyScalar(300);
    this.scene.add(this.sun);

    // 环境光 —— 天光补色
    this.ambient = new THREE.HemisphereLight(0xbfe3ff, 0x1a2a40, 0.55);
    this.scene.add(this.ambient);

    // 雾 —— 远处海天交融
    this.scene.fog = new THREE.Fog(0xa8c8e8, 200, 700);
  }

  /** 给 Ocean 传太阳方向 */
  getSunDir() {
    return this.sunDir;
  }
}
