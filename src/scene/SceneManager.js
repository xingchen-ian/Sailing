import * as THREE from 'three';
import { Ocean } from './Ocean.js';
import { Sky } from './Sky.js';

/**
 * SceneManager — 统一管理场景、相机、渲染器、光照与海面/天空。
 */
export class SceneManager {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();

    // 相机
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 12, -30);
    this.camera.lookAt(0, 2, 0);

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // 天空与海面
    this.sky = new Sky(this.scene);
    this.ocean = new Ocean(this.scene, 2000);
    // 海面高光用同一太阳方向
    this.ocean.material.uniforms.uSunDir.value.copy(this.sky.getSunDir());

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  update(dt, cameraPosition) {
    this.ocean.update(dt, cameraPosition);
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
