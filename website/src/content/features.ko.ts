import type { Article } from './types'

const CC_OVERVIEW = { title: 'Claude Code — 개요', url: 'https://code.claude.com/docs/en/overview', note: 'Claude Code가 무엇이고 어떤 자산을 사용하는지에 대한 1차 자료.' }
const CC_SKILLS = { title: 'Claude Code — Skills', url: 'https://code.claude.com/docs/en/skills', note: '1차 자료. SKILL.md 구조와 점진적 공개(progressive disclosure).' }
const CC_SUBAGENTS = { title: 'Claude Code — 서브에이전트(Subagents)', url: 'https://code.claude.com/docs/en/sub-agents', note: '1차 자료. 격리된 전문 어시스턴트.' }
const CC_HOOKS = { title: 'Claude Code — Hooks 가이드', url: 'https://code.claude.com/docs/en/hooks-guide', note: '1차 자료. 라이프사이클 셸 명령.' }
const CC_MEMORY = { title: 'Claude Code — 메모리', url: 'https://code.claude.com/docs/en/memory', note: '1차 자료. CLAUDE.md의 스코프와 가져오기(import).' }
const CC_MCP = { title: 'Claude Code — MCP', url: 'https://code.claude.com/docs/en/mcp', note: '1차 자료. 외부 도구와 데이터에 연결하기.' }
const MCP_INTRO = { title: 'Model Context Protocol — 소개', url: 'https://modelcontextprotocol.io/docs/getting-started/intro', note: '1차 자료. "AI를 위한 USB-C 포트"라는 비유.' }

