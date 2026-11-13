export function wardrobeCoverageRules({ subject, wardrobe, shotWardrobe, language = 'zh' } = {}) {
    const wardrobeText = [subject, wardrobe, shotWardrobe].filter(Boolean).join(' ');
    const hasLongSleeves = /宽袖|长袖|long[- ]sleeve|wide[- ]sleeve/i.test(wardrobeText);
    const shouldersCovered = hasLongSleeves && !/露肩|滑肩|off[- ]shoulder|bare shoulders?/i.test(wardrobeText)
        ? language === 'en'
            ? 'Keep both shoulders fully covered; the knit top shoulder seams stay at the natural shoulder positions. Do not use off-shoulder or slipped-shoulder styling.'
            : '针织宽袖上衣肩缝保持在双肩自然位置，领口覆盖双肩，不做露肩或滑肩造型。'
        : '';
    const jewelryExcluded = /不添加.{0,16}(?:首饰|项链|耳饰|饰品)|不要.{0,16}(?:首饰|项链|耳饰|饰品)|不得.{0,16}(?:首饰|项链|耳饰|饰品)|no jewelry|without jewelry/i.test(wardrobeText)
        ? language === 'en'
            ? 'No jewelry anywhere: no earrings, necklace, bracelets, or rings.'
            : '人物全组不佩戴首饰：耳朵、颈部、手腕和手指均无耳饰、项链、手链或戒指。'
        : '';
    return [shouldersCovered, jewelryExcluded].filter(Boolean);
}
