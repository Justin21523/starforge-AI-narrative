我現在要做個2d的javascript網頁遊戲 這個遊戲 主要是會有個地圖 會有
個完整的ai界面使用者可以 選擇跳到地圖的某一個場景 到了某一個場景後
每次使用者移動都是往左往右移動而已 整個背景就像是一個動畫一樣 這是個
角色與npc對話 進行任務的遊戲 每個景點包含室內的 室外的 也包含一般街
到 如會經過其他人家的房子 路 碰到路人朋友等等 或者是其他npc會左右移
動輪迴等 不論如何這就是個平面型 而非platformer的遊戲 使用者只會左右
移動 我希望可以制定很多任務 目標設定在一個國小玩家是五年級11歲
elementary school american student 因此遊戲當然對話都是英文 一
個男孩 遊戲目標是與周遭同學朋友互動 建立各種關係等等 當然也會有反派角
色 這些會是bully 主角會透過與朋友的互動合作對抗bully等等 其他當然也
包含很多生活所示等等 預設這個主角唯獨生子 我希望這個遊戲的機制可以 藉
由完成不同的主線任務 支線任務 來進展 同時與朋友同學不同順序的互動聊
天 都會影響整個劇情 和故事以及遊戲進展好壞的走向等等 另外考量到 遊戲
的歷史紀錄包含 與同學的對話 還有其他如 中間聊天選擇回答等等 因此LLM
RAG AI_agents 等的運用非常重要 我預設可以上傳相關設定資料 作為所有
角色還有各種遊戲設定的機制 當然本身也已經有了 只是玩家可以客製化 讓這
個遊戲便得更像某一部動畫的設定一樣 要有複雜的rag ai_agents系統
（可以調用tools, multi-steps processing, single thinking,
deep thinking, web-searching, reasoning, multi-steps
planning, calculating, tool choosing and using)等等 其他進階
的包含場景角色道具各種物品都也用ai models(stable diffusion)即時
生成等等 重點是我希望透過ai_agents緊密的系統 讓整個遊戲變得可以非常
的人性化 就像在完真的互動遊戲一樣 不過也要記得開發時為了測試方便所有
的ai功能 都要有完整的mock, stub機制以方便通過測試 先運行為主 後面
再次替換 請基於以上的專案說明告訴我你的想法 以及可以擴充的地方等等 最
後請你幫我 設計整個大致的專案架構及說明文件 另外我要用codex協助開發
除了程式碼註解等等以外 說明全中文 因此請告訴我後續如何和codex溝通

先講結論：這個企劃如果做起來，會像「AI 版的 Persona + 校園文字冒險 + 動態人際關係模擬器」。很有野心，但方向是對的 👍

我分幾塊跟你說：

1. 我對這個遊戲的整體看法＆可以再加什麼
2. 整體系統／專案架構（前端、後端、AI、資料、測試）
3. RAG＋AI agents 大致怎麼設計
4. Mock / Stub 測試策略
5. 之後你要怎麼「跟 Codex 說話」比較有效

---

## 1. 整體想法 & 可以再補強的設計點

### 你現在講的核心已經有的

* **玩法類型**：
  2D 平面場景切換、進入不同場景後只能左右移動，背景像動畫卷軸，重點在**對話、選項、任務**，不是跳來跳去的平台遊戲。
* **世界觀**：
  美國國小五年級（11 歲），主角是男生、獨生子，學校＋街道＋同學家＋各種室內/室外場景。
* **主題**：

  * 和同學、朋友建立關係
  * 處理 bully（霸凌者）：透過朋友合作、求助師長、正向解法
* **敘事機制**：

  * 主線任務＋支線任務
  * 對話選項、互動順序會改變好感度、劇情分歧、結局
* **AI 部分**：

  * 所有角色、設定可以透過 RAG + LLM + AI agents 驅動
  * 玩家可以上傳「世界觀 / 動畫設定」客製化遊戲
  * 支援多工具、多步推理、Web search 等
  * 場景/角色/道具可用 Stable Diffusion 之類的模型動態產圖
  * 所有 AI 功能需要有 mock/stub 方便開發測試

這些都非常合理，而且很貼合「AI 驅動敘事遊戲」能發揮的優勢。

### 可以擴充／細化的設計

**(1) 整體遊戲 loop**

* 每天有簡單時間軸：
  「早上 → 上學 → 放學 → 傍晚在社區走動 → 晚上在家」，
  讓任務跟時間綁在一起（某些事件只會在「放學後的走廊」触發）。
