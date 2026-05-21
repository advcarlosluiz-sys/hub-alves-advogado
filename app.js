document.addEventListener('DOMContentLoaded', () => {

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
            const formData = new FormData(contactForm);
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';
            formResponse.textContent = '';
            
            fetch("https://formsubmit.co/ajax/contato@advcarlosluiz.com.br", {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Enviar Solicitação ➔';
                
                if (data.success || data.success === "true") {
                    formResponse.textContent = `Obrigado, ${name}! Recebemos seu contato. Em breve nossa equipe retornará no WhatsApp/E-mail informado.`;
                    formResponse.style.color = 'var(--primary)';
                    contactForm.reset();
                } else {
                    formResponse.textContent = "Ocorreu um erro ao enviar o formulário. Tente novamente mais tarde.";
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

});
