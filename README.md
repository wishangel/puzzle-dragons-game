# パズル&ドラゴンズ風パズルゲーム

パズル&ドラゴンズのパズル部分を再現したWebゲームです。

## 🎮 機能

- **直感的な操作**: スマホとPCの両方で快適にプレイ可能
- **ドロップの種類選択**: 火・水・木・光・闇・回復から自由に選択
- **連鎖システム**: 3つ以上揃えると消去、自動で連鎖を検出
- **美しいビジュアル**: モダンなグラデーションとアニメーション
- **カスタマイズ可能**: ボードサイズを変更可能（5×4、6×5、7×6）

## 🚀 プレイ方法

1. ドロップをドラッグして移動
2. 同じ色のドロップを3つ以上揃える
3. 連鎖を繋げて高得点を狙おう！

## 🛠️ 技術スタック

- HTML5 Canvas
- CSS3 (グラデーション、アニメーション)
- Vanilla JavaScript (ES6+)

## 📦 デプロイ

GitHub Pagesで公開可能です。

```bash
# リポジトリをGitHubにプッシュ
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main

# GitHub Pagesを有効化
# Settings > Pages > Source: main branch
```

## 🎯 カスタマイズ

### ドロップの種類を変更
`index.html`のドロップ選択UIで、利用するドロップを選択できます。

### ボードサイズを変更
設定パネルから5×4、6×5、7×6のいずれかを選択できます。

## 📄 ライセンス

MIT License

## 🙏 謝辞

このプロジェクトは「パズル&ドラゴンズ」にインスパイアされて作成されました。