* **一週循環**：星期一～星期五，一週結束做「小結局/成長報告」，多週累積成「大結局」。

**(2) 角色狀態系統**

* 主角屬性（簡單就好）：

  * Confidence（自信）
  * Empathy（同理心）
  * Stress（壓力）
  * Reputation（在班級中的名聲）
* 每個 NPC 的：

  * Friendship（跟主角的好感度）
  * Trust（信任程度）
  * 是否牽涉到 bully 事件（加害者、被害者、旁觀者）

AI 對話前可以先查這些數值來調整語氣與回應。

**(3) Bully 對抗設計（很重要，也關係到安全）**

* 走「教育向」路線：

  * 鼓勵尋求老師/家長/輔導老師協助
  * 鼓勵和朋友合作，而不是以暴制暴
  * 強調「記錄事件」「保存證據」「找大人說」
* AI 回應要有一層 **safety agent**：
  不會鼓勵報復、自傷或危險行為。

**(4) 劇情與 AI 的分工**

* 劇情**不能全部丟給 AI 即興**，會變散。
  建議：

  * 主線用「**劇情節點（nodes）」＋條件（條件達成才會解鎖**
  * AI 只負責：

    * 對話細節
    * 相同節點內的自由聊天
    * 合理的支線任務發想
* 這樣你可以控制：

  * 一定能打到主題（防止 LLM 跑飛）
  * 可測試、可重現

**(5) 玩家客製世界觀**

* 玩家可以上傳：

  * 世界觀設定文字（像動畫 wiki）
  * 角色表（CSV / JSON）
  * 關係圖（optional）
* 系統把這些做成 RAG 的索引：

  * 每個 NPC 的人格卡（persona）
  * 場景描述
  * 特定事件設定

---

## 2. 專案整體架構（高階）

我先假設你用 **TypeScript + Web 前端（例如 PixiJS 或原生 Canvas） + Node.js 後端 + 一個 LLM 服務**，之後你可以自由換技術。

### 整體分層

1. **Client（前端遊戲）**

   * 畫面、移動、場景切換
   * 對話 UI、選項
   * 任務/劇情狀態管理（客戶端 cache）
   * 呼叫後端 API / AI 服務
2. **Game Server（遊戲後端 API）**

   * 玩家帳號 / 存檔 / 進度
   * 任務、場景、NPC 基本資料
   * 封裝一層「AI Orchestrator API」給前端用
3. **AI Orchestrator（LLM + RAG + Agents）**

   * 負責組 prompt、查資料（RAG）、調用工具
   * 有不同類型的 Agent：Director / NPC / Safety / Planner / Memory
4. **Data & Assets 層**

   * 原始設定檔（JSON / YAML）
   * 玩家自訂世界觀檔
   * 向量資料庫（RAG）
   * 生成的圖片（Stable Diffusion）快取
5. **Test / Mock 層**

   * 對 AI 相關的所有呼叫，都有 Interface + Mock 實作
   * 單元測試不會真的打 LLM / 圖片 API

---

## 3. 前端（Client）專案架構示意

```text
client/
  src/
    main.ts                # 入口
    core/                  # 基礎遊戲引擎
      Game.ts              # 遊戲主 loop
      SceneManager.ts      # 場景切換
      InputManager.ts      # 鍵盤/手把輸入
      EventBus.ts          # 事件系統
    rendering/
      Renderer.ts          # 封裝 PixiJS / Canvas
      Camera.ts            # 左右移動攝影機
    game/
      scenes/              # 各種場景（學校走廊、教室、街道、主角家...）
        ClassroomScene.ts
        HallwayScene.ts
        StreetScene.ts
      entities/
        Player.ts
        Npc.ts
      systems/
        QuestSystem.ts
        RelationshipSystem.ts
        DayCycleSystem.ts
        BullySystem.ts
    ui/
      DialogueBox.ts
      ChoiceMenu.ts
      Hud.ts               # 顯示任務、時間、屬性
    ai/
      AiClient.ts          # 封裝呼叫後端 AI API
      AiClientMock.ts      # 測試用 mock
    state/
      GameState.ts         # 當前劇情狀態 in client
  tests/
    ...
```

**前端跟 AI 的約定（很重要）**

`AiClient` 大概提供這幾種方法（舉例）：

