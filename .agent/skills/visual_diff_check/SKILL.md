---
name: visual_diff_check
description: UI変更の前後にスクリーンショットを撮影し、変更点を視覚的に比較検証・報告するスキル。
---

# Visual Diff Check (ビジュアル比較検証)

ユーザーが「画面の見た目を変える」タスクを要求した場合、またはコード変更がUIに影響を与える場合、このスキルを使用して変更前後の比較画像を生成します。

## 📸 Workflow

### Step 1: Baseline Capture (Before)
コードを変更する**前**に、現状のUIを記録します。

1.  対象のページURLを特定します（例: `http://localhost:3000/dashboard`）。
2.  `browser_subagent` を使用してスクリーンショットを撮影します。
    *   **Action**: "Navigate to [URL] and take a screenshot."
    *   **RecordingName**: `[feature_name]_before_capture`
    *   **Expected Artifact**: `[feature_name]_before.png` (または類似の名前で保存されることを確認)

### Step 2: Implementation (Modify)
通常通りコードの編集を行い、UIの変更を実装します。

### Step 3: Verification Capture (After)
変更が完了した後、再度スクリーンショットを撮影します。

1.  ローカルサーバーが起動していることを確認します。
2.  `browser_subagent` を使用してスクリーンショットを撮影します。
    *   **Action**: "Navigate to [URL] and take a screenshot of the updated UI."
    *   **RecordingName**: `[feature_name]_after_capture`
    *   **Expected Artifact**: `[feature_name]_after.png`

### Step 4: Report Generation (Compare)
`walkthrough.md` または `notify_user` のメッセージ内で、画像を並べて表示します。

```markdown
# Visual Verification: [Feature Name]

| Before Modification | After Modification |
| :---: | :---: |
| ![Before](/path/to/artifacts/[feature_name]_before.png) | ![After](/path/to/artifacts/[feature_name]_after.png) |

**Changes:**
- ...
```

## ⚠️ Tips
- **Naming**: ファイル名は `feature_before.png`, `feature_after.png` のように一貫性を持たせてください。
- **Environment**: スクリーンショット撮影時は、ブラウザのウィンドウサイズを統一すること（例: 1280x800）。
- **Dynamic Content**: グラフやリアルタイムデータが含まれる場合、モックデータを使用するか、タイミングによる差異であることを注記してください。
