# Gift Card System · 礼品卡系统

电商礼品卡完整闭环演示，零依赖原生 JS。核心引擎 `engine.js` 为纯逻辑层，
Node/浏览器通用。

## 功能

### 开卡
- 4 档固定面额 + 自定义面额（上限 ¥10000）
- 4 种卡面主题
- **卡号 GC-XXXX-XXXX-XXXX-XXXX，16 位数字含 Luhn 校验位**——输错一位即可被识别
- 有效期 365 天

### 核销
- 模拟收银台：订单金额可调，卡余额自动「尽量全额抵扣」
- 支持**分次使用**（余额扣减，直至用完置为「用完」状态）
- 校验链：卡号存在 → Luhn 校验位 → 冻结/用完/过期检查 → 余额检查

### 管理
- 冻结 / 解冻 / 转赠（变更持卡人，留痕）
- **流水台账**：开卡、每笔消费、转赠全部记账
- localStorage 持久化

## 引擎 API

```js
const sys = new GiftCardEngine.CardSystem();
const card = sys.issue({ amount: 200, theme: "ocean" });
sys.redeem(card.code, 50, "订单消费");   // { ok: true, balance: 150 }
sys.transfer(card.code, "张三");
sys.freeze(card.code);
GiftCardEngine.isValidCode("GC-...");     // Luhn 验证
```

## 运行

浏览器直接打开 `index.html`。

## License

MIT
