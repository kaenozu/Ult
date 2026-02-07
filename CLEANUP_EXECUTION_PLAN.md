# リポジトリ完全クリーンアップ - 実施計画

## 🎯 目標

```
現在: 474 MB
目標: <100 MB
削減率: 75%以上
```

## 📋 実施手順

### Step 1: 準備（5分）

```bash
# 1. バックアップ作成（必須）
cd ..
cp -r Ult Ult-backup-$(date +%Y%m%d-%H%M%S)
cd Ult

# 2. ブランチ確認
git branch -a

# 3. リモートURL確認
git remote -v
```

### Step 2: ツール選択と実行

#### 方法A: git-filter-repo（推奨・最も確実）

```bash
# Python環境の確認
python3 --version  # または python --version

# git-filter-repo インストール
pip3 install git-filter-repo
# または
pip install git-filter-repo

# 実行（.next/ を完全に削除）
git-filter-repo --path .next --invert-paths

# 結果確認
ls -la .git
```

#### 方法B: BFG Repo-Cleaner（Java必須）

```bash
# Javaインストール確認
java -version

# BFGダウンロード
curl -O https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# 実行
java -jar bfg-1.14.0.jar --delete-folders .next

# クリーンアップ
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 結果確認
du -sh .git
```

#### 方法C: 手動フィルタリング（最後の手段）

```bash
# 新しいブランチでクリーンな履歴を作成
git checkout --orphan clean-history

# ファイル追加（.gitignoreに従って.nextは除外）
git add -A

# コミット
git commit -m "Initial clean commit"

# ブランチ入れ替え
git branch -m main old-main
git branch -m clean-history main

# 強制プッシュ（注意：履歴が変わります）
git push origin main --force
```

### Step 3: 検証（10分）

```bash
# サイズ確認
du -sh .git
git count-objects -vH

# 大きなファイルが残っていないか確認
git rev-list --objects --all | \
    git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
    sed -n 's/^blob //p' | \
    sort --numeric-sort --key=2 --reverse | \
    head -20 | \
    awk '{printf "%.2f MB\t%s\n", $2/1024/1024, $3}'
```

### Step 4: 強制プッシュ（5分）

```bash
# 全ブランチを強制プッシュ
git push origin --force --all
git push origin --force --tags
```

### Step 5: チーム通知（重要！）

**以下をチームに通知:**

```
🚨 緊急: Git履歴が書き換わりました

全員、以下を実行してください：

git fetch origin
git reset --hard origin/main

# またはリポジトリを再クローン:
git clone https://github.com/kaenozu/Ult.git
```

---

## ⚠️ 注意事項

1. **バックアップ必須** - 実行前に必ずバックアップを作成
2. **チーム連携** - 全員に通知してから実行
3. **CI/CD確認** - パイプラインに影響がないか確認
4. **作業ブランチ** - 未マージのブランチがある場合は注意

---

## 🎬 推奨タイミング

- **平日の夜間**または**週末**
- 全員が作業していない時間帯
- CI/CDパイプラインが停止している時間帯

---

## 📊 期待される結果

| 項目 | 現在 | 目標 |
|------|------|------|
| .git サイズ | 474 MB | <100 MB |
| pack サイズ | 471 MB | <50 MB |
| クローン時間 | 5分+ | <1分 |

---

**準備ができたら「開始」とお知らせください。**