```ts
interface DialogueRequest {
  playerId: string;
  npcId: string;
  sceneId: string;
  history: Array<{ speaker: 'player' | 'npc'; text: string }>;
  playerStats: { confidence: number; empathy: number; stress: number };
  npcStats: { friendship: number; trust: number };
  currentQuestContext?: { questId: string; stage: string };
  locale: 'en-US';
}

interface DialogueResponse {
  npcText: string;
  suggestedPlayerChoices: string[];
  internalEffects: {
    playerStatsDelta?: Partial<{ confidence: number; empathy: number; stress: number }>;
    npcStatsDelta?: Partial<{ friendship: number; trust: number }>;
    questUpdates?: Array<{ questId: string; newStage: string }>;
  };
}

interface AiClient {
  getNpcReply(req: DialogueRequest): Promise<DialogueResponse>;
  suggestSideQuests(...): Promise<...>;
  generateNpcConfigFromUserLore(...): Promise<...>;
}
```

`AiClientMock` 就是用假資料實作這個介面，單元測試只依賴介面不管裡面是不是 LLM。

---

## 4. 後端（Game Server + AI Orchestrator）架構示意

```text
server/
  src/
    index.ts                # HTTP 入口 (Express / Fastify ...)
    routes/
      auth.ts               # (可選) 登入 / 玩家資料
      player.ts             # 存檔 / 屬性
      game.ts               # 場景、任務查詢
      ai.ts                 # 前端只打這裡，不直接打 LLM
        - POST /ai/dialogue
        - POST /ai/planQuest
        - POST /ai/applyUserLore
    game/
      models/
        Player.ts
        Quest.ts
        Scene.ts
        Npc.ts
      services/
        QuestService.ts
        PlayerService.ts
        SceneService.ts
    ai/
      orchestrator/
        DialogueAgent.ts
        QuestPlannerAgent.ts
        LoreIngestionAgent.ts
        SafetyAgent.ts
      tools/
        GetGameStateTool.ts
        UpdateGameStateTool.ts
        SearchLoreTool.ts
        WebSearchTool.ts       # 如果真的要上網查
      rag/
        VectorStore.ts        # 包一層，底下可以接任何向量 DB
        MemoryStore.ts        # 玩家/NPC 長期記憶
    data/
      base_scenes.json
      base_npcs.json
      base_quests.json
      base_lore.md
  tests/
    ...
```

### AI Orchestrator – 雙層設計

1. **API 層（ai.routes）**

   * 收前端的 `DialogueRequest`
   * 做基本驗證（玩家是否有權限、場景 ID 合法等）
   * 呼叫 `DialogueAgent.handle(request)`

2. **Agent 層**

以 `DialogueAgent` 為例：

* 流程大約是：

  1. 呼叫 `SafetyAgent.preCheck(request)`（有需要的話）
  2. 呼叫 `GetGameStateTool` → 把相關玩家／NPC／任務狀態取回來
  3. 呼叫 `SearchLoreTool` → 從 RAG 找到相關設定、NPC 個性、世界觀
  4. 組成一個完整 prompt 給 LLM
  5. LLM 回傳後再由 `SafetyAgent.postCheck(response)` 二次檢查
  6. 解讀 LLM 結果→轉成 `DialogueResponse`（包括要怎麼調整屬性）
  7. 呼叫 `UpdateGameStateTool` 把數值更新回 DB
  8. 回傳給前端

這樣 AI 的「自由度」在 **prompt 裡**，遊戲的「規則」在 **tools + game service** 裡，兩個分開好維護。

---

## 5. RAG / 世界設定 / 玩家客製化

### 資料結構大概可以這樣分

```text
data/
  lore/
    base_lore.md          # 遊戲原生世界觀
    school_rules.md       # 校規、安全、反霸凌等
  npcs/
    base_npcs.json        # 內建角色列表
  quests/
    base_quests.json
  scenes/
    base_scenes.json
  user_custom/
    <playerId>/
      lore.md             # 玩家上傳的世界背景
      npcs.json           # 玩家客製角色
      mapping.json        # 客製如何覆蓋或補充原始資料
```

### Ingestion 流程

1. 玩家在 UI 上傳 zip / 文本
2. `LoreIngestionAgent`：

   * 對文本做拆段、摘要（避免太長）
   * 打到 VectorStore 建立向量索引
   * 產生 NPC persona（例如：說話風格、價值觀、和主角關係初始值）
3. 之後任何 Dialogue / Quest 相關的 prompt，先從：

   * `base_lore` + `user_custom.lore` 兩邊抓 top-k 的段落
   * 一起丟進 LLM

