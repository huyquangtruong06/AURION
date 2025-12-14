(function() {
    // 1. Tự động phát hiện Server URL từ chính thẻ script này
    // Dù bạn deploy ở đâu, nó sẽ lấy đúng domain đó.
    const scriptTag = document.currentScript || document.querySelector('script[src*="widget.js"]');
    const scriptSrc = scriptTag.src;
    const baseUrl = new URL(scriptSrc).origin; // Lấy "https://your-domain.com" hoặc "http://127.0.0.1:8000"
    
    const botId = new URL(scriptSrc).searchParams.get("bot_id");

    if (!botId) {
        console.error("AI-CaaS Widget: Missing bot_id parameter.");
        return;
    }

    // 2. CSS Styles cho nút và iframe
    const style = document.createElement('style');
    style.innerHTML = `
        #aicaas-bubble {
            position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
            background: #2563eb; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.25);
            cursor: pointer; z-index: 999999; display: flex; align-items: center; justify-content: center;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        #aicaas-bubble:hover { transform: scale(1.1); }
        #aicaas-bubble svg { width: 30px; height: 30px; fill: white; transition: transform 0.3s; }
        
        #aicaas-iframe-container {
            position: fixed; bottom: 90px; right: 20px; width: 380px; height: 600px;
            max-height: 80vh; background: white; border-radius: 16px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.15); z-index: 999999;
            overflow: hidden; opacity: 0; transform: translateY(20px) scale(0.95);
            pointer-events: none; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            border: 1px solid rgba(0,0,0,0.1);
        }
        #aicaas-iframe-container.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
        
        @media (max-width: 480px) {
            #aicaas-iframe-container { width: 90%; right: 5%; bottom: 85px; height: 70vh; }
        }
    `;
    document.head.appendChild(style);

    // 3. Tạo Bong bóng chat (Bubble)
    const bubble = document.createElement('div');
    bubble.id = 'aicaas-bubble';
    bubble.innerHTML = `
        <svg id="icon-chat" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        <svg id="icon-close" viewBox="0 0 24 24" style="display:none; transform: rotate(90deg)"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    `;
    document.body.appendChild(bubble);

    // 4. Tạo Iframe
    const container = document.createElement('div');
    container.id = 'aicaas-iframe-container';
    
    // Lazy load iframe: Chỉ tạo src khi người dùng click lần đầu để web load nhanh
    let iframeCreated = false;

    bubble.onclick = () => {
        const isOpen = container.classList.contains('open');
        
        if (!isOpen && !iframeCreated) {
            const iframe = document.createElement('iframe');
            // DÙNG URL TỰ ĐỘNG PHÁT HIỆN Ở BƯỚC 1
            iframe.src = `${baseUrl}/frontend/embed.html?bot_id=${botId}`;
            iframe.style.cssText = "width:100%; height:100%; border:none;";
            container.appendChild(iframe);
            iframeCreated = true;
        }

        container.classList.toggle('open');
        
        // Toggle Icon
        const iconChat = document.getElementById('icon-chat');
        const iconClose = document.getElementById('icon-close');
        if (!isOpen) {
            iconChat.style.display = 'none';
            iconClose.style.display = 'block';
            setTimeout(() => iconClose.style.transform = 'rotate(0deg)', 50);
        } else {
            iconClose.style.transform = 'rotate(90deg)';
            setTimeout(() => {
                iconClose.style.display = 'none';
                iconChat.style.display = 'block';
            }, 100);
        }
    };

    document.body.appendChild(container);
})();