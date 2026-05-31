import type { Article } from './types'

const CC_OVERVIEW = { title: 'Claude Code — 概要', url: 'https://code.claude.com/docs/en/overview', note: 'Claude Code とは何か、どんなアセットを使うかの一次情報。' }
const CC_SKILLS = { title: 'Claude Code — Skills', url: 'https://code.claude.com/docs/en/skills', note: '一次情報。SKILL.md の構造と段階的開示 (progressive disclosure)。' }
const CC_SUBAGENTS = { title: 'Claude Code — Subagents', url: 'https://code.claude.com/docs/en/sub-agents', note: '一次情報。隔離された専門化アシスタント。' }
const CC_HOOKS = { title: 'Claude Code — Hooks ガイド', url: 'https://code.claude.com/docs/en/hooks-guide', note: '一次情報。ライフサイクルのシェルコマンド。' }
const CC_MEMORY = { title: 'Claude Code — Memory', url: 'https://code.claude.com/docs/en/memory', note: '一次情報。CLAUDE.md のスコープとインポート。' }
const CC_MCP = { title: 'Claude Code — MCP', url: 'https://code.claude.com/docs/en/mcp', note: '一次情報。外部のツールとデータを接続する。' }
const MCP_INTRO = { title: 'Model Context Protocol — はじめに', url: 'https://modelcontextprotocol.io/docs/getting-started/intro', note: '一次情報。「AI のための USB-C」という枠組み。' }

