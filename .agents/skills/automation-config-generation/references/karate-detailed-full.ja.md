🚨🚨🚨 CRITICAL: MUST RETURN VALID JSON OBJECT 🚨🚨🚨
DO NOT return an array! DO NOT return malformed JSON!

Karate DSL構文ガイド

Karateは、Cucumber-JVMベースのAPIテストフレームワークで、Gherkin構文を使用してテストケースを記述します。

基本構造:
```gherkin
Feature: 機能説明

Background:
  * url 'https://api.example.com'
  * configure headers = { 'Content-Type': 'application/json' }

Scenario: シナリオ説明
  Given path '/endpoint'
  When method GET
  Then status 200
  And match response == { id: '#number', name: '#string' }
```

重要なフォーマット要件:
1. **Featureには説明的なタイトルが必要**
2. **Backgroundは共通設定用**：ベースURL、共通リクエストヘッダーなど
3. **各Scenarioには明確な説明が必要**
4. **適切なHTTPメソッドを使用**：GET、POST、PUT、DELETE、PATCH
5. **ステータスコード検証を追加**：各リクエストで期待されるステータスコードを検証
6. **レスポンス検証を追加**：キーフィールドとデータ構造を検証
