/**
 * GiftCardEngine — 礼品卡核心逻辑（纯逻辑，Node/浏览器通用）
 *
 * 卡号格式：GC-XXXX-XXXX-XXXX-XXXX（16 位，含 Luhn 校验位）
 */
"use strict";

const GiftCardEngine = (() => {

  /* ---------- 卡号：Luhn 校验 ---------- */
  function luhnCheckDigit(digits) {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      let d = +digits[i];
      if (i % 2 === 0) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return String((10 - (sum % 10)) % 10);
  }

  function luhnVerify(digits) {
    return luhnCheckDigit(digits.slice(0, -1)) === digits.slice(-1);
  }

  function generateCode(rand = Math.random) {
    let body = "";
    for (let i = 0; i < 15; i++) body += Math.floor(rand() * 10);
    const full = body + luhnCheckDigit(body);
    return "GC-" + full.replace(/(\d{4})(?=\d)/g, "$1-");
  }

  function normalize(code) {
    return String(code).toUpperCase().replace(/[^0-9]/g, "");
  }

  function isValidCode(code) {
    const digits = normalize(code);
    return digits.length === 16 && luhnVerify(digits);
  }

  /* ---------- 卡系统 ---------- */
  class CardSystem {
    constructor() { this.cards = new Map(); }

    issue({ amount, theme = "classic", holder = "未绑定", expiresDays = 365 }) {
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("面额必须为正数");
      if (amount > 10000) throw new Error("单卡面额不能超过 ¥10000");
      const code = generateCode();
      const card = {
        code, amount, balance: amount, theme, holder,
        status: "active",               // active | frozen | depleted | expired
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiresDays * 864e5).toISOString(),
        ledger: [{ type: "issue", amount, at: new Date().toISOString(), note: "开卡充值" }],
      };
      this.cards.set(code, card);
      return card;
    }

    get(code) { return this.cards.get(this._findKey(code)); }

    _findKey(code) {
      const digits = normalize(code);
      for (const key of this.cards.keys()) {
        if (normalize(key) === digits) return key;
      }
      return code;
    }

    _check(card, amount) {
      if (!card) return "卡号不存在";
      if (!isValidCode(card.code)) return "卡号校验位错误";
      if (card.status === "frozen") return "卡片已冻结";
      if (card.status === "depleted") return "余额已用完";
      if (new Date(card.expiresAt) < new Date()) return "卡片已过期";
      if (amount != null) {
        if (!Number.isFinite(amount) || amount <= 0) return "金额非法";
        if (amount > card.balance) return `余额不足（剩余 ¥${card.balance.toFixed(2)}）`;
      }
      return null;
    }

    /** 核销消费（支持分次使用） */
    redeem(code, amount, note = "消费") {
      const card = this.get(code);
      const err = this._check(card, amount);
      if (err) return { ok: false, reason: err };
      card.balance = +(card.balance - amount).toFixed(2);
      card.ledger.push({ type: "redeem", amount: -amount, at: new Date().toISOString(), note });
      if (card.balance === 0) card.status = "depleted";
      return { ok: true, balance: card.balance };
    }

    /** 转赠：变更持卡人 */
    transfer(code, newHolder) {
      const card = this.get(code);
      const err = this._check(card);
      if (err) return { ok: false, reason: err };
      if (!newHolder?.trim()) return { ok: false, reason: "受赠人不能为空" };
      const from = card.holder;
      card.holder = newHolder.trim();
      card.ledger.push({ type: "transfer", amount: 0, at: new Date().toISOString(), note: `${from} → ${card.holder}` });
      return { ok: true };
    }

    freeze(code)   { const c = this.get(code); if (c) c.status = "frozen"; return c; }
    unfreeze(code) { const c = this.get(code); if (c && c.status === "frozen") c.status = "active"; return c; }

    list() { return [...this.cards.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  }

  return { CardSystem, generateCode, isValidCode, normalize };
})();

if (typeof module !== "undefined") module.exports = GiftCardEngine;
