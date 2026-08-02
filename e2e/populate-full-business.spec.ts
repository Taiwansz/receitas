import { test, expect } from '@playwright/test';

test.setTimeout(120000);

test('Simulação operacional completa de empresa real no Custiva', async ({ page }) => {
  const email = 'teu.matheus.ms+custiva@gmail.com';
  const password = '123456789';

  console.log(`1. Efetuando login em https://custiva.vercel.app/login...`);
  await page.goto('https://custiva.vercel.app/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  expect(page.url()).toContain('/app');
  console.log(`Autenticado com sucesso na URL: ${page.url()}`);

  // Helper reutilizável para submeter formulários do ResourcePage
  async function addResourceItem(
    moduleUrl: string,
    itemName: string,
    fillForm: () => Promise<void>
  ) {
    console.log(`Navegando para ${moduleUrl}...`);
    await page.goto(moduleUrl);
    await page.waitForTimeout(2000);

    const exists = await page.locator(`td:has-text("${itemName}")`).isVisible().catch(() => false);
    if (!exists) {
      console.log(`Adicionando item: ${itemName}...`);
      await page.click('button:has-text("Adicionar")');
      await page.waitForSelector('[role="dialog"]');

      await fillForm();

      await page.locator('[role="dialog"]').locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
    } else {
      console.log(`Item já cadastrado: ${itemName}`);
    }
  }

  // --- FORNECEDORES ---
  const suppliers = [
    { name: 'Atacadão da Confeitaria Ltda', taxId: '12.345.678/0001-99', email: 'contato@atacadoconfeitaria.com.br', phone: '(11) 98765-4321' },
    { name: 'Distribuidora Vale do Sol', taxId: '98.765.432/0001-11', email: 'pedidos@valedosol.com.br', phone: '(11) 97654-3210' },
    { name: 'Embalagens Paulista S.A.', taxId: '45.678.901/0001-22', email: 'vendas@embalagenspaulista.com.br', phone: '(11) 91234-5678' },
  ];

  for (const sup of suppliers) {
    await addResourceItem('https://custiva.vercel.app/app/suppliers', sup.name, async () => {
      await page.fill('input[name="legal_name"]', sup.name);
      await page.fill('input[name="tax_id"]', sup.taxId);
      await page.fill('input[name="email"]', sup.email);
      await page.fill('input[name="phone"]', sup.phone);
    });
  }
  await page.screenshot({ path: 'test-results/fornecedores-completos.png' });

  // --- EMBALAGENS ---
  const packagings = [
    { name: 'Caixa Kraft para Bolo 25x25cm', sku: 'EMB-BOLO-01', cost: '2.80', minStock: '50' },
    { name: 'Forma Forneável de Empada (100un)', sku: 'EMB-EMP-02', cost: '0.35', minStock: '100' },
    { name: 'Sacola de Papel Kraft Personalizada', sku: 'EMB-SAC-03', cost: '1.20', minStock: '200' },
  ];

  for (const pack of packagings) {
    await addResourceItem('https://custiva.vercel.app/app/packaging', pack.name, async () => {
      await page.fill('input[name="name"]', pack.name);
      await page.fill('input[name="sku"]', pack.sku);
      
      const unitSelect = page.locator('select[name="unit_id"]');
      if (await unitSelect.isVisible().catch(() => false)) {
        await unitSelect.selectOption({ index: 0 });
      }
      
      await page.fill('input[name="current_unit_cost"]', pack.cost);
      await page.fill('input[name="minimum_stock"]', pack.minStock);
    });
  }
  await page.screenshot({ path: 'test-results/embalagens-completas.png' });

  // --- CUSTOS OPERACIONAIS ---
  const expenses = [
    { name: 'Aluguel da Cozinha Industrial', category: 'rent', behavior: 'fixed', attribution: 'indirect', amount: '2800.00' },
    { name: 'Energia Elétrica & Gás Industrial', category: 'electricity', behavior: 'variable', attribution: 'indirect', amount: '650.00' },
    { name: 'Manutenção e Sanitização', category: 'other', behavior: 'fixed', attribution: 'indirect', amount: '400.00' },
  ];

  for (const exp of expenses) {
    await addResourceItem('https://custiva.vercel.app/app/expenses', exp.name, async () => {
      await page.fill('input[name="name"]', exp.name);
      if (await page.locator('select[name="category"]').isVisible().catch(() => false)) {
        await page.selectOption('select[name="category"]', exp.category);
      }
      if (await page.locator('select[name="behavior"]').isVisible().catch(() => false)) {
        await page.selectOption('select[name="behavior"]', exp.behavior);
      }
      if (await page.locator('select[name="attribution"]').isVisible().catch(() => false)) {
        await page.selectOption('select[name="attribution"]', exp.attribution);
      }
      await page.fill('input[name="amount"]', exp.amount);
    });
  }
  await page.screenshot({ path: 'test-results/custos-completos.png' });

  // --- CANAIS DE VENDA ---
  const channels = [
    { name: 'Loja Física / Balcão', type: 'in_store', fee: '0', fixedFee: '0' },
    { name: 'iFood Delivery', type: 'marketplace', fee: '12.5', fixedFee: '1.50' },
    { name: 'WhatsApp & Encomendas', type: 'direct_order', fee: '0', fixedFee: '0' },
  ];

  for (const ch of channels) {
    await addResourceItem('https://custiva.vercel.app/app/channels', ch.name, async () => {
      await page.fill('input[name="name"]', ch.name);
      if (await page.locator('select[name="channel_type"]').isVisible().catch(() => false)) {
        await page.selectOption('select[name="channel_type"]', ch.type);
      }
      if (await page.locator('input[name="percentage_fee"]').isVisible().catch(() => false)) {
        await page.fill('input[name="percentage_fee"]', ch.fee);
      }
      if (await page.locator('input[name="fixed_fee"]').isVisible().catch(() => false)) {
        await page.fill('input[name="fixed_fee"]', ch.fixedFee);
      }
    });
  }
  await page.screenshot({ path: 'test-results/canais-completos.png' });

  // --- PRECIFICAÇÃO E RELATÓRIOS ---
  console.log(`Simulando Precificação em /app/pricing...`);
  await page.goto('https://custiva.vercel.app/app/pricing');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/precificacao-completa.png' });

  console.log(`Visualizando Relatórios em /app/reports...`);
  await page.goto('https://custiva.vercel.app/app/reports');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/relatorios-completos.png' });

  console.log(`Visualizando Dashboard em /app/dashboard...`);
  await page.goto('https://custiva.vercel.app/app/dashboard');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'test-results/dashboard-real-completo.png' });

  console.log(`🎉 Simulação operacional completa concluída com sucesso para a conta ${email}!`);
});
