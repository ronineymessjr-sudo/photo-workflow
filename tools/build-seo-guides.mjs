import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = 'https://photoatelier.pages.dev';
const published = '2026-07-30';

const guides = [
  {
    slug: 'reference-image-to-shot-plan',
    title: '参考图怎么拆成可执行的拍摄分镜',
    description: '从人物、场景、光线、构图和情绪五个维度分析参考图，再把结果转换为可执行镜头清单。',
    image: '/assets/landing-ai/reference-portrait-r6.webp',
    imageAlt: '建筑走廊中的原创人像摄影概念参考图',
    sections: [
      ['先区分“要什么”和“不要什么”', ['参考图不是让团队照抄。先写下真正需要保留的三项，例如柔和侧光、低饱和服装和纵深走廊；再写下不需要复制的部分，例如人物长相、具体建筑和原作者的独特构图。']],
      ['把画面拆成五个字段', ['依次记录人物状态、场景结构、光线方向、构图关系和情绪关键词。每个字段只保留一到两个可观察事实，避免使用“高级”“氛围感”这类无法执行的词。'], ['人物：站姿、视线、动作阶段', '场景：可利用的墙面、走廊、台阶或窗户', '光线：主光方向、软硬程度、明暗比', '构图：景别、主体位置、前后景关系', '情绪：克制、松弛、冷静或有张力']],
      ['转换成镜头，而不是继续收图', ['先做环境全景、人物中景、动作变化、情绪近景和细节特写五个基础镜头。每个镜头写清景别、焦段、机位、动作口令和光线目标，参考图只负责解释为什么这样设计。']],
      ['现场核对', ['开拍前让团队只看已选参考，而不是整张灵感收藏夹。拍摄中若参考与真实场地冲突，优先保留光线和情绪，再调整机位与构图。']]
    ]
  },
  {
    slug: 'portrait-shot-list',
    title: '一组人像拍摄需要哪些镜头',
    description: '用五个基础镜头搭建人像 Shot List，并根据时间、场景和交付数量增加变化。',
    image: '/assets/landing-ai/shot-02.webp',
    imageAlt: '原创人像拍摄分镜概念图',
    sections: [
      ['五个基础镜头', ['一组人像不需要从几十个零散动作开始。先用五个镜头覆盖空间、人物、动作、表情和细节，再根据客户需求扩展。'], ['环境全景：交代人物与地点关系', '半身中景：建立主要造型和姿态', '运动镜头：走动、转身或与场景互动', '面部近景：捕捉视线与细微表情', '细节特写：手部、饰品、服装或道具']],
      ['每个镜头至少写五项', ['景别决定画面信息量；焦段和机位决定透视；动作口令让模特知道怎么做；光线目标保证系列统一。缺少其中任何一项，现场都容易重新讨论。']],
      ['按交付反推变化数量', ['如果最终交付九张图，可先保证五个基础镜头各有一张，再为主造型增加两个构图变化，为第二场景增加两个镜头。不要为了数量重复拍摄几乎相同的画面。']],
      ['保留替代镜头', ['户外拍摄为风、雨、人流和场地限制准备替代机位。替代镜头应保持同一叙事目的，而不是临时换成毫无关系的画面。']]
    ]
  },
  {
    slug: 'posing-prompts',
    title: '模特听得懂的动作引导词怎么写',
    description: '把模糊的姿势要求转换为短句、动作和节奏，让非职业模特也能理解并执行。',
    image: '/assets/landing-ai/shot-03.webp',
    imageAlt: '人物行走动作的原创摄影概念图',
    sections: [
      ['不要只说“自然一点”', ['“自然”没有具体动作，模特只能猜摄影师的期待。引导词应该包含方向、速度、结束位置和视线，例如：“慢慢往前走两步，第二步落地时回头看我，肩膀放松。”']],
      ['先让身体动起来', ['行走、转身、整理头发、触碰衣角和观察道具都比固定摆姿更容易产生连续表情。摄影师要提前说明动作范围，并在动作发生时连拍。']],
      ['一个口令只解决一件事', ['先调整脚和重心，再处理肩膀，最后给视线和表情。一次给出五六个要求会让动作僵硬，也不利于摄影师判断到底哪里需要修改。']],
      ['按场景准备口令', ['墙边可使用倚靠、侧身和离墙；台阶可安排坐下、起身和回头；开阔场地优先走动、停顿和改变视线。每个场景提前准备两到三个口令即可。']]
    ]
  },
  {
    slug: 'photo-shoot-schedule',
    title: '摄影拍摄日程怎么排才不会赶',
    description: '从集合、准备、试光、正式拍摄到素材核对，建立可以在现场直接执行的摄影日程。',
    image: '/assets/landing-ai/shot-05.webp',
    imageAlt: '清晨建筑场景中的原创摄影概念图',
    sections: [
      ['从不可移动的时间开始', ['日出、日落、场地开放时间、模特档期和交通高峰是日程锚点。先放这些时间，再安排妆发、设备准备和镜头顺序。']],
      ['把准备时间单独列出', ['集合不等于开拍。人员签到、妆发、设备组装、场地确认和试光都需要明确时长。小型人像也应预留至少一次短暂的设备与素材检查。']],
      ['按场景而不是按照片排序', ['同一机位和光线条件下连续完成相关镜头，减少反复移动灯具、换镜头和整理造型。需要黄金时段的镜头应集中放在光线窗口内。']],
      ['为意外保留缓冲', ['两小时拍摄至少保留十五到二十分钟缓冲。最后安排素材数量核对、关键镜头检查和补拍决定，避免收工后才发现缺少交付画面。']]
    ]
  },
  {
    slug: 'lut-workflow',
    title: 'LUT 新手工作流：先校正，再选择风格',
    description: '理解转换 LUT 与创意 LUT 的区别，使用安全顺序完成相机 Log 素材的基础调色。',
    image: '/assets/landing-ai/lut-after.webp',
    imageAlt: '套用柔和自然色彩后的原创人像概念图',
    sections: [
      ['先确认素材是什么', ['查看相机、Log 曲线、色域和拍摄白平衡。S-Log3、D-Log M、Apple Log 需要匹配各自的输入转换，不能因为画面都显灰就套用同一个 LUT。']],
      ['转换 LUT 和创意 LUT 不是一回事', ['转换 LUT 把特定 Log 与色域映射到工作或显示空间；创意 LUT 改变综合色彩风格。正确顺序通常是先完成输入转换和曝光校正，再添加创意风格。']],
      ['降低强度并保护肤色', ['创意 LUT 的默认强度不一定适合每段素材。先观察肤色、黑位和高光，再降低混合比例。出现肤色偏绿、阴影堵塞或高光断层时，应先修正基础参数。']],
      ['保存可复用的组合', ['记录相机、Log、色域、白平衡、曝光修正、创意 LUT 和强度。下一次只有输入条件相近时才复用，避免把一个项目的参数当成万能预设。']]
    ]
  },
  {
    slug: 'log-to-rec709',
    title: 'S-Log、D-Log M 与 Apple Log 转 Rec.709',
    description: '面向 DaVinci Resolve、Photoshop 和 Blackmagic Camera 用户的 Log 到 Rec.709 基础检查清单。',
    image: '/assets/landing-ai/lut-before.webp',
    imageAlt: '尚未完成显示转换的原创低对比度人像概念图',
    sections: [
      ['先识别输入曲线和色域', ['文件名或设备名称不足以判断输入。确认 Sony S-Log2/S-Log3 与对应 S-Gamut、DJI D-Log M、Apple Log 或 Blackmagic Film，并查阅设备官方色彩管理说明。']],
      ['优先使用色彩管理或官方转换', ['在 DaVinci Resolve 中可使用项目色彩管理或 Color Space Transform；在其他软件中使用与输入严格匹配的官方技术 LUT。技术转换的目标是得到正常显示起点，不是直接完成最终风格。']],
      ['转换前后分别检查', ['转换前处理明显错误的白平衡和曝光；转换后检查肤色、亮度范围与饱和度。不要重复套用转换 LUT，否则对比度和饱和度会异常。']],
      ['手机 Log 也需要同样的记录', ['Blackmagic Camera 拍摄 Apple Log 或其他支持格式时，记录设备、编码、色彩空间和导出目标。交给剪辑或调色人员时一并提供，避免后期猜测。']]
    ]
  },
  {
    slug: 'photography-location-scout',
    title: '拍摄前怎样勘景：场地、光线、动线和备用方案',
    description: '用一份可执行的勘景清单确认场地可拍性、自然光窗口、人员动线与下雨或拥挤时的替代镜头。',
    image: '/assets/landing-ai/shot-05.webp',
    imageAlt: '建筑走廊中的原创摄影勘景概念图',
    sections: [
      ['先确认能不能拍，而不是先找好看的角落', ['到场后先确认开放时段、拍摄许可、是否需要预约、可使用区域和现场限制。再找画面。漂亮但无法停留、无法布光或无法容纳团队的位置，不能作为主镜头的唯一依赖。']],
      ['用三个时间点看自然光', ['分别在计划开拍前、黄金时段和预计收工前观察同一处位置。记录直射光是否进入、阴影落点、窗边反差和背景亮度。手机截图加箭头，比只写“下午光线好”更能让团队复现。'], ['主拍位：人物脸部能否稳定受光', '替代位：阴天、逆光过强或人流出现时是否可用', '收尾位：最后二十分钟能补哪些近景与细节']],
      ['把动线写进镜头顺序', ['从集合点、化妆区、主拍位到换装和休息区，尽量把相邻场景的镜头连续完成。动线顺了，团队不必为了一个插入镜头反复搬器材；时间表也更接近真实执行。']],
      ['每个主场景准备一个替代镜头', ['替代镜头应完成同一个叙事任务。例如主镜头是“人物在走廊中行走”，备用可以是“人物沿窗边缓慢移动”，而不是随手改成一张没有人物关系的墙面照片。']]
    ]
  },
  {
    slug: 'portrait-natural-light',
    title: '人像自然光怎么判断：时间、方向和现场替代方案',
    description: '用脸部受光、背景亮度和阴影边缘三个观察点，快速判断窗光、侧光、逆光和阴天漫射光是否适合当前人像镜头。',
    image: '/assets/landing-ai/reference-portrait-r6.webp',
    imageAlt: '窗边自然光人像的原创摄影概念图',
    sections: [
      ['先看脸，再看背景', ['人像自然光判断的第一问题不是“这里亮不亮”，而是脸部的明暗是否符合你要的情绪。先用肉眼和相机检查眼睛、鼻梁和下颌的阴影，再确认背景是否抢走人物注意力。']],
      ['四种常用方向各适合什么', ['窗边正侧光适合清晰、克制的人像；45 度侧光能增加面部层次；逆光适合轮廓和情绪，但需要控制脸部曝光；阴天漫射光容错高，适合动作和连续拍摄。'], ['记录光从哪一侧来，而不是只写“自然光”', '先确定人物面向，再确定摄影师站位', '背景过亮时先换角度或压暗背景，不急着提高人物曝光']],
      ['阴影边缘比亮度更重要', ['阴影边缘清晰，说明光源相对小或距离远，画面更有戏剧感；边缘柔和，说明光源更大或经过漫反射，皮肤过渡更平缓。这个判断能帮助你决定是否拉纱帘、靠近窗边或移动到遮阳处。']],
      ['为天气变化留出同风格的替代方案', ['晴天计划不要只依赖直射光。提前找到一处有屋檐、玻璃或浅色墙面反射的位置；阴天计划也应保留一个有方向感的窗边或通道。这样天气变化只会改变执行路径，不会推翻整个系列。']]
    ]
  },
  {
    slug: 'photography-gear-checklist',
    title: '摄影师拍摄当天的器材清单：按镜头任务准备，而不是盲目多带',
    description: '从机身、镜头、存储、电力、稳定与补光五类准备出发，把每件器材对应到具体镜头任务，减少遗漏和无效负重。',
    image: '/assets/landing-ai/shot-02.webp',
    imageAlt: '人像摄影器材与分镜准备的原创概念图',
    sections: [
      ['每件器材都要能回答一个镜头问题', ['不要先问“带不带这个镜头”，先问“哪一条分镜没有它就无法完成”。例如广角用于环境关系，中焦用于自然人像，长焦用于压缩背景或远距离抓拍。没有对应任务的器材可以留在备选，而不是塞进主清单。']],
      ['出发前检查六类基础项', ['把机身、镜头、存储卡、电池、稳定工具和补光工具分组检查。每组都记录数量、充电或格式化状态、负责人和备用方案；这比把品牌型号记满一页更能避免现场停工。'], ['机身与镜头：盖好镜头盖，确认常用焦段', '存储：卡容量足够，已完成可恢复的格式化', '电力：相机、灯具、手机和无线设备都有备用', '稳定：三脚架、夹具或手持方案与场地兼容', '补光：反光板、柔光或小灯只服务已知镜头', '清洁：镜头布、气吹和防雨保护随手可取']],
      ['根据场景删减，而不是无限增加', ['室内窗光人像通常优先考虑中焦镜头、反光工具和电池；户外夜景再增加稳定与可控补光；短视频还要把收音和竖构图固定方式写进任务。现场条件不同，清单也应不同。']],
      ['收工前完成一次素材交接', ['在离开场地前确认卡内素材数量、关键镜头是否拍到、是否存在需要立即备份的文件。器材清单不仅用于出发，也用于收工时确认没有遗落设备和数据。']]
    ]
  },
  {
    slug: 'reference-image-copyright',
    title: '摄影参考图怎么用才不越界：拆解灵感、标注来源与商业拍摄边界',
    description: '把参考图作为风格、光线和镜头语言的分析材料，保留来源与许可线索，避免把他人作品直接当作可复制的交付模板。',
    image: '/assets/landing-ai/shot-03.webp',
    imageAlt: '摄影师整理参考资料的原创概念图',
    sections: [
      ['参考图用于分析，不用于照搬', ['一张参考图可以帮助团队讨论光线方向、人物距离、景别节奏和情绪关键词，但不意味着可以复制原作者的独特构图、人物、服装、场地或成片。把可观察的视觉要素拆开，才是更可靠的创作起点。']],
      ['给每条资料保留最小来源信息', ['至少记录原始链接、作者或发布账号、平台、收录日期和已知许可状态。来源不明的图片可以放在“待核实”列表，用作私下研究，不应被标记为可直接用于商业提案或公开宣传。'], ['可以公开检索到，不等于可商用', '链接失效时保留原始截图和记录日期', '客户提供的参考图也应标明“客户提供，待确认授权”']],
      ['把相似要求改写成拍摄条件', ['与其写“拍成某张图那样”，不如写“低机位、中焦、逆光轮廓、人物缓慢向画面右侧移动”。这样拍摄团队得到可执行的语言，也能在真实场地里形成自己的画面。']],
      ['商业发布前做最后一次核对', ['确认最终图片没有使用未经授权的原图、商标、场地限制内容或可识别人物素材；涉及高风险用途、明确许可条款或争议时，应向权利人或专业人士确认。本文提供工作流程提示，不构成法律意见。']]
    ]
  }
];

