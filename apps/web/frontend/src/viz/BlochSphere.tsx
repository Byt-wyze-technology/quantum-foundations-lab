/**
 * The Bloch sphere (§10).
 *
 * Canvas 2D with a hand-written orthographic projection: no 3D dependency, a
 * stable 60 fps, and complete control over the drawing order so the state
 * arrow reads correctly whether it points toward or away from the viewer.
 *
 * Two rules from §1 and §21 are enforced here rather than left to lesson copy:
 * the caption never describes the sphere as a physical object, and the
 * component only ever renders a *pure one-qubit* state. An entangled
 * subsystem has no arrow, and asking for one is a programming error, not
 * something to approximate.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  type BlochVector,
  type MeasurementAxis,
  type StateVector,
  anglesFromQubit,
  axisVector,
  blochVectorFromAngles,
  qubitFromAngles,
} from "../math";

export type SphericalAxis = MeasurementAxis;

export type BlochSphereProps = {
  state: StateVector;
  interactive?: boolean;
  showAxes?: boolean;
  showPhaseArc?: boolean;
  measurementAxis?: SphericalAxis;
  onStateChange?: (state: StateVector) => void;
  size?: number;
  /** Optional trail of earlier positions, used by the unitary lesson (§8.5). */
  trail?: BlochVector[];
  label?: string;
};

type Camera = {
  /** Rotation of the *view*, not of the state. */
  yaw: number;
  pitch: number;
};

const COLORS = {
  ink: "#102224",
  paper: "#f3f0e8",
  line: "#c9c6bc",
  grid: "#b9c4bf",
  mint: "#3ca782",
  coral: "#ef7c64",
  violet: "#8a7cc8",
  amber: "#e0a458",
  muted: "#798482",
};

const project = (vector: BlochVector, camera: Camera, radius: number) => {
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);

  // Rotate about the vertical axis, then tilt toward the viewer.
  const x1 = vector.x * cosYaw - vector.y * sinYaw;
  const y1 = vector.x * sinYaw + vector.y * cosYaw;
  const z1 = vector.z;

  const y2 = y1 * cosPitch - z1 * sinPitch;
  const z2 = y1 * sinPitch + z1 * cosPitch;

  return {
    screenX: x1 * radius,
    screenY: -z2 * radius,
    /** Positive means nearer the viewer; used only for draw ordering. */
    depth: y2,
  };
};

