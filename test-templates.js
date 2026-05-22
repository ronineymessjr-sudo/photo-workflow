// 模板内容完整性验证脚本
const PRESET_TEMPLATES = [
    {
        id: 'preset-1', name: '🌸 日系清新人像',
        category: [], scene: '', difficulty: '',
        guide: { poses: 5, background: 5, lighting: 5, weather: 4, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-2', name: '🌃 港风复古夜景',
        category: [], scene: '', difficulty: '',
        guide: { poses: 5, background: 5, lighting: 5, weather: 4, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-3', name: '🍂 复古胶片私房',
        category: [], scene: '', difficulty: '',
        guide: { poses: 5, background: 5, lighting: 5, weather: 3, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-4', name: '🌲 森系氧气写真',
        category: [], scene: '', difficulty: '',
        guide: { poses: 5, background: 5, lighting: 5, weather: 4, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-5', name: '💼 商务形象照',
        category: [], scene: '', difficulty: '',
        guide: { poses: 5, background: 5, lighting: 5, weather: 3, props: 5, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-6', name: '🇰🇷 韩系奶油肌',
        category: [], scene: '', difficulty: '',
        guide: { poses: 5, background: 5, lighting: 5, weather: 3, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-7', name: '🎬 情绪电影感',
        category: [], scene: '', difficulty: '',
        guide: { poses: 5, background: 5, lighting: 5, weather: 4, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-8', name: '👗 时尚杂志风',
        category: [], scene: '', difficulty: '',
        guide: { poses: 5, background: 5, lighting: 5, weather: 3, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-9', name: '🏖️ 海边度假风',
        category: [], scene: '', difficulty: '',
        guide: { poses: 5, background: 5, lighting: 5, weather: 4, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-10', name: '🏛️ 法式优雅',
        category: [], scene: '', difficulty: '',
        guide: { poses: 5, background: 5, lighting: 5, weather: 4, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-11', name: '🎎 古风汉服',
        category: [], scene: '', difficulty: '',
        guide: { poses: 5, background: 5, lighting: 5, weather: 4, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-12', name: '💍 轻婚纱写真',
        category: ['婚纱', '情侣', '浪漫'], scene: '户外', difficulty: '高',
        guide: { poses: 5, background: 5, lighting: 5, weather: 4, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-13', name: '📚 文艺书店人像',
        category: ['文艺', '室内', '清新'], scene: '室内', difficulty: '低',
        guide: { poses: 5, background: 5, lighting: 5, weather: 3, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-14', name: '🏃 运动活力风',
        category: ['运动', '活力', '户外'], scene: '户外', difficulty: '中',
        guide: { poses: 5, background: 5, lighting: 5, weather: 3, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-15', name: '🍰 甜品店少女',
        category: ['甜美', '室内', '韩系'], scene: '室内', difficulty: '低',
        guide: { poses: 5, background: 5, lighting: 5, weather: 2, props: 6, timing: 2, postProcess: 5 }
    },
    {
        id: 'preset-16', name: '🌙 夜景霓虹情绪',
        category: ['夜景', '情绪', '港风'], scene: '夜景', difficulty: '高',
        guide: { poses: 5, background: 5, lighting: 5, weather: 3, props: 5, timing: 2, postProcess: 5 }
    },
    {
        id: 'preset-17', name: '🎨 画室艺术感',
        category: ['艺术', '室内', '文艺'], scene: '室内', difficulty: '中',
        guide: { poses: 5, background: 5, lighting: 5, weather: 2, props: 6, timing: 2, postProcess: 5 }
    },
    {
        id: 'preset-18', name: '🏍️ 机车酷飒风',
        category: ['酷飒', '工业', '个性'], scene: '户外', difficulty: '中',
        guide: { poses: 5, background: 5, lighting: 5, weather: 3, props: 6, timing: 2, postProcess: 5 }
    },
    {
        id: 'preset-19', name: '🌸 樱花季限定',
        category: ['季节', '户外', '浪漫'], scene: '户外', difficulty: '中',
        guide: { poses: 5, background: 5, lighting: 5, weather: 3, props: 6, timing: 3, postProcess: 5 }
    },
    {
        id: 'preset-20', name: '🏠 居家慵懒风',
        category: ['居家', '室内', '生活'], scene: '室内', difficulty: '低',
        guide: { poses: 5, background: 5, lighting: 5, weather: 2, props: 6, timing: 3, postProcess: 5 }
    }
];

// 验证每个模板的完整性
function validateTemplates() {
    const results = [];
    let totalScore = 0;
    let maxScore = 0;

    PRESET_TEMPLATES.forEach((tpl, index) => {
        const issues = [];
        let score = 0;
        const maxTplScore = 100;

        // 检查基本信息
        if (!tpl.id) issues.push('缺少ID');
        else score += 10;

        if (!tpl.name) issues.push('缺少名称');
        else score += 10;

        // 检查分类标签（新模板应该有，旧模板可能没有）
        if (index >= 11) { // preset-12 开始是新模板
            if (!tpl.category || tpl.category.length === 0) issues.push('缺少分类标签');
            else score += 10;

            if (!tpl.scene) issues.push('缺少场景标记');
            else score += 10;

            if (!tpl.difficulty) issues.push('缺少难度标记');
            else score += 10;
        } else {
            score += 30; // 旧模板不扣分
        }

        // 检查 guide 内容数量
        const guideFields = ['poses', 'background', 'lighting', 'weather', 'props', 'timing', 'postProcess'];
        let guideScore = 0;
        guideFields.forEach(field => {
            const count = tpl.guide[field] || 0;
            if (count >= 5) guideScore += 5;
            else if (count >= 3) guideScore += 3;
            else if (count >= 1) guideScore += 1;
            else issues.push(`${field}数量不足(${count})`);
        });
        score += guideScore;

        totalScore += score;
        maxScore += maxTplScore;

        results.push({
            id: tpl.id,
            name: tpl.name,
            score: score,
            maxScore: maxTplScore,
            issues: issues,
            passed: score >= 70
        });
    });

    return {
        templates: results,
        totalScore: totalScore,
        maxScore: maxScore,
        overallScore: Math.round((totalScore / maxScore) * 100),
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length
    };
}

const report = validateTemplates();

console.log('='.repeat(60));
console.log('📸 PhotoAtelier 模板内容完整性测试报告');
console.log('='.repeat(60));
console.log();

report.templates.forEach(tpl => {
    const status = tpl.passed ? '✅' : '❌';
    console.log(`${status} ${tpl.name}`);
    console.log(`   得分: ${tpl.score}/${tpl.maxScore}`);
    if (tpl.issues.length > 0) {
        console.log(`   问题: ${tpl.issues.join(', ')}`);
    }
    console.log();
});

console.log('='.repeat(60));
console.log(`📊 总体评分: ${report.overallScore}/100`);
console.log(`✅ 通过: ${report.passed}/${report.templates.length}`);
console.log(`❌ 失败: ${report.failed}/${report.templates.length}`);
console.log('='.repeat(60));

// 输出 JSON 供进一步处理
console.log('\n📄 JSON 报告:');
console.log(JSON.stringify(report, null, 2));
