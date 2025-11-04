# MIMEタイプとは？

## 概要

MIMEタイプ（Multipurpose Internet Mail Extensions）は、インターネット上で送受信されるファイルの種類や形式を識別するための標準的な方法です。

## なぜ必要か？

ブラウザがファイルを正しく処理するために必要です。

### 例：
- **JavaScriptファイル**（`.js`）が `application/javascript` として配信されない場合
  - ブラウザが「バイナリデータ」として扱う
  - スクリプトとして実行されない
  - エラー: `Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of "application/octet-stream"`

- **CSSファイル**（`.css`）が `text/css` として配信されない場合
  - スタイルが適用されない

- **画像ファイル**が正しいMIMEタイプで配信されない場合
  - 画像が表示されない

## 現在の問題

Azure Static Web Appsで、JavaScriptファイルが `application/octet-stream` として配信されているため、ブラウザがモジュールスクリプトとして認識できません。

## 解決方法

`staticwebapp.config.json` の `mimeTypes` 設定で、拡張子ごとに正しいMIMEタイプを指定します。

### 正しいMIMEタイプ設定

```json
{
  "mimeTypes": {
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".json": "application/json"
  }
}
```

**注意**: `charset=utf-8` はMIMEタイプの値には含めません。Content-Typeヘッダーで設定する場合は `application/javascript; charset=utf-8` としますが、`mimeTypes`設定では `application/javascript` だけで十分です。

## Azure Static Web Appsでの設定方法

Azure Static Web Appsでは、`staticwebapp.config.json` のルートディレクトリ（デプロイ後の`dist`ディレクトリ）に配置する必要があります。

### 設定の優先順位

1. **`routes`配列での`headers`設定**（特定のルートに適用）
2. **`mimeTypes`設定**（拡張子ベース、全体的に適用）

`mimeTypes`設定が最もシンプルで推奨される方法です。

