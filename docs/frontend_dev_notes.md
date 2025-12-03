# Frontend Dev Notes (mock-friendly)

- Dev server: `cd client && npm install && npm run dev` (在 conda `ai_env` 下即可；僅用 mock，不需 GPU)。
- AI client：預設 `useMockAi: true`，可在頁面右上按鈕「AI Mode: Mock/HTTP」切換；或用環境變數 `VITE_USE_MOCK_AI=false` + `VITE_API_BASE_URL=/ai`。
- Data loading：HTTP 模式會從 `/game/scenes`、`/game/npcs`、`/game/player/{id}/state`、`/game/player/{id}/quests`、`/game/quests` 初始化；Mock 模式則直接讀 `data/scenes`、`data/npcs`。
- Dialogue flow：`PlaceholderScene` 每 3 秒向 `AiClient` 要一次回應，將 `internalEffects` 寫入前端 `GameState`；按 Enter 可手動觸發。HUD 與 Dev 面板透過 store 訂閱更新。
- 移動與切換：左右箭頭移動（簡易 x 軸），按 `N` 依據 `sceneConnections` 切到下一場景（取第一個連結）。
- HUD/Quest：HUD 顯示當前場景與屬性；Quest 區塊顯示最活躍任務的當前步驟（來自 `/game/player/{id}/quests` + `/game/quests`）。
- Lore dev 面板：頁面底部有 `/game/lore/search` 搜尋框，HTTP 模式下可查觀測 RAG 片段（mock/in-memory）；Dev state 預覽當前 scene/NPC/last AI response。

## 後續前端待辦（優先順序）
1) 場景資產：`data/scenes` 加入 `backgroundImage`，前端載入圖片（無圖則用漸層）。
2) NPC/玩家 sprites：本地 placeholder png，依 id/角色切換。
3) 對話 UX：選項上下/數字鍵選取，玩家回覆追加到 history 後再呼叫 `/ai/dialogue`。
4) 任務同步：quest 更新寫回後端 stub，HUD/Toast 顯示詳細 delta。
5) Dev panel：顯示 orchestrator trace/prompt，加入重置狀態按鈕（mock 路由）。
- TODO：接上真實畫面/場景切換與玩家輸入事件，再把 mock HTTP 端點對應到 FastAPI `/ai/dialogue`。 
