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
      '开始公开测试': 'Try the public beta', '了解隐私模式': 'Explore privacy modes', '默认保存在你的浏览器，不上传个人图库': 'Saved in your browser by default. Your personal library is not uploaded.',
      '参考': 'References', '方案': 'Plan', '日程': 'Schedule', '拍摄': 'Shoot', '复盘': 'Review', '真实工作流': 'A real photography workflow',
      '从想法到复盘，': 'From idea to review,', '一站完成': 'all in one workspace', '按照摄影师的实际动作组织内容：先确定需求和参考，再落到镜头、设备、日程与现场执行。': 'Built around the way photographers actually work: define the brief and references first, then turn them into shots, gear, schedules, and on-set actions.',
      '明确目标、受众与交付物': 'Define goals, audience, and deliverables', '收集灵感，保留来源与授权': 'Collect inspiration with source and license records', '组织镜头、设备、动作和光线': 'Arrange shots, gear, direction, and lighting', '安排时间、机位与所需资源': 'Schedule time, camera positions, and resources', '现场勾选、备注与补拍': 'Check off shots, take notes, and flag pickups on set', '把有效经验回流到下一次创作': 'Carry proven decisions into the next production',
      '打开完整工作台': 'Open the full workspace', '真实产品界面：参考图按镜头关系组织，并保留素材来源。': 'Real product UI: references are organized by shot relationships with source records intact.',
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
      'PhotoAtelier 首页': 'PhotoAtelier home', '主要导航': 'Primary navigation', '摄影工作流': 'Photography workflow', 'PhotoAtelier 真实参考图与镜头绑定界面': 'PhotoAtelier interface showing real references bound to shots', '页脚导航': 'Footer navigation',
      '例如：给城市夜景人像建立一份拍摄方案': 'For example: build a shoot plan for a cinematic city portrait', '请描述你原本想完成什么、实际发生了什么，以及你希望它怎么工作': 'Describe what you wanted to do, what happened, and how you expected it to work'
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
      '参考': 'リファレンス', '方案': 'プラン', '日程': '日程', '拍摄': '撮影', '复盘': '振り返り', '真实工作流': '実際の撮影ワークフロー', '从想法到复盘，': 'アイデアから振り返りまで、', '一站完成': '一つの場所で完結', '按照摄影师的实际动作组织内容：先确定需求和参考，再落到镜头、设备、日程与现场执行。': '写真家の実際の動きに沿って、要件と参考を決め、ショット、機材、日程、現場進行へ落とし込みます。',
      '明确目标、受众与交付物': '目的、対象、納品物を明確化', '收集灵感，保留来源与授权': '出典とライセンスを保ったまま着想を収集', '组织镜头、设备、动作和光线': 'ショット、機材、ポーズ指示、光を整理', '安排时间、机位与所需资源': '時間、カメラ位置、必要リソースを配置', '现场勾选、备注与补拍': '現場で確認、メモ、追加撮影を管理', '把有效经验回流到下一次创作': '有効な知見を次の制作へ還元', '打开完整工作台': 'ワークスペースを開く', '真实产品界面：参考图按镜头关系组织，并保留素材来源。': '実際の画面：参考画像をショットとの関係で整理し、素材の出典を保持します。',
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
      'PhotoAtelier 首页': 'PhotoAtelier ホーム', '主要导航': 'メインナビゲーション', '摄影工作流': '写真制作ワークフロー', 'PhotoAtelier 真实参考图与镜头绑定界面': '実際の参考画像をショットに関連付ける PhotoAtelier の画面', '页脚导航': 'フッターナビゲーション',
      '例如：给城市夜景人像建立一份拍摄方案': '例：夜の都市ポートレートの撮影プランを作る', '请描述你原本想完成什么、实际发生了什么，以及你希望它怎么工作': 'やりたかったこと、実際に起きたこと、期待する動作を記入してください'
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
      '参考': '레퍼런스', '方案': '플랜', '日程': '일정', '拍摄': '촬영', '复盘': '리뷰', '真实工作流': '실제 촬영 워크플로', '从想法到复盘，': '아이디어부터 리뷰까지,', '一站完成': '하나의 워크스페이스에서', '按照摄影师的实际动作组织内容：先确定需求和参考，再落到镜头、设备、日程与现场执行。': '사진가의 실제 작업 순서에 따라 요구 사항과 레퍼런스를 정하고 샷, 장비, 일정, 현장 실행으로 연결합니다.',
      '明确目标、受众与交付物': '목표, 대상, 납품물 정의', '收集灵感，保留来源与授权': '출처와 라이선스를 유지하며 영감 수집', '组织镜头、设备、动作和光线': '샷, 장비, 디렉팅, 조명 구성', '安排时间、机位与所需资源': '시간, 카메라 위치, 리소스 배정', '现场勾选、备注与补拍': '현장에서 체크, 메모, 추가 촬영 관리', '把有效经验回流到下一次创作': '검증된 경험을 다음 제작에 반영', '打开完整工作台': '전체 워크스페이스 열기', '真实产品界面：参考图按镜头关系组织，并保留素材来源。': '실제 제품 화면: 레퍼런스를 샷 관계로 정리하고 출처를 유지합니다.',
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
      'PhotoAtelier 首页': 'PhotoAtelier 홈', '主要导航': '주요 내비게이션', '摄影工作流': '사진 제작 워크플로', 'PhotoAtelier 真实参考图与镜头绑定界面': '실제 레퍼런스를 샷에 연결하는 PhotoAtelier 화면', '页脚导航': '푸터 내비게이션',
      '例如：给城市夜景人像建立一份拍摄方案': '예: 도시 야간 인물 촬영 플랜 만들기', '请描述你原本想完成什么、实际发生了什么，以及你希望它怎么工作': '원래 하려던 일, 실제로 발생한 일, 기대한 동작을 적어주세요'
    }
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
    const translated = config.text[value];
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
