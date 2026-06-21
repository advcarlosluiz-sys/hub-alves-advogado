const init = () => {

    // ──────────────────────────────────────────────
    // 1. Scroll Navigation Effects
    // ──────────────────────────────────────────────
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // ──────────────────────────────────────────────
    // 2. Mobile Menu Toggle
    // ──────────────────────────────────────────────
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-links a');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('active');
            
            // Toggle hamburger animation
            const bars = menuToggle.querySelectorAll('.bar');
            if (menuToggle.classList.contains('active')) {
                bars[0].style.transform = 'rotate(-45deg) translate(-5px, 5px)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'rotate(45deg) translate(-5px, -5px)';
            } else {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });

        // Close menu when a link is clicked
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                menuToggle.classList.remove('active');
                const bars = menuToggle.querySelectorAll('.bar');
                bars.forEach(b => b.style.transform = 'none');
                bars[1].style.opacity = '1';
            });
        });
    }

    // ──────────────────────────────────────────────
    // 3. Scroll Reveal Animation (Intersection Observer)
    // ──────────────────────────────────────────────
    const fadeItems = document.querySelectorAll('.fade-in');
    
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('appear');
                    observer.unobserve(entry.target); // Animates only once
                }
            });
        }, observerOptions);

        fadeItems.forEach(item => {
            observer.observe(item);
        });
    } else {
        // Fallback for older browsers
        fadeItems.forEach(item => item.classList.add('appear'));
    }
    // ──────────────────────────────────────────────
    // 4. Contact Form Handler (AJAX)
    // ──────────────────────────────────────────────
    const contactForm = document.getElementById('contact-form');
    const formResponse = document.getElementById('form-response');

    if (contactForm && formResponse) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('btn-submit-contact');
            const name = document.getElementById('form-name').value.trim();
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            formResponse.textContent = '';
            
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            const payload = {
                Nome: document.getElementById('form-name').value.trim(),
                Email: document.getElementById('form-email').value.trim(),
                Telefone: document.getElementById('form-phone').value.trim(),
                Mensagem: document.getElementById('form-message').value.trim(),
                _consent: document.getElementById('form-consent').checked,
                website_confirm: contactForm.querySelector('[name="website_confirm"]').value
            };

            const targetUrl = isLocal ? '/api/leads' : 'https://formsubmit.co/ajax/contato@advcarlosluiz.com.br';
            const requestOptions = isLocal ? {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            } : {
                method: 'POST',
                body: new FormData(contactForm)
            };
            
            fetch(targetUrl, requestOptions)
            .then(response => response.json())
            .then(data => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Solicitação ➔';
                
                if (data.success || data.success === "true") {
                    formResponse.textContent = `Obrigado, ${name}! Recebemos seu contato. Em breve nossa equipe retornará no WhatsApp/E-mail informado.`;
                    formResponse.style.color = 'var(--primary)';
                    contactForm.reset();
                } else {
                    formResponse.textContent = data.message || "Ocorreu um erro ao enviar o formulário. Tente novamente mais tarde.";
                    formResponse.style.color = 'red';
                }
            })
            .catch(error => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Solicitação ➔';
                formResponse.textContent = "Erro na conexão. Verifique sua internet e tente novamente.";
                formResponse.style.color = 'red';
            });
        });
    }

    // ──────────────────────────────────────────────
    // 5. Anti-Copying & Anti-Scraping Protections
    // ──────────────────────────────────────────────
    // Block context menu (right click)
    document.addEventListener('contextmenu', event => event.preventDefault());

    // Block keyboard shortcuts (Ctrl+C, Ctrl+U, Ctrl+S, F12)
    document.addEventListener('keydown', event => {
        // Prevent F12 (DevTools)
        if (event.key === 'F12') {
            event.preventDefault();
        }
        // Prevent Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C (DevTools)
        if (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'i' || event.key === 'J' || event.key === 'j' || event.key === 'C' || event.key === 'c')) {
            event.preventDefault();
        }
        // Prevent Ctrl+U (View Source)
        if (event.ctrlKey && (event.key === 'U' || event.key === 'u')) {
            event.preventDefault();
        }
        // Prevent Ctrl+S (Save Page)
        if (event.ctrlKey && (event.key === 'S' || event.key === 's')) {
            event.preventDefault();
        }
        // Prevent Ctrl+C (Copy)
        if (event.ctrlKey && (event.key === 'C' || event.key === 'c')) {
            event.preventDefault();
        }
    });

    // ──────────────────────────────────────────────
    // 6. FAQ Accordion Toggle
    // ──────────────────────────────────────────────
    const faqQuestions = document.querySelectorAll('.faq-question');
    if (faqQuestions.length > 0) {
        faqQuestions.forEach(question => {
            question.addEventListener('click', () => {
                const item = question.parentElement;
                item.classList.toggle('active');
                const icon = question.querySelector('.faq-icon');
                if (icon) {
                    if (item.classList.contains('active')) {
                        icon.textContent = '−';
                    } else {
                        icon.textContent = '+';
                    }
                }
            });
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
