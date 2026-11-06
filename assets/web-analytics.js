(() => {
    if (!['photo.ronineymessjrstudio.cn', 'photo-workflow.pages.dev'].includes(location.hostname)) return;
    if (new URLSearchParams(location.search).get('maintenance') === '1') return;
    const script = document.createElement('script');
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.defer = true;
    script.dataset.cfBeacon = JSON.stringify({ token: '89a1868d30784e858ece00474ede41fc', spa: false });
    document.head.appendChild(script);
})();
