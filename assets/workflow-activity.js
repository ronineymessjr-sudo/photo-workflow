(function (root) {
    const day = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const cancelled = item => ['cancelled', 'canceled'].includes(item.status);
    function summary(plans, schedules, now = new Date()) {
        const active = schedules.filter(item => !cancelled(item));
        const completed = active.filter(item => item.status === 'completed').length;
        const month = day(now).slice(0, 7);
        return {
            plans: plans.length, schedules: active.length,
            month: active.filter(item => String(item.date || '').startsWith(month)).length,
            completed, completionRate: active.length ? Math.round(completed / active.length * 100) : null,
            unscheduled: plans.filter(plan => !active.some(item => String(item.planId || item.plan_id) === String(plan.id))).length,
        };
    }
    function reminders(plans, schedules, states = [], now = new Date()) {
        const today = day(now), cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() + 7);
        const until = day(cutoff), active = schedules.filter(item => !cancelled(item));
        const notices = [];
        for (const plan of plans) {
            if (!plan.id || active.some(item => String(item.planId || item.plan_id) === String(plan.id))) continue;
            notices.push({ id: `workflow:plan:${plan.id}`, name: plan.title || '未命名方案', service_type: '方案待排期',
                message: '方案已保存，尚未安排拍摄日期。', created_at: plan.savedAt || plan.created_at || '',
                target: { type: 'plan', id: plan.id } });
        }
        for (const item of active) {
            if (!item.id || item.status === 'completed' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date || '') || item.date > until) continue;
            const phase = item.date < today ? 'overdue' : item.date === today ? 'today' : 'upcoming';
            notices.push({ id: `workflow:schedule:${item.id}:${item.date}:${item.time || ''}:${phase}`,
                name: item.title || '未命名拍摄', service_type: phase === 'overdue' ? '日程待确认' : '拍摄提醒',
                message: `${item.date} ${item.time || '时间待定'} · ${item.location || '地点待定'}${phase === 'overdue' ? '。日期已过，请核实完成状态。' : ''}`,
                created_at: item.created_at || `${item.date}T00:00:00`,
                target: { type: 'schedule', id: item.id, date: item.date } });
        }
        return notices.map(item => {
            const saved = states.find(state => state.id === item.id);
            return { ...item, workflow: true, status: saved?.status || 'new' };
        }).filter(item => item.status !== 'dismissed');
    }
    root.PhotoWorkflowActivity = { summary, reminders };
})(globalThis);
