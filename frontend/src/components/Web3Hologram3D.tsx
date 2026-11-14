'use client';

import { useEffect, useRef, useState, FC } from 'react';

interface Web3Hologram3DProps {
  size?: number;
  interactive?: boolean;
}

export const Web3Hologram3D: FC<Web3Hologram3DProps> = ({ size = 380, interactive = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angleX = 0;
    let angleY = 0;
    let angleZ = 0;

    // Generate 3D Icosahedron / Geodesic Sphere Vertices
    const numPoints = 36;
    const points: Array<{ x: number; y: number; z: number }> = [];
    const radius = size * 0.35;

    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(-1 + (2 * i) / numPoints);
      const theta = Math.sqrt(numPoints * Math.PI) * phi;
      points.push({
        x: radius * Math.cos(theta) * Math.sin(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(phi),
      });
    }

    // Secondary inner core points
    const corePoints: Array<{ x: number; y: number; z: number }> = [];
    const coreRadius = radius * 0.45;
    for (let i = 0; i < 18; i++) {
      const phi = Math.acos(-1 + (2 * i) / 18);
      const theta = Math.sqrt(18 * Math.PI) * phi;
      corePoints.push({
        x: coreRadius * Math.cos(theta) * Math.sin(phi),
        y: coreRadius * Math.sin(theta) * Math.sin(phi),
        z: coreRadius * Math.cos(phi),
      });
    }

    const render = () => {
      // Rotation speeds
      angleX += 0.006 + mousePos.y * 0.00004;
      angleY += 0.009 + mousePos.x * 0.00004;
      angleZ += 0.004;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Draw outer ambient glow radial gradient
      const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius * 1.6);
      glow.addColorStop(0, 'rgba(0, 245, 155, 0.16)');
      glow.addColorStop(0.5, 'rgba(0, 245, 155, 0.04)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3D Rotation Matrix projection
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosZ = Math.cos(angleZ);
      const sinZ = Math.sin(angleZ);

      const project = (p: { x: number; y: number; z: number }) => {
        // Rotate Y
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.z * cosY + p.x * sinY;
        // Rotate X
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + p.y * sinX;
        // Rotate Z
        let x3 = x1 * cosZ - y2 * sinZ;
        let y3 = y2 * cosZ + x1 * sinZ;

        // Perspective division
        const fov = 420;
        const scale = fov / (fov + z2);
        return {
          x: cx + x3 * scale,
          y: cy + y3 * scale,
          z: z2,
          scale,
        };
      };

      const projectedOuter = points.map(project);
      const projectedInner = corePoints.map(project);

      // Sort by depth for correct visual rendering
      projectedOuter.sort((a, b) => b.z - a.z);

      // Draw connecting lines between neighboring outer vertices
      ctx.lineWidth = 1;
      for (let i = 0; i < projectedOuter.length; i++) {
        for (let j = i + 1; j < projectedOuter.length; j++) {
          const dx = projectedOuter[i].x - projectedOuter[j].x;
          const dy = projectedOuter[i].y - projectedOuter[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < radius * 0.85) {
            const alpha = Math.max(0.08, 1 - dist / (radius * 0.85)) * 0.45;
            ctx.strokeStyle = `rgba(0, 245, 155, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(projectedOuter[i].x, projectedOuter[i].y);
            ctx.lineTo(projectedOuter[j].x, projectedOuter[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw inner glowing core lines
      ctx.lineWidth = 1.5;
      for (let i = 0; i < projectedInner.length; i++) {
        for (let j = i + 1; j < projectedInner.length; j++) {
          const dx = projectedInner[i].x - projectedInner[j].x;
          const dy = projectedInner[i].y - projectedInner[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < coreRadius * 1.2) {
            ctx.strokeStyle = 'rgba(163, 230, 53, 0.45)';
            ctx.beginPath();
            ctx.moveTo(projectedInner[i].x, projectedInner[i].y);
            ctx.lineTo(projectedInner[j].x, projectedInner[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw Outer Nodes
      projectedOuter.forEach((p) => {
        const nodeSize = Math.max(1.5, 3.5 * p.scale);
        ctx.fillStyle = '#00F59B';
        ctx.shadowColor = '#00F59B';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, nodeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Inner Core Nodes
      projectedInner.forEach((p) => {
        const nodeSize = Math.max(2, 4.5 * p.scale);
        ctx.fillStyle = '#ECFDF5';
        ctx.shadowColor = '#A3E635';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, nodeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Orbital NEAR Ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleZ * 0.6);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.35, radius * 0.45, angleY * 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 245, 155, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Draw Center NEAR Emblem Glowing Glyph
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#00F59B';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00F59B';
      ctx.shadowBlur = 18;
      ctx.fillText('Ⓝ', cx, cy);
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [size, mousePos]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setMousePos({ x, y });
  };

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full pointer-events-none drop-shadow-[0_0_35px_rgba(0,245,155,0.25)]"
      />
    </div>
  );
};

export default Web3Hologram3D;
