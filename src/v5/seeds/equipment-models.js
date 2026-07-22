const VERIFIED_AT = '2026-07-15';

const SOURCES = Object.freeze({
  sony: 'https://electronics.sony.com/imaging/interchangeable-lens-cameras',
  canon: 'https://www.usa.canon.com/shop/digital-cameras/mirrorless-cameras',
  nikon: 'https://www.nikonusa.com/cameras/mirrorless-cameras',
  fujifilm: 'https://fujifilm-x.com/global/products/cameras/',
  panasonic: 'https://shop.panasonic.com/pages/lumix-cameras',
  sigma: 'https://www.sigma-global.com/en/lenses/',
  tamron: 'https://www.tamron.com/global/consumer/lenses/',
  godox: 'https://www.godox.com/',
  aputure: 'https://www.aputure.com/',
  dji: 'https://www.dji.com/rs-4-pro',
  manfrotto: 'https://www.manfrotto.com/global-en/products/photo-tripods/',
  sandisk: 'https://www.westerndigital.com/brand/sandisk-professional',
});

function model(id, brand, name, category, details = {}) {
  return Object.freeze({
    id,
    brand,
    model: name,
    category,
    tags: [],
    isBuiltIn: true,
    catalogVersion: '2026.07',
    verifiedAt: VERIFIED_AT,
    source: 'manufacturer-catalog',
    sourceUrl: SOURCES[details.sourceKey || brand.toLowerCase()] || '',
    ...details,
    sourceKey: undefined,
  });
}