export const featuresJa: Article[] = [
  {
    slug: 'asset-model',
    pillar: 'features',
    lang: 'ja',
    order: 1,
    title: 'アセットモデル: Berth が実際に見せてくれるもの',
    summary: 'Berth は、エージェントの背後にあるプレーンテキストのファイルを、構造化され相互に結びついたオブジェクト — Berth が「アセット」と呼ぶもの — に変えます。ここではそのモデルを紹介します。',
    lead: 'Berth のすべては、一つの考えの上に成り立っています。あなたの AI エージェントのふるまいを形づくるファイルはアセットであり、アセットは見えて、検索でき、互いに関連づけられるべきだ、という考えです。',
    body: [
      { type: 'p', text: 'アセットとは、AI エージェントの動作を形づくる、あらゆるファイルや設定のことです。Berth はそれらを、アプリ全体を通して目にする 2 つのファミリーにまとめます。' },
      { type: 'h2', text: 'Instructions — エージェントが何をすべきか' },
      { type: 'p', text: 'Memories (CLAUDE.md / AGENTS.md)、Skills、Subagents、Commands、Output Modes、Agent Teams。これらは、作業の前と最中にふるまいを導くテキストです。' },
      { type: 'h2', text: 'Capabilities — エージェントが何をできるか' },
      { type: 'p', text: 'MCP サーバー、Hooks、Permissions (権限)、環境変数、Status lines、Plugins。これらはエージェントの実行時の力と境界を定義します。' },
      { type: 'callout', label: '要点', text: '散らばったテキストファイルが、閲覧・検索・追跡できる第一級のオブジェクトになります — しかも、それらの間の関係が見える状態で。' },
      { type: 'p', text: 'v0.1 は読み取り専用です。Berth はこれらのファイルを表示するために読み取るだけで、書き込むことは決してありません。API キーなどの認証情報は状態確認のためだけに検出され、表示されることはありません。' },
    ],
    sources: [CC_OVERVIEW, CC_MEMORY],
  },
  {
    slug: 'overview-and-sessions',
    pillar: 'features',
    lang: 'ja',
    order: 2,
    title: 'Overview と Sessions: 活動と履歴を見る',
    summary: '一目で分かるダッシュボード、そして過去のセッションを、それぞれが使ったアセットやツールとともにさかのぼる方法。',
    lead: 'Berth の 2 つの画面が、日々の疑問に答えます。「いま自分は何を持っているのか?」と「あのセッションでは何が起きたのか?」です。',
    body: [
      { type: 'h2', text: 'Overview' },
      { type: 'p', text: '一つのダッシュボードに集約します。Skills、MCP サーバー、プラグインがいくつあるか、直近のセッション、今週の支出、そして設定の問題を知らせるヘルスチェック。' },
      { type: 'h2', text: 'Sessions' },
      { type: 'p', text: 'プロジェクトや日付ごとにまとめられた過去のセッションを閲覧できます。各セッションには、読み込んだ Skills、接続した MCP サーバー、発火した Hooks、生み出した成果物 (プラン、ToDo、ファイル履歴) が表示され、さらに何が順番に実行されたかのツールタイムラインも見られます。' },
      { type: 'callout', label: 'なぜセッションが重要か', text: 'セッションとは、一回のエージェント実行の完全な記録です。それを読み返すことが、あなたの構成が実際に何をしたのか — そしていくらかかったのか — を学ぶ方法です。' },
    ],
    sources: [CC_OVERVIEW],
  },
  {
    slug: 'configuration-instructions',
    pillar: 'features',
    lang: 'ja',
    order: 3,
    title: 'Configuration · Instructions: memories、skills、subagents',
    summary: 'エージェントを導く instruction (指示) 系アセット、そして Berth がそのスコープ、インポート、各々の出どころをどう見せるか。',
    lead: 'Instructions は、エージェントに何をすべきかを伝えるテキストです。Berth はそれらを並べて見せるので、何が読み込まれ、どのスコープから来ていて、ファイルがどう連鎖しているかが分かります。',
    body: [
      { type: 'h2', text: 'Memories' },
      { type: 'p', text: 'CLAUDE.md と AGENTS.md は、エージェントが作業の最初に読み込む、永続的な指示です。Berth はそのスコープ (user / project / enterprise) を示し、@path のインポート連鎖を解決します — 壊れたリンクも含めて。' },
      { type: 'h2', text: 'Skills' },
      { type: 'p', text: 'Skill は、再利用可能な手順を SKILL.md (とオプションのスクリプト) にパッケージ化したものです。Claude はその Skill が関連するまで名前と説明だけを読み込みます — これが「段階的開示 (progressive disclosure)」で、長い手順も必要になるまでほとんどコストがかかりません。' },
      { type: 'h2', text: 'Subagents' },
      { type: 'p', text: 'サブエージェント (Subagent) は、独自のコンテキストウィンドウ、システムプロンプト、許可されたツールを持つ専門化されたアシスタントです。メインのエージェントが焦点を絞った作業をそれに委譲し、要約を受け取ります — メインの会話をすっきり保ちながら。' },
      { type: 'callout', label: 'スコープのマージ', text: '同じアセットを user、project、enterprise の各レベルで定義できます。Berth はどれが優先されるかを示し、コンフリクトを知らせるので、実効的な構成が推測になることはありません。' },
    ],
    sources: [CC_MEMORY, CC_SKILLS, CC_SUBAGENTS],
  },
  {
    slug: 'configuration-capabilities',
    pillar: 'features',
    lang: 'ja',
    order: 4,
    title: 'Configuration · Capabilities: MCP、hooks、permissions',
    summary: 'エージェントに力を与え、その境界を定める capability (能力) 系アセット — MCP サーバー、ライフサイクル Hooks、そして権限。',
    lead: 'Capabilities は、エージェントが実際にできることです。Berth は、力とガードレールを並べて見える化します。',
    body: [
      { type: 'h2', text: 'MCP サーバー' },
      { type: 'p', text: 'MCP (Model Context Protocol) は、エージェントを外部のツールやデータに接続するためのオープン標準です — 公式ドキュメントはこれを「AI のための USB-C ポート」と呼んでいます。Berth は接続された各サーバー、そのトランスポート、そして同じサーバーが複数のスコープで定義されている場合のマージのコンフリクトを一覧表示します。' },
      { type: 'h2', text: 'Hooks' },
      { type: 'p', text: 'Hooks は、特定のライフサイクルの瞬間 (例: ツール呼び出しの前後) に実行されるシェルコマンドです。これは決定論的な制御を与えます — モデルがやってくれることを願うのではなく、何かが必ず起きるようにするのです。Berth は各 Hook がいつ発火するかを示し、それを検証します。' },
      { type: 'h2', text: 'Permissions' },
      { type: 'p', text: 'allow / ask / deny のルールが、エージェントが確認なしにできること、確認を要すること、ブロックされることを定義します。Berth は危険なほど広範なルールを浮かび上がらせ、どのスコープがどれを上書きするかを示します。' },
      { type: 'callout', label: '力と限界を、ともに', text: 'capabilities を permissions の隣に並べて見ることが、強力な構成と危険な構成を見分ける方法です。' },
    ],
    sources: [CC_MCP, MCP_INTRO, CC_HOOKS],
  },
  {
    slug: 'usage-health-privacy',
    pillar: 'features',
    lang: 'ja',
    order: 5,
    title: 'Usage、ヘルスチェック、そしてプライバシー',
    summary: 'コストとトークンの推移、自動診断、そしてそのすべてを支える読み取り専用 / ローカルファーストの保証。',
    lead: '最後の機能グループは、あなたを把握された安全な状態に保ちます。何にいくら使っているか、何が誤設定されているか、そして Berth がどうあなたのデータを守るか。',
    body: [
      { type: 'h2', text: 'Usage' },
      { type: 'p', text: 'モデル別、プロジェクト別、日別のコストとトークンの推移を、レート制限の余裕とともに常に見える形で示します。セッションにコストデータがない場合、Berth は誤解を招く $0 ではなく「不明 (unknown)」と表示します。' },
      { type: 'h2', text: 'ヘルスチェック' },
      { type: 'p', text: 'ローカルでの自動診断が、よくある問題を捉えます。構文エラー、必須フィールドの欠落、壊れた @path インポート、安全でない設定など — それぞれに深刻度が付き、可能な場合は修正の提案も添えられます。' },
      { type: 'h2', text: 'プライバシーと読み取り専用' },
      { type: 'p', text: 'Berth は完全にあなたのマシン上で動作します。テレメトリーなし、クラウド同期なし、アカウントなし。v0.1 はファイルを決して変更せず、認証情報は状態確認のためだけに検出され、表示されることはありません。' },
      { type: 'callout', label: '設計からしてローカルファースト', text: 'あなたのエージェント構成は機微なものです。Berth は、それを理解することが、どこかへ送信することを決して意味しないように作られています。' },
    ],
    sources: [CC_OVERVIEW],
  },
]
