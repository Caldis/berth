import type { Article } from './types'

const CC_HOOKS = { title: 'Claude Code — Hooks 가이드', url: 'https://code.claude.com/docs/en/hooks-guide', note: '1차 자료. hook 이벤트와 라이프사이클.' }
const CC_SETTINGS = { title: 'Claude Code — 설정(Settings)', url: 'https://code.claude.com/docs/en/settings', note: '1차 자료. disableAllHooks를 포함한 settings.json.' }
const CC_COSTS = { title: 'Claude Code — 비용(Costs)', url: 'https://code.claude.com/docs/en/costs', note: '1차 자료. 사용량과 비용이 추적되는 방식.' }
const CC_MEMORY = { title: 'Claude Code — 메모리', url: 'https://code.claude.com/docs/en/memory', note: '1차 자료. CLAUDE.md의 스코프와 가져오기(import).' }
const CC_MCP = { title: 'Claude Code — MCP', url: 'https://code.claude.com/docs/en/mcp', note: '1차 자료. MCP 서버의 프로젝트 스코프 vs. 사용자 스코프.' }

export const guidesKo: Article[] = [
  {
    slug: 'why-isnt-my-hook-firing',
    pillar: 'guides',
    lang: 'ko',
    order: 1,
    title: '내 hook은 왜 발동하지 않을까?',
    summary: '실행되지 않는 hook을 진단하는 짧은 체크리스트 — Berth가 보여 주는 것을 활용해서.',
    lead: '아무 말 없이 한 번도 실행되지 않는 hook은 가장 흔한 에이전트 설정 수수께끼 중 하나입니다. Berth로 그 원인을 추적하는 방법을 소개합니다.',
    body: [
      { type: 'h2', text: '1. 이벤트 이름이 맞나요?' },
      { type: 'p', text: 'Hooks는 특정 라이프사이클 이벤트에 발동합니다(예: 도구 호출 전의 PreToolUse, 호출 후의 PostToolUse). 이벤트 이름이 실제 이벤트와 맞지 않으면 hook은 결코 실행되지 않습니다. Berth는 각 hook이 언제 발동하도록 설정됐는지 보여 줍니다.' },
      { type: 'h2', text: '2. hooks가 전역으로 꺼져 있나요?' },
      { type: 'p', text: 'disableAllHooks 설정은 모든 hook을 한 번에 꺼 버립니다. Berth의 헬스 체크가 이를 드러내 줍니다. 가장 먼저 배제하고 넘어가야 할 항목이죠.' },
      { type: 'h2', text: '3. matcher가 너무 좁나요?' },
      { type: 'p', text: '많은 hook은 특정 도구를 겨냥하기 위해 matcher를 사용합니다. matcher가 당신이 쓰는 도구와 맞지 않으면 아무 일도 일어나지 않습니다. 세션의 도구 타임라인에 나온 도구 이름과 matcher를 대조해 보세요.' },
      { type: 'h2', text: '4. 명령 파일이 존재하나요?' },
      { type: 'p', text: 'Hook은 명령이나 스크립트를 가리킵니다. 경로가 틀렸거나 파일이 없으면 hook은 실행될 수 없습니다. Berth는 헬스 체크에서 hook의 진입 경로를 검증합니다.' },
      { type: 'callout', label: '빠른 길', text: 'Capabilities → Hooks를 열어 해당 hook의 라이프사이클 뷰와 헬스 체크를 읽어 보세요. 대개 1분도 안 되어 끊어진 링크를 찾아낼 수 있습니다.' },
    ],
    sources: [CC_HOOKS, CC_SETTINGS],
  },
  {
    slug: 'understand-your-cost',
    pillar: 'guides',
    lang: 'ko',
    order: 2,
    title: '내 비용을 이해하기',
    summary: 'Berth의 Usage(사용량) 화면을 읽고, 무엇이 비싸고 왜 그런지를 모델별, 프로젝트별, 날짜별로 찾아냅니다.',
    lead: 'AI 에이전트 비용은 미스터리처럼 느껴질 수 있습니다. Berth의 Usage 화면은 그것을 읽기 쉬운 세 가지 관점으로 바꿔 줍니다.',
    body: [
      { type: 'h2', text: '세 가지 분해부터 시작하세요' },
      { type: 'list', items: [
        '모델별 — 어떤 모델이 가장 비용이 큰지(예: 최첨단 모델 vs. 더 작은 모델).',
        '프로젝트별 — 지출이 어디로 가고 있는지.',
        '날짜별 — 언제 비용이 치솟았는지.',
      ] },
      { type: 'h2', text: '토큰이 이야기를 들려준다' },
      { type: 'p', text: '비용은 토큰을 따라갑니다. 입력, 출력, 그리고 캐시 토큰이죠. 매 턴마다 큰 파일을 다시 읽는 세션은 입력 토큰을 태우고, 긴 생성은 출력 토큰을 태웁니다. Berth는 토큰을 분해해 보여 주어, 총액뿐 아니라 그 원인까지 눈에 보이게 합니다.' },
      { type: 'h2', text: '사용량 한도(rate limit)에 유의하세요' },
      { type: 'p', text: 'Berth는 사용량 한도 여유를 늘 시야에 두어, 속도 저하가 정체 미스터리가 아니라 "한도에 가까워지는 중"으로 읽히게 합니다.' },
      { type: 'callout', label: '비용이 "알 수 없음"으로 표시될 때', text: '세션에 청구 데이터가 없으면, Berth는 오해를 부르는 $0 대신 "알 수 없음(unknown)"이라고 표시합니다. 그래서 그것이 공짜가 아니라 누락된 것임을 알 수 있죠.' },
    ],
    sources: [CC_COSTS],
  },
  {
    slug: 'team-config-baseline',
    pillar: 'guides',
    lang: 'ko',
    order: 3,
    title: '팀을 위한 설정 기준선 세우기',
    summary: '스코프와 가져오기(import)를 활용해 팀에 공유되고 예측 가능한 에이전트 구성을 마련하고, 헬스 체크로 검증합니다.',
    lead: '여러 사람이 한 프로젝트를 공유할 때, "내 컴퓨터에선 되는데"는 실재하는 위험입니다. 명확한 스코프 기준선이 이를 바로잡습니다.',
    body: [
      { type: 'h2', text: '1. 무엇을 프로젝트 스코프에 둘지 정하세요' },
      { type: 'p', text: '사용자 스코프 자산은 개인적인 것이고, 프로젝트 스코프 자산은 저장소와 함께 배포되어 모두에게 적용됩니다. 공유 관례, skills, MCP 서버를 프로젝트 스코프에 두어 팀 전체가 이를 물려받게 하세요.' },
      { type: 'h2', text: '2. 공유 지시를 가져오세요' },
      { type: 'p', text: '프로젝트 CLAUDE.md는 @path를 통해 공유 파일을 가져올 수 있습니다(예: AGENTS.md 가져오기). Berth가 가져오기 사슬을 풀어내 주어, 모두가 실제로 같은 지시를 받는지 확인할 수 있습니다.' },
      { type: 'h2', text: '3. 헬스 체크로 검증하세요' },
      { type: 'p', text: '공유하기 전에 Berth의 헬스 체크를 한 번 훑어보세요. 누락된 가져오기, 끊어진 경로, 충돌하는 스코프 정의가 모두 여기에 나타납니다. 한 번 고쳐 두면, 팀은 정상으로 검증된 기준선에서 출발합니다.' },
      { type: 'callout', label: '스코프가 지렛대인 이유', text: '"나는 되는데 남들은 안 되는" 문제는 대부분 스코프 문제입니다. 실효로 병합된 구성을 보는 것이, 구성을 재현 가능하게 만드는 길입니다.' },
    ],
    sources: [CC_MEMORY, CC_MCP],
  },
]
