import * as THREE from 'three';

/**
 * TrailRenderer — 船尾航迹
 *
 * 用 Line 渲染船经过的路径。每 3 帧记录一个点，最多保留 200 个点。
 * 对应 Sailing.md Step 4：航线漂移（routeDrift）应作为视觉反馈显示。
 */
export class TrailRenderer {
  constructor(scene, maxPoints = 200) {
    this.scene = scene;
    this.maxPoints = maxPoints;
    this.points = []; // [{x, z}]
    this._frameCounter = 0;
    this._recordEvery = 3;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3));
    geo.setDrawRange(0, 0);

    const mat = new THREE.LineBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.4,
      linewidth: 1,
      depthWrite: false,
    });

    this.line = new THREE.Line(geo, mat);
    this.line.renderOrder = 1;
    scene.add(this.line);
  }

  /** 每帧调用，position 为 {x, z} */
  record(position) {
    this._frameCounter++;
    if (this._frameCounter % this._recordEvery !== 0) return;

    this.points.push({ x: position.x, z: position.z });
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }
    this._updateGeometry();
  }

  _updateGeometry() {
    const arr = this.line.geometry.attributes.position.array;
    for (let i = 0; i < this.points.length; i++) {
      const j = i * 3;
      arr[j] = this.points[i].x;
      arr[j + 1] = 0.1; // 略高于水面
      arr[j + 2] = this.points[i].z;
    }
    this.line.geometry.attributes.position.needsUpdate = true;
    this.line.geometry.setDrawRange(0, this.points.length);
  }

  /** 到达新目标时清空旧航迹 */
  clear() {
    this.points = [];
    this.line.geometry.setDrawRange(0, 0);
  }

  dispose() {
    this.scene.remove(this.line);
    this.line.geometry.dispose();
    this.line.material.dispose();
  }
}