---

## 6. Stable Diffusion / 圖片生成的整合

不需要一開始就很動態，可以先這樣：

* 場景背景：

  * 每個 scene 有一個 `backgroundPrompt`
  * 第一次載入時去請圖，生成後存檔/快取，下次直接用。
* NPC 頭像 / 立繪：

  * `npc.imagePrompt` 由文字描述自動組出來
  * 生成一次即可，存起來。
* 工程上：

  * 寫一個 `ImageService`，底下可以：

    * 直接打 Stable Diffusion API
    * 或在開發／測試時用 Mock 回一張 placeholder 圖片

---

## 7. Mock / Stub 策略（開發＆測試）

你有特別提到這點，我直接幫你畫清楚一點。

### 設計原則

1. **所有對外服務（LLM、向量庫、圖片生成、Web search）都要有 interface。**
2. 在程式碼裡只依賴 interface，真實實作與 Mock 實作透過 DI（dependency injection）或簡單的 factory 切換。
3. 單元測試永遠只用 Mock，不打真 API。

### 例子：以 AI Client 為例

```ts
// shared/interfaces/AiClient.ts
export interface AiClient {
  getNpcReply(req: DialogueRequest): Promise<DialogueResponse>;
  // ... 其他方法
}

// server/ai/clients/RealAiClient.ts
export class RealAiClient implements AiClient {
  async getNpcReply(req: DialogueRequest): Promise<DialogueResponse> {
    // hit LLM provider + orchestrator logic
  }
}

// server/ai/clients/MockAiClient.ts
export class MockAiClient implements AiClient {
  async getNpcReply(req: DialogueRequest): Promise<DialogueResponse> {
    return {
      npcText: "Hey, how's it going?",
      suggestedPlayerChoices: [
        "I'm good!",
        "Not so great...",
        "Can we talk about something else?"
      ],
      internalEffects: {
        playerStatsDelta: { confidence: +1 },
        npcStatsDelta: { friendship: +2 }
      }
    };
  }
}
```

在程式啟動時：

```ts
const aiClient: AiClient =
  process.env.USE_MOCK_AI === 'true'
    ? new MockAiClient()
    : new RealAiClient();
```

測試時就把 `USE_MOCK_AI=true`，或直接 new MockAiClient。

---

# 一、專案總覽（Game + AI 總說明）

## 1.1 遊戲定位

* 類型：2D 橫向場景切換 + 文字冒險 + 人際關係模擬 + AI 對話系統
* 體感：像「AI 版 Persona 的學校日常篇」，但不是 RPG 戰鬥，是**人際 & 校園生活**
* 螢幕呈現：

  * 一個「平面橫向場景」，玩家只能左右移動，不跳、不爬、不平台跳躍
  * 背景可捲動，場景像動畫背景一樣滑動
* 互動核心：

  * 跟同學、朋友、老師、路人、家人、bully 對話
  * 解主線 / 支線任務
  * 建立與 NPC 的各種關係，影響後續劇情與結局

## 1.2 目標玩家 & 世界觀

* 目標玩家：

  * 現實中玩家：青少年/大人都可以玩
  * 遊戲內主角：

    * 美國小學五年級男生（11 歲）
    * 獨生子
* 世界觀：

  * 一個美國郊區社區 + 小學 + 部分街道、同學家、主角家
  * 時間以「平日」為主（早上→上學→放學→社區→回家）

## 1.3 核心主題

1. **人際關係建立**

   * 交朋友、維持友誼、修復衝突
2. **面對霸凌（bully）**

   * 嚴格走「正向與安全」路線：

     * 找朋友合作
     * 找老師、輔導老師、家長協助
     * 學會說出自己的感受
3. **日常生活事件**

   * 作業、考試、社團
   * 家裡規則、和父母的互動
   * 社區裡的鄰居與路人

## 1.4 系統目標（非功能性需求）

* **AI 驅動但可控**
  劇情框架由開發者掌控（主線/關鍵事件），細節由 LLM 自由發揮。
* **高度客製化**
  玩家可以上傳：

  * 世界觀描述
  * 角色設定
  * 類似「我想把整個班級變成某部動畫角色」
* **高可測試性**
  所有 AI / RAG / 圖片生成必須：

  * 有介面（interface）
  * 有 mock / stub 實作
  * 單元測試可以完全不連外
* **安全 & 教育導向**
  跟 bully / 自我價值有關的內容，必須經過 Safety Agent 篩選。

