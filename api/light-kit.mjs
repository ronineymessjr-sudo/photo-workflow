// The light kit: structured lighting direction, distilled from the
// plan-quality-lab briefs that were actually run and reviewed
// (experiments/plan-quality-lab/briefs-matrix-2026-10-26.json, ids light-* and
// time-*). Each entry is a prompt-ready Chinese lighting instruction, not a
// label: name the light source, its direction and quality, and the trap to
// avoid. A plan that names no lighting falls back to the first matching kit
// entry; plans that do specify lighting are never overridden.

export const LIGHT_KIT = [
    {
        id: 'golden-hour',
        match: { timeOfDay: /黄金时刻|日出|日落|黄昏|傍晚|清晨|golden/ },
        light: '光线：日出后或日落前的低角度暖色侧逆光为主光，暖色勾出发丝轮廓，按人物面部曝光保住细节；光衰减真实，暗部不被提亮；不用闪光灯。',
    },
    {
        id: 'noon-hard',
        match: { timeOfDay: /正午|中午|noon/ },
        light: '光线：正午顶光很硬，让人物站在阴影分区的边缘，面部避开直射顶光，用环境反射补亮；高对比但面部不是死黑也不是死白。',
    },
    {
        id: 'blue-window',
        match: { timeOfDay: /蓝调|日落后|入夜|blue/ },
        light: '光线：日落后二十分钟的天空冷色从窗外进入，与室内暖色台灯做冷暖对比，人物面部有双色温过渡，靠窗一侧偏冷、内侧偏暖。',
    },
    {
        id: 'neon-street',
        match: { timeOfDay: /夜晚|午夜|深夜|night/, location: /便利店|街|霓虹|灯箱|夜市/ },
        light: '光线：只用现场光源（店灯、街灯、灯箱）照明，灯箱色光反射在人物面部；人物站在灯光边界处，亮一面与暗一面拉出光比；不用闪光灯。',
    },
    {
        id: 'single-lamp-rembrandt',
        match: { timeOfDay: /夜晚|晚上|室内/, location: /室内|昏暗|房间|墙/ },
        light: '光线：单一暖色光源从人物侧上方45度打入（伦勃朗光位），受光侧脸颊出现三角光斑，另一侧沉入真实暗部；背景保持比人物暗，光衰减清晰。',
    },
    {
        id: 'candle',
        match: { location: /烛光|蜡烛|烛/ },
        light: '光线：烛光是唯一光源，暖橙、闪烁感、随距离快速衰减；人物靠近光源一侧被照亮，另一侧几乎没入黑暗；高感光的细微颗粒可见。',
    },
    {
        id: 'dappled',
        match: { location: /树|花园|林|草地|公园|庭院/ },
        light: '光线：树叶间漏下的斑驳光斑落在人物肩背与地面上，光斑不要切在眼睛上；整体是柔和的漫射日光，明暗错落而不是均匀照亮。',
    },
    {
        id: 'overcast',
        match: { weather: /阴|多云|雾|overcast/ },
        light: '光线：阴天柔光箱式天空光，光从头顶大面积漫射下来，鼻下与眼窝阴影浅而软；色温偏冷，皮肤保持真实质感不发灰。',
    },
    {
        id: 'window-soft',
        match: { location: /窗|窗边|咖啡|书店|美术馆|室内/ },
        light: '光线：大面积窗光从人物侧前方进入作主光，亮侧到暗侧有连续的过渡，另一侧墙壁的反光轻轻补亮；光衰减真实，暗部真正暗下去。',
    },
    {
        id: 'reflection',
        match: { weather: /雨|积水|水/, location: /广场|地砖|街道|水面/ },
        light: '光线：雨后地面积水充当反光板，从下方向人物下颌补光，同时承接天空的冷色；人物与倒影同框，曝光偏向高光保住倒影细节。',
    },
    {
        id: 'backlit-hair',
        match: { mood: /唯美|柔和|逆光/ },
        light: '光线：正逆光位，太阳在人物身后，发丝被轮廓光勾亮，按面部点测曝光保住五官细节；眩光轻微可控，画面像隔了一层薄纱。',
    },
    {
        id: 'default',
        match: {},
        light: '光线：单一主光方向明确（从画面一侧进入），光衰减真实，背光一侧真正暗下去，暗部不被提亮；另一侧用环境反射补光，光比可感知但不死黑。',
    },
];

// First matching kit entry wins. Time-of-day rules beat location rules beat
// mood rules, so the list is ordered by specificity and pickLightKit returns
// the first hit.
export function pickLightKit({ timeOfDay = '', location = '', weather = '', mood = '' } = {}) {
    for (const entry of LIGHT_KIT) {
        const { match, light } = entry;
        if (match.timeOfDay && !match.timeOfDay.test(String(timeOfDay))) continue;
        if (match.location && !match.location.test(String(location))) continue;
        if (match.weather && !match.weather.test(String(weather))) continue;
        if (match.mood && !match.mood.test(String(mood))) continue;
        return { id: entry.id, light };
    }
    const fallback = LIGHT_KIT[LIGHT_KIT.length - 1];
    return { id: fallback.id, light: fallback.light };
}
