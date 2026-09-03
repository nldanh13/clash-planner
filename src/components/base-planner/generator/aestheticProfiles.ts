import type { AestheticPattern } from "./types";

export interface PatternDefinition {
  id: AestheticPattern;
  name: string;
  description: string;
  symmetryType: "axial-y" | "axial-x" | "rotational-4" | "rotational-2";
  wallOutlineGenerator: (wallCount: number, center: number) => Array<{ x: number; y: number }>;
}

export const AESTHETIC_PATTERNS: Record<AestheticPattern, PatternDefinition> = {
  "symmetric-axial": {
    id: "symmetric-axial",
    name: "Đối xứng trục (Axial Symmetry)",
    description: "Cân bằng đối xứng gương tuyệt đối qua trục giữa, tôn lên vẻ uy nghiêm của căn cứ.",
    symmetryType: "axial-y",
    wallOutlineGenerator: (wallCount: number, center: number) => {
      const coords: Array<{ x: number; y: number }> = [];
      const half = Math.floor(center);
      // Generate multiple concentric symmetrical rings
      const rings = [6, 11, 16, 20];
      for (const r of rings) {
        for (let dx = -r; dx <= r; dx++) {
          const dy1 = -r;
          const dy2 = r;
          coords.push({ x: half + dx, y: half + dy1 });
          coords.push({ x: half + dx, y: half + dy2 });
        }
        for (let dy = -r + 1; dy < r; dy++) {
          const dx1 = -r;
          const dx2 = r;
          coords.push({ x: half + dx1, y: half + dy });
          coords.push({ x: half + dx2, y: half + dy });
        }
      }
      return coords;
    },
  },
  diamond: {
    id: "diamond",
    name: "Kim cương (Diamond)",
    description: "Khối hình thoi đồng tâm xoay góc 45 độ tạo cảm giác góc cạnh và sắc bén.",
    symmetryType: "rotational-4",
    wallOutlineGenerator: (wallCount: number, center: number) => {
      const coords: Array<{ x: number; y: number }> = [];
      const half = Math.floor(center);
      const radii = [7, 12, 17, 21];
      for (const r of radii) {
        for (let i = 0; i <= r; i++) {
          const j = r - i;
          coords.push({ x: half + i, y: half + j });
          coords.push({ x: half - i, y: half + j });
          coords.push({ x: half + i, y: half - j });
          coords.push({ x: half - i, y: half - j });
        }
      }
      return coords;
    },
  },
  shield: {
    id: "shield",
    name: "Khiên chiến binh (Shield)",
    description: "Tạo hình chiếc khiên La Mã kiên cố che chở toàn bộ công trình làng.",
    symmetryType: "axial-y",
    wallOutlineGenerator: (wallCount: number, center: number) => {
      const coords: Array<{ x: number; y: number }> = [];
      const half = Math.floor(center);
      // Top flat edge with pointed corners, curved bottom to apex
      const topY = half - 16;
      for (let x = half - 15; x <= half + 15; x++) {
        coords.push({ x, y: topY });
      }
      for (let y = topY + 1; y <= half; y++) {
        coords.push({ x: half - 15, y });
        coords.push({ x: half + 15, y });
      }
      for (let step = 0; step <= 15; step++) {
        const y = half + step;
        const xSpan = 15 - step;
        coords.push({ x: half - xSpan, y });
        coords.push({ x: half + xSpan, y });
      }
      return coords;
    },
  },
  heart: {
    id: "heart",
    name: "Trái tim (Heart)",
    description: "Tạo hình trái tim nghệ thuật lãng mạn, các công trình được sắp đặt ấm cúng bên trong.",
    symmetryType: "axial-y",
    wallOutlineGenerator: (wallCount: number, center: number) => {
      const coords: Array<{ x: number; y: number }> = [];
      const half = Math.floor(center);
      // Parametric heart formula
      for (let t = 0; t < Math.PI * 2; t += 0.05) {
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const scaledX = Math.round(half + hx * 0.95);
        const scaledY = Math.round(half + hy * 0.95);
        coords.push({ x: scaledX, y: scaledY });
      }
      return coords;
    },
  },
  spiral: {
    id: "spiral",
    name: "Xoắn ốc (Spiral)",
    description: "Đường tường uốn lượn dạng xoắn ốc 4 cánh tạo hiệu ứng động xoay quanh Town Hall.",
    symmetryType: "rotational-4",
    wallOutlineGenerator: (wallCount: number, center: number) => {
      const coords: Array<{ x: number; y: number }> = [];
      const half = Math.floor(center);
      for (let arm = 0; arm < 4; arm++) {
        const angleOffset = (arm * Math.PI) / 2;
        for (let r = 5; r <= 20; r++) {
          const theta = angleOffset + (r / 20) * (Math.PI / 1.5);
          const x = Math.round(half + r * Math.cos(theta));
          const y = Math.round(half + r * Math.sin(theta));
          coords.push({ x, y });
        }
      }
      return coords;
    },
  },
  crest: {
    id: "crest",
    name: "Vương miện / Huy hiệu (Crest)",
    description: "Huy hiệu hoàng tộc với đỉnh nhọn và cánh mở rộng sang hai bên.",
    symmetryType: "axial-y",
    wallOutlineGenerator: (wallCount: number, center: number) => {
      const coords: Array<{ x: number; y: number }> = [];
      const half = Math.floor(center);
      const topY = half - 18;
      // 3 crown peaks
      coords.push({ x: half, y: topY });
      coords.push({ x: half - 12, y: topY + 4 });
      coords.push({ x: half + 12, y: topY + 4 });
      for (let x = half - 16; x <= half + 16; x++) {
        coords.push({ x, y: half + 16 });
      }
      return coords;
    },
  },
  letter: {
    id: "letter",
    name: "Chữ cái / Ký tự (Letter / Symbol)",
    description: "Đường nét kỷ hà tạo khung chữ cái nghệ thuật độc đáo.",
    symmetryType: "axial-y",
    wallOutlineGenerator: (wallCount: number, center: number) => {
      const coords: Array<{ x: number; y: number }> = [];
      const half = Math.floor(center);
      for (let i = -14; i <= 14; i++) {
        coords.push({ x: half + i, y: half });
        coords.push({ x: half, y: half + i });
      }
      return coords;
    },
  },
  radial: {
    id: "radial",
    name: "Bát giác tỏa tròn (Radial Octagon)",
    description: "Mô hình phòng thủ hoa sen bát giác tỏa đều 8 hướng cân đối hoàn hảo.",
    symmetryType: "rotational-4",
    wallOutlineGenerator: (wallCount: number, center: number) => {
      const coords: Array<{ x: number; y: number }> = [];
      const half = Math.floor(center);
      const radii = [6, 12, 18];
      for (const r of radii) {
        const offset = Math.round(r * 0.4);
        for (let i = -offset; i <= offset; i++) {
          coords.push({ x: half + i, y: half - r });
          coords.push({ x: half + i, y: half + r });
          coords.push({ x: half - r, y: half + i });
          coords.push({ x: half + r, y: half + i });
        }
      }
      return coords;
    },
  },
};
