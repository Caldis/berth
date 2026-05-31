import type { Article } from './types'

const CC_HOOKS = { title: 'Claude Code — Hooks ガイド', url: 'https://code.claude.com/docs/en/hooks-guide', note: '一次情報。Hook のイベントとライフサイクル。' }
const CC_SETTINGS = { title: 'Claude Code — Settings', url: 'https://code.claude.com/docs/en/settings', note: '一次情報。disableAllHooks を含む settings.json。' }
const CC_COSTS = { title: 'Claude Code — Costs', url: 'https://code.claude.com/docs/en/costs', note: '一次情報。使用量とコストがどう追跡されるか。' }
const CC_MEMORY = { title: 'Claude Code — Memory', url: 'https://code.claude.com/docs/en/memory', note: '一次情報。CLAUDE.md のスコープとインポート。' }
const CC_MCP = { title: 'Claude Code — MCP', url: 'https://code.claude.com/docs/en/mcp', note: '一次情報。MCP サーバーの project スコープと user スコープ。' }

export const guidesJa: Article[] = [
  {
    slug: 'why-isnt-my-hook-firing',
    pillar: 'guides',
    lang: 'ja',
    order: 1,
    title: 'Hook が発火しないのはなぜ?',
    summary: '一度も実行されない Hook を、Berth が見せてくれる情報を使って切り分ける短いチェックリスト。',
    lead: '何も言わずに一度も実行されない Hook は、エージェント設定における最もよくある謎の一つです。ここでは、それを Berth で突き止める方法を紹介します。',
    body: [
      { type: 'h2', text: '1. イベント名は正しいか?' },
      { type: 'p', text: 'Hooks は特定のライフサイクルイベントで発火します (例: ツール呼び出しの前の PreToolUse、後の PostToolUse)。イベント名が実在のイベントと一致しなければ、Hook は一度も実行されません。Berth は各 Hook がいつ発火する設定になっているかを示します。' },
      { type: 'h2', text: '2. Hooks が全体で無効化されていないか?' },
      { type: 'p', text: 'disableAllHooks の設定は、すべての Hook を一度にオフにします。Berth のヘルスチェックがこれを浮かび上がらせます — 最初に除外して確認すべき点です。' },
      { type: 'h2', text: '3. マッチャーが狭すぎないか?' },
      { type: 'p', text: '多くの Hook は、特定のツールを狙うためにマッチャーを使います。マッチャーが、あなたが使っているツールと一致しなければ、何も起こりません。セッションのツールタイムラインにあるツール名と、マッチャーを照らし合わせて確認しましょう。' },
      { type: 'h2', text: '4. コマンドのファイルは存在するか?' },
      { type: 'p', text: 'Hook はコマンドやスクリプトを指し示します。パスが間違っていたり、ファイルが見つからなかったりすると、Hook は実行できません。Berth はヘルスチェックで Hook のエントリのパスを検証します。' },
      { type: 'callout', label: '最短ルート', text: 'Capabilities → Hooks を開き、その Hook のライフサイクルビューとヘルスチェックを読めば、たいていは 1 分かからずに壊れたリンクが見つかります。' },
    ],
    sources: [CC_HOOKS, CC_SETTINGS],
  },
  {
    slug: 'understand-your-cost',
    pillar: 'guides',
    lang: 'ja',
    order: 2,
    title: 'コストを読み解く',
    summary: 'Berth の Usage 画面を読んで、何が高くついているのか、そしてなぜかを — モデル別、プロジェクト別、日別に見つけます。',
    lead: 'AI エージェントのコストは謎めいて感じられがちです。Berth の Usage 画面は、それを読める 3 つのビューに変えます。',
    body: [
      { type: 'h2', text: 'まずは 3 つの内訳から' },
      { type: 'list', items: [
        'モデル別 — どのモデルが最もコストを生むか (例: フロンティアモデル vs より小さいモデル)。',
        'プロジェクト別 — 支出がどこに向かっているか。',
        '日別 — いつ跳ね上がったか。',
      ] },
      { type: 'h2', text: 'トークンが物語を語る' },
      { type: 'p', text: 'コストはトークンに従います。入力、出力、そしてキャッシュ。大きなファイルを毎ターン読み直すセッションは入力トークンを消費し、長い生成は出力トークンを消費します。Berth はトークンを内訳で示すので、合計だけでなく原因が見えます。' },
      { type: 'h2', text: 'レート制限に気を配る' },
      { type: 'p', text: 'Berth はレート制限の余裕を見える状態に保つので、動作が遅くなったときに、謎の停滞ではなく「制限に近づいている」と読み取れます。' },
      { type: 'callout', label: 'コストが「不明 (unknown)」と表示されるとき', text: 'セッションに課金データがない場合、Berth は誤解を招く $0 ではなく「不明 (unknown)」と表示します — だから、それが無料なのではなく欠けているのだと分かります。' },
    ],
    sources: [CC_COSTS],
  },
  {
    slug: 'team-config-baseline',
    pillar: 'guides',
    lang: 'ja',
    order: 3,
    title: 'チームの設定ベースラインを定める',
    summary: 'スコープとインポートを使って、チームに共有された予測可能なエージェント構成を与え、それをヘルスチェックで検証します。',
    lead: '複数の人が一つのプロジェクトを共有するとき、「自分のマシンでは動く」は現実のリスクです。明確なスコープのベースラインが、それを解決します。',
    body: [
      { type: 'h2', text: '1. 何を project スコープに置くかを決める' },
      { type: 'p', text: 'user スコープのアセットは個人のもので、project スコープのアセットはリポジトリとともに配布され、全員に適用されます。共有の規約、skills、MCP サーバーは project スコープに置き、チーム全体がそれを継承するようにしましょう。' },
      { type: 'h2', text: '2. 共有の指示をインポートする' },
      { type: 'p', text: 'プロジェクトの CLAUDE.md は @path を通じて共有ファイルをインポートできます (例: AGENTS.md のインポート)。Berth はインポート連鎖を解決するので、全員が本当に同じ指示を受け取っていることを確認できます。' },
      { type: 'h2', text: '3. ヘルスチェックで検証する' },
      { type: 'p', text: '共有する前に、Berth のヘルスチェックを一通り実行しましょう。欠けたインポート、壊れたパス、コンフリクトするスコープ定義 — すべてここに表示されます。一度直してしまえば、チームは「正常と分かっている」ベースラインから始められます。' },
      { type: 'callout', label: 'なぜスコープが要なのか', text: '「自分では動くのに他の人では動かない」問題のほとんどは、スコープの問題です。実効的でマージされた構成を見ることが、構成を再現可能にする方法です。' },
    ],
    sources: [CC_MEMORY, CC_MCP],
  },
]
