
  AOS.init({
    duration: 600,
    easing: 'ease-out-cubic',
    once: true,
    offset: 50
  });
  
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
