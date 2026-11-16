// 礼品卡系统 UI
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);

  const THEMES = [
    { id: "classic", name: "经典红", css: "linear-gradient(130deg,#c2410c,#ea580c)" },
    { id: "forest",  name: "松绿",   css: "linear-gradient(130deg,#166534,#16a34a)" },
    { id: "ocean",   name: "海蓝",   css: "linear-gradient(130deg,#0c4a6e,#0284c7)" },
    { id: "violet",  name: "绛紫",   css: "linear-gradient(130deg,#5b21b6,#8b5cf6)" },
  ];

  // 引擎 + 持久化
  const sys = new GiftCardEngine.CardSystem();
  const saved = load("gift-cards", null);
  if (saved) saved.forEach(c => sys.cards.set(c.code, c));
  function load(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } }
  function persist() { localStorage.setItem("gift-cards", JSON.stringify(sys.list())); }

  const state = { amount: 200, theme: "classic", orderAmt: 356 };

  /* ---------- Tabs ---------- */
  document.querySelectorAll(".tab").forEach(t =>
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
      ["issue", "redeem", "cards"].forEach(id => $("#tab-" + id).hidden = id !== t.dataset.tab);
      if (t.dataset.tab === "cards") renderCards();
    }));

  /* ---------- 开卡 ---------- */
  $("#amountRow").addEventListener("click", (e) => {
    const btn = e.target.closest(".amt");
    if (!btn) return;
    state.amount = +btn.dataset.amt;
    $("#customAmt").value = "";
    document.querySelectorAll(".amt").forEach(b => b.classList.toggle("active", b === btn));
  });
  $("#customAmt").addEventListener("input", (e) => {
    document.querySelectorAll(".amt").forEach(b => b.classList.remove("active"));
    state.amount = +e.target.value || 0;
  });

  $("#themeRow").innerHTML = THEMES.map(t =>
    `<button class="theme-opt ${t.id === state.theme ? "active" : ""}" data-theme="${t.id}" style="background:${t.css}">${t.name}</button>`).join("");
  $("#themeRow").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-theme]");
    if (!btn) return;
    state.theme = btn.dataset.theme;
    document.querySelectorAll(".theme-opt").forEach(b => b.classList.toggle("active", b === btn));
  });

  $("#issueBtn").addEventListener("click", () => {
    try {
      const card = sys.issue({
        amount: state.amount, theme: state.theme,
        holder: $("#holderInput").value.trim() || "未绑定",
      });
      persist();
      const theme = THEMES.find(t => t.id === card.theme);
      $("#newCardBox").hidden = false;
      $("#newCardBox").innerHTML = `
        <div class="giftcard" style="background:${theme.css}">
          <div class="gc-amount">¥${card.amount.toFixed(2)}</div>
          <div class="gc-code">${card.code}</div>
          <div class="gc-meta"><span>持卡人：${card.holder}</span><span>有效期至 ${card.expiresAt.slice(0, 10)}</span></div>
        </div>
        <p style="font-size:12px;color:var(--muted);margin-top:10px;text-align:center">
          卡号已含 Luhn 校验位，点卡号可复制</p>`;
      $("#newCardBox .gc-code").addEventListener("click", () => {
        navigator.clipboard?.writeText(card.code);
      });
    } catch (err) { alert(err.message); }
  });

  /* ---------- 核销 ---------- */
  document.querySelectorAll(".order-amt button").forEach(b =>
    b.addEventListener("click", () => {
      state.orderAmt = Math.max(10, state.orderAmt + +b.dataset.step);
      $("#orderAmt").textContent = "¥" + state.orderAmt.toFixed(2);
    }));

  $("#redeemBtn").addEventListener("click", () => {
    const code = $("#redeemCode").value.trim();
    const box = $("#redeemResult");
    box.hidden = false;

    const card = sys.get(code);
    if (!card) { box.className = "redeem-result fail"; box.textContent = "❌ 卡号不存在"; return; }
    if (!GiftCardEngine.isValidCode(code)) {
      box.className = "redeem-result fail"; box.textContent = "❌ 卡号校验位错误（请检查是否输错）"; return;
    }

    // 0 表示尽量全额抵扣订单
    let amt = +$("#redeemAmt").value || 0;
    if (amt === 0) amt = Math.min(card.balance, state.orderAmt);
    if (amt > state.orderAmt) amt = state.orderAmt;

    const r = sys.redeem(code, amt, "收银台消费");
    if (!r.ok) {
      box.className = "redeem-result fail";
      box.textContent = "❌ " + r.reason;
      return;
    }
    persist();
    box.className = "redeem-result ok";
    box.innerHTML = `✅ 核销成功：本单抵扣 <b>¥${amt.toFixed(2)}</b><br>
      剩余应付 ¥${(state.orderAmt - amt).toFixed(2)} · 卡内余额 ¥${r.balance.toFixed(2)}`;
  });

  /* ---------- 卡列表 ---------- */
  const STATUS_LABEL = { active: "正常", frozen: "冻结", depleted: "用完", expired: "过期" };

  function renderCards() {
    const cards = sys.list();
    $("#cardCount").textContent = cards.length;
    $("#cardList").innerHTML = cards.map(c => {
      const theme = THEMES.find(t => t.id === c.theme) || THEMES[0];
      return `<div class="card-row">
        <div class="top">
          <span class="mono">${c.code}</span>
          <span class="bal">¥${c.balance.toFixed(2)}</span>
        </div>
        <div class="meta">
          <span>${c.holder} · 面额 ¥${c.amount} · ${c.expiresAt.slice(0, 10)} 到期</span>
          <span class="badge ${c.status}">${STATUS_LABEL[c.status]}</span>
        </div>
        <div class="ops">
          <button data-ledger="${c.code}">📒 流水</button>
          ${c.status === "active" ? `<button data-freeze="${c.code}">🔒 冻结</button>` : ""}
          ${c.status === "frozen" ? `<button data-unfreeze="${c.code}">🔓 解冻</button>` : ""}
          ${c.status === "active" ? `<button data-transfer="${c.code}">🎁 转赠</button>` : ""}
        </div>
      </div>`;
    }).join("") || `<p style="color:var(--muted);font-size:13px;text-align:center;padding:30px 0">暂无卡片，先去开一张吧</p>`;
  }

  $("#cardList").addEventListener("click", (e) => {
    const ledgerBtn = e.target.closest("[data-ledger]");
    const freezeBtn = e.target.closest("[data-freeze]");
    const unfreezeBtn = e.target.closest("[data-unfreeze]");
    const transferBtn = e.target.closest("[data-transfer]");

    if (ledgerBtn) {
      const c = sys.get(ledgerBtn.dataset.ledger);
      $("#ledgerBox").hidden = false;
      $("#ledgerCode").textContent = c.code;
      $("#ledgerList").innerHTML = [...c.ledger].reverse().map(t => `
        <div class="ledger-row">
          <span>${t.note}</span>
          <b class="${t.amount > 0 ? "pos" : t.amount < 0 ? "neg" : ""}">${t.amount > 0 ? "+" : ""}${t.amount.toFixed(2)}</b>
          <span>${new Date(t.at).toLocaleString("zh-CN")}</span>
        </div>`).join("");
    }
    if (freezeBtn)   { sys.freeze(freezeBtn.dataset.freeze); persist(); renderCards(); }
    if (unfreezeBtn) { sys.unfreeze(unfreezeBtn.dataset.unfreeze); persist(); renderCards(); }
    if (transferBtn) {
      const name = prompt("转赠给谁？输入受赠人称呼：");
      if (name) {
        const r = sys.transfer(transferBtn.dataset.transfer, name);
        if (!r.ok) alert(r.reason);
        persist(); renderCards();
      }
    }
  });
})();