---

# 二、遊戲設計文件（Game Design）

## 2.1 核心遊戲 Loop

每一天大致流程：

1. 早上在家：

   * 簡短對話（父母、新聞、鬧鐘）
2. 上學路上 / 校門口：

   * 遇到同學、路人、可能的事件觸發
3. 校園時段：

   * 教室、走廊、操場、餐廳
   * 主線 / 支線任務觸發的主場景
4. 放學：

   * 可以選擇：

     * 直接回家
     * 跟朋友去某個地方
     * 被 bully 找麻煩
5. 傍晚 / 晚上在家：

   * 回顧今天發生的事（AI 生成 summary）
   * 小的數值調整（壓力、疲勞）
6. 每週結算：

   * 一週小總結（成長報告、與 NPC 關係變化）

## 2.2 角色系統

### 主角屬性（示意）

```ts
interface PlayerStats {
  confidence: number; // 自信
  empathy: number;    // 同理心
  stress: number;     // 壓力
  reputation: number; // 在班級的名聲
}
```

### NPC 屬性（示意）

```ts
interface NpcStats {
  friendship: number; // 跟主角友好度
  trust: number;      // 信任度
  roleTags: string[]; // e.g. ["bully", "victim", "teacher", "parent"]
}
```

每個 NPC 有一份 persona 設定（在資料層 & RAG 裡）：

* 說話風格（害羞、直接、愛開玩笑…）
* 對特定事件/主角的既有印象
* 潛在的故事線（支線任務）

## 2.3 任務系統

### 類型

* 主線任務：

  * 例如：

    * 第一次在班上自我介紹
    * 面對第一次被 bully 場景
    * 和老師談心 / 尋求協助
* 支線任務：

  * 幫同學解決小麻煩
  * 幫忙社區的小事（遺失物、幫忙搬東西）
  * 朋友之間的誤會

### 任務結構（示意）

```ts
interface QuestStepCondition {
  type: "stat" | "dialogue" | "scene";
  key: string;      // e.g. "friendship:Alex" or "scene:Hallway"
  op: ">=" | "<=" | "==" | "includes";
  value: any;
}

interface QuestStep {
  id: string;
  description: string;
  requiredConditions: QuestStepCondition[];
  onEnterEvents?: string[]; // 由系統/AI 決定要觸發哪些事件
}

interface Quest {
  id: string;
  title: string;
  type: "main" | "side";
  steps: QuestStep[];
  rewards?: {
    stats?: Partial<PlayerStats>;
    relationship?: Record<string, number>; // npcId -> 友好度變化
  };
}
```

AI 不直接「創造任務規則」，而是根據這個結構產生/填充內容（描述、對話），保持可控與可測試。

## 2.4 對話系統與分支

* 玩家可以：

  * 選擇多個選項（選項由 AI 建議，也可以部分固定）
  * 在特殊模式下自由輸入英文句子（可選）

* 每次對話都包含：

  * 當前場景、任務進度、角色屬性
  * 近期對話歷史（短期記憶）
  * RAG 抽出的世界觀 / NPC persona / 玩家客製設定

* AI 回應要決定：

  * NPC 說什麼
  * 給玩家哪些合理的回覆選項
  * 哪些數值需要調整（自信、友好度…）
  * 哪些任務步驟推進 / 解鎖

## 2.5 Bully 相關設計（安全重點）

* 禁止 AI 提供：

  * 以暴制暴的鼓勵
  * 自傷、報復、危險行為
* 鼓勵的策略：

  * 找可信的大人
  * 和朋友結盟（多人一起面對，不是單打獨鬥）
  * 記錄事件（遊戲內可視為「日記系統」）
* 技術上：

  * 所有涉及 bully 的對話 / 選項，要經過 `SafetyAgent` 過濾
  * `SafetyAgent` 可以覆寫或改寫部分 LLM 回應

---

# 三、技術架構設計（Architecture）

## 3.1 大架構圖（文字版）

* **前端 Client**

  * 2D 畫面、角色移動、場景切換
  * UI：對話框、選項、狀態列、任務列表
  * 呼叫後端 API（遊戲邏輯 / AI）
* **Game Server**

  * 玩家帳號 & 存檔
  * 任務、場景、NPC 基本資料
  * 提供封裝好的 `/ai/*` API （前端不直接打 LLM）
