const clamp = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
export const MOTIONS = [
  "walk",
  "run",
  "dance",
  "build",
  "destroy",
  "blow",
  "wind",
  "shake",
  "climbEscape",
  "hug",
];
export function applyActorMotion(pivot, a, t) {
  const m = a.motion;
  if (!m) return;
  const start = m.start ?? 2,
    end = m.end ?? 12,
    q = smooth((t - start) / (end - start)),
    active = t >= start && t <= end;
  const flip = a.flip ? -1 : 1;
  if (["walk", "run", "hug"].includes(m.type)) {
    pivot.position.x = a.x + (m.dx || 0) * q;
    pivot.position.y =
      (a.y || 0.025) +
      (m.dy || 0) * q +
      (active
        ? Math.abs(Math.sin((t - start) * (m.type === "run" ? 13 : 8))) * 0.045
        : 0);
    pivot.rotation.z = active ? Math.sin(t * 8) * 0.035 : 0;
  }
  if (m.type === "dance") {
    const energy = active ? 1 : 0;
    pivot.position.y =
      (a.y || 0.025) + Math.abs(Math.sin(t * 6)) * 0.11 * energy;
    pivot.rotation.z = Math.sin(t * 6) * 0.07 * energy;
  }
  if (m.type === "shake")
    pivot.rotation.z = active ? Math.sin(t * 28) * 0.022 : 0;
  if (m.type === "blow") {
    pivot.scale.x =
      flip * (1 + (active ? Math.sin((t - start) * 2.4) * 0.045 : 0));
    pivot.rotation.z = active ? -0.07 * flip : 0;
  }
  if (m.type === "wind") {
    pivot.visible = active;
    pivot.position.x = a.x - Math.sin((t - start) * 3) * 0.22;
    pivot.position.y = (a.y || 0.025) + Math.sin(t * 7) * 0.07;
    for (const mesh of pivot.children)
      if (mesh.material) {
        mesh.material.transparent = true;
        mesh.material.depthWrite = false;
        mesh.material.opacity = active ? 0.65 + 0.25 * Math.sin(t * 8) : 0;
      }
  }
  if (m.type === "climbEscape") {
    const up = smooth((t - 2) / 5),
      drop = smooth((t - 10) / 3),
      escape = smooth((t - 13) / 3.5);
    pivot.position.x = a.x - 1.6 * up + 3.6 * escape;
    pivot.position.y =
      (a.y || 0.025) + 3.1 * up * (1 - drop) + Math.sin(drop * Math.PI) * 0.45;
    pivot.rotation.z = t > 10 && t < 13 ? Math.sin(drop * Math.PI) * 0.35 : 0;
  }
  if (m.type === "build" || m.type === "destroy") {
    for (const [i, p] of (pivot.userData.pieces || []).entries()) {
      const b = p.userData.base;
      p.position.set(b.x, b.y, b.z);
      p.rotation.set(0, 0, 0);
      p.scale.set(1, 1, 1);
      p.visible = true;
      if (m.type === "build") {
        const show = smooth(
          (t - start - b.row * 1.6) / Math.max(1, (end - start) / 2),
        );
        p.scale.y = Math.max(0.001, show);
        p.position.y = b.row * b.h + (b.h * show) / 2;
        p.visible = show > 0.001;
      } else {
        const direction = i % 2 ? 1 : -1;
        p.position.x += direction * (0.9 + i * 0.15) * q;
        p.position.y = Math.max(
          0.035,
          b.y * (1 - q) + Math.sin(q * Math.PI) * (0.5 + i * 0.05),
        );
        p.position.z += q * (0.3 + (i % 3) * 0.25);
        p.rotation.x = (-Math.PI / 2) * q;
        p.rotation.z = direction * q * (0.7 + i * 0.11);
      }
    }
  }
}
