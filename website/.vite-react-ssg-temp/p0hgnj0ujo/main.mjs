import { Head, ViteReactSSG } from "vite-react-ssg";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { I18nextProvider, initReactI18next, useTranslation } from "react-i18next";
import i18next from "i18next";
import { useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, ArrowUpRight, Bot, Boxes, Check, Download, Eye, Languages, Layers, LayoutGrid, Lock, Menu, MessagesSquare, Moon, Plug, Settings, Sun, Webhook, X } from "lucide-react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
//#endregion
//#region src/i18n/index.ts
var resources = {
	zh: { translation: {
		nav: {
			"features": "功能",
			"knowledge": "知识库",
			"download": "下载"
		},
		hero: {
			"badge": "本地优先 · 只读 · 零遥测",
			"title": "让本地 AI Agent 资产，",
			"titleAccent": "一目了然。",
			"subtitle": "Berth 扫描散落在你电脑各处的 Skills、MCP、Hooks、子代理与会话，把它们关联成一张可浏览、可搜索的全景图——你终于看清自己装了什么、它们如何协作、用得怎么样。",
			"ctaPrimary": "下载 Berth",
			"ctaSecondary": "在 GitHub 查看",
			"note": "macOS 11+ / Windows 10+ · 免费开源（MIT）"
		},
		trust: { "items": [
			"只读，绝不改动你的文件",
			"完全在本机运行",
			"零遥测、无账号",
			"凭证永不显示"
		] },
		value: {
			"eyebrow": "为什么需要 Berth",
			"heading": "看不见的资产，管不好的能力",
			"items": [
				{
					"title": "资产可见化",
					"body": "把纯文本的 skill、hook、MCP，从散落的文件树升级为结构化、可关联的对象。"
				},
				{
					"title": "跨 Agent 统一",
					"body": "Claude Code 与 Codex 的配置、能力、会话，集中在一处对照查看。"
				},
				{
					"title": "本地优先",
					"body": "一切都在你的机器上运行——零遥测、无云同步、无需账号。"
				},
				{
					"title": "只读且安全",
					"body": "v0.1 不修改任何文件；API Key 与 Token 只探测状态，永不显示。"
				}
			]
		},
		features: {
			"eyebrow": "核心功能",
			"heading": "一处看清你的 Agent 全貌",
			"items": [
				{
					"name": "Overview",
					"title": "总览仪表盘",
					"body": "资产数量、最近会话、本周花费与健康检查，一屏掌握。",
					"points": [
						"资产清点",
						"最近活动",
						"成本与健康检查"
					]
				},
				{
					"name": "Sessions",
					"title": "会话浏览",
					"body": "按项目或时间浏览历史会话，查看加载的 Skill、连接的 MCP、触发的 Hook 与产物。",
					"points": [
						"按项目或时间分组",
						"每个会话的加载资产",
						"工具时间线"
					]
				},
				{
					"name": "Configuration",
					"title": "盘点你的装备",
					"body": "Instructions 与 Capabilities 两栏，跨 user / project / enterprise 作用域合并展示，标注来源与冲突。",
					"points": [
						"Instructions 与 Capabilities",
						"作用域合并",
						"冲突检测"
					]
				},
				{
					"name": "Usage",
					"title": "用量与成本",
					"body": "按模型、按项目、按天的花费与 Token 走势，速率限制余量一目了然。",
					"points": [
						"按模型 / 项目 / 天",
						"Token 拆解",
						"速率限制"
					]
				}
			]
		},
		bridge: {
			"eyebrow": "知识库",
			"heading": "先看懂 AI Agent 能做什么",
			"body": "在管理这些资产之前，先用通俗的语言认识 Agent 之所以为 Agent——感知、规划、工具调用、记忆，以及自主多步执行。每一条解释都标注一手参考来源。",
			"cta": "进入知识库"
		},
		kb: {
			"eyebrow": "三大板块",
			"heading": "不只是功能罗列，更是认识 Agent 的入口",
			"pillars": [
				{
					"tag": "科普",
					"title": "认识 AI Agent",
					"body": "用通俗语言和可信来源，讲清 Agent 与聊天模型的区别，以及它的核心能力。",
					"cta": "开始了解"
				},
				{
					"tag": "功能",
					"title": "Berth 功能详解",
					"body": "逐一拆解 Overview、Sessions、Configuration、Usage，以及它们背后的资产模型。",
					"cta": "查看功能"
				},
				{
					"tag": "教程",
					"title": "实操教程",
					"body": "排查 Hook 为何不触发、看懂你的成本、为团队建立配置基线。",
					"cta": "跟着做"
				}
			]
		},
		faq: {
			"eyebrow": "常见问题",
			"heading": "你可能想知道",
			"items": [
				{
					"q": "Berth 会修改我的文件吗？",
					"a": "不会。v0.1 完全只读——只扫描和展示，绝不写入任何配置或资产文件。"
				},
				{
					"q": "我的数据会被上传吗？",
					"a": "不会。Berth 完全在本机运行：零遥测、无云同步、无账号体系。"
				},
				{
					"q": "支持哪些 Agent？",
					"a": "v0.1 聚焦 Claude Code，并已为 Codex 等设计了适配层，后续版本逐步扩展。"
				},
				{
					"q": "是免费的吗？",
					"a": "是。Berth 开源并采用 MIT 许可——欢迎在 GitHub 参与贡献。"
				}
			]
		},
		cta: {
			"heading": "看清你的 AI Agent，从 Berth 开始",
			"body": "免费、开源、本地优先。下载即用，或在 GitHub 上了解更多。",
			"primary": "下载 Berth",
			"secondary": "在 GitHub Star",
			"meta": "macOS 11+ / Windows 10+ · MIT"
		},
		footer: {
			"tagline": "本地 AI Agent 资产管理器。",
			"productTitle": "产品",
			"featuresLink": "功能",
			"knowledgeLink": "知识库",
			"changelogLink": "更新日志",
			"resourcesTitle": "资源",
			"githubLink": "GitHub",
			"aboutLink": "关于",
			"privacyLink": "隐私政策",
			"copyright": "© 2026 Berth · MIT License",
			"madeBy": "由 Caldis 打造"
		},
		meta: {
			"home": {
				"title": "Berth — 看清每一个本地 AI Agent 资产",
				"description": "Berth 是一款本地优先、只读的桌面应用，扫描并可视化你的 AI Agent 资产——Skills、MCP、Hooks、子代理、会话与成本，支持 Claude Code 与 Codex。"
			},
			"features": {
				"title": "功能 — Berth",
				"description": "Overview、Sessions、Configuration 与 Usage：Berth 如何让本地 AI Agent 资产变得可见。"
			},
			"knowledge": {
				"title": "知识库 — Berth",
				"description": "认识 AI Agent、了解 Berth 功能、跟随实操教程。通俗易懂，且标注一手来源。"
			},
			"about": {
				"title": "关于 — Berth",
				"description": "Berth 是一款由 Caldis 打造的开源、本地优先的 AI Agent 资产管理器。"
			},
			"privacy": {
				"title": "隐私政策 — Berth",
				"description": "Berth 完全在你的机器上运行：无遥测、无云同步、无账号。"
			},
			"changelog": {
				"title": "更新日志 — Berth",
				"description": "Berth 的最新进展。"
			}
		},
		pages: {
			"knowledgeIntro": "三大板块，一个目标：帮你认识 AI Agent，并从容地管理它们。深度文章将陆续上线，每篇都标注一手参考来源。",
			"featuresIntro": "Berth 把 AI Agent 背后的纯文本资产，变成结构化、可浏览的对象。下面是这款应用的全貌。",
			"about": {
				"body1": "Berth 让 AI Agent 背后看不见的资产变得可见。随着 Claude Code、Codex 等工具快速演进，你在本地积累的 skills、MCP、hooks 与记忆，大多是缺乏可见性的纯文本。Berth 扫描它们、关联它们，把它们呈现为一等公民般的对象。",
				"body2": "Berth 开源并采用 MIT 许可，由 Caldis 打造。v0.1 在设计上即只读、本地优先。"
			},
			"privacy": {
				"body1": "Berth 完全在你的机器上运行。它不发送任何遥测、没有账号体系，你的数据永不离开你的电脑。",
				"body2": "Berth 为了展示而读取 Agent 的配置与会话文件；v0.1 绝不写入它们。API Key、Token 等凭证仅用于探测状态，永不显示其内容。"
			},
			"changelog": {
				"intro": "Berth 还很年轻，这是它目前的状态。",
				"items": [{
					"version": "v0.1",
					"date": "2026",
					"notes": [
						"面向 Claude Code 的只读资产可视化",
						"Overview、Sessions、Configuration、Usage",
						"作用域合并、健康检查、全局搜索",
						"English / 简体中文 / 日本語 / 한국어"
					]
				}]
			}
		},
		notFound: {
			"title": "页面未找到",
			"body": "你访问的页面不存在。",
			"cta": "返回首页"
		}
	} },
	en: { translation: {
		nav: {
			"features": "Features",
			"knowledge": "Knowledge",
			"download": "Download"
		},
		hero: {
			"badge": "Local-first · Read-only · Zero telemetry",
			"title": "Your local AI agent assets,",
			"titleAccent": "finally visible.",
			"subtitle": "Berth scans the Skills, MCP servers, hooks, subagents and sessions scattered across your machine and connects them into one browsable, searchable map — so you finally know what you have, how it works together, and what it costs.",
			"ctaPrimary": "Download Berth",
			"ctaSecondary": "View on GitHub",
			"note": "macOS 11+ / Windows 10+ · Free & open source (MIT)"
		},
		trust: { "items": [
			"Read-only — never changes your files",
			"Runs fully on your machine",
			"No telemetry, no account",
			"Credentials never shown"
		] },
		value: {
			"eyebrow": "Why Berth",
			"heading": "Invisible assets, unmanaged capabilities",
			"items": [
				{
					"title": "Make assets visible",
					"body": "Turn plain-text skills, hooks and MCP servers from a scattered file tree into structured, connected objects."
				},
				{
					"title": "One view across agents",
					"body": "Configuration, capabilities and sessions for Claude Code and Codex, side by side in one place."
				},
				{
					"title": "Local-first",
					"body": "Everything runs on your machine — zero telemetry, no cloud sync, no account required."
				},
				{
					"title": "Read-only & safe",
					"body": "v0.1 never modifies a file. API keys and tokens are detected, never displayed."
				}
			]
		},
		features: {
			"eyebrow": "Core features",
			"heading": "Your whole agent setup, at a glance",
			"items": [
				{
					"name": "Overview",
					"title": "A dashboard for everything",
					"body": "Asset counts, recent sessions, this week's spend and health checks — all on one screen.",
					"points": [
						"Asset inventory",
						"Recent activity",
						"Cost & health checks"
					]
				},
				{
					"name": "Sessions",
					"title": "Browse past work",
					"body": "Walk through sessions by project or date, and see the skills loaded, MCP servers connected, hooks fired and artifacts produced.",
					"points": [
						"Group by project or date",
						"Loaded assets per session",
						"Tool timeline"
					]
				},
				{
					"name": "Configuration",
					"title": "Take inventory",
					"body": "Instructions and Capabilities in two columns, merged across user, project and enterprise scope, with sources and conflicts marked.",
					"points": [
						"Instructions & Capabilities",
						"Scope merge",
						"Conflict detection"
					]
				},
				{
					"name": "Usage",
					"title": "Spend & tokens",
					"body": "Cost and token trends by model, project and day, with rate-limit headroom kept in plain sight.",
					"points": [
						"By model / project / day",
						"Token breakdown",
						"Rate limits"
					]
				}
			]
		},
		bridge: {
			"eyebrow": "Knowledge base",
			"heading": "First, understand what AI agents can do",
			"body": "Before managing these assets, get a plain-language grasp of what makes an agent an agent — perception, planning, tool use, memory, and autonomous multi-step execution. Every explanation cites a primary source.",
			"cta": "Enter the knowledge base"
		},
		kb: {
			"eyebrow": "Three tracks",
			"heading": "Not a feature dump — a way in to understanding agents",
			"pillars": [
				{
					"tag": "Learn",
					"title": "Understand AI agents",
					"body": "In plain words and trusted sources: how an agent differs from a chat model, and its core capabilities.",
					"cta": "Start learning"
				},
				{
					"tag": "Features",
					"title": "Berth features in depth",
					"body": "A walk through Overview, Sessions, Configuration and Usage — and the asset model behind them.",
					"cta": "Explore features"
				},
				{
					"tag": "Guides",
					"title": "Hands-on guides",
					"body": "Diagnose why a hook isn't firing, make sense of your cost, set a config baseline for your team.",
					"cta": "Follow along"
				}
			]
		},
		faq: {
			"eyebrow": "FAQ",
			"heading": "You might be wondering",
			"items": [
				{
					"q": "Will Berth modify my files?",
					"a": "No. v0.1 is fully read-only — it scans and displays, and never writes to any config or asset file."
				},
				{
					"q": "Is my data uploaded anywhere?",
					"a": "No. Berth runs entirely on your machine: zero telemetry, no cloud sync, no accounts."
				},
				{
					"q": "Which agents are supported?",
					"a": "v0.1 focuses on Claude Code, with an adapter layer already designed for Codex and more in later releases."
				},
				{
					"q": "Is it free?",
					"a": "Yes. Berth is open source under the MIT license — contributions welcome on GitHub."
				}
			]
		},
		cta: {
			"heading": "See your AI agents clearly — start with Berth",
			"body": "Free, open source, local-first. Download and go, or learn more on GitHub.",
			"primary": "Download Berth",
			"secondary": "Star on GitHub",
			"meta": "macOS 11+ / Windows 10+ · MIT"
		},
		footer: {
			"tagline": "Local AI agent asset manager.",
			"productTitle": "Product",
			"featuresLink": "Features",
			"knowledgeLink": "Knowledge",
			"changelogLink": "Changelog",
			"resourcesTitle": "Resources",
			"githubLink": "GitHub",
			"aboutLink": "About",
			"privacyLink": "Privacy",
			"copyright": "© 2026 Berth · MIT License",
			"madeBy": "Built by Caldis"
		},
		meta: {
			"home": {
				"title": "Berth — See every local AI agent asset",
				"description": "Berth is a local-first, read-only desktop app that scans and visualizes your AI agent assets — Skills, MCP servers, hooks, subagents, sessions and cost — for Claude Code and Codex."
			},
			"features": {
				"title": "Features — Berth",
				"description": "Overview, Sessions, Configuration and Usage: how Berth makes your local AI agent assets visible."
			},
			"knowledge": {
				"title": "Knowledge base — Berth",
				"description": "Understand AI agents, explore Berth's features, and follow hands-on guides. Plain-language and primary-sourced."
			},
			"about": {
				"title": "About — Berth",
				"description": "Berth is an open-source, local-first AI agent asset manager built by Caldis."
			},
			"privacy": {
				"title": "Privacy — Berth",
				"description": "Berth runs entirely on your machine: no telemetry, no cloud sync, no account."
			},
			"changelog": {
				"title": "Changelog — Berth",
				"description": "What's new in Berth."
			}
		},
		pages: {
			"knowledgeIntro": "Three tracks, one goal: help you understand AI agents and manage them with confidence. In-depth articles are landing here next, each citing primary sources.",
			"featuresIntro": "Berth turns the plain-text assets behind your AI agents into structured, browsable objects. Here is the shape of the app.",
			"about": {
				"body1": "Berth makes the invisible assets behind your AI agents visible. As tools like Claude Code and Codex evolve, the skills, MCP servers, hooks and memories you accumulate locally pile up as plain text with no real visibility. Berth scans them, connects them, and shows them as first-class objects.",
				"body2": "Berth is open source under the MIT license and built by Caldis. v0.1 is read-only and local-first by design."
			},
			"privacy": {
				"body1": "Berth runs entirely on your machine. It sends no telemetry, has no account system, and your data never leaves your computer.",
				"body2": "Berth reads agent configuration and session files in order to display them. v0.1 never writes to them. Credentials such as API keys and tokens are detected for status only and are never displayed."
			},
			"changelog": {
				"intro": "Berth is early. Here is where it stands.",
				"items": [{
					"version": "v0.1",
					"date": "2026",
					"notes": [
						"Read-only asset visualization for Claude Code",
						"Overview, Sessions, Configuration, Usage",
						"Scope merge, health checks, global search",
						"English / 简体中文 / 日本語 / 한국어"
					]
				}]
			}
		},
		notFound: {
			"title": "Page not found",
			"body": "The page you're looking for doesn't exist.",
			"cta": "Back to home"
		}
	} },
	ja: { translation: {
		nav: {
			"features": "機能",
			"knowledge": "ナレッジ",
			"download": "ダウンロード"
		},
		hero: {
			"badge": "ローカルファースト · 読み取り専用 · テレメトリなし",
			"title": "ローカルの AI エージェント資産を、",
			"titleAccent": "ひと目で。",
			"subtitle": "Berth はマシン中に散らばった Skills、MCP、Hooks、サブエージェント、セッションをスキャンし、閲覧・検索できる一枚のマップにつなぎます。何を持ち、どう連携し、いくらかかっているのかが、ようやく分かります。",
			"ctaPrimary": "Berth をダウンロード",
			"ctaSecondary": "GitHub で見る",
			"note": "macOS 11+ / Windows 10+ · 無料・オープンソース（MIT）"
		},
		trust: { "items": [
			"読み取り専用——ファイルを変更しません",
			"完全にローカルで動作",
			"テレメトリなし、アカウント不要",
			"認証情報は表示しません"
		] },
		value: {
			"eyebrow": "Berth が必要な理由",
			"heading": "見えない資産、管理できない能力",
			"items": [
				{
					"title": "資産を見える化",
					"body": "テキストの skill・hook・MCP を、散らばったファイルツリーから構造化された関連オブジェクトへ。"
				},
				{
					"title": "エージェント横断で一望",
					"body": "Claude Code と Codex の設定・能力・セッションを、一か所に並べて確認。"
				},
				{
					"title": "ローカルファースト",
					"body": "すべてマシン上で動作——テレメトリなし、クラウド同期なし、アカウント不要。"
				},
				{
					"title": "読み取り専用で安全",
					"body": "v0.1 はファイルを変更しません。API キーやトークンは状態のみ検出し、表示しません。"
				}
			]
		},
		features: {
			"eyebrow": "主な機能",
			"heading": "エージェント構成の全体を一目で",
			"items": [
				{
					"name": "Overview",
					"title": "すべてのダッシュボード",
					"body": "資産数、最近のセッション、今週の費用、ヘルスチェックを一画面で。",
					"points": [
						"資産インベントリ",
						"最近のアクティビティ",
						"費用とヘルスチェック"
					]
				},
				{
					"name": "Sessions",
					"title": "過去の作業を閲覧",
					"body": "プロジェクトや日付でセッションをたどり、読み込まれた Skill、接続された MCP、発火した Hook、生成物を確認。",
					"points": [
						"プロジェクト／日付でグループ化",
						"セッションごとの読み込み資産",
						"ツールのタイムライン"
					]
				},
				{
					"name": "Configuration",
					"title": "装備を棚卸し",
					"body": "Instructions と Capabilities を二列で。user / project / enterprise スコープを統合し、出所と競合を明示。",
					"points": [
						"Instructions と Capabilities",
						"スコープのマージ",
						"競合の検出"
					]
				},
				{
					"name": "Usage",
					"title": "費用とトークン",
					"body": "モデル・プロジェクト・日別の費用とトークン推移。レート制限の余裕も常に表示。",
					"points": [
						"モデル／プロジェクト／日別",
						"トークンの内訳",
						"レート制限"
					]
				}
			]
		},
		bridge: {
			"eyebrow": "ナレッジベース",
			"heading": "まず、AI エージェントに何ができるかを理解する",
			"body": "資産を管理する前に、エージェントをエージェントたらしめるもの——知覚、計画、ツール利用、記憶、自律的な複数ステップ実行——をやさしい言葉で。すべての説明に一次情報の出典を明記しています。",
			"cta": "ナレッジベースへ"
		},
		kb: {
			"eyebrow": "3 つのトラック",
			"heading": "機能の羅列ではなく、エージェントを理解する入口",
			"pillars": [
				{
					"tag": "学ぶ",
					"title": "AI エージェントを理解する",
					"body": "やさしい言葉と信頼できる出典で、チャットモデルとの違いとコア能力を解説。",
					"cta": "学び始める"
				},
				{
					"tag": "機能",
					"title": "Berth の機能を詳しく",
					"body": "Overview・Sessions・Configuration・Usage と、その背後の資産モデルを案内。",
					"cta": "機能を見る"
				},
				{
					"tag": "ガイド",
					"title": "実践ガイド",
					"body": "Hook が発火しない原因の特定、費用の読み解き、チームの設定ベースライン作り。",
					"cta": "やってみる"
				}
			]
		},
		faq: {
			"eyebrow": "FAQ",
			"heading": "よくある質問",
			"items": [
				{
					"q": "Berth はファイルを変更しますか？",
					"a": "いいえ。v0.1 は完全に読み取り専用で、スキャンと表示のみ。設定や資産ファイルに書き込むことはありません。"
				},
				{
					"q": "データはどこかにアップロードされますか？",
					"a": "いいえ。Berth は完全にローカルで動作します。テレメトリなし、クラウド同期なし、アカウントなし。"
				},
				{
					"q": "どのエージェントに対応していますか？",
					"a": "v0.1 は Claude Code を中心に対応。Codex 等向けのアダプタ層も設計済みで、今後のリリースで拡張します。"
				},
				{
					"q": "無料ですか？",
					"a": "はい。Berth は MIT ライセンスのオープンソースです。GitHub での貢献を歓迎します。"
				}
			]
		},
		cta: {
			"heading": "AI エージェントをはっきり見る——Berth から",
			"body": "無料・オープンソース・ローカルファースト。ダウンロードしてすぐ使う、または GitHub で詳しく。",
			"primary": "Berth をダウンロード",
			"secondary": "GitHub で Star",
			"meta": "macOS 11+ / Windows 10+ · MIT"
		},
		footer: {
			"tagline": "ローカル AI エージェント資産マネージャー。",
			"productTitle": "プロダクト",
			"featuresLink": "機能",
			"knowledgeLink": "ナレッジ",
			"changelogLink": "変更履歴",
			"resourcesTitle": "リソース",
			"githubLink": "GitHub",
			"aboutLink": "概要",
			"privacyLink": "プライバシー",
			"copyright": "© 2026 Berth · MIT License",
			"madeBy": "Caldis 制作"
		},
		meta: {
			"home": {
				"title": "Berth — ローカルの AI エージェント資産をすべて見える化",
				"description": "Berth はローカルファーストで読み取り専用のデスクトップアプリ。Skills・MCP・Hooks・サブエージェント・セッション・費用といった AI エージェント資産をスキャンして可視化します（Claude Code / Codex 対応）。"
			},
			"features": {
				"title": "機能 — Berth",
				"description": "Overview・Sessions・Configuration・Usage：Berth がローカルの AI エージェント資産を可視化する方法。"
			},
			"knowledge": {
				"title": "ナレッジベース — Berth",
				"description": "AI エージェントを理解し、Berth の機能を知り、実践ガイドをたどる。やさしく、一次情報の出典付き。"
			},
			"about": {
				"title": "概要 — Berth",
				"description": "Berth は Caldis が作る、オープンソースでローカルファーストの AI エージェント資産マネージャーです。"
			},
			"privacy": {
				"title": "プライバシー — Berth",
				"description": "Berth は完全にあなたのマシン上で動作します。テレメトリなし、クラウド同期なし、アカウントなし。"
			},
			"changelog": {
				"title": "変更履歴 — Berth",
				"description": "Berth の最新情報。"
			}
		},
		pages: {
			"knowledgeIntro": "3 つのトラック、目標は一つ。AI エージェントを理解し、自信を持って管理できるように。一次情報を明記した詳しい記事を順次公開します。",
			"featuresIntro": "Berth は AI エージェントの背後にあるテキスト資産を、構造化された閲覧可能なオブジェクトに変えます。これがアプリの全体像です。",
			"about": {
				"body1": "Berth は AI エージェントの背後にある見えない資産を可視化します。Claude Code や Codex のようなツールが進化するなか、ローカルにたまる skills・MCP・hooks・記憶は、可視性のないテキストとして積み上がります。Berth はそれらをスキャンし、関連づけ、一級のオブジェクトとして示します。",
				"body2": "Berth は MIT ライセンスのオープンソースで、Caldis が制作しています。v0.1 は設計上、読み取り専用かつローカルファーストです。"
			},
			"privacy": {
				"body1": "Berth は完全にあなたのマシン上で動作します。テレメトリを送信せず、アカウント機能もなく、データがコンピュータの外に出ることはありません。",
				"body2": "Berth は表示のためにエージェントの設定・セッションファイルを読み取りますが、v0.1 が書き込むことはありません。API キーやトークンなどの認証情報は状態の検出のみに使い、内容を表示しません。"
			},
			"changelog": {
				"intro": "Berth はまだ初期段階です。現状をまとめます。",
				"items": [{
					"version": "v0.1",
					"date": "2026",
					"notes": [
						"Claude Code 向けの読み取り専用資産可視化",
						"Overview・Sessions・Configuration・Usage",
						"スコープのマージ、ヘルスチェック、全文検索",
						"English / 简体中文 / 日本語 / 한국어"
					]
				}]
			}
		},
		notFound: {
			"title": "ページが見つかりません",
			"body": "お探しのページは存在しません。",
			"cta": "ホームに戻る"
		}
	} },
	ko: { translation: {
		nav: {
			"features": "기능",
			"knowledge": "지식베이스",
			"download": "다운로드"
		},
		hero: {
			"badge": "로컬 우선 · 읽기 전용 · 텔레메트리 없음",
			"title": "로컬 AI 에이전트 자산을,",
			"titleAccent": "한눈에.",
			"subtitle": "Berth는 기기 곳곳에 흩어진 Skills, MCP, Hooks, 서브에이전트, 세션을 스캔해 탐색·검색 가능한 하나의 지도로 연결합니다. 무엇을 갖고 있는지, 어떻게 함께 작동하는지, 비용은 얼마인지 마침내 알 수 있습니다.",
			"ctaPrimary": "Berth 다운로드",
			"ctaSecondary": "GitHub에서 보기",
			"note": "macOS 11+ / Windows 10+ · 무료 오픈소스 (MIT)"
		},
		trust: { "items": [
			"읽기 전용 — 파일을 변경하지 않음",
			"전적으로 기기에서 실행",
			"텔레메트리 없음, 계정 불필요",
			"자격 증명은 표시하지 않음"
		] },
		value: {
			"eyebrow": "왜 Berth인가",
			"heading": "보이지 않는 자산, 관리되지 않는 능력",
			"items": [
				{
					"title": "자산을 가시화",
					"body": "텍스트로 된 skill, hook, MCP를 흩어진 파일 트리에서 구조화된 연결 객체로."
				},
				{
					"title": "에이전트 통합 보기",
					"body": "Claude Code와 Codex의 설정·능력·세션을 한곳에 나란히 확인."
				},
				{
					"title": "로컬 우선",
					"body": "모든 것이 기기에서 실행 — 텔레메트리 없음, 클라우드 동기화 없음, 계정 불필요."
				},
				{
					"title": "읽기 전용, 안전",
					"body": "v0.1은 파일을 변경하지 않습니다. API 키와 토큰은 상태만 감지하고 표시하지 않습니다."
				}
			]
		},
		features: {
			"eyebrow": "핵심 기능",
			"heading": "에이전트 구성 전체를 한눈에",
			"items": [
				{
					"name": "Overview",
					"title": "모든 것의 대시보드",
					"body": "자산 수, 최근 세션, 이번 주 지출, 헬스 체크를 한 화면에.",
					"points": [
						"자산 인벤토리",
						"최근 활동",
						"비용과 헬스 체크"
					]
				},
				{
					"name": "Sessions",
					"title": "지난 작업 탐색",
					"body": "프로젝트나 날짜로 세션을 따라가며 로드된 Skill, 연결된 MCP, 발생한 Hook, 산출물을 확인.",
					"points": [
						"프로젝트/날짜로 그룹화",
						"세션별 로드 자산",
						"도구 타임라인"
					]
				},
				{
					"name": "Configuration",
					"title": "장비 점검",
					"body": "Instructions와 Capabilities를 두 열로. user / project / enterprise 스코프를 병합하고 출처와 충돌을 표시.",
					"points": [
						"Instructions와 Capabilities",
						"스코프 병합",
						"충돌 감지"
					]
				},
				{
					"name": "Usage",
					"title": "지출과 토큰",
					"body": "모델·프로젝트·일자별 비용과 토큰 추이, 레이트 리밋 여유까지 한눈에.",
					"points": [
						"모델/프로젝트/일자별",
						"토큰 분해",
						"레이트 리밋"
					]
				}
			]
		},
		bridge: {
			"eyebrow": "지식베이스",
			"heading": "먼저, AI 에이전트가 무엇을 할 수 있는지 이해하기",
			"body": "자산을 관리하기 전에, 에이전트를 에이전트답게 만드는 것——인식, 계획, 도구 사용, 기억, 자율적 다단계 실행——을 쉬운 말로. 모든 설명에 1차 출처를 표기합니다.",
			"cta": "지식베이스로 이동"
		},
		kb: {
			"eyebrow": "세 가지 트랙",
			"heading": "기능 나열이 아니라, 에이전트를 이해하는 입구",
			"pillars": [
				{
					"tag": "학습",
					"title": "AI 에이전트 이해하기",
					"body": "쉬운 말과 신뢰할 수 있는 출처로, 챗 모델과의 차이와 핵심 능력을 설명.",
					"cta": "학습 시작"
				},
				{
					"tag": "기능",
					"title": "Berth 기능 자세히",
					"body": "Overview·Sessions·Configuration·Usage와 그 뒤의 자산 모델을 안내.",
					"cta": "기능 보기"
				},
				{
					"tag": "가이드",
					"title": "실습 가이드",
					"body": "Hook이 발생하지 않는 원인 진단, 비용 이해, 팀 설정 베이스라인 만들기.",
					"cta": "따라 하기"
				}
			]
		},
		faq: {
			"eyebrow": "FAQ",
			"heading": "궁금하실 수 있어요",
			"items": [
				{
					"q": "Berth가 제 파일을 변경하나요?",
					"a": "아니요. v0.1은 완전히 읽기 전용으로, 스캔하고 표시할 뿐 어떤 설정·자산 파일에도 쓰지 않습니다."
				},
				{
					"q": "제 데이터가 어딘가로 업로드되나요?",
					"a": "아니요. Berth는 전적으로 기기에서 실행됩니다. 텔레메트리 없음, 클라우드 동기화 없음, 계정 없음."
				},
				{
					"q": "어떤 에이전트를 지원하나요?",
					"a": "v0.1은 Claude Code를 중심으로 지원하며, Codex 등을 위한 어댑터 계층도 이미 설계되어 이후 릴리스에서 확장됩니다."
				},
				{
					"q": "무료인가요?",
					"a": "네. Berth는 MIT 라이선스의 오픈소스입니다. GitHub에서의 기여를 환영합니다."
				}
			]
		},
		cta: {
			"heading": "AI 에이전트를 또렷하게 — Berth로 시작하세요",
			"body": "무료, 오픈소스, 로컬 우선. 다운로드해 바로 쓰거나 GitHub에서 더 알아보세요.",
			"primary": "Berth 다운로드",
			"secondary": "GitHub에서 Star",
			"meta": "macOS 11+ / Windows 10+ · MIT"
		},
		footer: {
			"tagline": "로컬 AI 에이전트 자산 관리자.",
			"productTitle": "제품",
			"featuresLink": "기능",
			"knowledgeLink": "지식베이스",
			"changelogLink": "변경 내역",
			"resourcesTitle": "리소스",
			"githubLink": "GitHub",
			"aboutLink": "소개",
			"privacyLink": "개인정보",
			"copyright": "© 2026 Berth · MIT License",
			"madeBy": "Caldis 제작"
		},
		meta: {
			"home": {
				"title": "Berth — 모든 로컬 AI 에이전트 자산을 한눈에",
				"description": "Berth는 로컬 우선, 읽기 전용 데스크톱 앱으로 Skills·MCP·Hooks·서브에이전트·세션·비용 같은 AI 에이전트 자산을 스캔하고 시각화합니다 (Claude Code / Codex 지원)."
			},
			"features": {
				"title": "기능 — Berth",
				"description": "Overview·Sessions·Configuration·Usage: Berth가 로컬 AI 에이전트 자산을 가시화하는 방법."
			},
			"knowledge": {
				"title": "지식베이스 — Berth",
				"description": "AI 에이전트를 이해하고, Berth 기능을 살펴보고, 실습 가이드를 따라가세요. 쉽고 1차 출처 기반."
			},
			"about": {
				"title": "소개 — Berth",
				"description": "Berth는 Caldis가 만든 오픈소스, 로컬 우선 AI 에이전트 자산 관리자입니다."
			},
			"privacy": {
				"title": "개인정보 — Berth",
				"description": "Berth는 전적으로 기기에서 실행됩니다. 텔레메트리 없음, 클라우드 동기화 없음, 계정 없음."
			},
			"changelog": {
				"title": "변경 내역 — Berth",
				"description": "Berth의 새로운 소식."
			}
		},
		pages: {
			"knowledgeIntro": "세 가지 트랙, 하나의 목표. AI 에이전트를 이해하고 자신 있게 관리하도록 돕습니다. 1차 출처를 표기한 심화 글이 곧 올라옵니다.",
			"featuresIntro": "Berth는 AI 에이전트 뒤의 텍스트 자산을 구조화된 탐색 가능한 객체로 바꿉니다. 앱의 전체 모습입니다.",
			"about": {
				"body1": "Berth는 AI 에이전트 뒤에 숨은 보이지 않는 자산을 가시화합니다. Claude Code, Codex 같은 도구가 발전하면서 로컬에 쌓이는 skills·MCP·hooks·기억은 가시성 없는 텍스트로 누적됩니다. Berth는 이를 스캔하고 연결해 일급 객체로 보여줍니다.",
				"body2": "Berth는 MIT 라이선스의 오픈소스이며 Caldis가 만듭니다. v0.1은 설계상 읽기 전용이며 로컬 우선입니다."
			},
			"privacy": {
				"body1": "Berth는 전적으로 기기에서 실행됩니다. 텔레메트리를 보내지 않고, 계정 시스템이 없으며, 데이터가 컴퓨터를 벗어나지 않습니다.",
				"body2": "Berth는 표시를 위해 에이전트 설정·세션 파일을 읽지만 v0.1은 쓰지 않습니다. API 키·토큰 같은 자격 증명은 상태 감지에만 쓰고 내용을 표시하지 않습니다."
			},
			"changelog": {
				"intro": "Berth는 아직 초기 단계입니다. 현재 상태입니다.",
				"items": [{
					"version": "v0.1",
					"date": "2026",
					"notes": [
						"Claude Code용 읽기 전용 자산 시각화",
						"Overview·Sessions·Configuration·Usage",
						"스코프 병합, 헬스 체크, 전체 검색",
						"English / 简体中文 / 日本語 / 한국어"
					]
				}]
			}
		},
		notFound: {
			"title": "페이지를 찾을 수 없음",
			"body": "찾으시는 페이지가 존재하지 않습니다.",
			"cta": "홈으로"
		}
	} }
};
var cache = {};
/**
* One i18next instance per language. SSG prerenders every language in a single
* Node process, so a shared singleton would race; isolated instances avoid that.
*/
function getI18n(lang) {
	const existing = cache[lang];
	if (existing) return existing;
	const instance = i18next.createInstance();
	instance.use(initReactI18next).init({
		lng: lang,
		fallbackLng: "en",
		resources,
		interpolation: { escapeValue: false },
		react: { useSuspense: false }
	});
	cache[lang] = instance;
	return instance;
}
//#endregion
//#region src/lib/langs.ts
var LANGS = [
	"zh",
	"en",
	"ja",
	"ko"
];
var LANG_LABELS = {
	zh: "简体中文",
	en: "English",
	ja: "日本語",
	ko: "한국어"
};
/** hreflang codes for <link rel="alternate"> */
var HREFLANG = {
	zh: "zh-Hans",
	en: "en",
	ja: "ja",
	ko: "ko"
};
function isLang(value) {
	return !!value && LANGS.includes(value);
}
//#endregion
//#region src/lib/useLang.ts
/** Derives the active language from the first path segment, e.g. /zh/knowledge -> 'zh'. */
function useLang() {
	const segment = useLocation().pathname.split("/")[1];
	return isLang(segment) ? segment : "en";
}
//#endregion
//#region src/components/GithubIcon.tsx
/** GitHub mark — lucide v1 removed brand icons, so we ship our own. */
function GithubIcon({ className }) {
	return /* @__PURE__ */ jsx("svg", {
		viewBox: "0 0 24 24",
		fill: "currentColor",
		className,
		"aria-hidden": true,
		focusable: "false",
		children: /* @__PURE__ */ jsx("path", { d: "M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.08.78 2.18 0 1.57-.01 2.84-.01 3.23 0 .31.21.68.8.56A11.52 11.52 0 0 0 23.5 12.02C23.5 5.74 18.27.5 12 .5Z" })
	});
}
//#endregion
//#region src/lib/site.ts
var SITE_URL = "https://berth.caldis.me";
var GITHUB_URL = "https://github.com/Caldis/berth";
var RELEASES_URL = `${GITHUB_URL}/releases`;
//#endregion
//#region src/lib/cn.ts
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
//#endregion
//#region src/components/LanguageSwitcher.tsx
function LanguageSwitcher() {
	const current = useLang();
	const location = useLocation();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	useEffect(() => {
		function onClick(e) {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		}
		document.addEventListener("mousedown", onClick);
		return () => document.removeEventListener("mousedown", onClick);
	}, []);
	function switchTo(l) {
		const parts = location.pathname.split("/");
		parts[1] = l;
		try {
			localStorage.setItem("berth-lang", l);
		} catch {}
		navigate(parts.join("/") || `/${l}`);
		setOpen(false);
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "relative",
		ref,
		children: [/* @__PURE__ */ jsxs("button", {
			onClick: () => setOpen((v) => !v),
			className: "inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink",
			"aria-haspopup": "listbox",
			"aria-expanded": open,
			children: [/* @__PURE__ */ jsx(Languages, { className: "h-4 w-4" }), /* @__PURE__ */ jsx("span", { children: LANG_LABELS[current] })]
		}), open && /* @__PURE__ */ jsx("ul", {
			className: "absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lift",
			role: "listbox",
			children: LANGS.map((l) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
				onClick: () => switchTo(l),
				className: cn("flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-harbor-soft/50", l === current ? "text-ink" : "text-muted"),
				children: [LANG_LABELS[l], l === current && /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5 text-harbor" })]
			}) }, l))
		})]
	});
}
//#endregion
//#region src/components/ThemeToggle.tsx
function ThemeToggle() {
	const [dark, setDark] = useState(false);
	useEffect(() => {
		setDark(document.documentElement.classList.contains("dark"));
	}, []);
	function toggle() {
		const next = !dark;
		setDark(next);
		document.documentElement.classList.toggle("dark", next);
		try {
			localStorage.setItem("berth-theme", next ? "dark" : "light");
		} catch {}
	}
	return /* @__PURE__ */ jsx("button", {
		onClick: toggle,
		"aria-label": "Toggle theme",
		className: "grid h-9 w-9 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-harbor/40 hover:text-ink",
		children: dark ? /* @__PURE__ */ jsx(Sun, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Moon, { className: "h-4 w-4" })
	});
}
//#endregion
//#region src/components/Nav.tsx
function Wordmark({ to }) {
	return /* @__PURE__ */ jsxs(Link, {
		to,
		className: "flex items-center gap-2.5",
		children: [/* @__PURE__ */ jsx("span", {
			className: "grid h-8 w-8 place-items-center rounded-lg bg-harbor font-display text-base font-bold text-white",
			children: "B"
		}), /* @__PURE__ */ jsx("span", {
			className: "font-display text-lg font-semibold tracking-tight",
			children: "Berth"
		})]
	});
}
function Nav() {
	const { t } = useTranslation();
	const base = `/${useLang()}`;
	const [open, setOpen] = useState(false);
	return /* @__PURE__ */ jsxs("header", {
		className: "sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md",
		children: [/* @__PURE__ */ jsxs("nav", {
			className: "container-page flex h-16 items-center justify-between gap-4",
			children: [
				/* @__PURE__ */ jsx(Wordmark, { to: base }),
				/* @__PURE__ */ jsxs("div", {
					className: "hidden items-center gap-7 md:flex",
					children: [
						/* @__PURE__ */ jsx(Link, {
							to: `${base}/features`,
							className: "text-sm text-muted transition-colors hover:text-ink",
							children: t("nav.features")
						}),
						/* @__PURE__ */ jsx(Link, {
							to: `${base}/knowledge`,
							className: "text-sm text-muted transition-colors hover:text-ink",
							children: t("nav.knowledge")
						}),
						/* @__PURE__ */ jsxs("a", {
							href: GITHUB_URL,
							target: "_blank",
							rel: "noreferrer",
							className: "inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink",
							children: [/* @__PURE__ */ jsx(GithubIcon, { className: "h-4 w-4" }), "GitHub"]
						}),
						/* @__PURE__ */ jsx("span", { className: "h-5 w-px bg-line" }),
						/* @__PURE__ */ jsx(LanguageSwitcher, {}),
						/* @__PURE__ */ jsx(ThemeToggle, {}),
						/* @__PURE__ */ jsxs("a", {
							href: RELEASES_URL,
							target: "_blank",
							rel: "noreferrer",
							className: "btn-primary",
							children: [/* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }), t("nav.download")]
						})
					]
				}),
				/* @__PURE__ */ jsx("button", {
					className: "grid h-9 w-9 place-items-center rounded-lg border border-line text-ink md:hidden",
					onClick: () => setOpen((v) => !v),
					"aria-label": "Menu",
					children: open ? /* @__PURE__ */ jsx(X, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(Menu, { className: "h-5 w-5" })
				})
			]
		}), open && /* @__PURE__ */ jsx("div", {
			className: "border-t border-line bg-paper md:hidden",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container-page flex flex-col gap-4 py-5",
				children: [
					/* @__PURE__ */ jsx(Link, {
						to: `${base}/features`,
						onClick: () => setOpen(false),
						className: "text-sm text-muted hover:text-ink",
						children: t("nav.features")
					}),
					/* @__PURE__ */ jsx(Link, {
						to: `${base}/knowledge`,
						onClick: () => setOpen(false),
						className: "text-sm text-muted hover:text-ink",
						children: t("nav.knowledge")
					}),
					/* @__PURE__ */ jsxs("a", {
						href: "https://github.com/Caldis/berth",
						target: "_blank",
						rel: "noreferrer",
						className: "inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink",
						children: [/* @__PURE__ */ jsx(GithubIcon, { className: "h-4 w-4" }), "GitHub"]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between border-t border-line pt-4",
						children: [/* @__PURE__ */ jsx(LanguageSwitcher, {}), /* @__PURE__ */ jsx(ThemeToggle, {})]
					}),
					/* @__PURE__ */ jsxs("a", {
						href: RELEASES_URL,
						target: "_blank",
						rel: "noreferrer",
						className: "btn-primary w-full",
						children: [/* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }), t("nav.download")]
					})
				]
			})
		})]
	});
}
//#endregion
//#region src/components/Footer.tsx
function Footer() {
	const { t } = useTranslation();
	const base = `/${useLang()}`;
	return /* @__PURE__ */ jsxs("footer", {
		className: "border-t border-line bg-surface",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "container-page grid gap-10 py-14 md:grid-cols-[1.6fr_1fr_1fr_auto]",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "max-w-xs",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2.5",
						children: [/* @__PURE__ */ jsx("span", {
							className: "grid h-7 w-7 place-items-center rounded-lg bg-harbor font-display text-sm font-bold text-white",
							children: "B"
						}), /* @__PURE__ */ jsx("span", {
							className: "font-display text-lg font-semibold",
							children: "Berth"
						})]
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-3 text-sm leading-relaxed text-muted",
						children: t("footer.tagline")
					})]
				}),
				/* @__PURE__ */ jsxs("nav", { children: [/* @__PURE__ */ jsx("div", {
					className: "text-xs font-semibold uppercase tracking-wider text-muted",
					children: t("footer.productTitle")
				}), /* @__PURE__ */ jsxs("ul", {
					className: "mt-4 space-y-2.5 text-sm",
					children: [
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							to: `${base}/features`,
							className: "text-muted transition-colors hover:text-ink",
							children: t("footer.featuresLink")
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							to: `${base}/knowledge`,
							className: "text-muted transition-colors hover:text-ink",
							children: t("footer.knowledgeLink")
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							to: `${base}/changelog`,
							className: "text-muted transition-colors hover:text-ink",
							children: t("footer.changelogLink")
						}) })
					]
				})] }),
				/* @__PURE__ */ jsxs("nav", { children: [/* @__PURE__ */ jsx("div", {
					className: "text-xs font-semibold uppercase tracking-wider text-muted",
					children: t("footer.resourcesTitle")
				}), /* @__PURE__ */ jsxs("ul", {
					className: "mt-4 space-y-2.5 text-sm",
					children: [
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("a", {
							href: GITHUB_URL,
							target: "_blank",
							rel: "noreferrer",
							className: "inline-flex items-center gap-1.5 text-muted transition-colors hover:text-ink",
							children: [/* @__PURE__ */ jsx(GithubIcon, { className: "h-3.5 w-3.5" }), t("footer.githubLink")]
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							to: `${base}/about`,
							className: "text-muted transition-colors hover:text-ink",
							children: t("footer.aboutLink")
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							to: `${base}/privacy`,
							className: "text-muted transition-colors hover:text-ink",
							children: t("footer.privacyLink")
						}) })
					]
				})] }),
				/* @__PURE__ */ jsx("div", {
					className: "flex items-start md:justify-end",
					children: /* @__PURE__ */ jsx(LanguageSwitcher, {})
				})
			]
		}), /* @__PURE__ */ jsx("div", {
			className: "border-t border-line",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-muted sm:flex-row",
				children: [/* @__PURE__ */ jsx("span", { children: t("footer.copyright") }), /* @__PURE__ */ jsx("span", { children: t("footer.madeBy") })]
			})
		})]
	});
}
//#endregion
//#region src/components/Layout.tsx
function Layout() {
	return /* @__PURE__ */ jsx(I18nextProvider, {
		i18n: getI18n(useLang()),
		children: /* @__PURE__ */ jsxs("div", {
			className: "flex min-h-screen flex-col",
			children: [
				/* @__PURE__ */ jsx(Nav, {}),
				/* @__PURE__ */ jsx("main", {
					className: "flex-1",
					children: /* @__PURE__ */ jsx(Outlet, {})
				}),
				/* @__PURE__ */ jsx(Footer, {})
			]
		})
	});
}
//#endregion
//#region src/components/Seo.tsx
function Seo({ lang, path, title, description }) {
	const url = `${SITE_URL}/${lang}${path}`;
	return /* @__PURE__ */ jsxs(Head, { children: [
		/* @__PURE__ */ jsx("html", { lang: HREFLANG[lang] }),
		/* @__PURE__ */ jsx("title", { children: title }),
		/* @__PURE__ */ jsx("meta", {
			name: "description",
			content: description
		}),
		/* @__PURE__ */ jsx("link", {
			rel: "canonical",
			href: url
		}),
		LANGS.map((l) => /* @__PURE__ */ jsx("link", {
			rel: "alternate",
			hrefLang: HREFLANG[l],
			href: `${SITE_URL}/${l}${path}`
		}, l)),
		/* @__PURE__ */ jsx("link", {
			rel: "alternate",
			hrefLang: "x-default",
			href: `${SITE_URL}/en${path}`
		}),
		/* @__PURE__ */ jsx("meta", {
			property: "og:type",
			content: "website"
		}),
		/* @__PURE__ */ jsx("meta", {
			property: "og:site_name",
			content: "Berth"
		}),
		/* @__PURE__ */ jsx("meta", {
			property: "og:title",
			content: title
		}),
		/* @__PURE__ */ jsx("meta", {
			property: "og:description",
			content: description
		}),
		/* @__PURE__ */ jsx("meta", {
			property: "og:url",
			content: url
		}),
		/* @__PURE__ */ jsx("meta", {
			property: "og:image",
			content: `${SITE_URL}/og/cover.png`
		}),
		/* @__PURE__ */ jsx("meta", {
			name: "twitter:card",
			content: "summary_large_image"
		}),
		/* @__PURE__ */ jsx("meta", {
			name: "twitter:title",
			content: title
		}),
		/* @__PURE__ */ jsx("meta", {
			name: "twitter:description",
			content: description
		})
	] });
}
//#endregion
//#region src/components/AssetPanel.tsx
var sidebar = [
	{
		icon: LayoutGrid,
		label: "Overview"
	},
	{
		icon: MessagesSquare,
		label: "Sessions"
	},
	{
		icon: Settings,
		label: "Configuration",
		active: true
	},
	{
		icon: Activity,
		label: "Usage"
	}
];
var rows = [
	{
		icon: Boxes,
		name: "code-review",
		kind: "Skill",
		scope: "user",
		tone: "harbor"
	},
	{
		icon: Plug,
		name: "github",
		kind: "MCP",
		scope: "project",
		tone: "amber"
	},
	{
		icon: Webhook,
		name: "PreToolUse",
		kind: "Hook",
		scope: "user",
		tone: "harbor"
	},
	{
		icon: Bot,
		name: "reviewer",
		kind: "Subagent",
		scope: "project",
		tone: "amber"
	},
	{
		icon: Boxes,
		name: "commit-helper",
		kind: "Skill",
		scope: "user",
		tone: "harbor"
	}
];
/**
* A stylized, non-interactive representation of Berth's Finder-style asset
* browser. Drawn with markup (no screenshot) so it stays crisp at any size.
*/
function AssetPanel() {
	return /* @__PURE__ */ jsxs("div", {
		className: "overflow-hidden rounded-2xl border border-line bg-surface shadow-lift",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-2 border-b border-line px-4 py-3",
			children: [
				/* @__PURE__ */ jsx("span", { className: "h-2.5 w-2.5 rounded-full bg-line" }),
				/* @__PURE__ */ jsx("span", { className: "h-2.5 w-2.5 rounded-full bg-line" }),
				/* @__PURE__ */ jsx("span", { className: "h-2.5 w-2.5 rounded-full bg-line" }),
				/* @__PURE__ */ jsx("span", {
					className: "ml-2 font-mono text-xs text-muted",
					children: "berth · ~/.claude"
				})
			]
		}), /* @__PURE__ */ jsxs("div", {
			className: "grid grid-cols-[132px_1fr]",
			children: [/* @__PURE__ */ jsx("aside", {
				className: "border-r border-line bg-paper/60 p-2.5",
				children: sidebar.map(({ icon: Icon, label, active }) => /* @__PURE__ */ jsxs("div", {
					className: cn("mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs", active ? "bg-harbor/12 font-medium text-harbor-deep" : "text-muted"),
					children: [/* @__PURE__ */ jsx(Icon, { className: "h-3.5 w-3.5" }), label]
				}, label))
			}), /* @__PURE__ */ jsxs("div", {
				className: "p-3",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "mb-2 flex items-center justify-between px-1",
					children: [/* @__PURE__ */ jsx("span", {
						className: "text-xs font-medium text-muted",
						children: "Capabilities"
					}), /* @__PURE__ */ jsx("span", {
						className: "font-mono text-[10px] text-muted",
						children: "25 assets"
					})]
				}), /* @__PURE__ */ jsx("ul", {
					className: "space-y-1.5",
					children: rows.map((row) => /* @__PURE__ */ jsxs("li", {
						className: "flex items-center gap-3 rounded-xl border border-line/80 bg-paper/40 px-3 py-2.5",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", row.tone === "harbor" ? "bg-harbor/12 text-harbor-deep" : "bg-amber/15 text-amber"),
								children: /* @__PURE__ */ jsx(row.icon, { className: "h-3.5 w-3.5" })
							}),
							/* @__PURE__ */ jsx("span", {
								className: "font-mono text-xs text-ink",
								children: row.name
							}),
							/* @__PURE__ */ jsx("span", {
								className: "ml-auto rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted",
								children: row.kind
							}),
							/* @__PURE__ */ jsx("span", {
								className: "hidden rounded-md bg-paper px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline",
								children: row.scope
							})
						]
					}, row.name))
				})]
			})]
		})]
	});
}
//#endregion
//#region src/pages/Home.tsx
var valueIcons = [
	Layers,
	LayoutGrid,
	Lock,
	Eye
];
var featureIcons = [
	LayoutGrid,
	MessagesSquare,
	Settings,
	Activity
];
function SectionHead({ eyebrow, heading }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "max-w-2xl",
		children: [/* @__PURE__ */ jsx("span", {
			className: "eyebrow",
			children: eyebrow
		}), /* @__PURE__ */ jsx("h2", {
			className: "mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl",
			children: heading
		})]
	});
}
function Home() {
	const { t } = useTranslation();
	const lang = useLang();
	const base = `/${lang}`;
	const trust = t("trust.items", { returnObjects: true });
	const values = t("value.items", { returnObjects: true });
	const features = t("features.items", { returnObjects: true });
	const pillars = t("kb.pillars", { returnObjects: true });
	const faqs = t("faq.items", { returnObjects: true });
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx(Seo, {
			lang,
			path: "",
			title: t("meta.home.title"),
			description: t("meta.home.description")
		}),
		/* @__PURE__ */ jsxs("section", {
			className: "relative overflow-hidden",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full opacity-70 blur-3xl",
					style: { background: "radial-gradient(closest-side, rgb(var(--harbor) / 0.18), transparent)" },
					"aria-hidden": true
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "container-page grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24",
					children: [/* @__PURE__ */ jsxs("div", { children: [
						/* @__PURE__ */ jsx("span", {
							className: "eyebrow animate-fade-up",
							children: t("hero.badge")
						}),
						/* @__PURE__ */ jsxs("h1", {
							className: "mt-6 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight animate-fade-up sm:text-6xl",
							style: { animationDelay: "60ms" },
							children: [
								t("hero.title"),
								/* @__PURE__ */ jsx("br", {}),
								/* @__PURE__ */ jsx("span", {
									className: "text-harbor",
									children: t("hero.titleAccent")
								})
							]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-6 max-w-xl text-lg leading-relaxed text-muted animate-fade-up",
							style: { animationDelay: "120ms" },
							children: t("hero.subtitle")
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mt-8 flex flex-wrap items-center gap-3 animate-fade-up",
							style: { animationDelay: "180ms" },
							children: [/* @__PURE__ */ jsxs("a", {
								href: RELEASES_URL,
								target: "_blank",
								rel: "noreferrer",
								className: "btn-primary",
								children: [/* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }), t("hero.ctaPrimary")]
							}), /* @__PURE__ */ jsxs("a", {
								href: GITHUB_URL,
								target: "_blank",
								rel: "noreferrer",
								className: "btn-ghost",
								children: [/* @__PURE__ */ jsx(GithubIcon, { className: "h-4 w-4" }), t("hero.ctaSecondary")]
							})]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-5 font-mono text-xs text-muted animate-fade-up",
							style: { animationDelay: "240ms" },
							children: t("hero.note")
						})
					] }), /* @__PURE__ */ jsx("div", {
						className: "animate-fade-up lg:pl-6",
						style: { animationDelay: "160ms" },
						children: /* @__PURE__ */ jsx(AssetPanel, {})
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "border-y border-line bg-surface/60",
					children: /* @__PURE__ */ jsx("div", {
						className: "container-page grid gap-3 py-5 sm:grid-cols-2 lg:grid-cols-4",
						children: trust.map((item) => /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 text-sm text-muted",
							children: [/* @__PURE__ */ jsx(Check, { className: "h-4 w-4 shrink-0 text-harbor" }), item]
						}, item))
					})
				})
			]
		}),
		/* @__PURE__ */ jsxs("section", {
			className: "container-page py-20 sm:py-24",
			children: [/* @__PURE__ */ jsx(SectionHead, {
				eyebrow: t("value.eyebrow"),
				heading: t("value.heading")
			}), /* @__PURE__ */ jsx("div", {
				className: "mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2",
				children: values.map((item, i) => {
					return /* @__PURE__ */ jsxs("div", {
						className: "bg-surface p-7",
						children: [
							/* @__PURE__ */ jsx(valueIcons[i] ?? Layers, { className: "h-5 w-5 text-harbor" }),
							/* @__PURE__ */ jsx("h3", {
								className: "mt-4 text-lg font-semibold",
								children: item.title
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-2 text-sm leading-relaxed text-muted",
								children: item.body
							})
						]
					}, item.title);
				})
			})]
		}),
		/* @__PURE__ */ jsx("section", {
			className: "border-t border-line bg-surface/50",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container-page py-20 sm:py-24",
				children: [/* @__PURE__ */ jsx(SectionHead, {
					eyebrow: t("features.eyebrow"),
					heading: t("features.heading")
				}), /* @__PURE__ */ jsx("div", {
					className: "mt-14 space-y-16",
					children: features.map((feature, i) => {
						const Icon = featureIcons[i] ?? LayoutGrid;
						const reverse = i % 2 === 1;
						return /* @__PURE__ */ jsxs("div", {
							className: "grid items-center gap-8 lg:grid-cols-2 lg:gap-14",
							children: [/* @__PURE__ */ jsxs("div", {
								className: reverse ? "lg:order-2" : "",
								children: [
									/* @__PURE__ */ jsxs("span", {
										className: "inline-flex items-center gap-2 font-mono text-xs font-medium text-harbor-deep",
										children: [/* @__PURE__ */ jsx(Icon, { className: "h-4 w-4" }), feature.name]
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "mt-3 font-display text-2xl font-semibold tracking-tight",
										children: feature.title
									}),
									/* @__PURE__ */ jsx("p", {
										className: "mt-3 max-w-md leading-relaxed text-muted",
										children: feature.body
									}),
									/* @__PURE__ */ jsx("ul", {
										className: "mt-5 flex flex-wrap gap-2",
										children: feature.points.map((p) => /* @__PURE__ */ jsx("li", {
											className: "rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted",
											children: p
										}, p))
									})
								]
							}), /* @__PURE__ */ jsx("div", {
								className: reverse ? "lg:order-1" : "",
								children: /* @__PURE__ */ jsxs("div", {
									className: "rounded-2xl border border-line bg-paper/50 p-8",
									children: [/* @__PURE__ */ jsx("div", {
										className: "grid h-12 w-12 place-items-center rounded-xl bg-harbor/12 text-harbor-deep",
										children: /* @__PURE__ */ jsx(Icon, { className: "h-6 w-6" })
									}), /* @__PURE__ */ jsx("div", {
										className: "mt-6 space-y-2.5",
										children: feature.points.map((p, k) => /* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-3",
											children: [/* @__PURE__ */ jsx("span", {
												className: "font-mono text-[10px] text-muted",
												children: String(k + 1).padStart(2, "0")
											}), /* @__PURE__ */ jsx("div", {
												className: "h-8 flex-1 rounded-lg border border-line bg-surface px-3 text-sm leading-8 text-ink",
												children: p
											})]
										}, p))
									})]
								})
							})]
						}, feature.name);
					})
				})]
			})
		}),
		/* @__PURE__ */ jsx("section", {
			className: "container-page py-20 sm:py-24",
			children: /* @__PURE__ */ jsx("div", {
				className: "relative overflow-hidden rounded-3xl border border-harbor/20 bg-harbor-soft/50 px-8 py-14 sm:px-14",
				children: /* @__PURE__ */ jsxs("div", {
					className: "max-w-2xl",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "eyebrow border-harbor/30 bg-surface/70",
							children: t("bridge.eyebrow")
						}),
						/* @__PURE__ */ jsx("h2", {
							className: "mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl",
							children: t("bridge.heading")
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-4 leading-relaxed text-ink/80",
							children: t("bridge.body")
						}),
						/* @__PURE__ */ jsxs(Link, {
							to: `${base}/knowledge`,
							className: "btn-primary mt-7",
							children: [t("bridge.cta"), /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })]
						})
					]
				})
			})
		}),
		/* @__PURE__ */ jsxs("section", {
			className: "container-page pb-20 sm:pb-24",
			children: [/* @__PURE__ */ jsx(SectionHead, {
				eyebrow: t("kb.eyebrow"),
				heading: t("kb.heading")
			}), /* @__PURE__ */ jsx("div", {
				className: "mt-12 grid gap-5 md:grid-cols-3",
				children: pillars.map((pillar) => /* @__PURE__ */ jsxs(Link, {
					to: `${base}/knowledge`,
					className: "card group flex flex-col hover:-translate-y-0.5 hover:border-harbor/40 hover:shadow-lift",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "self-start rounded-full bg-harbor/10 px-2.5 py-1 text-xs font-medium text-harbor-deep",
							children: pillar.tag
						}),
						/* @__PURE__ */ jsx("h3", {
							className: "mt-4 font-display text-xl font-semibold",
							children: pillar.title
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-2 flex-1 text-sm leading-relaxed text-muted",
							children: pillar.body
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-harbor",
							children: [pillar.cta, /* @__PURE__ */ jsx(ArrowUpRight, { className: "h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" })]
						})
					]
				}, pillar.title))
			})]
		}),
		/* @__PURE__ */ jsx("section", {
			className: "border-t border-line bg-surface/50",
			children: /* @__PURE__ */ jsxs("div", {
				className: "container-page grid gap-12 py-20 sm:py-24 lg:grid-cols-[0.8fr_1.2fr]",
				children: [/* @__PURE__ */ jsx(SectionHead, {
					eyebrow: t("faq.eyebrow"),
					heading: t("faq.heading")
				}), /* @__PURE__ */ jsx("div", {
					className: "divide-y divide-line border-y border-line",
					children: faqs.map((faq) => /* @__PURE__ */ jsxs("details", {
						className: "group py-4",
						children: [/* @__PURE__ */ jsxs("summary", {
							className: "flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium",
							children: [faq.q, /* @__PURE__ */ jsx("span", {
								className: "text-muted transition-transform group-open:rotate-45",
								children: "+"
							})]
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-3 max-w-xl text-sm leading-relaxed text-muted",
							children: faq.a
						})]
					}, faq.q))
				})]
			})
		}),
		/* @__PURE__ */ jsx("section", {
			className: "container-page py-20 sm:py-28",
			children: /* @__PURE__ */ jsxs("div", {
				className: "mx-auto max-w-2xl text-center",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "font-display text-3xl font-semibold tracking-tight sm:text-4xl",
						children: t("cta.heading")
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-4 text-muted",
						children: t("cta.body")
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-8 flex flex-wrap items-center justify-center gap-3",
						children: [/* @__PURE__ */ jsxs("a", {
							href: RELEASES_URL,
							target: "_blank",
							rel: "noreferrer",
							className: "btn-primary",
							children: [/* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }), t("cta.primary")]
						}), /* @__PURE__ */ jsxs("a", {
							href: GITHUB_URL,
							target: "_blank",
							rel: "noreferrer",
							className: "btn-ghost",
							children: [/* @__PURE__ */ jsx(GithubIcon, { className: "h-4 w-4" }), t("cta.secondary")]
						})]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-5 font-mono text-xs text-muted",
						children: t("cta.meta")
					})
				]
			})
		})
	] });
}
//#endregion
//#region src/pages/Features.tsx
function Features() {
	const { t } = useTranslation();
	const lang = useLang();
	const items = t("features.items", { returnObjects: true });
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Seo, {
		lang,
		path: "/features",
		title: t("meta.features.title"),
		description: t("meta.features.description")
	}), /* @__PURE__ */ jsxs("section", {
		className: "container-page py-16 sm:py-20",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "eyebrow",
				children: t("features.eyebrow")
			}),
			/* @__PURE__ */ jsx("h1", {
				className: "mt-4 font-display text-4xl font-semibold tracking-tight",
				children: t("features.heading")
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-4 max-w-2xl text-lg leading-relaxed text-muted",
				children: t("pages.featuresIntro")
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2",
				children: items.map((f) => /* @__PURE__ */ jsxs("article", {
					className: "bg-surface p-7",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "font-mono text-xs font-medium text-harbor-deep",
							children: f.name
						}),
						/* @__PURE__ */ jsx("h2", {
							className: "mt-2 text-xl font-semibold",
							children: f.title
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-2 text-sm leading-relaxed text-muted",
							children: f.body
						}),
						/* @__PURE__ */ jsx("ul", {
							className: "mt-4 flex flex-wrap gap-2",
							children: f.points.map((p) => /* @__PURE__ */ jsx("li", {
								className: "rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted",
								children: p
							}, p))
						})
					]
				}, f.name))
			}),
			/* @__PURE__ */ jsxs(Link, {
				to: `/${lang}/knowledge`,
				className: "btn-ghost mt-10",
				children: [t("bridge.cta"), /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })]
			})
		]
	})] });
}
//#endregion
//#region src/pages/KnowledgeHub.tsx
function KnowledgeHub() {
	const { t } = useTranslation();
	const lang = useLang();
	const pillars = t("kb.pillars", { returnObjects: true });
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Seo, {
		lang,
		path: "/knowledge",
		title: t("meta.knowledge.title"),
		description: t("meta.knowledge.description")
	}), /* @__PURE__ */ jsxs("section", {
		className: "container-page py-16 sm:py-20",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "eyebrow",
				children: t("kb.eyebrow")
			}),
			/* @__PURE__ */ jsx("h1", {
				className: "mt-4 font-display text-4xl font-semibold tracking-tight",
				children: t("kb.heading")
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-4 max-w-2xl text-lg leading-relaxed text-muted",
				children: t("pages.knowledgeIntro")
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-12 grid gap-5 md:grid-cols-3",
				children: pillars.map((p) => /* @__PURE__ */ jsxs("article", {
					className: "card flex flex-col",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "self-start rounded-full bg-harbor/10 px-2.5 py-1 text-xs font-medium text-harbor-deep",
							children: p.tag
						}),
						/* @__PURE__ */ jsx("h2", {
							className: "mt-4 font-display text-xl font-semibold",
							children: p.title
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-2 flex-1 text-sm leading-relaxed text-muted",
							children: p.body
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-harbor/70",
							children: [p.cta, /* @__PURE__ */ jsx(ArrowUpRight, { className: "h-4 w-4" })]
						})
					]
				}, p.title))
			})
		]
	})] });
}
//#endregion
//#region src/pages/About.tsx
function About() {
	const { t } = useTranslation();
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Seo, {
		lang: useLang(),
		path: "/about",
		title: t("meta.about.title"),
		description: t("meta.about.description")
	}), /* @__PURE__ */ jsx("section", {
		className: "container-page py-16 sm:py-20",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-3xl",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "eyebrow",
					children: t("footer.aboutLink")
				}),
				/* @__PURE__ */ jsx("h1", {
					className: "mt-4 font-display text-4xl font-semibold tracking-tight",
					children: "Berth"
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 space-y-5 text-base leading-relaxed text-muted",
					children: [/* @__PURE__ */ jsx("p", { children: t("pages.about.body1") }), /* @__PURE__ */ jsx("p", { children: t("pages.about.body2") })]
				}),
				/* @__PURE__ */ jsxs("a", {
					href: GITHUB_URL,
					target: "_blank",
					rel: "noreferrer",
					className: "btn-ghost mt-8",
					children: [/* @__PURE__ */ jsx(GithubIcon, { className: "h-4 w-4" }), "GitHub"]
				})
			]
		})
	})] });
}
//#endregion
//#region src/pages/Privacy.tsx
function Privacy() {
	const { t } = useTranslation();
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Seo, {
		lang: useLang(),
		path: "/privacy",
		title: t("meta.privacy.title"),
		description: t("meta.privacy.description")
	}), /* @__PURE__ */ jsx("section", {
		className: "container-page py-16 sm:py-20",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-3xl",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "eyebrow",
					children: t("footer.privacyLink")
				}),
				/* @__PURE__ */ jsx("h1", {
					className: "mt-4 font-display text-4xl font-semibold tracking-tight",
					children: t("meta.privacy.title")
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 space-y-5 text-base leading-relaxed text-muted",
					children: [/* @__PURE__ */ jsx("p", { children: t("pages.privacy.body1") }), /* @__PURE__ */ jsx("p", { children: t("pages.privacy.body2") })]
				})
			]
		})
	})] });
}
//#endregion
//#region src/pages/Changelog.tsx
function Changelog() {
	const { t } = useTranslation();
	const lang = useLang();
	const items = t("pages.changelog.items", { returnObjects: true });
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Seo, {
		lang,
		path: "/changelog",
		title: t("meta.changelog.title"),
		description: t("meta.changelog.description")
	}), /* @__PURE__ */ jsx("section", {
		className: "container-page py-16 sm:py-20",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-3xl",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "eyebrow",
					children: t("footer.changelogLink")
				}),
				/* @__PURE__ */ jsx("h1", {
					className: "mt-4 font-display text-4xl font-semibold tracking-tight",
					children: t("meta.changelog.title")
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-4 text-lg leading-relaxed text-muted",
					children: t("pages.changelog.intro")
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mt-12 space-y-10",
					children: items.map((entry) => /* @__PURE__ */ jsxs("article", {
						className: "relative border-l border-line pl-6",
						children: [
							/* @__PURE__ */ jsx("span", { className: "absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-harbor bg-paper" }),
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-baseline gap-3",
								children: [/* @__PURE__ */ jsx("h2", {
									className: "font-display text-xl font-semibold",
									children: entry.version
								}), /* @__PURE__ */ jsx("span", {
									className: "font-mono text-xs text-muted",
									children: entry.date
								})]
							}),
							/* @__PURE__ */ jsx("ul", {
								className: "mt-3 space-y-2",
								children: entry.notes.map((note) => /* @__PURE__ */ jsxs("li", {
									className: "flex items-start gap-2 text-sm text-muted",
									children: [/* @__PURE__ */ jsx(Check, { className: "mt-0.5 h-4 w-4 shrink-0 text-harbor" }), note]
								}, note))
							})
						]
					}, entry.version))
				})
			]
		})
	})] });
}
//#endregion
//#region src/pages/RootRedirect.tsx
function detectLang() {
	try {
		const stored = localStorage.getItem("berth-lang");
		if (isLang(stored ?? void 0)) return stored;
	} catch {}
	const nav = (navigator.language || "").toLowerCase();
	if (nav.startsWith("zh")) return "zh";
	if (nav.startsWith("ja")) return "ja";
	if (nav.startsWith("ko")) return "ko";
	return "en";
}
function RootRedirect() {
	useEffect(() => {
		window.location.replace(`/${detectLang()}/`);
	}, []);
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs(Head, { children: [
		/* @__PURE__ */ jsx("title", { children: "Berth — Local AI Agent Asset Manager" }),
		/* @__PURE__ */ jsx("meta", {
			name: "robots",
			content: "noindex"
		}),
		/* @__PURE__ */ jsx("meta", {
			httpEquiv: "refresh",
			content: "0; url=/en/"
		}),
		LANGS.map((l) => /* @__PURE__ */ jsx("link", {
			rel: "alternate",
			hrefLang: HREFLANG[l],
			href: `${SITE_URL}/${l}/`
		}, l)),
		/* @__PURE__ */ jsx("link", {
			rel: "alternate",
			hrefLang: "x-default",
			href: `${SITE_URL}/en/`
		})
	] }), /* @__PURE__ */ jsx("div", {
		className: "grid min-h-screen place-items-center p-8 text-center",
		children: /* @__PURE__ */ jsxs("div", { children: [
			/* @__PURE__ */ jsx("div", {
				className: "mx-auto grid h-12 w-12 place-items-center rounded-xl bg-harbor font-display text-xl font-semibold text-white",
				children: "B"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-4 text-sm text-muted",
				children: "Redirecting…"
			}),
			/* @__PURE__ */ jsx("noscript", { children: /* @__PURE__ */ jsx("ul", {
				className: "mt-4 flex justify-center gap-4",
				children: LANGS.map((l) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", {
					className: "text-harbor underline",
					href: `/${l}/`,
					children: l
				}) }, l))
			}) })
		] })
	})] });
}
//#endregion
//#region src/pages/NotFound.tsx
function NotFound() {
	return /* @__PURE__ */ jsx("div", {
		className: "grid min-h-screen place-items-center p-8 text-center",
		children: /* @__PURE__ */ jsxs("div", { children: [
			/* @__PURE__ */ jsx("div", {
				className: "mx-auto grid h-12 w-12 place-items-center rounded-xl bg-harbor font-display text-xl font-semibold text-white",
				children: "B"
			}),
			/* @__PURE__ */ jsx("h1", {
				className: "mt-6 font-display text-2xl font-semibold",
				children: "Page not found"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-2 text-muted",
				children: "The page you’re looking for doesn’t exist."
			}),
			/* @__PURE__ */ jsx("a", {
				href: "/en/",
				className: "btn-primary mt-6",
				children: "Back to home"
			})
		] })
	});
}
//#endregion
//#region src/main.tsx
var createRoot = ViteReactSSG({ routes: [
	{
		path: "/",
		element: /* @__PURE__ */ jsx(RootRedirect, {})
	},
	...LANGS.map((lang) => ({
		path: `/${lang}`,
		element: /* @__PURE__ */ jsx(Layout, {}),
		children: [
			{
				index: true,
				element: /* @__PURE__ */ jsx(Home, {})
			},
			{
				path: "features",
				element: /* @__PURE__ */ jsx(Features, {})
			},
			{
				path: "knowledge",
				element: /* @__PURE__ */ jsx(KnowledgeHub, {})
			},
			{
				path: "about",
				element: /* @__PURE__ */ jsx(About, {})
			},
			{
				path: "privacy",
				element: /* @__PURE__ */ jsx(Privacy, {})
			},
			{
				path: "changelog",
				element: /* @__PURE__ */ jsx(Changelog, {})
			}
		]
	})),
	{
		path: "*",
		element: /* @__PURE__ */ jsx(NotFound, {})
	}
] });
//#endregion
export { createRoot };
