import 'dotenv/config';
import { prisma } from '../src/server/lib/prisma.js';

async function runE2eTest() {
  console.log('🧪 Iniciando Teste E2E dos novos fluxos de Certificados e Laboratórios...');
  const baseUrl = 'http://localhost:3000';

  // 1. Login como Admin
  console.log('[1/8] Fazendo login como Administrador...');
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin.sipat@senai.br',
      password: process.env.INITIAL_ADMIN_PASSWORD || 'Sipat@Senai2026!ChangeMe',
    }),
  });
  if (!adminLoginRes.ok) {
    throw new Error(`Falha no login do admin: ${adminLoginRes.status} ${await adminLoginRes.text()}`);
  }
  const adminCookies = adminLoginRes.headers.get('set-cookie') || '';
  const adminData = await adminLoginRes.json();
  console.log(`  ✔ Admin logado: ${adminData.user.fullName} (${adminData.user.role})`);

  // 2. Testar GET /api/admin/laboratories
  console.log('[2/8] Consultando laboratórios didáticos...');
  const labsRes = await fetch(`${baseUrl}/api/admin/laboratories`, {
    headers: { Cookie: adminCookies },
  });
  if (!labsRes.ok) throw new Error(`Falha ao buscar labs: ${labsRes.status}`);
  const { laboratories } = await labsRes.json();
  console.log(`  ✔ Laboratórios encontrados: ${laboratories.length}`);
  laboratories.forEach((l: any) => {
    console.log(`    - [${l.code}] ${l.name} (${l.blockLocation}) • Turmas: ${l.classGroups.length}`);
  });

  // 3. Testar POST /api/admin/laboratories (Criando laboratório de teste)
  console.log('[3/8] Testando criação e vinculação de laboratório específico...');
  const createLabRes = await fetch(`${baseUrl}/api/admin/laboratories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookies },
    body: JSON.stringify({
      code: 'LAB-TESTE-E2E',
      name: 'Bancada Didática de Testes de Automação',
      blockLocation: 'Bloco B, 3º Andar',
      courseArea: 'Mecatrônica',
      nrsApplicable: 'NR-10, NR-12',
      requiredEpis: 'Óculos de proteção',
      capacity: 16,
      classGroupIds: [],
    }),
  });
  if (!createLabRes.ok) throw new Error(`Falha ao criar lab: ${createLabRes.status}`);
  const createdLab = (await createLabRes.json()).laboratory;
  console.log(`  ✔ Laboratório criado com sucesso: ${createdLab.code} (ID: ${createdLab.id})`);

  // Deletar o laboratório de teste
  await fetch(`${baseUrl}/api/admin/laboratories/${createdLab.id}`, {
    method: 'DELETE',
    headers: { Cookie: adminCookies },
  });
  console.log('  ✔ Laboratório de teste excluído cleanly.');

  // 4. Testar Inscrição de Aluno Teste
  console.log('[4/8] Cadastrando aluno de teste para verificar fluxo de homologação...');
  const testStudentEmail = `aluno.teste.${Date.now()}@senai.br`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Aluno Teste Homologação SIPAT',
      email: testStudentEmail,
      password: 'SenhaForte123!',
      registrationCode: `RA-TESTE-${Date.now().toString().slice(-5)}`,
      classGroupId: laboratories[0].classGroups[0]?.classGroupId,
      isMinor: false,
      lgpdAccepted: true,
      imageConsent: true,
    }),
  });
  if (!regRes.ok) throw new Error(`Falha ao registrar aluno teste: ${regRes.status} ${await regRes.text()}`);
  const studentCookies = regRes.headers.get('set-cookie') || '';
  const studentData = await regRes.json();
  const studentId = studentData.user.id;
  console.log(`  ✔ Aluno teste criado: ${studentData.user.fullName} (ID: ${studentId})`);

  // 5. Testar GET /api/participant/certificate ANTES da liberação
  console.log('[5/8] Verificando acesso ao certificado ANTES da homologação pelo admin...');
  const certBeforeRes = await fetch(`${baseUrl}/api/participant/certificate`, {
    headers: { Cookie: studentCookies },
  });
  const certBefore = await certBeforeRes.json();
  console.log(`  ✔ Retorno esperado: released=${certBefore.released}`);
  if (certBefore.released !== false) {
    throw new Error('ERRO: Certificado não deveria estar liberado antes do disparo do admin!');
  }
  console.log(`    Status do aluno: "${certBefore.candidate.statusText}"`);

  // 6. Testar GET /api/admin/certificates/candidates
  console.log('[6/8] Consultando lista de candidatos no painel de homologação do admin...');
  const candidatesRes = await fetch(`${baseUrl}/api/admin/certificates/candidates?search=${encodeURIComponent(studentData.user.fullName)}`, {
    headers: { Cookie: adminCookies },
  });
  const { candidates } = await candidatesRes.json();
  const foundCand = candidates.find((c: any) => c.id === studentId);
  if (!foundCand) throw new Error('Aluno teste não encontrado na lista de candidatos!');
  console.log(`  ✔ Aluno localizado no painel admin! Status: isReleased=${foundCand.isReleased}`);

  // 7. Admin DISPARA a liberação do certificado
  console.log('[7/8] Admin disparando liberação oficial do certificado...');
  const releaseRes = await fetch(`${baseUrl}/api/admin/certificates/release`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookies },
    body: JSON.stringify({ userIds: [studentId] }),
  });
  if (!releaseRes.ok) throw new Error(`Falha ao liberar cert: ${releaseRes.status}`);
  const releaseResult = await releaseRes.json();
  console.log(`  ✔ Certificado homologado e liberado com sucesso: releasedCount=${releaseResult.releasedCount}`);

  // 8. Aluno acessa certificado DEPOIS da liberação e validação pública
  console.log('[8/8] Verificando acesso do aluno ao certificado oficial homologado...');
  const certAfterRes = await fetch(`${baseUrl}/api/participant/certificate`, {
    headers: { Cookie: studentCookies },
  });
  const certAfter = await certAfterRes.json();
  if (!certAfter.released || !certAfter.certificate) {
    throw new Error('ERRO: Certificado deveria estar liberado agora!');
  }
  console.log(`  ✔ Certificado oficial emitido com sucesso!`);
  console.log(`    Código: ${certAfter.certificate.verificationCode}`);
  console.log(`    Carga Horária: ${certAfter.certificate.workloadHours} horas`);
  console.log(`    Escola: ${certAfter.certificate.schoolName}`);
  console.log(`    Assinaturas: ${certAfter.certificate.signatures.length}`);

  // Validação pública
  const verifyRes = await fetch(`${baseUrl}/api/public/certificate/verify/${certAfter.certificate.verificationCode}`);
  const verifyData = await verifyRes.json();
  if (!verifyData.valid) throw new Error('Validação pública do certificado falhou!');
  console.log(`  ✔ Validação pública em tempo real: status="${verifyData.status}" para aluno "${verifyData.studentName}"`);

  // Limpeza: remover o aluno teste
  await prisma.user.delete({ where: { id: studentId } });
  console.log('  ✔ Aluno de teste removido da base. Base preservada limpa.');

  console.log('\n========================================================================');
  console.log('🎉 TODOS OS TESTES E2E FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
  console.log('========================================================================');
  process.exit(0);
}

runE2eTest().catch((err) => {
  console.error('❌ Falha no teste E2E:', err);
  process.exit(1);
});
