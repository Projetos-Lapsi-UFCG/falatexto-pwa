export interface VisionProcessarClinicaResponse {
  mensagem: string;
  id_sessao: string;
  status: string;
  link_consulta: string;
}

export interface VisionPreencherFormularioRequest {
  transcricao: string;
  formulario_nome: string;
  secoes: unknown[];
  respostas_atuais: Record<string, string>;
  checkbox_atuais: Record<string, boolean>;
  etapa_atual: number;
  data_atual?: string;
}

export interface VisionPreencherFormularioResponse {
  answers: Record<string, string>;
  checkboxAnswers: Record<string, boolean>;
  closingData: {
    date?: string;
    responsible?: string;
  };
}