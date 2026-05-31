import type { Article } from './types'

const AWS = { title: 'AWS — AI 에이전트란 무엇인가?', url: 'https://aws.amazon.com/what-is/ai-agents/', note: '특정 벤더에 치우치지 않은 해설. 에이전트 역량에 대한 정의가 명료함.' }
const IBM_AGENTS = { title: 'IBM — AI 에이전트란 무엇인가?', url: 'https://www.ibm.com/think/topics/ai-agents', note: '중립적인 주제 해설. 도구 호출과 자율성.' }
const IBM_VS = { title: 'IBM — AI 에이전트 vs. AI 어시스턴트', url: 'https://www.ibm.com/think/topics/ai-agents-vs-ai-assistants', note: '반응형 어시스턴트 vs. 능동형 에이전트.' }
const GOOGLE = { title: 'Google Cloud — AI 에이전트란 무엇인가?', url: 'https://cloud.google.com/discover/what-are-ai-agents', note: '교육용 해설. "대규모 언어 모델이 곧 두뇌".' }
const MS = { title: 'Microsoft — AI 에이전트 쉽게 알아보기', url: 'https://news.microsoft.com/source/features/ai/ai-agents-what-they-are-and-how-theyll-change-the-way-we-work/', note: '쉬운 언어로 풀어낸 설명. 에이전트가 당신을 대신해 일한다.' }
const ANTHROPIC = { title: 'Anthropic — 효과적인 에이전트 구축하기', url: 'https://www.anthropic.com/engineering/building-effective-agents', note: '1차 자료. 에이전트와 워크플로의 구분, 그리고 반복(loop) 속 도구 모델.' }
const TOOLUSE = { title: 'Anthropic — 도구 사용(function calling) 개요', url: 'https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview', note: '1차 자료. 모델이 도구를 호출하는 방식.' }
const IBM_MULTI = { title: 'IBM — 멀티 에이전트 시스템', url: 'https://www.ibm.com/think/topics/multiagent-system', note: '하나의 목표를 향해 협력하는 여러 에이전트.' }

