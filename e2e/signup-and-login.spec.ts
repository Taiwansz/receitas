import { test, expect } from '@playwright/test';

test('Criar conta e realizar login no Custiva', async ({ page }) => {
  const timestamp = Date.now();
  const testName = 'Desenvolvedor Taiwan';
  const testEmail = `taiwan_test_${timestamp}@custiva.app`;
  const testPassword = 'SenhaSegura123!';

  console.log(`1. Navegando para o cadastro em https://custiva.vercel.app/login?mode=signup...`);
  await page.goto('https://custiva.vercel.app/login?mode=signup');

  // Preencher formulário de cadastro
  console.log(`2. Preenchendo formulário de cadastro com ${testEmail}...`);
  await page.fill('input[name="name"]', testName);
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);

  await page.screenshot({ path: 'test-results/01-cadastro-preenchido.png' });

  // Submeter cadastro
  console.log(`3. Clicando em Criar conta...`);
  await page.click('button[type="submit"]');

  // Aguarda redirecionamento ou mensagem de resposta
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/02-pos-cadastro.png' });

  const currentUrl = page.url();
  console.log(`URL após cadastro: ${currentUrl}`);

  // Se não foi redirecionado diretamente para /app (por exemplo, se redirecionou para /login com aviso), tenta fazer o login
  if (!currentUrl.includes('/app')) {
    console.log(`4. Navegando para a página de login para autenticar com a conta criada...`);
    await page.goto('https://custiva.vercel.app/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-results/03-pos-login.png' });
  }

  console.log(`URL final: ${page.url()}`);
});
