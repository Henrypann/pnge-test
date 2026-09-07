# PNGE 甲面 / 穿戴甲壳原型

**本仓库不是可打印交付。** 网格、GLB 与参数只用于三维预览和几何量级核对，不能直接用于 SLA/FDM、美甲甲片开模或临床贴合。

婚纱风 Blender 渲染（立体小花、尖底石、人手模型）**仅为造型灵感**，本原型不复刻珠宝与手部扫描，只重建软杏仁甲面的 C 曲、纵拱与真实边缘厚度。

## 名称

**PNGE** = Parametric Nail Geometry Exchange（参数化甲面几何交换，草稿契约，见 `src/contracts/pnge.ts`）。

- **甲面（nail plate）**：参数化软杏仁片，有厚度。
- **穿戴甲壳（wearable shell）**：同一拓扑拆成三块命名网格。
- **C 曲（C-curve）**：从尖端看的横向圆弧矢高。
- **纵拱（longitudinal arch）**：侧面看，甲沟到游离缘弦上的矢高。
- **GLB**：glTF Binary，一种二进制三维网格容器。

## 功能

### Phase 1 — 3D 甲面

- 软杏仁轮廓：甲沟圆钝、中段接近平行、远端收成圆尖（不是针尖）
- 五指 × 左/右（`thumb` `index` `middle` `ring` `pinky` × `L`/`R`）
- 可见 C 曲、纵拱、毫米级侧壁厚度
- Vite + Three.js 观看器，**端口 43177**，硬侧光；侧面看纵拱，尖端看 C 曲

### Phase 2 — 穿戴甲壳

- 网格名固定为 `outer_form`（外轮廓）、`inner_fit`（贴合面）、`edge_band`（厚度圈）
- 十指托盘摆放（掌心朝下、拇指外展的示意布局）
- 契约桩：`exportManufacturingBundle()` 会抛错，防止被当成生产导出

### 中指量级（成人长软杏仁，约数）

| 量 | 目标 |
| --- | --- |
| C 深 | ~2.4 mm |
| 纵拱 | ~2.0 mm |
| 侧壁厚度 | ~0.8 mm |

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

单位为毫米。文件可在 Blender 中打开查看，但**不要送去打印**。

## 仓库说明

先前 Origin 临时库 `henrypan/tmp-c7ecd541acf097b4` @ `907bae3` 无法在此环境拉取，因此按同一产品说明在 GitHub `Henrypann/pnge-test` 重建。若远程已有空的 `Initial commit`，新提交叠在其上，**未使用 force push**。