export const understandKo: Article[] = [
  {
    slug: 'what-is-an-agent',
    pillar: 'understand',
    lang: 'ko',
    order: 1,
    title: 'AI 에이전트란 무엇인가?',
    summary: '챗봇은 답을 하고, 에이전트는 일을 해냅니다. AI 에이전트가 무엇이며 채팅 모델과 어떻게 다른지 쉬운 언어로 정의합니다.',
    lead: '실제로 들어맞는 가장 짧은 정의는 이렇습니다. 챗봇은 당신의 질문에 답하고, 에이전트는 당신을 대신해 일을 끝까지 해냅니다.',
    body: [
      {
        type: 'p',
        text: 'AI 에이전트는 목표가 주어지면 상황을 인식하고, 단계를 계획하고, 도구를 사용하고, 일어난 일을 기억하며, 사람의 개입을 최소화한 채 여러 단계로 이루어진 작업을 완수까지 끌고 가는 소프트웨어입니다. AWS는 이를 간단히 표현합니다. 목표는 사람이 정하지만, 에이전트는 "그 목표를 달성하기 위해 수행해야 할 최선의 행동을 스스로 선택한다"고 말이죠.',
      },
      {
        type: 'callout',
        label: '한 줄 요약',
        text: '채팅 어시스턴트는 반응형입니다. 당신이 요청할 때, 요청한 것을 합니다. 에이전트는 능동형입니다. 목표가 주어지면 스스로 단계를 정하고 실행에 옮깁니다.',
      },
      { type: 'h2', text: '에이전트와 모델의 관계' },
      {
        type: 'p',
        text: '대규모 언어 모델은 "두뇌"입니다. Google Cloud는 대규모 언어 모델을 언어를 처리하고 생성하는 에이전트의 두뇌로 설명하며, 나머지 부분이 추론하고 행동하게 한다고 봅니다. AWS는 모델을 프롬프트를 행동, 결정, 혹은 도구와 메모리에 대한 질의로 바꾸는 추론 엔진으로 설명합니다.',
      },
      {
        type: 'p',
        text: '그러므로 에이전트는 모델에, 행동을 가능하게 하는 부분들을 더한 것입니다. 즉 인식(상황을 받아들이기), 계획, 도구 사용, 그리고 메모리입니다. 모델은 아는 일을 하고, 에이전트는 해내는 일을 합니다.',
      },
      { type: 'h2', text: '실제로는 어떤 모습인가' },
      {
        type: 'p',
        text: 'Berth가 관리하는 도구를 만든 Anthropic은 에이전트를 모델이 "자신의 프로세스와 도구 사용을 동적으로 주도하는" 시스템으로 정의합니다. 실제로 이는 대규모 언어 모델이 반복(loop) 속에서 도구를 사용하는 것입니다. 행동하고, 환경으로부터 실제 피드백을 읽고, 진척을 평가하며, 목표가 달성될 때까지 이를 되풀이합니다.',
      },
    ],
    sources: [AWS, IBM_VS, GOOGLE, ANTHROPIC],
  },
  {
    slug: 'core-capabilities',
    pillar: 'understand',
    lang: 'ko',
    order: 2,
    title: '에이전트의 여섯 가지 핵심 역량',
    summary: '인식, 추론과 계획, 도구 사용, 메모리, 자율적인 다단계 실행, 그리고 멀티 에이전트 협업을 쉽게 풀어 설명합니다.',
    lead: '에이전트를 낱낱이 뜯어보면 대략 여섯 가지 능력이 함께 맞물려 돌아갑니다. 이를 이해하는 것이 에이전트가 당신을 위해 무엇을 할 수 있고 무엇을 할 수 없는지 가장 빠르게 아는 길입니다.',
    body: [
      { type: 'h2', text: '인식' },
      { type: 'p', text: '에이전트는 먼저 상황을 받아들입니다. 당신의 요청, 문서, 다른 시스템에서 온 데이터, 혹은 실시간 입력이죠. 행동에 나서기 전에 무슨 일이 벌어지고 있는지 보는 에이전트만의 방식입니다.' },
      { type: 'h2', text: '추론과 계획' },
      { type: 'p', text: '곧바로 답하는 대신, 에이전트는 목표를 끝까지 곱씹어 보고 순서가 있는 단계로 나눕니다. 스스로 할 일 목록을 적고 무엇부터 손댈지 정하는 것과 같죠.' },
      { type: 'h2', text: '도구 사용(function calling)' },
      { type: 'p', text: '이것이 가장 지렛대 효과가 큰 능력입니다. 에이전트가 손을 뻗어 실제 소프트웨어를 사용합니다. 검색하고, 이메일을 보내고, 코드를 실행하고, 데이터베이스를 조회하죠. 당신이 도구를 정의하면, 모델이 언제 호출할지 결정하고, 당신의 앱이 실행할 구조화된 요청을 돌려줍니다.' },
      { type: 'h2', text: '메모리' },
      { type: 'p', text: '에이전트는 하나의 작업 내내(때로는 여러 날에 걸쳐) 컨텍스트를 유지합니다. 그래서 매 단계가 처음부터 다시 시작하지 않고, 일관되고 개인화된 상태를 지킵니다.' },
      { type: 'h2', text: '자율적인 다단계 실행' },
      { type: 'p', text: '하나의 목표가 주어지면, 에이전트는 스스로 반복(loop)을 돌립니다. 행동하고, 결과를 관찰하고, 조정하며, 여러 단계에 걸쳐 일이 끝날 때까지 계속 나아갑니다. 사람이 버튼을 하나하나 누를 필요가 없죠.' },
      { type: 'h2', text: '멀티 에이전트 협업' },
      { type: 'p', text: '더 큰 일에는 각자 잘하는 부분을 맡은 여러 전문 에이전트가 한 팀을 이뤄, 공동의 목표를 향해 조율하며 협력할 수 있습니다.' },
      {
        type: 'callout',
        label: 'Berth에 주는 의미',
        text: '당신의 기기에서 이 능력들은 구체적인 자산으로 나타납니다. 도구는 MCP 서버로, 재사용 가능한 절차는 Skills로, 위임은 서브에이전트(Subagents)로 등장하죠. Berth는 그것들을 눈에 보이게 만듭니다.',
      },
    ],
    sources: [AWS, GOOGLE, { ...IBM_AGENTS }, TOOLUSE, IBM_MULTI],
  },
  {
    slug: 'model-vs-agent',
    pillar: 'understand',
    lang: 'ko',
    order: 3,
    title: '대규모 모델 vs. 에이전트: 실제로 무엇이 달라지는가',
    summary: '같은 모델이라도 에이전트로 둘러싸여 있느냐 아니냐에 따라 행동이 크게 달라집니다. 정말 중요한 그 차이를 짚어 봅니다.',
    lead: '사람들은 흔히 "모델"과 "에이전트"를 뭉뚱그립니다. 하지만 그 차이는 학술적인 것이 아니라 실용적인 것이며, 시스템에 어디까지 믿고 맡길 수 있는지를 결정합니다.',
    body: [
      {
        type: 'p',
        text: '맨몸의 언어 모델은 학습 과정에서 배운 것을 바탕으로 답합니다. IBM은 그것이 "지식과 추론의 한계에 묶여 있다"고 지적합니다. 반면 에이전트는 도구 호출을 사용해 최신 정보를 가져오고, 행동을 취하며, 복잡한 목표에 이르기 위해 하위 작업을 만들어 냅니다.',
      },
      {
        type: 'p',
        text: 'Microsoft는 에이전트를 모델 위에 얹힌 한 겹으로 설명합니다. 그것은 관찰하고, 정보를 모으고, 모델에 넘기며, 둘이 함께 행동 계획을 만들어 냅니다. 허용된 경우에는 직접 실행하기도 하죠. 모델과 에이전트는 서로를 보완하는 두 절반입니다. 하나는 생각하고, 다른 하나는 인식하고 행동합니다.',
      },
      { type: 'h2', text: '모든 것을 "에이전트"로 만들 필요는 없다' },
      {
        type: 'callout',
        label: '유용한 구분',
        text: 'Anthropic은 워크플로(대규모 언어 모델과 도구가 고정된, 미리 정해진 경로를 따르는 것 — 예측 가능)와 에이전트(모델이 스스로 경로를 주도하는 것 — 유연)를 구분합니다. 그들의 조언은 이렇습니다. 통하는 가장 단순한 것을 쓰고, 측정 가능한 도움이 될 때에만 에이전트적 복잡성을 더하라.',
      },
      {
        type: 'p',
        text: '바로 그래서 제대로 된 에이전트 구성은 대부분 그 주변부에 관한 것입니다. 당신이 부여하는 지시, 도구, 권한, 그리고 메모리 말이죠. 그것들이 바로 Berth가 스캔해 당신에게 보여 주는 자산입니다.',
      },
    ],
    sources: [{ ...IBM_AGENTS }, MS, GOOGLE, ANTHROPIC],
  },
]
