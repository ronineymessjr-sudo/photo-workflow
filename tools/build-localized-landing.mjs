import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const locales = {
  en: {
    htmlLang: 'en', ogLocale: 'en_US',
    title: 'PhotoAtelier | Photography Planning and Production Workspace',
    description: 'PhotoAtelier connects creative briefs, reference images, shot plans, gear, LUTs, schedules, on-set execution, and reviews in one local-first photography workflow.',
    ogTitle: 'PhotoAtelier | Turn visual ideas into shoot-ready plans',
    ogDescription: 'A local-first photography workflow from references and shot lists to schedules, LUTs, and reviews.',
    jsonDescription: 'A photography workspace connecting briefs, references, shot plans, gear, LUTs, schedules, and reviews.',
    text: {
      '跳到主要内容': 'Skip to main content', '工作流': 'Workflow', '开放素材': 'Open assets', '隐私': 'Privacy', '反馈': 'Feedback', '语言': 'Language',
      '摄影生产工作台': 'Photography production workspace', '把参考图变成能直接开拍的方案。': 'Turn visual ideas into plans you can actually shoot.', '把灵感变成真正能拍的方案。': 'Turn visual ideas into plans you can actually shoot.',
      '免注册即可体验 · 个人图库由你控制 · 登录后可扩展同步': 'Try it without signing up · Your personal library stays under your control · Sign in later for sync',
      '免注册即可先完成一份方案；需要跨设备同步时，再登录并连接自己的图库。': 'Build a complete plan without signing up. Sign in and connect your own library only when you need cross-device sync.',
      'GPT Image 原创参考 · 建筑走廊 · 柔和侧光 · 低饱和服装': 'Original GPT Image reference · Architectural corridor · Soft side light · Muted wardrobe',
      '开始公开测试': 'Try the public beta', '了解隐私模式': 'Explore privacy modes', '默认保存在你的浏览器，不上传个人图库': 'Saved in your browser by default. Your personal library is not uploaded.',
      '参考': 'References', '方案': 'Plan', '日程': 'Schedule', '拍摄': 'Shoot', '复盘': 'Review', '真实工作流': 'A real photography workflow',
      '从想法到复盘，': 'From idea to review,', '一站完成': 'all in one workspace', '按照摄影师的实际动作组织内容：先确定需求和参考，再落到镜头、设备、日程与现场执行。': 'Built around the way photographers actually work: define the brief and references first, then turn them into shots, gear, schedules, and on-set actions.',
      '明确目标、受众与交付物': 'Define goals, audience, and deliverables', '收集灵感，保留来源与授权': 'Collect inspiration with source and license records', '组织镜头、设备、动作和光线': 'Arrange shots, gear, direction, and lighting', '安排时间、机位与所需资源': 'Schedule time, camera positions, and resources', '现场勾选、备注与补拍': 'Check off shots, take notes, and flag pickups on set', '把有效经验回流到下一次创作': 'Carry proven decisions into the next production',
      '打开完整工作台': 'Open the full workspace', '真实产品界面：参考图按镜头关系组织，并保留素材来源。': 'Real product UI: references are organized by shot relationships with source records intact.',
      '拍摄方法': 'Field notes', '看看如何落到镜头': 'See how ideas become shots', '来自摄影知识库的现场方法': 'Field notes from the photography library', '把“自然一点”，换成模特听得懂的动作。': 'Replace “be natural” with direction people can actually follow.', 'PhotoAtelier 不只整理灵感，也把你的拍摄经验提炼成镜头里的动作、机位和现场提示。': 'PhotoAtelier does more than collect inspiration. It turns working knowledge into direction, camera positions, and on-set cues.',
      '现场引导': 'On-set direction', '“往前走，慢一点。走两步以后回头看我，肩膀放松。”': '“Walk forward slowly. After two steps, look back at me and let your shoulders drop.”', '给具体指令，不让模特猜“自然”是什么意思。方案会把可直接说出口的引导词放进对应镜头。': 'Give precise direction instead of asking talent to guess what “natural” means. Each shot carries a cue you can say out loud.', '动作逻辑': 'Movement logic', '先动，再拍。': 'Move first, then shoot.', '让人物走、回头、整理头发或与道具互动，在动作发生的瞬间连拍，表情通常比静态摆拍更松弛。': 'Have the subject walk, turn, adjust their hair, or interact with a prop, then burst-shoot through the action for a more relaxed expression.', '场景匹配': 'Scene matching', '一个场景，一组能执行的变化。': 'One scene, a practical set of variations.', '墙边用倚靠和侧身，台阶安排坐姿与回头，开阔场地优先走动抓拍，减少现场临时想动作。': 'Use leaning and side angles by walls, seated turns on steps, and walking shots in open spaces so you are not inventing poses on set.',
      '数据与隐私': 'Data and privacy', '三种数据模式，按你的方式工作': 'Three data modes, built around your workflow', 'PhotoAtelier 提供工具和开放模板，不把任何人的图库变成其他人的默认素材库。': 'PhotoAtelier provides tools and open templates. One person’s private library never becomes another person’s default asset source.',
      '公开体验': 'Public demo', '使用随产品发布、已标注来源的开放示例素材。适合第一次体验。': 'Explore with open sample assets that ship with clear source labels.', '不连接你的本地目录': 'Does not connect to local folders', '数据保存在当前浏览器': 'Data stays in the current browser', '不使用私人 Obsidian 内容': 'Does not use private Obsidian content',
      '连接自己的图库': 'Connect your own library', '通过本地连接器索引你设备上的照片、笔记和附件。': 'Use the local connector to index photos, notes, and attachments on your device.', '每个人连接自己的目录': 'Each person connects their own folders', '图片仍保留在原设备': 'Original images remain on the device', '只索引必要的元数据': 'Only required metadata is indexed',
      '个人私有模式': 'Private local mode', '适合高隐私创作：本地运行、离线可用，由你完全控制。': 'For private work: local execution, offline access, and full user control.', '不共享图库或笔记': 'Libraries and notes are never shared', '不公开同步凭证': 'Sync credentials are never exposed', '可独立导入和导出': 'Import and export independently',
      '开放素材来源': 'Open asset sources', '每项素材仍需按原页面核对许可证与署名要求': 'Always verify licensing and attribution on the original source page', '匿名使用统计': 'Anonymous usage analytics', '只记录按钮和页面事件，不采集项目内容、图片或笔记': 'Records button and page events only, never project content, images, or notes',
      '反馈与改进': 'Feedback and iteration', '告诉我们哪里不好用': 'Tell us what gets in your way', '这不是客套话。你的反馈会进入待处理队列，用于确定下一次迭代优先级。': 'Your feedback enters the product queue and directly informs the next iteration.', '反馈默认不附带方案、图片或笔记内容。': 'Feedback never includes plans, images, or notes by default.',
      '你正在做什么': 'What were you trying to do?', '问题出现在哪': 'Where did it happen?', '方案生成': 'Plan generation', '参考图库': 'Reference library', '日程与现场': 'Schedule and on-set', 'LUT 与后期': 'LUTs and post', '数据连接': 'Data connections', '界面与操作': 'Interface and interactions', '其他': 'Other', '哪里卡住了': 'What blocked you?', '这次问题对你的影响': 'How much did it affect you?', '不影响': 'No impact', '有点慢': 'Minor delay', '中等': 'Moderate', '很受阻': 'Major blocker', '无法完成': 'Could not finish', '网站': 'Website', '提交反馈': 'Submit feedback',
      '为摄影师和创作者设计的本地优先工作台。': 'A local-first workspace for photographers and visual creators.', '隐私说明': 'Privacy', '进入应用': 'Open app'
    },
    attributes: {
      'PhotoAtelier 首页': 'PhotoAtelier home', '主要导航': 'Primary navigation', '摄影工作流': 'Photography workflow', 'PhotoAtelier 真实参考图与镜头绑定界面': 'PhotoAtelier interface showing real references bound to shots', '混凝土建筑走廊中的原创人物摄影参考图': 'Original editorial portrait reference in a concrete architectural corridor', '页脚导航': 'Footer navigation',
      '例如：给城市夜景人像建立一份拍摄方案': 'For example: build a shoot plan for a cinematic city portrait', '请描述你原本想完成什么、实际发生了什么，以及你希望它怎么工作': 'Describe what you wanted to do, what happened, and how you expected it to work',
      'LUT与后期': 'LUT & post', '其他': 'Other', '参考图库': 'Reference library', '套用柔和自然调色后的原创概念图': 'Original concept image with a soft, natural grade applied', '拍摄流程时间线': 'Shoot workflow timeline', '摄影师在黎明建筑外廊为模特拍摄': 'Photographer shooting a model at the dawn building colonnade', '数据连接': 'Data connections', '方案生成': 'Plan generation', '日程与现场': 'Schedule and on-set', '界面与操作': 'Interface and interactions', '语言': 'Language', '调色前的原创概念图': 'Original concept image before grading', '镜头一，建筑环境中的人物全景': 'Shot 1, full-body subject in the architectural setting', '镜头三，侧身回望的中景人像': 'Shot 3, medium portrait turning back over the shoulder', '镜头二，建筑外廊中的人物全身照': 'Shot 2, full-length subject in the building colonnade', '镜头五，黎明建筑中的离场背影': 'Shot 5, exit back view in the dawn building', '镜头四，侧逆光情绪特写': 'Shot 4, emotional close-up with back side light'
    }
  },
  ja: {
    htmlLang: 'ja', ogLocale: 'ja_JP',
    title: 'PhotoAtelier | 撮影企画・リファレンス・制作進行ワークスペース',
    description: 'PhotoAtelier は、撮影ブリーフ、参考画像、ショットプラン、機材、LUT、スケジュール、現場進行、振り返りを一つにつなぐローカルファーストの写真制作ワークスペースです。',
    ogTitle: 'PhotoAtelier | アイデアを撮影可能なプランへ',
    ogDescription: '参考画像からショット、スケジュール、LUT、振り返りまでをつなぐ写真制作ワークフロー。',
    jsonDescription: 'ブリーフ、参考画像、ショットプラン、機材、LUT、スケジュール、振り返りをつなぐ写真制作ワークスペース。',
    text: {
      '跳到主要内容': 'メインコンテンツへ移動', '工作流': 'ワークフロー', '开放素材': 'オープン素材', '隐私': 'プライバシー', '反馈': 'フィードバック', '语言': '言語',
      '摄影生产工作台': '写真制作ワークスペース', '把参考图变成能直接开拍的方案。': 'アイデアを、実際に撮れるプランへ。', '把灵感变成真正能拍的方案。': 'アイデアを、実際に撮れるプランへ。', '开始公开测试': '公開ベータを試す', '了解隐私模式': 'プライバシーモードを見る', '默认保存在你的浏览器，不上传个人图库': 'データは標準でブラウザに保存され、個人ライブラリはアップロードされません。',
      '免注册即可体验 · 个人图库由你控制 · 登录后可扩展同步': '登録なしで体験 · 個人ライブラリは自分で管理 · ログイン後に同期を追加',
      '免注册即可先完成一份方案；需要跨设备同步时，再登录并连接自己的图库。': '登録せずにプランを完成できます。端末間同期が必要なときだけログインして自分のライブラリに接続します。',
      'GPT Image 原创参考 · 建筑走廊 · 柔和侧光 · 低饱和服装': 'GPT Image オリジナル参考 · 建築回廊 · 柔らかなサイドライト · 低彩度の衣装',
      '参考': 'リファレンス', '方案': 'プラン', '日程': '日程', '拍摄': '撮影', '复盘': '振り返り', '真实工作流': '実際の撮影ワークフロー', '从想法到复盘，': 'アイデアから振り返りまで、', '一站完成': '一つの場所で完結', '按照摄影师的实际动作组织内容：先确定需求和参考，再落到镜头、设备、日程与现场执行。': '写真家の実際の動きに沿って、要件と参考を決め、ショット、機材、日程、現場進行へ落とし込みます。',
      '明确目标、受众与交付物': '目的、対象、納品物を明確化', '收集灵感，保留来源与授权': '出典とライセンスを保ったまま着想を収集', '组织镜头、设备、动作和光线': 'ショット、機材、ポーズ指示、光を整理', '安排时间、机位与所需资源': '時間、カメラ位置、必要リソースを配置', '现场勾选、备注与补拍': '現場で確認、メモ、追加撮影を管理', '把有效经验回流到下一次创作': '有効な知見を次の制作へ還元', '打开完整工作台': 'ワークスペースを開く', '真实产品界面：参考图按镜头关系组织，并保留素材来源。': '実際の画面：参考画像をショットとの関係で整理し、素材の出典を保持します。',
      '拍摄方法': '撮影ノート', '看看如何落到镜头': 'ショットへの落とし込みを見る', '来自摄影知识库的现场方法': '写真知識ライブラリからの現場ノート', '把“自然一点”，换成模特听得懂的动作。': '「自然に」を、相手が実行できる指示に変える。', 'PhotoAtelier 不只整理灵感，也把你的拍摄经验提炼成镜头里的动作、机位和现场提示。': 'PhotoAtelier は着想を整理するだけでなく、撮影経験を動き、カメラ位置、現場の声かけに変換します。',
      '现场引导': '現場の声かけ', '“往前走，慢一点。走两步以后回头看我，肩膀放松。”': '「ゆっくり前へ。二歩進んだらこちらを振り返って、肩の力を抜いて。」', '给具体指令，不让模特猜“自然”是什么意思。方案会把可直接说出口的引导词放进对应镜头。': '「自然に」の意味を相手に考えさせず、具体的に伝えます。各ショットにはそのまま使える声かけが入ります。', '动作逻辑': '動きのロジック', '先动，再拍。': '動いてから、撮る。', '让人物走、回头、整理头发或与道具互动，在动作发生的瞬间连拍，表情通常比静态摆拍更松弛。': '歩く、振り返る、髪を整える、小物に触れる。その動きの途中を連写すると、静止したポーズより自然な表情を捉えやすくなります。', '场景匹配': '場所との組み合わせ', '一个场景，一组能执行的变化。': '一つの場所に、実行できる変化を。', '墙边用倚靠和侧身，台阶安排坐姿与回头，开阔场地优先走动抓拍，减少现场临时想动作。': '壁では寄りかかりと横向き、階段では座りと振り返り、広い場所では歩くカットを優先し、現場で急にポーズを考える負担を減らします。',
      '数据与隐私': 'データとプライバシー', '三种数据模式，按你的方式工作': '用途に合わせて選べる3つのデータモード', 'PhotoAtelier 提供工具和开放模板，不把任何人的图库变成其他人的默认素材库。': 'PhotoAtelier はツールと公開テンプレートを提供します。個人のライブラリを他人の標準素材にすることはありません。',
      '公开体验': '公開デモ', '使用随产品发布、已标注来源的开放示例素材。适合第一次体验。': '出典を明記した公開サンプル素材で初回体験ができます。', '不连接你的本地目录': 'ローカルフォルダには接続しません', '数据保存在当前浏览器': 'データは現在のブラウザに保存', '不使用私人 Obsidian 内容': '非公開の Obsidian 内容は使用しません',
      '连接自己的图库': '自分のライブラリに接続', '通过本地连接器索引你设备上的照片、笔记和附件。': 'ローカルコネクターで端末上の写真、ノート、添付ファイルを索引します。', '每个人连接自己的目录': '各ユーザーが自分のフォルダに接続', '图片仍保留在原设备': '元画像は端末に保持', '只索引必要的元数据': '必要なメタデータのみ索引',
      '个人私有模式': '個人プライベートモード', '适合高隐私创作：本地运行、离线可用，由你完全控制。': '高い機密性が必要な制作向け。ローカル実行とオフライン利用に対応し、すべて自分で管理できます。', '不共享图库或笔记': 'ライブラリやノートを共有しません', '不公开同步凭证': '同期認証情報を公開しません', '可独立导入和导出': '個別にインポート・エクスポート可能',
      '开放素材来源': 'オープン素材の出典', '每项素材仍需按原页面核对许可证与署名要求': 'ライセンスとクレジット要件は必ず元ページで確認してください', '匿名使用统计': '匿名利用統計', '只记录按钮和页面事件，不采集项目内容、图片或笔记': 'ボタンとページイベントのみ記録し、プロジェクト内容、画像、ノートは収集しません',
      '反馈与改进': 'フィードバックと改善', '告诉我们哪里不好用': '使いにくかった点を教えてください', '这不是客套话。你的反馈会进入待处理队列，用于确定下一次迭代优先级。': 'フィードバックは改善キューに入り、次回の優先順位に反映されます。', '反馈默认不附带方案、图片或笔记内容。': 'フィードバックにプラン、画像、ノートは標準で添付されません。',
      '你正在做什么': '何をしようとしていましたか', '问题出现在哪': 'どこで問題が起きましたか', '方案生成': 'プラン生成', '参考图库': 'リファレンスライブラリ', '日程与现场': '日程と現場', 'LUT 与后期': 'LUTと仕上げ', '数据连接': 'データ接続', '界面与操作': '画面と操作', '其他': 'その他', '哪里卡住了': 'どこで止まりましたか', '这次问题对你的影响': '作業への影響', '不影响': '影響なし', '有点慢': '少し遅延', '中等': '中程度', '很受阻': '大きな支障', '无法完成': '完了できない', '网站': 'ウェブサイト', '提交反馈': '送信する',
      '为摄影师和创作者设计的本地优先工作台。': '写真家とクリエイターのためのローカルファースト・ワークスペース。', '隐私说明': 'プライバシー', '进入应用': 'アプリを開く'
    },
    attributes: {
      'PhotoAtelier 首页': 'PhotoAtelier ホーム', '主要导航': 'メインナビゲーション', '摄影工作流': '写真制作ワークフロー', 'PhotoAtelier 真实参考图与镜头绑定界面': '実際の参考画像をショットに関連付ける PhotoAtelier の画面', '混凝土建筑走廊中的原创人物摄影参考图': 'コンクリート建築の回廊で撮影したオリジナル人物参考画像', '页脚导航': 'フッターナビゲーション',
      '例如：给城市夜景人像建立一份拍摄方案': '例：夜の都市ポートレートの撮影プランを作る', '请描述你原本想完成什么、实际发生了什么，以及你希望它怎么工作': 'やりたかったこと、実際に起きたこと、期待する動作を記入してください',
      'LUT与后期': 'LUTと仕上げ', '其他': 'その他', '参考图库': '参考ライブラリ', '套用柔和自然调色后的原创概念图': 'やわらかく自然な調色を適用したオリジナルコンセプト画像', '拍摄流程时间线': '撮影の流れのタイムライン', '摄影师在黎明建筑外廊为模特拍摄': '夜明けの建物回廊でモデルを撮影するカメラマン', '数据连接': 'データ接続', '方案生成': 'プラン生成', '日程与现场': '日程と現場', '界面与操作': '画面と操作', '语言': '言語', '调色前的原创概念图': '調色前のオリジナルコンセプト画像', '镜头一，建筑环境中的人物全景': 'ショット1、建築環境の人物フルショット', '镜头三，侧身回望的中景人像': 'ショット3、横向きで振り返る中景ポートレート', '镜头二，建筑外廊中的人物全身照': 'ショット2、建物回廊の人物フルショット', '镜头五，黎明建筑中的离场背影': 'ショット5、夜明けの建物での退場の背中', '镜头四，侧逆光情绪特写': 'ショット4、逆光気味の表情クローズアップ'
    }
  },
  ko: {
    htmlLang: 'ko', ogLocale: 'ko_KR',
    title: 'PhotoAtelier | 촬영 기획, 레퍼런스 및 제작 워크스페이스',
    description: 'PhotoAtelier는 촬영 브리프, 레퍼런스 이미지, 샷 플랜, 장비, LUT, 일정, 현장 진행과 리뷰를 하나로 연결하는 로컬 우선 사진 제작 워크스페이스입니다.',
    ogTitle: 'PhotoAtelier | 아이디어를 실제 촬영 가능한 플랜으로',
    ogDescription: '레퍼런스부터 샷, 일정, LUT, 리뷰까지 연결하는 사진 제작 워크플로.',
    jsonDescription: '브리프, 레퍼런스, 샷 플랜, 장비, LUT, 일정과 리뷰를 연결하는 사진 제작 워크스페이스.',
    text: {
      '跳到主要内容': '주요 콘텐츠로 이동', '工作流': '워크플로', '开放素材': '오픈 에셋', '隐私': '개인정보', '反馈': '피드백', '语言': '언어',
      '摄影生产工作台': '사진 제작 워크스페이스', '把参考图变成能直接开拍的方案。': '아이디어를 실제 촬영 가능한 플랜으로.', '把灵感变成真正能拍的方案。': '아이디어를 실제 촬영 가능한 플랜으로.', '开始公开测试': '공개 베타 시작', '了解隐私模式': '개인정보 모드 보기', '默认保存在你的浏览器，不上传个人图库': '기본적으로 브라우저에 저장되며 개인 라이브러리는 업로드되지 않습니다.',
      '免注册即可体验 · 个人图库由你控制 · 登录后可扩展同步': '가입 없이 체험 · 개인 라이브러리는 직접 관리 · 로그인 후 동기화 확장',
      '免注册即可先完成一份方案；需要跨设备同步时，再登录并连接自己的图库。': '가입 없이 플랜을 완성할 수 있습니다. 기기 간 동기화가 필요할 때만 로그인하고 개인 라이브러리를 연결하세요.',
      'GPT Image 原创参考 · 建筑走廊 · 柔和侧光 · 低饱和服装': 'GPT Image 오리지널 레퍼런스 · 건축 회랑 · 부드러운 측면광 · 저채도 의상',
      '参考': '레퍼런스', '方案': '플랜', '日程': '일정', '拍摄': '촬영', '复盘': '리뷰', '真实工作流': '실제 촬영 워크플로', '从想法到复盘，': '아이디어부터 리뷰까지,', '一站完成': '하나의 워크스페이스에서', '按照摄影师的实际动作组织内容：先确定需求和参考，再落到镜头、设备、日程与现场执行。': '사진가의 실제 작업 순서에 따라 요구 사항과 레퍼런스를 정하고 샷, 장비, 일정, 현장 실행으로 연결합니다.',
      '明确目标、受众与交付物': '목표, 대상, 납품물 정의', '收集灵感，保留来源与授权': '출처와 라이선스를 유지하며 영감 수집', '组织镜头、设备、动作和光线': '샷, 장비, 디렉팅, 조명 구성', '安排时间、机位与所需资源': '시간, 카메라 위치, 리소스 배정', '现场勾选、备注与补拍': '현장에서 체크, 메모, 추가 촬영 관리', '把有效经验回流到下一次创作': '검증된 경험을 다음 제작에 반영', '打开完整工作台': '전체 워크스페이스 열기', '真实产品界面：参考图按镜头关系组织，并保留素材来源。': '실제 제품 화면: 레퍼런스를 샷 관계로 정리하고 출처를 유지합니다.',
      '拍摄方法': '촬영 노트', '看看如何落到镜头': '샷으로 이어지는 방법 보기', '来自摄影知识库的现场方法': '사진 지식 라이브러리의 현장 노트', '把“自然一点”，换成模特听得懂的动作。': '“자연스럽게”를 모델이 바로 이해할 수 있는 동작으로 바꿉니다.', 'PhotoAtelier 不只整理灵感，也把你的拍摄经验提炼成镜头里的动作、机位和现场提示。': 'PhotoAtelier는 영감을 정리하는 데서 끝나지 않고 촬영 경험을 동작, 카메라 위치, 현장 지시로 바꿉니다.',
      '现场引导': '현장 디렉팅', '“往前走，慢一点。走两步以后回头看我，肩膀放松。”': '“천천히 앞으로 걸어보세요. 두 걸음 뒤에 나를 돌아보고 어깨의 힘을 빼주세요.”', '给具体指令，不让模特猜“自然”是什么意思。方案会把可直接说出口的引导词放进对应镜头。': '모델에게 “자연스럽게”의 의미를 추측하게 하지 말고 구체적으로 안내합니다. 각 샷에는 바로 말할 수 있는 지시가 포함됩니다.', '动作逻辑': '동작 로직', '先动，再拍。': '먼저 움직이고, 그다음 촬영합니다.', '让人物走、回头、整理头发或与道具互动，在动作发生的瞬间连拍，表情通常比静态摆拍更松弛。': '걷기, 돌아보기, 머리 정리하기, 소품과 상호작용하기 같은 움직임을 연사로 담으면 정적인 포즈보다 자연스러운 표정을 얻기 쉽습니다.', '场景匹配': '장소 매칭', '一个场景，一组能执行的变化。': '한 장소에 실행 가능한 변화를 더합니다.', '墙边用倚靠和侧身，台阶安排坐姿与回头，开阔场地优先走动抓拍，减少现场临时想动作。': '벽에서는 기대기와 측면 자세, 계단에서는 앉기와 돌아보기, 열린 공간에서는 걷는 장면을 우선해 현장에서 즉흥적으로 포즈를 고민하는 일을 줄입니다.',
      '数据与隐私': '데이터와 개인정보', '三种数据模式，按你的方式工作': '작업 방식에 맞춘 세 가지 데이터 모드', 'PhotoAtelier 提供工具和开放模板，不把任何人的图库变成其他人的默认素材库。': 'PhotoAtelier는 도구와 오픈 템플릿을 제공합니다. 한 사람의 개인 라이브러리가 다른 사람의 기본 에셋이 되지 않습니다.',
      '公开体验': '공개 데모', '使用随产品发布、已标注来源的开放示例素材。适合第一次体验。': '출처가 표시된 공개 샘플 에셋으로 처음 기능을 체험할 수 있습니다.', '不连接你的本地目录': '로컬 폴더에 연결하지 않음', '数据保存在当前浏览器': '현재 브라우저에 데이터 저장', '不使用私人 Obsidian 内容': '개인 Obsidian 콘텐츠를 사용하지 않음',
      '连接自己的图库': '내 라이브러리 연결', '通过本地连接器索引你设备上的照片、笔记和附件。': '로컬 커넥터로 기기의 사진, 노트, 첨부 파일을 인덱싱합니다.', '每个人连接自己的目录': '각 사용자가 자신의 폴더에 연결', '图片仍保留在原设备': '원본 이미지는 기기에 유지', '只索引必要的元数据': '필요한 메타데이터만 인덱싱',
      '个人私有模式': '개인 로컬 모드', '适合高隐私创作：本地运行、离线可用，由你完全控制。': '높은 개인정보 보호가 필요한 작업용으로, 로컬 실행과 오프라인 사용을 지원하며 사용자가 완전히 제어합니다.', '不共享图库或笔记': '라이브러리나 노트를 공유하지 않음', '不公开同步凭证': '동기화 인증 정보를 공개하지 않음', '可独立导入和导出': '독립적으로 가져오기 및 내보내기',
      '开放素材来源': '오픈 에셋 출처', '每项素材仍需按原页面核对许可证与署名要求': '라이선스와 저작자 표시 요구 사항은 원본 페이지에서 확인하세요', '匿名使用统计': '익명 사용 통계', '只记录按钮和页面事件，不采集项目内容、图片或笔记': '버튼과 페이지 이벤트만 기록하며 프로젝트 콘텐츠, 이미지, 노트는 수집하지 않습니다',
      '反馈与改进': '피드백과 개선', '告诉我们哪里不好用': '불편한 점을 알려주세요', '这不是客套话。你的反馈会进入待处理队列，用于确定下一次迭代优先级。': '피드백은 제품 대기열에 들어가 다음 개선 우선순위를 정하는 데 사용됩니다.', '反馈默认不附带方案、图片或笔记内容。': '피드백에는 기본적으로 플랜, 이미지, 노트가 첨부되지 않습니다.',
      '你正在做什么': '무엇을 하려고 했나요', '问题出现在哪': '어디에서 문제가 생겼나요', '方案生成': '플랜 생성', '参考图库': '레퍼런스 라이브러리', '日程与现场': '일정과 현장', 'LUT 与后期': 'LUT와 후보정', '数据连接': '데이터 연결', '界面与操作': '화면과 조작', '其他': '기타', '哪里卡住了': '어디에서 막혔나요', '这次问题对你的影响': '작업에 미친 영향', '不影响': '영향 없음', '有点慢': '약간 지연', '中等': '보통', '很受阻': '큰 방해', '无法完成': '완료 불가', '网站': '웹사이트', '提交反馈': '피드백 보내기',
      '为摄影师和创作者设计的本地优先工作台。': '사진가와 크리에이터를 위한 로컬 우선 워크스페이스.', '隐私说明': '개인정보 안내', '进入应用': '앱 열기'
    },
    attributes: {
      'PhotoAtelier 首页': 'PhotoAtelier 홈', '主要导航': '주요 내비게이션', '摄影工作流': '사진 제작 워크플로', 'PhotoAtelier 真实参考图与镜头绑定界面': '실제 레퍼런스를 샷에 연결하는 PhotoAtelier 화면', '混凝土建筑走廊中的原创人物摄影参考图': '콘크리트 건축 회랑의 오리지널 인물 촬영 레퍼런스', '页脚导航': '푸터 내비게이션',
      '例如：给城市夜景人像建立一份拍摄方案': '예: 도시 야간 인물 촬영 플랜 만들기', '请描述你原本想完成什么、实际发生了什么，以及你希望它怎么工作': '원래 하려던 일, 실제로 발생한 일, 기대한 동작을 적어주세요',
      'LUT与后期': 'LUT와 후반', '其他': '기타', '参考图库': '레퍼런스 라이브러리', '套用柔和自然调色后的原创概念图': '부드럽고 자연스러운 보정을 적용한 오리지널 컨셉 이미지', '拍摄流程时间线': '촬영 흐름 타임라인', '摄影师在黎明建筑外廊为模特拍摄': '새벽 건물 회랑에서 모델을 촬영하는 사진작가', '数据连接': '데이터 연결', '方案生成': '플랜 생성', '日程与现场': '일정과 현장', '界面与操作': '화면과 조작', '语言': '언어', '调色前的原创概念图': '보정 전 오리지널 컨셉 이미지', '镜头一，建筑环境中的人物全景': '숏 1, 건축 환경 속 인물 풀샷', '镜头三，侧身回望的中景人像': '숏 3, 옆으로 돌아 뒤돌아보는 중경 인물', '镜头二，建筑外廊中的人物全身照': '숏 2, 건물 회랑 속 전신 인물', '镜头五，黎明建筑中的离场背影': '숏 5, 새벽 건물 속 퇴장 뒷모습', '镜头四，侧逆光情绪特写': '숏 4, 역광 사이드라이트 감정 클로즈업'
    }
  }
};