for (const guide of guides) {
  const directory = path.join(root, 'guides', guide.slug);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), articlePage(guide));
}

fs.mkdirSync(path.join(root, 'guides'), { recursive: true });
fs.writeFileSync(path.join(root, 'guides', 'index.html'), indexPage());
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap());
fs.writeFileSync(path.join(root, 'sitemap.txt'), `${publicUrls().join('\n')}\n`);
console.log(`Built ${guides.length} SEO guides, sitemap.xml and sitemap.txt`);

function articlePage(guide) {
  const canonical = `${baseUrl}/guides/${guide.slug}/`;
  const body = guide.sections.map(([heading, paragraphs, list]) => `
      <section>
        <h2>${escapeHtml(heading)}</h2>
        ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n        ')}
        ${list ? `<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
      </section>`).join('');
  const related = relatedGuides(guide).map((item) => `<a href="/guides/${item.slug}/"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.description)}</span></a>`).join('');
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: guide.title,
        description: guide.description,
        image: `${baseUrl}${guide.image}`,
        datePublished: published,
        dateModified: published,
        mainEntityOfPage: canonical,
        author: { '@type': 'Organization', name: 'PhotoAtelier' },
        publisher: { '@type': 'Organization', name: 'PhotoAtelier' }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'PhotoAtelier', item: `${baseUrl}/` },
          { '@type': 'ListItem', position: 2, name: '摄影指南', item: `${baseUrl}/guides/` },
          { '@type': 'ListItem', position: 3, name: guide.title, item: canonical }
        ]
      }
    ]
  };
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(guide.title)} | PhotoAtelier 摄影指南</title>
  <meta name="description" content="${escapeHtml(guide.description)}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" type="image/png" href="/favicon-64.png">
  <link rel="stylesheet" href="/assets/guides.css">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(guide.title)}">
  <meta property="og:description" content="${escapeHtml(guide.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${baseUrl}${guide.image}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify(structuredData)}</script>
</head>
<body>
  ${header()}
  <main>
    <section class="hero">
      <div><p class="eyebrow">PhotoAtelier 摄影指南</p><h1>${escapeHtml(guide.title)}</h1><p class="lead">${escapeHtml(guide.description)}</p></div>
      <img src="${guide.image}" alt="${escapeHtml(guide.imageAlt)}" width="1000" height="1250">
    </section>
    <article class="article">
      <div class="note"><strong>使用说明</strong><br>本文用于拍摄准备和现场执行，不替代相机厂商的色彩管理文档、场地规定或商业授权核查。</div>
      ${body}
      <section class="related-guides" aria-labelledby="related-guides-title">
        <h2 id="related-guides-title">下一步看什么</h2>
        <p>把当前步骤完成后，再用下面的指南补齐方案里最容易缺失的部分。</p>
        <div>${related}</div>
      </section>
      <section>
        <h2>完成前检查</h2>
        <p>把方法写进方案后，再从执行者视角完整读一遍：摄影师是否知道机位和焦段，模特是否听得懂动作，协作人员是否知道时间与所需资源，后期是否拿到了正确的色彩信息。</p>
        <p>最后删除无法观察、无法确认或无法在现场完成的描述。保留的每一项都应能被勾选、替换或复盘，这样方案才不只是好看的文字。</p>
        <ul><li>来源和授权信息可追踪</li><li>镜头与交付目标对应</li><li>资源、时间和替代方案明确</li><li>原始素材不会被 LUT 或导出流程覆盖</li></ul>
      </section>
      <div class="cta"><div><strong>把这些步骤放进真实方案</strong><br><span>在 PhotoAtelier 中建立参考、分镜、资源和日程关系。</span></div><a class="button" href="/legacy/?mode=public-beta">打开工作台</a></div>
    </article>
  </main>
  ${footer()}
</body>
</html>`;
}