export const featuresKo: Article[] = [
  {
    slug: 'asset-model',
    pillar: 'features',
    lang: 'ko',
    order: 1,
    title: '자산 모델: Berth가 실제로 보여 주는 것',
    summary: 'Berth는 에이전트 뒤에 있는 평문 텍스트 파일들을, 구조화되고 서로 연결된 객체, 즉 자산(asset)으로 바꿔 줍니다. 그 모델을 소개합니다.',
    lead: 'Berth의 모든 것은 하나의 생각 위에 세워져 있습니다. AI 에이전트의 동작을 좌우하는 파일들은 곧 자산이며, 자산은 눈에 보이고, 검색할 수 있고, 서로 연결되어 마땅하다는 것입니다.',
    body: [
      { type: 'p', text: '자산은 AI 에이전트의 작동 방식을 좌우하는 모든 파일이나 설정을 가리킵니다. Berth는 이를 앱 곳곳에서 마주치게 될 두 갈래로 묶습니다.' },
      { type: 'h2', text: '지시(Instructions) — 에이전트가 해야 할 일' },
      { type: 'p', text: '메모리(CLAUDE.md / AGENTS.md), Skills, 서브에이전트(Subagents), 명령(Commands), 출력 모드(Output Modes), 그리고 에이전트 팀(Agent Teams). 작업 전과 작업 중에 동작을 이끄는 텍스트들입니다.' },
      { type: 'h2', text: '역량(Capabilities) — 에이전트가 할 수 있는 일' },
      { type: 'p', text: 'MCP 서버, Hooks, 권한(Permissions), 환경 변수, 상태 표시줄(Status lines), 그리고 플러그인(Plugins). 에이전트의 런타임 능력과 경계를 규정합니다.' },
      { type: 'callout', label: '핵심', text: '여기저기 흩어진 텍스트 파일이, 둘러보고 검색하고 추적할 수 있는 일급 객체가 됩니다. 그것들 사이의 관계까지 눈에 보이게 말이죠.' },
      { type: 'p', text: 'v0.1은 읽기 전용입니다. Berth는 이 파일들을 표시하기 위해 읽을 뿐, 결코 쓰지 않습니다. API 키 같은 자격 증명은 상태 확인 용도로만 감지되며 결코 표시되지 않습니다.' },
    ],
    sources: [CC_OVERVIEW, CC_MEMORY],
  },
  {
    slug: 'overview-and-sessions',
    pillar: 'features',
    lang: 'ko',
    order: 2,
    title: 'Overview(개요)와 Sessions(세션): 활동과 기록 보기',
    summary: '한눈에 보는 대시보드, 그리고 지난 세션을 각각이 사용한 자산과 도구와 함께 되짚어 보는 방법.',
    lead: 'Berth의 두 화면은 일상의 질문에 답합니다. "지금 내가 가진 것은 무엇인가?" 그리고 "그 세션에서 무슨 일이 있었나?"',
    body: [
      { type: 'h2', text: 'Overview(개요)' },
      { type: 'p', text: '단 하나의 대시보드입니다. Skills, MCP 서버, 플러그인이 각각 몇 개인지, 가장 최근 세션들, 이번 주 지출, 그리고 설정 문제를 짚어 주는 헬스 체크까지 담겨 있습니다.' },
      { type: 'h2', text: 'Sessions(세션)' },
      { type: 'p', text: '지난 세션을 프로젝트별 또는 날짜별로 묶어 둘러봅니다. 각 세션은 불러온 skills, 연결한 MCP 서버, 발동한 hooks, 그리고 만들어 낸 산출물(계획, 할 일 목록, 파일 이력)을 보여 주며, 무엇이 어떤 순서로 실행됐는지에 대한 도구 타임라인도 함께 제공합니다.' },
      { type: 'callout', label: '세션이 중요한 이유', text: '세션은 한 차례 에이전트 실행의 완전한 기록입니다. 그것을 되짚어 읽는 것이, 당신의 구성이 실제로 무엇을 했고 얼마나 비용이 들었는지 알아내는 길입니다.' },
    ],
    sources: [CC_OVERVIEW],
  },
  {
    slug: 'configuration-instructions',
    pillar: 'features',
    lang: 'ko',
    order: 3,
    title: 'Configuration · 지시(Instructions): 메모리, skills, 서브에이전트',
    summary: '에이전트를 이끄는 지시 자산들, 그리고 Berth가 그 스코프, 가져오기(import), 각각의 출처를 어떻게 보여 주는지.',
    lead: '지시는 에이전트에게 무엇을 할지 알려 주는 텍스트입니다. Berth는 그것들을 펼쳐 보여 주어, 무엇이 어떤 스코프에서 불러와졌고 파일들이 어떻게 이어지는지 볼 수 있게 합니다.',
    body: [
      { type: 'h2', text: '메모리' },
      { type: 'p', text: 'CLAUDE.md와 AGENTS.md는 에이전트가 작업을 시작할 때 읽는, 오래 지속되는 지시입니다. Berth는 그 스코프(사용자 / 프로젝트 / 엔터프라이즈)를 보여 주고, @path 가져오기 사슬을 끊어진 링크까지 포함해 풀어냅니다.' },
      { type: 'h2', text: 'Skills' },
      { type: 'p', text: 'Skill은 재사용 가능한 절차를 SKILL.md(그리고 선택적인 스크립트들)에 담아 둡니다. Claude는 해당 skill이 관련될 때까지 이름과 설명만 불러옵니다. 이른바 "점진적 공개(progressive disclosure)"이며, 그 덕에 긴 절차도 필요해지기 전까지는 비용이 거의 들지 않습니다.' },
      { type: 'h2', text: '서브에이전트(Subagents)' },
      { type: 'p', text: '서브에이전트는 자체 컨텍스트 윈도, 시스템 프롬프트, 허용 도구를 가진 전문 어시스턴트입니다. 메인 에이전트가 집중된 일을 그것에 위임하고 요약만 돌려받아, 메인 대화를 깨끗하게 유지합니다.' },
      { type: 'callout', label: '스코프 병합', text: '같은 자산이 사용자, 프로젝트, 엔터프라이즈 수준에서 각각 정의될 수 있습니다. Berth는 어느 것이 우선하는지 보여 주고 충돌을 짚어 주어, 실효 설정을 추측에 맡기지 않게 합니다.' },
    ],
    sources: [CC_MEMORY, CC_SKILLS, CC_SUBAGENTS],
  },
  {
    slug: 'configuration-capabilities',
    pillar: 'features',
    lang: 'ko',
    order: 4,
    title: 'Configuration · 역량(Capabilities): MCP, hooks, 권한',
    summary: '에이전트에 힘을 부여하고 그 경계를 정하는 역량 자산들 — MCP 서버, 라이프사이클 hooks, 그리고 권한.',
    lead: '역량은 에이전트가 실제로 할 수 있는 일입니다. Berth는 그 힘과 가드레일을 나란히 눈에 보이게 만듭니다.',
    body: [
      { type: 'h2', text: 'MCP 서버' },
      { type: 'p', text: 'MCP(Model Context Protocol)는 에이전트를 외부 도구와 데이터에 연결하는 오픈 표준입니다. 공식 문서는 이를 "AI를 위한 USB-C 포트"라고 부릅니다. Berth는 연결된 각 서버, 그 전송 방식(transport), 그리고 같은 서버가 여러 스코프에서 정의됐을 때의 병합 충돌을 목록으로 보여 줍니다.' },
      { type: 'h2', text: 'Hooks' },
      { type: 'p', text: 'Hooks는 특정 라이프사이클 시점(예: 도구 호출 전후)에 실행되는 셸 명령입니다. 결정론적 통제를 제공하죠. 모델이 알아서 해 주길 바라는 대신, 무언가가 항상 일어나도록 보장하는 것입니다. Berth는 각 hook이 언제 발동하는지 보여 주고 그것을 검증합니다.' },
      { type: 'h2', text: '권한(Permissions)' },
      { type: 'p', text: '허용 / 확인 / 거부(allow / ask / deny) 규칙은 에이전트가 묻지 않고 해도 되는 일, 확인이 필요한 일, 차단되는 일을 정합니다. Berth는 위험할 만큼 폭넓은 규칙을 드러내고, 어떤 스코프가 어떤 스코프를 덮어쓰는지 보여 줍니다.' },
      { type: 'callout', label: '힘과 한계를 함께', text: '역량을 권한 옆에 나란히 보는 것이, 강력한 구성과 위험한 구성을 가려내는 길입니다.' },
    ],
    sources: [CC_MCP, MCP_INTRO, CC_HOOKS],
  },
  {
    slug: 'usage-health-privacy',
    pillar: 'features',
    lang: 'ko',
    order: 5,
    title: 'Usage(사용량), 헬스 체크, 그리고 프라이버시',
    summary: '비용과 토큰 추이, 자동 진단, 그리고 그 모든 것을 떠받치는 읽기 전용 / 로컬 우선 보장.',
    lead: '마지막 기능 묶음은 당신을 정보에 밝고 안전하게 지켜 줍니다. 무엇을 쓰고 있는지, 무엇이 잘못 설정됐는지, 그리고 Berth가 당신의 데이터를 어떻게 지키는지.',
    body: [
      { type: 'h2', text: 'Usage(사용량)' },
      { type: 'p', text: '모델별, 프로젝트별, 날짜별 비용과 토큰 추이를, 사용량 한도(rate-limit) 여유와 함께 한눈에 보여 줍니다. 세션에 비용 데이터가 없을 때 Berth는 오해를 부르는 $0 대신 "알 수 없음(unknown)"이라고 표시합니다.' },
      { type: 'h2', text: '헬스 체크' },
      { type: 'p', text: '자동 로컬 진단이 흔한 문제를 잡아냅니다. 구문 오류, 누락된 필수 필드, 끊어진 @path 가져오기, 안전하지 않은 설정까지. 각각에는 심각도가 매겨지고, 가능한 경우 제안된 해결책이 함께 제시됩니다.' },
      { type: 'h2', text: '프라이버시와 읽기 전용' },
      { type: 'p', text: 'Berth는 전적으로 당신의 기기 안에서 동작합니다. 텔레메트리도, 클라우드 동기화도, 계정도 없습니다. v0.1은 결코 파일을 수정하지 않으며, 자격 증명은 상태 확인 용도로만 감지될 뿐 결코 표시되지 않습니다.' },
      { type: 'callout', label: '설계부터 로컬 우선', text: '당신의 에이전트 구성은 민감합니다. Berth는 그것을 이해하는 일이 결코 그것을 어딘가로 보내는 일이 되지 않도록 설계되었습니다.' },
    ],
    sources: [CC_OVERVIEW],
  },
]
