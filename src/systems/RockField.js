import * as THREE from 'three';

/**
 * RockField — 礁石系统
 *
 * 对应 system graph 中 Level 3 的 "rock positions"（路径上 >5 个岩石）。
 * 提供 3D 网格可视化与 XZ 平面圆形碰撞检测。
 */
export class RockField {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'rock-field';
    this.scene.add(this.group);
    this.rocks = []; // { x, z, radius }
  }

  /** 设置礁石列表并重建网格 */
  setRocks(list = []) {
    // 清空旧网格
    while (this.group.children.length) {
      const c = this.group.children.pop();
      c.geometry?.dispose?.();
      c.material?.dispose?.();
    }
    this.rocks = list.map((r) => ({ x: r.x, z: r.z, radius: r.radius ?? 22 }));
    for (const r of this.rocks) this._buildOne(r);
  }

  _buildOne(r) {
    const g = new THREE.Group();
    // 基座（浸水部分，深色）
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(r.radius * 0.9, r.radius * 1.1, r.radius * 0.6, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.95 })
    );
    base.position.y = r.radius * 0.1;
    g.add(base);
    // 岩体（露出部分，不规则锥）
    const rock = new THREE.Mesh(
      new THREE.ConeGeometry(r.radius * 0.75, r.radius * 1.2, 7),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 1.0, flatShading: true })
    );
    rock.position.y = r.radius * 0.7;
    rock.rotation.y = Math.random() * Math.PI;
    g.add(rock);
    // 危险环（红色，提示避让）
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r.radius * 1.15, 1.2, 6, 28),
      new THREE.MeshBasicMaterial({ color: 0xff5b54, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.4;
    g.add(ring);
    g.position.set(r.x, 0, r.z);
    this.group.add(g);
  }

  /**
   * 碰撞检测
   * @param {{x:number,z:number}} pos 船位置
   * @param {number} boatRadius 船碰撞半径（世界单位）
   * @returns {object|null} 撞到的岩石，或 null
   */
  checkCollision(pos, boatRadius = 8) {
    for (const r of this.rocks) {
      const dx = pos.x - r.x;
      const dz = pos.z - r.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < r.radius + boatRadius) return r;
    }
    return null;
  }

  get count() { return this.rocks.length; }
}
