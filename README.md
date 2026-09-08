# PNGE 甲面 / 穿戴甲壳原型

**本仓库不是可打印交付。** `PRINT_READY=false`。网格、GLB 与参数只用于三维预览和几何量级核对，不能直接用于 SLA/FDM、美甲甲片开模或临床贴合。制造导出 `exportManufacturingBundle()` 会拒绝执行。

婚纱风 Blender 渲染（立体小花、尖底石、人手模型）**仅为造型灵感**，本原型不复刻珠宝与手部扫描，只重建软杏仁甲面的 C 曲、纵拱与真实边缘厚度。

## 名称

**PNGE** = Parametric Nail Geometry Exchange（参数化甲面几何交换，草稿契约，见 `src/contracts/pnge.ts`）。

- **甲面（nail plate）**：参数化软杏仁片，有厚度。
- **穿戴甲壳（wearable shell）**：同一拓扑拆成三块命名网格。
- **C 曲（C-curve）**：从尖端看的横向圆弧矢高。
- **纵拱（longitudinal arch）**：侧面看，甲沟到游离缘弦上的矢高。
- **GLB**：glTF Binary，一种二进制三维网格容器。
- **SHA-256**：Secure Hash Algorithm 256-bit（256 位安全散列算法），用于稳定指纹。

## 功能

### Phase 1 — 3D 甲面

- 软杏仁轮廓：甲沟圆钝、中段接近平行、远端收成圆尖（不是针尖）
- 五指 × 左/右（`thumb` `index` `middle` `ring` `pinky` × `L`/`R`）
- 可见 C 曲、纵拱、毫米级侧壁厚度
- Vite + Three.js 观看器，**端口 43177**，硬侧光；侧面看纵拱，尖端看 C 曲

### Phase 2 — 穿戴甲壳

- 网格名固定为 `outer_form`（外轮廓）、`inner_fit`（床面通道）、`edge_band`（厚度圈）
- 十指托盘摆放（掌心朝下、拇指外展的示意布局）
- 契约桩：`exportManufacturingBundle()` 会抛错，防止被当成生产导出

### Phase 3 — Fit：独立床面

`inner_fit` **不是** `outer_form` 的法向偏置。它由独立的 `InnerSurfaceSpec`（`kind: parametric_bed_v1`）采样。网格名 `inner_fit` 只表示 Fit 通道，**不是**贴合或可穿戴承诺。

#### 床面算法（`parametric_bed_v1`）

参数域：`s ∈ [0,1]` 甲沟→游离缘，`v ∈ [-1,1]` 左→右。半宽用床面自己的 `cuticleBlunt` / `distalExponent` / `taperStart` / `tipRatio`，**不**调用外轮廓的 `almondHalfWidth`。

```
halfW(s) = (bedWidthMm/2) * cuticle(s) * distal(s)
x = v * halfW(s)
y = s * bedLengthMm
z = bedZMm + arch(s, bedArchMm, archPeak) + cCurve(x, halfW, bedCDepthMm)
```

`bedZMm` 是显式高度，不是沿外法向的距离。`wrapMm` 只加在外表面 +Z，不进入床面。左右手在右手规范坐标采样后再镜像 X。

五指床面预设写在 `src/geometry/innerSurface.ts` 的 `INNER_BED_PRESETS`，与 `FINGER_PRESETS` 分开维护。

#### 稳定指纹（`pnge.fingerprint.v1+sha256`）

三个通道各自对「参数 + 采样点」做 SHA-256：

| 通道 | 参数 | 采样网格 |
| --- | --- | --- |
| `fit` | `InnerSurfaceSpec` | `inner_fit` |
| `shape` | `OuterFormSpec` | `outer_form` |
| `edgeBand` | `{ inner, outer }` | `edge_band` |

规范化：对象键字典序；数字 `-0→0` 后 `toFixed(6)`；坐标先乘 `1e6` 再四舍五入到微米；无空白 JSON → UTF-8 → SHA-256 小写十六进制。回归见 `tests/fingerprint.test.ts` 的 E1–E5。

#### 版本化公差带

`pnge.toleranceBands.v1` 写在对象头与 GLB extras（`asset.extras.pnge` 与根 `extras.pnge`）：

- `cDepthMm` / `archMm` / `edgeThicknessMm` / `innerDeviationMm`
- 改 `version` 即新策略；这是量级窗口，不是临床或制造公差。

### 中指量级（成人长软杏仁，约数）

| 量 | 目标 |
| --- | --- |
| C 深 | ~2.4 mm |
| 纵拱 | ~2.0 mm |
| 侧壁厚度 | ~0.8 mm |

侧壁是 outer↔inner 边界对应点的实测距离，由两套独立参数共同决定，不是法向偏置输入。

## 运行

需要 Node.js 20+。

```bash
npm install
npm test
npm run generate:samples   # 写入 public/samples/*.glb（含 plate_middle_R.glb）
npm run dev                # http://localhost:43177
```

生产构建：`npm run build`。

## 样例文件

`public/samples/` 下为五指左右的甲面与甲壳 GLB，例如：

- `public/samples/plate_middle_R.glb`
- `public/samples/shell_middle_R.glb`

单位为毫米。文件可在 Blender 中打开查看，但**不要送去打印**。GLB extras 含对象头、指纹与公差带版本。

## 仓库说明

先前 Origin 临时库 `henrypan/tmp-c7ecd541acf097b4` @ `907bae3` 无法在此环境拉取，因此按同一产品说明在 GitHub `Henrypann/pnge-test` 重建。若远程已有空的 `Initial commit`，新提交叠在其上，**未使用 force push**。
