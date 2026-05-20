db = db.getSiblingDB('assis_db');

db.forms.insertMany([
  {
    _id: "form_001",
    name: "Protocolo de Cirurgia Cardíaca",
    sections: ["sec_101", "sec_102"],
    metadata: { version: "1.0", active: true }
  }
]);

db.sections.insertMany([
  {
    _id: "sec_101",
    title: "Dados Pré-Operatórios",
    parentItem: "form_001",
    subSections: ["sec_101_A"],
    questions: ["q_201", "q_202"],
    tags: ["cirurgia", "pre-op"]
  }
]);

db.questions.insertMany([
  {
    _id: "q_201",
    parentItem: "sec_101",
    title: "O paciente possui alergias?",
    type: "ESTIMULADA",
    options: [
      { label: "Sim", value: "S" },
      { label: "Não", value: "N" },
      { label: "N/A", value: "NA" }
    ],
    compositeFields: []
  }
]);

db.entities.insertMany([
  {
    _id: "ent_500",
    name: "Hospital Universitário Alcides Carneiro",
    description: "Hospital escola em Campina Grande",
    tags: ["HUAC", "CG", "HU"]
  }
]);

print("Dados iniciais carregados com sucesso!");