function indexPage() {
  const cards = guides.map((guide, index) => `<a class="guide-card" href="/guides/${guide.slug}/"><span>${String(index + 1).padStart(2, '0')}</span><h2>${escapeHtml(guide.title)}</h2><p>${escapeHtml(guide.description)}</p></a>`).join('\n');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>摄影拍摄与后期实用指南 | PhotoAtelier</title>
  <meta name="description" content="PhotoAtelier 摄影指南：参考图分析、人像分镜、模特引导、拍摄日程、LUT 与 Log 转 Rec.709。">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <link rel="canonical" href="${baseUrl}/guides/">
  <link rel="icon" type="image/png" href="/favicon-64.png">
  <link rel="stylesheet" href="/assets/guides.css">
  <meta property="og:type" content="website">
  <meta property="og:title" content="PhotoAtelier 摄影实用指南">
  <meta property="og:description" content="从参考图到分镜、现场动作、日程与后期的可执行摄影方法。">
  <meta property="og:url" content="${baseUrl}/guides/">
  <meta property="og:image" content="${baseUrl}/assets/landing-ai/hero-urban-dawn.webp">
  <meta name="twitter:card" content="summary_large_image">
</head>
<body>
  ${header()}
  <main class="guide-index">
    <p class="eyebrow">PhotoAtelier 摄影指南</p>
    <h1>把摄影方法写成现场能执行的步骤。</h1>
    <p class="lead">这里不堆灵感图。每篇指南围绕一个具体工作任务，说明要记录什么、按什么顺序做，以及怎样避免常见错误。</p>
    <div class="guide-grid">${cards}</div>
    <div class="cta"><div><strong>准备建立下一次拍摄</strong><br><span>从 Brief 到分镜和日程，先免费完成一份方案。</span></div><a class="button" href="/legacy/?mode=public-beta">打开工作台</a></div>
  </main>
  ${footer()}
</body>
</html>`;
}

function header() {
  return '<header class="site-header"><a class="brand" href="/">PhotoAtelier</a><nav aria-label="主要导航"><a href="/guides/">摄影指南</a><a href="/legacy/?mode=public-beta">打开工作台</a></nav></header>';
}

function footer() {
  return `<footer>PhotoAtelier · 摄影方案、分镜、资源与日程工作台 · <a href="/">返回首页</a></footer>`;
}

function sitemap() {
  const localized = [
    ['', 'zh-CN'],
    ['en/', 'en'],
    ['ja/', 'ja'],
    ['ko/', 'ko']
  ];
  const home = localized.map(([route, language]) => `  <url>
    <loc>${baseUrl}/${route}</loc>
    <lastmod>${published}</lastmod>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${baseUrl}/"/>
    <xhtml:link rel="alternate" hreflang="en" href="${baseUrl}/en/"/>
    <xhtml:link rel="alternate" hreflang="ja" href="${baseUrl}/ja/"/>
    <xhtml:link rel="alternate" hreflang="ko" href="${baseUrl}/ko/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/"/>
  </url>`).join('\n');
  const contentUrls = ['guides/', ...guides.map((guide) => `guides/${guide.slug}/`)]
    .map((route) => `  <url><loc>${baseUrl}/${route}</loc><lastmod>${published}</lastmod></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${home}
${contentUrls}
</urlset>
`;
}

function publicUrls() {
  return [
    `${baseUrl}/`,
    `${baseUrl}/en/`,
    `${baseUrl}/ja/`,
    `${baseUrl}/ko/`,
    `${baseUrl}/guides/`,
    ...guides.map((guide) => `${baseUrl}/guides/${guide.slug}/`)
  ];
}

function relatedGuides(guide) {
  const relationships = {
    'reference-image-to-shot-plan': ['portrait-shot-list', 'reference-image-copyright', 'photography-location-scout'],
    'portrait-shot-list': ['posing-prompts', 'photography-gear-checklist', 'photo-shoot-schedule'],
    'posing-prompts': ['portrait-shot-list', 'portrait-natural-light', 'photo-shoot-schedule'],
    'photo-shoot-schedule': ['photography-location-scout', 'photography-gear-checklist', 'portrait-shot-list'],
    'lut-workflow': ['log-to-rec709', 'portrait-natural-light', 'reference-image-to-shot-plan'],
    'log-to-rec709': ['lut-workflow', 'photography-gear-checklist', 'reference-image-to-shot-plan'],
    'photography-location-scout': ['portrait-natural-light', 'photo-shoot-schedule', 'reference-image-to-shot-plan'],
    'portrait-natural-light': ['photography-location-scout', 'portrait-shot-list', 'lut-workflow'],
    'photography-gear-checklist': ['portrait-shot-list', 'photo-shoot-schedule', 'log-to-rec709'],
    'reference-image-copyright': ['reference-image-to-shot-plan', 'photography-location-scout', 'portrait-shot-list']
  };
  const slugs = relationships[guide.slug] || [];
  return slugs.map((slug) => guides.find((item) => item.slug === slug)).filter(Boolean);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
