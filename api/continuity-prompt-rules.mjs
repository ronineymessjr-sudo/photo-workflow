export function wardrobeCoverageRules({ subject, wardrobe, shotWardrobe, language = 'zh' } = {}) {
    const wardrobeText = [subject, wardrobe, shotWardrobe].filter(Boolean).join(' ');
    const hasLongSleeves = /宽袖|长袖|long[- ]sleeve|wide[- ]sleeve/i.test(wardrobeText);
    const explicitlyCropped = /短款|露脐|cropped|crop[- ]top/i.test(wardrobeText);
    const shouldersCovered = hasLongSleeves && !/露肩|滑肩|off[- ]shoulder|bare shoulders?/i.test(wardrobeText)
        ? language === 'en'
            ? 'Keep both shoulders fully covered; the knit top shoulder seams stay at the natural shoulder positions. Do not use off-shoulder, cutout-shoulder, or slipped-shoulder styling.'
            : '针织宽袖上衣肩缝保持在双肩自然位置，领口覆盖双肩和上臂，不做露肩、挖肩或滑肩造型。'
        : '';
    const torsoCovered = hasLongSleeves && !explicitlyCropped
        ? language === 'en'
            ? 'The top hem reaches the waistline and fully covers the abdomen; no cropped top, exposed midriff, or sheer variation.'
            : '针织上衣下摆覆盖至腰线，腹部皮肤完全遮挡；不出现短款、露脐或透肤变体。'
        : '';
    const jewelryExcluded = /不添加.{0,16}(?:首饰|项链|耳饰|饰品)|不要.{0,16}(?:首饰|项链|耳饰|饰品)|不得.{0,16}(?:首饰|项链|耳饰|饰品)|no jewelry|without jewelry/i.test(wardrobeText)
        ? language === 'en'
            ? 'No jewelry anywhere: no earrings, necklace, bracelets, or rings.'
            : '人物全组不佩戴首饰：耳朵、颈部、手腕和手指均无耳饰、项链、手链或戒指。'
        : '';
    return [shouldersCovered, torsoCovered, jewelryExcluded].filter(Boolean);
}

export function requiresWaistKnotInFrame(mustShow) {
    const text = Array.isArray(mustShow) ? mustShow.join(' ') : String(mustShow || '');
    return /(?:腰间|自然腰|腰线|腰部|waist).{0,18}(?:系结|打结|腰带结|wrap[- ]?knot|waist[- ]?tie|tie|knot)|(?:系结|打结|腰带结|wrap[- ]?knot|waist[- ]?tie|tie|knot).{0,18}(?:腰间|自然腰|腰线|腰部|waist)/i.test(text);
}
