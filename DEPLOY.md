# GitHub Pagesへのデプロイ手順

このガイドでは、パズル&ドラゴンズ風パズルゲームをGitHub Pagesにデプロイする方法を説明します。

## 前提条件

- GitHubアカウントを持っていること
- Gitがインストールされていること

## デプロイ手順

### 1. GitHubで新しいリポジトリを作成

1. [GitHub](https://github.com)にアクセスしてログイン
2. 右上の「+」ボタンをクリックして「New repository」を選択
3. リポジトリ名を入力（例: `puzzle-dragons-game`）
4. 「Public」を選択（GitHub Pagesは公開リポジトリで無料）
5. 「Create repository」をクリック

### 2. ローカルリポジトリを初期化してプッシュ

プロジェクトディレクトリで以下のコマンドを実行：

```bash
# Gitリポジトリを初期化
git init

# すべてのファイルをステージング
git add .

# 最初のコミット
git commit -m "Initial commit: Puzzle & Dragons game"

# メインブランチに変更
git branch -M main

# リモートリポジトリを追加（<username>と<repository>を自分のものに置き換え）
git remote add origin https://github.com/<username>/<repository>.git

# GitHubにプッシュ
git push -u origin main
```

### 3. GitHub Pagesを有効化

1. GitHubのリポジトリページに移動
2. 「Settings」タブをクリック
3. 左サイドバーの「Pages」をクリック
4. 「Source」セクションで以下を選択：
   - Branch: `main`
   - Folder: `/ (root)`
5. 「Save」をクリック

### 4. デプロイの確認

数分後、GitHub Pagesのセクションに以下のようなURLが表示されます：

```
Your site is live at https://<username>.github.io/<repository>/
```

このURLにアクセスすると、ゲームがプレイできます！

## トラブルシューティング

### ページが表示されない場合

1. GitHub Pagesの設定が正しいか確認
2. リポジトリが公開（Public）になっているか確認
3. `index.html`がルートディレクトリにあるか確認
4. 数分待ってから再度アクセス

### 更新が反映されない場合

```bash
# 変更をコミットしてプッシュ
git add .
git commit -m "Update game"
git push
```

数分後に自動的に再デプロイされます。

## カスタムドメインの設定（オプション）

独自ドメインを使用したい場合：

1. GitHub Pagesの設定ページで「Custom domain」にドメインを入力
2. DNSプロバイダーでCNAMEレコードを設定
3. 詳細は[GitHub公式ドキュメント](https://docs.github.com/ja/pages/configuring-a-custom-domain-for-your-github-pages-site)を参照

## 完了！

これでパズル&ドラゴンズ風パズルゲームが世界中からアクセス可能になりました！🎉
