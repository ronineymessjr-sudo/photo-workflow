export const PROJECT_TEMPLATES = Object.freeze({
  blank: {
    label: '空白项目',
    description: '从零开始，不自动添加任务。',
    defaults: {},
    tasks: [],
  },
  portrait: {
    label: '人像 / 模特拍摄',
    description: '适合个人写真、约拍、时尚人像和创作拍摄。',
    defaults: {
      shootingType: '人像',
      style: '自然、电影感',
      brief: '人物特征、希望呈现的气质、服装妆造、动作边界、发布范围与不可接受内容。',
    },
    tasks: [
      ['确认模特授权、发布范围和动作边界', '前期', 'release'],
      ['确认服装、妆发和到场准备', '前期', 'styling'],
      ['确认场地权限与天气备用方案', '前期', 'location'],
      ['完成设备、电池和存储卡检查', '前期', 'equipment'],
      ['规划双备份位置与文件命名规则', '后期', 'backup'],
    ],
  },
  commercial: {
    label: '商业 / 品牌内容',
    description: '强调客户确认、交付范围、使用范围和版本管理。',
    defaults: {
      shootingType: '商业',
      style: '品牌一致、可交付',
      brief: '品牌目标、目标受众、关键产品信息、交付尺寸、使用渠道、禁用元素和客户确认人。',
      deliverables: '精修照片、社交媒体裁切与交付清单',
      usageScope: '待客户确认',
    },
    tasks: [
      ['确认 Brief、交付范围和使用渠道', '前期', 'brief'],
      ['确认客户审批人与最终拍板时间', '前期', 'approval'],
      ['确认产品、道具、场地和品牌规范', '前期', 'production'],
      ['创建必拍镜头与备用镜头清单', '前期', 'shots'],
      ['建立客户反馈和版本编号规则', '后期', 'versioning'],
    ],
  },
  event: {
    label: '活动 / 婚礼纪实',
    description: '强调时间线、必拍人物、备用机和快速备份。',
    defaults: {
      shootingType: '活动纪实',
      style: '纪实、自然、关键瞬间优先',
      brief: '活动时间线、关键人物、必拍环节、不可打扰区域、机位限制、交付时限和紧急联系人。',
    },
    tasks: [
      ['录入完整活动时间线和关键联系人', '前期', 'timeline'],
      ['确认必拍人物、合影组合和关键环节', '前期', 'must-shot'],
      ['准备备用机身、双卡和备用电池', '前期', 'redundancy'],
      ['确认场地动线、灯光限制和机位区域', '前期', 'venue'],
      ['规划现场快速备份和次日预览交付', '后期', 'rapid-delivery'],
    ],
  },
  product: {
    label: '产品 / 静物拍摄',
    description: '强调 SKU、角度覆盖、表面控制、色彩准确和文件命名。',
    defaults: {
      shootingType: '产品静物',
      style: '干净、准确、统一',
      brief: '产品清单、SKU、必拍角度、材质难点、背景要求、色彩标准、后期容许范围和交付命名。',
    },
    tasks: [
      ['核对产品清单、SKU 和拍摄顺序', '前期', 'sku'],
      ['确认必拍角度、尺寸和裁切比例', '前期', 'angles'],
      ['准备清洁、支撑、反光控制和色卡', '前期', 'surface'],
      ['建立统一灯光和机位参数记录', '拍摄', 'consistency'],
      ['按 SKU 检查文件命名与交付数量', '后期', 'naming'],
    ],
  },
});

export function getProjectTemplate(id = 'blank') {
  return PROJECT_TEMPLATES[id] || PROJECT_TEMPLATES.blank;
}

export function seedProjectTemplate(data, project, templateId = 'blank') {
  const template = getProjectTemplate(templateId);
  const created = [];
  for (const [title, phase, code] of template.tasks) {
    const id = `${project.id}-starter-${code}`;
    if (data.get('tasks', id)) continue;
    created.push(data.create('tasks', {
      id,
      projectId: project.id,
      taskType: 'checklist',
      phase,
      role: phase === '后期' ? 'photographer' : 'assistant',
      templateId,
      checklistCode: `starter-${code}`,
      title,
      status: 'todo',
    }));
  }
  return created;
}
