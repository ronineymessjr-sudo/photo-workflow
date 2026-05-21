
            // 数字滚动动效
            function animateCount(el, target, suffix) {
                suffix = suffix || '';
                var start = 0;
                var duration = 1200;
                var startTime = null;
                function step(timestamp) {
                    if (!startTime) startTime = timestamp;
                    var progress = Math.min((timestamp - startTime) / duration, 1);
                    var eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
                    var current = Math.round(eased * target);
                    el.textContent = current + suffix;
                    if (progress < 1) requestAnimationFrame(step);
                }
                requestAnimationFrame(step);
            }

            // 加载看板数据
            function loadDashboard() {
                var token = localStorage.getItem('pw_token');
                if (!token) return;

                fetch(window.api.base + '/dashboard/stats', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (!data.stats) return;
                    var stats = data.stats;

                    // 顶部统计 - 数字滚动
                    var shootsEl = document.getElementById('stat-shoots');
                    var completionEl = document.getElementById('stat-completion');
                    var clientsEl = document.getElementById('stat-clients');
                    var messagesEl = document.getElementById('stat-messages');

                    if (shootsEl) animateCount(shootsEl, stats.monthShoots || 0);
                    if (completionEl) animateCount(completionEl, stats.completionRate || 0, '%');
                    if (clientsEl) animateCount(clientsEl, stats.activeClients || 0);
                    if (messagesEl) animateCount(messagesEl, stats.newClients || 0);

                    // 增长率
                    var growthEl = document.getElementById('stat-growth');
                    if (growthEl) {
                        var g = stats.monthGrowth || 0;
                        growthEl.textContent = g > 0 ? '↑ ' + g + '%' : g < 0 ? '↓ ' + Math.abs(g) + '%' : '-';
                        growthEl.style.color = g > 0 ? '#4ade80' : g < 0 ? '#ef4444' : 'var(--t3)';
                    }

                    // 完成率进度条
                    var bar = document.getElementById('stat-completion-bar');
                    if (bar) bar.style.width = (stats.completionRate || 0) + '%';

                    // 趋势图
                    if (data.trends && data.trends.length > 0) {
                        var chart = document.getElementById('trend-chart');
                        var maxCount = Math.max.apply(Math, data.trends.map(function(t) { return t.count; }));
                        maxCount = Math.max(maxCount, 1);
                        chart.innerHTML = data.trends.map(function(trend) {
                            var h = Math.max((trend.count / maxCount * 100), 4);
                            return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:.25rem;">' +
                                '<div style="width:100%;height:' + h + '%;background:linear-gradient(180deg,var(--ac),transparent);border-radius:4px 4px 0 0;transition:height 1s ease;min-height:4px;"></div>' +
                                '<span style="font-size:.65rem;color:var(--t3);">' + trend.month + '</span>' +
                            '</div>';
                        }).join('');
                    }

                    // 热门场地
                    if (data.topVenues && data.topVenues.length > 0 && data.topVenues[0].count > 0) {
                        var venueEl = document.getElementById('venue-chart');
                        var colors = ['#ffd700,#ffaa00', '#c0c0c0,#a0a0a0', '#cd7f32,#b87333'];
                        venueEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:.75rem;">' +
                            data.topVenues.map(function(v, i) {
                                var bg = i < 3 ? 'linear-gradient(135deg,' + colors[i] + ')' : 'var(--bg2)';
                                var color = i < 3 ? '#000' : 'var(--t3)';
                                return '<div style="display:flex;align-items:center;gap:.75rem;">' +
                                    '<span style="width:20px;height:20px;border-radius:50%;background:' + bg + ';display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:600;color:' + color + ';">' + v.rank + '</span>' +
                                    '<span style="flex:1;font-size:.8rem;color:var(--t1);">' + v.name + '</span>' +
                                    '<span style="font-size:.75rem;color:' + (i < 3 ? 'var(--ac)' : 'var(--t3)') + ';font-weight:500;">' + v.count + '次</span>' +
                                '</div>';
                            }).join('') + '</div>';
                    }

                    // 客户分析
                    var totalEl = document.getElementById('stat-total-shoots');
                    var completedEl = document.getElementById('stat-completed');
                    var locationsEl = document.getElementById('stat-locations');
                    if (totalEl) animateCount(totalEl, stats.totalShoots || 0);
                    if (completedEl) animateCount(completedEl, stats.completedShoots || 0);
                    if (locationsEl) animateCount(locationsEl, stats.activeClients || 0);
                })
                .catch(function(e) { console.log('Dashboard load error:', e); });
            }
            