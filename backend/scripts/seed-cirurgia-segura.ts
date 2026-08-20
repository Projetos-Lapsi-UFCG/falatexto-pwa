/**
 * Seed de uma vez só: envia o formulário "Cirurgia Segura" completo (3
 * seções, 32 perguntas) para o backend real via HTTP, usando o mesmo
 * form-mapper.ts que o app usa — não uma reimplementação separada.
 *
 * Pré-requisito: banco de dados recém-criado, já com init-db.js aplicado
 * (que ocupa form_001/form_002). Este script usa a sequência 3 (form_003),
 * fixa — não detecta automaticamente o próximo id livre, e não é
 * idempotente: rodar de novo contra um banco que já tem form_003 falha no
 * primeiro POST com 400 "já existe". Isso é intencional, mesma convenção
 * de "rodar uma vez, banco limpo" do init-db.js.
 *
 * Simplificação deliberada: o divider "Revisão de enfermagem" (dentro da
 * seção s2) não tem endpoint de criação no backend hoje (sections.py só
 * tem DELETE — não dá pra criar uma Section cujo pai é outra Section). As
 * perguntas que viriam "depois" do divider (q17-q20) são criadas como
 * filhas diretas da seção s2, junto com as que vêm antes (q12-q16) — a
 * agrupação visual do divider simplesmente não é representada no backend.
 *
 * Como rodar (a partir de backend/scripts/):
 *   ../../frontend/node_modules/.bin/tsc seed-cirurgia-segura.ts \
 *     ../../frontend/src/app/core/services/form-mapper.ts \
 *     ../../frontend/src/app/core/models/backend-form.model.ts \
 *     ../../frontend/src/app/core/models/form.model.ts \
 *     seed-data/cirurgia-segura.form.ts \
 *     --target ES2020 --module commonjs --outDir /tmp/seed-out --rootDir ../.. \
 *     --strict --esModuleInterop --skipLibCheck
 *   node /tmp/seed-out/<caminho>/seed-cirurgia-segura.js
 */

import { Section } from '../../frontend/src/app/core/models/form.model';
import { mapFormToBackend, MappedQuestion } from '../../frontend/src/app/core/services/form-mapper';
import { BackendQuestionCreate } from '../../frontend/src/app/core/models/backend-form.model';
import { cirurgiaSeguraForm } from './seed-data/cirurgia-segura.form';

const API_BASE_URL = 'http://localhost:8000/api/v1';
const FORM_SEQUENCE = 3; // form_003 — init-db.js já ocupa form_001/form_002

function stripDividers(section: Section): Section {
  return {
    ...section,
    questions: section.questions.filter(q => q.type !== 'divider'),
  };
}

async function postJson(path: string, body: unknown): Promise<any> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`POST ${path} -> ${response.status}: ${detail}`);
  }

  return response.json();
}

/** Filhas antes da pergunta-pai (COMPOSTA), para nunca deixar compositeFields
 *  apontando para um id que ainda não existe em nenhum momento intermediário. */
function orderedQuestions(mapped: MappedQuestion): BackendQuestionCreate[] {
  return [...mapped.extra, mapped.primary];
}

async function main() {
  const flattenedForm = {
    ...cirurgiaSeguraForm,
    sections: (cirurgiaSeguraForm.sections ?? []).map(stripDividers),
  };

  const plan = mapFormToBackend(flattenedForm, FORM_SEQUENCE);

  console.log(`Criando form ${plan.form.id} ("${plan.form.name}")...`);
  await postJson('/forms', plan.form);

  for (const mappedSection of plan.sections) {
    console.log(`  Criando section ${mappedSection.section.id} ("${mappedSection.section.title}")...`);
    await postJson(`/forms/${plan.form.id}/sections`, mappedSection.section);

    const questions = mappedSection.questionsByOwnerId[mappedSection.section.id] ?? [];
    for (const mappedQuestion of questions) {
      for (const question of orderedQuestions(mappedQuestion)) {
        console.log(`    Criando question ${question.id} ("${question.title}")...`);
        await postJson(`/sections/${mappedSection.section.id}/questions`, question);
      }
    }
  }

  console.log(`\nOK — ${plan.form.id} criado com ${plan.sections.length} seções.`);
}

main().catch(err => {
  console.error('\nFALHOU:', err.message);
  // Sem process.exit(1) explícito (evita depender de @types/node no compile
  // standalone) — um erro não capturado já derruba o processo com código != 0.
  throw err;
});
