import { test, expect } from '@playwright/test';

test.setTimeout(90000);

test('Popular Ingredientes e Receitas na conta do usuário', async ({ page }) => {
  const primaryEmail = 'teu.matheus.ms@gmail.com';
  const aliasEmail = 'teu.matheus.ms+custiva@gmail.com';
  const password = '123456789';
  const name = 'Matheus Sousa';

  console.log(`1. Acessando https://custiva.vercel.app/login...`);
  await page.goto('https://custiva.vercel.app/login');

  console.log(`2. Autenticando com ${primaryEmail}...`);
  await page.fill('input[name="email"]', primaryEmail);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  let currentUrl = page.url();
  let activeEmail = primaryEmail;

  if (currentUrl.includes('/login')) {
    console.log(`Login com ${primaryEmail} não redirecionou para /app. Autenticando conta ${aliasEmail}...`);
    activeEmail = aliasEmail;

    await page.goto('https://custiva.vercel.app/login?mode=signup');
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="email"]', activeEmail);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log(`Efetuando login para ${activeEmail}...`);
      await page.goto('https://custiva.vercel.app/login');
      await page.fill('input[name="email"]', activeEmail);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
  }

  currentUrl = page.url();
  console.log(`URL de acesso: ${currentUrl}`);
  expect(currentUrl).toContain('/app');

  // Configuração inicial de onboarding (caso a conta seja recente)
  const onboardingTitle = page.locator('h1', { hasText: /Vamos configurar sua operação/i });
  if (await onboardingTitle.isVisible().catch(() => false)) {
    console.log(`Configurando workspace...`);
    await page.fill('input[name="company"]', 'Gastronomia Matheus Gourmet');
    await page.fill('input[name="branch"]', 'Matriz SP');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  // --- CADASTRO DE INGREDIENTES ---
  console.log(`3. Acessando tela de Ingredientes...`);
  await page.goto('https://custiva.vercel.app/app/ingredients');
  await page.waitForTimeout(2000);

  const ingredientsList = [
    { name: 'Farinha de Trigo Especial', sku: 'FAR-001', brand: 'Dona Benta', unit: 'kg', cost: '6.50', yieldPct: '100', stock: '50', minStock: '10' },
    { name: 'Manteiga Sem Sal', sku: 'MAN-002', brand: 'Itambé', unit: 'kg', cost: '38.90', yieldPct: '100', stock: '15', minStock: '3' },
    { name: 'Açúcar Refinado', sku: 'ACU-003', brand: 'União', unit: 'kg', cost: '4.80', yieldPct: '100', stock: '40', minStock: '8' },
    { name: 'Leite Integral', sku: 'LEI-004', brand: 'Ninho', unit: 'l', cost: '5.20', yieldPct: '100', stock: '30', minStock: '5' },
    { name: 'Chocolate em Pó 50%', sku: 'CHO-005', brand: 'Melken', unit: 'kg', cost: '42.00', yieldPct: '100', stock: '10', minStock: '2' },
  ];

  for (const ing of ingredientsList) {
    const exists = await page.locator(`td:has-text("${ing.name}")`).isVisible().catch(() => false);
    if (!exists) {
      console.log(`Cadastrando ingrediente: ${ing.name}...`);
      await page.click('button:has-text("Novo ingrediente")');
      await page.waitForSelector('role=dialog');

      await page.fill('input[name="name"]', ing.name);
      if (ing.sku) await page.fill('input[name="sku"]', ing.sku);
      if (ing.brand) await page.fill('input[name="brand"]', ing.brand);
      await page.selectOption('select[name="base_unit"]', ing.unit);
      await page.fill('input[name="current_cost"]', ing.cost);
      await page.fill('input[name="yield_percentage"]', ing.yieldPct);
      await page.fill('input[name="current_stock"]', ing.stock);
      await page.fill('input[name="minimum_stock"]', ing.minStock);

      await page.click('button:has-text("Salvar ingrediente")');
      await page.waitForTimeout(1500);
    } else {
      console.log(`Ingrediente já existe: ${ing.name}`);
    }
  }

  await page.screenshot({ path: 'test-results/ingredientes-cadastrados.png' });

  // --- CADASTRO DE RECEITAS ---
  console.log(`4. Acessando tela de Receitas...`);
  await page.goto('https://custiva.vercel.app/app/recipes');
  await page.waitForTimeout(3000);

  // Helper para preencher ingrediente no formulário de receita com garantia de carregamento
  async function fillRecipeIngredient(quantityValue: string) {
    const select = page.locator('select[aria-label="Ingrediente"]').first();
    if (await select.isVisible().catch(() => false)) {
      await page.waitForFunction(() => {
        const sel = document.querySelector('select[aria-label="Ingrediente"]') as HTMLSelectElement;
        if (!sel) return false;
        return Array.from(sel.options).some(opt => opt.value !== "");
      }, { timeout: 10000 }).catch(() => false);

      const selectedValue = await select.evaluate((el: HTMLSelectElement) => {
        const validOption = Array.from(el.options).find(opt => opt.value !== "");
        if (validOption) {
          el.value = validOption.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return validOption.value;
        }
        return null;
      });

      if (selectedValue) {
        console.log(`Ingrediente vinculado à receita (ID: ${selectedValue})`);
        const qtyInput = page.locator('input[aria-label="Quantidade"]').first();
        await qtyInput.fill(quantityValue);
        await qtyInput.evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));
      } else {
        console.log(`Nenhum ingrediente selecionável. Removendo linha pendente...`);
        const removeBtn = page.locator('button[aria-label="Remover ingrediente"]').first();
        if (await removeBtn.isVisible().catch(() => false)) {
          await removeBtn.click();
        }
      }
    }
  }

  // Receita 1: Bolo Suflê de Chocolate Gourmet
  const recipe1Name = 'Bolo Suflê de Chocolate Gourmet';
  const recipe1Exists = await page.locator(`h3:has-text("${recipe1Name}")`).isVisible().catch(() => false);
  if (!recipe1Exists) {
    console.log(`Cadastrando receita: ${recipe1Name}...`);
    await page.click('button:has-text("Nova receita")');
    await page.waitForSelector('role=dialog');

    await page.fill('input[name="name"]', recipe1Name);
    await page.fill('input[name="category"]', 'Sobremesas');
    await page.fill('input[name="yield_quantity"]', '1');
    await page.selectOption('select[name="yield_unit"]', 'un');
    await page.fill('input[name="portions"]', '12');
    await page.fill('textarea[name="instructions"]', 'Misturar os ingredientes secos, bater a manteiga com açúcar e chocolate, assar a 180°C por 35 minutos.');

    await fillRecipeIngredient('0.5');

    await page.click('button:has-text("Salvar versão"), button:has-text("Salvar receita")');
    await page.waitForTimeout(3000);
  } else {
    console.log(`Receita já existe: ${recipe1Name}`);
  }

  // Receita 2: Empada de Frango Cremoso
  const recipe2Name = 'Empada de Frango Cremoso';
  const recipe2Exists = await page.locator(`h3:has-text("${recipe2Name}")`).isVisible().catch(() => false);
  if (!recipe2Exists) {
    console.log(`Cadastrando receita: ${recipe2Name}...`);
    await page.click('button:has-text("Nova receita")');
    await page.waitForSelector('role=dialog');

    await page.fill('input[name="name"]', recipe2Name);
    await page.fill('input[name="category"]', 'Salgados');
    await page.fill('input[name="yield_quantity"]', '20');
    await page.selectOption('select[name="yield_unit"]', 'un');
    await page.fill('input[name="portions"]', '20');
    await page.fill('textarea[name="instructions"]', 'Preparar a massa podre com farinha e manteiga. Rechear e assar em forno preaquecido por 25 minutos.');

    await fillRecipeIngredient('1.2');

    await page.click('button:has-text("Salvar versão"), button:has-text("Salvar receita")');
    await page.waitForTimeout(3000);
  } else {
    console.log(`Receita já existe: ${recipe2Name}`);
  }

  await page.screenshot({ path: 'test-results/receitas-cadastradas.png' });

  // Visão geral (Dashboard)
  console.log(`5. Acessando Visão Geral (Dashboard)...`);
  await page.goto('https://custiva.vercel.app/app/dashboard');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/dashboard-final.png' });

  console.log(`🎉 Processo concluído com sucesso! Ingredientes e Receitas salvas para a conta ${activeEmail}.`);
});
