export function parseCubeLut(text) {
  const lines = String(text || '').split(/\r?\n/);
  const lut = { title: 'Imported LUT', size: 0, domainMin: [0, 0, 0], domainMax: [1, 1, 1], data: [] };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^TITLE\s+/i.test(line)) lut.title = line.replace(/^TITLE\s+/i, '').replace(/^"|"$/g, '') || lut.title;
    else if (/^LUT_3D_SIZE\s+/i.test(line)) lut.size = Number(line.split(/\s+/)[1]);
    else if (/^DOMAIN_MIN\s+/i.test(line)) lut.domainMin = line.split(/\s+/).slice(1, 4).map(Number);
    else if (/^DOMAIN_MAX\s+/i.test(line)) lut.domainMax = line.split(/\s+/).slice(1, 4).map(Number);
    else if (/^[+-]?(?:\d*\.)?\d/.test(line)) {
      const row = line.split(/\s+/).slice(0, 3).map(Number);
      if (row.length === 3 && row.every(Number.isFinite)) lut.data.push(row);
    }
  }
  if (!Number.isInteger(lut.size) || lut.size < 2 || lut.size > 65) throw new Error('LUT_3D_SIZE 必须是 2-65 的整数');
  if (lut.data.length !== lut.size ** 3) throw new Error(`LUT 声明 ${lut.size}³ 个颜色点，但读取到 ${lut.data.length} 个`);
  return lut;
}

export function sampleCube(lut, red, green, blue, strength = 1) {
  const amount = clamp(strength);
  const size = lut.size;
  const coord = value => clamp((value - lut.domainMin[0]) / Math.max(0.000001, lut.domainMax[0] - lut.domainMin[0])) * (size - 1);
  const x = coord(red), y = coord(green), z = coord(blue);
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
  const x1 = Math.min(size - 1, x0 + 1), y1 = Math.min(size - 1, y0 + 1), z1 = Math.min(size - 1, z0 + 1);
  const tx = x - x0, ty = y - y0, tz = z - z0;
  const at = (xi, yi, zi) => lut.data[xi + yi * size + zi * size * size];
  const mix = (a, b, t) => a + (b - a) * t;
  const output = [0, 1, 2].map(channel => {
    const c00 = mix(at(x0, y0, z0)[channel], at(x1, y0, z0)[channel], tx);
    const c10 = mix(at(x0, y1, z0)[channel], at(x1, y1, z0)[channel], tx);
    const c01 = mix(at(x0, y0, z1)[channel], at(x1, y0, z1)[channel], tx);
    const c11 = mix(at(x0, y1, z1)[channel], at(x1, y1, z1)[channel], tx);
    return clamp(mix(mix(c00, c10, ty), mix(c01, c11, ty), tz));
  });
  return [mix(red, output[0], amount), mix(green, output[1], amount), mix(blue, output[2], amount)];
}

export function renderLutPreview(canvas, lut = null, strength = 1, mode = 'source') {
  if (!canvas) return;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const width = canvas.width = Math.max(320, Math.floor(canvas.clientWidth || 420));
  const height = canvas.height = 220;
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = x / Math.max(1, width - 1);
      const ny = y / Math.max(1, height - 1);
      let rgb = syntheticPixel(nx, ny);
      if (mode === 'target') rgb = targetPixel(rgb, nx, ny);
      if (lut) rgb = sampleCube(lut, rgb[0], rgb[1], rgb[2], strength);
      const offset = (y * width + x) * 4;
      image.data[offset] = Math.round(clamp(rgb[0]) * 255);
      image.data[offset + 1] = Math.round(clamp(rgb[1]) * 255);
      image.data[offset + 2] = Math.round(clamp(rgb[2]) * 255);
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
}

function syntheticPixel(x, y) {
  const sky = [0.12 + x * 0.25, 0.2 + x * 0.2, 0.32 + x * 0.35];
  const skin = [0.7 + x * 0.2, 0.42 + x * 0.18, 0.28 + x * 0.12];
  const foliage = [0.08 + x * 0.12, 0.22 + x * 0.35, 0.12 + x * 0.1];
  if (y < 0.34) return sky.map(value => value * (0.75 + y * 0.5));
  if (x > 0.28 && x < 0.72 && y > 0.35 && y < 0.82) return skin.map(value => value * (1 - Math.abs(x - 0.5) * 0.35));
  if (x < 0.35) return foliage.map(value => value * (0.7 + y * 0.35));
  const gray = 0.12 + x * 0.72;
  return [gray, gray * (0.94 + y * 0.05), gray * (0.9 + y * 0.08)];
}

function targetPixel(rgb, x, y) {
  const contrast = rgb.map(value => clamp((value - 0.5) * 1.08 + 0.5));
  return [clamp(contrast[0] * 1.05 + 0.015), clamp(contrast[1] * 0.99), clamp(contrast[2] * 0.92 + (1 - y) * 0.015)];
}

function clamp(value) { return Math.max(0, Math.min(1, Number(value) || 0)); }
