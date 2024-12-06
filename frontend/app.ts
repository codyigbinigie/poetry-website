interface UserSession {
    userId: string;
    username: string;
}

interface Poem {
    id: string;
    title: string;
    authorId: string;
    authorName: string;
    content: string;
    comments: CommentData[];
}

interface CommentData {
    id: string;
    userId: string;
    username: string;
    text: string;
}

class PoetryApplication {
    private session: UserSession | null = null;
    private poemListEl: HTMLElement;
    private searchInputEl: HTMLInputElement | null = null;
    private themeToggleBtn: HTMLButtonElement | null = null;

    private currentTheme: 'light-mode' | 'dark-mode' = 'light-mode';
    private poems: Poem[] = [];

    constructor() {
        this.poemListEl = document.getElementById('poemList') as HTMLElement;

        const loginForm = document.getElementById('loginForm') as HTMLFormElement;
        const registerForm = document.getElementById('registerForm') as HTMLFormElement;
        const poemForm = document.getElementById('poemForm') as HTMLFormElement;

        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        poemForm.addEventListener('submit', (e) => this.handlePoemSubmit(e));

        this.searchInputEl = document.getElementById('searchInput') as HTMLInputElement;
        if (this.searchInputEl) {
            this.searchInputEl.addEventListener('input', () => this.renderPoems());
        }
        this.themeToggleBtn = document.getElementById('themeToggleBtn') as HTMLButtonElement;
        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }

        this.setTheme(this.getStoredTheme() || 'light-mode');

        const storedSession = localStorage.getItem('session');
        if (storedSession) {
            this.session = JSON.parse(storedSession);
            this.showPoemSection();
            this.fetchPoems();
        }
    }

    private async handleLogin(e: Event) {
        e.preventDefault();
        const username = (document.getElementById('loginUsername') as HTMLInputElement).value;
        const password = (document.getElementById('loginPassword') as HTMLInputElement).value;

        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({username, password})
        });

        if (res.ok) {
            const data = await res.json();
            this.session = { userId: data.userId, username: data.username };
            localStorage.setItem('session', JSON.stringify(this.session));
            this.showPoemSection();
            this.fetchPoems();
        } else {
            alert('Invalid login credentials');
        }
    }

    private async handleRegister(e: Event) {
        e.preventDefault();
        const username = (document.getElementById('registerUsername') as HTMLInputElement).value;
        const password = (document.getElementById('registerPassword') as HTMLInputElement).value;

        const res = await fetch('/api/register', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({username, password})
        });

        if (res.ok) {
            alert('Registration successful! Please log in.');
        } else {
            const data = await res.json();
            alert(data.message);
        }
    }

    private showPoemSection() {
        const authSection = document.getElementById('authSection') as HTMLElement;
        const poemSection = document.getElementById('poemSection') as HTMLElement;
        const welcomeUser = document.getElementById('welcomeUser') as HTMLElement;
        const navActions = document.getElementById('navActions') as HTMLElement;

        if (!this.session) return;

        authSection.style.display = 'none';
        poemSection.style.display = 'block';
        welcomeUser.textContent = this.session.username;

        navActions.innerHTML = `<button id="logoutBtn">Logout</button>`;
        const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;
        logoutBtn.addEventListener('click', () => this.logout());
    }

    private logout() {
        this.session = null;
        localStorage.removeItem('session');
        location.reload();
    }

    private async fetchPoems() {
        const res = await fetch('/api/poems');
        if (res.ok) {
            this.poems = await res.json();
            this.renderPoems();
        }
    }

    private renderPoems() {
        if (!this.poemListEl) return;
        this.poemListEl.innerHTML = '';

        const searchQuery = this.searchInputEl ? this.searchInputEl.value.toLowerCase() : '';

        const filteredPoems = this.poems.filter(poem =>
            poem.title.toLowerCase().includes(searchQuery) ||
            poem.authorName.toLowerCase().includes(searchQuery) ||
            poem.content.toLowerCase().includes(searchQuery)
        );

        if (filteredPoems.length === 0) {
            this.poemListEl.innerHTML = '<p>No poems found.</p>';
            return;
        }

        filteredPoems.forEach(poem => {
            const poemItem = document.createElement('div');
            poemItem.className = 'poem-item';
            poemItem.innerHTML = `
                <div class="poem-title">${poem.title}</div>
                <div class="poem-author">by ${poem.authorName}</div>
                <div class="poem-content">${poem.content}</div>
                <div class="comment-section">
                    <h4>Comments:</h4>
                    <div class="comment-list">
                        ${poem.comments.map(c => `<div class="comment-item"><strong>${c.username}:</strong> ${c.text}</div>`).join('')}
                    </div>
                    ${this.session ? `
                    <form class="comment-form" data-poem-id="${poem.id}">
                        <input type="text" placeholder="Add a comment" required />
                        <button type="submit">Comment</button>
                    </form>
                    ` : `<p><i>Login to comment</i></p>`}
                </div>
            `;
            if (this.session) {
                const commentForm = poemItem.querySelector('.comment-form') as HTMLFormElement;
                commentForm.addEventListener('submit', (e) => this.handleCommentSubmit(e, poem.id));
            }
            this.poemListEl.appendChild(poemItem);
        });
    }

    private async handlePoemSubmit(e: Event) {
        e.preventDefault();
        if (!this.session) return;

        const title = (document.getElementById('poemTitle') as HTMLInputElement).value;
        const content = (document.getElementById('poemContent') as HTMLTextAreaElement).value;

        const res = await fetch('/api/poems', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                title, 
                authorId: this.session.userId, 
                authorName: this.session.username, 
                content
            })
        });

        if (res.ok) {
            const data = await res.json();
            this.poems.push(data.poem);
            this.renderPoems();
            (document.getElementById('poemTitle') as HTMLInputElement).value = '';
            (document.getElementById('poemContent') as HTMLTextAreaElement).value = '';
        } else {
            alert('Error adding poem');
        }
    }

    private async handleCommentSubmit(e: Event, poemId: string) {
        e.preventDefault();
        if (!this.session) return;

        const form = e.target as HTMLFormElement;
        const input = form.querySelector('input') as HTMLInputElement;
        const text = input.value;

        const res = await fetch(`/api/poems/${poemId}/comment`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({
                userId: this.session.userId,
                username: this.session.username,
                text
            })
        });

        if (res.ok) {
            const data = await res.json();
            const poem = this.poems.find(p => p.id === poemId);
            if (poem) {
                poem.comments.push(data.comment);
                this.renderPoems();
            }
            input.value = '';
        } else {
            alert('Error adding comment');
        }
    }

    private toggleTheme() {
        const newTheme = this.currentTheme === 'light-mode' ? 'dark-mode' : 'light-mode';
        this.setTheme(newTheme);
    }

    private setTheme(theme: 'light-mode' | 'dark-mode') {
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(theme);
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
    }

    private getStoredTheme(): 'light-mode' | 'dark-mode' | null {
        const stored = localStorage.getItem('theme');
        if (stored === 'light-mode' || stored === 'dark-mode') {
            return stored;
        }
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PoetryApp();
});
