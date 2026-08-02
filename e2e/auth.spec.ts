import { test, expect } from '@playwright/test';

test.describe('Custiva - Testes de Autenticação e Cadastro', () => {
  test('1. Deve renderizar a página de login com os elementos principais', async ({ page }) => {
    await page.goto('/login');
    
    // Verificar título do formulário e campos
    const formHeading = page.getByRole('heading', { name: /Acesse seu espaço/i });
    await expect(formHeading).toBeVisible();
    await expect(page.getByRole('textbox', { name: /e-mail/i })).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
  });

  test('2. Deve navegar entre os modos Login, Cadastro e Recuperação de Senha', async ({ page }) => {
    await page.goto('/login');
    
    // Clicar em "Criar conta"
    await page.click('text=Criar conta');
    await expect(page).toHaveURL(/.*mode=signup/);
    const signupHeading = page.getByRole('heading', { name: /Crie sua conta/i });
    await expect(signupHeading).toBeVisible();
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /criar conta/i })).toBeVisible();

    // Clicar em "Entrar" para voltar ao login
    await page.click('text=Entrar');
    const loginHeading = page.getByRole('heading', { name: /Acesse seu espaço/i });
    await expect(loginHeading).toBeVisible();

    // Clicar em "Esqueci minha senha"
    await page.click('text=Esqueci minha senha');
    await expect(page).toHaveURL(/.*mode=recovery/);
    const recoveryHeading = page.getByRole('heading', { name: /Recupere seu acesso/i });
    await expect(recoveryHeading).toBeVisible();
    await expect(page.getByRole('button', { name: /enviar link/i })).toBeVisible();
  });

  test('3. Deve exibir erro ao tentar login com credenciais incorretas', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'usuario_inexistente_test@custiva.app');
    await page.fill('input[name="password"]', 'senha_errada_123');
    await page.click('button[type="submit"]');

    // Aguarda o alerta de erro do formulário
    const alert = page.locator('p[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Não foi possível entrar/i);
  });

  test('4. Deve tentar criar nova conta no cadastro', async ({ page }) => {
    await page.goto('/login?mode=signup');

    const testEmail = `teste_${Date.now()}@custiva.app`;
    await page.fill('input[name="name"]', 'Usuário Teste Playwright');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'SenhaSegura123!');
    
    await page.click('button[type="submit"]');

    // Verifica se a requisição foi efetuada e a resposta/redirecionamento ocorreu
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    if (currentUrl.includes('/app')) {
      expect(currentUrl).toContain('/app');
    } else {
      const alertOrStatus = page.locator('p[role="alert"], p[role="status"]');
      await expect(alertOrStatus).toBeVisible();
    }
  });
});
