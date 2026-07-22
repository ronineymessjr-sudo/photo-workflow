import { applyKnowledgeToFallbackPlan } from '../services/photography-knowledge-service.js';

export const poseRules = [
  { id: 'pose_walk', name: '自然行走', scene: ['街拍','户外'], shotSize: ['全身','七分身'], notes: '重心自然前移，手臂放松，连续拍摄。' },
  { id: 'pose_turn', name: '侧身回望', scene: ['人像','复古'], shotSize: ['半身','全身'], notes: '身体约45度，头部转回镜头，肩膀放松。' },
  { id: 'pose_sit', name: '坐姿前倾', scene: ['室内','咖啡馆'], shotSize: ['半身','中景'], notes: '背部保持延伸，前臂轻放膝上，避免完全正对镜头。' },
];

export const shotTemplates = {
  人像: [
    { scene:'环境建立', shotSize:'全身', focalLength:'35mm', composition:'三分构图', lighting:'自然侧光', pose:'自然行走', durationMinutes:10, priority:'必拍' },
    { scene:'人物主肖像', shotSize:'半身', focalLength:'85mm', composition:'留白构图', lighting:'柔和侧光', pose:'侧身回望', durationMinutes:12, priority:'必拍' },
    { scene:'情绪特写', shotSize:'特写', focalLength:'85mm', composition:'中心构图', lighting:'柔光', pose:'视线离镜', durationMinutes:8, priority:'推荐' },
  ],
  商业: [
    { scene:'产品与人物建立', shotSize:'中景', focalLength:'50mm', composition:'主体明确', lighting:'主辅光', pose:'展示产品', durationMinutes:12, priority:'必拍' },
    { scene:'产品细节', shotSize:'特写', focalLength:'90mm微距', composition:'局部构图', lighting:'柔光箱', pose:'手部互动', durationMinutes:10, priority:'必拍' },
  ],
  默认: [
    { scene:'环境建立', shotSize:'全景', focalLength:'35mm', composition:'三分构图', lighting:'环境光', pose:'自然状态', durationMinutes:10, priority:'必拍' },
    { scene:'主体画面', shotSize:'中景', focalLength:'50mm', composition:'主体突出', lighting:'侧光', pose:'自然互动', durationMinutes:12, priority:'必拍' },
    { scene:'细节补充', shotSize:'特写', focalLength:'85mm', composition:'局部构图', lighting:'柔光', pose:'手部或表情细节', durationMinutes:8, priority:'推荐' },
  ],
};

export const lutRules = [
  { id:'lut_clean', name:'Clean Neutral', inputColorSpace:'Rec.709', style:['商业','清透'], strength:35, notes:'保持肤色与产品颜色准确。' },
  { id:'lut_film', name:'Soft Film', inputColorSpace:'Rec.709', style:['复古','电影感'], strength:45, notes:'压高光、轻抬黑位，避免肤色偏黄。' },
  { id:'lut_cool', name:'Cool Editorial', inputColorSpace:'Rec.709', style:['清冷','时尚'], strength:30, notes:'阴影略偏青，高光保持中性。' },
];

export function buildFallbackPlan(project, references = [], knowledge = null) {
  const type = project.shootingType || '默认';
  const templates = shotTemplates[type] || shotTemplates.默认;
  const shots = templates.map((shot, index) => ({
    ...shot,
    id: `shot_${Date.now()}_${index}`,
    sequence: index + 1,
    camera: {
      iso: shot.lighting.includes('环境') ? 400 : 200,
      shutter: shot.focalLength.includes('85') ? '1/250' : '1/160',
      aperture: shot.shotSize === '特写' ? 'f/2.0' : 'f/2.8',
      whiteBalance: '自动后手动校正',
    },
    fallback: '光线或场地不满足时，缩小场景范围并改用柔光补光。',
  }));

  const style = project.style || '';
  const lut = lutRules.find(item => item.style.some(tag => style.includes(tag))) || lutRules[0];

  const basePlan = {
    concept: `${project.title}：${style || type || '自然叙事'}方向`,
    rationale: '由本地摄影规则生成，可在远端 Agent 不可用时作为可靠降级。',
    visualDirection: {
      palette: style.includes('复古') ? '低饱和暖色、轻抬黑位' : '自然肤色、控制高光',
      lighting: '优先利用环境侧光，并准备可移动柔光补光。',
      composition: '环境建立、主体画面、细节特写形成完整叙事。',
    },
    equipment: ['主相机', '35mm或50mm镜头', '85mm镜头', '反光板/小型补光灯', '备用电池与存储卡'],
    shots,
    tasks: [
      { phase:'前期', title:'确认场地与天气', status:'todo' },
      { phase:'前期', title:'确认服装、道具与人员', status:'todo' },
      { phase:'拍摄', title:'按必拍镜头顺序执行', status:'todo' },
      { phase:'后期', title:'选片、调色与输出', status:'todo' },
    ],
    lutSuggestion: lut,
    risks: ['天气变化', '场地人流', '光线变化', '设备电量与存储空间'],
    referenceIds: references.map(item => item.id),
  };
  return applyKnowledgeToFallbackPlan(basePlan, knowledge);
}