export const EQUIPMENT_MODEL_SEED = Object.freeze([
  model('camera-sony-a1-ii', 'Sony', 'Alpha 1 II', 'camera', { mount: 'Sony E', sensorFormat: 'full-frame', tags: ['旗舰', '高速', '高像素'] }),
  model('camera-sony-a9-iii', 'Sony', 'Alpha 9 III', 'camera', { mount: 'Sony E', sensorFormat: 'full-frame', tags: ['体育', '全局快门', '高速'] }),
  model('camera-sony-a7r-v', 'Sony', 'Alpha 7R V', 'camera', { mount: 'Sony E', sensorFormat: 'full-frame', aliases: ['A7R V', 'A7R5', 'ILCE-7RM5'], tags: ['高像素', '商业', '人像'] }),
  model('camera-sony-a7-iv', 'Sony', 'Alpha 7 IV', 'camera', { mount: 'Sony E', sensorFormat: 'full-frame', aliases: ['A7 IV', 'A7M4', 'ILCE-7M4'], tags: ['混合型', '人像', '活动'] }),
  model('camera-sony-a7c-ii', 'Sony', 'Alpha 7C II', 'camera', { mount: 'Sony E', sensorFormat: 'full-frame', tags: ['轻量', '旅行', '人像'] }),
  model('camera-sony-fx3', 'Sony', 'FX3', 'camera', { mount: 'Sony E', sensorFormat: 'full-frame', tags: ['视频', '电影机', '低照度'] }),
  model('camera-sony-fx30', 'Sony', 'FX30', 'camera', { mount: 'Sony E', sensorFormat: 'APS-C', tags: ['视频', '电影机', '轻量'] }),

  model('camera-canon-r1', 'Canon', 'EOS R1', 'camera', { mount: 'Canon RF', sensorFormat: 'full-frame', tags: ['旗舰', '体育', '新闻'] }),
  model('camera-canon-r5-ii', 'Canon', 'EOS R5 Mark II', 'camera', { mount: 'Canon RF', sensorFormat: 'full-frame', aliases: ['R5 Mark II', 'R5 II'], tags: ['高像素', '混合型', '商业'] }),
  model('camera-canon-r6-ii', 'Canon', 'EOS R6 Mark II', 'camera', { mount: 'Canon RF', sensorFormat: 'full-frame', tags: ['活动', '婚礼', '混合型'] }),
  model('camera-canon-r3', 'Canon', 'EOS R3', 'camera', { mount: 'Canon RF', sensorFormat: 'full-frame', tags: ['体育', '新闻', '高速'] }),
  model('camera-canon-r8', 'Canon', 'EOS R8', 'camera', { mount: 'Canon RF', sensorFormat: 'full-frame', tags: ['轻量', '入门全画幅', '旅行'] }),
  model('camera-canon-r7', 'Canon', 'EOS R7', 'camera', { mount: 'Canon RF', sensorFormat: 'APS-C', tags: ['生态', '体育', '长焦'] }),
  model('camera-canon-r50', 'Canon', 'EOS R50', 'camera', { mount: 'Canon RF', sensorFormat: 'APS-C', tags: ['入门', '内容创作', '轻量'] }),

  model('camera-nikon-z9', 'Nikon', 'Z9', 'camera', { mount: 'Nikon Z', sensorFormat: 'full-frame', tags: ['旗舰', '体育', '新闻'] }),
  model('camera-nikon-z8', 'Nikon', 'Z8', 'camera', { mount: 'Nikon Z', sensorFormat: 'full-frame', tags: ['商业', '高像素', '混合型'] }),
  model('camera-nikon-z6-iii', 'Nikon', 'Z6III', 'camera', { mount: 'Nikon Z', sensorFormat: 'full-frame', aliases: ['Z6 III'], tags: ['混合型', '婚礼', '视频'] }),
  model('camera-nikon-zf', 'Nikon', 'Zf', 'camera', { mount: 'Nikon Z', sensorFormat: 'full-frame', tags: ['人像', '街拍', '复古'] }),
  model('camera-nikon-z5-ii', 'Nikon', 'Z5II', 'camera', { mount: 'Nikon Z', sensorFormat: 'full-frame', tags: ['入门全画幅', '旅行', '人像'] }),
  model('camera-nikon-z50-ii', 'Nikon', 'Z50II', 'camera', { mount: 'Nikon Z', sensorFormat: 'APS-C', tags: ['轻量', '内容创作', '旅行'] }),

  model('camera-fuji-gfx100-ii', 'Fujifilm', 'GFX100 II', 'camera', { mount: 'Fujifilm G', sensorFormat: 'medium-format', tags: ['商业', '高像素', '棚拍'], sourceKey: 'fujifilm' }),
  model('camera-fuji-gfx100s-ii', 'Fujifilm', 'GFX100S II', 'camera', { mount: 'Fujifilm G', sensorFormat: 'medium-format', tags: ['商业', '人像', '高像素'], sourceKey: 'fujifilm' }),
  model('camera-fuji-x-h2s', 'Fujifilm', 'X-H2S', 'camera', { mount: 'Fujifilm X', sensorFormat: 'APS-C', tags: ['高速', '视频', '体育'], sourceKey: 'fujifilm' }),
  model('camera-fuji-x-h2', 'Fujifilm', 'X-H2', 'camera', { mount: 'Fujifilm X', sensorFormat: 'APS-C', tags: ['高像素', '商业', '视频'], sourceKey: 'fujifilm' }),
  model('camera-fuji-x-t5', 'Fujifilm', 'X-T5', 'camera', { mount: 'Fujifilm X', sensorFormat: 'APS-C', tags: ['人像', '街拍', '旅行'], sourceKey: 'fujifilm' }),
  model('camera-fuji-x-s20', 'Fujifilm', 'X-S20', 'camera', { mount: 'Fujifilm X', sensorFormat: 'APS-C', tags: ['混合型', '内容创作', '轻量'], sourceKey: 'fujifilm' }),

  model('camera-panasonic-s1r-ii', 'Panasonic', 'LUMIX S1RII', 'camera', { mount: 'L-Mount', sensorFormat: 'full-frame', tags: ['高像素', '商业', '视频'], sourceKey: 'panasonic' }),
  model('camera-panasonic-s5-iix', 'Panasonic', 'LUMIX S5IIX', 'camera', { mount: 'L-Mount', sensorFormat: 'full-frame', tags: ['视频', '混合型', '活动'], sourceKey: 'panasonic' }),
  model('camera-panasonic-gh7', 'Panasonic', 'LUMIX GH7', 'camera', { mount: 'Micro Four Thirds', sensorFormat: 'micro-four-thirds', tags: ['视频', '纪录片', '轻量'], sourceKey: 'panasonic' }),

  model('lens-sony-24-70-gm2', 'Sony', 'FE 24-70mm F2.8 GM II', 'lens', { mount: 'Sony E', focalRange: '24-70mm', maxAperture: 'f/2.8', tags: ['标准变焦', '活动', '商业'] }),
  model('lens-sony-70-200-gm2', 'Sony', 'FE 70-200mm F2.8 GM OSS II', 'lens', { mount: 'Sony E', focalRange: '70-200mm', maxAperture: 'f/2.8', tags: ['长焦', '活动', '人像'] }),
  model('lens-sony-35-gm', 'Sony', 'FE 35mm F1.4 GM', 'lens', { mount: 'Sony E', focalRange: '35mm', maxAperture: 'f/1.4', tags: ['环境人像', '街拍', '低光'] }),
  model('lens-sony-50-gm', 'Sony', 'FE 50mm F1.4 GM', 'lens', { mount: 'Sony E', focalRange: '50mm', maxAperture: 'f/1.4', tags: ['人像', '标准定焦', '低光'] }),
  model('lens-sony-85-gm2', 'Sony', 'FE 85mm F1.4 GM II', 'lens', { mount: 'Sony E', focalRange: '85mm', maxAperture: 'f/1.4', tags: ['人像', '特写', '棚拍'] }),

  model('lens-canon-rf-24-70', 'Canon', 'RF24-70mm F2.8 L IS USM', 'lens', { mount: 'Canon RF', focalRange: '24-70mm', maxAperture: 'f/2.8', tags: ['标准变焦', '婚礼', '商业'] }),
  model('lens-canon-rf-70-200', 'Canon', 'RF70-200mm F2.8 L IS USM', 'lens', { mount: 'Canon RF', focalRange: '70-200mm', maxAperture: 'f/2.8', tags: ['长焦', '活动', '人像'] }),
  model('lens-canon-rf-35', 'Canon', 'RF35mm F1.4 L VCM', 'lens', { mount: 'Canon RF', focalRange: '35mm', maxAperture: 'f/1.4', tags: ['环境人像', '视频', '低光'] }),
  model('lens-canon-rf-85', 'Canon', 'RF85mm F1.2 L USM', 'lens', { mount: 'Canon RF', focalRange: '85mm', maxAperture: 'f/1.2', tags: ['人像', '棚拍', '浅景深'] }),

  model('lens-nikon-z-24-70', 'Nikon', 'NIKKOR Z 24-70mm f/2.8 S', 'lens', { mount: 'Nikon Z', focalRange: '24-70mm', maxAperture: 'f/2.8', tags: ['标准变焦', '活动', '商业'] }),
  model('lens-nikon-z-70-200', 'Nikon', 'NIKKOR Z 70-200mm f/2.8 VR S', 'lens', { mount: 'Nikon Z', focalRange: '70-200mm', maxAperture: 'f/2.8', tags: ['长焦', '体育', '人像'] }),
  model('lens-nikon-z-35', 'Nikon', 'NIKKOR Z 35mm f/1.4', 'lens', { mount: 'Nikon Z', focalRange: '35mm', maxAperture: 'f/1.4', tags: ['环境人像', '街拍', '低光'] }),
  model('lens-nikon-z-85', 'Nikon', 'NIKKOR Z 85mm f/1.2 S', 'lens', { mount: 'Nikon Z', focalRange: '85mm', maxAperture: 'f/1.2', tags: ['人像', '棚拍', '浅景深'] }),

  model('lens-fuji-xf-16-55-ii', 'Fujifilm', 'XF16-55mmF2.8 R LM WR II', 'lens', { mount: 'Fujifilm X', focalRange: '16-55mm', maxAperture: 'f/2.8', tags: ['标准变焦', '活动', '商业'], sourceKey: 'fujifilm' }),
  model('lens-fuji-xf-33', 'Fujifilm', 'XF33mmF1.4 R LM WR', 'lens', { mount: 'Fujifilm X', focalRange: '33mm', maxAperture: 'f/1.4', tags: ['标准定焦', '人像', '街拍'], sourceKey: 'fujifilm' }),
  model('lens-fuji-xf-56', 'Fujifilm', 'XF56mmF1.2 R WR', 'lens', { mount: 'Fujifilm X', focalRange: '56mm', maxAperture: 'f/1.2', tags: ['人像', '特写', '浅景深'], sourceKey: 'fujifilm' }),

  model('lens-sigma-24-70-dg-dn-ii', 'Sigma', '24-70mm F2.8 DG DN II | Art', 'lens', { mount: 'Sony E / L-Mount', focalRange: '24-70mm', maxAperture: 'f/2.8', tags: ['标准变焦', '商业', '活动'], sourceKey: 'sigma' }),
  model('lens-sigma-35-dg-dn', 'Sigma', '35mm F1.4 DG DN | Art', 'lens', { mount: 'Sony E / L-Mount', focalRange: '35mm', maxAperture: 'f/1.4', tags: ['环境人像', '街拍', '低光'], sourceKey: 'sigma' }),
  model('lens-tamron-35-150', 'Tamron', '35-150mm F/2-2.8 Di III VXD', 'lens', { mount: 'Sony E / Nikon Z', focalRange: '35-150mm', maxAperture: 'f/2-2.8', tags: ['活动', '婚礼', '旅行'], sourceKey: 'tamron' }),

  model('light-godox-ad600pro-ii', 'Godox', 'AD600Pro II', 'light', { tags: ['外拍灯', '棚拍', '大功率'], sourceKey: 'godox' }),
  model('light-godox-ad400pro', 'Godox', 'AD400Pro', 'light', { tags: ['外拍灯', '便携', '人像'], sourceKey: 'godox' }),
  model('light-godox-ad300pro', 'Godox', 'AD300Pro', 'light', { tags: ['外拍灯', '便携', '人像'], sourceKey: 'godox' }),
  model('light-godox-ad200pro-ii', 'Godox', 'AD200Pro II', 'light', { tags: ['便携闪光', '外景', '补光'], sourceKey: 'godox' }),
  model('light-godox-v1pro', 'Godox', 'V1Pro', 'light', { tags: ['机顶闪光', '活动', '婚礼'], sourceKey: 'godox' }),
  model('light-aputure-600d-pro', 'Aputure', 'LS 600d Pro', 'light', { tags: ['常亮灯', '日光', '影视'], sourceKey: 'aputure' }),
  model('light-aputure-300x', 'Aputure', 'LS 300x', 'light', { tags: ['常亮灯', '双色温', '人像'], sourceKey: 'aputure' }),
  model('light-amaran-200xs', 'Aputure', 'amaran 200x S', 'light', { tags: ['常亮灯', '双色温', '轻量'], sourceKey: 'aputure' }),

  model('support-dji-rs4-pro', 'DJI', 'RS 4 Pro', 'support', { tags: ['稳定器', '视频', '单兵'], sourceKey: 'dji' }),
  model('support-dji-rs4', 'DJI', 'RS 4', 'support', { tags: ['稳定器', '视频', '轻量'], sourceKey: 'dji' }),
  model('support-manfrotto-055', 'Manfrotto', '055 Aluminium 3-Section Tripod', 'support', { tags: ['三脚架', '棚拍', '风光'], sourceKey: 'manfrotto' }),
  model('support-manfrotto-190', 'Manfrotto', '190 Aluminium 3-Section Tripod', 'support', { tags: ['三脚架', '轻量', '通用'], sourceKey: 'manfrotto' }),

  model('storage-sandisk-cfexpress-b-pro', 'SanDisk Professional', 'PRO-CINEMA CFexpress Type B Card', 'storage', { tags: ['CFexpress Type B', '高速存储'], sourceKey: 'sandisk' }),
  model('storage-sandisk-problade', 'SanDisk Professional', 'PRO-BLADE SSD Mag', 'storage', { tags: ['移动固态', '现场备份'], sourceKey: 'sandisk' }),
]);