* **AI Orchestrator**

  * DialogueAgent / QuestPlannerAgent / LoreIngestionAgent / SafetyAgent 等
  * RAG（向量資料庫 + 長期記憶）
  * 工具：讀寫遊戲狀態、查設定、web search（如需要）
* **Image Service**

  * 接 Stable Diffusion / 其他圖像模型
  * 負責產生背景圖、NPC 立繪、物件圖
* **Test / Mock 層**

  * 所有外部服務都有 interface + Mock 版本

## 3.2 前端專案架構（建議）

```text
client/
  src/
    main.ts                # 入口
    core/
      Game.ts              # 主遊戲 loop
      SceneManager.ts      # 場景切換
      InputManager.ts      # 鍵盤/手把輸入
      EventBus.ts          # 事件系統
    rendering/
      Renderer.ts          # 封裝 Canvas / PixiJS
      Camera.ts            # 控制橫向捲動
    game/
      scenes/
        ClassroomScene.ts
        HallwayScene.ts
        StreetScene.ts
        HomeScene.ts
      entities/
        Player.ts
        Npc.ts
      systems/
        QuestSystem.ts
        RelationshipSystem.ts
        DayCycleSystem.ts
        BullySystem.ts
    ui/
      DialogueBox.ts
      ChoiceMenu.ts
      Hud.ts
      Notification.ts
    ai/
      AiClient.ts          # 呼叫後端 /ai API
      AiClientMock.ts      # 測試 / 開發用 mock
    state/
      GameState.ts         # 前端緩存的遊戲狀態
  tests/
    ...
```


# 六、分階段開發建議（你可以給 Codex / LLMProvider 當 roadmap）

1. **Phase 0 – Core Engine**

   * 前端：場景 / 玩家左右移動 / 簡單 UI
   * 後端：玩家存檔 / 靜態任務 / NPC 資料
   * AI：先全部用 MockAiClient
2. **Phase 1 – 實接 LLM（對話）**

   * 實作 DialogueAgent + SafetyAgent（簡單版）
   * /ai/dialogue 真正打 LLM
3. **Phase 2 – RAG & 玩家客製世界觀**

   * VectorStore
   * LoreIngestionAgent
   * 使用者上傳設定檔 -> 更新 RAG
4. **Phase 3 – 圖片生成（Stable Diffusion）**

   * ImageService
   * 場景/NPC 圖像動態生成 + 快取
5. **Phase 4 – 調教材/安全性**

   * Bully 情境完整測試
   * 安全策略調整

好，那現在有兩個關鍵決策敲定了：

1. **前端：純 Canvas（不靠 Pixi/Phaser）**
2. **AI：後端用 Python + PyTorch（LLM/RAG/Agents 都在這一邊）**

---

## 一、技術選擇更新總結

### 前端（瀏覽器）

* 語言：**TypeScript**
* 繪圖：瀏覽器 **Canvas 2D API**，不使用 Pixi/Phaser。
* 任務：

  * 遊戲主迴圈（`update` + `render`）
  * 場景 / 相機 / 實體（玩家、NPC）管理
  * UI（對話框、選項、HUD）
  * 呼叫後端 REST API（遊戲狀態 & AI）

### 後端 + AI

你現在的需求其實超適合直接：

> **全部後端用 Python，遊戲邏輯 + AI 都在同一個 FastAPI 專案裡**

好處是：

* 減少「兩種後端語言」的混亂（不用再多一個 Node 後端）。
* AI Orchestrator / RAG / PyTorch 模型可以跟遊戲狀態服務放一起，少一道溝通成本。
* 你只需要處理：**TS（前端） + Python（後端）** 兩種程式語言。

建議：

* Web Framework：**FastAPI**
* 資料庫庫：SQLAlchemy + PostgreSQL / SQLite（開發用 SQLite 就好）
* AI：

  * LLM：用 API 或本地模型都行 → 包成 `LlmClient`
  * RAG：用了 PyTorch 的 embedding 模型（如 sentence-transformers）+ 自己的 vector store 或現成庫
  * Safety / bully 檢測：可以用簡單 PyTorch 分類器 + rule-based + LLM 二次檢查

---

## 二、專案目錄（新版：TS Canvas + Python 後端）

### 根目錄

```text
project-root/
  client/           # TS + Canvas 遊戲
  backend/          # Python + FastAPI + PyTorch AI
  shared/           # 協議 / schema / 文件（選擇性）
  docs/             # 說明文件
```

### Canvas 遊戲主迴圈概念

簡化一下你之後丟給 Codex 的接口設計：

