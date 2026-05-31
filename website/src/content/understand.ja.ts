import type { Article } from './types'

const AWS = { title: 'AWS — AI エージェントとは?', url: 'https://aws.amazon.com/what-is/ai-agents/', note: 'ベンダー中立の解説。エージェントの能力を簡潔に定義。' }
const IBM_AGENTS = { title: 'IBM — AI エージェントとは?', url: 'https://www.ibm.com/think/topics/ai-agents', note: '中立的なトピック解説。ツール呼び出しと自律性。' }
const IBM_VS = { title: 'IBM — AI エージェント vs AI アシスタント', url: 'https://www.ibm.com/think/topics/ai-agents-vs-ai-assistants', note: '受動的なアシスタント vs 能動的なエージェント。' }
const GOOGLE = { title: 'Google Cloud — AI エージェントとは?', url: 'https://cloud.google.com/discover/what-are-ai-agents', note: '教育的な解説。「LLM を頭脳とする」。' }
const MS = { title: 'Microsoft — AI エージェント解説', url: 'https://news.microsoft.com/source/features/ai/ai-agents-what-they-are-and-how-theyll-change-the-way-we-work/', note: '平易な枠組み。エージェントはあなたの代わりに働く。' }
const ANTHROPIC = { title: 'Anthropic — 効果的なエージェントの構築', url: 'https://www.anthropic.com/engineering/building-effective-agents', note: '一次情報。エージェントとワークフローの区別、ツールをループで使うモデル。' }
const TOOLUSE = { title: 'Anthropic — ツール使用 (function calling) の概要', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview', note: '一次情報。モデルがどのようにツールを呼び出すか。' }
const IBM_MULTI = { title: 'IBM — マルチエージェントシステム', url: 'https://www.ibm.com/think/topics/multiagent-system', note: '複数のエージェントが一つの目標に向けて協調する。' }

export const understandJa: Article[] = [
  {
    slug: 'what-is-an-agent',
    pillar: 'understand',
    lang: 'ja',
    order: 1,
    title: 'AI エージェントとは?',
    summary: 'チャットボットは答え、エージェントは行動する。AI エージェントとは何か、そしてチャットモデルとどう違うかを平易な言葉で定義します。',
    lead: '実際に通用する最も短い定義はこうです。チャットボットはあなたの質問に答え、エージェントはあなたのために物事を成し遂げようと働きます。',
    body: [
      {
        type: 'p',
        text: 'AI エージェントとは、目標を与えられると、自らの状況を認識し、手順を計画し、ツールを使い、何が起きたかを記憶し、限られた人の操舵のもとで多段階のタスクを完了まで進められるソフトウェアです。AWS はこう端的に表現しています。目標を設定するのは人間だが、エージェントは「その目標を達成するために必要な最善の行動を、自ら選択する」。',
      },
      {
        type: 'callout',
        label: '一行で言うと',
        text: 'チャットアシスタントは受動的です。あなたが頼んだときに、頼んだことをします。エージェントは能動的です。目標を与えられれば、手順を自分で決めて実行します。',
      },
      { type: 'h2', text: 'エージェントとモデルの関係' },
      {
        type: 'p',
        text: '大規模言語モデルは「頭脳」です。Google Cloud は LLM をエージェントの頭脳と表現し、言語を処理・生成する一方、他の部分が推論と行動を可能にすると説明します。AWS はモデルを、プロンプトを行動・判断、あるいはツールや記憶への問い合わせへと変換する推論エンジンとして位置づけます。',
      },
      {
        type: 'p',
        text: 'つまりエージェントとは、モデルに、行動を可能にする部分 — 認識 (状況を取り込む)、計画、ツール使用、記憶 — を加えたものです。モデルは物事を知っており、エージェントは物事を成し遂げます。',
      },
      { type: 'h2', text: '実際にはどう見えるか' },
      {
        type: 'p',
        text: 'Berth が管理対象とするツールの提供元である Anthropic は、エージェントを、モデルが「自らのプロセスとツールの使い方を動的に方向づける」システムだと定義しています。実際にはこれは、LLM がツールをループの中で使うことを意味します。行動し、環境から実際のフィードバックを読み取り、進捗を評価し、目標が達成されるまで繰り返すのです。',
      },
    ],
    sources: [AWS, IBM_VS, GOOGLE, ANTHROPIC],
  },
  {
    slug: 'core-capabilities',
    pillar: 'understand',
    lang: 'ja',
    order: 2,
    title: 'エージェントの 6 つの中核能力',
    summary: '認識、推論と計画、ツール使用、記憶、自律的な多段階実行、そしてマルチエージェント協調 — をシンプルに解説します。',
    lead: 'エージェントを分解すると、おおよそ 6 つの能力が連携していることが分かります。これらを理解することが、エージェントがあなたのために何をできて、何をできないかを知る最短の道です。',
    body: [
      { type: 'h2', text: '認識' },
      { type: 'p', text: 'エージェントは状況を取り込みます。あなたの依頼、ドキュメント、他のシステムからのデータ、あるいはリアルタイムの入力など。これは、行動する前に何が起きているかを「見る」ためのエージェントの手段です。' },
      { type: 'h2', text: '推論と計画' },
      { type: 'p', text: '即座に返答する代わりに、エージェントは目標をじっくり考え、順序立てたステップに分解します。自分宛てに ToDo リストを書き、最初に何に取り組むかを決めるようなものです。' },
      { type: 'h2', text: 'ツール使用 (function calling)' },
      { type: 'p', text: 'これは最もレバレッジの効く能力です。エージェントは外部に手を伸ばし、本物のソフトウェアを使います — 検索、メール送信、コード実行、データベースへの問い合わせ。あなたがツールを定義し、モデルがいつ呼び出すかを判断して、あなたのアプリが実行する構造化されたリクエストを返します。' },
      { type: 'h2', text: '記憶' },
      { type: 'p', text: 'エージェントはタスク全体 (ときには数日にまたがって) コンテキストを保持します。だから各ステップがゼロから始まることはなく、一貫性とパーソナライズが保たれます。' },
      { type: 'h2', text: '自律的な多段階実行' },
      { type: 'p', text: '一つの目標を与えられると、エージェントは自らループを回します。行動し、結果を観察し、調整し、仕事が終わるまで何段階にもわたって進め続けます — 人がボタンを一つひとつ押すことなく。' },
      { type: 'h2', text: 'マルチエージェント協調' },
      { type: 'p', text: 'より大きな仕事では、複数の専門化されたエージェントがチームを組み、それぞれが得意な部分を担当し、共通の目標に向けて協調できます。' },
      {
        type: 'callout',
        label: 'Berth にとってなぜ重要か',
        text: 'あなたのマシン上では、これらの能力は具体的なアセットとして現れます。ツールは MCP サーバーとして、再利用可能な手順は Skills として、委譲はサブエージェント (Subagents) として。Berth はそれらを見える化します。',
      },
    ],
    sources: [AWS, GOOGLE, { ...IBM_AGENTS }, TOOLUSE, IBM_MULTI],
  },
  {
    slug: 'model-vs-agent',
    pillar: 'understand',
    lang: 'ja',
    order: 3,
    title: '大規模モデル vs エージェント: 実際に変わること',
    summary: '同じモデルでも、エージェントが周りにあるかないかで、ふるまいは大きく変わります。ここでは、その本質的な違いを説明します。',
    lead: '人はよく「モデル」と「エージェント」を混同します。その違いは学問的なものではなく実用的なもので、システムに何を任せて信頼できるかを左右します。',
    body: [
      {
        type: 'p',
        text: '素のままの言語モデルは、学習時に身につけたことから答えます。IBM はそれが「知識と推論の限界に縛られている」と指摘します。対照的にエージェントは、ツール呼び出しを使って最新の情報を取得し、行動を起こし、複雑な目標に到達するためにサブタスクを生み出します。',
      },
      {
        type: 'p',
        text: 'Microsoft はエージェントを、モデルの上に乗る層として描きます。観察し、情報を集め、それをモデルに渡し、両者がともに行動計画を生み出す — あるいは許可されていれば直接それを実行する、と。モデルとエージェントは互いを補い合う 2 つの半身です。一方が考え、もう一方が認識して行動します。',
      },
      { type: 'h2', text: 'すべてが「エージェント」である必要はない' },
      {
        type: 'callout',
        label: '役に立つ区別',
        text: 'Anthropic はワークフロー (LLM とツールが固定された定義済みの経路をたどる — 予測可能) と、エージェント (モデルが自ら経路を方向づける — 柔軟) を区別します。彼らの助言は、うまくいく最もシンプルなものを使い、エージェント的な複雑さは測定できる効果があるときにだけ加える、というものです。',
      },
      {
        type: 'p',
        text: 'だからこそ、本格的なエージェントの構築は、その大部分が周辺環境 — あなたが与える指示、ツール、権限、記憶 — に関わるものになります。それらこそ、Berth がスキャンして見せてくれるアセットです。',
      },
    ],
    sources: [{ ...IBM_AGENTS }, MS, GOOGLE, ANTHROPIC],
  },
]