const supplementalTranslations = {
  en: {
    '一次真实拍摄': 'One real shoot',
    '从一张参考图，到一份完整拍摄安排。': 'From one reference image to a complete shoot plan.',
    '沿着同一条拍摄线，查看参考、分镜、资源和日程如何逐步确定。': 'Follow one production line as references, shots, resources, and schedule are confirmed step by step.',
    '先确定真正要靠近的画面。': 'Choose the image you actually want to approach.',
    '上传一张原创概念图，明确人物、场景、光线、构图和情绪。': 'Use an original concept image to define subject, location, light, framing, and mood.',
    '把方向拆成五个能执行的镜头。': 'Turn the direction into five executable shots.',
    '每个镜头给出景别、焦段、机位、动作提示和光线目标。': 'Each shot specifies framing, focal length, camera position, direction, and lighting goal.',
    '确认场地、人员、设备和画面感觉。': 'Confirm location, people, gear, and visual treatment.',
    '资源只在方案层统一选择，不为每个镜头重复寻找。': 'Choose resources once at plan level instead of searching again for every shot.',
    '最后把方案变成当天能照着走的日程。': 'Turn the plan into a schedule the crew can follow.',
    '确认日期、集合时间和地点后，方案才进入正式拍摄日程。': 'The plan enters the production calendar only after date, call time, and location are confirmed.',
    '现在把灵感变成能直接开拍的方案。': 'Now turn your visual direction into a shoot-ready plan.',
    '摄影指南': 'Guides',
    '摄影师实用指南': 'Practical guides for photographers',
    '把灵感继续拆成现场可执行的方法。': 'Turn inspiration into methods you can use on set.',
    '从参考图、分镜和动作引导，到日程与 LUT，六篇短指南只讲可以直接拿去拍的步骤。': 'Six concise guides cover references, shot lists, direction, schedules, and LUTs with steps you can use immediately.',
    '查看全部摄影指南': 'View all photography guides',
    '2小时20分': '2 h 20 min',
    'AI 概念图': 'AI concept image',
    'LUT 新手工作流': 'LUT beginner workflow',
    'Log 转 Rec.709': 'Log to Rec.709',
    'S-Log、D-Log M 与 Apple Log': 'S-Log, D-Log M, and Apple Log',
    'Sony A7 IV · 35 / 50 / 85 / 100 / 135mm · 反光板': 'Sony A7 IV · 35 / 50 / 85 / 100 / 135mm · reflector',
    '中景回望': 'Medium shot, looking back',
    '五个镜头覆盖一组作品': 'Five shots cover a full set',
    '人像拍摄 Shot List': 'Portrait shoot shot list',
    '人员': 'Crew',
    '人物、场景、光线和动作': 'Subject, scene, light, and action',
    '人物离场，保留日出轮廓': 'Subject exits, keeping the sunrise silhouette',
    '从集合到收工逐段安排': 'Planned segment by segment, from call time to wrap',
    '低机位，人物进入建筑线条': 'Low angle, subject enters the building lines',
    '体验': 'Experience',
    '侧逆光，降低动作幅度': 'Back side light, smaller movement range',
    '先转换，再定风格': 'Convert first, then choose a style',
    '免费开始': 'Start free',
    '全身停步': 'Full-body stop',
    '原图': 'Original',
    '参考图怎么拆成分镜': 'How to break a reference image into shots',
    '地点': 'Location',
    '场地': 'Venue',
    '城市文化中心外廊': 'City cultural center colonnade',
    '备用': 'Spare',
    '套用后': 'After applying',
    '妆发检查与设备准备': 'Hair, makeup, and gear prep',
    '室内灰墙走廊': 'Indoor gray-wall corridor',
    '工作方式': 'How it works',
    '情绪特写': 'Emotional close-up',
    '把“自然一点”说清楚': 'Say “be natural” clearly',
    '拍摄日程怎么排': 'How to schedule a shoot day',
    '收工与素材核对': 'Wrap and media check',
    '收束背影': 'Closing back view',
    '日出': 'Sunrise',
    '日本語': '日本語',
    '时长': 'Duration',
    '本页摄影素材均为 GPT Image 原创概念图，不作为真实拍摄参考来源。': 'Photos on this page are original GPT Image concept art and are not real shooting references.',
    '柔和自然 · 35%': 'Soft and natural · 35%',
    '查看一次真实拍摄流程': 'See one real shoot workflow',
    '模特 1 · 摄影师 1 · 造型协助 1': '1 model · 1 photographer · 1 styling assistant',
    '模特动作引导词': 'Model direction cues',
    '正面站定，保留负空间': 'Stand facing forward, keep negative space',
    '环境建立': 'Establishing shot',
    '简体中文': '简体中文',
    '肩线转动，视线越过镜头': 'Turn the shoulder line, look past the lens',
    '设备': 'Gear',
    '镜头 01–02': 'Shots 01–02',
    '镜头 03–04': 'Shots 03–04',
    '镜头 05 与补拍': 'Shots 05 and pickups',
    '集合与场地确认': 'Call time and venue confirmation',
    '预览不会修改原图': 'Preview never modifies the original'
  },
  ja: {
    '一次真实拍摄': '一つの実際の撮影',
    '从一张参考图，到一份完整拍摄安排。': '一枚の参考画像から、完成した撮影計画へ。',
    '沿着同一条拍摄线，查看参考、分镜、资源和日程如何逐步确定。': '参考、ショット、リソース、日程が一つの流れで決まる過程を確認します。',
    '先确定真正要靠近的画面。': 'まず、目指す画を決める。',
    '上传一张原创概念图，明确人物、场景、光线、构图和情绪。': 'オリジナルのコンセプト画像から、人物、場所、光、構図、感情を明確にします。',
    '把方向拆成五个能执行的镜头。': '方向性を実行可能な5つのショットに分解する。',
    '每个镜头给出景别、焦段、机位、动作提示和光线目标。': '各ショットに画角、焦点距離、カメラ位置、動作、光の目標を設定します。',
    '确认场地、人员、设备和画面感觉。': '場所、人物、機材、仕上がりを確認する。',
    '资源只在方案层统一选择，不为每个镜头重复寻找。': 'リソースはプラン単位で一度選び、ショットごとに探し直しません。',
    '最后把方案变成当天能照着走的日程。': '最後に、当日そのまま使える日程へ。',
    '确认日期、集合时间和地点后，方案才进入正式拍摄日程。': '日付、集合時間、場所を確定してから正式な撮影日程に入れます。',
    '现在把灵感变成能直接开拍的方案。': '着想を、今すぐ撮影できるプランに変える。',
    '摄影指南': '撮影ガイド',
    '摄影师实用指南': '写真家のための実用ガイド',
    '把灵感继续拆成现场可执行的方法。': '着想を現場で実行できる方法に変える。',
    '从参考图、分镜和动作引导，到日程与 LUT，六篇短指南只讲可以直接拿去拍的步骤。': '参考画像、ショット、声かけ、日程、LUTまで、すぐ使える手順を6本にまとめました。',
    '查看全部摄影指南': 'すべての撮影ガイドを見る',
    '2小时20分': '2時間20分',
    'AI 概念图': 'AIコンセプト画像',
    'LUT 新手工作流': 'LUT初心者ワークフロー',
    'Log 转 Rec.709': 'Log→Rec.709',
    'S-Log、D-Log M 与 Apple Log': 'S-Log、D-Log M、Apple Log',
    'Sony A7 IV · 35 / 50 / 85 / 100 / 135mm · 反光板': 'Sony A7 IV · 35 / 50 / 85 / 100 / 135mm · レフ板',
    '中景回望': '中景で振り返り',
    '五个镜头覆盖一组作品': '5つのショットで一組を撮り切る',
    '人像拍摄 Shot List': 'ポートレート撮影ショットリスト',
    '人员': '人員',
    '人物、场景、光线和动作': '人物、場所、光、動き',
    '人物离场，保留日出轮廓': '人物が去り、日の出のシルエットを残す',
    '从集合到收工逐段安排': '集合から撤収まで区切りごとに計画',
    '低机位，人物进入建筑线条': 'ローアングル、人物が建物のラインに入る',
    '体验': '体験',
    '侧逆光，降低动作幅度': '逆光気味のサイドライト、動きを小さく',
    '先转换，再定风格': 'まず変換、そのあとスタイルを決める',
    '免费开始': '無料で始める',
    '全身停步': '全身で止まる',
    '原图': '元画像',
    '参考图怎么拆成分镜': '参考画像をショットに分解する方法',
    '地点': '場所',
    '场地': 'ロケ地',
    '城市文化中心外廊': '市文化センターの外回廊',
    '备用': '予備',
    '套用后': '適用後',
    '妆发检查与设备准备': 'メイク・髪型チェックと機材準備',
    '室内灰墙走廊': '室内のグレー壁の廊下',
    '工作方式': '進め方',
    '情绪特写': '表情のクローズアップ',
    '把“自然一点”说清楚': '「自然に」を具体的に伝える',
    '拍摄日程怎么排': '撮影日程の組み方',
    '收工与素材核对': '撤収と素材確認',
    '收束背影': '締めの背中',
    '日出': '日の出',
    '日本語': '日本語',
    '时长': '時間',
    '本页摄影素材均为 GPT Image 原创概念图，不作为真实拍摄参考来源。': 'このページの写真素材はすべてGPT Imageによるオリジナルのコンセプト画像で、実際の撮影参考ではありません。',
    '柔和自然 · 35%': 'やわらかく自然に · 35%',
    '查看一次真实拍摄流程': '実際の撮影の流れを見る',
    '模特 1 · 摄影师 1 · 造型协助 1': 'モデル1 · カメラマン1 · スタイリング1',
    '模特动作引导词': 'モデルへの動作の声かけ',
    '正面站定，保留负空间': '正面に立ち、余白を残す',
    '环境建立': '環境の見せ方',
    '简体中文': '简体中文',
    '肩线转动，视线越过镜头': '肩のラインを回し、視線はレンズの先へ',
    '设备': '機材',
    '镜头 01–02': 'ショット01–02',
    '镜头 03–04': 'ショット03–04',
    '镜头 05 与补拍': 'ショット05と補拍',
    '集合与场地确认': '集合とロケ地確認',
    '预览不会修改原图': 'プレビューは元画像を変更しません'
  },
  ko: {
    '一次真实拍摄': '하나의 실제 촬영',
    '从一张参考图，到一份完整拍摄安排。': '한 장의 레퍼런스에서 완성된 촬영 계획까지.',
    '沿着同一条拍摄线，查看参考、分镜、资源和日程如何逐步确定。': '레퍼런스, 샷, 리소스, 일정이 한 흐름에서 확정되는 과정을 살펴봅니다.',
    '先确定真正要靠近的画面。': '먼저 실제로 닮고 싶은 화면을 정합니다.',
    '上传一张原创概念图，明确人物、场景、光线、构图和情绪。': '오리지널 콘셉트 이미지로 인물, 장소, 빛, 구도, 감정을 정의합니다.',
    '把方向拆成五个能执行的镜头。': '방향을 실행 가능한 다섯 개의 샷으로 나눕니다.',
    '每个镜头给出景别、焦段、机位、动作提示和光线目标。': '각 샷에 프레이밍, 초점 거리, 카메라 위치, 동작, 조명 목표를 지정합니다.',
    '确认场地、人员、设备和画面感觉。': '장소, 인원, 장비, 화면 느낌을 확인합니다.',
    '资源只在方案层统一选择，不为每个镜头重复寻找。': '리소스는 플랜에서 한 번 선택하고 샷마다 다시 찾지 않습니다.',
    '最后把方案变成当天能照着走的日程。': '마지막으로 현장에서 그대로 따를 일정으로 바꿉니다.',
    '确认日期、集合时间和地点后，方案才进入正式拍摄日程。': '날짜, 집합 시간, 장소를 확정한 뒤 공식 촬영 일정에 넣습니다.',
    '现在把灵感变成能直接开拍的方案。': '이제 아이디어를 바로 촬영할 수 있는 플랜으로 바꿉니다.',
    '摄影指南': '촬영 가이드',
    '摄影师实用指南': '사진가를 위한 실용 가이드',
    '把灵感继续拆成现场可执行的方法。': '아이디어를 현장에서 실행할 수 있는 방법으로 바꿉니다.',
    '从参考图、分镜和动作引导，到日程与 LUT，六篇短指南只讲可以直接拿去拍的步骤。': '레퍼런스, 샷 리스트, 디렉팅, 일정, LUT까지 바로 사용할 수 있는 단계를 여섯 편으로 정리했습니다.',
    '查看全部摄影指南': '모든 촬영 가이드 보기',
    '2小时20分': '2시간 20분',
    'AI 概念图': 'AI 컨셉 이미지',
    'LUT 新手工作流': 'LUT 입문 워크플로',
    'Log 转 Rec.709': 'Log → Rec.709',
    'S-Log、D-Log M 与 Apple Log': 'S-Log, D-Log M, Apple Log',
    'Sony A7 IV · 35 / 50 / 85 / 100 / 135mm · 反光板': 'Sony A7 IV · 35 / 50 / 85 / 100 / 135mm · 반사판',
    '中景回望': '중경, 뒤돌아보기',
    '五个镜头覆盖一组作品': '다섯 컷으로 한 세트를 완성',
    '人像拍摄 Shot List': '인물 촬영 숏 리스트',
    '人员': '인원',
    '人物、场景、光线和动作': '인물, 장면, 빛, 동작',
    '人物离场，保留日出轮廓': '인물이 퇴장하며 일출 실루엣을 남김',
    '从集合到收工逐段安排': '집합부터 마무리까지 구간별로 계획',
    '低机位，人物进入建筑线条': '로우앵글, 인물이 건축선 안으로',
    '体验': '체험',
    '侧逆光，降低动作幅度': '역광 사이드라이트, 동작을 작게',
    '先转换，再定风格': '먼저 변환하고 스타일 결정',
    '免费开始': '무료로 시작',
    '全身停步': '전신 멈춤',
    '原图': '원본',
    '参考图怎么拆成分镜': '참고 이미지를 숏으로 분해하는 법',
    '地点': '장소',
    '场地': '촬영지',
    '城市文化中心外廊': '시 문화센터 외부 회랑',
    '备用': '예비',
    '套用后': '적용 후',
    '妆发检查与设备准备': '메이크업·헤어 점검과 장비 준비',
    '室内灰墙走廊': '실내 회색 벽 복도',
    '工作方式': '작업 방식',
    '情绪特写': '감정 클로즈업',
    '把“自然一点”说清楚': '“자연스럽게”를 구체적으로 말하기',
    '拍摄日程怎么排': '촬영 일정 짜는 법',
    '收工与素材核对': '마무리와 소재 확인',
    '收束背影': '마무리 뒷모습',
    '日出': '일출',
    '日本語': '日本語',
    '时长': '시간',
    '本页摄影素材均为 GPT Image 原创概念图，不作为真实拍摄参考来源。': '이 페이지의 사진 소재는 모두 GPT Image의 오리지널 컨셉 이미지이며 실제 촬영 참고가 아닙니다.',
    '柔和自然 · 35%': '부드럽고 자연스럽게 · 35%',
    '查看一次真实拍摄流程': '실제 촬영 과정 보기',
    '模特 1 · 摄影师 1 · 造型协助 1': '모델 1 · 촬영 1 · 스타일링 1',
    '模特动作引导词': '모델 동작 지시어',
    '正面站定，保留负空间': '정면에 서서 네거티브 스페이스 유지',
    '环境建立': '환경 구축',
    '简体中文': '简体中文',
    '肩线转动，视线越过镜头': '어깨 라인을 돌리고 시선은 렌즈 너머로',
    '设备': '장비',
    '镜头 01–02': '숏 01–02',
    '镜头 03–04': '숏 03–04',
    '镜头 05 与补拍': '숏 05와 추가 촬영',
    '集合与场地确认': '집합과 촬영지 확인',
    '预览不会修改原图': '미리보기는 원본을 수정하지 않습니다'
  }
};