```ts
// client/src/core/Game.ts
export interface Updatable {
  update(delta: number): void;
}

export interface Renderable {
  render(ctx: CanvasRenderingContext2D): void;
}

export class Game {
  private sceneManager: SceneManager;
  private lastTimestamp = 0;

  constructor(private ctx: CanvasRenderingContext2D) {
    this.sceneManager = new SceneManager();
  }

  start() {
    requestAnimationFrame(this.loop);
  }

  private loop = (timestamp: number) => {
    const delta = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    this.update(delta);
    this.render();

    requestAnimationFrame(this.loop);
  };

  private update(delta: number) {
    this.sceneManager.update(delta);
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.sceneManager.render(ctx);
  }
}
```

之後你可以叫 Codex 幫你：

* 實作 `SceneManager`（管理目前場景）
* 實作 `ClassroomScene` 這種東西，提供 `update` / `render`
* 實作 `Player` / `Npc` 的繪圖邏輯（簡單 sprite）

---

## 四、後端：Python + FastAPI + PyTorch

### 目錄（backend）

```text
backend/
  app/
    main.py                # FastAPI 入口
    api/
      game.py              # /player /game/scene /game/quests ...
      ai.py                # /ai/dialogue /ai/planQuest /ai/ingestLore ...
      assets.py            # /assets/generateImage /assets/image/{id}
    core/
      config.py
      db.py                # SQLAlchemy Session
    game/
      models.py            # ORM：Player, Quest, Scene, Npc, DialogueLog
      schemas.py           # Pydantic：PlayerState, QuestDefinition ...
      services/
        player_service.py
        quest_service.py
        scene_service.py
        relationship_service.py
        dialogue_log_service.py
    ai/
      orchestrator/
        dialogue_agent.py
        quest_planner_agent.py
        lore_ingestion_agent.py
        safety_agent.py
        memory_agent.py
      rag/
        vector_store.py        # 向量儲存、查詢
        embedder.py            # PyTorch embedding 模型（sentence-transformers 之類）
      models/
        bully_classifier.py    # PyTorch 分類器（判斷對話是否涉及霸凌、自傷等）
      clients/
        llm_client.py          # 呼叫外部 LLM
        image_client.py        # Stable Diffusion / 其他繪圖 API
        web_search_client.py   # 如果要真上網查
        mocks/
          llm_client_mock.py
          image_client_mock.py
          ...
    data/
      lore/
        base_lore.md
        school_rules.md
      npcs/
        base_npcs.json
      quests/
        base_quests.json
      scenes/
        base_scenes.json
      user_custom/
        # per playerId
  tests/
    test_dialogue_agent.py
    test_bully_classifier.py
    ...
```

### FastAPI API 大致樣子（示意）

```py
# backend/app/main.py
from fastapi import FastAPI
from app.api import game, ai, assets

app = FastAPI()

app.include_router(game.router, prefix="/game", tags=["game"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(assets.router, prefix="/assets", tags=["assets"])
```

```py
# backend/app/api/ai.py
from fastapi import APIRouter, Depends
from app.game.schemas import DialogueRequest, DialogueResponse
from app.ai.orchestrator.dialogue_agent import DialogueAgent

router = APIRouter()

def get_dialogue_agent() -> DialogueAgent:
  # 之後用 DI 實作，測試時可丟 mock 進來
  ...

@router.post("/dialogue", response_model=DialogueResponse)
async def dialogue(
    req: DialogueRequest,
    agent: DialogueAgent = Depends(get_dialogue_agent),
):
    return await agent.handle(req)
```

---

## 五、Python AI Orchestrator + PyTorch 整合

### DialogueAgent Python 版架構（示意）

