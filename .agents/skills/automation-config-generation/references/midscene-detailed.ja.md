## Midscene YAML 生成ガイド（要点）

🚨 重要：応答は **必ず有効な JSON オブジェクト** を返してください（配列は禁止）。

### JSON 形式（必須）
```json
{
  "success": true,
  "config": {
    "name": "string",
    "framework": "midscene",
    "description": "string",
    "yamlContent": "string with \\n for line breaks"
  }
}
```

### 禁止事項
- `\u00a0` / `\u000a` など Unicode escape の使用禁止
- 改行は `\n` を使用し、インデントは通常のスペースで表現

### YAML 構造
`.yaml` は `web/android` と `tasks` の2部構成。
- ブラウザ自動化：`web`
- Android：`android`

### 重要ルール
- `web` ノードには以下を必ず含める：
  - `output: ./data/automation/testcase-id/result.json`
  - `unstableLogContent: ./data/automation/testcase-id/log.json`
- ユーザーがテストステップを提供した場合、各ステップに対応する `task` を作成（1対1）
- 各 `task` には `logScreenshot` と `aiAssert` を必ず入れる