export function BlochSphere({
  state,
  interactive = false,
  showAxes = true,
  showPhaseArc = true,
  measurementAxis,
  onStateChange,
  size = 340,
  trail,
  label,
}: BlochSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [camera, setCamera] = useState<Camera>({ yaw: -0.62, pitch: 0.38 });
  const dragMode = useRef<"orbit" | "state" | null>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  const angles = anglesFromQubit(state);
  const vector = blochVectorFromAngles(angles.theta, angles.phi);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const ratio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size, size);

    const centre = size / 2;
    const radius = size * 0.36;
    context.save();
    context.translate(centre, centre);

    // Sphere body.
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(255,255,255,0.55)";
    context.fill();
    context.strokeStyle = COLORS.line;
    context.lineWidth = 1;
    context.stroke();

    const drawGreatCircle = (
      normal: "equator" | "meridianXZ" | "meridianYZ",
      colour: string,
      dashed: boolean,
    ) => {
      const steps = 96;
      const near: { x: number; y: number }[] = [];
      const far: { x: number; y: number }[] = [];
      for (let step = 0; step <= steps; step += 1) {
        const t = (step / steps) * Math.PI * 2;
        const point: BlochVector =
          normal === "equator"
            ? { x: Math.cos(t), y: Math.sin(t), z: 0 }
            : normal === "meridianXZ"
              ? { x: Math.cos(t), y: 0, z: Math.sin(t) }
              : { x: 0, y: Math.cos(t), z: Math.sin(t) };
        const projected = project(point, camera, radius);
        (projected.depth >= 0 ? near : far).push({
          x: projected.screenX,
          y: projected.screenY,
        });
      }
      context.setLineDash(dashed ? [3, 5] : []);
      for (const [points, alpha] of [
        [far, 0.32],
        [near, 1],
      ] as const) {
        if (points.length === 0) continue;
        context.beginPath();
        points.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.globalAlpha = alpha;
        context.strokeStyle = colour;
        context.stroke();
        context.globalAlpha = 1;
      }
      context.setLineDash([]);
    };

    drawGreatCircle("equator", COLORS.grid, true);
    drawGreatCircle("meridianXZ", COLORS.grid, true);
    drawGreatCircle("meridianYZ", COLORS.grid, true);

    const axisEnds: { vector: BlochVector; ket: string }[] = [
      { vector: { x: 1, y: 0, z: 0 }, ket: "|+⟩" },
      { vector: { x: -1, y: 0, z: 0 }, ket: "|−⟩" },
      { vector: { x: 0, y: 1, z: 0 }, ket: "|+i⟩" },
      { vector: { x: 0, y: -1, z: 0 }, ket: "|−i⟩" },
      { vector: { x: 0, y: 0, z: 1 }, ket: "|0⟩" },
      { vector: { x: 0, y: 0, z: -1 }, ket: "|1⟩" },
    ];

    // Axis lines first; their labels are drawn last so nothing crosses them.
    if (showAxes) {
      for (const end of axisEnds) {
        const projected = project(end.vector, camera, radius);
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(projected.screenX, projected.screenY);
        context.globalAlpha = projected.depth >= 0 ? 0.75 : 0.28;
        context.strokeStyle = COLORS.muted;
        context.lineWidth = 1;
        context.stroke();
        context.globalAlpha = 1;
      }
    }

    // Optional measurement axis, drawn as a double-headed amber line.
    if (measurementAxis) {
      const direction = axisVector(measurementAxis);
      const positive = project(direction, camera, radius * 1.06);
      const negative = project(
        { x: -direction.x, y: -direction.y, z: -direction.z },
        camera,
        radius * 1.06,
      );
      context.beginPath();
      context.moveTo(negative.screenX, negative.screenY);
      context.lineTo(positive.screenX, positive.screenY);
      context.setLineDash([6, 4]);
      context.strokeStyle = COLORS.amber;
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = COLORS.amber;
      context.font = "500 10px 'DM Mono', monospace";
      context.textAlign = "center";
      context.fillText("+1", positive.screenX, positive.screenY - 9);
      context.fillText("−1", negative.screenX, negative.screenY + 13);
    }

    // Trail of earlier positions.
    if (trail && trail.length > 1) {
      context.beginPath();
      trail.forEach((point, index) => {
        const projected = project(point, camera, radius);
        if (index === 0) context.moveTo(projected.screenX, projected.screenY);
        else context.lineTo(projected.screenX, projected.screenY);
      });
      context.strokeStyle = COLORS.violet;
      context.globalAlpha = 0.55;
      context.lineWidth = 2;
      context.stroke();
      context.globalAlpha = 1;
    }

    // Phase arc: the azimuthal angle φ, drawn on the equator.
    if (showPhaseArc && Math.sin(angles.theta) > 1e-6) {
      const steps = 48;
      context.beginPath();
      for (let step = 0; step <= steps; step += 1) {
        const t = (step / steps) * angles.phi;
        const projected = project(
          { x: Math.cos(t) * 0.34, y: Math.sin(t) * 0.34, z: 0 },
          camera,
          radius,
        );
        if (step === 0) context.moveTo(projected.screenX, projected.screenY);
        else context.lineTo(projected.screenX, projected.screenY);
      }
      context.strokeStyle = COLORS.violet;
      context.lineWidth = 2;
      context.stroke();

      // Dropped line from the arrow tip to the equatorial plane.
      const tip = project(vector, camera, radius);
      const foot = project({ x: vector.x, y: vector.y, z: 0 }, camera, radius);
      context.beginPath();
      context.moveTo(tip.screenX, tip.screenY);
      context.lineTo(foot.screenX, foot.screenY);
      context.setLineDash([2, 4]);
      context.strokeStyle = COLORS.violet;
      context.globalAlpha = 0.6;
      context.stroke();
      context.setLineDash([]);
      context.globalAlpha = 1;
    }

    // The state arrow.
    const tip = project(vector, camera, radius);
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(tip.screenX, tip.screenY);
    context.strokeStyle = COLORS.coral;
    context.lineWidth = 3;
    context.lineCap = "round";
    context.stroke();

    const headAngle = Math.atan2(tip.screenY, tip.screenX);
    const headLength = 11;
    context.beginPath();
    context.moveTo(tip.screenX, tip.screenY);
    context.lineTo(
      tip.screenX - headLength * Math.cos(headAngle - 0.4),
      tip.screenY - headLength * Math.sin(headAngle - 0.4),
    );
    context.lineTo(
      tip.screenX - headLength * Math.cos(headAngle + 0.4),
      tip.screenY - headLength * Math.sin(headAngle + 0.4),
    );
    context.closePath();
    context.fillStyle = COLORS.coral;
    context.fill();

    context.beginPath();
    context.arc(tip.screenX, tip.screenY, 4, 0, Math.PI * 2);
    context.fillStyle = COLORS.ink;
    context.fill();

    // Axis labels last, each behind a paper-coloured halo, so they stay
    // legible wherever an axis, the measurement line or the arrow crosses them.
    if (showAxes) {
      context.font = "500 11px 'DM Mono', monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineJoin = "round";
      for (const end of axisEnds) {
        const projected = project(end.vector, camera, radius);
        const labelX = projected.screenX * 1.2;
        const labelY = projected.screenY * 1.2;
        context.globalAlpha = projected.depth >= 0 ? 1 : 0.5;
        context.lineWidth = 4;
        context.strokeStyle = COLORS.paper;
        context.strokeText(end.ket, labelX, labelY);
        context.fillStyle = COLORS.muted;
        context.fillText(end.ket, labelX, labelY);
        context.globalAlpha = 1;
      }
    }

    context.restore();
  }, [angles.phi, angles.theta, camera, measurementAxis, showAxes, showPhaseArc, size, trail, vector]);

  useEffect(() => {
    draw();
  }, [draw]);

  /** Convert a pointer position into the state it points at, then report it. */
  const pointerToState = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !onStateChange) return;
      const bounds = canvas.getBoundingClientRect();
      const radius = bounds.width * 0.36;
      const dx = clientX - bounds.left - bounds.width / 2;
      const dy = clientY - bounds.top - bounds.height / 2;

      // Invert the projection on the sphere's front face.
      const nx = dx / radius;
      const nz = -dy / radius;
      const planar = Math.min(1, Math.hypot(nx, nz));
      const depth = Math.sqrt(Math.max(0, 1 - planar * planar));

      // Undo the camera tilt, then the yaw.
      const cosPitch = Math.cos(camera.pitch);
      const sinPitch = Math.sin(camera.pitch);
      const y1 = depth * cosPitch + nz * sinPitch;
      const z1 = -depth * sinPitch + nz * cosPitch;
      const cosYaw = Math.cos(camera.yaw);
      const sinYaw = Math.sin(camera.yaw);
      const x = nx * cosYaw + y1 * sinYaw;
      const y = -nx * sinYaw + y1 * cosYaw;
      const length = Math.hypot(x, y, z1) || 1;
      const theta = Math.acos(Math.min(1, Math.max(-1, z1 / length)));
      const phi = Math.atan2(y / length, x / length);
      onStateChange(qubitFromAngles(theta, phi < 0 ? phi + 2 * Math.PI : phi));
    },
    [camera.pitch, camera.yaw, onStateChange],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    (event.target as HTMLCanvasElement).setPointerCapture(event.pointerId);
    lastPointer.current = { x: event.clientX, y: event.clientY };
    // Shift-drag orbits the camera; a plain drag moves the state itself.
    dragMode.current = event.shiftKey || !onStateChange ? "orbit" : "state";
    if (dragMode.current === "state") pointerToState(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !dragMode.current) return;
    if (dragMode.current === "state") {
      pointerToState(event.clientX, event.clientY);
      return;
    }
    const previous = lastPointer.current;
    if (!previous) return;
    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    setCamera((current) => ({
      yaw: current.yaw + deltaX * 0.01,
      pitch: Math.max(-1.35, Math.min(1.35, current.pitch + deltaY * 0.01)),
    }));
  };

  const endDrag = () => {
    dragMode.current = null;
    lastPointer.current = null;
  };

  /** Keyboard control, required by §16. */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const step = event.shiftKey ? Math.PI / 36 : Math.PI / 12;
    let { theta, phi } = angles;
    switch (event.key) {
      case "ArrowUp":
        theta = Math.max(0, theta - step);
        break;
      case "ArrowDown":
        theta = Math.min(Math.PI, theta + step);
        break;
      case "ArrowLeft":
        phi -= step;
        break;
      case "ArrowRight":
        phi += step;
        break;
      case "Home":
        theta = 0;
        phi = 0;
        break;
      default:
        return;
    }
    event.preventDefault();
    onStateChange?.(qubitFromAngles(theta, (phi + 2 * Math.PI) % (2 * Math.PI)));
  };

  const degrees = (radians: number) => Math.round((radians * 180) / Math.PI);
  const description = `${label ? `${label}. ` : ""}Qubit state: theta ${degrees(
    angles.theta,
  )} degrees, phi ${degrees(angles.phi)} degrees. ${canonicalName(angles.theta, angles.phi)}`;

  return (
    <div className="bloch-wrap">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        role="img"
        aria-label={description}
        tabIndex={interactive ? 0 : -1}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

/** Name the six canonical states so the screen-reader summary of §16 can say them. */
export const canonicalName = (theta: number, phi: number): string => {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.05;
  if (near(theta, 0)) return "Equivalent state: |0⟩.";
  if (near(theta, Math.PI)) return "Equivalent state: |1⟩.";
  if (near(theta, Math.PI / 2)) {
    if (near(phi, 0)) return "Equivalent state: |+⟩.";
    if (near(phi, Math.PI)) return "Equivalent state: |−⟩.";
    if (near(phi, Math.PI / 2)) return "Equivalent state: |+i⟩.";
    if (near(phi, (3 * Math.PI) / 2)) return "Equivalent state: |−i⟩.";
  }
  return "";
};
