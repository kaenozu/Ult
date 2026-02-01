## 問題の概要
.gitディレクトリが865MBと極めて大きくなっており、リポジトリのクローンとフェッチに時間がかかっています。

## 問題の詳細
```bash
$ du -sh .git
865M    .git
```

通常のプロジェクトで.gitが数百MBになるのは以下の原因が考えられます：
1. 過去にコミットされた大きなバイナリファイル
2. 過去にコミットされたnode_modules
3. 過去にコミットされた.nextビルド成果物
4. 過去にコミットされたログファイル
5. 大きな画像/動画ファイル

## 修正案
1. git履歴から大きなファイルを削除（git filter-repoまたはBFG Repo-Cleaner使用）
   ```bash
   # BFG Repo-Cleanerの使用例
   java -jar bfg.jar --delete-files '*.log' .
   java -jar bfg.jar --delete-folders node_modules .
   java -jar bfg.jar --delete-folders .next .
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

2. .gitignoreの強化
   - すべてのログファイルを除外
   - ビルド成果物を除外
   - 依存関係を除外

3. 今後の防止策
   - pre-commitフックで大きなファイルのコミットを防止
   - CIでリポジトリサイズを監視

## 優先度
**High** - 開発効率に影響

## 影響
- git cloneに数分〜数十分かかる
- CIパイプラインの遅延
- ストレージコストの増加
- チーム全体の生産性低下

## 関連Issue
- #311: ログファイルの削除
- #312: .nextビルド成果物の削除
- #313: node_modulesの削除

Closes #315
