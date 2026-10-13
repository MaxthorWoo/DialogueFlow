// 生成 512x512 的应用图标 PNG（品牌蓝底 + 白色叙事流折线）
import zlib from 'node:zlib'
import fs from 'node:fs'

const W = 512, H = 512
const px = Buffer.alloc(W * H * 4)

function setPx(x, y, r, g, b, a) {
  if (x < 0 || x >= W || y < 0 || y >= H) return
  const i = (y * W + x) * 4
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a
}

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // 圆角矩形背景（垂直渐变 #4A90D9 -> #2B6CB0）
    const m = 28
    const inRect = x >= m && x < W - m && y >= m && y < H - m
    let inside = false
    if (inRect) {
      const r = 64
      const cx = Math.min(Math.max(x, m + r), W - m - r)
      const cy = Math.min(Math.max(y, m + r), H - m - r)
      inside = (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    }
    if (!inside) { setPx(x, y, 0, 0, 0, 0); continue }
    const t = y / H
    const r = Math.round(74 + (43 - 74) * t)
    const g = Math.round(144 + (108 - 144) * t)
    const b = Math.round(217 + (176 - 217) * t)
    setPx(x, y, r, g, b, 255)
  }
}

// 白色叙事流折线：三个节点圆点 + 连线
const pts = [[128, 150], [384, 256], [170, 372]]
// 连线（粗线）
function line(x1, y1, x2, y2, w) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x1 + (x2 - x1) * s / steps)
    const y = Math.round(y1 + (y2 - y1) * s / steps)
    for (let dy = -w; dy <= w; dy++) for (let dx = -w; dx <= w; dx++) {
      if (dx * dx + dy * dy <= w * w) setPx(x + dx, y + dy, 255, 255, 255, 255)
    }
  }
}
line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], 12)
line(pts[1][0], pts[1][1], pts[2][0], pts[2][1], 12)
// 节点圆点
for (const [cx, cy] of pts) {
  for (let y = -34; y <= 34; y++) for (let x = -34; x <= 34; x++) {
    if (x * x + y * y <= 34 * 34) setPx(cx + x, cy + y, 255, 255, 255, 255)
  }
  for (let y = -20; y <= 20; y++) for (let x = -20; x <= 20; x++) {
    if (x * x + y * y <= 20 * 20) setPx(cx + x, cy + y, 74, 144, 217, 255)
  }
}

// 编码 PNG
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crcTable = []
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0 }
  let crc = 0xFFFFFFFF
  for (const byte of body) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8)
  crc = (crc ^ 0xFFFFFFFF) >>> 0
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc)
  return Buffer.concat([len, body, crcBuf])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
const raw = Buffer.alloc(H * (1 + W * 4))
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0
  px.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4)
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
fs.writeFileSync('icon-source.png', png)
console.log('icon-source.png written', png.length, 'bytes')