```py
# backend/app/ai/orchestrator/dialogue_agent.py
from typing import List
from app.game.schemas import DialogueRequest, DialogueResponse
from app.game.services.player_service import PlayerService
from app.game.services.scene_service import SceneService
from app.ai.rag.vector_store import VectorStore
from app.ai.clients.llm_client import LlmClient
from app.ai.orchestrator.safety_agent import SafetyAgent

class DialogueAgent:
    def __init__(
        self,
        player_service: PlayerService,
        scene_service: SceneService,
        vector_store: VectorStore,
        llm_client: LlmClient,
        safety_agent: SafetyAgent,
    ) -> None:
        self.player_service = player_service
        self.scene_service = scene_service
        self.vector_store = vector_store
        self.llm_client = llm_client
        self.safety_agent = safety_agent

    async def handle(self, req: DialogueRequest) -> DialogueResponse:
        # 1. 取得遊戲狀態
        player_state = await self.player_service.get_state(req.player_id)
        npc_state = await self.player_service.get_npc_state(req.player_id, req.npc_id)
        scene = await self.scene_service.get_scene(req.scene_id)

        # 2. 從 RAG 搜尋相關 world lore
        lore_chunks = await self.vector_store.search(
            query_terms=[req.npc_id, req.scene_id], top_k=5
        )

        # 3. 組 prompt
        prompt = self._build_prompt(req, player_state, npc_state, scene, lore_chunks)

        # 4. 呼叫 LLM
        raw_output = await self.llm_client.complete(prompt)

        # 5. safety 檢查
        safe_output = await self.safety_agent.filter_dialogue(raw_output, context=req)

        # 6. 解析 LLM JSON 輸出 → DialogueResponse
        response = self._parse_output(safe_output)

        # 7. 更新遊戲狀態（屬性、任務等）
        await self.player_service.apply_effects(
            player_id=req.player_id,
            npc_id=req.npc_id,
            effects=response.internal_effects,
        )

        return response

    def _build_prompt(self, ...):
        # 實際組字串，略
        ...

    def _parse_output(self, raw: str) -> DialogueResponse:
        # json.loads + 驗證，略
        ...
```

### PyTorch 用在哪裡？

幾個實際點：

1. **Embedding 模型（RAG）**

   * `embedder.py` 使用 `sentence-transformers` / HuggingFace 模型（底層就是 PyTorch）：

     * 把世界觀文檔、玩家自訂設定、對話摘要 → 向量
     * 存到 `vector_store.py`（可以用 faiss 或簡單 cosine 搜尋）

2. **Safety / bully 檢測**

   * `bully_classifier.py`：簡單的文本分類模型

     * 輸入：玩家 & NPC 一句話
     * 輸出：是否包含霸凌、自殘、暴力傾向
   * `SafetyAgent`：

     * 先走 PyTorch 分類器 → 高風險再丟 LLM 重新包裝回 safer 回應

3. **（可選）行為規劃 / policy 模型**

   * 之後如果你要更進階，可以用 PyTorch 做 NPC 行為 policy，但這是之後的事情，現在不用想太多。

---

## 六、Mock / Stub：Python + TS 雙邊的作法

### 後端（Python）Mock LlmClient 範例

```py
# backend/app/ai/clients/llm_client.py
from typing import Protocol

class LlmClient(Protocol):
    async def complete(self, prompt: str) -> str:
        ...
```

```py
# backend/app/ai/clients/mocks/llm_client_mock.py
import json
from app.ai.clients.llm_client import LlmClient

class LlmClientMock(LlmClient):
    async def complete(self, prompt: str) -> str:
        # 回傳固定 JSON
        return json.dumps({
            "npcText": "Mock: Hi, I'm just a fake reply.",
            "suggestedPlayerChoices": [
                "Mock choice A",
                "Mock choice B"
            ],
            "internalEffects": {
                "playerStatsDelta": {"confidence": 2}
            }
        })
```

測試時：

```py
# backend/tests/test_dialogue_agent.py
import pytest
from app.ai.orchestrator.dialogue_agent import DialogueAgent
from app.ai.clients.mocks.llm_client_mock import LlmClientMock

@pytest.mark.asyncio
async def test_dialogue_agent_basic():
    agent = DialogueAgent(
        player_service=...,    # 用 mock 或 fake
        scene_service=...,
        vector_store=...,
        llm_client=LlmClientMock(),
        safety_agent=...,
    )
    req = DialogueRequest(...)  # 建一個測試 request
    resp = await agent.handle(req)

    assert resp.npc_text.startswith("Mock")
    assert len(resp.suggested_player_choices) >= 2
```

### 前端（TS）AiClient Mock

這部分跟我前面講的差不多：

```ts
export interface AiClient {
  getNpcReply(req: DialogueRequest): Promise<DialogueResponse>;
}

export class AiClientMock implements AiClient {
  async getNpcReply(req: DialogueRequest): Promise<DialogueResponse> {
    return {
      npcText: `Mock: Hello from NPC ${req.npcId}`,
      suggestedPlayerChoices: ["Hi!", "Leave me alone..."],
      internalEffects: {
        playerStatsDelta: { confidence: 1 }
      }
    };
  }
}
```
