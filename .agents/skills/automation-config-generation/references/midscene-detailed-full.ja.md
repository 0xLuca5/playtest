.yamlファイルの構造は以下の通りです：
.yamlファイルには、web/androidとtasksの2つの部分があります。
web/android部分はタスクの基本情報を定義し、ブラウザ自動化にはwebパラメータ（旧称target）を使用し、Androidデバイス自動化にはandroidパラメータを使用します。これら2つは相互排他的です。

#web部分
```yaml
web:
  # アクセスするURL、必須。`serve`パラメータが提供されている場合は相対パスを提供
  url: <url>
  # ローカルパスで静的サービスを開始、オプション
  serve: <root-directory>
  # ブラウザUA、オプション
  userAgent: <ua>
  # ブラウザビューポート幅、オプション、デフォルト1280
  viewportWidth: <width>
  # ブラウザビューポート高さ、オプション、デフォルト960
  viewportHeight: <height>
  # ブラウザデバイスピクセル比、オプション、デフォルト1
  deviceScaleFactor: <scale>
  # JSON形式のブラウザCookieファイルパス、オプション
  cookie: <path-to-cookie-file>
  # ネットワークアイドル待機戦略、オプション
  waitForNetworkIdle:
    # 待機タイムアウト時間、オプション、デフォルト2000ms
    timeout: <ms>
    # タイムアウト後に続行するかどうか、オプション、デフォルトtrue
    continueOnNetworkIdleError: <boolean>
  # aiQuery/aiAssert結果のJSONファイルパス、オプション
  output: <path-to-output-file>
  # ログ内容をJSONファイルに保存するかどうか、オプション、デフォルトfalse
  unstableLogContent: <boolean | path-to-unstable-log-file>
  # ページを現在のタブで開くことを制限するかどうか、オプション、デフォルトtrue
  forceSameTabNavigation: <boolean>
  # ブリッジモード、オプション、デフォルトfalse
  bridgeMode: false | 'newTabWithUrl' | 'currentTab'
  # ブリッジ切断時に新しく作成されたタブを閉じるかどうか、オプション、デフォルトfalse
  closeNewTabsAfterDisconnect: <boolean>
  # HTTPS証明書エラーを無視するかどうか、オプション、デフォルトfalse
  acceptInsecureCerts: <boolean>
  # aiAction呼び出し時にAIモデルに送信する背景知識、オプション
  aiActionContext: <string>
```

# android部分
```yaml
android:
  # デバイスID、オプション、デフォルトで最初に接続されたデバイスを使用
  deviceId: <device-id>
  # 起動URL、オプション、デフォルトでデバイスの現在のページを使用
  launch: <url>
```

# tasks部分
tasks部分は配列で、スクリプト実行のステップを定義します。各ステップの前に-記号を追加することを忘れずに、これらのステップが配列であることを示します。

[続く...]