for (const [locale, config] of Object.entries(locales)) {
  const pageUrl = `https://photoatelier.pages.dev/${locale}/`;
  let html = source
    .replace('<html lang="zh-CN">', `<html lang="${config.htmlLang}">`)
    .replace('<meta name="viewport" content="width=device-width, initial-scale=1">', '<meta name="viewport" content="width=device-width, initial-scale=1">\n  <base href="../">')
    .replace(/<title>[^<]+<\/title>/, `<title>${config.title}</title>`)
    .replace(/<meta name="description" content="[^"]+">/, `<meta name="description" content="${config.description}">`)
    .replace('<link rel="canonical" href="https://photoatelier.pages.dev/">', `<link rel="canonical" href="${pageUrl}">`)
    .replace('<meta property="og:locale" content="zh_CN">', `<meta property="og:locale" content="${config.ogLocale}">`)
    .replace(/<meta property="og:title" content="[^"]+">/, `<meta property="og:title" content="${config.ogTitle}">`)
    .replace(/<meta property="og:description" content="[^"]+">/, `<meta property="og:description" content="${config.ogDescription}">`)
    .replace('<meta property="og:url" content="https://photoatelier.pages.dev/">', `<meta property="og:url" content="${pageUrl}">`)
    .replace('"url": "https://photoatelier.pages.dev/"', `"url": "${pageUrl}"`)
    .replace('"description": "连接拍摄 Brief、参考图、镜头方案、设备、LUT、日程和复盘的摄影工作台。"', `"description": "${config.jsonDescription}"`)
    .replaceAll('/legacy/?mode=public-beta', `/legacy/?mode=public-beta&lang=${locale}`);

  html = html.replace(/>([^<>]+)</g, (match, raw) => {
    const value = raw.trim();
    const translated = config.text[value] || supplementalTranslations[locale]?.[value];
    if (!translated) return match;
    return `>${raw.replace(value, translated)}<`;
  });

  for (const [from, to] of Object.entries(config.attributes)) {
    html = html.replaceAll(`="${from}"`, `="${to}"`);
  }

  html = html.replace('<!doctype html>', `<!doctype html>\n<!-- Generated by tools/build-localized-landing.mjs. Edit index.html and this generator instead. -->`);
  const directory = path.join(root, locale);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), html);
}

console.log(`Built localized landing pages: ${Object.keys(locales).join(', ')}`);





